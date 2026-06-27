/* ============================================================
   Accessible navigation dropdowns (disclosure pattern).
   The CSS already opens the menus on :hover / :focus-within and,
   on mobile, shows them as static sections. This script only:
     - keeps aria-expanded in sync for screen-reader users, and
     - lets keyboard users jump into a menu with Enter / Space / ArrowDown,
     - returns focus to the button on Escape.
   Purely additive — no markup or CSS changes required.
   ============================================================ */
(function () {
  var desktop = window.matchMedia('(min-width: 721px)');
  function each(sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); }

  function setState(g) {
    var btn = g.querySelector('.navgroup-btn');
    if (!btn) return;
    if (!desktop.matches) { btn.setAttribute('aria-expanded', 'true'); return; } // mobile = static section
    var open = g.contains(document.activeElement) || g.matches(':hover');
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function wire() {
    each('nav.main .navgroup', function (g) {
      var btn = g.querySelector('.navgroup-btn');
      var menu = g.querySelector('.navgroup-menu');
      if (!btn || !menu || btn.dataset.navWired) return;
      btn.dataset.navWired = '1';
      setState(g);
      g.addEventListener('mouseenter', function () { setState(g); });
      g.addEventListener('mouseleave', function () { setTimeout(function () { setState(g); }, 0); });
      g.addEventListener('focusin', function () { setState(g); });
      g.addEventListener('focusout', function () { setTimeout(function () { setState(g); }, 0); });
      btn.addEventListener('keydown', function (e) {
        if (desktop.matches && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) {
          var first = menu.querySelector('a');
          if (first) { e.preventDefault(); first.focus(); }
        }
      });
      menu.addEventListener('keydown', function (e) { if (e.key === 'Escape') btn.focus(); });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();
  if (desktop.addEventListener) desktop.addEventListener('change', function () { each('nav.main .navgroup', setState); });
})();
