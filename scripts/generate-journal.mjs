// =============================================================================
// SLOW FIRE SHOP — journal 自動記事生成スクリプト
// -----------------------------------------------------------------------------
// GitHub Actions（週3回 / 月・水・金 朝7時 JST）から実行。
// Claude API で実用・SEO寄りのBBQ記事を1本生成し、既存 journal と同じ作りで:
//   1) journal/articles/<slug>.html  …… 記事ページ（既存テンプレ準拠・GA/Clarity/構造化データ込み）
//   2) journal/index.html            …… 一覧（#all グリッド先頭にカード追加）
//   3) journal/search-index.json     …… journal検索インデックスに追加
//   4) search-index.json             …… サイト全体検索インデックスに追加
//   5) feed.xml                      …… RSSに item 追加＋lastBuildDate更新
//   6) sitemap-main.xml              …… URL追加
//   7) journal/category/<cat>.html   …… 該当カテゴリページにカード追加＋件数更新
// を更新する。外部依存なし（Node20+ global fetch）。
//
// 環境変数:
//   ANTHROPIC_API_KEY  …… 必須（GitHub Secrets）
//   BLOG_MODEL         …… 省略時 claude-opus-4-8
//   FORCE=true         …… 同日でも強制生成（テスト用）
//   STUB=1             …… APIを呼ばず固定記事で動作確認（ローカルテスト用）
// =============================================================================

