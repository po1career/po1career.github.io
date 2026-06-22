/* ============================================================
   Floating "back to top" button. Self-contained, no deps.
   Appears after scrolling down; smooth-scrolls to the top.
   Add <script src="back-to-top.js?v=1"></script> to any page.
   ============================================================ */
(function () {
  "use strict";
  function init() {
    if (document.getElementById("to-top")) return;
    var btn = document.createElement("button");
    btn.id = "to-top";
    btn.type = "button";
    btn.setAttribute("aria-label", "Back to top 返回頁頂");
    btn.title = "Back to top 返回頁頂";
    btn.innerHTML =
      '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">' +
      '<path d="M12 5l-7 7h4.2v7h5.6v-7H19z" fill="currentColor"/></svg>';
    btn.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    document.body.appendChild(btn);
    function update() {
      btn.classList.toggle("show", (window.scrollY || window.pageYOffset || document.documentElement.scrollTop) > 400);
    }
    window.addEventListener("scroll", update, { passive: true });
    update();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
