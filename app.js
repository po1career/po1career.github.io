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
  var TOOL_ILLUSTRATION_SVG = {
    quiz: '<svg viewBox="0 0 180 96"><circle cx="90" cy="48" r="38" fill="#d8e5d6"/><circle cx="90" cy="48" r="25" fill="#fffdf8" stroke="#5b3a24" stroke-width="2.4"/><path d="m90 27 7 14 14 7-14 7-7 14-7-14-14-7 14-7z" fill="#e0a85a" stroke="#5b3a24" stroke-width="2.2" stroke-linejoin="round"/><path d="m90 38 5 10-5 10-5-10z" fill="#d98a5a"/><circle cx="43" cy="30" r="6" fill="#5bb3a6"/><circle cx="137" cy="29" r="6" fill="#d98a5a"/><circle cx="45" cy="69" r="5" fill="#e0a85a"/><circle cx="137" cy="68" r="5" fill="#88a6b3"/><path d="M23 49h12M29 43v12M148 49h12M154 43v12" stroke="#486c52" stroke-width="2.6" stroke-linecap="round"/></svg>',
    pathways: '<svg viewBox="0 0 180 96"><circle cx="47" cy="73" r="17" fill="#fffaf0"/><circle cx="47" cy="73" r="7" fill="#8ba888"/><circle cx="47" cy="73" r="3" fill="#fff"/><path d="M54 70c25-3 27-30 55-34 18-3 28-15 42-22M54 74c29 1 42-2 57-10 15-8 27-5 45-2" fill="none" stroke="#486c52" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="1 8"/><path d="M54 78c31 8 58 8 98 1" fill="none" stroke="#c58a35" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="1 8"/><g fill="#fffdf8" stroke="#5b3a24" stroke-width="2" stroke-linejoin="round"><path d="m142 13 10-5 10 5-10 5z"/><path d="M146 17v7c4 3 8 3 12 0v-7"/><path d="M137 53h25v17h-25z" fill="#ead5ca"/><path d="m133 53 16-10 17 10z" fill="#d98a5a"/><path d="M140 79h24v10h-24z" fill="#f0dfb5"/></g><circle cx="28" cy="28" r="4" fill="#e0a85a"/></svg>',
    pomodoro: '<svg viewBox="0 0 180 96"><circle cx="78" cy="53" r="32" fill="#ead5ca"/><path d="M65 23c5-8 12-10 19-5 6-4 13-2 17 4-8 0-13 3-18 8-5-5-10-7-18-7z" fill="#8ba888" stroke="#5b3a24" stroke-width="2" stroke-linejoin="round"/><circle cx="82" cy="55" r="26" fill="#d98a5a" stroke="#5b3a24" stroke-width="2.5"/><circle cx="82" cy="55" r="18" fill="#fff8e9" stroke="#5b3a24" stroke-width="2"/><path d="M82 55V42M82 55l10 6" stroke="#5b3a24" stroke-width="2.6" stroke-linecap="round"/><circle cx="82" cy="55" r="3" fill="#5b3a24"/><path d="M122 48h25v25h-25z" fill="#fffdf8" stroke="#5b3a24" stroke-width="2.2" stroke-linejoin="round"/><path d="M147 54h4a8 8 0 0 1 0 14h-4M128 41c-4-6 5-7 1-13M139 41c-4-6 5-7 1-13" fill="none" stroke="#5bb3a6" stroke-width="2.2" stroke-linecap="round"/><circle cx="34" cy="35" r="5" fill="#e0a85a"/></svg>',
    studyplan: '<svg viewBox="0 0 180 96"><circle cx="91" cy="48" r="40" fill="#f0dfb5"/><rect x="47" y="17" width="86" height="67" rx="8" fill="#fffdf8" stroke="#5b3a24" stroke-width="2.4"/><path d="M47 35h86" stroke="#c58a35" stroke-width="3"/><path d="M67 11v13M113 11v13" stroke="#5b3a24" stroke-width="3" stroke-linecap="round"/><g fill="#e3ede1" stroke="#486c52" stroke-width="2"><rect x="61" y="46" width="12" height="12" rx="3"/><rect x="61" y="65" width="12" height="12" rx="3"/></g><path d="m64 52 3 3 7-8m-10 24 3 3 7-8M82 50h29M82 56h20M82 69h24M82 75h16" fill="none" stroke="#6b4811" stroke-width="2.4" stroke-linecap="round"/><g transform="rotate(-36 137 67)" stroke="#5b3a24" stroke-width="2"><path d="M132 43h10v41h-10z" fill="#d98a5a"/><path d="m132 84 5 9 5-9z" fill="#f6dfbd"/></g><circle cx="32" cy="25" r="4" fill="#5bb3a6"/></svg>',
    dse: '<svg viewBox="0 0 180 96"><circle cx="86" cy="48" r="40" fill="#ead5ca"/><path d="M52 12h61l15 15v58H52z" fill="#fffdf8" stroke="#5b3a24" stroke-width="2.4" stroke-linejoin="round"/><path d="M113 12v16h15" fill="#f0dfb5" stroke="#5b3a24" stroke-width="2.2" stroke-linejoin="round"/><path d="M66 70V57h10v13M82 70V45h10v25M98 70V35h10v35" fill="#8ba888" stroke="#5b3a24" stroke-width="2" stroke-linejoin="round"/><circle cx="132" cy="67" r="18" fill="#e0a85a" stroke="#5b3a24" stroke-width="2.3"/><path d="m132 56 3.5 7 8 1-6 5 2 8-7.5-4-7.5 4 2-8-6-5 8-1z" fill="#fffdf8" stroke="#5b3a24" stroke-width="1.7" stroke-linejoin="round"/><path d="M28 29h13M34.5 22.5v13" stroke="#d98a5a" stroke-width="2.8" stroke-linecap="round"/></svg>',
    streaming: '<svg viewBox="0 0 180 96"><circle cx="43" cy="48" r="17" fill="#fffdf8" stroke="#5b3a24" stroke-width="2.3"/><circle cx="43" cy="48" r="6" fill="#5bb3a6"/><path d="M60 48h18M78 48V23h15M78 48h15M78 48v25h15" fill="none" stroke="#5b3a24" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><g stroke="#5b3a24" stroke-width="2" stroke-linejoin="round"><rect x="93" y="12" width="54" height="22" rx="6" fill="#f0dfb5"/><rect x="93" y="37" width="62" height="22" rx="6" fill="#dcebe7"/><rect x="93" y="62" width="49" height="22" rx="6" fill="#ead5ca"/></g><path d="m105 48 4 4 8-9" fill="none" stroke="#336e65" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="30" cy="21" r="4" fill="#e0a85a"/><circle cx="158" cy="25" r="4" fill="#d98a5a"/></svg>',
    jupas: '<svg viewBox="0 0 180 96"><circle cx="87" cy="46" r="40" fill="#eee2cf"/><g fill="#fffdf8" stroke="#5b3a24" stroke-width="2.3" stroke-linejoin="round"><path d="m42 37 43-23 43 23z" fill="#d98a5a"/><path d="M49 38h72v9H49z" fill="#f0dfb5"/><path d="M54 73h63v9H54z" fill="#f0dfb5"/><path d="M62 47h10v26H62zM81 47h10v26H81zM100 47h10v26h-10z"/></g><g transform="translate(111 48)" fill="none" stroke="#336e65" stroke-width="4" stroke-linecap="round"><circle cx="17" cy="17" r="15" fill="#fffdf8"/><path d="m28 28 17 17"/></g><path d="M148 19h12M154 13v12" stroke="#c58a35" stroke-width="2.8" stroke-linecap="round"/><circle cx="28" cy="66" r="5" fill="#8ba888"/></svg>',
    jupaschoices: '<svg viewBox="0 0 180 96"><circle cx="88" cy="48" r="40" fill="#dcebe7"/><rect x="54" y="12" width="72" height="74" rx="8" fill="#fffdf8" stroke="#5b3a24" stroke-width="2.4"/><path d="M72 12V8h36v4M64 31h12v12H64zM64 51h12v12H64zM64 71h12v8H64z" fill="#f0dfb5" stroke="#5b3a24" stroke-width="2" stroke-linejoin="round"/><path d="m67 37 3 3 7-8m-10 25 3 3 7-8M84 34h29M84 41h21M84 54h29M84 61h18M84 73h25" fill="none" stroke="#336e65" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/><path d="M126 28h12v18h-12M126 52h17v18h-17" fill="#d98a5a" stroke="#5b3a24" stroke-width="2" stroke-linejoin="round"/><circle cx="34" cy="28" r="5" fill="#e0a85a"/></svg>',
    planner: '<svg viewBox="0 0 180 96"><path d="m32 22 37-11 40 13 39-12v62l-39 12-40-13-37 11z" fill="#fffdf8" stroke="#5b3a24" stroke-width="2.4" stroke-linejoin="round"/><path d="M69 11v62l40 13V24z" fill="#e3ede1" stroke="#5b3a24" stroke-width="2" stroke-linejoin="round"/><path d="m109 24 39-12v62l-39 12z" fill="#f0dfb5" stroke="#5b3a24" stroke-width="2" stroke-linejoin="round"/><path d="M43 67c18-20 33 2 48-18 14-18 27 2 43-19" fill="none" stroke="#d98a5a" stroke-width="3.2" stroke-linecap="round" stroke-dasharray="1 8"/><circle cx="43" cy="67" r="6" fill="#5bb3a6" stroke="#5b3a24" stroke-width="2"/><path d="M135 18v25M135 19l18 6-18 7" fill="#d98a5a" stroke="#5b3a24" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M23 31h12M29 25v12" stroke="#c58a35" stroke-width="2.8" stroke-linecap="round"/></svg>'
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
            '<span class="tool-ic" aria-hidden="true">' + (TOOL_ILLUSTRATION_SVG[td.id] || td.icon) + "</span>" +
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
