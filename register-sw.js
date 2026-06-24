/* Registers the same-origin service worker (PWA install + offline).
   Kept tiny and separate so pages stay CSP-clean (script-src 'self'). */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('sw.js').catch(function () { /* offline / unsupported — ignore */ });
  });
}
