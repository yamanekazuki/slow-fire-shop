#!/usr/bin/env node
/**
 * assign.mjs — 記事の「中身」に合う実写を1枚選んで photo-map.json に書く（2026-09-14）
 *
 * 経緯（山根さんFB 2026-09-14）:
 *   「BBQ後のグリル掃除」の記事の背景がアスパラになっていた。
 *   原因は2つ。①カテゴリ名だけで写真を選び、ファイル名に "grill" を含む写真を先頭から取っていた
 *   （yoron-grilled-asparagus.jpg が gear の "grill" にヒット）②CIが photo-map.json をコミットしておらず、
 *   新記事の割当が毎回消えて、同じ5枚の余り写真を使い回していた。
 *
 * 方針:
 *   - 写真台帳 photo-map.json の catalog（写真→日本語タグ）と、記事のタイトル／説明／h2 を突き合わせて採点する。
 *   - 未使用の写真の中で最高点を採用。点が付かなければカテゴリの雰囲気タグで選ぶ。
 *   - 未使用が尽きたら「内容の合う既出写真」を借りる（警告を出す）。合わない写真を出すより重複のほうがまし。
 *   - 写真のAI生成はしない。承認済み実写＋出典明記のCC実写（credits に記録）だけを使う。
 *
 * 使い方:
 *   node tools/gen-journal-thumb/assign.mjs --backfill          … 台帳に無い記事すべてに割当
 *   node tools/gen-journal-thumb/assign.mjs --reassign <slug>   … 既存割当を捨てて再選定
 *   node tools/gen-journal-thumb/assign.mjs --dry <slug>         … 候補と点数を表示するだけ
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const ART_DIR = path.join(ROOT, "journal", "articles");
const PHOTO_MAP = path.join(HERE, "photo-map.json");
const PHOTO_DIRS = ["images/journal", "images/journal/pool", "images/recipes"];

// カテゴリの雰囲気（タグが1つも当たらない記事の逃げ道。食べ物の写真を gear/science に回さない）
const CATEGORY_MOOD = {
  recipe: ["肉", "皿", "盛り合わせ", "チキン", "リブ", "エビ", "野菜"],
  science: ["炭火", "煙", "温度", "焼き網", "炎", "スモーカー"],
  gear: ["道具", "ケトル", "炭", "火起こし", "焼き網", "スモーカー", "掃除"],
  philosophy: ["仲間", "海", "夕日", "乾杯", "家族"],
};

export function loadMap() {
  return JSON.parse(readFileSync(PHOTO_MAP, "utf8"));
}
export function saveMap(map) {
  writeFileSync(PHOTO_MAP, JSON.stringify(map, null, 2) + "\n", "utf8");
}
export function allPhotos() {
  const out = [];
  for (const d of PHOTO_DIRS) {
    const abs = path.join(ROOT, d);
    if (!existsSync(abs)) continue;
    for (const f of readdirSync(abs)) if (/\.(jpe?g|png)$/i.test(f)) out.push(`${d}/${f}`);
  }
  return out.sort();
}
export function usedSet(map) {
  return new Set([...Object.values(map.articles || {}), ...Object.values(map.guide || {})]);
}

/** 記事HTMLからタイトル・説明・h2・カテゴリを抜く */
export function extractArticle(file) {
  const html = readFileSync(file, "utf8");
  const strip = (s) => s.replace(/<[^>]+>/g, "").trim();
  const h1 = strip((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [, ""])[1]);
  const desc = (html.match(/<meta name="description" content="([^"]+)"/) || [, ""])[1];
  const h2s = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)].map((m) => strip(m[1]));
  const cat = ((html.match(/<span class="jr-category">([^<]+)<\/span>/) || [, "recipe"])[1]).split(/[·\s]+/)[0].toLowerCase();
  return { h1, desc, h2s, category: cat };
}

/** タグ照合の点数。タイトル3点・説明2点・h2は1点ずつ（上限3） */
export function scorePhoto(tags, art) {
  let s = 0;
  const h2text = art.h2s.join("\n");
  for (const t of tags) {
    if (art.h1.includes(t)) s += 3;
    if (art.desc.includes(t)) s += 2;
    const n = art.h2s.filter((h) => h.includes(t)).length;
    s += Math.min(n, 3);
    if (!n && h2text.includes(t)) s += 1;
  }
  return s;
}

/**
 * 記事に合う写真を選ぶ。
 * @returns {{photo:string, score:number, borrowed:boolean, reason:string}}
 */
