/* ============================================
   SLOW FIRE SHOP — Scripts v1
   ============================================ */

// ======================== PRODUCTS ========================
const PRODUCTS = [
  {
    id: 'outback-classic',
    name: 'OUTBACK CLASSIC',
    nameja: 'アウトバック クラシック',
    desc: 'オールマイティなスタンダードラブ。牛・豚・鶏に幅広く使える定番ブレンド。',
    sizes: [{ label: '130g', price: 2800 }, { label: '250g', price: 4800 }],
    theme: 'classic',
    badge: null,
  },
  {
    id: 'hickory-smoke',
    name: 'HICKORY SMOKE',
    nameja: 'ヒッコリー スモーク',
    desc: 'ヒッコリーの煙香を閉じ込めた、深みのあるスモーキーラブ。',
    sizes: [{ label: '130g', price: 3200 }, { label: '250g', price: 5500 }],
    theme: 'hickory',
    badge: 'BEST SELLER',
  },
  {
    id: 'sweet-heat',
    name: 'SWEET HEAT',
    nameja: 'スウィート ヒート',
    desc: '甘さと辛さの黄金比。プルドポークに最高のラブ。',
    sizes: [{ label: '130g', price: 2800 }, { label: '250g', price: 4800 }],
    theme: 'sweet',
    badge: null,
  },
  {
    id: 'pepper-herb',
    name: 'PEPPER & HERB',
    nameja: 'ペッパー ＆ ハーブ',
    desc: '粗挽きブラックペッパーとフレッシュハーブの上品なブレンド。',
    sizes: [{ label: '130g', price: 3500 }, { label: '250g', price: 6000 }],
    theme: 'pepper',
    badge: 'NEW',
  },
  {
    id: 'starter-kit',
    name: 'STARTER KIT',
    nameja: 'スターター キット',
    desc: '3種のラブがセットに。BBQ初心者に最適な入門セット。',
    sizes: [{ label: '各130g × 3本', price: 7800 }],
    theme: 'kit',
    badge: 'GIFT',
  },
];

// ======================== CART ========================
class Cart {
  constructor() {
    this.items = JSON.parse(localStorage.getItem('sfshop_cart') || '[]');
  }

  save() {
    localStorage.setItem('sfshop_cart', JSON.stringify(this.items));
  }

  add(productId, sizeLabel, price) {
    const key = `${productId}__${sizeLabel}`;
    const existing = this.items.find(i => i.key === key);
    if (existing) {
      existing.qty += 1;
    } else {
      const product = PRODUCTS.find(p => p.id === productId);
      this.items.push({
        key,
        productId,
        sizeLabel,
        price,
        qty: 1,
        name: product.name,
        nameja: product.nameja,
        theme: product.theme,
      });
    }
    this.save();
    this.render();
    this.updateBadge();
  }

  remove(key) {
    this.items = this.items.filter(i => i.key !== key);
    this.save();
    this.render();
    this.updateBadge();
  }

  updateQty(key, delta) {
    const item = this.items.find(i => i.key === key);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) {
      this.remove(key);
      return;
    }
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
    const list = document.getElementById('cartList');
    const totalEl = document.getElementById('cartTotal');
    if (!list) return;

    if (this.items.length === 0) {
      list.innerHTML = '<p class="cart-empty">カートは空です</p>';
    } else {
      list.innerHTML = this.items.map(item => `
        <div class="cart-item" data-key="${item.key}">
          <div class="ci-visual pv-${item.theme}"></div>
          <div class="ci-info">
            <div class="ci-name">${item.name}</div>
            <div class="ci-sub">${item.nameja} · ${item.sizeLabel}</div>
            <div class="ci-price">¥${(item.price * item.qty).toLocaleString()}</div>
          </div>
          <div class="ci-controls">
            <button class="qty-btn" data-key="${item.key}" data-delta="-1">−</button>
            <span class="qty-num">${item.qty}</span>
            <button class="qty-btn" data-key="${item.key}" data-delta="1">＋</button>
          </div>
          <button class="ci-remove" data-key="${item.key}" aria-label="削除">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
      `).join('');
    }

    if (totalEl) totalEl.textContent = `¥${this.total().toLocaleString()}`;

