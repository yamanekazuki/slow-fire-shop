#!/usr/bin/env node
/**
 * verify-photo-map.mjs — 写真台帳の検証（1記事=1枚・重複ゼロ・実ファイル存在・全記事網羅）
 * 使い方: node tools/gen-journal-thumb/verify-photo-map.mjs
 * 終了コード 1 = 不合格（CIで落とせる）
 */
import { readdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const map = JSON.parse(readFileSync(path.join(HERE, "photo-map.json"), "utf8"));
const slugsOf = (dir) =>
  readdirSync(path.join(ROOT, "journal", dir)).filter((f) => f.endsWith(".html") && f !== "index.html").map((f) => f.replace(/\.html$/, ""));

let bad = 0;
const entries = [
  ...Object.entries(map.articles).map(([k, v]) => [`articles/${k}`, v]),
  ...Object.entries(map.guide).map(([k, v]) => [`guide/${k}`, v]),
];

// 1) パスの重複（同じファイルを2記事で使っていないか）
const byPath = new Map();
for (const [k, v] of entries) (byPath.get(v) || byPath.set(v, []).get(v)).push(k);
for (const [v, ks] of byPath) if (ks.length > 1) { console.error(`✗ 写真の重複割当: ${v} → ${ks.join(", ")}`); bad++; }

// 2) 中身の重複（別名の同一画像＝md5が同じもの）
const byHash = new Map();
for (const [k, v] of entries) {
  const abs = path.join(ROOT, v);
  if (!existsSync(abs)) { console.error(`✗ 実ファイルなし: ${k} → ${v}`); bad++; continue; }
  const h = createHash("md5").update(readFileSync(abs)).digest("hex");
  (byHash.get(h) || byHash.set(h, []).get(h)).push(`${k}(${path.basename(v)})`);
}
for (const [, ks] of byHash) if (ks.length > 1) { console.error(`✗ 中身が同じ画像を別名で使用: ${ks.join(" / ")}`); bad++; }

// 3) 網羅（割当のない記事）
for (const s of slugsOf("articles")) if (!map.articles[s]) { console.error(`✗ 記事に割当なし: ${s}`); bad++; }
for (const s of slugsOf("guide")) if (!map.guide[s]) { console.error(`✗ guideに割当なし: ${s}`); bad++; }

console.log(`\n割当: 記事 ${Object.keys(map.articles).length}件 / guide ${Object.keys(map.guide).length}件 / ユニーク写真 ${byPath.size}枚`);
if (bad) { console.error(`不合格: ${bad}件の問題`); process.exit(1); }
console.log("合格: 重複ゼロ・全記事に固有の写真が割り当てられています。");
