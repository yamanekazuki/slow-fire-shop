// =============================================================================
// YORON BBQ SHOP — journal 自動記事生成スクリプト
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
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");                 // bbq-shop/
const ART_DIR = join(ROOT, "journal", "articles");
const SITE = "https://an-bbq.jp";
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
      <a href="../../index.html" class="nav-logo">YORON<span>BBQ</span> <em>SHOP</em></a>
      <nav class="nav-links">
        <a href="../../index.html#products">商品一覧</a>
        <div class="nav-dropdown">
          <button class="nav-dropdown-toggle" aria-expanded="false" aria-haspopup="true">ガイド <span class="nav-dropdown-arrow">▾</span></button>
          <div class="nav-dropdown-menu" role="menu">
            <a href="../../essentials.html"><strong>BBQの神髄</strong><span>初めての方向け</span></a>
            <a href="../../pairing-guide.html"><strong>食材から選ぶ</strong><span>ペアリング</span></a>
            <a href="../../cookbook.html"><strong>料理から選ぶ</strong><span>36品の料理ガイド</span></a>
            <a href="../../rub-guide.html"><strong>ラブガイド</strong><span>ラブの種類と使い方</span></a>
          </div>
        </div>
        <a href="../index.html" style="color: var(--brand);">FIRESIDE</a>
        <a href="../../bbq-spots/index.html">BBQ場検索</a>
        <a href="../../planner/index.html">プランナー</a>
        <a href="../../team.html">私たちについて</a>
        <a href="https://yoron-bbq.com/" class="nav-community" target="_blank" rel="noopener">COMMUNITY</a>
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
          <a href="../../index.html" class="footer-logo">YORON<span>BBQ</span> <em>SHOP</em></a>
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
// ヒーロー画像 = journal/thumbs/<slug>.jpg（実写フルブリードのサムネ。tools/gen-journal-thumb/gen.mjs が生成）
// サムネの下地写真は tools/gen-journal-thumb/photo-map.json が正本。1記事=1枚・重複禁止（山根さんFB 2026-07-30）。
// 写真の新規AI生成はしない。images/journal/ 配下の承認済み実写だけを使う。
const PHOTO_MAP_FILE = join(ROOT, "tools", "gen-journal-thumb", "photo-map.json");
const PHOTO_DIRS = [join("images", "journal"), join("images", "journal", "pool")];
// カテゴリ→写真ファイル名に含まれていたら優先するキーワード（テーマの合う絵を先に取る）
const PHOTO_HINT = {
  recipe: ["platter", "plate", "ribs", "chicken", "brisket", "pork", "salmon", "shrimp", "steak", "burger"],
  science: ["grill", "charcoal", "smoke", "smoker", "fire", "brisket"],
  gear: ["charcoal", "chimney", "smoker", "grill", "rub", "tool"],
  philosophy: ["smoker", "fire", "table", "scene", "platter", "grill"],
};
/**
 * 新記事に「まだ誰も使っていない写真」を1枚割り当て、photo-map.json に追記する。
 * 割当できたら相対パスを返す（できなければ null＝サムネは生成されず一覧に警告が出る）。
 */
async function assignPhoto(slug, category) {
  const map = JSON.parse(await readFile(PHOTO_MAP_FILE, "utf8"));
  map.articles ||= {}; map.guide ||= {};
  if (map.articles[slug]) return map.articles[slug];
  const used = new Set([...Object.values(map.articles), ...Object.values(map.guide)]);
  const all = [];
  for (const d of PHOTO_DIRS) {
    const abs = join(ROOT, d);
    if (!existsSync(abs)) continue;
    for (const f of (await readdir(abs)).filter((f) => /\.(jpe?g|png)$/i.test(f))) all.push(`${d}/${f}`.split("\\").join("/"));
  }
  const free = all.filter((p) => !used.has(p)).sort();
  const hints = PHOTO_HINT[category] || [];
  let chosen;
  if (free.length) {
    chosen = free.find((p) => hints.some((h) => p.toLowerCase().includes(h))) || free[0];
  } else {
    // 未使用が尽きたとき: サムネなしで公開するより、既出写真を1枚借りて必ず絵を出す。
    // ただし「1記事=1枚」の原則が崩れるので、承認済み実写の追加を強く促す警告を出す。
    if (!all.length) { console.warn("⚠️ images/journal/ に写真が1枚もありません。"); return null; }
    let h = 0;
    for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
    const pool = all.filter((p) => hints.some((x) => p.toLowerCase().includes(x)));
    const from = pool.length ? pool : all;
    chosen = from.sort()[h % from.length];
    console.warn(`⚠️ 未使用の写真が枯渇したため既出写真を再利用しました（${chosen}）。images/journal/pool/ に承認済み実写を追加してください。`);
  }
  map.articles[slug] = chosen;
  await writeFile(PHOTO_MAP_FILE, JSON.stringify(map, null, 2) + "\n", "utf8");
  console.log(`写真割当: ${slug} → ${chosen}`);
  return chosen;
}

