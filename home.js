(() => {
  const root = document.getElementById('luana-home');
  if (!root) return;
  const choices = Array.from(root.querySelectorAll('[data-class]'));
  const panels = Array.from(root.querySelectorAll('[data-class-panel]'));
  function selectClass(key) {
    if (!panels.some(panel => panel.dataset.classPanel === key)) return;
    panels.forEach(panel => { panel.hidden = panel.dataset.classPanel !== key; });
    choices.forEach(choice => choice.setAttribute('aria-current', String(choice.dataset.class === key)));
  }
  choices.forEach(choice => choice.addEventListener('click', event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    selectClass(choice.dataset.class);
    if (typeof window.gtag === 'function') window.gtag('event', 'class_selected', { class_name: choice.dataset.class });
  }));
  function selectFromHash() {
    if (location.hash.startsWith('#class-')) selectClass(location.hash.slice(7));
  }
  selectClass('peekaboo');
  selectFromHash();
  window.addEventListener('hashchange', selectFromHash);

  const menu = root.querySelector('.lu-menu');
  const navigation = root.querySelector('#home-navigation');
  function closeMenu() { navigation.classList.remove('open'); menu.setAttribute('aria-expanded', 'false'); }
  menu.addEventListener('click', () => {
    const open = navigation.classList.toggle('open');
    menu.setAttribute('aria-expanded', String(open));
  });
  navigation.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && navigation.classList.contains('open')) { closeMenu(); menu.focus(); }
  });
})();
