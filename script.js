/* =============================================
   SLOW FIRE SHOP — Scripts v4
   + Firebase Auth + Firestore products + Stripe Checkout
   ============================================= */

// =============================================
// FALLBACK PRODUCTS (used if Firestore is empty / not configured)
// =============================================
const FALLBACK_PRODUCTS = [
  // ---- RUBS & SAUCE ----
  {
    id: 'steak-shooter',
    name: 'Steak Shooter',
    nameja: 'ステーキシューター',
    subtitle: 'Steak & Beef Rub',
    desc: '牛肉のポテンシャルを最大限引き出すスタンダードラブ。バックヤードでも競技大会でも通用する発色と旨みの黄金ブレンド。',
    price: 3800,
    category: 'rub',
    badge: null,
    image: 'https://www.lownslowbasics.com.au/wp-content/uploads/2023/09/STEAK-SHOOTER-1.jpg',
  },
  {
    id: 'steak-shooter-spicy',
    name: 'Steak Shooter SPICY',
    nameja: 'ステーキシューター スパイシー',
    subtitle: 'Spicy Steak & Beef Rub',
    desc: 'ステーキシューターの辛口版。辛さレベル2/5で、刺激を楽しみながらも旨みはそのまま。チキンウィングや豚チョップにも。',
    price: 3800,
    category: 'rub',
    badge: 'SPICY',
    image: 'https://www.lownslowbasics.com.au/wp-content/uploads/2023/09/STEAK-SHOOTER-SPICY.jpg',
  },
  {
    id: 'beef-bounce',
    name: 'Beef Bounce',
    nameja: 'ビーフバウンス',
    subtitle: 'Beef & Brisket Rub',
    desc: 'コーヒーノートとブラックペッパーの深みが特徴。ブリスケットや牛リブのバーク（外皮）を完璧に仕上げる本格派ラブ。',
    price: 3800,
    category: 'rub',
    badge: null,
    image: 'https://www.lownslowbasics.com.au/wp-content/uploads/2023/09/BEEF-BOUNCE.jpg',
  },
  {
    id: 'honey-soy-slammer',
    name: 'Honey Soy Slammer',
    nameja: 'ハニーソイスラマー',
    subtitle: 'Pork & Chicken Rub',
    desc: '蜂蜜と醤油の絶妙なブレンド。ポークリブ、プルドポーク、チキンウィングに最高のグレーズと深みある風味を生む。',
    price: 3800,
    category: 'rub',
    badge: 'BEST SELLER',
    image: 'https://www.lownslowbasics.com.au/wp-content/uploads/2023/09/HONEY-SOY.jpg',
  },
  {
    id: 'lamb-layup',
    name: 'Lamb Layup',
    nameja: 'ラムレイアップ',
    subtitle: 'Lamb & Game Rub',
    desc: 'スマックとハーブのブレンドがラムとジビエを格上げ。カンガルー、アヒル、鴨から鹿まで、ワイルドな食材に。',
    price: 3800,
    category: 'rub',
    badge: null,
    image: 'https://www.lownslowbasics.com.au/wp-content/uploads/2023/09/LAMB-LAYUP.jpg',
  },
  {
    id: 'garlic-goals',
    name: 'Garlic Goals',
    nameja: 'ガーリックゴールズ',
    subtitle: 'All Purpose Rub',
    desc: 'ガーリックとパルメザンチーズの万能ラブ。肉・野菜・ローストポテトまで何でも合う最もフレキシブルなブレンド。',
    price: 3800,
    category: 'rub',
    badge: null,
    image: 'https://www.lownslowbasics.com.au/wp-content/uploads/2023/09/GARLIC-GOALS-1.jpg',
  },
  {
    id: 'chilli-citrus-charge',
    name: 'Chilli Citrus Charge',
    nameja: 'チリシトラスチャージ',
    subtitle: 'Chicken & Pork Rub',
    desc: 'チリの辛さとシトラスの爽やかさが絶妙なコンビ。チキンや豚肉に鮮やかな発色とフレッシュな風味を。',
    price: 3800,
    category: 'rub',
    badge: 'NEW',
    image: 'https://www.lownslowbasics.com.au/wp-content/uploads/2024/11/Chilli-Charge-Colour-600x600.png',
  },
  {
    id: 'hook-shot',
    name: 'Hook Shot',
    nameja: 'フックショット',
    subtitle: 'Signature BBQ Sauce',
    desc: 'Low n Slow Basicsのシグネチャーソース。ラブと組み合わせることでコンペティション級のフレーバーが完成。仕上げがけ・ディップ・グレーズに。',
    price: 4200,
    category: 'rub',
    badge: null,
    image: 'https://www.lownslowbasics.com.au/wp-content/uploads/2023/09/HOOK-SHOT.png',
  },
  // ---- JERKY ----
  {
    id: 'steak-shooter-jerky',
    name: 'Steak Shooter Beef Jerky',
    nameja: 'ステーキシューター ビーフジャーキー',
    subtitle: 'Grass Fed Australian Beef',
    desc: '100%グラスフェッドのオーストラリア牛使用。高タンパク・低脂肪で、BBQの合間にも最高のスナック。',
    price: 2500,
    category: 'jerky',
    badge: null,
    image: 'https://www.lownslowbasics.com.au/wp-content/uploads/2024/08/Steak-Shooter-Beef-Jerky.jpeg',
  },
  {
    id: 'garlic-goals-jerky',
    name: 'Garlic Goals Beef Jerky',
    nameja: 'ガーリックゴールズ ビーフジャーキー',
    subtitle: 'Grass Fed Australian Beef',
    desc: 'ガーリックゴールズの風味をそのままジャーキーに。グラスフェッド牛の旨みとガーリックの芳香が癖になる。',
    price: 2500,
    category: 'jerky',
    badge: null,
    image: 'https://www.lownslowbasics.com.au/wp-content/uploads/2025/03/beef-jerky-garlic-goals.jpg',
  },
  // ---- SETS ----
  {
    id: 'all-star-combo',
    name: 'All-Star Combo',
    nameja: 'オールスターコンボ（7種セット）',
    subtitle: 'BBQ Rub Set — 7種類',
    desc: '全7種のラブが揃う最強セット。あらゆるBBQシーンに対応。ギフトにも最適な箱入りセット。',
    price: 24000,
    originalPrice: 26600,
    category: 'set',
    badge: 'BEST VALUE',
    image: 'https://www.lownslowbasics.com.au/wp-content/uploads/2023/09/Rubs-Bundle-Updated-600x600.png',
  },
  {
    id: 'all-star-hook-shot',
    name: 'All-Star Combo + Hook Shot',
    nameja: 'オールスター ＋ ソースセット（8種）',
    subtitle: 'Rub Set + BBQ Sauce',
    desc: '全7種ラブ＋シグネチャーBBQソースのフルセット。プロ仕様の完全装備。',
    price: 27000,
    originalPrice: 30200,
    category: 'set',
    badge: 'POPULAR',
    image: 'https://www.lownslowbasics.com.au/wp-content/uploads/2024/11/all-star-combo-plus-hookshot-NEW-600x600.jpg',
  },
  {
    id: 'all-star-full',
    name: 'All-Star Full Set',
    nameja: 'オールスター フルセット（10種）',
    subtitle: 'Rubs + Sauce + Jerky',
    desc: '全7種ラブ＋BBQソース＋ジャーキー2種の究極セット。全ラインナップを体験できるプレミアムギフト。',
    price: 32000,
    originalPrice: 35700,
    category: 'set',
    badge: 'PREMIUM',
    image: 'https://www.lownslowbasics.com.au/wp-content/uploads/2024/02/Rubs-Sauce-Bundle-Updated-600x600.png',
  },
];

