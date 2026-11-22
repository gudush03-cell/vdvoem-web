/* Non-invasive event instrumentation for vdvoem-web.
 * No analytics provider or remote transport is installed by this file.
 * To collect metrics, connect a consent-aware analytics platform to
 * the "vdvoem:analytics" event or the existing dataLayer.
 * Never send access codes, claim tokens or paid card contents.
 */
(() => {
  'use strict';
  const allowed = new Set([
    'demo_start', 'demo_complete', 'checkout_click',
    'checkout_view', 'checkout_start', 'payment_redirect',
    'purchase_confirmed', 'telegram_open'
  ]);
  window.vdvoemTrack = function (name, properties = {}) {
    if (!allowed.has(name)) return;
    const safe = {
      event: name,
      source: String(properties.source || 'website').slice(0, 48)
    };
    if (name === 'purchase_confirmed') {
      safe.payment_mode = 'unverified';
      // A server-reported "paid" response may represent a TEST payment.
      // Do not classify as real revenue until server mode is verified.
    }
    document.dispatchEvent(new CustomEvent('vdvoem:analytics', { detail: safe }));
    if (Array.isArray(window.dataLayer)) {
      window.dataLayer.push({ event: 'vdvoem_' + name, source: safe.source, payment_mode: safe.payment_mode });
    }
  };
  document.addEventListener('click', event => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest('[data-start-demo]')) {
      window.vdvoemTrack('demo_start', { source: 'landing' });
      return;
    }
    if (target.closest('#buy')) {
      window.vdvoemTrack('checkout_start', { source: 'purchase_page' });
      return;
    }
    const anchor = target.closest('a[href]');
    if (!anchor) return;
    const href = anchor.getAttribute('href') || '';
    try {
      const url = new URL(href, location.href);
      if (url.hostname === 't.me' && url.pathname.toLowerCase().includes('vdvoemnalegkebot')) {
        window.vdvoemTrack('telegram_open', { source: 'landing' });
      } else if (url.origin === location.origin && url.pathname.endsWith('/purchase.html')) {
        window.vdvoemTrack('checkout_click', { source: 'website' });
      }
    } catch {}
  }, { passive: true });
  if (location.pathname.endsWith('/purchase.html')) {
    window.vdvoemTrack('checkout_view', { source: 'purchase_page' });
  }
  const demoFinishPanel = document.getElementById('purchasePanel');
  if (demoFinishPanel) {
    const observer = new MutationObserver(() => {
      if (!demoFinishPanel.hidden) {
        window.vdvoemTrack('demo_complete', { source: 'landing' });
      }
    });
    observer.observe(demoFinishPanel, { attributes: true, attributeFilter: ['hidden'] });
  }
})();