    list.querySelectorAll('.qty-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.key;
        const delta = parseInt(btn.dataset.delta, 10);
        cart.updateQty(key, delta);
      });
    });

    list.querySelectorAll('.ci-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        cart.remove(btn.dataset.key);
      });
    });
  }
}

const cart = new Cart();
cart.render();
cart.updateBadge();

// ======================== CART DRAWER ========================
const cartDrawer  = document.getElementById('cartDrawer');
const cartBackdrop = document.getElementById('cartBackdrop');
const cartCloseBtn = document.getElementById('cartClose');
const cartBtn      = document.getElementById('cartBtn');

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

cartBtn?.addEventListener('click', openCart);
cartCloseBtn?.addEventListener('click', closeCart);
cartBackdrop?.addEventListener('click', closeCart);

// ======================== CHECKOUT MODAL ========================
const checkoutModal     = document.getElementById('checkoutModal');
const checkoutOverlay   = document.getElementById('checkoutOverlay');
const checkoutCloseBtn  = document.getElementById('checkoutClose');
const checkoutBtn       = document.getElementById('checkoutBtn');
const orderSummaryEl    = document.getElementById('orderSummary');
const orderTotalModalEl = document.getElementById('orderTotalModal');
const checkoutForm      = document.getElementById('checkoutForm');

function openCheckout() {
  if (cart.count() === 0) return;

  if (orderSummaryEl) {
    orderSummaryEl.innerHTML = cart.items.map(item => `
      <div class="order-row">
        <span>${item.name} (${item.sizeLabel}) × ${item.qty}</span>
        <span>¥${(item.price * item.qty).toLocaleString()}</span>
      </div>
    `).join('');
  }
  if (orderTotalModalEl) orderTotalModalEl.textContent = `¥${cart.total().toLocaleString()}`;

  checkoutModal?.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeCheckout() {
  checkoutModal?.classList.remove('open');
  document.body.style.overflow = '';
}

checkoutBtn?.addEventListener('click', () => {
  closeCart();
  setTimeout(openCheckout, 200);
});

checkoutCloseBtn?.addEventListener('click', closeCheckout);
checkoutOverlay?.addEventListener('click', (e) => {
  if (e.target === checkoutOverlay) closeCheckout();
});

checkoutForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  const btn = checkoutForm.querySelector('button[type="submit"]');
  const orig = btn.textContent;
  btn.textContent = '注文を受け付けました！ありがとうございます。';
  btn.style.background = '#16a34a';
  btn.disabled = true;

  setTimeout(() => {
    cart.items = [];
    cart.save();
    cart.render();
    cart.updateBadge();
    closeCheckout();
    btn.textContent = orig;
    btn.style.background = '';
    btn.disabled = false;
    checkoutForm.reset();
  }, 3500);
});