// Will be populated from Firestore (or falls back)
let PRODUCTS = FALLBACK_PRODUCTS;

const BADGE_CLASS = {
  'BEST SELLER': 'bdg-bestseller',
  'NEW':         'bdg-new',
  'POPULAR':     'bdg-popular',
  'BEST VALUE':  'bdg-value',
  'PREMIUM':     'bdg-premium',
  'SPICY':       'bdg-spicy',
};
const CAT_LABEL = { rub: 'RUB / SAUCE', jerky: 'JERKY', set: 'SET' };

// =============================================
// HERO CAROUSEL
// =============================================
(function () {
  const track  = document.getElementById('carouselTrack');
  const prevBtn = document.getElementById('carouselPrev');
  const nextBtn = document.getElementById('carouselNext');
  const dotsWrap = document.getElementById('carouselDots');
  if (!track) return;

  const slides = track.querySelectorAll('.carousel-slide');
  const total  = slides.length;
  let current  = 0;
  let timer;

  // Build dots
  slides.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.className = 'c-dot' + (i === 0 ? ' active' : '');
    dot.setAttribute('aria-label', `スライド ${i + 1}`);
    dot.addEventListener('click', () => goTo(i));
    dotsWrap.appendChild(dot);
  });

  function goTo(idx) {
    current = (idx + total) % total;
    track.style.transform = `translateX(-${current * 100}%)`;
    dotsWrap.querySelectorAll('.c-dot').forEach((d, i) => {
      d.classList.toggle('active', i === current);
    });
    resetTimer();
  }

  function resetTimer() {
    clearInterval(timer);
    timer = setInterval(() => goTo(current + 1), 4800);
  }

  prevBtn?.addEventListener('click', () => goTo(current - 1));
  nextBtn?.addEventListener('click', () => goTo(current + 1));

  // Touch swipe
  let touchX = 0;
  track.addEventListener('touchstart', e => { touchX = e.touches[0].clientX; }, { passive: true });
  track.addEventListener('touchend', e => {
    const dx = touchX - e.changedTouches[0].clientX;
    if (Math.abs(dx) > 40) goTo(current + (dx > 0 ? 1 : -1));
  });

  resetTimer();
})();

