#!/usr/bin/env node
/**
 * SLOW FIRE JOURNAL 記事サムネイル生成器 — EPISODE表紙型（45+ pm45-media移植・SLOW FIREブランド版）
 * 決定的変換（Claude API不使用）。journal/articles/*.html から見出し・カテゴリ・要約を抽出し、
 * 同じ入力からは毎回同じPNGを出力する。単色グラデ＋大タイポのプレースホルダは禁止。
 *
 * 使い方: node tools/gen-journal-thumb/gen.mjs [slug ...]
 * 出力: journal/thumbs/<slug>.jpg (1200x675, <170KB)
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, statSync, rmSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const ART_DIR = path.join(ROOT, "journal", "articles");
const OUT = path.join(ROOT, "journal", "thumbs");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const ACCENTS = {
  ember: {
    grad: "linear-gradient(90deg,#7c2d12,#c2410c 55%,#ea580c 85%,#f1a476)",
    text: "linear-gradient(100deg,#7c2d12,#c2410c 55%,#ea580c)",
    line: "#c2410c",
  },
  amber: {
    grad: "linear-gradient(90deg,#92400e,#d97706 55%,#f0a929 85%,#fbbf5c)",
    text: "linear-gradient(100deg,#92400e,#d97706 55%,#f0a929)",
    line: "#d97706",
  },
};

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

// ---- カテゴリ→差し色（決定的ハッシュでember/amberを振り分け） -------------
function hashCode(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}
const FIXED_ACCENT = { RECIPE: "ember", SCIENCE: "amber", GEAR: "ember", PHILOSOPHY: "amber" };
function accentOf(cat) {
  return FIXED_ACCENT[cat] || (hashCode(cat) % 2 === 0 ? "ember" : "amber");
}

// ---- 見出しを大タイポ2行に「言い切り」へ整形して決定的分割 ------------------
const BREAKS = ["。", "、", "・"];
function coreHeadline(h1) {
  let t = h1;
  t = t.replace(/【[^】]*】/g, ""); // 【2026年版】等を除去
  // 「—」以降は列挙・補足であることが多いので、前半が十分な長さなら前半だけ採用
  const dash = t.search(/\s*[—―]\s*/);
  if (dash >= 8) t = t.slice(0, dash);
  t = t.replace(/[\/／]/g, "・").trim();
  t = t.replace(/。$/, "");
  return t;
}

// フォントサイズ別の1行あたり最大文字数（1090px幅・Noto Sans JP 900想定の実測目安）
const SIZE_BUCKETS = [
  { t1: 62, t2: 88, line: 10 },
  { t1: 54, t2: 76, line: 12 },
  { t1: 48, t2: 66, line: 14 },
  { t1: 42, t2: 58, line: 16 },
  { t1: 36, t2: 49, line: 18 },
];
function splitTitle(h1) {
  let t = coreHeadline(h1);
  // 一番小さいバケット（1行22字）を基準にまず総文字数を確定させ、そこから最適なバケットを選ぶ
  const HARD_MAX_LINE = SIZE_BUCKETS.at(-1).line; // 22
  if (t.length > HARD_MAX_LINE * 2) {
    const cut = t.lastIndexOf("、", HARD_MAX_LINE * 2);
    t = cut >= 8 ? t.slice(0, cut) : t.slice(0, HARD_MAX_LINE * 2);
  }
  const bucket = SIZE_BUCKETS.find((b) => t.length <= b.line * 2) || SIZE_BUCKETS.at(-1);
  // 分割点：中央付近の読点、なければ行文字数の上限で機械的に折る
  let idx = -1, brk = "";
  for (const b of BREAKS) {
    const i = t.indexOf(b);
    if (i > 0 && i <= bucket.line && t.length - (i + b.length) <= bucket.line) {
      idx = i; brk = b; break;
    }
  }
  let line1, rest;
  if (idx >= 0) {
    line1 = t.slice(0, idx) + (brk === "。" ? "。" : "、");
    rest = t.slice(idx + brk.length);
  } else {
    const isKanji = (ch) => ch && /[一-鿿]/.test(ch);
    let mid = Math.min(bucket.line, Math.ceil(t.length / 2));
    // 漢字の熟語（例：失敗）の途中で割らないよう、近傍で非漢字境界を探す
    for (let w = 0; w <= 3; w++) {
      const cands = [mid - w, mid + w].filter((p) => p >= 1 && p <= Math.min(bucket.line, t.length - 1));
      const ok = cands.find((p) => !(isKanji(t[p - 1]) && isKanji(t[p])));
      if (ok) { mid = ok; break; }
    }
    line1 = t.slice(0, mid);
    rest = t.slice(mid);
  }
  rest = rest.trim();
  if (!rest) { rest = line1; line1 = ""; }
  // 最終防衛ライン：どちらの行もバケットの1行上限を超えないよう強制的に丸める
  if (line1.length > bucket.line) line1 = line1.slice(0, bucket.line);
  if (rest.length > bucket.line) rest = rest.slice(0, bucket.line);
  const lastComma = Math.max(rest.lastIndexOf("、"), rest.lastIndexOf("・"));
  let emStart;
  if (lastComma >= 0 && lastComma < rest.length - 1) {
    emStart = lastComma + 1;
  } else {
    emStart = Math.max(0, rest.length - Math.max(3, Math.ceil(rest.length * 0.4)));
  }
  const before = rest.slice(0, emStart);
  const em = rest.slice(emStart).replace(/。$/, "");
  return { line1, line2: [before, em, "。"], size: { t1: bucket.t1, t2: bucket.t2 } };
}