// ---- テーマの種（GROWTH-10K-UU.md＝bbq-site正本の戦略に沿ってクラスター化 2026-07-05）----
// 軸A『Weber日本語教科書』＝日本語で体系化サイト不在の空白領域（背骨）
// 軸B『温度の科学』＝通年需要で冬の谷を埋める集客エンジン
// いずれも「実測データ・一次体験」が企業メディアに勝つ武器。既存48本と重複しない切り口で。
const TOPIC_SEEDS = [
  // --- 軸A: Weber日本語教科書 ---
  "蓋つきグリルの使い方：なぜ蓋を閉めると味が変わるのか",
  "スネークメソッド：炭を並べて6時間の低温を保つ配置術",
  "グリルの温度を安定させるベント（吸気口・排気口）調整の基本",
  "肉の内部温度 完全ガイド：部位別の安全温度と食感の科学",
  "BBQ用温度計の選び方：プローブ式・瞬間読み取り・ワイヤレス比較",
  "テキサスクラッチ：アルミホイルで包む理由と最適なタイミング",
  "バークとスモークリング：あの黒い皮とピンクの輪の科学",
  "ベンドテストと仕上がり判定：竹串より確かな見極め方",
  "リブの3-2-1メソッド：時間と温度の設計図",
  "プルドポークの作り方：肩肉を低温でほぐれるまで焼く",
  // --- 軸B: 温度の科学（通年・冬） ---
  "Low & Slowの原理：なぜ110℃で10時間焼くのか",
  "炭火で低温調理：専用器なしで温度帯を設計する方法",
  "燻製の温度帯：熱燻・温燻・冷燻の使い分けと食材別の目安",
  "スモークウッドとスモークチップの違いと使い分け",
  "雨の日・冬のBBQ：外気温が低い日の温度管理テクニック",
  // --- EC・定番接続 ---
  "スパイスラブを自作する：基本配合と黄金比",
  "BBQ初心者が最初に揃えるべき道具リスト",
  "BBQ後のグリル掃除とメンテナンス完全ガイド",
  // --- 軸C: YORON BBQ（与論島発のバーベキュー） ---
  "YORON BBQとは何か——12時間の憧れと、5〜6時間の現実",
  "普通のスーパーの食材が劇的に美味しくなる、蓋付きグリルのロジック",
  "冷めたプルドポーク問題——熱々を出来立てで配るBBQの設計",
  "肉2〜3種＋副菜＋シーフード：飽きさせないYORON BBQの組み立て方",
  "BBQ場の5時間枠で完結するタイムライン設計：仕込みから片付けまで",
  "直火で焦がす日本のBBQからの卒業——「面倒なわりに美味しくない」を終わらせる",
  "片付けがスマートになる理由：蓋付きグリルの後処理ロジック",
  "男のホビーから、家族の食卓へ——BBQが日常になる条件",
  "塊肉ドカンでは足りない：日本人の「少しずつ、多種多様に、熱々で」に応える献立術",
  "万能スパイスの標準化を超える——BBQラブで創作を取り戻す",
  "オーストラリアのプレミアムラブという選択肢",
  "AI時代にBBQが人間関係のハブになる理由——無言も心地よい火のまわり",
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
    lead: { type: "string", description: "リード文。3〜4文。やわらかい『です・ます』の語り口で、読者への共感や問いかけから入り、1〜2文目で記事の核心(具体的な結論・温度・数値)に触れる。常体（〜だ）は使わない。" },
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
# YORON BBQ SHOP（媒体名: YORON BBQ JOURNAL / FIRESIDE）について
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

# YORON BBQの思想 — 正本 bbq-site/AN-BBQ-PHILOSOPHY.md の凝縮
- ブランド名は「YORON BBQ」＝与論島発のバーベキュー。本場アメリカンBBQを、与論島から。英字表記 YORON BBQ が正。旧称「あんBBQ／ニューバーベキュー」は使わない。
- アメリカンBBQの優れたロジック（蓋付きグリル・間接熱・ロー&スロー・温度の科学）は継承する。ただし12時間級の長時間燻製は日本の暮らしに根づかない。その限界を超えて日常に溶け込むのが「YORON BBQ」。
- コピーの3原則: ①3〜4時間で完結（作って食べて楽しんで全部込み。12時間は憧れとして語ってよいが推奨はこちら） ②熱々を、出来立てで（冷めた塊肉＋ソースにしない。冷めて乾いたプルドポークにBBQソースをかけるのは、A5焼肉を自家製タレで食べるのと同じロジック） ③多品種（肉2〜3種＋副菜・シーフード。普通のスーパーの食材で）。
- 背景: アジア人はせっかち。BBQ場・グランピング施設も5〜6時間超の利用を前提にしていない。塊肉を何時間も育てる儀式は「男のホビー」としては面白いが「日常の食として美味しい」感動を超えなかった。日本人の食の本質は「少しずつ、多種多様なものを、常に熱々で」。本場級の塊肉は普通のスーパーに無く、コストコ頼み＝非日常のままでは文化にならない。
- 日本の従来BBQ=「直火で焼き、炭火で焦がす」→外は真っ黒・中はカスカス→「面倒なわりに美味しくない」という諦め。突破の鍵=蓋付きグリル（熱対流・インダイレクト）のロジック: 焦がさず、水分を保ち、食材のポテンシャルを最大化。片付けもスマート。
- 定義:「普通のスーパーで買える日常の食材や、日本全国の豊かな食材を、蓋付きグリルのロジックで圧倒的に美味しく変貌させる」日常に寄り添うアプローチ。
- 調味料のコモディティ化への挑戦: 日本は万能スパイスが大衆化しすぎ「誰が焼いても同じ味」に。世界一味覚に敏感なはずの日本人が創作の味付けを追求しなくなった。第一歩=BBQ先進国オーストラリアの多様なプレミアム・ラブの輸入、その先に自社オリジナルスパイスの開発。驚きのある食卓への新しい味覚の選択肢を架ける。
- AI時代の使命: ゴールは「今週末BBQしよう」と言い合えるカジュアル・カルチャー。テクノロジーで人間関係が希薄化する時代、同じ火を囲めば無言の時間すら心地よい「安心の場」＝人間関係の最強のハブ。温かい繋がりと対話を取り戻す次世代の食文化。
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
  const system = `あなたは、BBQ専門ECメディア「YORON BBQ JOURNAL」のライターです。BBQが大好きで、自分でも何度も失敗しながらやり込んできた人。検索から来た読者の疑問を「この1本で完全に解決する」決定版記事を、やわらかく親しみやすい語り口の日本語で書きます。

${KNOWLEDGE}

# 記事の2系統（テーマの種からどちらか判断する）
- A系統=アメリカンBBQ探求の入口記事: ロー&スロー・ラブ・温度管理・ブリスケットなど、本場アメリカンBBQに憧れて検索してきた読者向け。憧れと探求心にまっすぐ応える。
  ただし結びで一段だけ、自然にYORON BBQへの橋を架ける——読者が遠からず突き当たる同じ課題（12時間は現実的でない・塊肉は冷める・単調）にそっと触れ、「3〜4時間で完結する与論島発のやり方（YORON BBQ）もある」と示す。橋は1段だけ。説教や宗旨替えの強要にせず、アメリカンBBQ探求そのものは否定しない。
- B系統=YORON BBQ実践記事: YORON BBQの思想（5〜6時間完結・熱々を出来立てで・多品種・普通のスーパーの食材・蓋付きグリルのロジック）を正面から実践的に書く。
- どちらの系統でも、温度の科学・道具のロジックという土台は共通。全部をYORON BBQに寄せず、入口記事の役割も大切にする。

# 文体・声（最重要・SLOW FIREの世界観そのもの）
SLOW FIREは「BBQを日常にする」「火と向き合う時間そのものを楽しむ」がコンセプト。だから記事も、上から教える硬い説明ではなく、隣で一緒に火を囲みながら話してくれる先輩のような、あたたかい語り口にします。具体的には:
- 基調は「です・ます」。常体（〜だ／〜である）は使わない。読者に語りかけるように書く。
- 強い主張ほど語尾でやわらげる:「〜なんですよね」「〜かなと思います」「個人的には〜」「〜といいですよ」。断定の押し付けをしない。
- ただし要所はやさしく言い切る。やわらげと言い切りのコントラストが大事:「これだけは覚えておいてください。」「結論から言うと、原因は◯◯です。」
- 冒頭は、読者の「あるある」への問いかけや共感から入る:「〜で困ったこと、ありませんか？」「実はこれ、◯◯が原因なんです」。いきなり定義から入らない。
- 自分の体験・失敗を素直に混ぜる:「僕も最初これで何度も失敗しました」「正直に言うと」。
- 専門用語は出したらすぐ、やさしい言葉で言い換える。読者を置いていかない。

# 品質基準（必ず守る）
- 密度: 一次情報の塊にする。温度(℃)・中心温度・時間(分/時間)・分量・回数・道具の使い分けなど、読者がそのまま再現できる具体数値を必ず入れる。「適量」「お好みで」「適度に」は禁止。やわらかい文体でも、数字の正確さは一切妥協しない。
- 網羅: 検索意図に対する疑問が一切残らないよう、定義/結論 → 理由(科学・理屈) → 具体的手順 → よくある失敗と回避 → トラブルシュート → バリエーション → FAQ まで漏れなく書く。途中で打ち切らない。
- 根拠をもって導く: 比較・選択では「どれを・なぜ選ぶか」を理由つきで示す。ただし「こうしろ」と突き放すのではなく「個人的にはこっちがおすすめです、なぜなら〜」と理由を添えて寄り添う。
- 自然さ: 実際にBBQをやっている人が、友人に話すような自然な日本語。文の長短を混ぜ、機械的な並列・繰り返しを避ける。

# AIっぽさ・薄さを徹底排除（禁止）
- 定型の導入(「〜について解説します」「本記事では」)、空疎な一般論、過剰な前置き、自明な説明を書かない。
- 「まとめると」「いかがでしたか」のような中身のない締め定型を使わない（自然な呼びかけで終えるのはOK）。
- 箇条書きの水増し(中身の薄い列挙)、同義語の言い換えだけの繰り返し、結論の先延ばしをしない。
- 抽象的な美辞麗句より、具体的な数字・固有名・手順を優先する。やわらかさは「ふわっとした内容」とは違う。中身は濃く、語り口だけやわらかく。

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
  { name: "語り口・トーン", max: 20, desc: "SLOW FIREらしい、やわらかく親しみやすい『です・ます』の語り口になっている（常体〜だ/〜である、上から教える硬い説明、断定の押し付けは減点）。語尾のやわらげ（〜なんですよね/個人的には等）と、要所のやさしい言い切りのコントラストがあり、読者に寄り添っている。一方で内容の濃さ・数値の正確さは保てている" },
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
  const system = `あなたは YORON BBQ JOURNAL の厳格な編集長です。公開前の記事を以下のルーブリックで100点満点・項目別に採点します。甘くつけず、具体的に指摘します。

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
  const system = `あなたは BBQ専門メディア「YORON BBQ JOURNAL」の編集者です。以下の記事を、指摘された項目を重点的に直して全文書き直します。良い部分は保ち、指摘以外を不必要に変えないこと。具体的な温度・時間・数値・手順を増やし、AIっぽい定型・水増し・薄さは排除する。

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
    .map((h) => `<li style="margin:.1em 0"><a href="#${h.id}" style="color:#b74a2c;text-decoration:none">${h.text}</a></li>`)
    .join("");
  const toc = `<nav class="jr-toc" aria-label="目次" style="margin:0 0 2em;padding:20px 24px;background:#fffdf6;border:1px solid rgba(45,37,28,.14);border-radius:14px">
        <p style="margin:0 0 12px;font-weight:700;font-size:15px;color:#2d251c">この記事でお話しすること</p>
        <ol style="margin:0;padding-left:1.4em;line-height:2.05;color:#5b5044">${items}</ol>
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
    author: { "@type": "Organization", name: "YORON BBQ JOURNAL" },
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
  <title>${esc(p.title)} | YORON BBQ JOURNAL</title>
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
  <meta property="og:image" content="${p.hero}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:image" content="${p.hero}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;600;700;900&family=Zen+Maru+Gothic:wght@500;700;900&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../../style.css?v=20260506e">
  <link rel="stylesheet" href="../../assets/global-search.css?v=20260516">
  <link rel="stylesheet" href="../../assets/sf-features.css?v=20260517">
  <link rel="stylesheet" href="../journal.css">
  <link rel="stylesheet" href="../../yoron-theme.css?v=20260802">
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

    <aside class="jr-community">
      <div class="jr-community-inner">
        <p class="jr-community-label">YORON BBQ COMMUNITY</p>
        <h3>読んだら、次は火を入れよう</h3>
        <p>YORONバーベキューのコミュニティでは、月1回、実際に集まって焼いています。<br>読むだけでは分からない火加減と煙の匂いを、体で覚えに来ませんか。初めての方も歓迎です。</p>
        <a href="https://yoron-bbq.com/">コミュニティを見てみる</a>
      </div>
    </aside>

    <div class="jr-back"><a href="../index.html">← YORON BBQ JOURNAL TOPに戻る</a></div>
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
  // 実写フルブリードのサムネ（決定的生成・tools/gen-journal-thumb）を記事のhero/カード画像として使う。
  const hero = `${SITE}/journal/thumbs/${slug}.jpg`;

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

  // 1.3) あんちゃん・やまちゃん・うえたくを本文に散りばめる（決定的・API不使用）。
  // セリフはいま書き出したこの記事の本文から拾うので、新記事は毎回その記事の内容の一言になる。
  try {
    const { sprinkle } = await import(join(ROOT, "tools", "gen-journal-thumb", "anchan-sprinkle.mjs"));
    const artFile = join(ART_DIR, file);
    const withChars = sprinkle(await readFile(artFile, "utf8"), slug);
    if (withChars) {
      await writeFile(artFile, withChars, "utf8");
      console.log("キャラ挿入: あんちゃん／やまちゃん／うえたく");
    }
  } catch (e) {
    console.warn(`⚠️ キャラ挿入に失敗（公開は継続）: ${e.message}`);
  }

  // 1.4) この記事だけの写真を1枚割り当てる（重複禁止・photo-map.jsonが正本）
  try {
    await assignPhoto(slug, category);
  } catch (e) {
    console.warn(`⚠️ 写真割当に失敗（公開は継続）: ${e.message}`);
  }

  // 1.5) 実写フルブリードのサムネを決定的生成（tools/gen-journal-thumb/gen.mjs）。
  // 記事HTMLのh1/jr-category/meta description＋photo-map.jsonの割当写真から毎回同じ結果を生成する。
  // 失敗しても本文公開は止めない。
  try {
    execFileSync("node", [join(ROOT, "tools", "gen-journal-thumb", "gen.mjs"), slug], { stdio: "inherit" });
    console.log(`サムネ生成: journal/thumbs/${slug}.jpg`);
  } catch (e) {
    console.warn(`⚠️ サムネ生成に失敗（公開は継続）: ${e.message}`);
  }

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
