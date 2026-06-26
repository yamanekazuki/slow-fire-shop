// =============================================================================
// SLOW FIRE JOURNAL — 改善ループ Phase2 実装エンジン（GitHub Actions）
// -----------------------------------------------------------------------------
// repository_dispatch で起動。ACTION により4つの動作を切り替える：
//   implement-article : 承認された提案を実装→自己採点→（合格なら）ブランチに
//                       コミットして「プレビュー＋公開ボタン」をメール
//   publish-article   : プレビュー承認 → ブランチをmainへ取り込み公開（Pages反映）
//                       → 完了メール（［元に戻す］付き）
//   discard-article   : プレビューを破棄（ブランチ削除）
//   revert-article    : 公開済みの変更を打ち消して元に戻す
//
// 編集は「完全置換」ではなく find/replace 操作に限定し、変更範囲を絞る（安全）。
// 実装役と採点役は別々のClaude呼び出しに分離（自分の答案を自分で甘く採点しない）。
//
// 環境変数：
//   ACTION                 … github.event.action（dispatch type）
//   PAYLOAD                … github.event.client_payload（JSON文字列）
//   ANTHROPIC_API_KEY      … Claude APIキー（必須）
//   APPROVAL_SECRET        … 公開/復元リンクの署名鍵（必須）
//   APPROVAL_FN_BASE       … cook-logの関数URLベース（ボタンの宛先）
//   BLOG_MODEL             … モデル（省略時 claude-opus-4-8）
//   GITHUB_OUTPUT          … メール内容の出力先（Actions）
// =============================================================================

import crypto from "node:crypto";
import fs from "node:fs";
import { execSync } from "node:child_process";

const ACTION = process.env.ACTION || "";
const PAYLOAD = JSON.parse(process.env.PAYLOAD || "{}");
const API_KEY = process.env.ANTHROPIC_API_KEY;
const SECRET = process.env.APPROVAL_SECRET || "";
const FN_BASE = process.env.APPROVAL_FN_BASE || "";
const MODEL = process.env.BLOG_MODEL || "claude-opus-4-8";
const REPO = "yamanekazuki/slow-fire-shop";
const LIVE_BASE = "https://yamanekazuki.github.io/slow-fire-shop/";
const PASS = 80;
// 改善ループの結果メールの宛先（山根さん＋メンバー2名）。env MAIL_TO で上書き可。
const TO = process.env.MAIL_TO || "yamane@potentialight.com,afroanri0126@gmail.com,woodyuetaku@gmail.com";

