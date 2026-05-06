/* =============================================
   SLOW FIRE SHOP — Shared mobile menu logic
   Auto-generates a fullscreen overlay menu from .nav-links.
   Handles plain <a> nodes AND .nav-dropdown blocks (ガイド).
   ============================================= */
(function () {
  function init() {
    const hamburger = document.querySelector('.hamburger');
    const navLinks  = document.querySelector('.nav-links');
    if (!hamburger || !navLinks) return;
    if (document.getElementById('mobileMenu')) return;

    const overlay = document.createElement('div');
    overlay.id = 'mobileMenu';
    overlay.className = 'mobile-menu';
    overlay.setAttribute('aria-hidden', 'true');

    Array.from(navLinks.children).forEach(node => {
      // 1. Direct anchor: clone as-is
      if (node.tagName === 'A') {
        const clone = node.cloneNode(true);
        clone.classList.remove('nav-cta');
        // Preserve the orange JOURNAL inline style on mobile
        overlay.appendChild(clone);
        return;
      }

      // 2. .nav-dropdown: render as section heading + sub-anchor list
      if (node.classList && node.classList.contains('nav-dropdown')) {
        const toggle = node.querySelector('.nav-dropdown-toggle');
        const menu   = node.querySelector('.nav-dropdown-menu');
        if (!menu) return;

        // Section heading (strip ▾ etc.)
        const rawTitle = (toggle && toggle.textContent || '').replace(/[▾▼\s]/g, '').trim() || 'ガイド';
        const heading = document.createElement('div');
        heading.className = 'mm-section-title';
        heading.textContent = rawTitle;
        overlay.appendChild(heading);

        // Sub-anchors (one per <a> inside the dropdown menu)
        menu.querySelectorAll('a').forEach(a => {
          const clone = a.cloneNode(true);
          clone.classList.add('mm-sublink');
          // Re-render inner content as title + subtitle for easier reading
          const strong = clone.querySelector('strong');
          const span = clone.querySelector('span');
          if (strong || span) {
            const titleText = strong ? strong.textContent : a.textContent.trim();
            const subText = span ? span.textContent : '';
            clone.innerHTML = `
              <span class="mm-sublink-title">${titleText}</span>
              ${subText ? `<span class="mm-sublink-sub">${subText}</span>` : ''}
            `;
          }
          overlay.appendChild(clone);
        });

        // Divider after the dropdown section
        const divider = document.createElement('div');
        divider.className = 'mm-divider';
        overlay.appendChild(divider);
        return;
      }

      // 3. Fallback: search for any <a> inside this node
      const a = node.querySelector ? node.querySelector('a') : null;
      if (a) {
        const clone = a.cloneNode(true);
        clone.classList.remove('nav-cta');
        overlay.appendChild(clone);
      }
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
