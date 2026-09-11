(() => {
  if (typeof window.gtag !== 'function') return;

  let loaded = false;
  const interactionEvents = ['pointerdown', 'keydown', 'scroll'];

  const loadAnalytics = () => {
    if (loaded) return;
    loaded = true;
    interactionEvents.forEach(eventName => window.removeEventListener(eventName, loadAnalytics));
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=G-YBX9T1NJEL';
    document.head.appendChild(script);
  };

  interactionEvents.forEach(eventName => window.addEventListener(eventName, loadAnalytics, {
    once: true,
    passive: true
  }));
  window.addEventListener('load', () => window.setTimeout(loadAnalytics, 5000), { once: true });
})();

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-hero-carousel]').forEach(carousel => {
    const slides = Array.from(carousel.querySelectorAll('[data-hero-slide]'));
    const captions = Array.from(carousel.querySelectorAll('[data-hero-caption]'));
    const dots = Array.from(carousel.querySelectorAll('[data-hero-dot]'));
    const previous = carousel.querySelector('[data-hero-prev]');
    const next = carousel.querySelector('[data-hero-next]');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let current = 0;
    let timer = null;

    const show = index => {
      current = (index + slides.length) % slides.length;
      slides.forEach((slide, slideIndex) => {
        const active = slideIndex === current;
        slide.classList.toggle('is-active', active);
        slide.setAttribute('aria-hidden', String(!active));
      });
      captions.forEach((caption, captionIndex) => caption.classList.toggle('is-active', captionIndex === current));
      dots.forEach((dot, dotIndex) => dot.setAttribute('aria-current', String(dotIndex === current)));
    };

    const stop = () => {
      if (timer) window.clearInterval(timer);
      timer = null;
    };
    const start = () => {
      stop();
      if (!reduceMotion && !document.hidden) timer = window.setInterval(() => show(current + 1), 4000);
    };

    previous?.addEventListener('click', () => { show(current - 1); start(); });
    next?.addEventListener('click', () => { show(current + 1); start(); });
    dots.forEach((dot, index) => dot.addEventListener('click', () => { show(index); start(); }));
    carousel.addEventListener('mouseenter', stop);
    carousel.addEventListener('mouseleave', start);
    carousel.addEventListener('focusin', stop);
    carousel.addEventListener('focusout', event => {
      if (!carousel.contains(event.relatedTarget)) start();
    });
    document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());

    // The head script picks the opening slide so it can preload that image;
    // honour it here. Absent or malformed, the markup's own is-active stands.
    const startIndex = Number(document.documentElement.dataset.heroStart);
    if (Number.isInteger(startIndex) && startIndex >= 0 && startIndex < slides.length) show(startIndex);

    start();
  });

  document.querySelectorAll('.nav-links a').forEach(link => {
    const target = new URL(link.href, window.location.href);
    if (target.pathname === window.location.pathname && !target.hash) {
      link.setAttribute('aria-current', 'page');
    }
  });

  document.querySelectorAll('a[target="_blank"]').forEach(link => {
    const rel = new Set((link.getAttribute('rel') || '').split(/\s+/).filter(Boolean));
    rel.add('noopener');
    rel.add('noreferrer');
    link.setAttribute('rel', Array.from(rel).join(' '));
  });

  document.querySelectorAll('[data-history-back]').forEach(link => {
    link.addEventListener('click', event => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      try {
        const previousPage = new URL(document.referrer);
        if (history.length <= 1 || previousPage.origin !== window.location.origin) return;
      } catch {
        return;
      }

      event.preventDefault();
      history.back();
    });
  });

  document.querySelectorAll('.hamburger').forEach((button, index) => {
    const menu = button.parentElement.querySelector('.nav-links') || document.querySelector('.nav-links');
    if (!menu) return;

    if (!menu.id) menu.id = `primary-navigation-${index + 1}`;
    button.setAttribute('aria-controls', menu.id);
    button.setAttribute('aria-expanded', menu.classList.contains('open') ? 'true' : 'false');
    if (button.getAttribute('aria-label') === 'Menu') button.setAttribute('aria-label', 'メニューを開く');

    const syncState = () => {
      const isOpen = menu.classList.contains('open');
      button.setAttribute('aria-expanded', String(isOpen));
      button.setAttribute('aria-label', isOpen ? 'メニューを閉じる' : 'メニューを開く');
    };

    button.addEventListener('click', () => requestAnimationFrame(syncState));
    menu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
      menu.classList.remove('open');
      syncState();
    }));

    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape' || !menu.classList.contains('open')) return;
      menu.classList.remove('open');
      syncState();
      button.focus();
    });
  });
});