// ---- 出力ヘルパ --------------------------------------------------------------
function setOutput(pairs) {
  const f = process.env.GITHUB_OUTPUT;
  if (!f) {
    for (const [k, v] of Object.entries(pairs)) if (k !== "html") console.log(`OUTPUT ${k}=${String(v).slice(0, 200)}`);
    return;
  }
  let body = "";
  for (const [k, v] of Object.entries(pairs)) body += `${k}<<LOOPEOF\n${v}\nLOOPEOF\n`;
  fs.appendFileSync(f, body);
}
function esc(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function sh(cmd) {
  return execSync(cmd, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).trim();
}

// ---- 署名付きリンク ----------------------------------------------------------
function b64urlJson(obj) {
  return Buffer.from(JSON.stringify(obj)).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function signToken(d) {
  return crypto.createHmac("sha256", String(SECRET)).update(d).digest("hex").slice(0, 32);
}
function changeLink(kind, payload) {
  if (!FN_BASE || !SECRET) return "";
  const d = b64urlJson({ kind, ...payload });
  return `${FN_BASE}/bbqChangeAction?d=${d}&t=${signToken(d)}`;
}

// ---- Claude（structured output / 依存ゼロ）-----------------------------------
async function callClaude(system, userMsg, schema, { maxTokens = 8000, effort = "high" } = {}) {
  if (!API_KEY) throw new Error("ANTHROPIC_API_KEY 未設定");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": API_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      output_config: { effort, format: { type: "json_schema", schema } },
      messages: [{ role: "user", content: userMsg }],
    }),
  });
  if (!res.ok) throw new Error(`Claude API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  if (data.stop_reason === "refusal") throw new Error("Claude が応答を拒否しました。");
  const t = (data.content || []).find((b) => b.type === "text");
  if (!t) throw new Error("テキストブロックなし");
  return JSON.parse(t.text);
}

// ---- 対象ファイル解決 --------------------------------------------------------
// proposal.target（URL or パス）→ リポジトリ相対パス。解決できなければ null。
export function resolveTargetFile(target) {
  if (!target) return null;
  let t = String(target).trim();
  if (/新規|new article/i.test(t)) return null;
  t = t.replace(/^https?:\/\/[^/]+\//, ""); // ドメイン除去
  t = t.replace(/^slow-fire-shop\//, ""); // Pagesのリポジトリ接頭辞
  t = t.replace(/^\/+/, "").replace(/[?#].*$/, ""); // 先頭スラッシュ/クエリ除去
  if (!t.startsWith("journal/")) {
    const m = t.match(/journal\/[^\s)]+\.html/);
    if (m) t = m[0];
    else return null;
  }
  if (!t.endsWith(".html")) return null;
  if (t.includes("..")) return null; // パストラバーサル防止
  return fs.existsSync(t) ? t : null;
}

// ---- 編集適用 ----------------------------------------------------------------
// edits: [{ find, replace }]。find が本文に一意に存在するものだけ適用。
export function applyEdits(html, edits) {
  let out = html;
  const applied = [], skipped = [];
  for (const e of edits || []) {
    if (!e || typeof e.find !== "string" || typeof e.replace !== "string" || !e.find) {
      skipped.push({ ...e, reason: "find/replace不正" });
      continue;
    }
    const idx = out.indexOf(e.find);
    if (idx === -1) { skipped.push({ ...e, reason: "対象テキストが見つからない" }); continue; }
    if (out.indexOf(e.find, idx + 1) !== -1) { skipped.push({ ...e, reason: "複数該当のため安全のためスキップ" }); continue; }
    out = out.slice(0, idx) + e.replace + out.slice(idx + e.find.length);
    applied.push(e);
  }
  return { html: out, applied, skipped };
}

// ---- 実装役：提案 → find/replace 編集 ----------------------------------------
const EDIT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    edits: {
      type: "array",
      description: "記事HTMLへのfind/replace編集。findは記事内に一字一句そのまま存在する文字列。",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          find: { type: "string", description: "置換対象（記事内に一意に存在する、十分に長い文字列）" },
          replace: { type: "string", description: "置換後のHTML" },
          why: { type: "string", description: "この編集が提案にどう効くか（1文）" },
        },
        required: ["find", "replace", "why"],
      },
    },
    note: { type: "string", description: "実装の要約（1〜2文）" },
  },
  required: ["edits", "note"],
};

async function aiImplement(html, proposal, feedback = "", downscope = "") {
  const system = `あなたはSLOW FIRE JOURNAL（アメリカンBBQメディア）の編集者です。
与えられた記事HTMLに対し、改善提案を反映する最小限の find/replace 編集を作ります。完璧を狙って何も出せないより、確実で安全な一歩を必ず出します。

# 鉄則
- find は記事HTML内に「一字一句そのまま」存在する文字列にする（一意に特定できるよう十分長く）。
- 変更は提案の範囲に限定。記事全体の作り直しや、無関係な改変はしない。
- 事実を歪めない。温度・時間・手順などの技術情報は知識に反する改変をしない。
- SLOW FIREのトーンは落ち着いた実用志向。煽り・誇大・キーワード詰め込みは禁止。
- タイトル(<title>/<h1>)や導入の改善、内部リンク追加、見出し最適化などを、自然な日本語で。
- 編集は最大5件まで。確実に効くものだけ。`;
  const userMsg = `# 改善提案
タイトル: ${proposal.title}
対象: ${proposal.target}
変更内容: ${proposal.change}
期待効果: ${proposal.impact}
${feedback ? `\n# 前回の実装が審査で落ちた理由と、通すための直し方（必ず解消すること）\n${feedback}\n→ 上の指摘を踏まえ、不自然な日本語・キーワード詰め込み・事実の劣化を避け、自然で読みやすい編集に直すこと。\n` : ""}${downscope}
# 記事HTML
${html}`;
  return callClaude(system, userMsg, EDIT_SCHEMA, { maxTokens: 12000, effort: "xhigh" });
}

// 提案が安全に実装しづらく採点で落ち続けるとき、効果の核を残したまま「確実・安全に実装できる」狭い提案へ作り直す。
const REFORM_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    target: { type: "string", description: "対象記事URL/パス（元提案と同じものを保つ）" },
    change: { type: "string", description: "何をどう変えるか（最小・安全に、find/replaceで実装できる範囲）" },
    impact: { type: "string" },
  },
  required: ["title", "target", "change", "impact"],
};
async function aiReformulate(proposal, feedback) {
  const system = `あなたはSLOW FIRE JOURNALの編集長。安全に実装できず採点で落ち続けている改善提案を、狙う指標は保ったまま「確実に・安全に・最小のfind/replaceで実装できる」狭い提案に作り直します。targetは元提案と同じ記事を保つこと。`;
  const userMsg = `# 元の提案\n${JSON.stringify(proposal, null, 2)}\n\n# 採点で繰り返し落ちている理由\n${feedback}\n\n狙い（どの指標を動かすか）は保ちつつ、リスクの高い要素を削り、確実に通る狭い一手に書き直す。`;
  return callClaude(system, userMsg, REFORM_SCHEMA, { maxTokens: 2000, effort: "high" });
}

