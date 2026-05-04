/* =============================================
   SLOW FIRE SHOP — Scripts v3
   ============================================= */

// =============================================
// PRODUCTS DATA
// =============================================
const PRODUCTS = [
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

coForm?.addEventListener('submit', e => {
  e.preventDefault();
  const btn = coForm.querySelector('button[type="submit"]');
  const orig = btn.textContent;
  btn.textContent = '注文を受け付けました！';
  btn.style.background = '#16A34A';
  btn.disabled = true;
  setTimeout(() => {
    cart.items = []; cart.save(); cart.render(); cart.badge();
    closeCheckout();
    btn.textContent    = orig;
    btn.style.background = '';
    btn.disabled = false;
    coForm.reset();
  }, 3000);
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

// Hamburger
const hamburger = document.querySelector('.hamburger');
const navLinks  = document.querySelector('.nav-links');
if (hamburger && navLinks) {
  hamburger.addEventListener('click', () => {
    const open = navLinks.style.display === 'flex';
    navLinks.style.cssText = open ? '' : `
      display:flex; flex-direction:column; position:absolute;
      top:100%; left:0; right:0; background:var(--white);
      padding:16px 24px; gap:14px;
      border-bottom:1px solid var(--gray-200);
      box-shadow:var(--shadow);
    `;
    if (open) navLinks.style.display = 'none';
  });
  navLinks.querySelectorAll('a').forEach(a =>
    a.addEventListener('click', () => { if (window.innerWidth <= 768) navLinks.style.display = 'none'; }));
}

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
