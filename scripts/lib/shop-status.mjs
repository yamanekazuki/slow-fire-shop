/* =============================================================
   shop-status.mjs
   BBQラブの販売を「開ける／閉じる」切替（正本 = リポ直下 shop-status.json）。
   build-static-pages.mjs から呼ばれ、次の3つを切替に合わせて作り直す。
     1) product.html / product-<id>.html … 閉じている間は「準備中」ページ（noindex）
     2) sitemap.xml の商品URL            … 閉じている間は外し、再開したら戻す
     3) style.css の印の間               … 閉じている間はカート・商品一覧を隠す
   ============================================================= */

import fs from 'node:fs';

/* ファイルが無い・壊れている時は「開いている」扱い（今までどおりの動き） */
export function readShopStatus(file) {
  try {
    const j = JSON.parse(fs.readFileSync(file, 'utf8'));
    return { open: j.open !== false };
  } catch {
    return { open: true };
  }
}

/* ---------- sitemap.xml の商品URL ---------- */
const productLine = (base, id, lastmod) =>
  `  <url><loc>${base}/product-${id}.html</loc><lastmod>${lastmod}</lastmod><priority>0.85</priority></url>`;

export function syncSitemap(xml, { base, ids, open, today }) {
  const re = new RegExp(`^.*<loc>${base.replace(/[.]/g, '\\.')}/product(-[a-z0-9-]+)?\\.html</loc>.*\\n`, 'gm');
  if (!open) return xml.replace(re, '');
  const missing = ids.filter((id) => !xml.includes(`<loc>${base}/product-${id}.html</loc>`));
  if (!missing.length) return xml;
  const add = missing.map((id) => productLine(base, id, today)).join('\n') + '\n';
  return xml.replace('</urlset>', `${add}</urlset>`);
}

/* ---------- style.css の印の間 ---------- */
export const CSS_BEGIN = '/* SHOP-STATUS:BEGIN（scripts/lib/shop-status.mjs が自動で書く。手で直さない） */';
export const CSS_END = '/* SHOP-STATUS:END */';

// 閉じている間に隠すもの: カート一式・トップの商品一覧/おすすめ/送料の帯・「ラブを見る」・商品一覧へのリンク
export const CLOSED_CSS = `#cartBtn, .cart-icon-btn, #cartBackdrop, #cartDrawer, #ordersBackdrop, #ordersDrawer, #checkoutOverlay,
#products, #picks-top, .trust-strip, .yhero-btn-primary[href^="product"],
a[href$="#products"] { display: none !important; }`;

export function applyStyleBlock(css, { open }) {
  const body = open ? '' : CLOSED_CSS + '\n';
  const block = `${CSS_BEGIN}\n${body}${CSS_END}`;
  const re = /\/\* SHOP-STATUS:BEGIN[^*]*\*\/[\s\S]*?\/\* SHOP-STATUS:END \*\//;
  if (re.test(css)) return css.replace(re, block);
  return css.replace(/\n*$/, '\n\n') + block + '\n';
}