// =============================================
// CART
// =============================================
class Cart {
  constructor() {
    this.items = JSON.parse(localStorage.getItem('sfshop_v3') || '[]');
  }
  save() { localStorage.setItem('sfshop_v3', JSON.stringify(this.items)); }

  add(id) {
    const ex = this.items.find(i => i.id === id);
    if (ex) { ex.qty += 1; }
    else {
      const p = PRODUCTS.find(p => p.id === id);
      this.items.push({ id, name: p.name, nameja: p.nameja, price: p.price, image: p.image, qty: 1 });
    }
    this.save(); this.render(); this.badge();
  }
  remove(id) {
    this.items = this.items.filter(i => i.id !== id);
    this.save(); this.render(); this.badge();
  }
  qty(id, d) {
    const item = this.items.find(i => i.id === id);
    if (!item) return;
    item.qty += d;
    if (item.qty <= 0) { this.remove(id); return; }
    this.save(); this.render(); this.badge();
  }
  total() { return this.items.reduce((s, i) => s + i.price * i.qty, 0); }
  count() { return this.items.reduce((s, i) => s + i.qty, 0); }

  badge() {
    const el = document.getElementById('cartBadge');
    const lbl = document.getElementById('cartCountLabel');
    const n = this.count();
    if (el) { el.textContent = n; el.style.display = n > 0 ? 'flex' : 'none'; }
    if (lbl) lbl.textContent = n > 0 ? `(${n})` : '';
  }