import { readFile, writeFile, readdir, mkdir } from "node:fs/promises";
import { existsSync, appendFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");                 // bbq-shop/
const ART_DIR = join(ROOT, "journal", "articles");
const SITE = "https://yamanekazuki.github.io/slow-fire-shop";
const MODEL = process.env.BLOG_MODEL || "claude-opus-4-8";

// ---- 既存記事の作りに合わせた固定パーツ（back-ribs.html 由来）-----------------
const GA_CLARITY = `  <!-- Google Analytics (GA4) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-2B6PRVFPKF"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-2B6PRVFPKF');
  </script>
  <!-- Microsoft Clarity -->
  <script type="text/javascript">
    (function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", "wmtxoerxqx");
  </script>`;

const NAV = `  <header id="nav" class="nav">
    <div class="nav-wrap">
      <a href="../../index.html" class="nav-logo">SLOW<span>FIRE</span> <em>SHOP</em></a>
      <nav class="nav-links">
        <a href="../../index.html#products">商品一覧</a>
        <div class="nav-dropdown">
          <button class="nav-dropdown-toggle" aria-expanded="false" aria-haspopup="true">ガイド <span class="nav-dropdown-arrow">▾</span></button>
          <div class="nav-dropdown-menu" role="menu">
            <a href="../../essentials.html"><strong>BBQの神髄</strong><span>初めての方向け</span></a>
            <a href="../../pairing-guide.html"><strong>食材から選ぶ</strong><span>ペアリング</span></a>
            <a href="../../cookbook.html"><strong>料理から選ぶ</strong><span>24品の料理ガイド</span></a>
            <a href="../../rub-guide.html"><strong>ラブガイド</strong><span>ラブの種類と使い方</span></a>
          </div>
        </div>
        <a href="../index.html" style="color: var(--brand);">FIRESIDE</a>
        <a href="../../bbq-spots/index.html">BBQ場検索</a>
        <a href="../../planner/index.html">プランナー</a>
        <a href="../../team.html">私たちについて</a>
      </nav>
      <div class="nav-right">
        <button id="cartBtn" class="cart-icon-btn" aria-label="カート" onclick="location.href='../../index.html#products'">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><path d="M3 6h18M16 10a4 4 0 01-8 0"/></svg>
        </button>
        <button class="hamburger" aria-label="メニュー"><span></span><span></span><span></span></button>
      </div>
    </div>
  </header>`;

const FOOTER = `  <footer class="footer">
    <div class="footer-wrap">
      <div class="footer-top">
        <div>
          <a href="../../index.html" class="footer-logo">SLOW<span>FIRE</span> <em>SHOP</em></a>
          <p class="footer-sub">Low n Slow Basics・Butcher's Axe・Stef the Maori 日本正規取扱</p>
        </div>
        <nav class="footer-nav">
          <a href="../../index.html#products">商品一覧</a><a href="../../essentials.html">BBQの神髄</a>
          <a href="../../pairing-guide.html">食材から選ぶ</a><a href="../../cookbook.html">料理から選ぶ</a>
          <a href="../../rub-guide.html">ラブガイド</a><a href="../index.html">FIRESIDE</a><a href="../../team.html">私たちについて</a><a href="../../legal/tokushoho.html">特定商取引法</a><a href="../../legal/privacy.html">プライバシー</a><a href="../../legal/terms.html">利用規約</a><a href="../../about/">About</a><a href="../../contact/">お問い合わせ</a></nav>
      </div>
      <div class="footer-bottom"><p>© 2025 SLOW FIRE. All rights reserved.</p></div>
    </div>
  </footer>
  <script src="../../mobile-nav.js?v=20260506e"></script>
  <script>
    const nav = document.getElementById('nav');
    window.addEventListener('scroll', () => nav?.classList.toggle('scrolled', scrollY > 40), { passive: true });
  </script>
<script src="../../assets/global-search.js?v=20260516" defer></script>
<script src="../../assets/sf-features.js?v=20260517" defer></script>`;

// カテゴリ表記
const CAT = {
  recipe: { upper: "RECIPE", ja: "レシピ" },
  philosophy: { upper: "PHILOSOPHY", ja: "思想" },
  science: { upper: "SCIENCE", ja: "科学" },
  gear: { upper: "GEAR", ja: "道具" },
};
// ヒーロー画像（サイトで実際に使われている Unsplash 画像から選択）
const HERO_POOL = [
  "https://images.unsplash.com/photo-1679711246825-1f2bd51b16d0?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1621851709622-e19c9a4f0cc5?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1774923097632-c98e17b7e842?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1445979323117-80453f573b71?auto=format&fit=crop&w=1200&q=80",
];

// ---- テーマの種（実用・SEO寄り。既存42本と重複しない新しい切り口）-------------
const TOPIC_SEEDS = [
  "チャコールスターター（火起こし器）の使い方と火起こしの基本",
  "スモークウッドとスモークチップの違いと使い分け",
  "BBQ初心者が最初に揃えるべき道具リスト",
  "ガスグリルと炭火、どちらを選ぶべきか",
  "とうもろこしのグリル：芯まで甘く焼くコツ",
  "手羽先・手羽元のBBQ：ラブとタレの黄金比",
  "牛タンをBBQで焼く：厚切りと薄切りの違い",
  "ラムチョップの焼き方：臭みを抑える下処理と火入れ",
  "BBQ後のグリル掃除とメンテナンス完全ガイド",
  "ベランダ・自宅でできるБBQ：煙と近隣対策",
  "BBQの火力調整：ツーゾーンファイアの作り方",
  "ソーセージ・ホットドッグを失敗なく焼く",
  "BBQで作るデザート：焼きマシュマロからグリルフルーツまで",
  "シーフードのBBQ：エビ・ホタテ・イカの火入れ",
  "鶏むね肉をパサつかせない、しっとりグリルの理屈",
  "BBQの食材の下処理と当日の段取り",
  "スパイスラブを自作する：基本配合と黄金比",
  "残ったBBQ肉の保存とリメイク活用",
];

const CATEGORIES = Object.keys(CAT);

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string", description: "記事タイトル。実用的・検索されやすい・具体的。30〜48字程度。煽らない。" },
    slug: { type: "string", description: "URL用の英語スラッグ。小文字・ハイフン・3〜6語。例: charcoal-starter-guide" },
    category: { type: "string", enum: CATEGORIES, description: "recipe(レシピ) / philosophy(思想) / science(火入れの科学) / gear(道具・ラブ) のいずれか" },
    description: { type: "string", description: "meta description。検索者の役に立つ要約。90〜120字。" },
    og_description: { type: "string", description: "OG用の短い要約。40〜70字。" },
    keywords: { type: "string", description: "カンマ区切りの検索キーワード5〜8個。" },
    summary: { type: "string", description: "一覧カード用の一文。35〜55字。" },
    lead: { type: "string", description: "リード文。2〜3文。1文目に記事の核心(具体的な結論・温度・数値)を置く。" },
    read_minutes: { type: "integer", description: "読了目安（分）。5〜10。" },
    body_html: {
      type: "string",
      description:
        "本文HTML。<h2>/<h3>/<p>/<ul><li>/<blockquote> のみ（<h1>禁止）。1300〜2000字。" +
        "具体的な温度・時間・手順・道具など一次情報を必ず含め、検索者がすぐ実践できる実用記事にする。" +
        "海外ラブ(Low n Slow Basics / Butcher's Axe / Stef the Maori)に自然に触れてよいが売り込みはしない。",
    },
    faq: {
      type: "array",
      description: "よくある質問2〜3個。",
      items: {
        type: "object",
        additionalProperties: false,
        properties: { q: { type: "string" }, a: { type: "string" } },
        required: ["q", "a"],
      },
    },
  },
  required: ["title", "slug", "category", "description", "og_description", "keywords", "summary", "lead", "read_minutes", "body_html", "faq"],
};