// ---- 採点役：変更が安全か（実装役とは別呼び出し）-----------------------------
const GRADE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          score: { type: "number" },
          max: { type: "number" },
          comment: { type: "string" },
        },
        required: ["name", "score", "max", "comment"],
      },
    },
    total: { type: "number", description: "100点満点の合計" },
    verdict: { type: "string", description: "総評（1〜2文）" },
    fix_hint: { type: "string", description: "合格点(80)に届いていないなら、どう直せば通るかの具体的で実装可能な直し方を1〜2文。合格なら空文字" },
  },
  required: ["items", "total", "verdict", "fix_hint"],
};

async function aiGrade(proposal, edits) {
  const system = `あなたはSLOW FIRE JOURNALの編集長で、AIが作った記事修正を世に出す前の最終審査をします。辛口に。ただし落とすときは「どう直せば合格に届くか」を必ず具体的に示し、書き手を合格まで導きます。
以下5項目で100点満点採点し、合計を出してください。
1. 提案との一致（25）：提案の意図どおりの修正になっているか
2. 事実・技術的正確性（25）：温度/時間/手順などに誤りや劣化がないか
3. ブランドトーン（20）：落ち着いた実用志向。煽り/誇大/不自然な日本語がない
4. SEO安全性（15）：キーワード詰め込み・不自然な最適化・重複でない
5. HTML健全性（15）：タグ崩れ・リンク切れ・意味の壊れがない`;
  const userMsg = `# 提案
${JSON.stringify(proposal, null, 2)}

# 適用された編集（find→replace）
${JSON.stringify(edits.map((e) => ({ before: e.find.slice(0, 300), after: e.replace.slice(0, 300), why: e.why })), null, 2)}`;
  return callClaude(system, userMsg, GRADE_SCHEMA, { maxTokens: 4000, effort: "high" });
}

