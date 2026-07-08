/* SLOW FIRE — Fable refresh visual layer.
   Purely decorative. Wrapped so a failure here can never break
   auth / cart / checkout (script.js is untouched). */
(function () {
  try {
    var qs = new URLSearchParams(location.search);
    var staticMode = qs.get('static') === '1';
    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (staticMode || reduced) {
      document.documentElement.setAttribute('data-fx-off', '1');
    }

    // ---- count-up on view ----
    function countUp(el) {
      try {
        var target = parseInt(el.getAttribute('data-count'), 10) || 0;
        var span = el.querySelector('.v');
        if (!span) return;
        if (staticMode || reduced) { span.textContent = target; return; }
        var start = null;
        var dur = 1100;
        function step(ts) {
          if (!start) start = ts;
          var p = Math.min(1, (ts - start) / dur);
          var eased = 1 - Math.pow(1 - p, 3);
          span.textContent = Math.round(eased * target);
          if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
      } catch (e) { /* noop */ }
    }

    // ---- IntersectionObserver: reveal + count-up + hero exit ----
    if ('IntersectionObserver' in window) {
      var revealIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            revealIO.unobserve(entry.target);
          }
        });
      }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
      document.querySelectorAll('[data-reveal]').forEach(function (el) { revealIO.observe(el); });
      document.querySelectorAll('[data-reveal-group] > *').forEach(function (el, i) {
        el.setAttribute('data-reveal', el.getAttribute('data-reveal') || '');
        el.style.setProperty('--i', i);
        revealIO.observe(el);
      });

      var statIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) { countUp(entry.target); statIO.unobserve(entry.target); }
        });
      }, { threshold: 0.4 });
      document.querySelectorAll('.hero-stat .num[data-count]').forEach(function (el) { statIO.observe(el); });

      var hero = document.getElementById('homeHero');
      if (hero) {
        var heroIO = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            hero.classList.toggle('hero-exit', !entry.isIntersecting);
          });
        }, { threshold: 0 });
        heroIO.observe(hero);
      }
    } else {
      document.querySelectorAll('[data-reveal]').forEach(function (el) { el.classList.add('in-view'); });
      document.querySelectorAll('.hero-stat .num[data-count]').forEach(countUp);
    }

    // ---- cursor-origin fill for aurora buttons ----
    if (!staticMode && !reduced) {
      document.querySelectorAll('.btn-aurora').forEach(function (btn) {
        btn.addEventListener('mousemove', function (e) {
          try {
            var r = btn.getBoundingClientRect();
            btn.style.setProperty('--ox', ((e.clientX - r.left) / r.width * 100) + '%');
            btn.style.setProperty('--oy', ((e.clientY - r.top) / r.height * 100) + '%');
          } catch (e2) { /* noop */ }
        });
      });
    }
  } catch (err) {
    /* Decorative layer only — never let this reach the console loudly in prod flows */
    if (window.console && console.warn) console.warn('sf-fable decorative layer skipped:', err);
  }
})();