export function choosePhoto(art, map, { exclude = new Set() } = {}) {
  const catalog = map.catalog || {};
  const used = usedSet(map);
  const all = allPhotos().filter((p) => !exclude.has(p));
  const free = all.filter((p) => !used.has(p));
  const ranked = (list) =>
    list
      .map((p) => ({ photo: p, score: scorePhoto(catalog[p] || [], art) }))
      .sort((a, b) => b.score - a.score || a.photo.localeCompare(b.photo));

  // 使用回数（借用時に「同じ写真ばかり」を避けるため。既出1回=減点8）
  const useCount = new Map();
  for (const v of [...Object.values(map.articles || {}), ...Object.values(map.guide || {})]) useCount.set(v, (useCount.get(v) || 0) + 1);
  const STRONG_FREE = 4;   // 未使用でこの点以上なら内容一致とみなす
  const STRONG_BORROW = 5; // 既出を借りるのはこの点以上のときだけ

  // 1) 未使用の中で内容がしっかり合うもの
  const freeRanked = ranked(free);
  if (freeRanked.length && freeRanked[0].score >= STRONG_FREE) {
    return { ...freeRanked[0], borrowed: false, reason: "未使用・内容一致" };
  }
  // 2) 未使用に合うものが無ければ、内容の合う既出写真を借りる（使用回数の少ないものから）。
  //    合わない写真を出すより重複のほうがまし（掃除記事にアスパラ事故の教訓）。
  const borrowRanked = all
    .filter((p) => used.has(p))
    .map((p) => {
      const score = scorePhoto(catalog[p] || [], art);
      return { photo: p, score, eff: score - 8 * (useCount.get(p) || 0) };
    })
    .filter((x) => x.score >= STRONG_BORROW)
    .sort((a, b) => b.eff - a.eff || a.photo.localeCompare(b.photo));
  if (borrowRanked.length) {
    const b = borrowRanked[0];
    return { photo: b.photo, score: b.score, borrowed: true, reason: `既出を借用・内容一致（使用${useCount.get(b.photo)}回目→承認済み実写を pool/ に追加してください）` };
  }
  // 3) 弱い一致でも未使用があればそれ
  if (freeRanked.length && freeRanked[0].score > 0) {
    return { ...freeRanked[0], borrowed: false, reason: "未使用・弱い一致" };
  }
  // 4) 未使用の中でカテゴリの雰囲気が合うもの
  const mood = CATEGORY_MOOD[art.category] || [];
  const moodHit = free.find((p) => (catalog[p] || []).some((t) => mood.includes(t)));
  if (moodHit) return { photo: moodHit, score: 0, borrowed: false, reason: "未使用・カテゴリの雰囲気" };
  // 5) 最後の手段: 未使用があればその先頭、無ければ雰囲気一致の既出（使用回数最少）
  if (free.length) return { photo: free[0], score: 0, borrowed: false, reason: "未使用・順送り" };
  const moodAll = all
    .filter((p) => (catalog[p] || []).some((t) => mood.includes(t)))
    .sort((a, b) => (useCount.get(a) || 0) - (useCount.get(b) || 0) || a.localeCompare(b))[0] || all[0];
  return { photo: moodAll, score: 0, borrowed: true, reason: "既出を借用・カテゴリの雰囲気" };
}

/** slug の記事に写真を割り当てて台帳に書く（既に割当があればそれを返す） */
export function assignForSlug(slug, { force = false, dry = false } = {}) {
  const map = loadMap();
  map.articles ||= {}; map.guide ||= {};
  if (map.articles[slug] && !force) return { photo: map.articles[slug], existing: true };
  const file = path.join(ART_DIR, `${slug}.html`);
  if (!existsSync(file)) throw new Error(`記事が見つかりません: ${file}`);
  const art = extractArticle(file);
  const prev = map.articles[slug];
  if (force) delete map.articles[slug];
  const pick = choosePhoto(art, map, { exclude: new Set(prev ? [prev] : []) });
  if (!dry) {
    map.articles[slug] = pick.photo;
    saveMap(map);
  }
  return { ...pick, existing: false, art };
}

export function creditFor(photoRel, map = loadMap()) {
  return (map.credits || {})[photoRel] || null;
}

// ---- CLI ---------------------------------------------------------------------
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = process.argv.slice(2);
  const mode = args[0];
  if (mode === "--backfill") {
    const map = loadMap();
    const slugs = readdirSync(ART_DIR).filter((f) => f.endsWith(".html")).map((f) => f.replace(/\.html$/, ""));
    const missing = slugs.filter((s) => !map.articles[s]);
    if (!missing.length) { console.log("割当のない記事はありません。"); process.exit(0); }
    let borrowed = 0;
    for (const s of missing) {
      const r = assignForSlug(s);
      if (r.borrowed) borrowed++;
      console.log(`${r.borrowed ? "⚠️" : "✓"} ${s} → ${path.basename(r.photo)}  [${r.score}点・${r.reason}]`);
    }
    console.log(`\n割当 ${missing.length}件（借用 ${borrowed}件）`);
  } else if (mode === "--reassign" || mode === "--dry") {
    const slug = args[1];
    if (!slug) { console.error("slug を指定してください"); process.exit(2); }
    if (mode === "--dry") {
      const map = loadMap();
      const art = extractArticle(path.join(ART_DIR, `${slug}.html`));
      const catalog = map.catalog || {};
      const used = usedSet(map);
      const ranked = allPhotos()
        .map((p) => ({ p, s: scorePhoto(catalog[p] || [], art), used: used.has(p) }))
        .filter((x) => x.s > 0)
        .sort((a, b) => b.s - a.s);
      console.log(`記事: ${art.h1}\nカテゴリ: ${art.category}\n候補:`);
      for (const x of ranked.slice(0, 10)) console.log(`  ${x.s}点 ${x.used ? "(使用中)" : "(未使用)"} ${x.p}`);
      if (!ranked.length) console.log("  （タグ一致なし）");
    } else {
      const r = assignForSlug(slug, { force: true });
      console.log(`${r.borrowed ? "⚠️" : "✓"} ${slug} → ${r.photo}  [${r.score}点・${r.reason}]`);
    }
  } else {
    console.log("使い方: assign.mjs --backfill | --reassign <slug> | --dry <slug>");
    process.exit(2);
  }
}
