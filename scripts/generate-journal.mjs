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
    read_minutes: { type: "integer", description: "読了目安（分）。7〜13。" },
    body_html: {
      type: "string",
      description:
        "本文HTML。使用タグは <h2>/<h3>/<p>/<ul>/<ol>/<li>/<table>/<thead>/<tbody>/<tr>/<th>/<td>/<blockquote>/<strong> のみ（<h1>禁止）。" +
        "2200〜3200字で、その検索意図を『この1本で完全に満たす』網羅度にする。H2を5つ以上立て、" +
        "『定義・結論 → なぜ(理屈/科学) → 具体的な手順(温度℃・中心温度・時間・分量・道具を数値で) → よくある失敗と回避 → トラブルシュート → バリエーション/応用』を必ず含める。" +
        "比較・数値は可能な限り <table> で示す。『適量・お好みで・適度に』のような曖昧表現は禁止し、必ず具体値を書く。",
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
  const system = `あなたは、アメリカン/オーストラリアンBBQを長年やり込んだ職人気質のライターです。BBQ専門ECメディア「SLOW FIRE JOURNAL」で、検索から来た読者の疑問を「この1本で完全に解決する」決定版記事を日本語で書きます。

${KNOWLEDGE}

# 品質基準（最重要・必ず守る）
- 密度: 一次情報の塊にする。温度(℃)・中心温度・時間(分/時間)・分量・回数・道具の使い分けなど、読者がそのまま再現できる具体数値を必ず入れる。「適量」「お好みで」「適度に」は禁止。
- 網羅: 検索意図に対する疑問が一切残らないよう、定義/結論 → 理由(科学・理屈) → 具体的手順 → よくある失敗と回避 → トラブルシュート → バリエーション → FAQ まで漏れなく書く。途中で打ち切らない。
- 言い切る: 比較・選択では「どれを・なぜ選ぶか」を理由つきで断言する。両論併記で逃げない。
- 自然さ: 実務家が書いたような自然な日本語。文の長短を混ぜ、機械的な並列・繰り返しを避ける。

# AIっぽさ・薄さを徹底排除（禁止）
- 定型の導入(「〜について解説します」「本記事では」)、空疎な一般論、過剰な前置き、自明な説明を書かない。
- 「まとめると」「いかがでしたか」「ぜひ試してみてください」等の締め定型を使わない。
- 箇条書きの水増し(中身の薄い列挙)、同義語の言い換えだけの繰り返し、結論の先延ばしをしない。
- 抽象的な美辞麗句より、具体的な数字・固有名・手順を優先する。

# 前提
- 媒体は海外BBQラブのEC。Low n Slow Basics / Butcher's Axe / Stef the Maori に文脈上自然な範囲で触れてよいが、宣伝臭は出さない。
- 煽り・誇大・絵文字・キーワード詰め込みはしない。既出タイトルと内容が重複しないよう新しい切り口で書く。

出力は指定のJSONスキーマに厳密に従う。`;

  const avoid = avoidTitles.length ? `\n\n# 既出タイトル（重複回避）\n- ${avoidTitles.join("\n- ")}` : "";
  const userMsg = `今回のテーマの種:「${seed}」\nこのテーマを起点に、実用的なBBQ記事を1本書いてください。種は出発点で、より具体的で新鮮な切り口に発展させて構いません。${avoid}`;

  return callClaude(system, userMsg, SCHEMA, { maxTokens: 12000, effort: "xhigh" });
}

// 汎用 Claude 呼び出し（structured output / 依存ゼロ）
async function callClaude(system, userMsg, schema, { maxTokens = 8000, effort = "high" } = {}) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY が未設定です。");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      output_config: { effort, format: { type: "json_schema", schema } },
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