// ---- git ヘルパ --------------------------------------------------------------
function gitSetup() {
  sh('git config user.name "slow-fire-loop-bot"');
  sh('git config user.email "bot@users.noreply.github.com"');
}
function liveUrlFor(file) {
  return LIVE_BASE + file.replace(/^\//, "");
}

// =============================================================================
// アクション: implement-article
// =============================================================================
async function doImplement() {
  const proposal = PAYLOAD.proposal || {};
  const file = resolveTargetFile(proposal.target);

  // 新規記事や対象不明 → 自動実装の対象外として通知（安全弁）
  if (!file) {
    setOutput({
      ready: "true",
      to: TO,
      subject: `【SLOW FIRE JOURNAL】自動実装の対象外でした：${proposal.title || ""}`,
      html: notImplementableHtml(proposal),
    });
    return;
  }

  const before = fs.readFileSync(file, "utf8");

  // 実装→自己採点を、合格点(80)に届くまで最大5回くり返す（人間の編集者と編集長が往復するように）。
  //   - 落ちた回は採点役の「どう直せば通るか(fix_hint)」を次の実装役へ渡して直させる。
  //   - 後半は「完璧な大きい変更より、確実に効く最小・安全な一部を必ず出荷」させる（ダウンスコープ）。
  //   - 構造的に落ち続けるなら提案自体を安全で狭い版に作り直して続行する（reformulate）。
  // 80点の安全バーは下げない：バーまで“登り切る”往復を増やすだけ。届かなければ最高得点版を見送る。
  const MAX_ATTEMPTS = 5;
  let best = null;     // { total, grade, after, applied, skipped }
  let feedback = "";
  let workingProposal = proposal;   // 行き詰まったら安全側に作り直すことがある（targetは保つ）
  let reformulated = false;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const downscope = attempt >= 3
      ? `\n# 重要（${attempt}回目・ここまで合格に届いていない）\n完璧で大きな変更にこだわらないこと。提案の中で「最も確実に効き・最も安全」な最小の一部だけを、自然な形で確実に編集する。小さくても本物の改善を出す方が、何も出さないより良い。リスクのある欲張った変更は削ること。\n`
      : "";
    let impl;
    try {
      impl = await aiImplement(before, workingProposal, feedback, downscope);
    } catch (e) {
      if (attempt === MAX_ATTEMPTS && !best) { setOutput({ ready: "true", to: TO, subject: `【SLOW FIRE JOURNAL】実装に失敗：${proposal.title || ""}`, html: failHtml(proposal, `実装AIエラー: ${e.message}`) }); return; }
      feedback = `実装AIエラー: ${e.message}`; continue;
    }
    const { html: after, applied, skipped } = applyEdits(before, impl.edits);
    if (!applied.length) {
      if (attempt === MAX_ATTEMPTS && !best) { setOutput({ ready: "true", to: TO, subject: `【SLOW FIRE JOURNAL】変更を適用できませんでした：${proposal.title || ""}`, html: failHtml(proposal, "編集対象テキストが記事内で特定できませんでした（記事が更新済みの可能性）。") }); return; }
      feedback = "find が記事内に一致しなかった。記事HTMLに一字一句そのまま存在する十分長い文字列を find にすること。"; continue;
    }

    // 自己採点（実装役とは別呼び出し）
    let grade;
    try {
      grade = await aiGrade(workingProposal, applied);
    } catch (e) {
      grade = { total: 0, items: [], verdict: `採点AIエラー: ${e.message}` };
    }
    const total = Number(grade.total) || 0;
    if (!best || total > best.total) best = { total, grade, after, applied, skipped };
    if (total >= PASS) { console.log(`attempt ${attempt}: ${total}点 合格`); break; }
    feedback = `自己採点${total}/100点で不合格。総評：${grade.verdict || ""}${(grade.items || []).filter((it) => it.score < it.max).map((it) => `／${it.name}:${it.comment}`).join("")}${grade.fix_hint ? `｜こう直せば通る：${grade.fix_hint}` : ""}`;
    console.log(`attempt ${attempt}: ${total}点 — 指摘を直して再挑戦`);

    // 2回試しても構造的に届かない（提案自体が安全に実装しづらい）なら、提案を安全で狭い版に作り直して続行
    if (!reformulated && attempt >= 2 && total < 70) {
      try {
        const ref = await aiReformulate(workingProposal, feedback);
        if (ref && ref.title) {
          workingProposal = { ...proposal, ...ref, target: proposal.target };
          reformulated = true;
          feedback += `\n（注：元提案は安全に実装しづらいため、確実に実装できる範囲へ調整した版で進める）`;
          console.log(`提案を安全側に再定式化: ${ref.title}`);
        }
      } catch (e) { console.log(`再定式化スキップ: ${e.message}`); }
    }
  }

  // 5回努力しても合格点に届かなければ、最高得点版を載せて見送る（安全弁は維持）
  if (!best || best.total < PASS) {
    setOutput({ ready: "true", to: TO, subject: `【SLOW FIRE JOURNAL・非公開】採点${best ? best.total : 0}点で見送り（${MAX_ATTEMPTS}回試行）：${proposal.title || ""}`, html: rejectedHtml(proposal, best ? best.grade : { total: 0, items: [], verdict: "実装できませんでした" }, best ? best.applied : [], file) });
    return;
  }
  const { grade, after, applied, skipped } = best;

  // 合格 → ブランチにコミット（公開はしない）
  gitSetup();
  const stamp = sh("date -u +%Y%m%d-%H%M%S").replace(/\s/g, "");
  const branch = `loop/${stamp}`;
  fs.writeFileSync(file, after);
  sh(`git checkout -b ${branch}`);
  sh(`git add ${JSON.stringify(file)}`);
  sh(`git commit -m ${JSON.stringify(`journal改善: ${proposal.title || file} (採点${grade.total})`)}`);
  sh(`git push origin ${branch}`);
  const commit = sh("git rev-parse HEAD");

  setOutput({
    ready: "true",
    to: TO,
    subject: `【SLOW FIRE JOURNAL】実装できました（採点${grade.total}点）公開しますか？：${proposal.title || ""}`,
    html: previewHtml({ proposal, grade, applied, skipped, file, branch, commit }),
  });
}

