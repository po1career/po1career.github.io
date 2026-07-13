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
      start_title: "Start with what you need today",
      start_sub: "Choose a starting point by your year level or goal. You can explore the public tools first, then use school-access tools when they apply.",
      start_pathways_eyebrow: "F.3–F.4", start_pathways_title: "Choosing F.4 subjects",
      start_pathways_desc: "Explore the routes after the HKDSE and use them to guide your subject choices.", start_pathways_link: "Explore pathways",
      start_study_eyebrow: "All forms", start_study_title: "Planning my study",
      start_study_desc: "Turn your exam dates into a practical revision timetable.", start_study_link: "Build a study plan",
      start_jupas_eyebrow: "F.5–F.6", start_jupas_title: "Preparing for JUPAS",
      start_jupas_desc: "Compare degree programmes by subject, school, or keyword. School access is required.", start_jupas_link: "Open JUPAS Finder",
      title_tools: "Our Tools", students_only: "students only",
      sub_tools: "Study and planning tools to help you revise and map out your path. Some are for students only and need a passcode.",
      tool_access: "School passcode required — ask the Career Team", tool_open: "Open tool",
      news: "Latest News", team: "Our Team", res: "Resources / Downloads",
      all: "All", local: "Local Universities", mainland: "Mainland Universities", foreign: "Foreign Universities", career: "Career Experience Activities",
      readmore: "Read more", pinned: "Pinned", none: "No posts in this category yet.",
      footer_about: "We help students explore their interests, plan their academic pathways, and prepare for university and future careers through guidance, workshops, and information sharing.",
      lang: "中文"
    },
    zh: {
      school: "保良局第一張永慶中學", dept: "升學輔導及生涯規劃組", motto: "展翅高飛・逐夢前行",
      nav_news: "最新消息", nav_team: "團隊成員", nav_info: "資訊", nav_res: "實用連結", nav_faq: "常見問題", nav_parents: "家長園地", nav_studytools: "學習工具", nav_jupastools: "JUPAS 工具", nav_quiz: "興趣測驗", nav_pathways: "升學出路", nav_pomodoro: "番茄鐘", nav_studyplan: "溫習計劃", nav_dse: "DSE 試卷組合", nav_streaming: "選科工具", nav_jupas: "JUPAS 搜尋器", nav_jupaschoices: "JUPAS 選科", nav_admin: "新增貼文",
      hero_h: "歡迎來到生涯規劃專區！",
      hero_p: "升學輔導及生涯規劃組的資訊平台——大學及職業資訊、實用資源，以及溫習與規劃工具，一站式集合。",
      start_title: "從今天需要的事情開始",
      start_sub: "按你的年級或目標選擇起點。你可先探索公開工具，再按需要使用校內通行碼工具。",
      start_pathways_eyebrow: "中三至中四", start_pathways_title: "選擇中四選修科",
      start_pathways_desc: "探索文憑試後的出路，為選科作好準備。", start_pathways_link: "探索升學出路",
      start_study_eyebrow: "各級適用", start_study_title: "規劃我的溫習",
      start_study_desc: "按考試日期建立實用的溫習時間表。", start_study_link: "建立溫習計劃",
      start_jupas_eyebrow: "中五至中六", start_jupas_title: "準備 JUPAS 申請",
      start_jupas_desc: "按學科、院校或關鍵字比較大學課程。需要校內通行碼。", start_jupas_link: "開啟 JUPAS 搜尋器",
      title_tools: "學習與規劃工具", students_only: "只限學生",
      sub_tools: "助你溫習及規劃升學路向的工具。部分只供學生使用，需輸入通行碼。",
      tool_access: "需要校內通行碼 — 請向升學輔導及生涯規劃組查詢", tool_open: "開啟工具",
      news: "最新消息", team: "團隊成員", res: "資源 / 下載",
      all: "全部", local: "本地大學", mainland: "內地大學", foreign: "海外大學", career: "職業體驗活動",
      readmore: "閱讀更多", pinned: "置頂", none: "此分類暫無貼文。",
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
  var TOOL_ICON_SVG = {
    quiz: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="16" cy="16" r="10"/><circle cx="16" cy="16" r="4"/><path d="M16 3v3M16 26v3M3 16h3M26 16h3"/></svg>',
    pathways: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 28V5M8 8h11l4 4-4 4H8M8 16h8l4 4-4 4H8"/><circle cx="8" cy="28" r="2"/></svg>',
    pomodoro: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="16" cy="18" r="10"/><path d="M12 4h8M16 8V4M16 18l5-4M7 9l-2 2M25 9l2 2"/></svg>',
    studyplan: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="7" width="24" height="21" rx="3"/><path d="M10 4v6M22 4v6M4 13h24M9 21l3 3 7-7"/></svg>',
    dse: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3h13l5 5v21H7zM20 3v6h5"/><path d="M11 24v-5M16 24v-9M21 24v-12"/></svg>',
    streaming: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="7" cy="16" r="3"/><circle cx="25" cy="8" r="3"/><circle cx="25" cy="24" r="3"/><path d="M10 16h6M16 16V8h6M16 16v8h6"/></svg>',
    jupas: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13" cy="13" r="8"/><path d="m19 19 9 9M7 11l6-3 6 3-6 3zM9 13v4c2 2 6 2 8 0v-4"/></svg>',
    jupaschoices: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="5" width="20" height="24" rx="3"/><path d="M12 5V3h8v2M10 13l2 2 4-4M18 14h4M10 21l2 2 4-4M18 22h4"/></svg>',
    planner: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m4 7 8-3 8 3 8-3v21l-8 3-8-3-8 3zM12 4v21M20 7v21"/><path d="M7 21c3-5 7-3 10-7s6-3 8-6" stroke-dasharray="1 4"/></svg>'
  };

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
    renderStartHub(tx);
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
      card.dataset.category = p.category || "all";
      var postTitle = L(p, "title");
      var safeTitle = esc(postTitle);
      var thumb = p.image
        ? '<div class="thumb"><img src="' + esc(p.image) + '" alt="' + safeTitle + '" loading="lazy" decoding="async"></div>'
        : '<div class="thumb empty">' + (ICON[p.category] || "📰") + "</div>";
      card.innerHTML =
        thumb +
        '<div class="pad">' +
          '<div class="card-flags">' +
            '<span class="tag ' + p.category + '">' + (ICON[p.category] || "") + " " + tx[p.category] + "</span>" +
            (p.pinned ? '<span class="pin">' + tx.pinned + "</span>" : "") +
          "</div>" +
          "<h3>" + safeTitle + "</h3>" +
          '<div class="meta">' + fmtDate(p.date) + "</div>" +
          '<div class="excerpt">' + esc(excerpt(L(p, "body"), 120)) + "</div>" +
          '<span class="readmore">' + tx.readmore + "</span>" +
        "</div>";
      // Whole card is clickable (with keyboard support for accessibility)
      card.setAttribute("role", "button");
      card.setAttribute("tabindex", "0");
      card.setAttribute("aria-label", postTitle);
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
    ["studytools", "jupastools"].forEach(function (groupKey) {
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
        a.dataset.tool = td.id;
        a.dataset.group = groupKey;
        a.dataset.gated = td.gated ? "true" : "false";
        a.innerHTML =
          '<span class="tool-card-top">' +
            '<span class="tool-ic" aria-hidden="true">' + (TOOL_ICON_SVG[td.id] || td.icon) + "</span>" +
            '<span class="tool-tags">' +
              '<span class="tool-aud">' + esc(toolField(td, "aud")) + "</span>" +
              (td.gated ? '<span class="tool-lock">🔒 ' + esc(tx.students_only) + "</span>" : "") +
            "</span>" +
          "</span>" +
          '<span class="tool-body">' +
            '<span class="tool-name">' + esc(toolField(td, "name")) + "</span>" +
            '<span class="tool-desc">' + esc(toolField(td, "desc")) + "</span>" +
          "</span>" +
          '<span class="tool-card-foot">' +
            '<span class="tool-action' + (td.gated ? " is-gated" : "") + '">' + esc(td.gated ? tx.tool_access : tx.tool_open) + "</span>" +
            '<span class="tool-arrow" aria-hidden="true">→</span>' +
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

  function renderStartHub(tx) {
    [
      "start-title", "start-sub",
      "start-pathways-eyebrow", "start-pathways-title", "start-pathways-desc", "start-pathways-link",
      "start-study-eyebrow", "start-study-title", "start-study-desc", "start-study-link",
      "start-jupas-eyebrow", "start-jupas-title", "start-jupas-desc", "start-jupas-link"
    ].forEach(function (id) {
      setText(id, tx[id.replace(/-/g, "_")]);
    });
  }

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
