/* ============================================================
   PLK No.1 Career Team — front-end app
   Renders the WordPress-style feed, category filter, bilingual
   toggle, and single-post viewer. No build step, no server.
   ============================================================ */
(function () {
  "use strict";

  // ---- i18n labels ----
  var T = {
    en: {
      school: "PLK No.1 W.H. Cheung College", dept: "Career Team", motto: "Dream high and fly high",
      nav_news: "Latest News", nav_team: "Our Team", nav_res: "Resources", nav_pomodoro: "Pomodoro", nav_admin: "Add Post",
      hero_h: "Welcome to the CLP Corner!",
      hero_p: "Here you'll find the latest updates on local universities, mainland universities, foreign universities, and career experience activities.",
      news: "Latest News", team: "Our Team", res: "Resources / Downloads",
      all: "All", local: "Local Universities", mainland: "Mainland Universities", foreign: "Foreign Universities", career: "Career Experience Activities",
      readmore: "Read more →", pinned: "📌 Pinned", none: "No posts in this category yet.",
      footer_about: "We help students explore their interests, plan their academic pathways, and prepare for university and future careers through guidance, workshops, and information sharing.",
      lang: "中文"
    },
    zh: {
      school: "保良局第一張永慶中學", dept: "升學輔導及生涯規劃組", motto: "展翅高飛・逐夢前行",
      nav_news: "最新消息", nav_team: "團隊成員", nav_res: "資源下載", nav_pomodoro: "番茄鐘", nav_admin: "新增貼文",
      hero_h: "歡迎來到生涯規劃專區！",
      hero_p: "在這裡你可以找到本地大學、內地大學、海外大學及職業體驗活動的最新資訊。",
      news: "最新消息", team: "團隊成員", res: "資源 / 下載",
      all: "全部", local: "本地大學", mainland: "內地大學", foreign: "海外大學", career: "職業體驗活動",
      readmore: "閱讀更多 →", pinned: "📌 置頂", none: "此分類暫無貼文。",
      footer_about: "我們透過輔導、工作坊及資訊分享，協助學生探索興趣、規劃學業路徑，為升學及未來事業作好準備。",
      lang: "EN"
    }
  };

  var state = { lang: localStorage.getItem("clp_lang") || "en", filter: "all" };

  // ---- data: seed posts + admin-added posts (localStorage) ----
  function getPosts() {
    var seed = (window.SEED_POSTS || []).slice();
    var extra = [];
    try { extra = JSON.parse(localStorage.getItem("clp_posts") || "[]"); } catch (e) {}
    // admin posts override seed posts with same id
    var byId = {};
    seed.concat(extra).forEach(function (p) { byId[p.id] = p; });
    var all = Object.keys(byId).map(function (k) { return byId[k]; });
    // sort: pinned first, then newest date
    all.sort(function (a, b) {
      if (!!b.pinned !== !!a.pinned) return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
      return (b.date || "").localeCompare(a.date || "");
    });
    return all;
  }

  function L(p, field) { return p[field + "_" + state.lang] || p[field + "_en"] || ""; }
  function t(k) { return T[state.lang][k]; }
  var ICON = { all: "✨", local: "🎓", mainland: "🏛️", foreign: "🌍", career: "💼" };

  function excerpt(s, n) {
    s = (s || "").replace(/\n+/g, " ");
    return s.length > n ? s.slice(0, n).trim() + "…" : s;
  }
  function fmtDate(d) {
    if (!d) return "";
    var dt = new Date(d + "T00:00:00");
    if (isNaN(dt)) return d;
    return dt.toLocaleDateString(state.lang === "zh" ? "zh-HK" : "en-GB",
      { year: "numeric", month: "short", day: "numeric" });
  }

  // ---- render ----
  function render() {
    var tx = T[state.lang];
    document.documentElement.lang = state.lang === "zh" ? "zh-HK" : "en";

    // header / static labels
    setText("brand-dept", tx.dept);
    setText("brand-school", tx.school);
    setText("brand-motto", tx.motto);
    setText("nav-news", tx.nav_news);
    setText("nav-res", tx.nav_res);
    setText("nav-pomodoro", tx.nav_pomodoro);
    setText("hero-h", tx.hero_h);
    setText("hero-p", tx.hero_p);
    setText("title-news", tx.news);
    setText("title-res", tx.res);
    setText("footer-about", tx.footer_about);
    document.querySelector(".langbtn").textContent = tx.lang;

    // filter chips
    var chips = [["all", tx.all], ["local", tx.local], ["mainland", tx.mainland], ["foreign", tx.foreign], ["career", tx.career]];
    var fc = document.getElementById("filters");
    fc.innerHTML = "";
    chips.forEach(function (c) {
      var b = document.createElement("button");
      b.className = "chip" + (state.filter === c[0] ? " active" : "");
      b.textContent = (ICON[c[0]] ? ICON[c[0]] + " " : "") + c[1];
      b.onclick = function () { state.filter = c[0]; render(); };
      fc.appendChild(b);
    });

    // posts grid
    var posts = getPosts().filter(function (p) { return state.filter === "all" || p.category === state.filter; });
    var grid = document.getElementById("grid");
    grid.innerHTML = "";
    if (!posts.length) {
      grid.innerHTML = '<div class="empty-state">' + tx.none + "</div>";
    }
    posts.forEach(function (p) {
      var card = document.createElement("article");
      card.className = "card";
      var thumb = p.image
        ? '<div class="thumb"><img src="' + p.image + '" alt=""></div>'
        : '<div class="thumb empty">' + (ICON[p.category] || "📰") + "</div>";
      card.innerHTML =
        thumb +
        '<div class="pad">' +
          '<span class="tag ' + p.category + '">' + (ICON[p.category] || "") + " " + tx[p.category] + "</span>" +
          (p.pinned ? '<span class="pin">' + tx.pinned + "</span>" : "") +
          "<h3>" + esc(L(p, "title")) + "</h3>" +
          '<div class="meta">' + fmtDate(p.date) + "</div>" +
          '<div class="excerpt">' + esc(excerpt(L(p, "body"), 120)) + "</div>" +
          '<span class="readmore">' + tx.readmore + "</span>" +
        "</div>";
      // Whole card is clickable (with keyboard support for accessibility)
      card.style.cursor = "pointer";
      card.setAttribute("role", "button");
      card.setAttribute("tabindex", "0");
      card.setAttribute("aria-label", L(p, "title"));
      card.onclick = function () { openPost(p); };
      card.onkeydown = function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openPost(p); }
      };
      grid.appendChild(card);
    });

    // resources
    var rl = document.getElementById("resources");
    rl.innerHTML = "";
    (window.RESOURCES || []).forEach(function (r) {
      var li = document.createElement("li");
      li.innerHTML = '<a href="' + r.url + '" target="_blank" rel="noopener">' +
        esc(state.lang === "zh" ? (r.title_zh || r.title_en) : r.title_en) + "</a>";
      rl.appendChild(li);
    });
  }

  function openPost(p) {
    var ov = document.getElementById("overlay");
    document.getElementById("art-title").textContent = L(p, "title");
    document.getElementById("art-meta").textContent = T[state.lang][p.category] + " · " + fmtDate(p.date);
    var cover = document.getElementById("art-cover");
    if (p.image) { cover.src = p.image; cover.style.display = "block"; }
    else { cover.style.display = "none"; }
    document.getElementById("art-body").textContent = L(p, "body");
    ov.classList.add("open");
    document.body.style.overflow = "hidden";
  }
  function closePost() {
    document.getElementById("overlay").classList.remove("open");
    document.body.style.overflow = "";
  }

  function openLightbox(src) {
    if (!src) return;
    document.getElementById("lightbox-img").src = src;
    document.getElementById("lightbox").classList.add("open");
  }
  function closeLightbox() {
    document.getElementById("lightbox").classList.remove("open");
  }

  // ---- helpers ----
  function setText(id, v) { var el = document.getElementById(id); if (el) el.textContent = v; }
  function esc(s) { return (s || "").replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  // ---- init ----
  document.addEventListener("DOMContentLoaded", function () {
    document.querySelector(".langbtn").onclick = function () {
      state.lang = state.lang === "en" ? "zh" : "en";
      localStorage.setItem("clp_lang", state.lang);
      render();
    };
    document.getElementById("closex").onclick = closePost;
    document.getElementById("overlay").addEventListener("click", function (e) {
      if (e.target.id === "overlay") closePost();
    });

    // Click the post photo -> pop out full-size lightbox
    var cover = document.getElementById("art-cover");
    cover.addEventListener("click", function (e) {
      e.stopPropagation();
      openLightbox(cover.getAttribute("src"));
    });
    document.getElementById("lightbox").addEventListener("click", closeLightbox);
    document.getElementById("lb-close").addEventListener("click", function (e) {
      e.stopPropagation(); closeLightbox();
    });

    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      var lb = document.getElementById("lightbox");
      if (lb.classList.contains("open")) closeLightbox();
      else closePost();
    });

    // logo fallback if images/logo.png missing
    var logo = document.getElementById("logo-img");
    logo.onerror = function () {
      var fb = document.createElement("div");
      fb.className = "logo-fallback";
      fb.textContent = "PLK①";
      logo.replaceWith(fb);
    };

    render();
  });
})();