// ======================== PRODUCT GRID ========================
function renderProducts() {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;

  grid.innerHTML = PRODUCTS.map(product => {
    const badgeHtml = product.badge
      ? `<span class="badge badge-${product.badge.toLowerCase().replace(' ', '-')}">${product.badge}</span>`
      : '';

    const sizesHtml = product.sizes.map((s, i) => `
      <button class="size-opt ${i === 0 ? 'selected' : ''}"
              data-product="${product.id}"
              data-size="${s.label}"
              data-price="${s.price}">
        ${s.label}
      </button>
    `).join('');

    const defaultSize  = product.sizes[0];
    const defaultPrice = defaultSize.price;

    return `
      <div class="product-card reveal">
        ${badgeHtml}
        <div class="pv-wrap">
          <div class="product-visual pv-${product.theme}">
            <div class="pv-label">
              <div class="pv-brand">SLOW FIRE</div>
              <div class="pv-title">${product.name}</div>
              <div class="pv-sub">DRY RUB · AUSTRALIA</div>
            </div>
          </div>
        </div>
        <div class="product-info">
          <h3 class="product-name">${product.name}</h3>
          <p class="product-nameja">${product.nameja}</p>
          <p class="product-desc">${product.desc}</p>
          <div class="size-selector" id="sizes-${product.id}">
            ${sizesHtml}
          </div>
          <div class="product-footer">
            <span class="product-price" id="price-${product.id}">¥${defaultPrice.toLocaleString()}</span>
            <button class="atc-btn" id="atc-${product.id}"
                    data-product="${product.id}"
                    data-size="${defaultSize.label}"
                    data-price="${defaultPrice}">
              カートに追加
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Size selector interaction
  grid.querySelectorAll('.size-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      const productId = btn.dataset.product;
      const sizeLabel = btn.dataset.size;
      const price     = parseInt(btn.dataset.price, 10);

      // Toggle selected state
      document.querySelectorAll(`#sizes-${productId} .size-opt`).forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');

      // Update price display
      const priceEl = document.getElementById(`price-${productId}`);
      if (priceEl) priceEl.textContent = `¥${price.toLocaleString()}`;

      // Update ATC button data
      const atcBtn = document.getElementById(`atc-${productId}`);
      if (atcBtn) {
        atcBtn.dataset.size  = sizeLabel;
        atcBtn.dataset.price = price;
      }
    });
  });

  // Add to cart buttons
  grid.querySelectorAll('.atc-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const productId = btn.dataset.product;
      const sizeLabel = btn.dataset.size;
      const price     = parseInt(btn.dataset.price, 10);

      // Loading state
      btn.classList.add('loading');
      btn.textContent = '...';

      setTimeout(() => {
        cart.add(productId, sizeLabel, price);
        btn.classList.remove('loading');
        btn.classList.add('done');
        btn.textContent = '✓ 追加しました';

        setTimeout(() => {
          btn.classList.remove('done');
          btn.textContent = 'カートに追加';
          openCart();
        }, 1200);
      }, 600);
    });
  });

  // Re-observe new reveal elements
  grid.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
}

// ======================== SCROLL REVEAL ========================
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

// Render products after observer is set up
renderProducts();

// ======================== FAQ ACCORDION ========================
document.querySelectorAll('.faq-item').forEach(item => {
  const question = item.querySelector('.faq-question');
  question?.addEventListener('click', () => {
    const isOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
    if (!isOpen) item.classList.add('open');
  });
});

// ======================== FIRE PARTICLE SYSTEM ========================
const canvas = document.getElementById('fireCanvas');
const ctx    = canvas?.getContext('2d');

