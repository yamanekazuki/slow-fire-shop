#!/usr/bin/env node
/**
 * SLOW FIRE JOURNAL 記事サムネイル生成器 — 実写フルブリード型（2026-07-30 全面刷新）
 *
 * 方針（山根さんFB 2026-07-30）:
 *   - ベージュ＋棒グラフ風のビジネス図版は全廃。BBQサイトなのだから実写で見せる。
 *   - 1記事 = 1枚の固有写真。同じ写真が一覧に並ぶのは禁止。割当は photo-map.json が正本。
 *   - 写真の新規AI生成はしない。承認済み実写資産（images/journal/ 配下）だけを使う。
 *
 * 決定的変換（Claude API不使用）。同じ入力からは毎回同じJPEGを出力する。
 *
 * 使い方: node tools/gen-journal-thumb/gen.mjs [slug ...]
 *         node tools/gen-journal-thumb/gen.mjs --missing   … サムネ未生成の記事だけ生成（CIの自己修復用）
 * 出力: journal/thumbs/<slug>.jpg (1200x675, <170KB)
 *
 * Mac/Linux両対応（GitHub Actions ubuntu で動かないと新規記事のサムネが欠落する）:
 *   Chrome: CHROME_BIN → Mac標準パス → google-chrome/chromium の順で探す
 *   JPEG変換: sips(Mac) が無ければ ImageMagick convert(Linux) にフォールバック
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, statSync, rmSync, readdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const ART_DIR = path.join(ROOT, "journal", "articles");
const OUT = path.join(ROOT, "journal", "thumbs");
const PHOTO_MAP = path.join(HERE, "photo-map.json");

function findChrome() {
  const cands = [
    process.env.CHROME_BIN,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
  ].filter(Boolean);
  for (const c of cands) if (existsSync(c)) return c;
  throw new Error("Chrome/Chromium が見つかりません（環境変数 CHROME_BIN で指定可）");
}
const CHROME = findChrome();
const HAS_SIPS = existsSync("/usr/bin/sips");
function pngToJpeg(png, jpg, q) {
  if (HAS_SIPS) execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", String(q), png, "--out", jpg], { stdio: "pipe" });
  else execFileSync("convert", [png, "-quality", String(q), jpg], { stdio: "pipe" });
}

// ---- 写真台帳（1記事=1枚・重複禁止） ---------------------------------------
const photoMap = JSON.parse(readFileSync(PHOTO_MAP, "utf8"));
export function photoFor(slug) {
  const rel = (photoMap.articles && photoMap.articles[slug]) || (photoMap.guide && photoMap.guide[slug]);
  if (!rel) return null;
  const abs = path.join(ROOT, rel);
  return existsSync(abs) ? abs : null;
}

// ---- カテゴリ→差し色（ember基調。amberはSCIENCE/PHILOSOPHYの表情差） --------
const ACCENTS = {
  ember: { bar: "linear-gradient(90deg,#ea580c,#f59e0b)", chip: "linear-gradient(100deg,#9a3412,#ea580c)", dot: "#f97316" },
  amber: { bar: "linear-gradient(90deg,#d97706,#fbbf24)", chip: "linear-gradient(100deg,#92400e,#d97706)", dot: "#fbbf24" },
};
const FIXED_ACCENT = { RECIPE: "ember", SCIENCE: "amber", GEAR: "ember", PHILOSOPHY: "amber" };
function hashCode(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}
function accentOf(cat) {
  return FIXED_ACCENT[cat] || (hashCode(cat) % 2 === 0 ? "ember" : "amber");
}

// ---- 記事HTMLから見出し・カテゴリ・要約を抽出 -------------------------------
function extract(file) {
  const html = readFileSync(file, "utf8");
  const slug = path.basename(file, ".html");
  const h1 = (html.match(/<h1[^>]*>([^<]+)<\/h1>/) || [, slug])[1].trim();
  const catRaw = (html.match(/<span class="jr-category">([^<]+)<\/span>/) || [, "JOURNAL"])[1].trim();
  const cat = catRaw.split(/[·\s]+/)[0].toUpperCase();
  const desc = (html.match(/<meta name="description" content="([^"]+)"/) || [, ""])[1].trim();
  return { slug, h1, cat, desc };
}

// ---- 見出しを写真の上に載せる形へ整形 ---------------------------------------
function coreHeadline(h1) {
  let t = h1;
  t = t.replace(/【[^】]*】/g, ""); // 【2026年版】等を除去
  const dash = t.search(/\s*[—―]\s*/);
  if (dash >= 8) t = t.slice(0, dash); // 「—」以降は補足なので落とす
  t = t.replace(/[｜|]/g, " ").replace(/[\/／]/g, "・").trim();
  t = t.replace(/。$/, "");
  // 長すぎる見出しは読点で丸める（写真の上に4行以上載せない）
  if (t.length > 34) {
    const cut = t.lastIndexOf("、", 34);
    t = cut >= 12 ? t.slice(0, cut) : t.slice(0, 32);
  }
  return t;
}
// 文字数に応じた決定的なフォントサイズ（写真上でも潰れない範囲）
function titleSize(len) {
  if (len <= 12) return 74;
  if (len <= 18) return 64;
  if (len <= 24) return 56;
  if (len <= 30) return 48;
  return 42;
}
function subOf(desc, h1) {
  if (!desc) return `${h1}を、数値と手順で。`;
  let s = desc.split("。")[0];
  if (s.length > 42) {
    const cut = s.lastIndexOf("、", 42);
    s = cut >= 16 ? s.slice(0, cut) : s.slice(0, 40);
  }
  return s + "。";
}
// 写真ごとに寄せ方を決定的に変える（毎枚まったく同じ構図にしないため）
function focusOf(slug) {
  const modes = ["50% 50%", "50% 42%", "50% 58%", "45% 50%", "55% 50%"];
  return modes[hashCode(slug) % modes.length];
}
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function html(a) {
  const c = ACCENTS[a.accent];
  const title = coreHeadline(a.h1);
  const size = titleSize(title.length);
  const sub = subOf(a.desc, a.h1);
  const photoUrl = `file://${a.photo}`;
  return `<!DOCTYPE html><html lang="ja"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@700;900&family=Inter:wght@700;800;900&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1200px;height:675px;overflow:hidden}
body{font-family:'Zen Maru Gothic','Hiragino Maru Gothic ProN',sans-serif;background:#1c1917;position:relative;color:#fff}
/* 写真フルブリード */
.ph{position:absolute;inset:0;background:url('${photoUrl}') no-repeat ${a.focus};background-size:cover;
 filter:saturate(1.06) contrast(1.03)}
/* 下部のwarmグラデ（タイトルの可読性を炭火の色で担保する） */
.warm{position:absolute;inset:0;background:
 linear-gradient(to top,rgba(28,25,23,.94) 0%,rgba(48,26,12,.84) 28%,rgba(60,30,10,.36) 52%,rgba(28,25,23,.06) 74%,rgba(28,25,23,.32) 100%)}
/* 上端のわずかな影＝ロゴを白抜きで置くため */
.topshade{position:absolute;left:0;right:0;top:0;height:190px;background:linear-gradient(to bottom,rgba(20,16,14,.5),rgba(20,16,14,0))}
/* ブランドロゴ（小） */
.brand{position:absolute;left:56px;top:46px;display:flex;align-items:center;gap:13px}
.brand .fire{width:13px;height:13px;border-radius:50%;background:${c.dot};box-shadow:0 0 18px 5px rgba(249,115,22,.55)}
.brand .n{font-family:'Inter',sans-serif;font-weight:900;font-size:17px;letter-spacing:3.4px;color:#fff;text-transform:uppercase}
.brand .n b{font-weight:900;color:#fdba74}
/* カテゴリチップ */
.chip{position:absolute;right:56px;top:42px;padding:9px 22px;border-radius:999px;background:${c.chip};
 font-family:'Inter',sans-serif;font-weight:900;font-size:15px;letter-spacing:3.6px;color:#fff}
/* emberアクセントバー */
.bar{position:absolute;left:56px;bottom:224px;width:86px;height:7px;border-radius:4px;background:${c.bar};
 box-shadow:0 0 22px rgba(234,88,12,.6)}
.title{position:absolute;left:56px;right:96px;bottom:116px;font-weight:900;font-size:${size}px;line-height:1.34;
 letter-spacing:.6px;text-shadow:0 3px 22px rgba(0,0,0,.62),0 1px 3px rgba(0,0,0,.5)}
.sub{position:absolute;left:58px;right:110px;bottom:60px;font-weight:700;font-size:21px;line-height:1.5;
 letter-spacing:.3px;color:#f5e6d8;text-shadow:0 2px 12px rgba(0,0,0,.75)}
.rule{position:absolute;left:56px;right:56px;bottom:38px;height:2px;background:linear-gradient(90deg,rgba(253,186,116,.85),rgba(253,186,116,0))}
</style></head><body>
<div class="ph"></div><div class="warm"></div><div class="topshade"></div>
<div class="brand"><span class="fire"></span><span class="n">SLOW <b>FIRE</b> JOURNAL</span></div>
<div class="chip">${esc(a.cat)}</div>
<div class="bar"></div>
<div class="title">${esc(title)}</div>
<div class="sub">${esc(sub)}</div>
<div class="rule"></div>
</body></html>`;
}

