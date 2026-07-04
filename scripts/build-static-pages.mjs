/* =============================================================
   build-static-pages.mjs
   SLOW FIRE SHOP — 商品・レシピの個別ページを「静的HTML」として生成する。

   なぜ必要か:
     従来は product.html?id=xxx / recipe.html?id=xxx という
     クエリパラメータURLで、中身はJSが後から差し込む空シェルだった。
     → Google は「?id違いは同じ1ページ」と見なし、中身も空に見えるため
       174ページが「URLが認識されていない」状態でインデックス拒否されていた。

   この生成物:
     /product-<id>.html  … 1商品1ファイル。タイトル/説明/H1/canonical/JSON-LDを
                            HTMLに焼き込み（=JS無しでもクローラが中身を読める）。
     /recipe-<id>.html   … 同上（レシピ）。
     内部リンクも product-<id>.html / recipe-<id>.html のクリーンURLへ変換。
     旧 product.html / recipe.html は canonical を新URLへ向けて共倒れを防ぐ
     （別途 add-canonical で処理）。

   使い方:  node scripts/build-static-pages.mjs
   出力:    リポジトリ直下に product-*.html / recipe-*.html を生成/上書き
   ============================================================= */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = 'https://yamanekazuki.github.io/slow-fire-shop';

/* ---------- data files を window シムで読み込む ---------- */
function loadData() {
  const win = {};
  win.window = win;
  win.document = { addEventListener() {} }; // 念のため
  const code = ['product-data.js', 'recipe-data.js']
    .map((f) => fs.readFileSync(path.join(ROOT, f), 'utf8'))
    .join('\n;\n');
  const fn = new Function('window', 'document', code + '\nreturn window;');
  return fn(win, win.document);
}

/* ---------- HTML エスケープ ---------- */
const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/* ---------- クエリURL → クリーンURL 変換 ----------
   JS テンプレートリテラル( ${...} )と静的文字列の両方を変換する。 */
function cleanLinks(html) {
  return html
    .replace(/product\.html\?id=\$\{([^}]+)\}/g, 'product-${$1}.html')
    .replace(/recipe\.html\?id=\$\{([^}]+)\}/g, 'recipe-${$1}.html')
    .replace(/product\.html\?id=([a-z0-9-]+)/g, 'product-$1.html')
    .replace(/recipe\.html\?id=([a-z0-9-]+)/g, 'recipe-$1.html');
}

/* ---------- 1要素の空タグに中身を焼き込む ---------- */
function fill(html, marker, closeTag, value) {
  // marker 例: 'id="pdName"'  → その要素の ></closeTag> の間に value を挿入
  const re = new RegExp(`(${marker}[^>]*>)</${closeTag}>`);
  return html.replace(re, `$1${value}</${closeTag}>`);
}

const win = loadData();
const PRODUCTS = win.PRODUCT_DETAILS || {};
const RECIPES = win.RECIPES || [];
const RECIPES_BY_ID = Object.fromEntries(RECIPES.map((r) => [r.id, r]));

const productTpl = fs.readFileSync(path.join(ROOT, 'product.html'), 'utf8');
const recipeTpl = fs.readFileSync(path.join(ROOT, 'recipe.html'), 'utf8');

let generated = [];

/* ============================================================
   PRODUCT ページ生成
   ============================================================ */
