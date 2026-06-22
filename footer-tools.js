/* ============================================================
   Shared footer "quick links" to the tools — used on EVERY page
   (homepage + pomodoro / study-plan / dse-portfolio).
   Reads the single source of truth in tools-data.js
   (window.SITE_TOOLS) — load this AFTER tools-data.js.
   Re-renders when the page toggles <html lang>. No deps.
   ============================================================ */
(function () {
  "use strict";
  var TITLE = { en: "Our Tools", zh: "學習與規劃工具" };

  function lang() {
    var l = (document.documentElement.lang || "").toLowerCase();
    if (l.indexOf("zh") === 0) return "zh";
    if (l) return "en";
    try { return localStorage.getItem("clp_lang") === "zh" ? "zh" : "en"; } catch (e) { return "en"; }
  }
  function render() {
    var host = document.getElementById("footer-links");
    if (!host) return;
    var L = lang();
    var html = '<div class="fl-title">' + TITLE[L] + "</div>";
    (window.SITE_TOOLS || []).forEach(function (t) {
      html += '<a href="' + t.href + '">' + (t.name[L] || t.name.en) + (t.gated ? " 🔒" : "") + "</a>";
    });
    host.innerHTML = html;
  }
  function init() {
    render();
    new MutationObserver(render).observe(document.documentElement,
      { attributes: true, attributeFilter: ["lang"] });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