// ---- メイン処理 --------------------------------------------------------------
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = process.argv.slice(2);
  const missingOnly = args.includes("--missing");
  const only = args.filter((a) => a !== "--missing");
  const files = readdirSync(ART_DIR).filter((f) => f.endsWith(".html"));
  mkdirSync(OUT, { recursive: true });

  let n = 0;
  const skipped = [];
  for (const f of files) {
    const meta = extract(path.join(ART_DIR, f));
    if (only.length && !only.includes(meta.slug)) continue;
    if (missingOnly && existsSync(path.join(OUT, `${meta.slug}.jpg`))) continue;
    const photo = photoFor(meta.slug);
    if (!photo) { skipped.push(meta.slug); continue; }
    const a = { ...meta, accent: accentOf(meta.cat), photo, focus: focusOf(meta.slug) };
    const tmp = path.join(HERE, `.tmp-${a.slug}.html`);
    const png = path.join(HERE, `.tmp-${a.slug}.png`);
    writeFileSync(tmp, html(a));
    execFileSync(CHROME, [
      "--headless=new", "--disable-gpu", "--hide-scrollbars",
      "--allow-file-access-from-files",
      "--window-size=1200,675", "--force-device-scale-factor=1",
      "--virtual-time-budget=6000",
      `--screenshot=${png}`, `file://${tmp}`,
    ], { stdio: "pipe" });
    const jpg = path.join(OUT, `${a.slug}.jpg`);
    let q = 84;
    do {
      pngToJpeg(png, jpg, q);
      q -= 8;
    } while (statSync(jpg).size > 170 * 1024 && q > 40);
    rmSync(tmp); rmSync(png);
    n++;
    console.log(`${a.slug}.jpg  ${(statSync(jpg).size / 1024).toFixed(0)}KB  [${a.accent}]  ${path.basename(photo)}`);
  }
  if (skipped.length) {
    console.warn(`\n⚠️ photo-map.json に写真の割当がない記事（サムネ未生成）: ${skipped.join(", ")}`);
    console.warn("   → tools/gen-journal-thumb/photo-map.json に固有の写真を1枚追記してください（重複割当は禁止）。");
  }
  console.log(`\n生成完了: ${n}件 → ${path.relative(ROOT, OUT)}/`);
}
