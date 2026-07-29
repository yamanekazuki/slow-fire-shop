#!/usr/bin/env node
/**
 * 生成済みサムネ(journal/thumbs/<slug>.jpg)を、記事ページのヒーロー画像・og:image・
 * journal/index.html と journal/category/*.html のカードサムネに配線する。
 * 決定的な文字列置換のみ（Claude API不使用）。
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const ART_DIR = path.join(ROOT, "journal", "articles");
const THUMB_DIR = path.join(ROOT, "journal", "thumbs");
const SITE = "https://an-bbq.jp";

const slugs = readdirSync(ART_DIR).filter((f) => f.endsWith(".html")).map((f) => f.replace(/\.html$/, ""));

let heroCount = 0, ogCount = 0, relCount = 0;
for (const slug of slugs) {
  const file = path.join(ART_DIR, `${slug}.html`);
  const thumbFile = path.join(THUMB_DIR, `${slug}.jpg`);
  if (!existsSync(thumbFile)) { console.warn(`⚠️ サムネなし: ${slug}`); continue; }
  let html = readFileSync(file, "utf8");
  const before = html;

  // 1) ヒーロー画像を生成サムネに差し替え（相対パスは記事から見て ../thumbs/<slug>.jpg）
  html = html.replace(
    /(<div class="jr-hero-img-inner[^"]*">\s*<img src=")[^"]+("[^>]*alt=")[^"]*("[^>]*>)/,
    (_m, p1, p2, p3) => `${p1}../thumbs/${slug}.jpg${p2}記事サムネイル${p3}`
  );
  if (html !== before) heroCount++;

  // 2) og:image / twitter:image を絶対URLで差し替え（無ければ追加はしない＝既存構造を尊重）
  const absThumb = `${SITE}/journal/thumbs/${slug}.jpg`;
  const beforeOg = html;
  html = html.replace(/(<meta property="og:image" content=")[^"]*(")/, `$1${absThumb}$2`);
  html = html.replace(/(<meta name="twitter:image" content=")[^"]*(")/, `$1${absThumb}$2`);
  // og:image / twitter:image が元々無い記事には twitter:card の直後に追加
  if (!/<meta property="og:image"/.test(html)) {
    html = html.replace(
      /(<meta name="twitter:card" content="summary_large_image">)/,
      `$1\n  <meta property="og:image" content="${absThumb}">\n  <meta name="twitter:image" content="${absThumb}">`
    );
  }
  if (html !== beforeOg) ogCount++;

  // 3) 記事末尾の関連記事カード → リンク先記事の生成サムネ（同じストック写真が並ぶのを止める）
  html = html.replace(
    /(<a href="(?:https:\/\/an-bbq\.jp\/journal\/articles\/)?([a-z0-9-]+)\.html" class="jr-related-card"[^>]*>\s*<div class="jr-related-img"><img src=")[^"]+(")/g,
    (m, p1, s, p2) => {
      if (!existsSync(path.join(THUMB_DIR, `${s}.jpg`))) return m;
      relCount++;
      return `${p1}../thumbs/${s}.jpg${p2}`;
    }
  );

  if (html !== before) writeFileSync(file, html);
}
console.log(`記事ページ: hero差し替え ${heroCount}件 / og:image差し替え ${ogCount}件 / 関連カード ${relCount}件`);

// ---- journal/index.html のカードサムネ差し替え -----------------------------
function wireCards(file, prefix) {
  let html = readFileSync(file, "utf8");
  let n = 0;
  html = html.replace(
    /(<a href="[^"]*articles\/([a-z0-9-]+)\.html" class="jr-(?:list|feat|related)-card"[^>]*>[\s\S]*?<div class="jr-(?:list|feat|related)-img">\s*<img src=")[^"]+(")/g,
    (m, p1, slug, p2) => {
      const thumb = path.join(THUMB_DIR, `${slug}.jpg`);
      if (!existsSync(thumb)) return m;
      n++;
      return `${p1}${prefix}thumbs/${slug}.jpg${p2}`;
    }
  );
  writeFileSync(file, html);
  return n;
}

const idxN = wireCards(path.join(ROOT, "journal", "index.html"), "");
console.log(`journal/index.html: ${idxN}件のカードサムネを差し替え`);

const catDir = path.join(ROOT, "journal", "category");
for (const f of readdirSync(catDir).filter((f) => f.endsWith(".html"))) {
  const n = wireCards(path.join(catDir, f), "../");
  console.log(`journal/category/${f}: ${n}件のカードサムネを差し替え`);
}