// ===== 自己検証ループ（採点 → 修正 → 再採点）=====
const PASS = 80;          // 合格点
const MAX_REVISE = 3;     // 最大修正回数
const RUBRIC = [
  { name: "独自性・一次情報の密度", max: 25, desc: "具体的な温度/時間/分量/手順/数値が豊富で、ありきたりでなく独自の視点がある" },
  { name: "技術的正確性", max: 25, desc: "下記の知識ベース(Weber Grill Academy由来)に照らして、温度・時間・手順などに誤った情報がない" },
  { name: "言い切り・トーン", max: 20, desc: "実用的に根拠をもって言い切れている。ただし誇張・煽り・断定の押し付けがなく、落ち着いた語り口" },
  { name: "次の行動の明確さ", max: 15, desc: "読者が次に取るべき行動が1つ、明確に書かれている" },
  { name: "独自の切り口・重複回避", max: 15, desc: "既存記事と内容のかぶりが2割未満で、独自の切り口がある" },
];
const GRADE_SCHEMA = {
  type: "object", additionalProperties: false,
  properties: {
    items: {
      type: "array", description: "5項目の採点",
      items: {
        type: "object", additionalProperties: false,
        properties: {
          name: { type: "string", enum: RUBRIC.map((r) => r.name) },
          score: { type: "integer", description: "獲得点(0〜配点)" },
          max: { type: "integer", description: "配点" },
          issue: { type: "string", description: "減点理由(満点なら『なし』)" },
          fix: { type: "string", description: "具体的な直し方(満点なら『なし』)" },
        },
        required: ["name", "score", "max", "issue", "fix"],
      },
    },
    verdict: { type: "string", description: "総評(1〜2文)" },
  },
  required: ["items", "verdict"],
};
function articleText(a) {
  const faq = (a.faq || []).map((f) => `Q.${f.q}\nA.${f.a}`).join("\n");
  return `タイトル: ${a.title}\nカテゴリ: ${a.category}\nリード: ${a.lead}\n\n本文HTML:\n${a.body_html}\n\nFAQ:\n${faq}`;
}
async function grade(a, avoidTitles) {
  if (process.env.STUB === "1") {
    return { total: 88, items: RUBRIC.map((r) => ({ name: r.name, score: r.max, max: r.max, issue: "なし", fix: "なし" })), verdict: "STUB合格" };
  }
  const system = `あなたは SLOW FIRE JOURNAL の厳格な編集長です。公開前の記事を以下のルーブリックで100点満点・項目別に採点します。甘くつけず、具体的に指摘します。

# 採点ルーブリック（合格 ${PASS}点）
${RUBRIC.map((r) => `- ${r.name}（${r.max}点）: ${r.desc}`).join("\n")}

# 「技術的正確性」判定に使う“正”の知識（これに反する温度・手順・数値は誤りとして必ず減点）
${KNOWLEDGE}

各項目に 0〜配点 の整数で点をつけ、減点した項目には issue(理由) と fix(具体的な直し方) を必ず書く。出力はスキーマに厳密に従う。`;
  const user = `# 採点対象の記事\n${articleText(a)}\n\n# 既存記事タイトル（重複判定用）\n- ${(avoidTitles || []).slice(0, 60).join("\n- ")}`;
  const g = await callClaude(system, user, GRADE_SCHEMA, { maxTokens: 3500, effort: "high" });
  const byName = Object.fromEntries(RUBRIC.map((r) => [r.name, r.max]));
  const items = (g.items || []).map((i) => ({ ...i, max: byName[i.name] ?? i.max }));
  const total = items.reduce((s, i) => s + (Number(i.score) || 0), 0);
  return { total, items, verdict: g.verdict || "" };
}
async function revise(a, failing) {
  const system = `あなたは BBQ専門メディア「SLOW FIRE JOURNAL」の編集者です。以下の記事を、指摘された項目を重点的に直して全文書き直します。良い部分は保ち、指摘以外を不必要に変えないこと。具体的な温度・時間・数値・手順を増やし、AIっぽい定型・水増し・薄さは排除する。

${KNOWLEDGE}

出力は記事生成と同じJSONスキーマに厳密に従う。`;
  const fixList = failing.map((i) => `- ${i.name}（${i.score}/${i.max}）: ${i.issue} → ${i.fix}`).join("\n");
  const cur = { title: a.title, slug: a.slug, category: a.category, description: a.description, og_description: a.og_description, keywords: a.keywords, summary: a.summary, lead: a.lead, read_minutes: a.read_minutes, body_html: a.body_html, faq: a.faq };
  const user = `# 現在の記事(JSON)\n${JSON.stringify(cur)}\n\n# 直すべき項目（ここだけ重点的に改善）\n${fixList}`;
  return callClaude(system, user, SCHEMA, { maxTokens: 12000, effort: "xhigh" });
}
function failSummary(g) {
  const low = g.items.filter((i) => i.score < i.max);
  return low.length ? `（弱点: ${low.map((i) => `${i.name} ${i.score}/${i.max}`).join(", ")}）` : "（全項目満点）";
}
async function reviewLoop(art, avoidTitles) {
  const log = [];
  let best = art;
  let bestG = await grade(best, avoidTitles);
  log.push(`採点1回目: ${bestG.total}点 ${failSummary(bestG)}`);
  console.log(log[log.length - 1]);
  let attempts = 0;
  while (bestG.total < PASS && attempts < MAX_REVISE) {
    attempts++;
    const failing = bestG.items.filter((i) => i.score < i.max);
    let candidate;
    try { candidate = await revise(best, failing); }
    catch (e) { console.warn(`修正${attempts}回目で失敗: ${e.message}`); break; }
    const g = await grade(candidate, avoidTitles);
    log.push(`修正${attempts}回目→採点: ${g.total}点 ${failSummary(g)}`);
    console.log(log[log.length - 1]);
    if (g.total > bestG.total) { best = candidate; bestG = g; }
  }
  return { best, grade: bestG, log: log.join("\n"), attempts };
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
// 本文先頭に「番号付き目次（アンカーリンク）」を付ける。各H2にidを振り、見出しが2つ以上のときだけ目次を出す。
function addTOC(html) {
  const heads = [];
  let n = 0;
  const withIds = html.replace(/<h2(\s[^>]*)?>([\s\S]*?)<\/h2>/g, (m, attr, inner) => {
    n++;
    const id = `sec-${n}`;
    heads.push({ id, text: inner.replace(/<[^>]+>/g, "").trim() });
    return `<h2 id="${id}" style="scroll-margin-top:84px">${inner}</h2>`;
  });
  if (heads.length < 2) return html;
  const items = heads
    .map((h) => `<li style="margin:.15em 0"><a href="#${h.id}" style="color:#B45309;text-decoration:none">${h.text}</a></li>`)
    .join("");
  const toc = `<nav class="jr-toc" aria-label="目次" style="margin:0 0 1.8em;padding:18px 22px;background:#faf7f2;border:1px solid #ece6db;border-radius:8px">
        <p style="margin:0 0 10px;font-weight:700;font-size:15px;color:#1b1b1b">目次</p>
        <ol style="margin:0;padding-left:1.5em;line-height:1.95;color:#333">${items}</ol>
      </nav>`;
  return toc + withIds;
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
      ${addTOC(p.body_html + faqBlock(p.faq))}
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

  // --- 自己検証ループ（採点→修正→再採点）。STUBは採点をスキップ ---
  const DRAFT = ["1", "true"].includes(process.env.DRAFT);
  const review = process.env.STUB === "1"
    ? { best: art, grade: { total: 100, items: RUBRIC.map((r) => ({ name: r.name, score: r.max, max: r.max, issue: "なし", fix: "なし" })), verdict: "STUB" }, log: "（STUB: 採点スキップ）", attempts: 0 }
    : await reviewLoop(art, avoidTitles);
  const a = review.best;
  const g = review.grade;
  const breakdown = g.items.map((i) => `${i.name} ${i.score}/${i.max}`).join(" ／ ");
  console.log(`採点ログ:\n${review.log}\n最終スコア: ${g.total}点`);

  // スラッグ・分類・画像
  let slug = sanitizeSlug(a.slug, iso);
  if (existingSlugs.has(slug)) slug = `${slug}-${iso}`;
  const category = CATEGORIES.includes(a.category) ? a.category : "recipe";
  const file = `${slug}.html`;
  const hero = HERO_POOL[files.length % HERO_POOL.length];

  const p = {
    title: a.title, file, slug, category,
    description: a.description, og_description: a.og_description || a.description,
    keywords: a.keywords, summary: a.summary || a.description,
    lead: a.lead, read_minutes: a.read_minutes || 7, body_html: a.body_html,
    faq: Array.isArray(a.faq) ? a.faq : [],
    iso, dotDate, hero,
  };
  const reviewBody = `<h2 style="margin:.2em 0">${esc(p.title)}</h2><p style="color:#555"><em>${esc(p.lead)}</em></p>${addTOC(p.body_html + faqBlock(p.faq))}`;

  // ドラフトモード: 公開もファイル更新もせず、山根さんにドラフト＋採点ログを送る
  if (DRAFT) {
    setOutput({ status: "draft", title: p.title, score: String(g.total), breakdown, log: review.log, body: reviewBody });
    console.log(`DRAFT: 公開せず（${g.total}点）。`);
    return;
  }
  // 安全弁: 合格点未満は公開しない。山根さんに最高得点版＋落ちた項目を送る
  if (g.total < PASS) {
    const reasons = g.items.filter((i) => i.score < i.max).map((i) => `${i.name} ${i.score}/${i.max}：${i.issue}`).join("\n");
    setOutput({ status: "failed", title: p.title, score: String(g.total), breakdown, reasons: reasons || "—", log: review.log, body: reviewBody });
    console.log(`不合格（${g.total}点）。公開せず、山根さんに通知。`);
    return;
  }

  // --- 合格 → 公開（7ファイル更新）---
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
    status: "published",
    generated: "true",
    title: p.title,
    summary: p.summary,
    category: CAT[category].ja,
    url: `${SITE}/journal/articles/${file}`,
    score: String(g.total),
    breakdown,
  });
  console.log(`公開完了: ${p.title}（${g.total}点）`);
}

main().catch((e) => { console.error(e); process.exit(1); });