  render() {
    const list = document.getElementById('cartList');
    const tot  = document.getElementById('cartTotal');
    if (!list) return;

    if (!this.items.length) {
      list.innerHTML = '<p class="cart-empty">カートは空です</p>';
    } else {
      list.innerHTML = this.items.map(it => `
        <div class="cart-item">
          <img class="ci-thumb" src="${it.image}" alt="${it.name}" loading="lazy"
               onerror="this.style.opacity='.15'">
          <div>
            <div class="ci-name">${it.name}</div>
            <div class="ci-sub">${it.nameja}</div>
            <div class="ci-price">¥${(it.price * it.qty).toLocaleString()}</div>
            <div class="ci-qty">
              <button class="ci-qbtn" data-id="${it.id}" data-d="-1">−</button>
              <span class="ci-qnum">${it.qty}</span>
              <button class="ci-qbtn" data-id="${it.id}" data-d="1">＋</button>
            </div>
          </div>
          <button class="ci-rm" data-id="${it.id}" aria-label="削除">✕</button>
        </div>
      `).join('');
    }

    if (tot) tot.textContent = `¥${this.total().toLocaleString()}`;

    list.querySelectorAll('.ci-qbtn').forEach(b =>
      b.addEventListener('click', () => cart.qty(b.dataset.id, parseInt(b.dataset.d))));
    list.querySelectorAll('.ci-rm').forEach(b =>
      b.addEventListener('click', () => cart.remove(b.dataset.id)));
  }
}

const cart = new Cart();
cart.render();
cart.badge();

// =============================================
// CART DRAWER
// =============================================
const cartDrawer   = document.getElementById('cartDrawer');
const cartBackdrop = document.getElementById('cartBackdrop');

