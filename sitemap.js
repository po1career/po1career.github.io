/* ============================================================
   Sitemap page — lists every page on the site. Tool entries
   come from tools-data.js (window.SITE_TOOLS). Bilingual,
   single language shown.
   ============================================================ */
(function () {
  "use strict";

  var MAIN = [
    { href: "index.html", name: { en: "Home", zh: "主頁" },
      desc: { en: "The Career Team homepage.", zh: "升學輔導及生涯規劃組主頁。" } },
    { href: "index.html#news", name: { en: "Latest News", zh: "最新消息" },
      desc: { en: "Updates on local, mainland and overseas universities and career activities.", zh: "本地、內地及海外大學與職業活動的最新消息。" } },
    { href: "useful-links.html", name: { en: "Useful Links", zh: "實用連結" },
      desc: { en: "University JUPAS score calculators and the EDB Life Planning Portfolio.", zh: "各大學 JUPAS 分數計算工具及教育局生涯規劃歷程檔案。" } }
  ];

  var T = {
    en: {
      school: "PLK No.1 W.H. Cheung College", dept: "Career Team", motto: "Dream high and fly high",
      nav_news: "Latest News", nav_res: "Useful Links", nav_studytools: "Study Tools", nav_jupastools: "JUPAS Tools",
      nav_quiz: "Career Quiz", nav_pomodoro: "Pomodoro", nav_studyplan: "Study Plan", nav_dse: "DSE Portfolio", nav_streaming: "Streaming Tool",
      nav_jupas: "JUPAS Finder", nav_jupaschoices: "JUPAS Choices",
      pg_title: "Sitemap",
      pg_sub: "Every page on the Career Team website, in one place.",
      g_main: "Main",
      footer_about: "We help students explore their interests, plan their academic pathways, and prepare for university and future careers through guidance, workshops, and information sharing.",
      lang: "中文"
    },
    zh: {
      school: "保良局第一張永慶中學", dept: "升學輔導及生涯規劃組", motto: "展翅高飛・逐夢前行",
      nav_news: "最新消息", nav_res: "實用連結", nav_studytools: "學習工具", nav_jupastools: "JUPAS 工具",
      nav_quiz: "興趣測驗", nav_pomodoro: "番茄鐘", nav_studyplan: "溫習計劃", nav_dse: "DSE 試卷組合", nav_streaming: "選科工具",
      nav_jupas: "JUPAS 搜尋器", nav_jupaschoices: "JUPAS 選科",
      pg_title: "網站地圖",
      pg_sub: "升學輔導及生涯規劃組網站的所有頁面，一覽無遺。",
      g_main: "主要頁面",
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
  function entry(href, name, desc, gated) {
    return '<li><a class="sm-link" href="' + href + '">' +
      '<span class="nm">' + esc(name) + (gated ? ' <span class="lock">🔒</span>' : "") + "</span>" +
      '<span class="ds">' + esc(desc) + "</span></a></li>";
  }
  function group(heading, itemsHtml) {
    return '<div class="sm-group"><h2>' + esc(heading) + '</h2><ul class="sm-list">' + itemsHtml + "</ul></div>";
  }

  function render() {
    document.documentElement.lang = lang === "zh" ? "zh-HK" : "en";
    document.title = t("pg_title") + " — PLK No.1 Career Team";

    setText("brand-school", t("school")); setText("brand-dept", t("dept")); setText("brand-motto", t("motto"));
    setText("nav-news", t("nav_news")); setText("nav-res", t("nav_res"));
    setText("nav-studytools", t("nav_studytools")); setText("nav-jupastools", t("nav_jupastools"));
    setText("nav-quiz", t("nav_quiz")); setText("nav-pomodoro", t("nav_pomodoro")); setText("nav-studyplan", t("nav_studyplan"));
    setText("nav-dse", t("nav_dse")); setText("nav-streaming", t("nav_streaming"));
    setText("nav-jupas", t("nav_jupas")); setText("nav-jupaschoices", t("nav_jupaschoices"));
    setText("footer-about", t("footer_about"));
    document.querySelector(".langbtn").textContent = t("lang");
    setText("pg-title", t("pg_title")); setText("pg-sub", t("pg_sub"));

    var groups = [];
    groups.push(group(t("g_main"), MAIN.map(function (m) {
      return entry(m.href, m.name[lang] || m.name.en, m.desc[lang] || m.desc.en, false);
    }).join("")));
    ["studytools", "jupastools"].forEach(function (gk) {
      var items = (window.SITE_TOOLS || []).filter(function (x) { return x.group === gk; })
        .map(function (x) { return entry(x.href, x.name[lang] || x.name.en, x.desc[lang] || x.desc.en, x.gated); }).join("");
      if (items) groups.push(group(t("nav_" + gk), items));
    });
    document.getElementById("sm-groups").innerHTML = groups.join("");
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
