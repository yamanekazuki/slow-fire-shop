/* ============================================
   SLOW FIRE SHOP — Scripts v2
   ============================================ */

// ======================== PRODUCTS DATA ========================
const PRODUCTS = [
  // ---- RUBS & SAUCE ----
  {
    id: 'steak-shooter',
    name: 'Steak Shooter',
    nameja: 'ステーキシューター',
    subtitle: 'Steak & Beef Rub',
    desc: '牛肉のポテンシャルを最大限引き出すスタンダードラブ。バックヤードでも競技大会でも通用する、発色と旨みの黄金ブレンド。',
    best: 'ステーキ / ロースト / 野菜',
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
    desc: 'ステーキシューターの辛口バージョン。辛さレベル2/5で、刺激を楽しみながらも旨みはそのまま。チキンウィングや豚チョップにも。',
    best: 'ステーキ / チキンウィング / 豚チョップ',
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
    desc: 'コーヒーノートとブラックペッパーの深みが特徴。ブリスケットや牛リブのバーク（外皮）を完璧に仕上げる上級者向けラブ。',
    best: 'ブリスケット / 牛リブ / ステーキ',
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
    best: '豚リブ / プルドポーク / チキンウィング',
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
    desc: 'スマックとハーブのブレンドがラムとジビエを格上げ。カンガルー、アヒル、鴨から鹿まで、ワイルドな素材に最高の一本。',
    best: 'ラムチョップ / カンガルー / ダックブレスト',
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
    desc: 'ガーリックとパルメザンチーズの万能ラブ。肉・野菜・ローストポテトまで何でも合う、最もフレキシブルなブレンド。',
    best: 'チキン / ラム / ローストポテト',
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
    desc: 'チリの辛さとシトラスの爽やかさが絶妙なコンビ。チキンや豚肉に鮮やかな発色と、フレッシュで深みのある味わいを。',
    best: 'チキン / 豚肉 / スペアリブ',
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
    desc: 'Low n Slow Basicsのシグネチャーソース。ラブと組み合わせることでコンペティション級のフレーバーが完成。仕上げ・ディップ・グレーズに。',
    best: '仕上げがけ / ディップ / グレーズ',
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
    best: 'そのままで / アウトドア / おつまみ',
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
    desc: 'ガーリックゴールズの風味をそのままジャーキーに。グラスフェッド牛の旨みとガーリックの芳香が癖になる逸品。',
    best: 'そのままで / アウトドア / おつまみ',
    price: 2500,
    category: 'jerky',
    badge: null,
    image: 'https://www.lownslowbasics.com.au/wp-content/uploads/2025/03/beef-jerky-garlic-goals.jpg',
  },
  // ---- SETS ----
  {
    id: 'all-star-combo',
    name: 'All-Star Combo',
    nameja: 'オールスターコンボ',
    subtitle: 'BBQ Rub Set — 7種類',
    desc: '全7種のラブがすべて揃う最強セット。ステーキ・ポーク・チキン・ラム・オールパーパスであらゆるBBQシーンに対応。ギフトにも最適。',
    best: '全シーン対応 / ギフト / コンプリート',
    price: 24000,
    originalPrice: 26600,
    category: 'set',
    badge: 'BEST VALUE',
    image: 'https://www.lownslowbasics.com.au/wp-content/uploads/2023/09/Rubs-Bundle-Updated-600x600.png',
  },
  {
    id: 'all-star-hook-shot',
    name: 'All-Star Combo + Hook Shot',
    nameja: 'オールスター ＋ フックショット',
    subtitle: 'BBQ Rub Set + Sauce — 8種類',
    desc: '全7種ラブ＋シグネチャーBBQソースのフルセット。ラブとソースを組み合わせたプロ仕様の完全装備。',
    best: 'プロ仕様 / フルセット / ギフト',
    price: 27000,
    originalPrice: 30200,
    category: 'set',
    badge: 'POPULAR',
    image: 'https://www.lownslowbasics.com.au/wp-content/uploads/2024/11/all-star-combo-plus-hookshot-NEW-600x600.jpg',
  },
  {
    id: 'all-star-full',
    name: 'All-Star Full Set',
    nameja: 'オールスター フルセット',
    subtitle: 'Rubs + Sauce + Jerky — 10種類',
    desc: '全7種ラブ＋BBQソース＋ジャーキー2種の究極セット。全ラインナップをまるごと体験できる、贈り物にも自分へのご褒美にも。',
    best: '究極セット / プレミアムギフト',
    price: 32000,
    originalPrice: 35700,
    category: 'set',
    badge: 'PREMIUM',
    image: 'https://www.lownslowbasics.com.au/wp-content/uploads/2024/02/Rubs-Sauce-Bundle-Updated-600x600.png',
  },
];

