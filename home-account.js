(() => {
  const root = document.documentElement;
  const status = document.getElementById('homeAccountStatus');
  const tokenKey = 'vdvoem.preview.token';
  let latest = 0;

  async function refresh() {
    const request = ++latest;
    let token;
    try { token = sessionStorage.getItem(tokenKey); } catch {}
    if (!token) {
      root.dataset.account = 'guest';
      return;
    }
    root.dataset.account = 'checking';
    status.textContent = 'Проверяем доступ к игре…';
    try {
      const response = await fetch('https://perceptive-patience-production-79bfb421.up.railway.app/api/account/status', {
        cache: 'no-store',
        headers: { Authorization: 'Bearer ' + token },
        signal: AbortSignal.timeout(12000)
      });
      if (latest !== request || sessionStorage.getItem(tokenKey) !== token) return;
      if (response.status === 401) {
        sessionStorage.removeItem(tokenKey);
        sessionStorage.removeItem('vdvoem.preview.telegram');
        root.dataset.account = 'guest';
        return;
      }
      if (!response.ok) throw Error();
      const account = await response.json();
      if (latest !== request || sessionStorage.getItem(tokenKey) !== token) return;
      if (account.signedIn !== true || typeof account.paid !== 'boolean') throw Error();
      root.dataset.account = account.paid ? 'paid' : 'member';
    } catch {
      if (latest !== request) return;
      root.dataset.account = 'retry';
      status.textContent = 'Не удалось проверить доступ. Откройте игру, чтобы повторить.';
    }
  }
  refresh();
  window.addEventListener('pageshow', event => { if (event.persisted) refresh(); });
})();
