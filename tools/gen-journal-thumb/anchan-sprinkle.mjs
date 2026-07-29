#!/usr/bin/env node
/**
 * anchan-sprinkle.mjs — 記事本文に あんちゃん／やまちゃん／うえたく を散りばめる（決定的・Claude API不使用）
 *
 * 山根さんFB（2026-07-30）「各記事にあんちゃん・やまちゃん・うえたくを散りばめて」への実装。
 *   - 各記事の本文（div.jr-body）の h2 の直前に 2〜3体を挿入する
 *   - セリフは「その記事の中身」から拾う（温度・時間・数値の入った一文を優先）。全記事同一文言は禁止
 *   - キャラとポーズは slug のハッシュでローテーション（毎回同じ結果＝決定的）
 *   - data-auto="1" を付けて自分の挿入分だけを識別する＝再実行しても増殖しない（冪等）
 *   - anchan.js は記事HTMLに直接読み込む（journal配下は yoron-bridge.js を読んでいないため）
 *
 * 使い方: node tools/gen-journal-thumb/anchan-sprinkle.mjs [slug ...]
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const ART_DIR = path.join(ROOT, "journal", "articles");

function hashCode(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

const WHO = ["an", "yama", "ueta"];
const POSES = {
  an: ["wave", "point", "cheer"],
  yama: ["tongs", "think", "guide"],
  ueta: ["point", "peek", "think"],
};
// キャラごとの語り口。core（記事から拾った要点）を常体・絵文字なしで包む
const FRAMES = {
  an: [
    (c) => `${c}。ここ、大事なところだよ`,
    (c) => `${c}。うちでもこうしてる`,
    (c) => `${c}。覚えておいて損はないよ`,
  ],
  yama: [
    (c) => `${c}。数字で見るとはっきりする`,
    (c) => `${c}。ここは測るのがいちばん早い`,
    (c) => `${c}。温度で判断すると迷わない`,
  ],
  ueta: [
    (c) => `${c}。ここで失敗する人が多い`,
    (c) => `${c}。押さえるのはここ`,
    (c) => `${c}。現場だとここが分かれ目`,
  ],
};

const stripTags = (s) => s.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
const NUMRE = /(\d+\s*(?:℃|度|時間|分|kg|g|cm|mm|%|人前|本|枚|回))/;

/**
 * セクション本文から「一言のもと」になる一文を決定的に選ぶ。
 * 途中で切れた不自然な文にならないよう、そのままで収まる長さの一文だけを候補にする。
 */