if (canvas && ctx) {
  function resizeCanvas() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas, { passive: true });

  const FIRE_PALETTE = [
    [249, 115, 22],
    [217, 119,  6],
    [220,  38, 38],
    [253, 186, 116],
    [251, 191, 36],
    [194,  65, 12],
  ];

  const SMOKE_PALETTE = [
    [60, 45, 30],
    [80, 62, 42],
    [50, 38, 25],
  ];

  class FireParticle {
    constructor(spread = false) { this.reset(spread); }

    reset(spread = false) {
      const w = canvas.width, h = canvas.height;
      const zone = w * 0.55, offset = (w - zone) / 2;
      this.x = offset + Math.random() * zone;
      this.y = spread ? Math.random() * h : h + Math.random() * 60;
      this.baseSize    = Math.random() * 4.5 + 0.8;
      this.size        = this.baseSize;
      this.speedX      = (Math.random() - 0.5) * 0.65;
      this.speedY      = -(Math.random() * 2.4 + 0.5);
      this.wobble      = Math.random() * Math.PI * 2;
      this.wobbleSpeed = Math.random() * 0.035 + 0.008;
      this.life        = 1;
      this.decay       = Math.random() * 0.012 + 0.004;
      this.col         = FIRE_PALETTE[Math.floor(Math.random() * FIRE_PALETTE.length)];
    }

    update() {
      this.wobble += this.wobbleSpeed;
      this.x += this.speedX + Math.sin(this.wobble) * 0.55;
      this.y += this.speedY;
      this.life -= this.decay;
      this.size = this.baseSize * this.life;
    }

    draw() {
      const [r, g, b] = this.col;
      const alpha = Math.max(0, this.life * 0.72);
      ctx.save();
      ctx.globalAlpha  = alpha;
      ctx.shadowBlur   = 20;
      ctx.shadowColor  = `rgb(${r},${g},${b})`;
      const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size * 2.4);
      grad.addColorStop(0,    `rgba(${r},${g},${b},1)`);
      grad.addColorStop(0.45, `rgba(${r},${g},${b},0.38)`);
      grad.addColorStop(1,    `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    isDead() { return this.life <= 0 || this.y < -40; }
  }

  class SmokeParticle {
    constructor() { this.reset(); }

    reset() {
      const w = canvas.width, h = canvas.height;
      const zone = w * 0.4, offset = (w - zone) / 2;
      this.x = offset + Math.random() * zone;
      this.y = h * 0.3 + Math.random() * h * 0.4;
      this.size        = Math.random() * 60 + 30;
      this.speedX      = (Math.random() - 0.5) * 0.3;
      this.speedY      = -(Math.random() * 0.4 + 0.1);
      this.wobble      = Math.random() * Math.PI * 2;
      this.wobbleSpeed = Math.random() * 0.008 + 0.003;
      this.life        = Math.random() * 0.3 + 0.05;
      this.decay       = Math.random() * 0.0015 + 0.0005;
      this.col         = SMOKE_PALETTE[Math.floor(Math.random() * SMOKE_PALETTE.length)];
    }

    update() {
      this.wobble += this.wobbleSpeed;
      this.x += this.speedX + Math.sin(this.wobble) * 0.4;
      this.y += this.speedY;
      this.life -= this.decay;
      this.size += 0.25;
    }

    draw() {
      const [r, g, b] = this.col;
      const alpha = Math.max(0, this.life * 0.55);
      ctx.save();
      ctx.globalAlpha = alpha;
      const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size);
      grad.addColorStop(0,   `rgba(${r},${g},${b},0.5)`);
      grad.addColorStop(0.6, `rgba(${r},${g},${b},0.15)`);
      grad.addColorStop(1,   `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    isDead() { return this.life <= 0 || this.y < -80; }
  }

  const fireParticles  = Array.from({ length: 150 }, () => new FireParticle(true));
  const smokeParticles = Array.from({ length: 20  }, () => new SmokeParticle());

  function renderParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of smokeParticles) { p.update(); p.draw(); if (p.isDead()) p.reset(); }
    for (const p of fireParticles)  { p.update(); p.draw(); if (p.isDead()) p.reset(); }
    requestAnimationFrame(renderParticles);
  }
  renderParticles();
}

// ======================== NAV ========================
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav?.classList.toggle('scrolled', window.scrollY > 60);
}, { passive: true });

// ======================== HAMBURGER ========================
const hamburger = document.querySelector('.nav-hamburger');
const navLinks  = document.querySelector('.nav-links');

if (hamburger && navLinks) {
  hamburger.addEventListener('click', () => {
    const open = navLinks.style.display === 'flex';
    navLinks.style.display       = open ? 'none' : 'flex';
    navLinks.style.flexDirection = 'column';
    navLinks.style.position      = 'absolute';
    navLinks.style.top           = '100%';
    navLinks.style.left          = '0';
    navLinks.style.right         = '0';
    navLinks.style.background    = 'rgba(8,6,4,0.97)';
    navLinks.style.padding       = '1.5rem 2.5rem';
    navLinks.style.gap           = '1.25rem';
    navLinks.style.borderBottom  = '1px solid rgba(255,255,255,0.07)';
    if (open) navLinks.style.display = 'none';
  });

  navLinks.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      if (window.innerWidth <= 768) navLinks.style.display = 'none';
    });
  });
}

// ======================== SMOOTH SCROLL ========================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', (e) => {
    const href = anchor.getAttribute('href');
    if (href === '#') return;
    e.preventDefault();
    const target = document.querySelector(href);
    if (!target) return;
    const top = target.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top, behavior: 'smooth' });
  });
});

// ======================== CONTACT FORM ========================
const contactForm = document.querySelector('.contact-form');
if (contactForm) {
  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const btn  = contactForm.querySelector('button[type="submit"]');
    const orig = btn.textContent;
    btn.textContent = '送信完了！ありがとうございます。';
    btn.style.background  = '#16a34a';
    btn.style.boxShadow   = '0 8px 24px rgba(22,163,74,0.28)';
    btn.disabled = true;
    setTimeout(() => {
      btn.textContent     = orig;
      btn.style.background = '';
      btn.style.boxShadow  = '';
      btn.disabled = false;
      contactForm.reset();
    }, 4000);
  });
}