function subOf(desc, h1) {
  if (!desc) return `${h1}を、数値と手順で解説する。`;
  let s = desc.split("。")[0];
  if (s.length > 40) {
    const cut = s.lastIndexOf("、", 40);
    s = cut >= 16 ? s.slice(0, cut) : s.slice(0, 38);
  }
  return s + "。";
}

const skyline = () => {
  let x = 0, i = 0, bars = "";
  while (x < 1300) {
    const w = 22 + ((i * 37) % 46);
    const h = 60 + ((i * 89) % 260);
    bars += `<rect x="${x}" y="${420 - h}" width="${w}" height="${h}" />`;
    if (i % 3 === 0) bars += `<rect x="${x + w / 2 - 2}" y="${420 - h - 26}" width="4" height="26" />`;
    x += w + 6 + ((i * 13) % 12);
    i++;
  }
  return `<svg viewBox="0 0 1300 420" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg"><g fill="#1c1917" opacity=".05">${bars}</g></svg>`;
};

function html(a) {
  const c = ACCENTS[a.accent];
  const { line1, line2, size } = splitTitle(a.h1);
  const sub = subOf(a.desc, a.h1);
  return `<!DOCTYPE html><html lang="ja"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@700;900&family=Inter:wght@700;800;900&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1200px;height:675px;overflow:hidden}
body{font-family:'Noto Sans JP',sans-serif;background:#faf7f2;position:relative;color:#1c1917}
.sky{position:absolute;left:0;right:0;bottom:0;height:420px}.sky svg{width:100%;height:100%}
.dots{position:absolute;right:56px;top:150px;width:180px;height:180px;opacity:.5;
 background-image:radial-gradient(circle,rgba(194,65,12,.32) 3px,transparent 3.5px);background-size:26px 26px}
.ring{position:absolute;right:-90px;bottom:-120px;width:340px;height:340px;border-radius:50%;border:38px solid rgba(217,119,6,.10)}
.brand{position:absolute;left:52px;top:44px;display:flex;align-items:center;gap:12px}
.brand .n{font-family:'Inter',sans-serif;font-weight:900;font-size:27px;letter-spacing:.5px;color:#1c1917}
.brand .n span{color:${c.line}}
.brand .s{font-size:11.5px;font-weight:700;letter-spacing:2.5px;color:#78716c;margin-top:4px;text-transform:uppercase}
.title{position:absolute;left:52px;top:150px;font-weight:900;line-height:1.26;letter-spacing:.5px;max-width:1090px}
.title .t1{font-size:${size.t1}px}
.title .t2{font-size:${size.t2}px;margin-top:8px}
.title em{font-style:normal;background:${c.text};-webkit-background-clip:text;background-clip:text;color:transparent}
.band{position:absolute;left:0;top:428px;width:600px;height:60px;background:${c.grad};display:flex;align-items:center;padding-left:56px;
 clip-path:polygon(0 0,100% 0,calc(100% - 32px) 100%,0 100%)}
.band span{font-family:'Inter',sans-serif;font-weight:900;font-size:27px;letter-spacing:5px;color:#fff}
.tag{position:absolute;left:56px;top:510px;display:flex;align-items:center;gap:18px;font-weight:800;font-size:20px;letter-spacing:4px;color:#1c1917}
.tag::before,.tag::after{content:"";width:64px;height:2px;background:${c.line}}
.sub{position:absolute;left:52px;top:566px;font-weight:700;font-size:24px;letter-spacing:.3px;color:#faf7f2;background:#1c1917;padding:11px 24px;
 border-bottom:4px solid ${c.line};max-width:1080px}
</style></head><body>
<div class="sky">${skyline()}</div>
<div class="dots"></div><div class="ring"></div>
<div class="brand"><span class="n">SLOW<span>FIRE</span></span><div class="s">JOURNAL</div></div>
<div class="title"><div class="t1">${line1}</div><div class="t2">${line2[0]}<em>${line2[1]}</em>${line2[2]}</div></div>
<div class="band"><span>${a.cat}</span></div>
<div class="tag">SLOW FIRE JOURNAL</div>
<div class="sub">${sub}</div>
</body></html>`;
}

// ---- メイン処理 --------------------------------------------------------------
const only = process.argv.slice(2);
const files = readdirSync(ART_DIR).filter((f) => f.endsWith(".html"));
mkdirSync(OUT, { recursive: true });

let n = 0;
for (const f of files) {
  const meta = extract(path.join(ART_DIR, f));
  if (only.length && !only.includes(meta.slug)) continue;
  const a = { ...meta, accent: accentOf(meta.cat) };
  const tmp = path.join(HERE, `.tmp-${a.slug}.html`);
  const png = path.join(HERE, `.tmp-${a.slug}.png`);
  writeFileSync(tmp, html(a));
  execFileSync(CHROME, [
    "--headless=new", "--disable-gpu", "--hide-scrollbars",
    "--window-size=1200,675", "--force-device-scale-factor=1",
    "--virtual-time-budget=6000",
    `--screenshot=${png}`, `file://${tmp}`,
  ], { stdio: "pipe" });
  const jpg = path.join(OUT, `${a.slug}.jpg`);
  let q = 84;
  do {
    execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", String(q), png, "--out", jpg], { stdio: "pipe" });
    q -= 8;
  } while (statSync(jpg).size > 170 * 1024 && q > 40);
  rmSync(tmp); rmSync(png);
  n++;
  console.log(`${a.slug}.jpg  ${(statSync(jpg).size / 1024).toFixed(0)}KB  [${a.accent}]  ${a.h1}`);
}
console.log(`\n生成完了: ${n}件 → ${path.relative(ROOT, OUT)}/`);