const KNOWLEDGE = `
# SLOW FIRE SHOP（媒体名: SLOW FIRE JOURNAL / FIRESIDE）について
- アメリカン/オーストラリアンBBQのラブ(乾燥スパイス)を販売するECサイトのオウンドメディア。
- 取扱ブランド: Low n Slow Basics・Butcher's Axe・Stef the Maori（豪州の本格ラブ）。
- 読者は「家庭でBBQをもっと美味しく/失敗なくやりたい」検索ユーザー。実用記事が中心。

# BBQ実用知識（一次情報）
- アメリカンBBQ=間接熱(インダイレクト)・低温長時間(ロー&スロー)・乾燥スパイス(ラブ)・スモーク。日本式=直火高温短時間・タレ。
- 温度管理が命。グリルの表示は信用せず内部温度計(プローブ)で測る。ツーゾーンファイア(炭を片側)で直火と間接を使い分け。
- 道具: 20分超→ラック+シールド / 魚・崩れそう→杉板 / 焦げそう→ラック。杉板は30分水に浸す。
- 通常調理: シダープランクサーモン200〜230℃8〜12分(中心53℃) / 鶏むね200〜220℃20〜25分(中心73℃) / 鶏もも220→260〜280℃で皮 / 豚肩ロース厚切り200〜220℃25〜40分(中心63℃) / ローストビーフ180〜200℃40〜60分(レア中心52〜54℃)。
- ロー&スロー: プルドポーク(豚肩)120〜125℃中心97℃ / スペアリブ120〜125℃中心92℃ / ブリスケット110℃中心92〜96℃(スタリング注意) / 丸鶏120〜135℃胸68〜70℃。
- ラブはたっぷり付けたらインダイレクト推奨(直火だと砂糖が焦げる)。仕込みは一括で。豪州ラブは配合の深みが段違い。
`;