// =============================================================================
// アクション: publish-article（ブランチ → main 公開）
// =============================================================================
async function doPublish() {
  const { branch, commit } = PAYLOAD;
  if (!branch) { setOutput({ ready: "false" }); return; }
  gitSetup();
  sh("git fetch origin");
  sh("git checkout main");
  sh("git pull --ff-only origin main");
  try {
    sh(`git merge --no-ff origin/${branch} -m ${JSON.stringify(`journal改善を公開: ${branch}`)}`);
  } catch (e) {
    // 既にmainが進んでいる等で衝突 → ブランチのコミットをcherry-pick
    sh(`git merge --abort || true`);
    sh(`git cherry-pick ${commit || `origin/${branch}`}`);
  }
  sh("git push origin main");
  const mainCommit = sh("git rev-parse HEAD");
  // 公開したファイルを推定（このマージで変わったファイル）
  let changed = "";
  try { changed = sh(`git show --stat --format= ${mainCommit}`).split("\n")[0] || ""; } catch {}
  sh(`git push origin --delete ${branch} || true`);

  setOutput({
    ready: "true",
    to: TO,
    subject: `【SLOW FIRE JOURNAL】本番に公開しました${changed ? `：${changed}` : ""}`,
    html: publishedHtml({ branch, mainCommit, changed }),
  });
}

// =============================================================================
// アクション: discard-article（プレビュー破棄）
// =============================================================================
async function doDiscard() {
  const { branch } = PAYLOAD;
  if (branch) { gitSetup(); sh(`git push origin --delete ${branch} || true`); }
  setOutput({ ready: "false" }); // 通知は受け口ページで完結
}

// =============================================================================
// アクション: revert-article（公開済みを元に戻す）
// =============================================================================
async function doRevert() {
  const { commit } = PAYLOAD;
  if (!commit) { setOutput({ ready: "false" }); return; }
  gitSetup();
  sh("git checkout main");
  sh("git pull --ff-only origin main");
  sh(`git revert --no-edit ${commit}`);
  sh("git push origin main");
  setOutput({
    ready: "true",
    to: TO,
    subject: `【SLOW FIRE JOURNAL】変更を元に戻しました`,
    html: revertedHtml(commit),
  });
}

// ---- メールHTML群 ------------------------------------------------------------
const SHELL = (inner) => `<div style="font-family:-apple-system,'Hiragino Sans','Noto Sans JP',sans-serif;max-width:640px;margin:0 auto;background:#fff;color:#1b1b1b">
  <div style="background:#080604;border-radius:10px 10px 0 0;padding:20px 24px">
    <div style="color:#c2410c;font-size:12px;letter-spacing:.12em;font-weight:700">SLOW FIRE JOURNAL — 改善ループ</div>
  </div>
  <div style="border:1px solid #ececec;border-top:none;border-radius:0 0 10px 10px;padding:22px 24px">${inner}</div>
</div>`;
const btn = (href, label, bg, border) =>
  href ? `<a href="${href}" style="display:inline-block;background:${bg};color:${border ? "#64748b" : "#fff"};font-size:13px;font-weight:800;text-decoration:none;padding:11px 20px;border-radius:9px;${border ? "border:1px solid #cbd5e1;" : ""}">${label}</a>` : "";

