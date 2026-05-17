/* =============================================
   SLOW FIRE Features — 統合ユーザー機能
   - お気に入り (localStorage)
   - 読了マーキング
   - BBQカウンター（最後にBBQから〇日）
   - PWAインストール促進
   - 初回訪問ウェルカム
   - ダークモード
   - シェアボタン
   - 用語ホバー辞典
   ============================================= */
(function () {
  'use strict';

  // ---------- Base path detection ----------
  function basePath() {
    const m = location.pathname.match(/^(.*\/slow-fire-shop\/)/);
    return m ? m[1] : '/';
  }
  const BASE = basePath();

  // ---------- LocalStorage helpers ----------
  const LS = {
    favs: 'sf_favorites',
    read: 'sf_read_articles',
    lastBbq: 'sf_last_bbq_date',
    visits: 'sf_visit_count',
    welcomed: 'sf_welcomed',
    theme: 'sf_theme',
    pwaDismissed: 'sf_pwa_dismissed',
  };
  function lsGet(key, def) { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(def)); } catch { return def; } }
  function lsSet(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }

  // ---------- Visit counter ----------
  const visits = lsGet(LS.visits, 0) + 1;
  lsSet(LS.visits, visits);

  // ---------- Page meta ----------
  const currentUrl = location.pathname;
  const currentTitle = document.title.split('|')[0].trim();

  // ===== Dark mode =====
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    lsSet(LS.theme, theme);
  }
  const savedTheme = lsGet(LS.theme, 'light');
  applyTheme(savedTheme);

  // ===== Favorite button injection =====
  function isArticlePage() {
    return /\/(articles|guide|shopping|bbq-spots|tools)\/[^/]+\.html/.test(currentUrl);
  }

  function injectFavoriteButton() {
    if (!isArticlePage()) return;
    // 既存H1の隣に星ボタンを配置
    const h1 = document.querySelector('h1');
    if (!h1 || h1.closest('.gs-modal')) return;

    const btn = document.createElement('button');
    btn.className = 'sf-fav-btn';
    btn.setAttribute('aria-label', 'お気に入りに追加');
    btn.dataset.url = currentUrl;
    btn.dataset.title = currentTitle;
    updateFavBtn(btn);
    btn.addEventListener('click', () => {
      toggleFavorite(currentUrl, currentTitle);
      updateFavBtn(btn);
    });
    // h1の親の最後に追加（CSSで position absolute or inline）
    h1.parentNode.appendChild(btn);
  }

  function updateFavBtn(btn) {
    const favs = lsGet(LS.favs, []);
    const isFav = favs.some(f => f.url === btn.dataset.url);
    btn.classList.toggle('active', isFav);
    btn.innerHTML = isFav ? '★ お気に入り済' : '☆ お気に入り';
  }

  function toggleFavorite(url, title) {
    let favs = lsGet(LS.favs, []);
    if (favs.some(f => f.url === url)) {
      favs = favs.filter(f => f.url !== url);
    } else {
      favs.unshift({ url, title, date: Date.now() });
      favs = favs.slice(0, 50);
    }
    lsSet(LS.favs, favs);
  }

  // ===== Mark as read (auto when 80% scrolled) =====
  function markReadIfApplicable() {
    if (!isArticlePage()) return;
    let marked = false;
    function checkScroll() {
      if (marked) return;
      const scrolled = window.scrollY + window.innerHeight;
      const total = document.documentElement.scrollHeight;
      if (scrolled / total > 0.8) {
        marked = true;
        let read = lsGet(LS.read, []);
        if (!read.some(r => r.url === currentUrl)) {
          read.unshift({ url: currentUrl, title: currentTitle, date: Date.now() });
          read = read.slice(0, 100);
          lsSet(LS.read, read);
        }
      }
    }
    window.addEventListener('scroll', checkScroll, { passive: true });
  }

  // ===== BBQ Counter (最後にBBQから〇日) =====
  function injectBbqCounter() {
    // すべてのページのフッター直前に表示
    const footer = document.querySelector('footer');
    if (!footer) return;
    if (document.querySelector('.sf-bbq-counter')) return;

    const lastBbq = lsGet(LS.lastBbq, null);
    const counter = document.createElement('div');
    counter.className = 'sf-bbq-counter';

    if (lastBbq) {
      const days = Math.floor((Date.now() - lastBbq) / (1000 * 60 * 60 * 24));
      counter.innerHTML = `
        <div class="sf-bbq-counter-inner">
          <span class="sf-bbq-counter-num">${days}</span>
          <span class="sf-bbq-counter-label">日</span>
          <p class="sf-bbq-counter-text">最後にBBQしてから経過<br>そろそろまた、火を囲みませんか？</p>
          <a href="${BASE}planner/" class="sf-bbq-counter-cta">プランナーで5分計画 →</a>
          <button class="sf-bbq-counter-update" aria-label="BBQ日を更新">今日BBQした</button>
        </div>
      `;
    } else {
      counter.innerHTML = `
        <div class="sf-bbq-counter-inner">
          <p class="sf-bbq-counter-text"><strong>あなたの次のBBQはいつ？</strong><br>このサイトが、思いついた瞬間を計画に変えます。</p>
          <a href="${BASE}planner/" class="sf-bbq-counter-cta">プランナーで5分計画 →</a>
          <button class="sf-bbq-counter-update" aria-label="最後のBBQ日を記録">最後にBBQした日を記録</button>
        </div>
      `;
    }
    footer.parentNode.insertBefore(counter, footer);

    counter.querySelector('.sf-bbq-counter-update')?.addEventListener('click', () => {
      lsSet(LS.lastBbq, Date.now());
      counter.querySelector('.sf-bbq-counter-text').innerHTML = '✓ 記録しました。次回もよろしく。';
      setTimeout(() => location.reload(), 1500);
    });
  }

  // ===== PWA Install Promotion =====
  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (visits >= 3 && !lsGet(LS.pwaDismissed, false)) {
      showPwaBanner();
    }
  });

  function showPwaBanner() {
    if (document.querySelector('.sf-pwa-banner')) return;
    const banner = document.createElement('div');
    banner.className = 'sf-pwa-banner';
    banner.innerHTML = `
      <div class="sf-pwa-icon">📱</div>
      <div class="sf-pwa-body">
        <strong>ホーム画面に追加</strong>
        <p>アプリのように開けて、BBQプランナーに即アクセス</p>
      </div>
      <button class="sf-pwa-install">追加</button>
      <button class="sf-pwa-dismiss" aria-label="閉じる">✕</button>
    `;
    document.body.appendChild(banner);
    banner.querySelector('.sf-pwa-install').addEventListener('click', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      banner.remove();
    });
    banner.querySelector('.sf-pwa-dismiss').addEventListener('click', () => {
      lsSet(LS.pwaDismissed, true);
      banner.remove();
    });
  }

  // ===== Welcome Modal (初回訪問) =====
  function showWelcome() {
    if (visits > 1 || lsGet(LS.welcomed, false)) return;
    const m = document.createElement('div');
    m.className = 'sf-welcome';
    m.innerHTML = `
      <div class="sf-welcome-backdrop"></div>
      <div class="sf-welcome-card">
        <button class="sf-welcome-close" aria-label="閉じる">✕</button>
        <p class="sf-welcome-mark">WELCOME · TO · SLOW FIRE</p>
        <h2 class="sf-welcome-title">あなたのBBQ歴は？</h2>
        <p class="sf-welcome-desc">最適な記事を最初にお見せします。3秒で選んでください。</p>
        <div class="sf-welcome-options">
          <button class="sf-welcome-opt" data-level="beginner">
            <div class="sf-welcome-opt-icon">🌱</div>
            <strong>はじめて</strong>
            <span>河原で薄切り肉を焼くくらい</span>
          </button>
          <button class="sf-welcome-opt" data-level="intermediate">
            <div class="sf-welcome-opt-icon">🔥</div>
            <strong>たまにする</strong>
            <span>BBQセットを持っている</span>
          </button>
          <button class="sf-welcome-opt" data-level="advanced">
            <div class="sf-welcome-opt-icon">🔥🔥</div>
            <strong>本格派</strong>
            <span>Weberなど蓋付きを使う</span>
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(m);

    const RECOMMEND = {
      beginner: BASE + 'journal/articles/from-yakiniku.html',
      intermediate: BASE + 'journal/articles/low-and-slow.html',
      advanced: BASE + 'journal/articles/brisket-temperature.html',
    };

    m.querySelectorAll('.sf-welcome-opt').forEach(b => {
      b.addEventListener('click', () => {
        const level = b.dataset.level;
        lsSet(LS.welcomed, true);
        lsSet('sf_level', level);
        location.href = RECOMMEND[level];
      });
    });
    m.querySelector('.sf-welcome-close').addEventListener('click', () => {
      lsSet(LS.welcomed, true);
      m.remove();
    });
    m.querySelector('.sf-welcome-backdrop').addEventListener('click', () => {
      lsSet(LS.welcomed, true);
      m.remove();
    });
  }

  // ===== Share buttons =====
  function injectShareButtons() {
    if (!isArticlePage()) return;
    // 記事末尾のfooter or .jr-back の前に挿入
    const back = document.querySelector('.jr-back, .sp-back');
    if (!back) return;
    if (document.querySelector('.sf-share')) return;

    const url = encodeURIComponent(location.href);
    const title = encodeURIComponent(currentTitle);
    const text = encodeURIComponent(`${currentTitle}\n${location.href}`);

    const shareEl = document.createElement('section');
    shareEl.className = 'sf-share';
    shareEl.innerHTML = `
      <p class="sf-share-title">この記事を仲間と共有</p>
      <div class="sf-share-btns">
        <a href="https://twitter.com/intent/tweet?text=${title}&url=${url}" target="_blank" rel="noopener" class="sf-share-btn sf-share-x" aria-label="Xで共有">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
        </a>
        <a href="https://line.me/R/msg/text/?${text}" target="_blank" rel="noopener" class="sf-share-btn sf-share-line" aria-label="LINEで共有">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M24 10.304c0-5.369-5.383-9.738-12-9.738S0 4.935 0 10.304c0 4.814 4.269 8.846 10.036 9.608.391.084.923.258 1.058.592.121.303.079.778.039 1.085 0 0-.141.847-.171 1.027-.052.303-.241 1.186 1.039.647 1.281-.54 6.911-4.069 9.428-6.967 1.739-1.907 2.572-3.843 2.572-5.992z"/></svg>
        </a>
        <a href="https://www.facebook.com/sharer/sharer.php?u=${url}" target="_blank" rel="noopener" class="sf-share-btn sf-share-fb" aria-label="Facebookで共有">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z"/></svg>
        </a>
        <a href="https://pinterest.com/pin/create/button/?url=${url}&description=${title}" target="_blank" rel="noopener" class="sf-share-btn sf-share-pin" aria-label="Pinterestで共有">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.097.118.112.221.085.343-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.402.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24.009 12.017 24c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641.001 12.017.001z"/></svg>
        </a>
        <button class="sf-share-btn sf-share-copy" data-url="${decodeURIComponent(url)}" aria-label="URLをコピー">
          🔗 URLコピー
        </button>
      </div>
    `;
    back.parentNode.insertBefore(shareEl, back);

    shareEl.querySelector('.sf-share-copy').addEventListener('click', (e) => {
      navigator.clipboard.writeText(e.currentTarget.dataset.url).then(() => {
        e.currentTarget.textContent = '✓ コピー済';
        setTimeout(() => e.currentTarget.innerHTML = '🔗 URLコピー', 2000);
      });
    });
  }

  // ===== Dark mode toggle button injection =====
  function injectThemeToggle() {
    const navRight = document.querySelector('.nav-right');
    if (!navRight) return;
    if (navRight.querySelector('.sf-theme-toggle')) return;
    const btn = document.createElement('button');
    btn.className = 'sf-theme-toggle';
    btn.setAttribute('aria-label', 'ダークモード切替');
    btn.setAttribute('title', 'ダークモード切替');
    btn.innerHTML = savedTheme === 'dark'
      ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>'
      : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
    // 検索アイコンの後・カートアイコンの前に
    const cartBtn = navRight.querySelector('#cartBtn, .cart-icon-btn');
    if (cartBtn) navRight.insertBefore(btn, cartBtn);
    else navRight.insertBefore(btn, navRight.firstChild);

    btn.addEventListener('click', () => {
      const cur = document.documentElement.getAttribute('data-theme') || 'light';
      const next = cur === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      location.reload(); // 簡易リフレッシュ
    });
  }

  // ===== Reading progress bar =====
  function injectReadingProgress() {
    if (!isArticlePage()) return;
    const bar = document.createElement('div');
    bar.className = 'sf-progress';
    bar.innerHTML = '<div class="sf-progress-fill"></div>';
    document.body.appendChild(bar);
    const fill = bar.querySelector('.sf-progress-fill');
    function update() {
      const top = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const pct = max > 0 ? (top / max) * 100 : 0;
      fill.style.width = pct + '%';
    }
    window.addEventListener('scroll', update, { passive: true });
    update();
  }

  // ===== Back to top button =====
  function injectBackToTop() {
    const btn = document.createElement('button');
    btn.className = 'sf-totop';
    btn.setAttribute('aria-label', 'トップへ戻る');
    btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>';
    document.body.appendChild(btn);
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    window.addEventListener('scroll', () => {
      btn.classList.toggle('show', window.scrollY > 600);
    }, { passive: true });
  }

  // ===== Keyboard shortcuts =====
  function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)) return;
      const meta = e.metaKey || e.ctrlKey;
      // f: favorite current page
      if (e.key === 'f' && !meta && isArticlePage()) {
        e.preventDefault();
        toggleFavorite(currentUrl, currentTitle);
        const btn = document.querySelector('.sf-fav-btn');
        if (btn) updateFavBtn(btn);
      }
      // j: next article via related
      else if (e.key === 'j' && !meta && isArticlePage()) {
        const next = document.querySelector('.jr-related a, .bs-card');
        if (next) next.click();
      }
      // ?: show shortcuts help
      else if (e.key === '?' && !meta) {
        e.preventDefault();
        showShortcutsHelp();
      }
      // g h: go home
      else if (e.key === 'h' && !meta && window._sfPrevKey === 'g') {
        location.href = BASE;
      }
      window._sfPrevKey = e.key;
    });
  }

  function showShortcutsHelp() {
    if (document.querySelector('.sf-help')) {
      document.querySelector('.sf-help').remove();
      return;
    }
    const m = document.createElement('div');
    m.className = 'sf-help';
    m.innerHTML = `
      <div class="sf-help-card">
        <button class="sf-help-close">✕</button>
        <h3>キーボードショートカット</h3>
        <table class="sf-help-table">
          <tr><td><kbd>⌘K</kbd> / <kbd>/</kbd></td><td>検索を開く</td></tr>
          <tr><td><kbd>F</kbd></td><td>この記事をお気に入り</td></tr>
          <tr><td><kbd>J</kbd></td><td>次の記事へ</td></tr>
          <tr><td><kbd>G</kbd> → <kbd>H</kbd></td><td>トップへ戻る</td></tr>
          <tr><td><kbd>?</kbd></td><td>このヘルプを開く / 閉じる</td></tr>
          <tr><td><kbd>Esc</kbd></td><td>モーダルを閉じる</td></tr>
        </table>
      </div>
    `;
    document.body.appendChild(m);
    m.querySelector('.sf-help-close').addEventListener('click', () => m.remove());
    m.addEventListener('click', (e) => { if (e.target === m) m.remove(); });
  }

  // ===== TOC scrollspy (right-side sticky) =====
  function setupTocScrollspy() {
    const toc = document.querySelector('.jr-toc');
    if (!toc) return;
    const links = toc.querySelectorAll('a[href^="#"]');
    const headings = Array.from(links).map(a => document.getElementById(a.getAttribute('href').slice(1))).filter(Boolean);
    if (!headings.length) return;
    function update() {
      const top = window.scrollY + 100;
      let active = null;
      for (const h of headings) {
        if (h.offsetTop <= top) active = h;
      }
      links.forEach(a => {
        const id = a.getAttribute('href').slice(1);
        a.classList.toggle('sf-toc-active', active && active.id === id);
      });
    }
    window.addEventListener('scroll', update, { passive: true });
    update();
  }

  // ===== Service worker registration =====
  function registerSw() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register(BASE + 'sw.js').catch(() => {});
    }
  }

  // ===== Skip to content (アクセシビリティ) =====
  function injectSkipLink() {
    if (document.querySelector('.sf-skip')) return;
    const a = document.createElement('a');
    a.className = 'sf-skip';
    a.href = '#main';
    a.textContent = 'メインコンテンツへスキップ';
    document.body.insertBefore(a, document.body.firstChild);
    // main要素がなければmain追加用のid付与
    const main = document.querySelector('main, article');
    if (main && !main.id) main.id = 'main';
  }

  // ===== ナビバーの現在ページ自動ハイライト =====
  function highlightCurrentNav() {
    const links = document.querySelectorAll('.nav-links a');
    const path = location.pathname;
    links.forEach(a => {
      const href = a.getAttribute('href');
      if (!href || href.startsWith('#')) return;
      // 相対URLを絶対パスに正規化
      try {
        const abs = new URL(href, location.href).pathname;
        if (abs === path || (abs !== '/' && path.startsWith(abs.replace(/index\.html$/, '')))) {
          a.classList.add('sf-nav-active');
        }
      } catch {}
    });
  }

  // ===== Init =====
  function init() {
    injectSkipLink();
    highlightCurrentNav();
    injectThemeToggle();
    injectFavoriteButton();
    markReadIfApplicable();
    injectBbqCounter();
    injectShareButtons();
    injectReadingProgress();
    injectBackToTop();
    setupKeyboardShortcuts();
    setupTocScrollspy();
    registerSw();
    if (visits === 1) {
      setTimeout(showWelcome, 1200);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
