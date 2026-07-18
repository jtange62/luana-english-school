document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('a[target="_blank"]').forEach(link => {
    const rel = new Set((link.getAttribute('rel') || '').split(/\s+/).filter(Boolean));
    rel.add('noopener');
    rel.add('noreferrer');
    link.setAttribute('rel', Array.from(rel).join(' '));
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
