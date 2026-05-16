/* =============================================
   GLOBAL SEARCH — SLOW FIRE SHOP
   Modal search accessible from any page via Cmd+K / Ctrl+K
   ============================================= */

(function () {
  'use strict';

  // ---------- Base path detection ----------
  function basePath() {
    const path = location.pathname;
    // Match GitHub Pages base: /slow-fire-shop/
    const m = path.match(/^(.*\/slow-fire-shop\/)/);
    if (m) return m[1];
    // Match relative: count depth from / to last /
    const depth = (path.match(/\//g) || []).length - 1;
    return '../'.repeat(Math.max(0, depth)) || '/';
  }
  const BASE = basePath();

  // ---------- Fuse.js loader ----------
  function loadFuse() {
    return new Promise((resolve) => {
      if (window.Fuse) return resolve(window.Fuse);
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/fuse.js@7.0.0/dist/fuse.min.js';
      s.onload = () => resolve(window.Fuse);
      s.onerror = () => resolve(null);
      document.head.appendChild(s);
    });
  }

  // ---------- Search index loader ----------
  let indexData = null;
  let fuseInstance = null;
  async function loadIndex() {
    if (indexData) return indexData;
    try {
      const r = await fetch(`${BASE}search-index.json`);
      indexData = await r.json();
    } catch (e) {
      console.warn('[global-search] index load failed', e);
      indexData = [];
    }
    return indexData;
  }
  async function getFuse() {
    if (fuseInstance) return fuseInstance;
    const Fuse = await loadFuse();
    const data = await loadIndex();
    if (!Fuse) return null;
    fuseInstance = new Fuse(data, {
      keys: [
        { name: 'h1', weight: 3 },
        { name: 'title', weight: 2 },
        { name: 'desc', weight: 1.5 },
        { name: 'keywords', weight: 2 },
      ],
      threshold: 0.4,
      ignoreLocation: true,
      minMatchCharLength: 2,
      includeMatches: true,
    });
    return fuseInstance;
  }

  // ---------- Helpers ----------
  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function highlight(text, matches, key) {
    if (!matches) return escapeHtml(text);
    const m = matches.find((x) => x.key === key);
    if (!m || !m.indices) return escapeHtml(text);
    let result = '';
    let last = 0;
    m.indices.forEach(([s, e]) => {
      result += escapeHtml(text.slice(last, s));
      result += `<span class="gs-hi">${escapeHtml(text.slice(s, e + 1))}</span>`;
      last = e + 1;
    });
    result += escapeHtml(text.slice(last));
    return result;
  }
  function resolveUrl(item) {
    // item.url is like 'journal/articles/foo.html' or '../tools/foo.html'
    // Normalize to absolute from BASE
    let u = item.url || '';
    u = u.replace(/^\.\.\//, '');
    return BASE + u;
  }

  // ---------- Search history (localStorage) ----------
  const HISTORY_KEY = 'sf_search_history';
  function getHistory() {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; }
  }
  function saveHistory(q) {
    if (!q || q.length < 2) return;
    const cur = getHistory().filter((x) => x !== q);
    cur.unshift(q);
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(cur.slice(0, 5))); } catch {}
  }

  // ---------- Modal UI ----------
  let modalEl = null;
  let inputEl = null;
  let resultsEl = null;
  let tabsEl = null;
  let activeCategory = 'all';
  let activeIndex = -1;
  let lastHits = [];

  const POPULAR_QUERIES = [
    'ブリスケット', 'プルドポーク', 'リバースシア', 'テキサスクラッチ',
    'BBQ ラブ', '4人 BBQ', '武蔵野公園', '中心温度',
  ];

  const CATEGORIES = [
    { key: 'all', label: 'すべて' },
    { key: '記事', label: '記事' },
    { key: '肉×調理法ガイド', label: 'ガイド' },
    { key: '食材リスト', label: '食材リスト' },
    { key: 'BBQ場', label: 'BBQ場' },
    { key: 'ツール', label: 'ツール' },
  ];

  function ensureModal() {
    if (modalEl) return modalEl;
    const m = document.createElement('div');
    m.className = 'gs-modal';
    m.setAttribute('role', 'dialog');
    m.setAttribute('aria-modal', 'true');
    m.setAttribute('aria-label', 'SLOW FIRE 全コンテンツ検索');
    m.innerHTML = `
      <div class="gs-backdrop" data-close></div>
      <div class="gs-panel">
        <div class="gs-input-wrap">
          <svg class="gs-input-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <input type="text" class="gs-input" id="gsInput" placeholder="何を探していますか？例: ブリスケット 中心温度 / 武蔵野公園" autocomplete="off" autocapitalize="off" spellcheck="false">
          <button class="gs-close-btn" data-close>esc</button>
        </div>
        <div class="gs-tabs" id="gsTabs"></div>
        <div class="gs-body" id="gsBody"></div>
        <div class="gs-footer">
          <span class="gs-kbd"><kbd>↑</kbd><kbd>↓</kbd> 移動</span>
          <span class="gs-kbd"><kbd>↵</kbd> 開く</span>
          <span class="gs-kbd"><kbd>esc</kbd> 閉じる</span>
        </div>
      </div>
    `;
    document.body.appendChild(m);
    modalEl = m;
    inputEl = m.querySelector('#gsInput');
    resultsEl = m.querySelector('#gsBody');
    tabsEl = m.querySelector('#gsTabs');

    // Close handlers
    m.querySelectorAll('[data-close]').forEach((e) => e.addEventListener('click', closeModal));

    inputEl.addEventListener('input', onInput);
    inputEl.addEventListener('keydown', onKeydown);
    document.addEventListener('keydown', onGlobalKeydown);

    return m;
  }

  function renderTabs() {
    if (!indexData) return;
    const counts = { all: indexData.length };
    indexData.forEach((it) => { counts[it.category] = (counts[it.category] || 0) + 1; });
    tabsEl.innerHTML = CATEGORIES
      .filter((c) => c.key === 'all' || counts[c.key])
      .map((c) => `<button class="gs-tab ${c.key === activeCategory ? 'active' : ''}" data-cat="${escapeHtml(c.key)}">${escapeHtml(c.label)} <span class="gs-tab-count">${counts[c.key] || 0}</span></button>`)
      .join('');
    tabsEl.querySelectorAll('.gs-tab').forEach((t) => {
      t.addEventListener('click', () => {
        activeCategory = t.dataset.cat;
        renderTabs();
        render(inputEl.value);
      });
    });
  }

  function renderInitial() {
    const history = getHistory();
    const sections = [];
    if (history.length) {
      sections.push(`<section class="gs-section">
        <p class="gs-section-title">最近の検索</p>
        <div class="gs-chips">${history.map((q) => `<button class="gs-chip" data-q="${escapeHtml(q)}"><span class="gs-chip-icon">↻</span> ${escapeHtml(q)}</button>`).join('')}</div>
      </section>`);
    }
    sections.push(`<section class="gs-section">
      <p class="gs-section-title">人気のキーワード</p>
      <div class="gs-chips">${POPULAR_QUERIES.map((q) => `<button class="gs-chip" data-q="${escapeHtml(q)}">${escapeHtml(q)}</button>`).join('')}</div>
    </section>`);
    resultsEl.innerHTML = sections.join('');
    resultsEl.querySelectorAll('.gs-chip').forEach((c) => {
      c.addEventListener('click', () => {
        inputEl.value = c.dataset.q;
        inputEl.focus();
        render(c.dataset.q);
      });
    });
  }

  async function render(q) {
    q = (q || '').trim();
    if (!q) { activeIndex = -1; renderInitial(); return; }
    const fuse = await getFuse();
    if (!fuse) {
      resultsEl.innerHTML = '<div class="gs-empty">検索エンジン読み込み失敗</div>';
      return;
    }
    let hits = fuse.search(q).slice(0, 40);
    if (activeCategory !== 'all') {
      hits = hits.filter((h) => h.item.category === activeCategory);
    }
    lastHits = hits;
    activeIndex = hits.length ? 0 : -1;
    if (!hits.length) {
      resultsEl.innerHTML = `<div class="gs-empty"><strong>「${escapeHtml(q)}」に一致するコンテンツが見つかりませんでした</strong>別のキーワードでお試しください。</div>`;
      return;
    }
    resultsEl.innerHTML = `<div class="gs-results">${hits.map((h, i) => `
      <a class="gs-result-item ${i === activeIndex ? 'gs-active' : ''}" data-idx="${i}" href="${escapeHtml(resolveUrl(h.item))}">
        <span class="gs-result-cat" data-cat="${escapeHtml(h.item.category)}">${escapeHtml(h.item.category)}</span>
        <span class="gs-result-body">
          <div class="gs-result-title">${highlight(h.item.h1 || h.item.title, h.matches, 'h1') || highlight(h.item.h1 || h.item.title, h.matches, 'title')}</div>
          <div class="gs-result-desc">${highlight(h.item.desc || '', h.matches, 'desc')}</div>
        </span>
        <span class="gs-result-key">↵</span>
      </a>`).join('')}</div>`;
    resultsEl.querySelectorAll('.gs-result-item').forEach((it) => {
      it.addEventListener('mouseenter', () => {
        activeIndex = parseInt(it.dataset.idx, 10);
        updateActive();
      });
      it.addEventListener('click', () => saveHistory(q));
    });
  }

  function updateActive() {
    if (!resultsEl) return;
    resultsEl.querySelectorAll('.gs-result-item').forEach((it, i) => {
      it.classList.toggle('gs-active', i === activeIndex);
    });
    const active = resultsEl.querySelector('.gs-active');
    if (active) active.scrollIntoView({ block: 'nearest' });
  }

  // ---------- Event handlers ----------
  let debounceTimer = null;
  function onInput(e) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => render(e.target.value), 120);
  }
  function onKeydown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (lastHits.length) { activeIndex = (activeIndex + 1) % lastHits.length; updateActive(); }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (lastHits.length) { activeIndex = (activeIndex - 1 + lastHits.length) % lastHits.length; updateActive(); }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && lastHits[activeIndex]) {
        saveHistory(inputEl.value);
        location.href = resolveUrl(lastHits[activeIndex].item);
      }
    } else if (e.key === 'Escape') {
      closeModal();
    }
  }
  function onGlobalKeydown(e) {
    const isOpen = modalEl && modalEl.classList.contains('open');
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      isOpen ? closeModal() : openModal();
    } else if (e.key === '/' && !isOpen && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
      e.preventDefault();
      openModal();
    } else if (e.key === 'Escape' && isOpen) {
      closeModal();
    }
  }

  function openModal() {
    ensureModal();
    modalEl.classList.add('open');
    document.body.style.overflow = 'hidden';
    loadIndex().then(() => { renderTabs(); renderInitial(); });
    setTimeout(() => inputEl?.focus(), 50);
  }
  function closeModal() {
    if (!modalEl) return;
    modalEl.classList.remove('open');
    document.body.style.overflow = '';
  }

  // ---------- Inject trigger button into nav ----------
  function injectTrigger() {
    // Find .nav-right and insert before cart button
    const navRight = document.querySelector('.nav-right');
    if (!navRight) return;
    if (navRight.querySelector('.gs-trigger')) return; // already injected
    const btn = document.createElement('button');
    btn.className = 'gs-trigger';
    btn.setAttribute('aria-label', '検索を開く');
    btn.setAttribute('title', '検索 (⌘K)');
    btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`;
    btn.addEventListener('click', openModal);
    const cartBtn = navRight.querySelector('#cartBtn, .cart-icon-btn');
    if (cartBtn) navRight.insertBefore(btn, cartBtn);
    else navRight.insertBefore(btn, navRight.firstChild);
  }

  // ---------- Init ----------
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectTrigger);
  } else {
    injectTrigger();
  }
})();
