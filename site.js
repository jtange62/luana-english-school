(() => {
  if (typeof window.gtag !== 'function') return;

  // Owner opt-out: open any page with ?noga to stop loading analytics on this
  // device (works on any network, unlike GA's IP filter); ?ga turns it back on.
  const params = new URLSearchParams(window.location.search);
  const toggled = params.has('noga') || params.has('ga');
  let optedOut = params.has('noga');
  let remembered = true;
  try {
    if (params.has('noga')) localStorage.setItem('luana-noga', '1');
    if (params.has('ga')) localStorage.removeItem('luana-noga');
    optedOut = localStorage.getItem('luana-noga') === '1';
  } catch (error) {
    remembered = false;
  }
  if (toggled) {
    params.delete('noga');
    params.delete('ga');
    const query = params.toString();
    history.replaceState(null, '', window.location.pathname + (query ? `?${query}` : '') + window.location.hash);
    if (!remembered) alert('Analytics setting could not be saved (browser storage is blocked).');
    else alert(optedOut ? 'Analytics is now OFF on this device.' : 'Analytics is now ON for this device.');
  }
  if (optedOut) return;

  // Start tracking promptly without waiting for interaction or slow page assets.
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=G-YBX9T1NJEL';
  document.head.appendChild(script);
})();

// Time-limited offers: [data-offer-until="YYYY-MM-DD"] is removed once that day has
// passed in Japan, and any [data-offer-after] replacement text is shown instead.
// Runs before DOMContentLoaded so the banner height is measured without the offer.
(() => {
  const todayJst = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
  document.querySelectorAll('[data-offer-until]').forEach(element => {
    if (todayJst > element.dataset.offerUntil) element.remove();
  });
  document.querySelectorAll('[data-offer-after]').forEach(element => {
    if (todayJst > element.dataset.offerAfter) element.hidden = false;
  });
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
    let openingImageReady = false;

    const show = index => {
      current = (index + slides.length) % slides.length;
      slides.forEach((slide, slideIndex) => {
        const active = slideIndex === current;
        slide.classList.toggle('is-active', active);
        slide.setAttribute('aria-hidden', String(!active));
        if (active) slide.querySelector('img').loading = 'eager';
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
      if (openingImageReady && !reduceMotion && !document.hidden &&
          !carousel.matches(':hover') && !carousel.contains(document.activeElement)) {
        timer = window.setInterval(() => show(current + 1), 4000);
      }
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

    // Give the opening photo a full viewing interval after it actually loads.
    const openingImage = slides[current].querySelector('img');
    const ready = () => { openingImageReady = true; start(); };
    if (openingImage.complete) ready();
    else {
      openingImage.addEventListener('load', ready, { once: true });
      openingImage.addEventListener('error', ready, { once: true });
    }
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

// Halloween overlay: bats drift across the page (plus glowing jack-o'-lanterns on
// wide screens) through HALLOWEEN_UNTIL in Japan, then stops on its own. Purely
// decorative: no pointer events, hidden from assistive tech, skipped with reduced
// motion, and added after load so it never competes with the page's first paint.
// Self-contained (styles included) so the whole block can be deleted after the season.
window.addEventListener('load', () => {
  const HALLOWEEN_UNTIL = '2026-10-31';
  const todayJst = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
  if (todayJst > HALLOWEEN_UNTIL) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const wing = 'M-2-2C-8-12-20-15-31-10C-28-6-26-1-25 4C-23 0-19 1-17 6C-15 2-11 1-9 5C-7 2-4 1-2 3z';
  const bat = `<svg viewBox="-32 -16 64 24"><g class="hw-wing"><path d="${wing}"/><path d="${wing}" transform="scale(-1 1)"/></g>`
    + '<path d="M-3-3-4-9-1-6h2l3-3-1 6c1 3 1 7-3 9-4-2-4-6-3-9z"/></svg>';
  const pumpkin = '<svg viewBox="0 0 64 56"><path d="M30 10c0-5 2-8 6-9l1 3c-3 1-3 3-3 6z" fill="#3E7A3A"/>'
    + '<ellipse cx="32" cy="32" rx="30" ry="23" fill="#E8761E"/><ellipse cx="32" cy="32" rx="14" ry="23" fill="#F2892B"/>'
    + '<path d="M17 25l7-7 7 7zm16 0l7-7 7 7zM14 36c6 3 12 5 18 5s12-2 18-5c-2 7-9 11-18 11s-16-4-18-11z" fill="#FFE07A"/></svg>';

  // [top %, flight seconds, start delay seconds, width px, right-to-left, colour]
  // Phones show only the first six, so those are spread across the screen.
  const bats = [[14, 19, -4, 58, 0, '#5B3E8C'], [32, 24, -15, 42, 1, '#3E5C9A'], [55, 17, -9, 50, 0, '#2E2A3F'],
                [22, 28, 3, 36, 1, '#8A5BC2'], [70, 21, -1, 46, 1, '#5B3E8C'], [44, 26, 7, 38, 0, '#3E5C9A'],
                [8, 23, 11, 44, 1, '#2E2A3F'], [62, 30, -20, 32, 0, '#8A5BC2'], [38, 20, 14, 48, 0, '#5B3E8C'],
                [78, 25, 5, 34, 1, '#2E2A3F'], [27, 22, -12, 40, 0, '#3E5C9A']];
  const overlay = document.createElement('div');
  overlay.className = 'hw-overlay';
  overlay.setAttribute('aria-hidden', 'true');
  overlay.innerHTML = bats.map(([top, dur, delay, size, rtl, colour]) =>
    `<div class="hw-bat${rtl ? ' hw-rtl' : ''}" style="top:${top}%;width:${size}px;color:${colour};animation-duration:${dur}s;animation-delay:${delay}s">`
    + `<div class="hw-bob" style="animation-delay:${delay / 3}s">${bat}</div></div>`).join('')
    + [[2, 54, 0], [8.5, 40, 0.7], [null, 48, 1.4]].map(([left, size, delay]) =>
      `<div class="hw-pumpkin" style="${left === null ? 'right:3%' : `left:${left}%`};width:${size}px;animation-delay:${delay}s">${pumpkin}</div>`).join('');

  const style = document.createElement('style');
  style.textContent = `
    .hw-overlay { position:fixed; inset:0; z-index:90; pointer-events:none; overflow:hidden; }
    .hw-bat { position:absolute; left:0; animation:hw-fly linear infinite backwards; will-change:transform; }
    .hw-bat.hw-rtl { animation-direction:reverse; }
    .hw-bob { animation:hw-bob 2.6s ease-in-out infinite alternate; }
    .hw-bat svg { display:block; width:100%; fill:currentColor; opacity:.72; }
    .hw-wing { transform-box:fill-box; transform-origin:50% 30%; animation:hw-flap .28s ease-in-out infinite alternate; }
    .hw-pumpkin { position:absolute; bottom:calc(var(--hw-bar, 0px) - 6px); animation:hw-wobble 3.2s ease-in-out infinite alternate; transform-origin:50% 100%; }
    .hw-pumpkin::before { content:""; position:absolute; inset:-35%; border-radius:50%;
      background:radial-gradient(circle, rgba(255,170,60,.55), rgba(255,140,40,0) 65%); animation:hw-glow 1.8s ease-in-out infinite alternate; }
    .hw-pumpkin svg { position:relative; display:block; width:100%; }
    @keyframes hw-fly { from { transform:translateX(-12vw); } to { transform:translateX(112vw); } }
    @keyframes hw-bob { from { transform:translateY(-14px); } to { transform:translateY(14px); } }
    @keyframes hw-flap { from { transform:scaleY(1); } to { transform:scaleY(.5); } }
    @keyframes hw-wobble { from { transform:rotate(-3deg); } to { transform:rotate(3deg); } }
    @keyframes hw-glow { from { opacity:.45; } to { opacity:1; } }
    @media (max-width: 760px) {
      .hw-bat:nth-child(n+7), .hw-pumpkin:nth-child(13) { display:none; }
      .hw-pumpkin { scale:.7; transform-origin:50% 100%; }
    }`;
  document.head.appendChild(style);
  document.body.appendChild(overlay);

  // On phones the pumpkins sit on top of the fixed signup bar rather than behind it.
  const bar = document.querySelector('.mobile-signup-bar');
  const fitAboveBar = () => {
    const height = bar && getComputedStyle(bar).display !== 'none' ? bar.offsetHeight : 0;
    overlay.style.setProperty('--hw-bar', `${height}px`);
  };
  fitAboveBar();
  window.addEventListener('resize', fitAboveBar);
});

// Scroll reveal: cards fade up as they enter the viewport. Content only hides once
// this runs, so pages without JavaScript or with reduced motion stay fully visible.
document.addEventListener('DOMContentLoaded', () => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion || !('IntersectionObserver' in window)) return;

  // Skip anything hidden at load (e.g. filtered gallery sections) so it is never stuck invisible.
  const targets = Array.from(document.querySelectorAll('.fee-card, .cta-box, .preschool-reason, .program-gallery'))
    .filter(element => !element.closest('[hidden]'));
  if (!targets.length) return;

  document.documentElement.classList.add('js-reveal');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const element = entry.target;
      element.classList.add('is-visible');
      observer.unobserve(element);
      // Drop the reveal classes once the fade finishes so hover effects on the card work normally afterwards
      element.addEventListener('transitionend', () => element.classList.remove('reveal-pending', 'is-visible'), { once: true });
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

  targets.forEach(element => {
    element.classList.add('reveal-pending');
    observer.observe(element);
  });
});
