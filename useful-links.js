/* ============================================================
   Useful Links page — university JUPAS score calculators +
   EDB Life Planning Portfolio. Bilingual, single language shown.
   ============================================================ */
(function () {
  "use strict";

  // graduation-cap watermark used inside each university crest
  var CAP = '<svg class="crest-cap" viewBox="0 0 24 24" aria-hidden="true">' +
    '<path d="M12 3 1 8l11 5 9-4.09V15h2V8L12 3z" fill="currentColor"/>' +
    '<path d="M5 11.6V15c0 1.66 3.13 3 7 3s7-1.34 7-3v-3.4l-7 3.18-7-3.18z" fill="currentColor" opacity=".55"/></svg>';

  // EDB "life-planning journey" illustration (dashed path → flag, sage disc)
  var EDB_ILL = '<svg class="edb-ill" viewBox="0 0 120 120" aria-hidden="true">' +
    '<defs><linearGradient id="edbg" x1="0" y1="0" x2="1" y2="1">' +
    '<stop offset="0" stop-color="#9cb89a"/><stop offset="1" stop-color="#5f7d59"/></linearGradient></defs>' +
    '<circle cx="60" cy="60" r="54" fill="url(#edbg)"/>' +
    '<path d="M30 94 C 44 76, 32 60, 52 52 C 70 45, 66 32, 78 24" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-dasharray="1.5 12" opacity=".92"/>' +
    '<circle cx="30" cy="94" r="6.5" fill="#fff"/>' +
    '<line x1="80" y1="20" x2="80" y2="46" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/>' +
    '<path d="M80 21 L98 26.5 L80 32 Z" fill="#fff"/></svg>';

  // A) university JUPAS score calculators (crest colour + darker shade)
  var UNIS = [
    { abbr: "HKU",   c: "#0e6b41", c2: "#0a4d2f", url: "https://admissions.hku.hk/apply/jupas/score-calculator",
      name: { en: "The University of Hong Kong", zh: "香港大學" } },
    { abbr: "CUHK",  c: "#7c2a86", c2: "#5a1d63", url: "https://admission.cuhk.edu.hk/application/jupas/programme-specific-requirements-and-score-calculator/",
      name: { en: "The Chinese University of Hong Kong", zh: "香港中文大學" } },
    { abbr: "HKUST", c: "#0a4a8f", c2: "#073461", url: "https://join.hkust.edu.hk/admissions/jupas",
      name: { en: "The Hong Kong University of Science and Technology", zh: "香港科技大學" } },
    { abbr: "CityU", c: "#9e1b32", c2: "#761324", url: "https://www.cityu.edu.hk/admo/admissions/jupas-admission",
      name: { en: "City University of Hong Kong", zh: "香港城市大學" } },
    { abbr: "PolyU", c: "#8c1d40", c2: "#661530", url: "https://www.polyu.edu.hk/study/ug/admissions/jupas/jupas-score-calculator",
      name: { en: "The Hong Kong Polytechnic University", zh: "香港理工大學" } },
    { abbr: "HKBU",  c: "#1a6aa6", c2: "#115079", url: "https://iss.hkbu.edu.hk/ams_jpscal/",
      name: { en: "Hong Kong Baptist University", zh: "香港浸會大學" } },
    { abbr: "EdUHK", c: "#0f7c6c", c2: "#0a5a4e", url: "https://pappl.eduhk.hk/score-calculator/",
      name: { en: "The Education University of Hong Kong", zh: "香港教育大學" } },
    { abbr: "LU",    c: "#3a3f9c", c2: "#2a2e78", url: "https://www.ln.edu.hk/admissions/ug/page/detail/114",
      name: { en: "Lingnan University", zh: "嶺南大學" } },
    { abbr: "HKMU",  c: "#d2462f", c2: "#a8341f", url: "https://admissions.hkmu.edu.hk/ug/jupas/",
      name: { en: "Hong Kong Metropolitan University", zh: "香港都會大學" } },
    { abbr: "TWC",   c: "#2f6f7a", c2: "#224f59", url: "https://www.twc.edu.hk/jupas_calc/",
      name: { en: "Tung Wah College", zh: "東華學院" } }
  ];

  var EDB_URL = "https://portfolio.lifeplanning.edb.gov.hk/?lang=";

  var T = {
    en: {
      school: "PLK No.1 W.H. Cheung College", dept: "Career Team", motto: "Dream high and fly high",
      nav_news: "Latest News", nav_info: "Info", nav_res: "Useful Links", nav_faq: "FAQ & Glossary", nav_parents: "For Parents", nav_studytools: "Study Tools", nav_jupastools: "JUPAS Tools",
      nav_quiz: "Career Quiz", nav_pathways: "Pathways Explorer", nav_pomodoro: "Pomodoro", nav_studyplan: "Study Plan", nav_dse: "DSE Portfolio", nav_streaming: "Streaming Tool",
      nav_jupas: "JUPAS Finder", nav_jupaschoices: "JUPAS Choices",
      pg_title: "Useful Links",
      pg_sub: "Official tools and resources to help you plan your studies and your future.",
      a_title: "University JUPAS Score Calculators",
      a_sub: "Each university works out JUPAS scores differently. Use the official calculator on each one's site to estimate your score.",
      calc_label: "JUPAS score calculator",
      b_title: "Life Planning",
      b_org: "Education Bureau (EDB)",
      b_name: "My Life Planning Portfolio",
      b_desc: "An official e-portfolio where you can record your interests, experiences, reflections and goals as you plan the path ahead.",
      visit: "Open ↗",
      ext_note: "These links open official external websites in a new tab. Details may change — always confirm on each institution's own site before applying.",
      footer_about: "We help students explore their interests, plan their academic pathways, and prepare for university and future careers through guidance, workshops, and information sharing.",
      lang: "中文"
    },
    zh: {
      school: "保良局第一張永慶中學", dept: "升學輔導及生涯規劃組", motto: "展翅高飛・逐夢前行",
      nav_news: "最新消息", nav_info: "資訊", nav_res: "實用連結", nav_faq: "常見問題", nav_parents: "家長園地", nav_studytools: "學習工具", nav_jupastools: "JUPAS 工具",
      nav_quiz: "興趣測驗", nav_pathways: "升學出路", nav_pomodoro: "番茄鐘", nav_studyplan: "溫習計劃", nav_dse: "DSE 試卷組合", nav_streaming: "選科工具",
      nav_jupas: "JUPAS 搜尋器", nav_jupaschoices: "JUPAS 選科",
      pg_title: "實用連結",
      pg_sub: "官方工具及資源，助你規劃學業與未來。",
      a_title: "各大學 JUPAS 分數計算工具",
      a_sub: "各大學計算 JUPAS 分數的方法各有不同，請使用各院校官方的計算工具估算你的分數。",
      calc_label: "JUPAS 分數計算工具",
      b_title: "生涯規劃",
      b_org: "教育局（EDB）",
      b_name: "我的生涯規劃歷程檔案",
      b_desc: "教育局的官方電子歷程檔案，讓你記錄興趣、經歷、反思與目標，一步步規劃未來路向。",
      visit: "前往 ↗",
      ext_note: "以上連結會在新分頁開啟官方外部網站。資料或有更新，報讀前請於各院校官方網站核實。",
      footer_about: "我們透過輔導、工作坊及資訊分享，協助學生探索興趣、規劃學業路徑，為升學及未來事業作好準備。",
      lang: "EN"
    }
  };

  var lang = localStorage.getItem("clp_lang") || "en";
  function t(k) { return (T[lang] || T.en)[k]; }
  function setText(id, v) { var el = document.getElementById(id); if (el) el.textContent = v; }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function render() {
    document.documentElement.lang = lang === "zh" ? "zh-HK" : "en";
    document.title = t("pg_title") + " — PLK No.1 Career Team";

    // header / nav / footer labels
    setText("brand-school", t("school")); setText("brand-dept", t("dept")); setText("brand-motto", t("motto"));
    setText("nav-news", t("nav_news")); setText("nav-res", t("nav_res")); setText("nav-info", t("nav_info")); setText("nav-faq", t("nav_faq")); setText("nav-parents", t("nav_parents"));
    setText("nav-studytools", t("nav_studytools")); setText("nav-jupastools", t("nav_jupastools"));
    setText("nav-quiz", t("nav_quiz")); setText("nav-pathways", t("nav_pathways")); setText("nav-pomodoro", t("nav_pomodoro")); setText("nav-studyplan", t("nav_studyplan"));
    setText("nav-dse", t("nav_dse")); setText("nav-streaming", t("nav_streaming"));
    setText("nav-jupas", t("nav_jupas")); setText("nav-jupaschoices", t("nav_jupaschoices"));
    setText("footer-about", t("footer_about"));
    document.querySelector(".langbtn").textContent = t("lang");

    // page text
    setText("pg-title", t("pg_title")); setText("pg-sub", t("pg_sub"));
    setText("a-title", t("a_title")); setText("a-sub", t("a_sub"));
    setText("b-title", t("b_title")); setText("ext-note", t("ext_note"));

    // A) university cards
    var grid = document.getElementById("uni-grid");
    grid.innerHTML = "";
    UNIS.forEach(function (u) {
      var a = document.createElement("a");
      a.className = "link-card";
      a.href = u.url; a.target = "_blank"; a.rel = "noopener noreferrer";
      a.innerHTML =
        '<span class="uni-crest len-' + Math.min(5, u.abbr.length) + '" style="--c:' + u.c + ';--c2:' + u.c2 + '">' +
          CAP + '<span class="crest-abbr">' + esc(u.abbr) + '</span></span>' +
        '<span class="link-body">' +
          '<span class="link-name">' + esc(u.name[lang] || u.name.en) + '</span>' +
          '<span class="link-sub">' + esc(t("calc_label")) + '</span>' +
        '</span>' +
        '<span class="link-go" aria-hidden="true">↗</span>';
      grid.appendChild(a);
    });

    // B) EDB Life Planning Portfolio
    document.getElementById("edb-card").innerHTML =
      '<div class="edb">' + EDB_ILL +
        '<div class="edb-body">' +
          '<div class="edb-org">' + esc(t("b_org")) + '</div>' +
          '<div class="edb-name">' + esc(t("b_name")) + '</div>' +
          '<p class="edb-desc">' + esc(t("b_desc")) + '</p>' +
          '<a class="edb-btn" href="' + EDB_URL + (lang === "zh" ? "chinese" : "english") +
            '" target="_blank" rel="noopener noreferrer">' + esc(t("visit")) + '</a>' +
        '</div>' +
      '</div>';
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelector(".langbtn").onclick = function () {
      lang = lang === "en" ? "zh" : "en";
      localStorage.setItem("clp_lang", lang);
      render();
    };
    var logo = document.getElementById("logo-img");
    if (logo) logo.onerror = function () {
      var fb = document.createElement("div"); fb.className = "logo-fallback"; fb.textContent = "PLK①";
      logo.replaceWith(fb);
    };
    render();
  });
})();
