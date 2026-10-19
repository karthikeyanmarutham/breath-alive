/* BreatheAlive — enhanced interactions */

(function () {
  'use strict';

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* --------------------------------------------------------
     1. Sticky header state
     -------------------------------------------------------- */
  const header = document.querySelector('.header');
  const onScrollHeader = () => {
    if (!header) return;
    header.classList.toggle('is-scrolled', window.scrollY > 8);
  };
  onScrollHeader();
  window.addEventListener('scroll', onScrollHeader, { passive: true });

  /* --------------------------------------------------------
     2. Mobile drawer
     -------------------------------------------------------- */
  const menuBtn = document.querySelector('[data-menu-open]');
  const drawer = document.querySelector('[data-drawer]');
  const closeBtn = document.querySelector('[data-menu-close]');

  const openDrawer = () => {
    if (!drawer) return;
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    menuBtn && menuBtn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    closeBtn && closeBtn.focus();
  };
  const closeDrawer = () => {
    if (!drawer) return;
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    menuBtn && menuBtn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    menuBtn && menuBtn.focus();
  };

  menuBtn && menuBtn.setAttribute('aria-expanded', 'false');
  menuBtn && menuBtn.addEventListener('click', openDrawer);
  closeBtn && closeBtn.addEventListener('click', closeDrawer);
  drawer && drawer.addEventListener('click', (e) => {
    if (e.target.tagName === 'A') closeDrawer();
  });
  document.addEventListener('keydown', (e) => {
    if (!drawer || !drawer.classList.contains('is-open')) return;
    if (e.key === 'Escape') { closeDrawer(); return; }

    /* Focus trap: while the full-screen menu is open, Tab must cycle
       inside it — otherwise keyboard users fall back to the page hidden
       underneath the overlay. */
    if (e.key !== 'Tab') return;
    const focusables = drawer.querySelectorAll('a[href], button:not([disabled])');
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (!drawer.contains(document.activeElement)) {
      e.preventDefault();
      (e.shiftKey ? last : first).focus();
      return;
    }
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  /* If the viewport grows past the desktop breakpoint (tablet rotation,
     window resize) the hamburger is hidden — close the drawer so the
     screen is never left covered by an unreachable overlay. */
  window.addEventListener('resize', () => {
    if (drawer && drawer.classList.contains('is-open') && window.innerWidth > 1100) {
      closeDrawer();
    }
  }, { passive: true });

  /* --------------------------------------------------------
     3. Reveal on scroll (with stagger inside grids)
     -------------------------------------------------------- */
  const revealEls = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window && revealEls.length) {
    // auto-stagger children of grids
    document.querySelectorAll('.grid-2, .grid-3, .grid-4, .stats-grid, .steps, .trust-strip__inner').forEach((grid) => {
      const kids = grid.querySelectorAll('[data-reveal]');
      kids.forEach((el, i) => {
        el.style.setProperty('--reveal-delay', `${i * 70}ms`);
      });
    });

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('is-visible'));
  }

  /* --------------------------------------------------------
     4. Animated number counters
     -------------------------------------------------------- */
  const counters = document.querySelectorAll('[data-counter]');
  if (counters.length && 'IntersectionObserver' in window) {
    const easeOut = (t) => 1 - Math.pow(1 - t, 3);

    const animateCounter = (el) => {
      const target = parseInt(el.getAttribute('data-counter'), 10) || 0;
      const suffix = el.getAttribute('data-suffix') || '';
      const numEl = el.querySelector('.stat__num');
      if (!numEl) return;

      if (prefersReduced) { numEl.textContent = target + suffix; return; }

      const duration = 1600;
      const start = performance.now();

      const tick = (now) => {
        const p = Math.min((now - start) / duration, 1);
        const val = Math.floor(easeOut(p) * target);
        numEl.textContent = val + (p === 1 ? suffix : '');
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    const counterIO = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          counterIO.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });

    counters.forEach((c) => counterIO.observe(c));
  }

  /* --------------------------------------------------------
     5. Parallax on scroll (hero visual, connection, orbs)
     -------------------------------------------------------- */
  /* Parallax is desktop-only by design:
     - on phones/tablets it costs main-thread scroll work for an effect
       that is barely visible on a small viewport, and
     - on touch devices the effect fights with momentum scrolling.
     Anything else (reduced-motion users included) keeps the subtle depth. */
  const parallaxAllowed =
    !prefersReduced &&
    window.matchMedia('(min-width: 769px) and (hover: hover) and (pointer: fine)').matches;

  if (parallaxAllowed) {
    const parallaxTargets = [
      ...document.querySelectorAll('[data-parallax]'),
      document.querySelector('.hero__visual'),
      document.querySelector('.connection')
    ].filter(Boolean);

    let ticking = false;

    const updateParallax = () => {
      const vh = window.innerHeight;
      parallaxTargets.forEach((el) => {
        const speed = parseFloat(el.getAttribute('data-parallax')) || 0.06;
        const rect = el.getBoundingClientRect();
        // only animate if element is near viewport
        if (rect.bottom < -200 || rect.top > vh + 200) return;
        const offset = (rect.top + rect.height / 2 - vh / 2);
        const translateY = -offset * speed;
        el.style.transform = `translate3d(0, ${translateY.toFixed(2)}px, 0)`;
      });
      ticking = false;
    };

    const onScrollParallax = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateParallax);
        ticking = true;
      }
    };

    updateParallax();
    window.addEventListener('scroll', onScrollParallax, { passive: true });
    window.addEventListener('resize', onScrollParallax);
  }

  /* --------------------------------------------------------
     6. Line-draw for connection diagram
     -------------------------------------------------------- */
  const connection = document.querySelector('.connection');
  if (connection && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });
    io.observe(connection);
  }

  /* --------------------------------------------------------
     7. Scroll progress bar
     -------------------------------------------------------- */
  const progress = document.querySelector('.scroll-progress');
  if (progress) {
    let ticking = false;
    const updateProgress = () => {
      const h = document.documentElement;
      const scrolled = h.scrollTop / (h.scrollHeight - h.clientHeight || 1);
      progress.style.width = (scrolled * 100).toFixed(2) + '%';
      ticking = false;
    };
    /* Coalesced into one rAF per frame so scrolling never triggers more
       than one style/layout read, no matter how fast the user scrolls. */
    const onScrollProgress = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(updateProgress);
    };
    updateProgress();
    window.addEventListener('scroll', onScrollProgress, { passive: true });
    window.addEventListener('resize', onScrollProgress, { passive: true });
  }

  /* --------------------------------------------------------
     8. Booking form UX
     -------------------------------------------------------- */
  document.querySelectorAll('.form input, .form select, .form textarea').forEach((el) => {
    el.addEventListener('focus', () => document.body.classList.add('form-active'));
    el.addEventListener('blur', () => document.body.classList.remove('form-active'));
  });

  /* --------------------------------------------------------
     9. FAQ: one open at a time
     -------------------------------------------------------- */
  const faqItems = document.querySelectorAll('.faq details');
  faqItems.forEach((item) => {
    item.addEventListener('toggle', () => {
      if (item.open) {
        faqItems.forEach((other) => { if (other !== item) other.open = false; });
      }
    });
  });

  /* --------------------------------------------------------
     10. Static form placeholder
     -------------------------------------------------------- */
  document.querySelectorAll('form[data-static-form]').forEach((form) => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const status = form.querySelector('[data-form-status]');
      if (status) {
        /* Live region so screen readers announce the confirmation
           instead of the message silently replacing text on screen. */
        status.setAttribute('role', 'status');
        status.setAttribute('aria-live', 'polite');
        status.textContent = 'Thank you — we will contact you shortly.';
        status.style.color = 'var(--color-primary)';
      }
      form.reset();
    });
  });
})();