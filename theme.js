/* ============================================================
   Light / dark theme. Loaded SYNCHRONOUSLY in <head> so the
   saved/system theme is applied before first paint (no flash).
   - default: follow the system (prefers-color-scheme)
   - manual choice is remembered in localStorage['clp_theme']
   The header .themebtn toggles and persists it.
   ============================================================ */
(function () {
  var KEY = 'clp_theme';
  function systemDark() {
    return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  }
  function saved() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function resolve() { var s = saved(); return s === 'dark' || s === 'light' ? s : (systemDark() ? 'dark' : 'light'); }
  function apply(t) { document.documentElement.setAttribute('data-theme', t); }

  apply(resolve()); // runs in <head> — before body renders

  function syncButtons() {
    var dark = document.documentElement.getAttribute('data-theme') === 'dark';
    var labels = { en: dark ? 'Light mode' : 'Dark mode', zh: dark ? '淺色模式' : '深色模式' };
    var lang = document.documentElement.lang && document.documentElement.lang.indexOf('zh') === 0 ? 'zh' : 'en';
    document.querySelectorAll('.themebtn').forEach(function (b) {
      b.textContent = dark ? '☀️' : '🌙';
      b.setAttribute('aria-pressed', dark ? 'true' : 'false');
      b.setAttribute('aria-label', labels[lang]);
      b.setAttribute('title', labels[lang]);
    });
  }

  function wire() {
    document.querySelectorAll('.themebtn').forEach(function (b) {
      b.addEventListener('click', function () {
        var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        try { localStorage.setItem(KEY, next); } catch (e) {}
        apply(next);
        syncButtons();
      });
    });
    syncButtons();
    // keep the icon in sync when the language toggle flips <html lang>
    new MutationObserver(syncButtons).observe(document.documentElement, { attributes: true, attributeFilter: ['lang', 'data-theme'] });
    // follow the system if the user hasn't made an explicit choice
    if (window.matchMedia) {
      try {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
          if (!saved()) { apply(e.matches ? 'dark' : 'light'); syncButtons(); }
        });
      } catch (e) {}
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();
})();