function editsTable(applied) {
  return applied.map((e, i) => `<div style="border:1px solid #ececec;border-radius:8px;padding:10px 12px;margin-bottom:8px">
    <div style="font-size:11px;color:#888;margin-bottom:4px">${i + 1}. ${esc(e.why || "")}</div>
    <div style="font-size:11px;color:#dc2626;text-decoration:line-through;white-space:pre-wrap;word-break:break-word">${esc(String(e.find).slice(0, 240))}</div>
    <div style="font-size:11px;color:#16a34a;white-space:pre-wrap;word-break:break-word;margin-top:3px">${esc(String(e.replace).slice(0, 240))}</div>
  </div>`).join("");
}
function gradeTable(grade) {
  if (!grade.items || !grade.items.length) return "";
  return `<table style="width:100%;border-collapse:collapse;font-size:12px;margin:6px 0 4px">${grade.items.map((it) =>
    `<tr><td style="padding:3px 0;color:#666">${esc(it.name)}</td><td style="padding:3px 0;text-align:right;font-weight:700">${it.score}/${it.max}</td></tr>`).join("")}</table>`;
}

function previewHtml({ proposal, grade, applied, skipped, file, branch, commit }) {
  const blob = `https://github.com/${REPO}/blob/${branch}/${file}`;
  const live = liveUrlFor(file);
  const publish = changeLink("publish", { branch, commit, title: proposal.title });
  const discard = changeLink("discard", { branch, commit, title: proposal.title });
  return SHELL(`
    <div style="font-size:12px;color:#16a34a;font-weight:800;margin-bottom:6px">✅ 実装できました（自己採点 ${grade.total}点 / 合格${PASS}点）</div>
    <h2 style="font-size:18px;margin:0 0 4px">${esc(proposal.title || "")}</h2>
    <div style="font-size:12px;color:#888;margin-bottom:14px">対象：<a href="${live}" style="color:#c2410c">${esc(file)}</a></div>
    <div style="font-size:13px;color:#1b1b1b;background:#faf7f2;border:1px solid #ececec;border-radius:8px;padding:11px 13px;line-height:1.8;margin-bottom:16px">${esc(grade.verdict || "")}</div>
    ${gradeTable(grade)}
    <h3 style="font-size:13px;margin:18px 0 8px">変更内容（${applied.length}件）</h3>
    ${editsTable(applied)}
    ${skipped && skipped.length ? `<div style="font-size:11px;color:#b45309">※ ${skipped.length}件は安全のためスキップ（対象テキスト不一致など）</div>` : ""}
    <div style="margin:18px 0 6px">${btn(blob, "🔍 変更を確認（GitHub）", "#475569")}</div>
    <div style="margin-top:14px;padding:14px 16px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px">
      <div style="font-size:12px;color:#15803d;line-height:1.8;margin-bottom:10px"><b>これはまだ公開していません（プレビュー）。</b>内容を確認し、よければ公開してください。履歴に残るので、公開後でも元に戻せます。</div>
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td style="padding:0 8px 0 0">${btn(publish, "🚀 本番に公開する", "#16a34a")}</td>
        <td>${btn(discard, "取り消す", "#fff", true)}</td>
      </tr></table>
    </div>`);
}

function publishedHtml({ branch, mainCommit, changed }) {
  const revert = changeLink("revert", { commit: mainCommit, title: changed });
  const diff = `https://github.com/${REPO}/commit/${mainCommit}`;
  return SHELL(`
    <div style="font-size:12px;color:#16a34a;font-weight:800;margin-bottom:6px">🚀 本番に公開しました</div>
    <p style="font-size:13px;color:#1b1b1b;line-height:1.9">変更がmainに反映され、GitHub Pagesに公開されました（反映まで1〜2分）。${changed ? `<br>変更ファイル：<b>${esc(changed)}</b>` : ""}</p>
    <div style="margin:16px 0 6px">${btn(diff, "変更の詳細（GitHub）", "#475569")}</div>
    <div style="margin-top:14px;padding:13px 15px;background:#fff7ed;border:1px solid #fed7aa;border-radius:10px">
      <div style="font-size:12px;color:#b45309;line-height:1.8;margin-bottom:10px">もし違和感があれば、ワンクリックで元に戻せます。</div>
      ${btn(revert, "↩️ この変更を元に戻す", "#fff", true)}
    </div>`);
}