// ---- ユーティリティ ----------------------------------------------------------
function jstNow() { return new Date(Date.now() + 9 * 3600 * 1000); }
function ymd(d) { return d.toISOString().slice(0, 10); }
function dot(d) { return ymd(d).replace(/-/g, "."); }
const WDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function rfc2822(d) {
  // d は JST補正済みの Date。表記上 +0900 固定、朝7時。
  return `${WDAY[d.getUTCDay()]}, ${String(d.getUTCDate()).padStart(2, "0")} ${MON[d.getUTCMonth()]} ${d.getUTCFullYear()} 07:00:00 +0900`;
}
function esc(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function sanitizeSlug(slug, date) {
  const c = String(slug || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
  return c || `sf-${date}`;
}
function setOutput(pairs) {
  const f = process.env.GITHUB_OUTPUT;
  if (!f) return;
  let body = "";
  for (const [k, v] of Object.entries(pairs)) body += `${k}<<JREOF\n${v}\nJREOF\n`;
  appendFileSync(f, body);
}

// ---- Claude API --------------------------------------------------------------
async function generateArticle(seed, avoidTitles) {
  if (process.env.STUB === "1") {
    return {
      title: "【テスト】チャコールスターターで失敗しない火起こしの基本",
      slug: "test-charcoal-starter",
      category: "gear",
      description: "テスト記事。チャコールスターター(火起こし器)の使い方を基本から解説。新聞紙の量、着火時間の目安、炭の移し方まで。",
      og_description: "火起こし器の使い方を基本から。着火10〜15分の目安と炭の移し方。",
      keywords: "チャコールスターター,火起こし,炭,BBQ,着火",
      summary: "火起こし器の使い方を基本から。着火10〜15分の目安と炭の移し方まで。",
      lead: "チャコールスターターを使えば、着火剤なしでも10〜15分で炭全体が熾る。これはテスト用のダミー記事です。",
      read_minutes: 6,
      body_html: "<h2>テスト見出し</h2><p>これはローカル動作確認用のダミー本文です。120℃で焼くなどの一次情報を含みます。</p><ul><li>項目1</li><li>項目2</li></ul>",
      faq: [{ q: "テスト質問?", a: "テスト回答です。" }],
    };
  }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY が未設定です。");

  const system = `あなたは BBQ専門ECメディア「SLOW FIRE JOURNAL」の編集者兼ライターです。
家庭でBBQを楽しむ検索ユーザーに向けて、実用的で検索流入が見込める日本語記事を書きます。

${KNOWLEDGE}

# 書き方の指針
- トーンは既存記事に合わせ「実用・SEO寄り・具体的」。how-to/温度/手順/比較/選び方を軸に、読者がすぐ実践できる内容にする。
- 必ず具体的な温度・時間・道具・手順などの一次情報を入れる。一般論の寄せ集めにしない。煽り・誇大・絵文字は使わない。
- 海外ラブ(Low n Slow Basics / Butcher's Axe / Stef the Maori)に自然に触れてよいが、売り込みはしない。
- 既出タイトルと内容が重複しないよう、新しい切り口で書く。
出力は指定のJSONスキーマに厳密に従う。`;

  const avoid = avoidTitles.length ? `\n\n# 既出タイトル（重複回避）\n- ${avoidTitles.join("\n- ")}` : "";
  const userMsg = `今回のテーマの種:「${seed}」\nこのテーマを起点に、実用的なBBQ記事を1本書いてください。種は出発点で、より具体的で新鮮な切り口に発展させて構いません。${avoid}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 8000,
      system,
      output_config: { effort: "high", format: { type: "json_schema", schema: SCHEMA } },
      messages: [{ role: "user", content: userMsg }],
    }),
  });
  if (!res.ok) throw new Error(`Claude API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  if (data.stop_reason === "refusal") throw new Error("Claude が応答を拒否しました。");
  const t = (data.content || []).find((b) => b.type === "text");
  if (!t) throw new Error("テキストブロックなし");
  return JSON.parse(t.text);
}

// ---- 記事HTML ----------------------------------------------------------------
function leadHtml(lead) {
  const i = lead.indexOf("。");
  if (i === -1) return esc(lead);
  return `<strong>${esc(lead.slice(0, i + 1))}</strong>${esc(lead.slice(i + 1))}`;
}
function faqBlock(faq) {
  if (!faq || !faq.length) return "";
  const items = faq.map((f) => `<h3>${esc(f.q)}</h3>\n        <p>${esc(f.a)}</p>`).join("\n        ");
  return `\n      <h2>よくある質問</h2>\n        ${items}`;
}
function renderArticle(p) {
  const cat = CAT[p.category];
  const url = `${SITE}/journal/articles/${p.file}`;
  const ld = {
    "@context": "https://schema.org", "@type": "Article",
    headline: p.title, description: p.description, datePublished: p.iso, dateModified: p.iso,
    inLanguage: "ja-JP", mainEntityOfPage: { "@type": "WebPage", "@id": url },
    image: [p.hero],
    author: { "@type": "Organization", name: "SLOW FIRE JOURNAL" },
    publisher: { "@type": "Organization", name: "SLOW FIRE", url: SITE + "/" },
    articleSection: cat.ja, keywords: p.keywords,
  };
  const faqLd = (p.faq && p.faq.length) ? {
    "@context": "https://schema.org", "@type": "FAQPage",
    mainEntity: p.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  } : null;
  const crumb = {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "ホーム", item: SITE + "/" },
      { "@type": "ListItem", position: 2, name: "FIRESIDE", item: SITE + "/journal/" },
      { "@type": "ListItem", position: 3, name: p.title, item: url },
    ],
  };
  const lds = [ld, faqLd, crumb].filter(Boolean)
    .map((o) => `  <script type="application/ld+json">${JSON.stringify(o)}</script>`).join("\n");

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(p.title)} | SLOW FIRE JOURNAL</title>
  <meta name="description" content="${esc(p.description)}">
  <meta name="keywords" content="${esc(p.keywords)}">
  <link rel="canonical" href="${url}">
  <link rel="manifest" href="../../manifest.json">
  <meta name="theme-color" content="#B45309">
  <link rel="icon" type="image/jpeg" href="https://images.unsplash.com/photo-1621851709622-e19c9a4f0cc5?auto=format&fit=crop&w=64&h=64&q=80">
  <link rel="apple-touch-icon" href="https://images.unsplash.com/photo-1621851709622-e19c9a4f0cc5?auto=format&fit=crop&w=180&h=180&q=80">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${esc(p.title)}">
  <meta property="og:description" content="${esc(p.og_description)}">
  <meta property="og:url" content="${url}">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;600;700;900&family=Playfair+Display:wght@700;700i&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../../style.css?v=20260506e">
  <link rel="stylesheet" href="../../assets/global-search.css?v=20260516">
  <link rel="stylesheet" href="../../assets/sf-features.css?v=20260517">
  <link rel="stylesheet" href="../journal.css">