for (const [id, p] of Object.entries(PRODUCTS)) {
  const url = `${BASE}/product-${id}.html`;
  const title = `${p.name} (${p.nameja}) — ${p.brandLabel} | SLOW FIRE SHOP`;
  const desc = `${p.desc} ${p.flavorNotes}`.trim();

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    alternateName: p.nameja,
    image: p.image,
    description: p.desc,
    brand: { '@type': 'Brand', name: p.brandLabel },
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: 'JPY',
      price: p.price,
      availability: 'https://schema.org/InStock',
    },
  };

  let html = productTpl;

  // 1) id をハードコード（?id 依存を排除、JS が確実にハイドレート）
  html = html.replace("params.get('id')", JSON.stringify(id));

  // 2) head の SEO シグナルを焼き込み
  html = html.replace(
    /<title id="pageTitle">[^<]*<\/title>/,
    `<title id="pageTitle">${esc(title)}</title>`
  );
  html = html.replace(
    /(<meta id="pageDesc" name="description" content=")[^"]*(">)/,
    `$1${esc(desc)}$2`
  );
  html = html.replace(
    /(<link id="canonicalLink" rel="canonical" href=")[^"]*(">)/,
    `$1${url}$2`
  );

  // 3) 内部リンクをクリーンURLへ（canonical再設定JS・JSON-LDのurlも含む）
  html = cleanLinks(html);

  // 4) body の主要素に中身を焼き込み（JS無しでもクローラが読める安全網）
  html = html.replace(
    '<main id="pdMain" style="display:none">',
    '<main id="pdMain" style="display:block">'
  );
  html = html.replace(
    '<div id="pdLoading" class="pd-loading">',
    '<div id="pdLoading" class="pd-loading" style="display:none">'
  );
  html = html.replace(
    '<img id="pdImg" src="" alt="">',
    `<img id="pdImg" src="${esc(p.image)}" alt="${esc(p.name)} — ${esc(p.brandLabel)}">`
  );
  html = fill(html, 'id="crumbName"', 'span', esc(p.name));
  html = fill(html, 'id="pdBrand"', 'p', `${esc(p.brandOrigin)} · ${esc(p.brandLabel)}`);
  html = fill(html, 'id="pdName"', 'h1', esc(p.name));
  html = fill(html, 'id="pdNameja"', 'p', esc(p.nameja));
  html = fill(html, 'id="pdSubtitle"', 'p', esc(p.subtitle));
  html = fill(html, 'id="pdFlavor"', 'p', esc(p.flavorNotes));
  html = fill(html, 'id="pdDesc"', 'p', esc(p.desc));
  html = fill(html, 'id="pdPrice"', 'span', `¥${Number(p.price).toLocaleString()}`);

  // 5) 静的 JSON-LD を head に追加（JS実行前でも構造化データを認識）
  html = html.replace(
    '</head>',
    `  <script type="application/ld+json">${JSON.stringify(ld)}</script>\n</head>`
  );

  fs.writeFileSync(path.join(ROOT, `product-${id}.html`), html);
  generated.push({ type: 'product', id, url });
}

/* ============================================================
   RECIPE ページ生成
   ============================================================ */
for (const r of RECIPES) {
  const id = r.id;
  const url = `${BASE}/recipe-${id}.html`;
  const title = `${r.name} (${r.nameEn}) — 料理ガイド | SLOW FIRE SHOP`;
  const desc = r.essence || `${r.name} のBBQレシピ`;

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: r.name,
    image: (win.getRecipeImage ? win.getRecipeImage(id) : `images/recipes/${id}.jpg`),
    description: desc,
    recipeCategory: r.categoryLabel,
    recipeCuisine: 'BBQ',
    cookTime: r.timeMin ? `PT${r.timeMin}M` : undefined,
    keywords: [r.name, r.nameEn, 'BBQ', 'レシピ'].filter(Boolean).join(', '),
  };

  let html = recipeTpl;

  html = html.replace("params.get('id')", JSON.stringify(id));

  html = html.replace(
    /<title id="pageTitle">[^<]*<\/title>/,
    `<title id="pageTitle">${esc(title)}</title>`
  );
  html = html.replace(
    /(<meta id="pageDesc" name="description" content=")[^"]*(">)/,
    `$1${esc(desc)}$2`
  );
  html = html.replace(
    /(<link id="canonicalLink" rel="canonical" href=")[^"]*(">)/,
    `$1${url}$2`
  );

  html = cleanLinks(html);

  html = html.replace(
    '<main id="rdMain" style="display:none">',
    '<main id="rdMain" style="display:block">'
  );
  html = html.replace(
    '<div id="rdLoading" class="rd-loading">',
    '<div id="rdLoading" class="rd-loading" style="display:none">'
  );
  html = fill(html, 'id="crumbName"', 'span', esc(r.name));
  html = fill(html, 'id="rdName"', 'h1', esc(r.name));
  html = fill(html, 'id="rdNameEn"', 'p', esc(r.nameEn));
  html = fill(html, 'id="rdEssence"', 'p', esc(r.essence));
  html = fill(html, 'id="rdImgFallback"', 'div', esc(r.icon));

  html = html.replace(
    '</head>',
    `  <script type="application/ld+json">${JSON.stringify(ld)}</script>\n</head>`
  );

  fs.writeFileSync(path.join(ROOT, `recipe-${id}.html`), html);
  generated.push({ type: 'recipe', id, url });
}

/* ============================================================
   sitemap.xml を「非破壊」で更新。
   既存 sitemap をそのまま土台にし、product/recipe のクエリURL
   (product.html?id=x / recipe.html?id=x) だけをクリーンURLへ変換する。
   → journal記事など他のURLは一切消さずに保持する。
   ============================================================ */
const sitemapPath = path.join(ROOT, 'sitemap.xml');
if (fs.existsSync(sitemapPath)) {
  const before = fs.readFileSync(sitemapPath, 'utf8');
  const after = cleanLinks(before); // ?id= を持つ product/recipe URL のみクリーン化
  fs.writeFileSync(sitemapPath, after);
  const nClean = (after.match(/\/(product|recipe)-[a-z0-9-]+\.html<\/loc>/g) || []).length;
  const nStale = (after.match(/\.html\?id=/g) || []).length;
  console.log(`✅ sitemap.xml: クリーンURL ${nClean}件 / 残存クエリURL ${nStale}件(0が正) / journal等は保持`);
} else {
  console.warn('⚠️ sitemap.xml が見つかりません。スキップしました。');
}

/* ============================================================
   旧 product.html / recipe.html の内部リンク・canonical(JS)を
   新クリーンURLへ変換して上書き。
   → 旧 ?id= URLがクロールされても canonical で新URLに集約される。
   （params.get('id') はそのまま残すので、旧URL自体も動作し続ける）
   ============================================================ */
fs.writeFileSync(path.join(ROOT, 'product.html'), cleanLinks(productTpl));
fs.writeFileSync(path.join(ROOT, 'recipe.html'), cleanLinks(recipeTpl));

const nProd = generated.filter((g) => g.type === 'product').length;
const nRec = generated.filter((g) => g.type === 'recipe').length;
console.log(`✅ 生成完了: product ${nProd}件 / recipe ${nRec}件`);
console.log(`✅ 旧 product.html / recipe.html の内部リンクをクリーンURLへ変換`);
