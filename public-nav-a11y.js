/* Public shell navigation semantics. Protected pages use their own header. */
(function () {
  "use strict";

  function labels() {
    return (document.documentElement.lang || "").indexOf("zh") === 0
      ? { menu: "選單", navigation: "主要導覽" }
      : { menu: "Menu", navigation: "Primary navigation" };
  }

  function setup() {
    var nav = document.querySelector("#site-header nav.main");
    if (!nav || nav.dataset.publicNavReady) return;

    var links = nav.querySelector(".nav-links");
    var toggle = nav.querySelector("#nav-toggle");
    var oldBurger = nav.querySelector("#nav-burger");
    if (!links || !oldBurger) return;

    nav.dataset.publicNavReady = "1";
    links.id = "primary-navigation";
    links.setAttribute("aria-label", labels().navigation);

    var burger = document.createElement("button");
    burger.type = "button";
    burger.className = "nav-burger";
    burger.id = "nav-burger";
    burger.textContent = "☰";
    burger.setAttribute("aria-controls", links.id);
    burger.setAttribute("aria-expanded", "false");

    oldBurger.replaceWith(burger);
    if (toggle) toggle.remove();

    Array.prototype.forEach.call(links.querySelectorAll(".navgroup"), function (group, index) {
      var button = group.querySelector(".navgroup-btn");
      var menu = group.querySelector(".navgroup-menu");
      if (!button || !menu) return;
      menu.id = menu.id || "nav-submenu-" + (index + 1);
      button.setAttribute("aria-controls", menu.id);
      if (!button.hasAttribute("aria-expanded")) button.setAttribute("aria-expanded", "false");
    });

    function isMobile() { return window.matchMedia("(max-width: 720px)").matches; }
    function closeMobile(returnFocus) {
      links.classList.remove("nav-open");
      burger.setAttribute("aria-expanded", "false");
      if (returnFocus) burger.focus();
    }
    function updateLabels() {
      var text = labels();
      burger.setAttribute("aria-label", text.menu);
      burger.setAttribute("title", text.menu);
      links.setAttribute("aria-label", text.navigation);
    }

    burger.addEventListener("click", function () {
      if (!isMobile()) return;
      var opening = !links.classList.contains("nav-open");
      links.classList.toggle("nav-open", opening);
      burger.setAttribute("aria-expanded", opening ? "true" : "false");
    });

    links.addEventListener("click", function (event) {
      if (isMobile() && event.target.closest("a")) closeMobile(false);
    });

    document.addEventListener("click", function (event) {
      if (isMobile() && links.classList.contains("nav-open") && !nav.contains(event.target)) closeMobile(false);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        if (isMobile() && links.classList.contains("nav-open")) {
          event.preventDefault();
          closeMobile(true);
          return;
        }
        Array.prototype.forEach.call(links.querySelectorAll(".navgroup"), function (group) {
          if (group.contains(document.activeElement)) {
            var button = group.querySelector(".navgroup-btn");
            if (button) button.focus();
          }
        });
      }
    });

    var mobileQuery = window.matchMedia("(max-width: 720px)");
    function handleViewportChange(event) {
      if (!event.matches) closeMobile(false);
    }
    if (mobileQuery.addEventListener) mobileQuery.addEventListener("change", handleViewportChange);
    else if (mobileQuery.addListener) mobileQuery.addListener(handleViewportChange);
    new MutationObserver(updateLabels).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    updateLabels();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", setup);
  else setup();
})();
