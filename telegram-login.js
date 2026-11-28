(() => {
  let oidcSdkPromise = null;

  function loadOidcSdk() {
    if (window.Telegram?.Login?.init && window.Telegram?.Login?.open) return Promise.resolve();
    if (oidcSdkPromise) return oidcSdkPromise;
    oidcSdkPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://oauth.telegram.org/js/telegram-login.js?3';
      script.async = true;
      script.onload = () => window.Telegram?.Login?.init
        ? resolve()
        : reject(new Error('Telegram Login library did not initialize.'));
      script.onerror = () => reject(new Error('Telegram Login library failed to load.'));
      document.head.append(script);
    }).catch(error => {
      oidcSdkPromise = null;
      throw error;
    });
    return oidcSdkPromise;
  }

  function appendOidcButton(container, label) {
    if (!document.getElementById('telegram-oidc-button-style')) {
      const style = document.createElement('style');
      style.id = 'telegram-oidc-button-style';
      style.textContent = '.telegram-oidc-button{display:inline-flex;align-items:center;justify-content:center;gap:9px;min-height:44px;padding:0 23px;border:0;border-radius:99px;background:#54a8e8;color:#fff;font:700 15px/1.2 Manrope,system-ui,sans-serif;cursor:pointer;box-shadow:0 5px 18px #2498da24;-webkit-tap-highlight-color:transparent}.telegram-oidc-button:hover{background:#4099dc}.telegram-oidc-button:focus-visible{outline:2px solid #ffd2e2;outline-offset:3px}.telegram-oidc-button svg{width:21px;height:21px;flex:none}';
      document.head.append(style);
    }
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'telegram-oidc-button';
    button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M21.8 3.2 18.5 20c-.25 1.2-.95 1.5-1.94.94l-5.36-3.95-2.59 2.5c-.29.29-.54.54-1.1.54l.39-5.46L17.83 6.4c.42-.39-.09-.6-.65-.21L5.34 13.6.05 11.94c-1.15-.36-1.17-1.15.24-1.7L20.97 2.3c.96-.35 1.8.23.83.9Z"/></svg><span></span>';
    button.querySelector('span').textContent = label;
    button.addEventListener('click', () => window.Telegram.Login.open());
    container.append(button);
  }

  async function mount(container, { apiBase, buttonLabel, onAuth, onError, legacyCallbackName }) {
    if (!container) return 'error';
    container.replaceChildren();
    try {
      const response = await fetch(apiBase + '/api/auth/telegram/oidc-config', {
        method: 'GET', cache: 'no-store', signal: AbortSignal.timeout(12000)
      });
      if (!response.ok) throw new Error('Не удалось загрузить настройки входа Telegram.');
      const config = await response.json();
      if (config.enabled !== true) {
        const script = document.createElement('script');
        script.src = 'https://telegram.org/js/telegram-widget.js?22';
        script.async = true;
        script.setAttribute('data-telegram-login', 'VdvoemNaLegkeBOT');
        script.setAttribute('data-size', 'large');
        script.setAttribute('data-onauth', `${legacyCallbackName}(user)`);
        container.append(script);
        return 'legacy';
      }
      if (!/^[1-9][0-9]{0,19}$/.test(String(config.clientId || '')) ||
          !/^[A-Za-z0-9_-]{43}$/.test(config.nonce || '')) {
        throw new Error('Настройки Telegram Login заполнены неверно.');
      }
      await loadOidcSdk();
      window.Telegram.Login.init({
        client_id: String(config.clientId), scope: ['profile'], lang: 'ru', nonce: config.nonce
      }, onAuth);
      appendOidcButton(container, buttonLabel || 'Войти через Telegram');
      return 'oidc';
    } catch (error) {
      onError?.(error);
      return 'error';
    }
  }

  window.VdvoemTelegramLogin = { mount };
})();
