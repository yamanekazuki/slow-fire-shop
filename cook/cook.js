/* =====================================================
   SLOW FIRE — みんなのBBQ記録 (COOK community feed)
   Dual-mode storage:
     • FIREBASE_READY  → Firestore (`cooks`) + Storage (real multi-user SNS)
     • fallback        → localStorage (personal log + demo, single device)
   The same render/compose code drives both via the Store abstraction.
   ===================================================== */
(function () {
  'use strict';

  // ---------- constants ----------
  const TAGS = ['牛', '豚', '鶏', 'ラム', '魚介', '野菜', 'スモーク', 'ロースト', '直火', '低温長時間', '燻製', 'デザート', '初挑戦', '自信作'];
  const MAX_PHOTOS = 8;
  const MAX_EDGE = 1600;       // px — longest edge after compression
  const JPEG_Q = 0.82;
  const LS_POSTS = 'sf_cook_posts';
  const LS_NICK = 'sf_cook_nick';
  const LS_UID = 'sf_cook_uid';
  const LS_REACTED = 'sf_cook_reacted';

  // ---------- tiny helpers ----------
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { console.warn('localStorage full', e); } };
  const uid = () => 'u' + Math.abs(hash(navigator.userAgent + screen.width + (lsGet(LS_NICK, '') || ''))).toString(36) + (lsGet(LS_UID, '') || '');
  function hash(str) { let h = 0; for (let i = 0; i < str.length; i++) { h = (h << 5) - h + str.charCodeAt(i); h |= 0; } return h; }
  function newId() { return Date.now().toString(36) + Math.abs(hash(navigator.userAgent + performance.now())).toString(36).slice(0, 5); }
  function fmtDate(d) {
    if (!d) return '';
    const dt = (typeof d === 'number') ? new Date(d) : new Date(d);
    if (isNaN(dt)) return '';
    return `${dt.getFullYear()}.${String(dt.getMonth() + 1).padStart(2, '0')}.${String(dt.getDate()).padStart(2, '0')}`;
  }
  function monthKey(d) { const dt = new Date(d); return `${dt.getFullYear()}年${dt.getMonth() + 1}月`; }
  function todayISO() { const dt = new Date(); return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`; }

  const FB = !!window.FIREBASE_READY;

  // ---------- Identity ----------
  const Identity = {
    uid: null, name: null,
    async ensureLocalId() {
      let id = lsGet(LS_UID, null);
      if (!id) { id = newId(); lsSet(LS_UID, id); }
      return id;
    },
    get name_() { return lsGet(LS_NICK, null); },
    async init() {
      this.name = lsGet(LS_NICK, null);
      if (FB && window.sfAuth) {
        await new Promise((res) => {
          let done = false;
          window.sfAuth.onAuthStateChanged(async (user) => {
            if (user) { this.uid = user.uid; }
            if (!done) { done = true; res(); }
          });
          setTimeout(res, 1500);
        });
      }
      if (!this.uid) this.uid = await this.ensureLocalId();
    },
    isReady() { return !!this.name; },
    async signInIfNeeded() {
      // Firebase: anonymous auth so posts are attributable & rules pass.
      if (FB && window.sfAuth && !window.sfAuth.currentUser) {
        try { const cred = await window.sfAuth.signInAnonymously(); this.uid = cred.user.uid; }
        catch (e) { console.warn('anon sign-in failed, using local id', e); }
      }
    },
    setName(n) { this.name = n; lsSet(LS_NICK, n); }
  };

  // ---------- Store abstraction ----------
  const Store = {
    async list() {
      if (FB && window.db) {
        const snap = await window.db.collection('cooks').orderBy('createdAt', 'desc').limit(200).get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
      }
      return lsGet(LS_POSTS, []).sort((a, b) => b.createdAt - a.createdAt);
    },
    async add(post) {
      if (FB && window.db) {
        const ref = window.db.collection('cooks').doc(post.id);
        await ref.set(post);
        return post;
      }
      const all = lsGet(LS_POSTS, []);
      all.push(post);
      lsSet(LS_POSTS, all);
      return post;
    },
    async remove(id) {
      if (FB && window.db) { await window.db.collection('cooks').doc(id).delete(); return; }
      lsSet(LS_POSTS, lsGet(LS_POSTS, []).filter(p => p.id !== id));
    },
    async react(id, delta) {
      if (FB && window.db) {
        await window.db.collection('cooks').doc(id).update({
          reactionCount: firebase.firestore.FieldValue.increment(delta)
        });
        return;
      }
      const all = lsGet(LS_POSTS, []);
      const p = all.find(x => x.id === id);
      if (p) { p.reactionCount = Math.max(0, (p.reactionCount || 0) + delta); lsSet(LS_POSTS, all); }
    },
    // Upload an array of {blob, dataUrl} → returns array of url strings.
    async uploadPhotos(postId, photos, onProgress) {
      if (FB && window.sfStorage) {
        const urls = [];
        for (let i = 0; i < photos.length; i++) {
          const ref = window.sfStorage.ref(`cooks/${Identity.uid}/${postId}/${i}.jpg`);
          await ref.put(photos[i].blob, { contentType: 'image/jpeg' });
          urls.push(await ref.getDownloadURL());
          onProgress && onProgress(i + 1, photos.length);
        }
        return urls;
      }
      // local mode: store the (already compressed) dataURLs directly
      return photos.map(p => p.dataUrl);
    }
  };

  // ---------- Image compression ----------
  function compressImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        let { width: w, height: h } = img;
        if (w > h && w > MAX_EDGE) { h = Math.round(h * MAX_EDGE / w); w = MAX_EDGE; }
        else if (h >= w && h > MAX_EDGE) { w = Math.round(w * MAX_EDGE / h); h = MAX_EDGE; }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', JPEG_Q);
        canvas.toBlob(blob => resolve({ blob: blob || dataURLtoBlob(dataUrl), dataUrl }), 'image/jpeg', JPEG_Q);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('画像を読み込めませんでした')); };
      img.src = url;
    });
  }
  function dataURLtoBlob(dataUrl) {
    const [head, b64] = dataUrl.split(','); const mime = head.match(/:(.*?);/)[1];
    const bin = atob(b64); const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }

  // =====================================================
  // STATE
  // =====================================================
  let posts = [];
  let activeTab = 'all';
  let activeTag = null;
  let draftPhotos = [];   // [{blob, dataUrl}]
  let draftTags = [];
  let reacted = new Set(lsGet(LS_REACTED, []));

  // =====================================================
  // RENDER
  // =====================================================
  function visiblePosts() {
    let list = posts.slice();
    if (activeTab === 'mine') list = list.filter(p => p.uid === Identity.uid);
    if (activeTag) list = list.filter(p => (p.tags || []).includes(activeTag));
    return list;
  }

  function renderFeed() {
    const feed = $('#feed');
    const empty = $('#emptyState');
    const list = visiblePosts();

    // mine: stats + month grouping
    const mineHead = $('#mineHead');
    if (activeTab === 'mine') {
      mineHead.hidden = false;
      renderMineStats();
    } else {
      mineHead.hidden = true;
    }

    if (!list.length) {
      feed.innerHTML = '';
      empty.hidden = false;
      empty.innerHTML = activeTab === 'mine'
        ? `<strong>まだ記録がありません</strong>焼いた料理を投稿して、自分のBBQ歴を残しましょう。<br><br><button class="btn-fire" onclick="window.__cookOpenComposer()">＋ 最初の一皿を投稿</button>`
        : `<strong>まだ投稿がありません</strong>いちばん最初の投稿者になりましょう。<br><br><button class="btn-fire" onclick="window.__cookOpenComposer()">＋ 投稿する</button>`;
      return;
    }
    empty.hidden = true;

    let html = '';
    let lastMonth = null;
    list.forEach(p => {
      if (activeTab === 'mine') {
        const mk = monthKey(p.cookedAt || p.createdAt);
        if (mk !== lastMonth) { html += `<div class="cook-month">${esc(mk)}</div>`; lastMonth = mk; }
      }
      html += cardHTML(p);
    });
    feed.innerHTML = html;

    $$('.cook-card', feed).forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.cook-react')) return;
        openDetail(card.dataset.id);
      });
    });
    $$('.cook-react', feed).forEach(btn => {
      btn.addEventListener('click', (e) => { e.stopPropagation(); toggleReact(btn.dataset.id); });
    });
  }

  function cardHTML(p) {
    const photos = p.photos || [];
    const cover = photos[0];
    const media = cover
      ? `<div class="cook-card-media"><img src="${esc(cover)}" alt="${esc(p.dishName)}" loading="lazy">${photos.length > 1 ? `<span class="cook-photo-count">📷 ${photos.length}</span>` : ''}</div>`
      : `<div class="cook-card-media no-img">🍖</div>`;
    const tags = (p.tags || []).slice(0, 3).map(t => `<span class="cook-tag-mini">${esc(t)}</span>`).join('');
    const on = reacted.has(p.id);
    return `
      <article class="cook-card" data-id="${esc(p.id)}">
        ${media}
        <div class="cook-card-body">
          <h3 class="cook-card-dish">${esc(p.dishName)}</h3>
          <div class="cook-card-meta">
            <span class="cook-card-author">${esc(p.authorName || '名無し')}</span>
            <span>·</span>
            <span>${esc(fmtDate(p.cookedAt || p.createdAt))}</span>
          </div>
          ${tags ? `<div class="cook-card-tags">${tags}</div>` : ''}
          <div class="cook-card-foot">
            <button class="cook-react ${on ? 'is-on' : ''}" data-id="${esc(p.id)}" aria-label="焼けた!">
              🔥 <span>${p.reactionCount || 0}</span>
            </button>
          </div>
        </div>
      </article>`;
  }

  function renderMineStats() {
    const mine = posts.filter(p => p.uid === Identity.uid);
    const total = mine.length;
    const dishes = new Set(mine.map(p => p.dishName)).size;
    let lastDays = '—';
    if (mine.length) {
      const latest = Math.max(...mine.map(p => new Date(p.cookedAt || p.createdAt).getTime()));
      lastDays = Math.floor((Date.now() - latest) / 86400000);
    }
    $('#mineStats').innerHTML = `
      <div class="cook-mstat"><div class="cook-mstat-num">${total}</div><div class="cook-mstat-label">投稿した記録</div></div>
      <div class="cook-mstat"><div class="cook-mstat-num">${dishes}</div><div class="cook-mstat-label">作った料理の種類</div></div>
      <div class="cook-mstat"><div class="cook-mstat-num">${lastDays}</div><div class="cook-mstat-label">最後のBBQから(日)</div></div>`;
  }

  // ---------- tag filters ----------
  function renderFilters() {
    const used = new Set();
    posts.forEach(p => (p.tags || []).forEach(t => used.add(t)));
    const el = $('#tagFilters');
    const chips = ['すべて', ...TAGS.filter(t => used.has(t))];
    el.innerHTML = chips.map(t => {
      const val = t === 'すべて' ? null : t;
      const on = activeTag === val || (val === null && activeTag === null);
      return `<button class="cook-chip ${on ? 'is-active' : ''}" data-tag="${val == null ? '' : esc(val)}">${esc(t)}</button>`;
    }).join('');
    $$('.cook-chip', el).forEach(c => c.addEventListener('click', () => {
      activeTag = c.dataset.tag || null;
      renderFilters(); renderFeed();
    }));
  }

  // =====================================================
  // REACTIONS
  // =====================================================
  async function toggleReact(id) {
    const p = posts.find(x => x.id === id);
    if (!p) return;
    const on = reacted.has(id);
    if (on) { reacted.delete(id); p.reactionCount = Math.max(0, (p.reactionCount || 0) - 1); await Store.react(id, -1); }
    else { reacted.add(id); p.reactionCount = (p.reactionCount || 0) + 1; await Store.react(id, +1); }
    lsSet(LS_REACTED, Array.from(reacted));
    renderFeed();
    if (!$('#detail').hidden && $('#detail').dataset.id === id) openDetail(id);
  }

  // =====================================================
  // DETAIL
  // =====================================================
  function openDetail(id) {
    const p = posts.find(x => x.id === id);
    if (!p) return;
    const photos = p.photos || [];
    const gClass = photos.length <= 1 ? 'g-1' : photos.length === 2 ? 'g-2' : 'g-many';
    const gallery = photos.length
      ? `<div class="cook-d-gallery ${gClass}">${photos.map(u => `<img src="${esc(u)}" alt="${esc(p.dishName)}" loading="lazy">`).join('')}</div>`
      : '';
    const specs = [];
    if (p.gear) specs.push(`<div class="cook-d-spec"><b>グリル/道具</b>${esc(p.gear)}</div>`);
    if (p.tempLabel) specs.push(`<div class="cook-d-spec"><b>温度帯</b>${esc(p.tempLabel)}</div>`);
    const tags = (p.tags || []).map(t => `<span class="cook-tag-mini">${esc(t)}</span>`).join(' ');
    const on = reacted.has(p.id);
    const isMine = p.uid === Identity.uid;

    $('#detailBody').innerHTML = `
      ${gallery}
      <h2 class="cook-d-dish">${esc(p.dishName)}</h2>
      <div class="cook-d-meta">
        <span><b>${esc(p.authorName || '名無し')}</b></span>
        <span>焼いた日：${esc(fmtDate(p.cookedAt || p.createdAt)) || '—'}</span>
      </div>
      ${tags ? `<div class="cook-card-tags" style="margin-bottom:6px;">${tags}</div>` : ''}
      ${specs.length ? `<div class="cook-d-section"><div class="cook-d-specs">${specs.join('')}</div></div>` : ''}
      ${p.method ? `<div class="cook-d-section"><h4>どう作った？</h4><div class="cook-d-method">${esc(p.method)}</div></div>` : ''}
      <div class="cook-d-foot">
        <button class="cook-react ${on ? 'is-on' : ''}" data-id="${esc(p.id)}">🔥 焼けた! <span>${p.reactionCount || 0}</span></button>
        ${isMine ? `<button class="cook-d-del" data-id="${esc(p.id)}">この記録を削除</button>` : ''}
      </div>`;

    $('.cook-react', $('#detailBody')).addEventListener('click', () => toggleReact(p.id));
    const del = $('.cook-d-del', $('#detailBody'));
    if (del) del.addEventListener('click', async () => {
      if (!confirm('この記録を削除しますか？')) return;
      await Store.remove(p.id);
      posts = posts.filter(x => x.id !== p.id);
      closeModal('#detail'); renderFilters(); renderFeed();
    });

    $('#detail').dataset.id = id;
    openModal('#detail');
  }

  // =====================================================
  // COMPOSER
  // =====================================================
  function buildComposer() {
    // tag picker
    $('#tagPick').innerHTML = TAGS.map(t => `<button type="button" class="cook-tagopt" data-tag="${esc(t)}">${esc(t)}</button>`).join('');
    $$('.cook-tagopt').forEach(b => b.addEventListener('click', () => {
      const t = b.dataset.tag;
      if (draftTags.includes(t)) { draftTags = draftTags.filter(x => x !== t); b.classList.remove('is-on'); }
      else { draftTags.push(t); b.classList.add('is-on'); }
    }));
    $('#cookedAt').value = todayISO();

    // dropzone
    const dz = $('#dropzone');
    const input = $('#photoInput');
    dz.addEventListener('click', (e) => { if (!e.target.closest('.cook-thumb-x')) input.click(); });
    input.addEventListener('change', () => handleFiles(input.files));
    ['dragenter', 'dragover'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add('is-drag'); }));
    ['dragleave', 'drop'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove('is-drag'); }));
    dz.addEventListener('drop', e => { if (e.dataTransfer.files) handleFiles(e.dataTransfer.files); });

    $('#postForm').addEventListener('submit', submitPost);
  }

  async function handleFiles(fileList) {
    const files = Array.from(fileList).filter(f => f.type.startsWith('image/'));
    const room = MAX_PHOTOS - draftPhotos.length;
    if (room <= 0) { setMsg(`写真は最大${MAX_PHOTOS}枚までです`, 'err'); return; }
    const take = files.slice(0, room);
    setMsg('画像を処理中…', '');
    for (const f of take) {
      try { draftPhotos.push(await compressImage(f)); } catch (e) { console.warn(e); }
    }
    setMsg('', '');
    renderThumbs();
    $('#photoInput').value = '';
  }

  function renderThumbs() {
    const wrap = $('#thumbs');
    wrap.innerHTML = draftPhotos.map((p, i) => `
      <div class="cook-thumb"><img src="${p.dataUrl}" alt=""><button type="button" class="cook-thumb-x" data-i="${i}">✕</button></div>
    `).join('');
    $('#dropzonePrompt').style.display = draftPhotos.length ? 'none' : '';
    $$('.cook-thumb-x', wrap).forEach(b => b.addEventListener('click', (e) => {
      e.stopPropagation();
      draftPhotos.splice(parseInt(b.dataset.i), 1);
      renderThumbs();
    }));
  }

  function setMsg(msg, cls) { const el = $('#formMsg'); el.textContent = msg; el.className = 'cook-form-msg ' + (cls || ''); }

  async function submitPost(e) {
    e.preventDefault();
    const dishName = $('#dishName').value.trim();
    if (!dishName) { setMsg('料理名を入力してください', 'err'); return; }
    if (!Identity.name) { setMsg('表示名が未設定です', 'err'); requireNickname(); return; }

    const submitBtn = $('#submitBtn');
    submitBtn.disabled = true;

    try {
      await Identity.signInIfNeeded();
      const id = newId();
      setMsg(draftPhotos.length ? `写真をアップロード中… (0/${draftPhotos.length})` : '保存中…', '');
      const photoUrls = await Store.uploadPhotos(id, draftPhotos, (done, total) => setMsg(`写真をアップロード中… (${done}/${total})`, ''));

      const post = {
        id,
        uid: Identity.uid,
        authorName: Identity.name,
        dishName,
        method: $('#method').value.trim(),
        gear: $('#gear').value.trim(),
        tempLabel: $('#tempLabel').value.trim(),
        tags: draftTags.slice(),
        photos: photoUrls,
        cookedAt: $('#cookedAt').value || todayISO(),
        createdAt: Date.now(),
        reactionCount: 0
      };
      await Store.add(post);

      posts.unshift(post);
      resetComposer();
      closeModal('#composer');
      renderFilters(); renderFeed();
      if (typeof gtag === 'function') gtag('event', 'cook_post', { mode: FB ? 'firebase' : 'local' });
    } catch (err) {
      console.error(err);
      setMsg('投稿に失敗しました：' + (err.message || err), 'err');
    } finally {
      submitBtn.disabled = false;
    }
  }

  function resetComposer() {
    $('#postForm').reset();
    draftPhotos = []; draftTags = [];
    renderThumbs();
    $$('.cook-tagopt').forEach(b => b.classList.remove('is-on'));
    $('#cookedAt').value = todayISO();
    setMsg('', '');
  }

  function openComposer() {
    if (!Identity.isReady()) { requireNickname(() => openComposer()); return; }
    $('#dropzonePrompt').style.display = draftPhotos.length ? 'none' : '';
    openModal('#composer');
  }
  window.__cookOpenComposer = openComposer;

  // =====================================================
  // NICKNAME
  // =====================================================
  let nickThen = null;
  function requireNickname(then) {
    nickThen = then || null;
    $('#nickInput').value = Identity.name || '';
    openModal('#nickModal');
    setTimeout(() => $('#nickInput').focus(), 50);
  }

  function renderIdentityChip() {
    const el = $('#identityChip');
    if (Identity.name) {
      el.innerHTML = `投稿者：<strong>${esc(Identity.name)}</strong><a id="changeNick">名前を変更</a>`;
      $('#changeNick').addEventListener('click', () => requireNickname());
    } else {
      el.innerHTML = `<a id="setNick">表示名を設定して参加</a>`;
      $('#setNick').addEventListener('click', () => requireNickname());
    }
  }

  // =====================================================
  // MODAL utils
  // =====================================================
  function openModal(sel) { $(sel).hidden = false; document.body.style.overflow = 'hidden'; }
  function closeModal(sel) { $(sel).hidden = true; document.body.style.overflow = ''; }

  // =====================================================
  // INIT
  // =====================================================
  async function init() {
    // mode banner
    const banner = $('#modeBanner');
    if (!FB) {
      banner.hidden = false;
      banner.innerHTML = 'この端末に保存される<strong>お試し / 個人記録モード</strong>で動作中です（Firebase未設定）。設定するとみんなで共有できるSNSになります。';
    }

    await Identity.init();
    renderIdentityChip();
    buildComposer();

    // tabs
    $$('.cook-tab').forEach(t => t.addEventListener('click', () => {
      $$('.cook-tab').forEach(x => x.classList.remove('is-active'));
      t.classList.add('is-active');
      activeTab = t.dataset.tab;
      if (activeTab === 'mine' && !Identity.isReady()) { requireNickname(); }
      renderFeed();
    }));

    // buttons
    $('#fab').addEventListener('click', openComposer);
    $('#heroPostBtn').addEventListener('click', openComposer);
    $('#composerClose').addEventListener('click', () => closeModal('#composer'));
    $('#composerCancel').addEventListener('click', () => closeModal('#composer'));
    $('#detailClose').addEventListener('click', () => closeModal('#detail'));
    $('#nickSave').addEventListener('click', saveNick);
    $('#nickInput').addEventListener('keydown', e => { if (e.key === 'Enter') saveNick(); });
    // click backdrop to close
    $$('.cook-modal').forEach(m => m.addEventListener('click', e => { if (e.target === m) closeModal('#' + m.id); }));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') $$('.cook-modal').forEach(m => { if (!m.hidden) closeModal('#' + m.id); }); });

    // load feed
    try {
      posts = await Store.list();
    } catch (e) {
      console.error('load failed', e);
      posts = lsGet(LS_POSTS, []);
    }
    $('#loadingState').hidden = true;
    renderFilters();
    renderFeed();
  }

  function saveNick() {
    const v = $('#nickInput').value.trim();
    if (!v) { $('#nickInput').focus(); return; }
    Identity.setName(v);
    renderIdentityChip();
    closeModal('#nickModal');
    if (nickThen) { const fn = nickThen; nickThen = null; fn(); }
    renderFeed();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
