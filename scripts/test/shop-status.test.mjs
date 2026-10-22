// BBQラブ販売の開閉切替（本番に触らない：一時フォルダに複製して生成スクリプトを回す）
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { readShopStatus, syncSitemap, stripProductUrls, applyStyleBlock, CLOSED_CSS } from "../lib/shop-status.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const BASE = "https://an-bbq.jp";

test("切替ファイルが無い・壊れている時は開いている扱い", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "shop-status-"));
  assert.equal(readShopStatus(path.join(dir, "none.json")).open, true);
  fs.writeFileSync(path.join(dir, "bad.json"), "{");
  assert.equal(readShopStatus(path.join(dir, "bad.json")).open, true);
  fs.writeFileSync(path.join(dir, "closed.json"), '{"open": false}');
  assert.equal(readShopStatus(path.join(dir, "closed.json")).open, false);
});

test("サイトマップ: 閉じると商品URLだけ消え、再開すると戻る（他のURLは残る）", () => {
  const xml = `<urlset>\n  <url><loc>${BASE}/</loc></url>\n  <url><loc>${BASE}/product-a.html</loc><lastmod>2026-05-06</lastmod><priority>0.85</priority></url>\n  <url><loc>${BASE}/recipe-x.html</loc></url>\n</urlset>\n`;
  const closed = syncSitemap(xml, { base: BASE, ids: ["a", "b"], open: false, today: "2026-10-22" });
  assert.ok(!closed.includes("product-"));
  assert.ok(closed.includes("recipe-x.html") && closed.includes(`<loc>${BASE}/</loc>`));
  const reopened = syncSitemap(closed, { base: BASE, ids: ["a", "b"], open: true, today: "2026-10-22" });
  assert.ok(reopened.includes(`${BASE}/product-a.html`) && reopened.includes(`${BASE}/product-b.html`));
  assert.equal(syncSitemap(reopened, { base: BASE, ids: ["a", "b"], open: true, today: "2026-10-22" }), reopened, "2回回しても増えない");
});

test("style.css: 閉じると隠す指定が入り、再開すると空になる（何度回しても1か所）", () => {
  const css = "body{}\n";
  const closed = applyStyleBlock(css, { open: false });
  assert.ok(closed.includes(CLOSED_CSS));
  assert.equal(applyStyleBlock(closed, { open: false }), closed);
  const reopened = applyStyleBlock(closed, { open: true });
  assert.ok(!reopened.includes("#cartBtn"));
  assert.equal((reopened.match(/SHOP-STATUS:BEGIN/g) || []).length, 1);
});

test("生成スクリプト: 閉じる→再開で商品ページが準備中→元どおりに戻る", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "shop-build-"));
  for (const f of ["product-data.js", "recipe-data.js", "recipe.html", "sitemap.xml", "style.css", "templates", "scripts/build-static-pages.mjs", "scripts/lib"]) {
    fs.cpSync(path.join(ROOT, f), path.join(dir, f), { recursive: true });
  }
  const run = (open) => {
    fs.writeFileSync(path.join(dir, "shop-status.json"), JSON.stringify({ open }));
    execFileSync(process.execPath, [path.join(dir, "scripts/build-static-pages.mjs")], { stdio: "pipe" });
  };
  const ids = Object.keys(new Function("window", fs.readFileSync(path.join(ROOT, "product-data.js"), "utf8") + "\nreturn window;")({}).PRODUCT_DETAILS);
  assert.ok(ids.length >= 20, `商品数 ${ids.length}`);

  run(false);
  for (const f of ["product.html", ...ids.map((id) => `product-${id}.html`)]) {
    const html = fs.readFileSync(path.join(dir, f), "utf8");
    assert.match(html, /BBQラブの販売は、ただいま準備中です/, f);
    assert.match(html, /noindex/, f);
    assert.ok(!html.includes("cartBtn") && !html.includes("application/ld+json"), `${f} にカート・商品データが残っている`);
  }
  assert.ok(!fs.readFileSync(path.join(dir, "sitemap.xml"), "utf8").includes("/product-"));
  assert.ok(fs.readFileSync(path.join(dir, "style.css"), "utf8").includes(CLOSED_CSS));
  assert.ok(fs.readFileSync(path.join(dir, "recipe-pulled-pork.html"), "utf8").includes("<h1"), "レシピは影響を受けない");

  run(true);
  const tpl = fs.readFileSync(path.join(ROOT, "templates/product.html"), "utf8");
  assert.equal(fs.readFileSync(path.join(dir, "product.html"), "utf8"), tpl, "product.html がテンプレどおりに戻る");
  const sitemap = fs.readFileSync(path.join(dir, "sitemap.xml"), "utf8");
  for (const id of ids) {
    const html = fs.readFileSync(path.join(dir, `product-${id}.html`), "utf8");
    assert.match(html, /"@type":"Product"/, id);
    assert.ok(!html.includes("準備中です"), id);
    assert.ok(sitemap.includes(`${BASE}/product-${id}.html`), `sitemap ${id}`);
  }
  assert.ok(!fs.readFileSync(path.join(dir, "style.css"), "utf8").includes("#cartBtn, .cart-icon-btn"));
});

test("旧形式 product.html?id= の商品URLも外れる（sitemap-main.xml用）", () => {
  const xml = `  <url><loc>${BASE}/product.html?id=steak-shooter</loc></url>\n  <url><loc>${BASE}/journal/index.html</loc></url>\n`;
  assert.equal(stripProductUrls(xml, BASE), `  <url><loc>${BASE}/journal/index.html</loc></url>\n`);
});

test("読みもの側の購入導線（このラブを購入する・ラブを試す枠）も隠す対象に入っている", () => {
  assert.ok(CLOSED_CSS.includes(".jr-rubs") && CLOSED_CSS.includes("[data-shop-buy]"));
  assert.match(fs.readFileSync(path.join(ROOT, "essentials.html"), "utf8"), /<div class="es-note reveal" data-shop-buy/, "「最初の1本」の枠ごと隠す");
  for (const f of ["essentials.html", "rub-guide.html"]) {
    const html = fs.readFileSync(path.join(ROOT, f), "utf8");
    const left = (html.match(/<a (?![^>]*data-shop-buy)[^>]*>このラブを購入する/g) || []);
    assert.equal(left.length, 0, `${f} に目印なしの購入ボタン: ${left.join(" / ")}`);
    assert.ok(!/。まずは<a data-shop-buy/.test(html), `${f} 文の途中だけ消えて文が崩れる`);
  }
});

test("サービスワーカーは style.css をキャッシュ優先にしない（開閉がすぐ届く）", () => {
  const sw = fs.readFileSync(path.join(ROOT, "sw.js"), "utf8");
  assert.match(sw, /!\/\\\/style\\\.css/);
});
