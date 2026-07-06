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
      nav_news: "Latest News", nav_team: "Our Team", nav_info: "Info", nav_res: "Useful Links", nav_faq: "FAQ & Glossary", nav_parents: "For Parents", nav_studytools: "Study Tools", nav_jupastools: "JUPAS Tools", nav_quiz: "Career Quiz", nav_pathways: "Pathways Explorer", nav_pomodoro: "Pomodoro", nav_studyplan: "Study Plan", nav_dse: "DSE Portfolio", nav_streaming: "Streaming Tool", nav_jupas: "JUPAS Finder", nav_jupaschoices: "JUPAS Choices", nav_admin: "Add Post",
      hero_h: "Welcome to the CLP Corner!",
      hero_p: "Your Career Team hub — university and career news, helpful resources, and study & planning tools, all in one place.",
      title_tools: "Our Tools", students_only: "students only",
      sub_tools: "Study and planning tools to help you revise and map out your path. Some are for students only and need a passcode.",
      news: "Latest News", team: "Our Team", res: "Resources / Downloads",
      all: "All", local: "Local Universities", mainland: "Mainland Universities", foreign: "Foreign Universities", career: "Career Experience Activities",
      readmore: "Read more →", pinned: "📌 Pinned", none: "No posts in this category yet.",
      footer_about: "We help students explore their interests, plan their academic pathways, and prepare for university and future careers through guidance, workshops, and information sharing.",
      lang: "中文"
    },
    zh: {
      school: "保良局第一張永慶中學", dept: "升學輔導及生涯規劃組", motto: "展翅高飛・逐夢前行",
      nav_news: "最新消息", nav_team: "團隊成員", nav_info: "資訊", nav_res: "實用連結", nav_faq: "常見問題", nav_parents: "家長園地", nav_studytools: "學習工具", nav_jupastools: "JUPAS 工具", nav_quiz: "興趣測驗", nav_pathways: "升學出路", nav_pomodoro: "番茄鐘", nav_studyplan: "溫習計劃", nav_dse: "DSE 試卷組合", nav_streaming: "選科工具", nav_jupas: "JUPAS 搜尋器", nav_jupaschoices: "JUPAS 選科", nav_admin: "新增貼文",
      hero_h: "歡迎來到生涯規劃專區！",
      hero_p: "升學輔導及生涯規劃組的資訊平台——大學及職業資訊、實用資源，以及溫習與規劃工具，一站式集合。",
      title_tools: "學習與規劃工具", students_only: "只限學生",
      sub_tools: "助你溫習及規劃升學路向的工具。部分只供學生使用，需輸入通行碼。",
      news: "最新消息", team: "團隊成員", res: "資源 / 下載",
      all: "全部", local: "本地大學", mainland: "內地大學", foreign: "海外大學", career: "職業體驗活動",
      readmore: "閱讀更多 →", pinned: "📌 置頂", none: "此分類暫無貼文。",
      footer_about: "我們透過輔導、工作坊及資訊分享，協助學生探索興趣、規劃學業路徑，為升學及未來事業作好準備。",
      lang: "EN"
    }
  };

  // Tools data lives in tools-data.js (window.SITE_TOOLS) — single source of truth.

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
    setText("hero-h", tx.hero_h);
    setText("hero-p", tx.hero_p);
    setText("title-news", tx.news);
    setText("title-tools", tx.title_tools);
    setText("sub-tools", tx.sub_tools);
    setText("footer-about", tx.footer_about);

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
        ? '<div class="thumb"><img src="' + esc(p.image) + '" alt="" loading="lazy" decoding="async"></div>'
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

    renderTools();
  }

  // ---- tools section (homepage cards). Footer quick-links: footer-tools.js ----
  function toolField(td, field) { return (td[field] && td[field][state.lang]) || td[field].en; }
  function renderTools() {
    var host = document.getElementById("tools");
    if (!host) return;
    var tx = T[state.lang];
    host.innerHTML = "";
    ["jupastools", "studytools"].forEach(function (groupKey) {
      var items = (window.SITE_TOOLS || []).filter(function (td) { return td.group === groupKey; });
      if (!items.length) return;
      var h = document.createElement("h3");
      h.className = "tools-grouptitle";
      h.textContent = tx["nav_" + groupKey];
      host.appendChild(h);
      var grid = document.createElement("div");
      grid.className = "tools-grid";
      items.forEach(function (td) {
        var a = document.createElement("a");
        a.className = "tool-card";
        a.href = td.href;
        a.innerHTML =
          '<span class="tool-ic" aria-hidden="true">' + td.icon + "</span>" +
          '<span class="tool-body">' +
            '<span class="tool-name">' + esc(toolField(td, "name")) + "</span>" +
            '<span class="tool-desc">' + esc(toolField(td, "desc")) + "</span>" +
            '<span class="tool-tags">' +
              '<span class="tool-aud">' + esc(toolField(td, "aud")) + "</span>" +
              (td.gated ? '<span class="tool-lock">🔒 ' + esc(tx.students_only) + "</span>" : "") +
            "</span>" +
          "</span>";
        grid.appendChild(a);
      });
      host.appendChild(grid);
    });
  }

  var postTrigger = null, lbTrigger = null;
  function openPost(p) {
    var ov = document.getElementById("overlay");
    document.getElementById("art-title").textContent = L(p, "title");
    document.getElementById("art-meta").textContent = T[state.lang][p.category] + " · " + fmtDate(p.date);
    var cover = document.getElementById("art-cover");
    if (p.image) {
      cover.src = p.image; cover.style.display = "block";
      cover.setAttribute("aria-label", state.lang === "zh" ? "檢視大圖" : "View photo full size");
    } else { cover.style.display = "none"; }
    document.getElementById("art-body").textContent = L(p, "body");
    postTrigger = document.activeElement;
    ov.setAttribute("aria-hidden", "false");
    ov.classList.add("open");
    document.body.style.overflow = "hidden";
    document.getElementById("closex").focus();
  }
  function closePost() {
    var ov = document.getElementById("overlay");
    ov.classList.remove("open");
    ov.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    if (postTrigger && postTrigger.focus) postTrigger.focus();
  }

  function openLightbox(src) {
    if (!src) return;
    lbTrigger = document.activeElement;
    document.getElementById("lightbox-img").src = src;
    var lb = document.getElementById("lightbox");
    lb.setAttribute("aria-hidden", "false");
    lb.classList.add("open");
    document.getElementById("lb-close").focus();
  }
  function closeLightbox() {
    var lb = document.getElementById("lightbox");
    lb.classList.remove("open");
    lb.setAttribute("aria-hidden", "true");
    if (lbTrigger && lbTrigger.focus) lbTrigger.focus();
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
    cover.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openLightbox(cover.getAttribute("src"));
      }
    });
    document.getElementById("lightbox").addEventListener("click", closeLightbox);
    document.getElementById("lb-close").addEventListener("click", function (e) {
      e.stopPropagation(); closeLightbox();
    });

    document.addEventListener("keydown", function (e) {
      var lb = document.getElementById("lightbox");
      var ov = document.getElementById("overlay");
      var dlg = lb.classList.contains("open") ? lb : (ov.classList.contains("open") ? ov : null);
      if (e.key === "Escape") {
        if (lb.classList.contains("open")) closeLightbox();
        else if (ov.classList.contains("open")) closePost();
        return;
      }
      if (e.key === "Tab" && dlg) {
        var f = dlg.querySelectorAll('a[href],button,[tabindex]:not([tabindex="-1"]),input,textarea,select');
        f = Array.prototype.filter.call(f, function (el) { return el.offsetParent !== null; });
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
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