// badge → CSS class mapping
const BADGE_CLASS = {
  'BEST SELLER': 'badge-bestseller',
  'NEW':         'badge-new',
  'POPULAR':     'badge-popular',
  'BEST VALUE':  'badge-value',
  'PREMIUM':     'badge-premium',
  'SPICY':       'badge-spicy',
  'GIFT':        'badge-gift',
};

const CAT_LABEL = { rub: 'RUB / SAUCE', jerky: 'JERKY', set: 'SET' };

// ======================== CART ========================
class Cart {
  constructor() {
    this.items = JSON.parse(localStorage.getItem('sfshop_v2_cart') || '[]');
  }

  save() {
    localStorage.setItem('sfshop_v2_cart', JSON.stringify(this.items));
  }

  add(productId) {
    const existing = this.items.find(i => i.id === productId);
    if (existing) {
      existing.qty += 1;
    } else {
      const p = PRODUCTS.find(p => p.id === productId);
      this.items.push({ id: productId, name: p.name, nameja: p.nameja, price: p.price, image: p.image, qty: 1 });
    }
    this.save();
    this.render();
    this.updateBadge();
  }

  remove(id) {
    this.items = this.items.filter(i => i.id !== id);
    this.save();
    this.render();
    this.updateBadge();
  }

  updateQty(id, delta) {
    const item = this.items.find(i => i.id === id);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) { this.remove(id); return; }
    this.save();
    this.render();
    this.updateBadge();
  }

  total() {
    return this.items.reduce((s, i) => s + i.price * i.qty, 0);
  }

  count() {
    return this.items.reduce((s, i) => s + i.qty, 0);
  }

  updateBadge() {
    const badge = document.getElementById('cartBadge');
    if (!badge) return;
    const n = this.count();
    badge.textContent = n;
    badge.style.display = n > 0 ? 'flex' : 'none';
  }

  render() {
    const list    = document.getElementById('cartList');
    const totalEl = document.getElementById('cartTotal');
    if (!list) return;

    if (this.items.length === 0) {
      list.innerHTML = '<p class="cart-empty">カートは空です</p>';
    } else {
      list.innerHTML = this.items.map(item => `
        <div class="cart-item">
          <img class="ci-thumb" src="${item.image}" alt="${item.name}" loading="lazy"
               onerror="this.style.background='var(--surface-2)';this.style.opacity='.4'">
          <div class="ci-info">
            <div class="ci-name">${item.name}</div>
            <div class="ci-sub">${item.nameja}</div>
            <div class="ci-price">¥${(item.price * item.qty).toLocaleString()}</div>
            <div class="ci-qty">
              <button class="ci-qty-btn" data-id="${item.id}" data-delta="-1">−</button>
              <span class="ci-qty-num">${item.qty}</span>
              <button class="ci-qty-btn" data-id="${item.id}" data-delta="1">＋</button>
            </div>
          </div>
          <button class="ci-remove" data-id="${item.id}" aria-label="削除">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
      `).join('');
    }

    if (totalEl) totalEl.textContent = `¥${this.total().toLocaleString()}`;

    list.querySelectorAll('.ci-qty-btn').forEach(btn => {
      btn.addEventListener('click', () => cart.updateQty(btn.dataset.id, parseInt(btn.dataset.delta, 10)));
    });
    list.querySelectorAll('.ci-remove').forEach(btn => {
      btn.addEventListener('click', () => cart.remove(btn.dataset.id));
    });
  }
}

const cart = new Cart();
cart.render();
cart.updateBadge();

// ======================== CART DRAWER ========================
const cartDrawer   = document.getElementById('cartDrawer');
const cartBackdrop = document.getElementById('cartBackdrop');