${lds}
${GA_CLARITY}
</head>
<body class="journal-page">
${NAV}

  <article>
    <nav class="jr-crumb" aria-label="パンくずリスト">
      <a href="../../index.html">ホーム</a><span class="jr-crumb-sep">/</span>
      <a href="../index.html">FIRESIDE</a><span class="jr-crumb-sep">/</span>
      <span>${esc(p.title)}</span>
    </nav>

    <header class="jr-article-header">
      <span class="jr-category">${cat.upper}</span>
      <h1>${esc(p.title)}</h1>
      <p class="jr-lead">${leadHtml(p.lead)}</p>
      <div class="jr-meta">
        <span>${p.dotDate}</span><span>読了 約${p.read_minutes}分</span><span>カテゴリー：${cat.ja}</span>
      </div>
    </header>

    <div class="jr-hero-img">
      <div class="jr-hero-img-inner"><img src="${p.hero}" width="1600" height="1000" alt="${esc(p.title)}" loading="eager"></div>
    </div>

    <div class="jr-body">
      ${p.body_html}${faqBlock(p.faq)}
    </div>

    <div class="jr-back"><a href="../index.html">← SLOW FIRE JOURNAL TOPに戻る</a></div>
  </article>

${FOOTER}
</body>
</html>
`;
}

// ---- 一覧/カテゴリ カード -----------------------------------------------------
function indexCard(p) {
  const cat = CAT[p.category];
  return `      <a href="articles/${p.file}" class="jr-list-card" data-cat="${p.category}">
        <div class="jr-list-img"><img src="${p.hero}" width="1600" height="1000" alt="${esc(p.title)}" loading="lazy"></div>
        <div class="jr-list-meta">
          <span class="jr-list-cat">${cat.upper}</span>
          <h3 class="jr-list-title">${esc(p.title)}</h3>
          <p class="jr-list-summary">${esc(p.summary)}</p>
          <p class="jr-list-readtime">読了 約${p.read_minutes}分</p>
        </div>
      </a>\n`;
}
function categoryCard(p) {
  return `      <a href="../articles/${p.file}" class="jr-list-card">
        <div class="jr-list-img"><img src="${p.hero}" width="1600" height="1000" alt="${esc(p.title)}" loading="lazy"></div>
        <div class="jr-list-meta">
          <h3 class="jr-list-title">${esc(p.title)}</h3>
          <p class="jr-list-summary">${esc(p.summary)}</p>
          <p class="jr-list-readtime">読了 約${p.read_minutes}分</p>
        </div>
      </a>\n`;
}

// アンカー直後に挿入するヘルパ（見つからなければ false を返し、呼び出し側でスキップ）
function insertAfter(text, anchor, insertion, fromIndex = 0) {
  const i = text.indexOf(anchor, fromIndex);
  if (i === -1) return null;
  const at = i + anchor.length;
  return text.slice(0, at) + "\n" + insertion + text.slice(at);
}

async function updateFile(path, fn) {
  try {
    const before = await readFile(path, "utf8");
    const after = fn(before);
    if (after == null) { console.warn(`⚠ 挿入位置が見つからずスキップ: ${path}`); return false; }
    await writeFile(path, after, "utf8");
    return true;
  } catch (e) {
    console.warn(`⚠ 更新失敗（スキップ）: ${path} — ${e.message}`);
    return false;
  }
}

async function updateJson(path, makeEntry) {
  try {
    const arr = JSON.parse(await readFile(path, "utf8"));
    arr.unshift(makeEntry());
    await writeFile(path, JSON.stringify(arr, null, 2) + "\n", "utf8");
    return true;
  } catch (e) {
    console.warn(`⚠ JSON更新失敗（スキップ）: ${path} — ${e.message}`);
    return false;
  }
}

// ---- メイン ------------------------------------------------------------------
async function main() {
  const base = jstNow();
  const iso = ymd(base);
  const dotDate = dot(base);

  // 既存スラッグ・タイトル
  const files = existsSync(ART_DIR) ? (await readdir(ART_DIR)).filter((f) => f.endsWith(".html")) : [];
  const existingSlugs = new Set(files.map((f) => f.replace(/\.html$/, "")));
  let avoidTitles = [];
  try {
    const idx = JSON.parse(await readFile(join(ROOT, "journal", "search-index.json"), "utf8"));
    avoidTitles = idx.map((e) => e.title).filter(Boolean);
  } catch {}

  // 同日二重生成防止（FORCE/STUBで回避）
  const force = process.env.FORCE === "true" || process.env.STUB === "1";
  // （journalは日付メタが各記事内なので、当日生成済み判定はスラッグ衝突で代替）

  const seed = TOPIC_SEEDS[files.length % TOPIC_SEEDS.length];
  console.log(`テーマの種: ${seed}`);
  const art = await generateArticle(seed, avoidTitles);

  let slug = sanitizeSlug(art.slug, iso);
  if (existingSlugs.has(slug) && !force) { console.log(`既存スラッグ ${slug}。スキップ。`); setOutput({ generated: "false" }); return; }
  if (existingSlugs.has(slug)) slug = `${slug}-${iso}`;
  const category = CATEGORIES.includes(art.category) ? art.category : "recipe";
  const file = `${slug}.html`;
  const hero = HERO_POOL[files.length % HERO_POOL.length];

  const p = {
    title: art.title, file, slug, category,
    description: art.description, og_description: art.og_description || art.description,
    keywords: art.keywords, summary: art.summary || art.description,
    lead: art.lead, read_minutes: art.read_minutes || 7, body_html: art.body_html,
    faq: Array.isArray(art.faq) ? art.faq : [],
    iso, dotDate, hero,
  };

  // 1) 記事ページ
  await mkdir(ART_DIR, { recursive: true });
  await writeFile(join(ART_DIR, file), renderArticle(p), "utf8");
  console.log(`記事生成: journal/articles/${file}`);

  // 2) journal/index.html （#all グリッド先頭）
  await updateFile(join(ROOT, "journal", "index.html"), (html) => {
    const sec = html.indexOf('<section class="jr-list-section" id="all">');
    if (sec === -1) return null;
    return insertAfter(html, '<div class="jr-list-grid">', indexCard(p).replace(/\n$/, ""), sec);
  });

  // 3) journal/search-index.json
  const entry = () => ({ title: p.title, h1: p.title, desc: p.description, keywords: p.keywords, category: "記事", url: `journal/articles/${file}` });
  await updateJson(join(ROOT, "journal", "search-index.json"), entry);
  // 4) root search-index.json
  await updateJson(join(ROOT, "search-index.json"), entry);

  // 5) feed.xml （lastBuildDate 更新＋item 追加）
  await updateFile(join(ROOT, "feed.xml"), (xml) => {
    const item = `  <item>\n    <title>${esc(p.title)}</title>\n    <link>${SITE}/journal/articles/${file}</link>\n    <guid>${SITE}/journal/articles/${file}</guid>\n    <pubDate>${rfc2822(base)}</pubDate>\n    <description>${esc(p.description)}</description>\n  </item>`;
    let out = xml.replace(/<lastBuildDate>.*?<\/lastBuildDate>/, `<lastBuildDate>${rfc2822(base)}</lastBuildDate>`);
    const r = insertAfter(out, "</lastBuildDate>", item);
    return r;
  });

  // 6) sitemap-main.xml （journal/ の直後）
  await updateFile(join(ROOT, "sitemap-main.xml"), (xml) => {
    const anchor = `<loc>${SITE}/journal/</loc>`;
    const lineEnd = xml.indexOf("</url>", xml.indexOf(anchor));
    if (xml.indexOf(anchor) === -1 || lineEnd === -1) return null;
    const at = lineEnd + "</url>".length;
    const u = `  <url><loc>${SITE}/journal/articles/${file}</loc><lastmod>${iso}</lastmod><priority>0.9</priority></url>`;
    return xml.slice(0, at) + "\n" + u + xml.slice(at);
  });

  // 7) カテゴリページ
  await updateFile(join(ROOT, "journal", "category", `${category}.html`), (html) => {
    let out = html.replace(/<h2>(\d+)本の記事<\/h2>/, (m, n) => `<h2>${Number(n) + 1}本の記事</h2>`);
    const r = insertAfter(out, '<div class="jr-list-grid">', categoryCard(p).replace(/\n$/, ""));
    return r;
  });

  setOutput({
    generated: "true",
    title: p.title,
    summary: p.summary,
    category: CAT[category].ja,
    url: `${SITE}/journal/articles/${file}`,
  });
  console.log(`完了: ${p.title}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