function coreSentence(sectionText, h2Text, salt) {
  const clean = (s) => {
    let t = s.replace(/\s+/g, "").replace(/^[『（(・]/, "").replace(/[。！？、]+$/, "").trim();
    // 文頭の鉤カッコを落とすと閉じだけが残るので、対応が崩れたカッコは取り除く
    if (/^「/.test(t) && (t.match(/」/g) || []).length <= (t.match(/「/g) || []).length) t = t.slice(1);
    while ((t.match(/」/g) || []).length > (t.match(/「/g) || []).length) t = t.replace("」", "");
    while ((t.match(/「/g) || []).length > (t.match(/」/g) || []).length) t = t.replace(/「([^「」]*)$/, "$1");
    return t.trim();
  };
  const sents = sectionText
    .split(/(?<=[。！？])/)
    .map(clean)
    // 「〜で解説しています」「次の3段階」のような案内文はセリフに向かないので落とす
    .filter((s) => s.length >= 12 && s.length <= 32 && !/^[Qq]\./.test(s))
    .filter((s) => !/(解説|参照|詳しくは|くわしくは|次の|以下|上記|前述|この記事|ご紹介|くわしく)/.test(s));
  const numbered = sents.filter((s) => NUMRE.test(s));
  const pool = numbered.length ? numbered : sents;
  if (pool.length) return pool[salt % pool.length];
  // 収まる一文がなければ見出しをそのまま使う（見出しは記事ごとに固有なので文言は重複しない）
  const h = clean(h2Text).replace(/^\d+[.、]?/, "");
  return h.length > 30 ? h.slice(0, 30) : h;
}

const attrEsc = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** 記事1本を処理して更新後HTMLを返す（変更なしなら null） */
export function sprinkle(html, slug) {
  const before = html;

  // 0) 既存の自動挿入分を撤去（冪等化）
  html = html.replace(/[ \t]*<div data-anchan="[^"]*"[^>]*data-auto="1"[^>]*><\/div>\n?/g, "");

  // 1) 本文領域を取り出す
  const bodyStart = html.indexOf('<div class="jr-body">');
  if (bodyStart === -1) return null;
  const bodyEnd = html.indexOf('<div class="jr-back">', bodyStart);
  const body = html.slice(bodyStart, bodyEnd === -1 ? html.length : bodyEnd);

  // 2) h2 の位置と見出しテキスト（目次nav内のリンクは対象外＝h2タグだけを見る）
  const all = [...body.matchAll(/<h2(?:\s[^>]*)?>([\s\S]*?)<\/h2>/g)].map((m) => ({
    index: m.index,
    end: m.index + m[0].length,
    text: stripTags(m[1]),
  }));
  // 販促・FAQ・関連記事セクションの前には置かない（読み物の流れの中に出したい）
  const NG = /(おすすめのラブ|関連記事|よくある質問|参考|出典|この記事の|まとめ買い|商品)/;
  const h2s = all;
  const okIdx = all.map((x, i) => i).filter((i) => !NG.test(all[i].text));
  if (all.length < 3 || okIdx.length < 2) return null;

  // 3) 挿入する h2 を決める（導入直後・中盤・終盤の3点。少なければ2点）
  const n = h2s.length;
  const cand = okIdx.filter((i) => i > 0); // 冒頭h2の前（=リード直後）には置かない
  const pick = cand.length >= 5
    ? [cand[1], cand[Math.floor(cand.length / 2)], cand[cand.length - 2]]
    : cand.length >= 3
      ? [cand[0], cand[Math.floor(cand.length / 2)], cand[cand.length - 1]]
      : [cand[0], cand[cand.length - 1]];
  const targets = [...new Set(pick)].filter((i) => Number.isInteger(i) && i > 0 && i < n).sort((a, b) => a - b);

  const h = hashCode(slug);
  const inserts = targets.map((ti, k) => {
    const who = WHO[(h + k) % 3];
    const pose = POSES[who][(h + k * 2) % 3];
    const sec = body.slice(h2s[ti].end, ti + 1 < n ? h2s[ti + 1].index : body.length);
    const core = coreSentence(stripTags(sec), h2s[ti].text, h + k);
    const say = FRAMES[who][(h + k * 3) % 3](core);
    return { at: h2s[ti].index, who, pose, say };
  });

  // 4) 後ろから挿入（前のindexを壊さない）
  let newBody = body;
  for (const ins of [...inserts].reverse()) {
    const tag = `<div data-anchan="${ins.pose}" data-who="${ins.who}" data-size="s" data-say="${attrEsc(ins.say)}" data-auto="1"></div>\n      `;
    newBody = newBody.slice(0, ins.at) + tag + newBody.slice(ins.at);
  }
  html = html.slice(0, bodyStart) + newBody + html.slice(bodyEnd === -1 ? html.length : bodyEnd);

  // 5) anchan.js を読み込む（未読込のときだけ・記事は journal/articles/ 配下なので ../../）
  if (!/anchan\.js/.test(html)) {
    html = html.replace(/\n?<\/body>/, `\n  <script src="../../anchan.js?v=20260730" defer></script>\n</body>`);
  }

  return html === before ? null : html;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const only = process.argv.slice(2);
  const files = readdirSync(ART_DIR).filter((f) => f.endsWith(".html"));
  let n = 0, skip = 0;
  for (const f of files) {
    const slug = f.replace(/\.html$/, "");
    if (only.length && !only.includes(slug)) continue;
    const file = path.join(ART_DIR, f);
    const out = sprinkle(readFileSync(file, "utf8"), slug);
    if (!out) { skip++; console.warn(`- スキップ: ${slug}（h2が少ない/変更なし）`); continue; }
    writeFileSync(file, out, "utf8");
    n++;
    const says = [...out.matchAll(/data-anchan="([^"]+)" data-who="([^"]+)"[^>]*data-say="([^"]+)"/g)];
    console.log(`${slug}: ${says.length}体  ${says.map((s) => `${s[2]}/${s[1]}「${s[3]}」`).join(" ｜ ")}`);
  }
  console.log(`\nキャラ挿入: ${n}件（スキップ ${skip}件）`);
}