function openCart() {
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

// ======================== CHECKOUT MODAL ========================
const checkoutOverlay = document.getElementById('checkoutOverlay');
const checkoutForm    = document.getElementById('checkoutForm');

function openCheckout() {
  if (cart.count() === 0) return;
  const summaryEl = document.getElementById('orderSummary');
  const totalEl   = document.getElementById('orderTotalModal');
  if (summaryEl) {
    summaryEl.innerHTML = cart.items.map(i => `
      <div class="order-row">
        <span>${i.name} × ${i.qty}</span>
        <span>¥${(i.price * i.qty).toLocaleString()}</span>
      </div>
    `).join('');
  }
  if (totalEl) totalEl.textContent = `¥${cart.total().toLocaleString()}`;
  checkoutOverlay?.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeCheckout() {
  checkoutOverlay?.classList.remove('open');
  document.body.style.overflow = '';
}

document.getElementById('checkoutBtn')?.addEventListener('click', () => {
  closeCart();
  setTimeout(openCheckout, 200);
});
document.getElementById('checkoutClose')?.addEventListener('click', closeCheckout);
checkoutOverlay?.addEventListener('click', e => { if (e.target === checkoutOverlay) closeCheckout(); });

checkoutForm?.addEventListener('submit', e => {
  e.preventDefault();
  const btn  = checkoutForm.querySelector('button[type="submit"]');
  const orig = btn.textContent;
  btn.textContent = '注文を受け付けました！ありがとうございます。';
  btn.style.background = '#16A34A';
  btn.disabled = true;
  setTimeout(() => {
    cart.items = [];
    cart.save();
    cart.render();
    cart.updateBadge();
    closeCheckout();
    btn.textContent    = orig;
    btn.style.background = '';
    btn.disabled = false;
    checkoutForm.reset();
  }, 3500);
});

// ======================== PRODUCT GRID ========================
let currentFilter = 'all';

function renderProducts(filter = 'all') {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;
  currentFilter = filter;

  const filtered = filter === 'all' ? PRODUCTS : PRODUCTS.filter(p => p.category === filter);

  grid.innerHTML = filtered.map(p => {
    const badgeCls  = p.badge ? BADGE_CLASS[p.badge] || '' : '';
    const badgeHtml = p.badge ? `<span class="pc-badge ${badgeCls}">${p.badge}</span>` : '';
    const origHtml  = p.originalPrice
      ? `<span class="pc-price-original">¥${p.originalPrice.toLocaleString()}</span>` : '';

    return `
      <div class="product-card" role="listitem" data-id="${p.id}">
        <div class="pc-img-wrap">
          <img class="pc-img" src="${p.image}" alt="${p.name}" loading="lazy"
               onerror="this.src='';this.closest('.pc-img-wrap').style.background='var(--surface-2)'">
          <span class="pc-cat-badge">${CAT_LABEL[p.category]}</span>
          ${badgeHtml}
        </div>
        <div class="pc-body">
          <div class="pc-name">${p.name}</div>
          <div class="pc-nameja">${p.nameja}</div>
          <p class="pc-desc">${p.desc}</p>
          <p class="pc-best">おすすめ: ${p.best}</p>
          <div class="pc-footer">
            <div class="pc-price">
              ${origHtml}
              <span class="pc-price-main">¥${p.price.toLocaleString()}</span>
            </div>
            <button class="atc-btn" data-id="${p.id}">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1 1h1.7l2.3 7h5.8l1.2-4H4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
                <circle cx="6.5" cy="11.5" r="1" fill="currentColor"/>
                <circle cx="10.5" cy="11.5" r="1" fill="currentColor"/>
              </svg>
              カートへ
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  grid.querySelectorAll('.atc-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      cart.add(id);
      btn.classList.add('done');
      btn.innerHTML = '✓ 追加済み';
      setTimeout(() => {
        btn.classList.remove('done');
        btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M1 1h1.7l2.3 7h5.8l1.2-4H4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="6.5" cy="11.5" r="1" fill="currentColor"/>
          <circle cx="10.5" cy="11.5" r="1" fill="currentColor"/>
        </svg> カートへ`;
        openCart();
      }, 1000);
    });
  });
}

// Filter tabs
document.querySelectorAll('.filter-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-tab').forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');
    renderProducts(btn.dataset.filter);
  });
});

renderProducts();

// ======================== FAQ ACCORDION ========================
document.querySelectorAll('.faq-item').forEach(item => {
  item.querySelector('.faq-q')?.addEventListener('click', () => {
    const isOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
    if (!isOpen) item.classList.add('open');
  });
});

// ======================== NAV ========================
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav?.classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

// ======================== HAMBURGER ========================
const hamburger = document.querySelector('.nav-hamburger');
const navLinks  = document.querySelector('.nav-links');

if (hamburger && navLinks) {
  hamburger.addEventListener('click', () => {
    const open = navLinks.style.display === 'flex';
    navLinks.style.display      = open ? 'none' : 'flex';
    navLinks.style.flexDirection = 'column';
    navLinks.style.position     = 'absolute';
    navLinks.style.top          = '100%';
    navLinks.style.left         = '0';
    navLinks.style.right        = '0';
    navLinks.style.background   = 'rgba(255,255,255,0.98)';
    navLinks.style.padding      = '16px 24px';
    navLinks.style.gap          = '16px';
    navLinks.style.borderBottom = '1px solid var(--border)';
    navLinks.style.boxShadow    = 'var(--shadow)';
    hamburger.setAttribute('aria-expanded', String(!open));
    if (open) navLinks.style.display = 'none';
  });
  navLinks.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      if (window.innerWidth <= 768) navLinks.style.display = 'none';
    });
  });
}

// ======================== SMOOTH SCROLL ========================
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const href = a.getAttribute('href');
    if (href === '#') return;
    e.preventDefault();
    const target = document.querySelector(href);
    if (!target) return;
    const top = target.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top, behavior: 'smooth' });
  });
});
