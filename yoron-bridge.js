/* =====================================================================
   yoron-bridge.js — SLOW FIRE SHOP を YORON BBQ のトーンへ橋渡しする注入スクリプト
   mobile-nav.js から動的に読み込まれる（＝全ページ一括適用）。
   やること:
     1. <head> に yoron-theme.css と Google Fonts (Zen Maru Gothic) を注入
     2. body 先頭に bg-field（blob×3 ＋ grain）を注入
     3. ヘッダー直下にコミュニティ誘導バナーを注入（閉じる＝localStorage 記憶）
     4. フッター直前にコミュニティ導線セクションを注入（anchan.js のキャラ）
     5. anchan.js を動的ロード（DOM 注入後にロードする＝render が拾えるように）
   除外: 管理画面 / ダッシュボード / 招待 など運用系ページ
   ===================================================================== */
(function () {
  "use strict";

  /* ---------- 二重実行防止 ---------- */
  var root = document.documentElement;
  if (root.classList.contains("yoron-bridge-done")) return;
  root.classList.add("yoron-bridge-done");

  /* ---------- 除外ページ判定 ---------- */
  var path = (location.pathname || "").toLowerCase();
  var EXCLUDE = ["/admin", "/dashboard", "/invite", "/checkout", "/cart", "/order"];
  for (var i = 0; i < EXCLUDE.length; i++) {
    if (path.indexOf(EXCLUDE[i]) !== -1) return;
  }

  /* ---------- 自分の置き場所を基準パスにする（サブディレクトリ対応） ---------- */
  var me = document.currentScript;
  if (!me) {
    var all = document.querySelectorAll('script[src*="yoron-bridge.js"]');
    me = all.length ? all[all.length - 1] : null;
  }
  var BASE = "/";
  if (me && me.src) {
    try { BASE = new URL(".", me.src).href; } catch (e) { BASE = "/"; }
  }
  var asset = function (name) { return BASE + name; };

  var COMMUNITY = "https://yoron-bbq.com/";
  var JOIN = "https://yoron-bbq.com/#join";
  var EVENT = "https://yoron-bbq.com/event.html";
  var BANNER_KEY = "yoron_banner_closed";

  /* ---------- 1. <head> 注入 ---------- */
  function link(attrs) {
    var el = document.createElement("link");
    for (var k in attrs) el.setAttribute(k, attrs[k]);
    document.head.appendChild(el);
    return el;
  }
  if (!document.querySelector('link[href*="yoron-theme.css"]')) {
    link({ rel: "preconnect", href: "https://fonts.googleapis.com" });
    link({ rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" });
    link({
      rel: "stylesheet",
      href: "https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@700;900&display=swap"
    });
    link({ rel: "stylesheet", href: asset("yoron-theme.css?v=20260730") });
  }

  /* ---------- 描画 ---------- */
  function build() {
    var body = document.body;
    if (!body) return;

    /* 2. 生きた背景（既に演出があるページはスキップ） */
    if (!document.querySelector(".bg-field")) {
      var field = document.createElement("div");
      field.className = "bg-field";
      field.setAttribute("aria-hidden", "true");
      field.innerHTML =
        '<div class="bg-blob b1"></div>' +
        '<div class="bg-blob b2"></div>' +
        '<div class="bg-blob b3"></div>';
      body.insertBefore(field, body.firstChild);

      var grain = document.createElement("div");
      grain.className = "bg-grain";
      grain.setAttribute("aria-hidden", "true");
      body.insertBefore(grain, field.nextSibling);
    }

    /* 3. コミュニティ誘導バナー */
    var closed = false;
    try { closed = localStorage.getItem(BANNER_KEY) === "1"; } catch (e) {}
    if (!closed && !document.querySelector(".yb-banner")) {
      var banner = document.createElement("div");
      banner.className = "yb-banner";
      banner.setAttribute("role", "complementary");
      banner.innerHTML =
        '<span>🔥 YORON BBQ コミュニティ — 月1回、一緒に焼こう。</span>' +
        '<a href="' + JOIN + '">入会はこちら →</a>' +
        '<button type="button" class="yb-banner-close" aria-label="バナーを閉じる">×</button>';
      body.insertBefore(banner, body.firstChild);
      body.classList.add("yb-banner-on");
      banner.querySelector(".yb-banner-close").addEventListener("click", function () {
        banner.remove();
        body.classList.remove("yb-banner-on");
        try { localStorage.setItem(BANNER_KEY, "1"); } catch (e) {}
      });
    }

    /* 4. フッター直前のコミュニティ導線 */
    var footer = document.querySelector("footer.footer") || document.querySelector("footer");
    if (footer && !document.querySelector(".yb-comm")) {
      var sec = document.createElement("section");
      sec.className = "yb-comm";
      sec.innerHTML =
        '<div class="yb-comm-inner">' +
          '<p class="yb-comm-eyebrow">YORON BBQ COMMUNITY</p>' +
          '<h2>YORON BBQのなかまたち</h2>' +
          '<p class="yb-comm-lead">読むだけで終わらせない。月に1回、火を囲んで、' +
            'トータル3〜4時間で完結するBBQを一緒にやっている場がある。' +
            '道具と味を突き詰めるのも、ただ食べにくるのも、どちらも歓迎。</p>' +
          '<div class="yb-comm-cast">' +
            '<div data-anchan="wave" data-who="an" data-size="s" ' +
              'data-say="コラムを読んだら、次は一緒に焼こう。"></div>' +
            '<div data-anchan="tongs" data-who="yama" data-size="s" ' +
              'data-say="火起こしから片づけまで、段取りはこっちで組んである。"></div>' +
            '<div data-anchan="point" data-who="ueta" data-size="s" ' +
              'data-say="スパイスの使い方は、その場で聞くのがいちばん早い。"></div>' +
          '</div>' +
          '<div class="yb-comm-actions">' +
            '<a class="yb-cta-primary" href="' + COMMUNITY + '">コミュニティサイトへ</a>' +
            '<a class="yb-cta-outline" href="' + EVENT + '">月1BBQに申し込む</a>' +
          '</div>' +
          '<p class="yb-comm-note">yoron-bbq.com へ移動します</p>' +
        '</div>';
      footer.parentNode.insertBefore(sec, footer);
    }

    /* 5. anchan.js（DOM 注入後にロード＝キャラを確実に描画させる） */
    if (document.querySelector("[data-anchan]") &&
        !document.querySelector('script[src*="anchan.js"]')) {
      var s = document.createElement("script");
      s.src = asset("anchan.js?v=20260730");
      document.body.appendChild(s);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", build);
  } else {
    build();
  }
})();