function openCart()  {
  cartDrawer?.classList.add('open');
  cartBackdrop?.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeCart() {
  cartDrawer?.classList.remove('open');
  cartBackdrop?.classList.remove('open');
  document.body.style.overflow = '';
}

document.getElementById('cartBtn')?.addEventListener('click', openCart);
document.getElementById('cartClose')?.addEventListener('click', closeCart);
cartBackdrop?.addEventListener('click', closeCart);

// =============================================
// CHECKOUT MODAL
// =============================================
const coOverlay = document.getElementById('checkoutOverlay');
const coForm    = document.getElementById('checkoutForm');

function openCheckout() {
  if (!cart.count()) return;
  const sum = document.getElementById('orderSummary');
  const tot = document.getElementById('orderTotalModal');
  if (sum) sum.innerHTML = cart.items.map(i =>
    `<div class="order-row"><span>${i.name} × ${i.qty}</span><span>¥${(i.price*i.qty).toLocaleString()}</span></div>`
  ).join('');
  if (tot) tot.textContent = `¥${cart.total().toLocaleString()}`;
  coOverlay?.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeCheckout() {
  coOverlay?.classList.remove('open');
  document.body.style.overflow = '';
}

document.getElementById('checkoutBtn')?.addEventListener('click', () => {
  closeCart();
  setTimeout(openCheckout, 200);
});
document.getElementById('checkoutClose')?.addEventListener('click', closeCheckout);
coOverlay?.addEventListener('click', e => { if (e.target === coOverlay) closeCheckout(); });

coForm?.addEventListener('submit', async e => {
  e.preventDefault();
  await submitCheckout();
});

// =============================================
// PRODUCT GRID
// =============================================
function renderProducts(filter = 'all') {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;

  const list = filter === 'all' ? PRODUCTS : PRODUCTS.filter(p => p.category === filter);

  grid.innerHTML = list.map(p => {
    const bc = p.badge ? BADGE_CLASS[p.badge] || '' : '';
    const badgeHtml = p.badge ? `<span class="pc-badge ${bc}">${p.badge}</span>` : '';
    const origHtml  = p.originalPrice
      ? `<span class="pc-orig">¥${p.originalPrice.toLocaleString()}</span>` : '';

    return `
      <div class="product-card" role="listitem">
        <div class="pc-photo-wrap">
          <img class="pc-photo" src="${p.image}" alt="${p.name}" loading="lazy"
               onerror="this.closest('.pc-photo-wrap').style.background='var(--gray-200)'">
          <span class="pc-cat">${CAT_LABEL[p.category]}</span>
          ${badgeHtml}
        </div>
        <div class="pc-body">
          <div class="pc-name">${p.name}</div>
          <div class="pc-nameja">${p.nameja}</div>
          <p class="pc-desc">${p.desc}</p>
          <div class="pc-footer">
            <div class="pc-price-wrap">
              ${origHtml}
              <span class="pc-price">¥${p.price.toLocaleString()}</span>
            </div>
            <button class="atc-btn" data-id="${p.id}">＋ カートへ</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  grid.querySelectorAll('.atc-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      cart.add(btn.dataset.id);
      const orig = btn.textContent;
      btn.classList.add('done');
      btn.textContent = '✓ 追加済み';
      setTimeout(() => {
        btn.classList.remove('done');
        btn.textContent = orig;
        openCart();
      }, 900);
    });
  });
}

// Filter tabs
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderProducts(btn.dataset.filter);
  });
});

renderProducts();

// =============================================
// FAQ
// =============================================
document.querySelectorAll('.faq-item').forEach(item => {
  item.querySelector('.faq-q')?.addEventListener('click', () => {
    const open = item.classList.contains('open');
    document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
    if (!open) item.classList.add('open');
  });
});

// =============================================
// NAV
// =============================================
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav?.classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

// Hamburger handled by mobile-nav.js (loaded separately)

// Smooth scroll
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const href = a.getAttribute('href');
    if (href === '#') return;
    e.preventDefault();
    const el = document.querySelector(href);
    if (!el) return;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' });
  });
});

// =============================================
// FIRESTORE — load products dynamically
// =============================================
async function loadProductsFromFirestore() {
  if (!window.FIREBASE_READY || !window.db) return;
  try {
    const snap = await db.collection('products')
      .where('status', '==', 'active')
      .get();
    if (snap.empty) return;
    const fromDb = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    if (fromDb.length) {
      PRODUCTS = fromDb;
      const activeFilter = document.querySelector('.filter-btn.active')?.dataset.filter || 'all';
      renderProducts(activeFilter);
    }
  } catch (err) {
    console.warn('[SLOW FIRE] Firestore products load failed, using fallback:', err.message);
  }
}
loadProductsFromFirestore();

// =============================================
// AUTH — login, signup, Google, password reset
// =============================================
let currentUser = null;
const SIGNED_IN_PROFILES = new Map(); // uid -> {name, address, ...}

const authOverlay = document.getElementById('authOverlay');
const authClose   = document.getElementById('authClose');
const authForm    = document.getElementById('authForm');
const authError   = document.getElementById('authError');
const authSubmit  = document.getElementById('authSubmit');
const googleBtn   = document.getElementById('googleBtn');
const forgotBtn   = document.getElementById('forgotBtn');
const accountBtn  = document.getElementById('accountBtn');
const accountLabel = document.getElementById('accountLabel');
const accountMenu = document.getElementById('accountMenu');
const amName      = document.getElementById('amName');
const amEmail     = document.getElementById('amEmail');
const amOrders    = document.getElementById('amOrders');
const amLogout    = document.getElementById('amLogout');

let authMode = 'login';

function openAuth(mode = 'login') {
  authMode = mode;
  document.querySelectorAll('.auth-tab').forEach(t =>
    t.classList.toggle('active', t.dataset.mode === mode));
  authSubmit.textContent = mode === 'login' ? 'ログイン' : '会員登録する';
  authError.textContent = '';
  document.querySelector('.auth-name-fg').style.display = mode === 'signup' ? '' : 'none';
  if (mode === 'signup') {
    document.getElementById('authPassword').setAttribute('autocomplete', 'new-password');
  } else {
    document.getElementById('authPassword').setAttribute('autocomplete', 'current-password');
  }
  authOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeAuth() {
  authOverlay.classList.remove('open');
  if (!cartDrawer.classList.contains('open') && !coOverlay.classList.contains('open')) {
    document.body.style.overflow = '';
  }
}

document.querySelectorAll('.auth-tab').forEach(t =>
  t.addEventListener('click', () => openAuth(t.dataset.mode)));
authClose?.addEventListener('click', closeAuth);
authOverlay?.addEventListener('click', e => { if (e.target === authOverlay) closeAuth(); });
document.querySelectorAll('[data-open-auth]').forEach(btn =>
  btn.addEventListener('click', () => { closeCheckout(); openAuth(btn.dataset.openAuth); }));

function authErr(code, fallback) {
  const map = {
    'auth/invalid-email':         'メールアドレスの形式が正しくありません',
    'auth/user-not-found':        'このメールアドレスのユーザーが見つかりません',
    'auth/wrong-password':        'パスワードが正しくありません',
    'auth/invalid-credential':    'メールアドレスまたはパスワードが正しくありません',
    'auth/email-already-in-use':  'このメールアドレスは既に登録されています',
    'auth/weak-password':         'パスワードは6文字以上で入力してください',
    'auth/popup-closed-by-user':  'ログインがキャンセルされました',
    'auth/too-many-requests':     'ログイン試行回数が多すぎます。しばらく待ってください',
    'auth/network-request-failed':'ネットワークエラー。接続を確認してください',
  };
  return map[code] || fallback || 'エラーが発生しました';
}

authForm?.addEventListener('submit', async e => {
  e.preventDefault();
  if (!window.FIREBASE_READY) {
    authError.textContent = 'Firebase未設定のためログインできません。サイト管理者にお問い合わせください。';
    return;
  }
  const email = document.getElementById('authEmail').value.trim();
  const pw    = document.getElementById('authPassword').value;
  const name  = document.getElementById('authName').value.trim();
  authError.textContent = '';
  authSubmit.disabled = true;
  const orig = authSubmit.textContent;
  authSubmit.textContent = '処理中...';

  try {
    if (authMode === 'signup') {
      const cred = await sfAuth.createUserWithEmailAndPassword(email, pw);
      if (name) await cred.user.updateProfile({ displayName: name });
      await db.collection('users').doc(cred.user.uid).set({
        email, name: name || '',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    } else {
      await sfAuth.signInWithEmailAndPassword(email, pw);
    }
    closeAuth();
  } catch(err) {
    authError.textContent = authErr(err.code, err.message);
  } finally {
    authSubmit.disabled = false;
    authSubmit.textContent = orig;
  }
});

googleBtn?.addEventListener('click', async () => {
  if (!window.FIREBASE_READY) {
    authError.textContent = 'Firebase未設定のためログインできません';
    return;
  }
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    const result = await sfAuth.signInWithPopup(provider);
    const user = result.user;
    await db.collection('users').doc(user.uid).set({
      email: user.email,
      name:  user.displayName || '',
      photo: user.photoURL || '',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    closeAuth();
  } catch(err) {
    authError.textContent = authErr(err.code, err.message);
  }
});

forgotBtn?.addEventListener('click', async () => {
  const email = document.getElementById('authEmail').value.trim();
  if (!email) { authError.textContent = 'メールアドレスを入力してから「パスワードを忘れた方」を押してください'; return; }
  if (!window.FIREBASE_READY) { authError.textContent = 'Firebase未設定です'; return; }
  try {
    await sfAuth.sendPasswordResetEmail(email);
    authError.style.color = '#16A34A';
    authError.textContent = '✓ パスワード再設定メールを送信しました';
  } catch(err) {
    authError.style.color = '';
    authError.textContent = authErr(err.code, err.message);
  }
});

// Account button — toggles menu (logged-in) or opens auth (guest)
accountBtn?.addEventListener('click', e => {
  e.stopPropagation();
  if (currentUser) {
    accountMenu.classList.toggle('open');
  } else {
    openAuth('login');
  }
});
document.addEventListener('click', e => {
  if (!accountMenu.contains(e.target) && !accountBtn.contains(e.target)) {
    accountMenu.classList.remove('open');
  }
});

amLogout?.addEventListener('click', async () => {
  await sfAuth.signOut();
  accountMenu.classList.remove('open');
});

// Auth state
if (window.FIREBASE_READY && window.sfAuth) {
  sfAuth.onAuthStateChanged(async user => {
    currentUser = user;
    if (user) {
      const display = user.displayName || (user.email ? user.email.split('@')[0] : 'ユーザー');
      accountLabel.textContent = display;
      accountBtn.classList.add('is-logged-in');
      amName.textContent  = user.displayName || display;
      amEmail.textContent = user.email || '';

      const promptEl = document.getElementById('coLoginPrompt');
      if (promptEl) {
        promptEl.classList.add('is-logged-in');
        promptEl.innerHTML = `<span>✓ ${display} としてログイン中</span>`;
      }

      // Pre-fill checkout from user profile
      try {
        const doc = await db.collection('users').doc(user.uid).get();
        if (doc.exists) {
          const u = doc.data();
          SIGNED_IN_PROFILES.set(user.uid, u);
          if (u.email && coForm) coForm.email.value = u.email;
          if (u.lastShipping) {
            const s = u.lastShipping;
            if (s.fname) coForm.fname.value = s.fname;
            if (s.lname) coForm.lname.value = s.lname;
            if (s.phone) coForm.phone.value = s.phone;
            if (s.zip) coForm.zip.value = s.zip;
            if (s.address) coForm.address.value = s.address;
            if (s.address2) coForm.address2.value = s.address2;
          }
        } else if (coForm) {
          coForm.email.value = user.email || '';
        }
      } catch(_) {}
    } else {
      accountLabel.textContent = 'ログイン';
      accountBtn.classList.remove('is-logged-in');
      amName.textContent = '—';
      amEmail.textContent = '—';
      const promptEl = document.getElementById('coLoginPrompt');
      if (promptEl) {
        promptEl.classList.remove('is-logged-in');
        promptEl.innerHTML = `
          <span>会員ですか？</span>
          <button type="button" class="link-btn" data-open-auth="login">ログイン</button>
          <span class="dim">/</span>
          <button type="button" class="link-btn" data-open-auth="signup">新規登録</button>
        `;
        promptEl.querySelectorAll('[data-open-auth]').forEach(btn =>
          btn.addEventListener('click', () => { closeCheckout(); openAuth(btn.dataset.openAuth); }));
      }
    }
  });
}

// =============================================
// CHECKOUT — Stripe Checkout (via Cloud Function) with form fallback
// =============================================
async function submitCheckout() {
  const btn = document.getElementById('checkoutSubmit');
  const lbl = document.getElementById('checkoutSubmitLabel');
  const orig = lbl.textContent;
  authError.textContent = '';

  if (!cart.count()) return;
  if (!coForm.checkValidity()) { coForm.reportValidity(); return; }

  const fd = new FormData(coForm);
  const shipping = {
    fname: fd.get('fname'), lname: fd.get('lname'),
    email: fd.get('email'), phone: fd.get('phone') || '',
    zip: fd.get('zip'), address: fd.get('address'),
    address2: fd.get('address2') || '', note: fd.get('note') || '',
  };

  btn.disabled = true;
  lbl.textContent = '決済画面を準備中...';

  // Persist shipping for next time
  if (currentUser && window.FIREBASE_READY) {
    try {
      await db.collection('users').doc(currentUser.uid).set({
        lastShipping: shipping,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    } catch(_) {}
  }

  // Save pending order
  let orderId = null;
  if (window.FIREBASE_READY) {
    try {
      const ref = await db.collection('orders').add({
        uid: currentUser?.uid || null,
        email: shipping.email,
        items: cart.items.map(i => ({ id: i.id, name: i.name, qty: i.qty, price: i.price })),
        subtotal: cart.total(),
        shipping,
        status: 'pending_payment',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      orderId = ref.id;
    } catch(e) {
      console.warn('[SLOW FIRE] order pre-save failed:', e.message);
    }
  }

  // Try Stripe Checkout via Cloud Function
  if (window.FIREBASE_READY && window.sfFunctions) {
    try {
      const createSession = sfFunctions.httpsCallable('createCheckoutSession');
      const res = await createSession({
        orderId,
        items: cart.items.map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.qty, image: i.image })),
        email: shipping.email,
        shipping,
      });
      if (res.data?.url) {
        window.location.href = res.data.url;
        return;
      }
    } catch(err) {
      console.warn('[SLOW FIRE] Stripe Checkout unavailable, falling back to manual order:', err.message);
    }
  }

  // Fallback: store order, show success message (no real payment)
  if (window.FIREBASE_READY && orderId) {
    try {
      await db.collection('orders').doc(orderId).update({ status: 'pending_review' });
    } catch(_) {}
  }
  lbl.textContent = '注文を受け付けました ✓';
  btn.style.background = '#16A34A';
  btn.disabled = true;
  setTimeout(() => {
    cart.items = []; cart.save(); cart.render(); cart.badge();
    closeCheckout();
    lbl.textContent = orig;
    btn.style.background = '';
    btn.disabled = false;
    coForm.reset();
  }, 2400);
}

// =============================================
// ORDERS DRAWER (account → 注文履歴)
// =============================================
const ordersDrawer   = document.getElementById('ordersDrawer');
const ordersBackdrop = document.getElementById('ordersBackdrop');

amOrders?.addEventListener('click', async () => {
  accountMenu.classList.remove('open');
  if (!currentUser || !window.FIREBASE_READY) return;
  ordersDrawer.classList.add('open');
  ordersBackdrop.classList.add('open');
  document.body.style.overflow = 'hidden';
  const list = document.getElementById('ordersList');
  list.innerHTML = '<p class="cart-empty">読み込み中...</p>';
  try {
    const snap = await db.collection('orders')
      .where('uid', '==', currentUser.uid)
      .orderBy('createdAt', 'desc').limit(20).get();
    if (snap.empty) {
      list.innerHTML = '<p class="cart-empty">まだ注文履歴がありません</p>';
      return;
    }
    list.innerHTML = snap.docs.map(d => {
      const o = d.data();
      const date = o.createdAt?.toDate?.()?.toLocaleDateString('ja-JP') || '—';
      const items = (o.items || []).map(i => `${i.name} × ${i.qty}`).join(', ');
      const statusLabel = {
        pending_payment: '支払い待ち',
        paid: '支払い完了',
        shipped: '発送済み',
        pending_review: '受付確認中',
      }[o.status] || o.status || '—';
      return `<div class="cart-item" style="grid-template-columns:1fr">
        <div>
          <div class="ci-name">${date} — ${statusLabel}</div>
          <div class="ci-sub">${items}</div>
          <div class="ci-price">¥${(o.subtotal || 0).toLocaleString()}</div>
        </div>
      </div>`;
    }).join('');
  } catch(e) {
    list.innerHTML = `<p class="cart-empty">エラー: ${e.message}</p>`;
  }
});
function closeOrders() {
  ordersDrawer.classList.remove('open');
  ordersBackdrop.classList.remove('open');
  document.body.style.overflow = '';
}
document.getElementById('ordersClose')?.addEventListener('click', closeOrders);
ordersBackdrop?.addEventListener('click', closeOrders);

// =============================================
// SUCCESS / CANCEL PAGE — handle redirect back from Stripe
// =============================================
(function () {
  const p = new URLSearchParams(location.search);
  if (p.get('payment') === 'success') {
    cart.items = []; cart.save(); cart.render(); cart.badge();
    setTimeout(() => alert('✓ ご注文ありがとうございました。確認メールをお送りしました。'), 200);
    history.replaceState({}, '', location.pathname);
  } else if (p.get('payment') === 'cancel') {
    setTimeout(() => alert('決済がキャンセルされました。再度お試しください。'), 200);
    history.replaceState({}, '', location.pathname);
  }
})();
