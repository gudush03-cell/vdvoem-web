(() => {
  const home = /\/(?:index\.html)?$/.test(location.pathname);
  const purchase = location.pathname.endsWith('secure-purchase.html');
  const icon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m21 3-3.3 17-5.4-4-2.8 2.7.5-5.3L18 6 7.5 12.5 2 10.8Z"/></svg>';
  function navigation() {
    const nav = document.createElement('nav');
    nav.className = 'floating-nav'; nav.setAttribute('aria-label', 'Навигация');
    if (!home) {
      const back = document.createElement('a'); back.href = './index.html#top';
      back.textContent = 'На главную'; nav.append(back);
    }
    const tg = document.createElement('a'); tg.className = 'tg-orb';
    tg.href = './secure-game.html'; tg.innerHTML = icon;
    tg.setAttribute('aria-label', 'Войти в игру через Telegram'); nav.append(tg);
    return nav;
  }
  document.body.append(navigation());
  function sheet(content) {
    const dialog = document.createElement('dialog'); dialog.className = 'flow-sheet'; dialog.tabIndex=-1;
    dialog.setAttribute('aria-label', purchase ? 'Покупка и доступ к игре' : 'Вход в игру');
    dialog.append(navigation(), content); document.body.append(dialog);
    dialog.addEventListener('cancel', e => { e.preventDefault(); location.assign('./index.html#top'); });
    return dialog;
  }
  if (purchase) {
    document.body.classList.add('purchase-page');
    const main = document.querySelector('body>main');
    if (main) {const dialog=sheet(main);dialog.showModal();dialog.focus({preventScroll:true});}
  } else {
    const login = document.getElementById('loginView');
    if (login) {
      const dialog = sheet(login);
      const sync = () => { if (login.hidden) { if (dialog.open) dialog.close(); } else if (!dialog.open) {dialog.showModal();dialog.focus({preventScroll:true});} };
      new MutationObserver(sync).observe(login, {attributes:true,attributeFilter:['hidden']}); sync();
    }
  }
  const guide = document.querySelector('#lobbyView .game-guide');
  if (guide) {
    const details = document.createElement('details'); details.className = 'guide-disclosure';
    const summary = document.createElement('summary'); summary.textContent = '📖 Как играть';
    guide.before(details); details.append(summary, guide);
  }
  function accountBadge() {
    const state = document.documentElement.dataset.account;
    const badge = document.getElementById('headerTelegramVerified');
    const verified = state === 'member' || state === 'paid' || (badge && !badge.hidden) || document.documentElement.dataset.purchaseVerified === 'true';
    document.querySelectorAll('.tg-orb').forEach(el => {
      el.dataset.verified = String(Boolean(verified));
      el.setAttribute('aria-label', verified ? 'Telegram подключён. Открыть игру' : 'Войти в игру через Telegram');
      el.title = verified ? 'Telegram подключён' : 'Войти через Telegram';
    });
  }
  new MutationObserver(accountBadge).observe(document.documentElement,{attributes:true,attributeFilter:['data-account','data-purchase-verified']});
  const badge = document.getElementById('headerTelegramVerified');
  if (badge) new MutationObserver(accountBadge).observe(badge,{attributes:true,attributeFilter:['hidden']});
  accountBadge();
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target);}
    }),{threshold:.08});
    document.querySelectorAll('.deck-tile,.feature-card,.faq-item,.section').forEach(el=>{el.classList.add('touch-reveal');observer.observe(el);});
  }
})();
