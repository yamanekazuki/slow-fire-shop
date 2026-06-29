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

// domain で「ショップ本体(EC)」と「ブログ記事(journal)」を切り替える。
//   implement系: proposal.domain ／ 公開・取消・復元系: PAYLOAD.domain ／ 未指定は従来どおり article。
const DOMAIN = (PAYLOAD.proposal && PAYLOAD.proposal.domain) || PAYLOAD.domain || (ACTION.endsWith("-shop") ? "shop" : "article");
const IS_SHOP = DOMAIN === "shop";
const BRAND = IS_SHOP ? "SLOW FIRE SHOP" : "SLOW FIRE JOURNAL";
const UNIT = IS_SHOP ? "ページ" : "記事"; // メール文言用

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
  const d = b64urlJson({ kind, domain: DOMAIN, ...payload }); // domainを通して公開/復元メールのブランドを保つ
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
//   domain="article" … journal/配下の記事HTMLのみ（ブログ改善）
//   domain="shop"    … journal/を除くサイトのHTML（トップ/商品/LP等。EC本体改善）
// targetは生成AIや承認リンク経由で「/slow-fire-shop/product.html（全商品共通テンプレート）」のような
// 接頭辞・先頭スラッシュ・全角括弧の注釈付きで来ることが多い。表記揺れを徹底的に吸収して実ファイルに寄せる。
// それでも単一ファイルに落ちない（『サイト全体』等）場合は null を返し、呼び出し側の aiResolveTarget が
// 実在ページ一覧から最適な1ページを選ぶ（＝「対象外」で止めず、必ず実装に進める）。
export function resolveTargetFile(target, domain = "article") {
  if (!target) return null;
  const raw = String(target).trim();
  let t = raw;
  // 1) 全角/半角括弧の注釈を除去：例 "product.html（全商品共通テンプレート）" → "product.html"
  t = t.replace(/[（(][^（）()]*[）)]/g, "").trim();
  // 2) URLドメイン → 先頭スラッシュ → リポジトリ接頭辞 を順不同で吸収（順序に依存しない）
  t = t.replace(/^https?:\/\/[^/]+\//i, "");
  t = t.replace(/^\/+/, "");
  t = t.replace(/^slow-fire-shop\//, "");
  t = t.replace(/[?#].*$/, "").trim(); // クエリ/フラグメント除去
  if (t.includes("..")) return null; // パストラバーサル防止

  if (domain === "shop") {
    // 『サイト全体』『全ページ』等の横断ワードは単一ファイルに落ちない → AI解決に委ねる
    if (/サイト全体|site[-\s]?wide|全ページ|全ての?ページ|複数ページ|全商品ページ|各ページ|新規/i.test(raw)) return null;
    // ルート/トップ/ディレクトリ指定は index.html に寄せる
    if (t === "" || t === "/" ) t = "index.html";
    if (t.endsWith("/")) t = t + "index.html";
    if (t.startsWith("journal/")) return null; // ブログは別ループ(article)の担当
    if (t.endsWith(".html")) return fs.existsSync(t) ? t : null;
    // 拡張子なし → <t>.html / <t>/index.html を試す
    if (fs.existsSync(t + ".html")) return t + ".html";
    if (fs.existsSync(t + "/index.html")) return t + "/index.html";
    return null;
  }

  // article（従来）：journal/配下の記事のみ
  if (/新規|new (article|page)/i.test(raw)) return null;
  if (!t.startsWith("journal/")) {
    const m = t.match(/journal\/[^\s)]+\.html/);
    if (m) t = m[0];
    else return null;
  }
  if (!t.endsWith(".html")) return null;
  return fs.existsSync(t) ? t : null;
}

// ---- 実在ページ一覧 ----------------------------------------------------------
// リポジトリ内の編集候補HTMLを列挙する。システム/管理/検証用ページは除外。
//   shop    … journal/ を除くEC本体ページ（トップ・商品・ガイド・スポット等）
//   article … journal/ 配下の記事
const EXCLUDE_FILES = new Set(["404.html", "admin.html", "style-guide.html"]);
function listCandidateFiles(domain = "article") {
  const out = [];
  const walk = (dir) => {
    for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
      if (name.name.startsWith(".") || name.name === "node_modules" || name.name === "scripts") continue;
      const p = dir === "." ? name.name : `${dir}/${name.name}`;
      if (name.isDirectory()) walk(p);
      else if (name.name.endsWith(".html")) out.push(p);
    }
  };
  try { walk("."); } catch { return []; }
  return out.filter((p) => {
    if (EXCLUDE_FILES.has(p.split("/").pop())) return false;
    if (/^google[0-9a-f]+\.html$/i.test(p.split("/").pop())) return false; // 検証ファイル
    const inJournal = p.startsWith("journal/");
    return domain === "shop" ? !inJournal : inJournal;
  });
}

// ---- 対象不明時のAI解決 ------------------------------------------------------
// resolveTargetFile が単一ファイルに落とせなかった提案を「対象外」で捨てず、
// 実在ページ一覧の中から最も効果的に実装できる1ページをClaudeに選ばせる。
// 返り値は実在するリポジトリ相対パス、または null（候補ゼロ等の例外時のみ）。
const PICK_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    file: { type: "string", description: "候補一覧から選んだ、実装対象として最適な実在ファイルパス（一覧の文字列と完全一致）" },
    reason: { type: "string", description: "なぜこのページを選んだか（1文）" },
  },
  required: ["file", "reason"],
};
async function aiResolveTarget(proposal) {
  const files = listCandidateFiles(DOMAIN);
  if (!files.length) return null;
  if (files.length === 1) return files[0];
  const system = IS_SHOP
    ? `あなたはSLOW FIRE SHOP（アメリカンBBQのEC）のCRO担当。改善提案を、与えられた実在ページ一覧の中から「最も効果的に・安全に実装できる1ページ」に割り当てます。横断的な提案でも、まず主担当となる1ページ（多くはトップ index.html か商品ページ product.html）を選ぶこと。必ず一覧にあるファイルパスを完全一致で返す。`
    : `あなたはSLOW FIRE JOURNALの編集者。改善提案を、与えられた実在記事一覧の中から最も効果的に実装できる1記事に割り当てます。必ず一覧にあるファイルパスを完全一致で返す。`;
  const userMsg = `# 改善提案
タイトル: ${proposal.title}
当初の対象指定: ${proposal.target}
変更内容: ${proposal.change}
期待効果: ${proposal.impact || ""}

# 実在ページ一覧（この中から1つだけ選ぶ）
${files.map((f) => `- ${f}`).join("\n")}`;
  try {
    const r = await callClaude(system, userMsg, PICK_SCHEMA, { maxTokens: 1000, effort: "high" });
    if (r && r.file) {
      const picked = resolveTargetFile(r.file, DOMAIN) || (files.includes(r.file) ? r.file : null);
      if (picked && fs.existsSync(picked)) { console.log(`AI対象解決: ${picked}（${r.reason || ""}）`); return picked; }
    }
  } catch (e) { console.log(`AI対象解決スキップ: ${e.message}`); }
  // 最後の保険：shopはトップ、articleは一覧の先頭
  if (IS_SHOP && files.includes("index.html")) return "index.html";
  return files[0] || null;
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
    // 途中で切れた未完成HTML（最後のタグが閉じていない）を弾く＝壊れたページを本番に出さない安全弁
    const lastOpen = e.replace.lastIndexOf("<"), lastClose = e.replace.lastIndexOf(">");
    if (lastOpen > lastClose) { skipped.push({ ...e, reason: "置換HTMLが途中で切れている（未閉じタグ）ためスキップ" }); continue; }
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
  const system = IS_SHOP
    ? `あなたはSLOW FIRE SHOP（アメリカンBBQのEC）のWeb編集者／CRO（コンバージョン改善）担当です。
与えられたページHTMLに対し、改善提案を反映する最小限の find/replace 編集を作ります。完璧を狙って何も出せないより、確実で安全な一歩を必ず出します。

# 鉄則
- find はページHTML内に「一字一句そのまま」存在する文字列にする（一意に特定できるよう十分長く）。
- 変更は提案の範囲に限定。ページ全体の作り直しや、無関係な改変はしない。
- 事実を歪めない。価格・送料・在庫・商品仕様・配送/返品条件などを勝手に変えたり創作したりしない。
- SLOW FIREのトーンは落ち着いた実用志向。煽り・誇大・虚偽の限定表現・キーワード詰め込みは禁止。
- CTA文言・見出し・ファーストビューの価値提案・商品説明・内部リンク・FAQ・不安解消の一言などを、自然な日本語で改善する。
- 編集は最大5件まで。確実に効くものだけ。
- 【最重要・HTML健全性】replace は必ず「完結した正しいHTML」にする。タグを開いたら必ず閉じる。途中で切れた未完成のHTMLは絶対に出さない。
- 1件の replace を巨大にしない。大きなブロックを丸ごと差し込むより、既存要素の文言・属性を狙った小さく確実な編集に分割する（途中で切れて崩れる事故を防ぐ）。`
    : `あなたはSLOW FIRE JOURNAL（アメリカンBBQメディア）の編集者です。
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
# ${UNIT}HTML
${html}`;
  return callClaude(system, userMsg, EDIT_SCHEMA, { maxTokens: 20000, effort: "xhigh" });
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
  const system = IS_SHOP
    ? `あなたはSLOW FIRE SHOP（アメリカンBBQのEC）の責任者で、AIが作ったページ修正を世に出す前の最終審査をします。辛口に。ただし落とすときは「どう直せば合格に届くか」を必ず具体的に示し、書き手を合格まで導きます。
以下5項目で100点満点採点し、合計を出してください。
1. 提案との一致（25）：提案の意図どおりの修正になっているか（CV/導線に効く形か）
2. 事実・表記の正確性（25）：価格/送料/在庫/商品仕様/配送・返品条件を歪めたり創作していないか
3. ブランドトーン（20）：落ち着いた実用志向。煽り/誇大/虚偽の限定表現/不自然な日本語がない
4. SEO/表記安全性（15）：キーワード詰め込み・不自然な最適化・誤解を招く表現でない
5. HTML健全性（15）：タグ崩れ・リンク切れ・レイアウト破壊・意味の壊れがない`
    : `あなたはSLOW FIRE JOURNALの編集長で、AIが作った記事修正を世に出す前の最終審査をします。辛口に。ただし落とすときは「どう直せば合格に届くか」を必ず具体的に示し、書き手を合格まで導きます。
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
  // まず表記揺れを吸収して実ファイルに寄せる。落とせなければ実在ページ一覧からAIが最適な1ページを選ぶ。
  // ＝『サイト全体』『対象不明』でも止めず必ず実装に進める（山根さん要望：毎日確実に改善を回す）。
  let file = resolveTargetFile(proposal.target, DOMAIN);
  if (!file) {
    console.log(`resolveTargetFile が解決できず（target="${proposal.target}"）→ AIで対象ページを選定`);
    file = await aiResolveTarget(proposal);
  }

  // 候補ゼロ等、本当に対象が無いときだけ対象外として通知（安全弁・通常は到達しない）
  if (!file) {
    setOutput({
      ready: "true",
      to: TO,
      subject: `【${BRAND}】自動実装の対象外でした：${proposal.title || ""}`,
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
      if (attempt === MAX_ATTEMPTS && !best) { setOutput({ ready: "true", to: TO, subject: `【${BRAND}】実装に失敗：${proposal.title || ""}`, html: failHtml(proposal, `実装AIエラー: ${e.message}`) }); return; }
      feedback = `実装AIエラー: ${e.message}`; continue;
    }
    const { html: after, applied, skipped } = applyEdits(before, impl.edits);
    if (!applied.length) {
      if (attempt === MAX_ATTEMPTS && !best) { setOutput({ ready: "true", to: TO, subject: `【${BRAND}】変更を適用できませんでした：${proposal.title || ""}`, html: failHtml(proposal, "編集対象テキストが記事内で特定できませんでした（記事が更新済みの可能性）。") }); return; }
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
    setOutput({ ready: "true", to: TO, subject: `【${BRAND}・非公開】採点${best ? best.total : 0}点で見送り（${MAX_ATTEMPTS}回試行）：${proposal.title || ""}`, html: rejectedHtml(proposal, best ? best.grade : { total: 0, items: [], verdict: "実装できませんでした" }, best ? best.applied : [], file) });
    return;
  }
  const { grade, after, applied, skipped } = best;

  // 合格 → ブランチにコミット
  gitSetup();
  const stamp = sh("date -u +%Y%m%d-%H%M%S").replace(/\s/g, "");
  const branch = `loop/${stamp}`;
  fs.writeFileSync(file, after);
  sh(`git checkout -b ${branch}`);
  sh(`git add ${JSON.stringify(file)}`);
  sh(`git commit -m ${JSON.stringify(`${IS_SHOP ? "shop" : "journal"}改善: ${proposal.title || file} (採点${grade.total})`)}`);
  sh(`git push origin ${branch}`);
  const commit = sh("git rev-parse HEAD");

  // 自己採点が合格点(80)を超えた＝戻せる/低リスク変更なので、人の承認を待たず自動で本番公開する。
  // 山根さんはゲートキーパーでなく監査役（[[feedback_loop_human_not_bottleneck]] 原則②）。
  // 公開後の「事後報告」メールに［元に戻す］を付け、違和感があればワンクリックで戻せる安全弁を残す。
  const { mainCommit, changed } = mergeBranchToMain({ branch, commit });
  setOutput({
    ready: "true",
    to: TO,
    subject: `【${BRAND}】自動公開しました（採点${grade.total}点）：${proposal.title || ""}`,
    html: autoPublishedHtml({ proposal, grade, applied, skipped, file, mainCommit, changed }),
  });
}

// ---- ブランチ → main 公開（マージ）の共通処理 --------------------------------
// 自動公開（doImplement）と手動公開ボタン（doPublish）の両方から使う。
// 返り値 { mainCommit, changed }。mainCommit は［元に戻す］リンクの対象。
function mergeBranchToMain({ branch, commit }) {
  gitSetup();
  sh("git fetch origin");
  sh("git checkout main");
  sh("git pull --ff-only origin main");
  try {
    sh(`git merge --no-ff origin/${branch} -m ${JSON.stringify(`${IS_SHOP ? "shop" : "journal"}改善を公開: ${branch}`)}`);
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
  return { mainCommit, changed };
}

// =============================================================================
// アクション: publish-article（ブランチ → main 公開）
// ※ 通常は doImplement が合格時に自動公開するため使われないが、手動の
//   「本番に公開する」ボタン経路を後方互換として残す。
// =============================================================================
async function doPublish() {
  const { branch, commit } = PAYLOAD;
  if (!branch) { setOutput({ ready: "false" }); return; }
  const { mainCommit, changed } = mergeBranchToMain({ branch, commit });
  setOutput({
    ready: "true",
    to: TO,
    subject: `【${BRAND}】本番に公開しました${changed ? `：${changed}` : ""}`,
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
    subject: `【${BRAND}】変更を元に戻しました`,
    html: revertedHtml(commit),
  });
}

// ---- メールHTML群 ------------------------------------------------------------
const SHELL = (inner) => `<div style="font-family:-apple-system,'Hiragino Sans','Noto Sans JP',sans-serif;max-width:640px;margin:0 auto;background:#fff;color:#1b1b1b">
  <div style="background:#080604;border-radius:10px 10px 0 0;padding:20px 24px">
    <div style="color:#c2410c;font-size:12px;letter-spacing:.12em;font-weight:700">${BRAND} — 改善ループ</div>
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

// 自動公開の事後報告メール：合格点で承認を待たず公開した結果を報告する。
// 採点・変更内容を見せ、違和感があればワンクリックで戻せる［元に戻す］を付ける。
function autoPublishedHtml({ proposal, grade, applied, skipped, file, mainCommit, changed }) {
  const revert = changeLink("revert", { commit: mainCommit, title: proposal.title || changed });
  const diff = `https://github.com/${REPO}/commit/${mainCommit}`;
  const live = liveUrlFor(file);
  return SHELL(`
    <div style="font-size:12px;color:#16a34a;font-weight:800;margin-bottom:6px">🚀 自動で本番に公開しました（自己採点 ${grade.total}点 / 合格${PASS}点）</div>
    <h2 style="font-size:18px;margin:0 0 4px">${esc(proposal.title || "")}</h2>
    <div style="font-size:12px;color:#888;margin-bottom:12px">対象：<a href="${live}" style="color:#c2410c">${esc(file)}</a>（反映まで1〜2分）</div>
    <div style="font-size:12px;color:#15803d;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px 13px;line-height:1.8;margin-bottom:14px">合格点を超えたため、承認を待たずに公開しました。内容に違和感があれば、下のボタンでワンクリックで元に戻せます。</div>
    <div style="font-size:13px;color:#1b1b1b;background:#faf7f2;border:1px solid #ececec;border-radius:8px;padding:11px 13px;line-height:1.8;margin-bottom:14px">${esc(grade.verdict || "")}</div>
    ${gradeTable(grade)}
    <h3 style="font-size:13px;margin:18px 0 8px">変更内容（${applied.length}件）</h3>
    ${editsTable(applied)}
    ${skipped && skipped.length ? `<div style="font-size:11px;color:#b45309">※ ${skipped.length}件は安全のためスキップ（対象テキスト不一致など）</div>` : ""}
    <div style="margin:18px 0 6px">${btn(diff, "変更の詳細（GitHub）", "#475569")}</div>
    <div style="margin-top:14px;padding:13px 15px;background:#fff7ed;border:1px solid #fed7aa;border-radius:10px">
      <div style="font-size:12px;color:#b45309;line-height:1.8;margin-bottom:10px">もし違和感があれば、ワンクリックで元に戻せます。</div>
      ${btn(revert, "↩️ この変更を元に戻す", "#fff", true)}
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
    <p style="font-size:13px;color:#1b1b1b;line-height:1.9">${IS_SHOP
      ? "この提案は「サイト全体にまたがる変更」または対象ページが特定できないため、自動実装の対象外としました（単一ページへのテコ入れのみ自動化しています）。横断的な変更は手動でご対応ください。"
      : "この提案は「新規記事の作成」または対象記事が特定できないため、自動実装の対象外としました（既存記事へのテコ入れのみ自動化しています）。新規記事は週3回の自動ブログ、または手動でご対応ください。"}</p>
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
  "implement-shop": doImplement, // ショップ本体(EC)も同じ実装エンジン。domainで対象解決/文言/プロンプトを切替
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
    setOutput({ ready: "true", to: TO, subject: `【${BRAND}】改善ループでエラー`, html: failHtml(PAYLOAD.proposal || {}, String(e && e.message || e)) });
    process.exit(0);
  });
}