function rejectedHtml(proposal, grade, applied, file) {
  return SHELL(`
    <div style="font-size:12px;color:#dc2626;font-weight:800;margin-bottom:6px">⚠️ 自己採点に届かず、公開を見送りました（${grade.total}点 / 合格${PASS}点）</div>
    <h2 style="font-size:17px;margin:0 0 4px">${esc(proposal.title || "")}</h2>
    <div style="font-size:12px;color:#888;margin-bottom:12px">対象：${esc(file)}</div>
    <div style="font-size:13px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:11px 13px;line-height:1.8;margin-bottom:12px">${esc(grade.verdict || "")}</div>
    ${gradeTable(grade)}
    <h3 style="font-size:13px;margin:16px 0 8px">試した変更（参考・未公開）</h3>
    ${editsTable(applied)}
    <p style="font-size:12px;color:#888;margin-top:12px">誤情報・低品質を世に出さないための安全弁です。提案の精度や採点基準を一緒に調整できます。</p>`);
}

function notImplementableHtml(proposal) {
  return SHELL(`
    <div style="font-size:12px;color:#b45309;font-weight:800;margin-bottom:6px">🗂 自動実装の対象外でした</div>
    <h2 style="font-size:17px;margin:0 0 8px">${esc(proposal.title || "")}</h2>
    <p style="font-size:13px;color:#1b1b1b;line-height:1.9">この提案は「新規記事の作成」または対象記事が特定できないため、自動実装の対象外としました（既存記事へのテコ入れのみ自動化しています）。新規記事は週3回の自動ブログ、または手動でご対応ください。</p>
    <div style="font-size:12px;color:#666;background:#faf7f2;border-radius:8px;padding:11px 13px;margin-top:12px;line-height:1.8">対象指定：${esc(proposal.target || "(なし)")}<br>変更内容：${esc(proposal.change || "")}</div>`);
}

function failHtml(proposal, reason) {
  return SHELL(`
    <div style="font-size:12px;color:#dc2626;font-weight:800;margin-bottom:6px">⚠️ 実装できませんでした</div>
    <h2 style="font-size:17px;margin:0 0 8px">${esc(proposal.title || "")}</h2>
    <p style="font-size:13px;color:#1b1b1b;line-height:1.9">${esc(reason)}</p>
    <p style="font-size:12px;color:#888;margin-top:10px">サイトには何も変更していません。</p>`);
}

function revertedHtml(commit) {
  return SHELL(`
    <div style="font-size:12px;color:#64748b;font-weight:800;margin-bottom:6px">↩️ 元に戻しました</div>
    <p style="font-size:13px;color:#1b1b1b;line-height:1.9">先ほどの変更を打ち消して、本番を元の状態に戻しました（Pages反映まで1〜2分）。</p>
    <p style="font-size:12px;color:#888;margin-top:8px">対象コミット：${esc(String(commit).slice(0, 12))}</p>`);
}

// ---- ディスパッチ ------------------------------------------------------------
const handlers = {
  "implement-article": doImplement,
  "publish-article": doPublish,
  "discard-article": doDiscard,
  "revert-article": doRevert,
};

async function main() {
  const h = handlers[ACTION];
  if (!h) { console.error("未知のACTION:", ACTION); setOutput({ ready: "false" }); process.exit(0); }
  await h();
}

// テスト時（ACTIONなし）は純粋関数のexportだけ使えるよう、実行はACTIONがある時のみ
if (ACTION) {
  main().catch((e) => {
    console.error("致命的エラー:", e);
    setOutput({ ready: "true", to: TO, subject: "【SLOW FIRE JOURNAL】改善ループでエラー", html: failHtml(PAYLOAD.proposal || {}, String(e && e.message || e)) });
    process.exit(0);
  });
}
