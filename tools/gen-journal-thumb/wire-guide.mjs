#!/usr/bin/env node
/**
 * wire-guide.mjs — journal/guide/ の画像を photo-map.json の固有割当に差し替える（決定的・Claude API不使用）
 *
 * 山根さんFB（2026-07-30）「guideで同じ写真が何枚も並ぶのが気持ち悪い」への対応。
 *   - guide各ページのヒーロー画像 → photo-map.json の guide 割当（1記事=1枚・重複禁止）
 *   - guide/index.html の一覧カード画像 → 同じ割当（ページとカードで絵が一致する）
 *   - guide内の関連記事カード → その記事の生成サムネ（../thumbs/<slug>.jpg）
 *   - 外部ストック画像（images.unsplash.com）への依存をなくす
 *
 * 使い方: node tools/gen-journal-thumb/wire-guide.mjs
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const GUIDE_DIR = path.join(ROOT, "journal", "guide");
const THUMB_DIR = path.join(ROOT, "journal", "thumbs");
const map = JSON.parse(readFileSync(path.join(HERE, "photo-map.json"), "utf8"));

const attrEsc = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;");

let heroN = 0, relN = 0, missing = [];
const slugs = readdirSync(GUIDE_DIR).filter((f) => f.endsWith(".html") && f !== "index.html").map((f) => f.replace(/\.html$/, ""));

for (const slug of slugs) {
  const rel = map.guide[slug];
  if (!rel) { missing.push(slug); continue; }
  if (!existsSync(path.join(ROOT, rel))) { missing.push(`${slug}(写真なし:${rel})`); continue; }
  const file = path.join(GUIDE_DIR, `${slug}.html`);
  let html = readFileSync(file, "utf8");
  const before = html;
  const title = (html.match(/<h1[^>]*>([^<]+)<\/h1>/) || [, slug])[1].trim();

  // 1) ヒーロー画像
  html = html.replace(
    /(<div class="jr-hero-img"><div class="jr-hero-img-inner[^"]*"><img src=")[^"]+("[^>]*alt=")[^"]*(")/,
    (_m, p1, p2, p3) => `${p1}../../${rel}${p2}${attrEsc(title)}${p3}`
  );
  if (html !== before) heroN++;

  // 2) 関連記事カード → 記事の生成サムネ
  html = html.replace(
    /(<a href="(?:\.\.\/articles\/|https:\/\/an-bbq\.jp\/journal\/articles\/)([a-z0-9-]+)\.html" class="jr-related-card"[^>]*>\s*<div class="jr-related-img"><img src=")[^"]+(")/g,
    (m, p1, s, p2) => {
      if (!existsSync(path.join(THUMB_DIR, `${s}.jpg`))) return m;
      relN++;
      return `${p1}../thumbs/${s}.jpg${p2}`;
    }
  );

  if (html !== before) writeFileSync(file, html, "utf8");
}

// 3) guide/index.html の一覧カード
const idxFile = path.join(GUIDE_DIR, "index.html");
let idx = readFileSync(idxFile, "utf8");
let cardN = 0;
idx = idx.replace(
  /(<a href="[^"]*\/journal\/guide\/([a-z0-9-]+)\.html" class="jr-list-card"[^>]*>\s*<div class="jr-list-img"><img src=")[^"]+(")/g,
  (m, p1, slug, p2) => {
    const rel = map.guide[slug];
    if (!rel) return m;
    cardN++;
    return `${p1}../../${rel}${p2}`;
  }
);
writeFileSync(idxFile, idx, "utf8");

console.log(`guideヒーロー: ${heroN}件 / 関連カード: ${relN}件 / guide一覧カード: ${cardN}件`);
if (missing.length) console.warn(`⚠️ photo-map.json の guide 割当なし: ${missing.join(", ")}`);
