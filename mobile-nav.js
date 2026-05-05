/* =============================================
   SLOW FIRE SHOP — Shared mobile menu logic
   Auto-generates a fullscreen overlay menu from .nav-links
   ============================================= */
(function () {
  function init() {
    const hamburger = document.querySelector('.hamburger');
    const navLinks  = document.querySelector('.nav-links');
    if (!hamburger || !navLinks) return;
    if (document.getElementById('mobileMenu')) return;

    // Build overlay menu from existing desktop nav links
    const overlay = document.createElement('div');
    overlay.id = 'mobileMenu';
    overlay.className = 'mobile-menu';
    overlay.setAttribute('aria-hidden', 'true');

    Array.from(navLinks.children).forEach(node => {
      // <a> direct child or wrapped in <li>
      const a = node.tagName === 'A' ? node : node.querySelector('a');
      if (!a) return;
      const clone = a.cloneNode(true);
      clone.classList.remove('nav-cta');
      overlay.appendChild(clone);
    });

    document.body.appendChild(overlay);

    const setMenu = (open) => {
      hamburger.classList.toggle('is-open', open);
      hamburger.setAttribute('aria-expanded', String(open));
      overlay.classList.toggle('is-open', open);
      overlay.setAttribute('aria-hidden', String(!open));
      document.body.classList.toggle('menu-open', open);
    };

    hamburger.addEventListener('click', (e) => {
      e.stopPropagation();
      setMenu(!overlay.classList.contains('is-open'));
    });
    overlay.querySelectorAll('a').forEach(a =>
      a.addEventListener('click', () => setMenu(false))
    );
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && overlay.classList.contains('is-open')) setMenu(false);
    });
    window.addEventListener('resize', () => {
      if (window.innerWidth > 768 && overlay.classList.contains('is-open')) setMenu(false);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
