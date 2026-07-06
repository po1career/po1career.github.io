/* ============================================================
   Shared site header — SINGLE SOURCE for the nav across all
   shell pages. Injects the header markup into <div id="site-header">,
   sets the current-page active state, and
   keeps brand/nav labels in sync with the language (clp_lang +
   <html lang> observer — same pattern as footer-tools.js).

   To add / remove / reorder a nav link, edit the TEMPLATE and LABELS
   here ONLY. Loaded near the top of <body> so the header exists
   before the page's own scripts run. Used on the 10 shell pages
   (gated tool pages keep their own slim .po1bar instead).
   ============================================================ */
(function () {
  var L = {
    en: {
      school: "PLK No.1 W.H. Cheung College", dept: "Career Team", motto: "Dream high and fly high",
      nav_info: "Info", nav_res: "Useful Links", nav_faq: "FAQ & Glossary",
      nav_studytools: "Study Tools", nav_jupastools: "JUPAS Tools",
      nav_quiz: "Career Quiz", nav_pathways: "Pathways Explorer", nav_pomodoro: "Pomodoro",
      nav_studyplan: "Study Plan", nav_dse: "DSE Portfolio", nav_streaming: "Streaming Tool",
      nav_jupas: "JUPAS Finder", nav_jupaschoices: "JUPAS Choices", nav_planner: "JUPAS Planner", lang: "中文", menu: "Menu"
    },
    zh: {
      school: "保良局第一張永慶中學", dept: "升學輔導及生涯規劃組", motto: "展翅高飛・逐夢前行",
      nav_info: "資訊", nav_res: "實用連結", nav_faq: "常見問題",
      nav_studytools: "學習工具", nav_jupastools: "JUPAS 工具",
      nav_quiz: "興趣測驗", nav_pathways: "升學出路", nav_pomodoro: "番茄鐘",
      nav_studyplan: "溫習計劃", nav_dse: "DSE 試卷組合", nav_streaming: "選科工具",
      nav_jupas: "JUPAS 搜尋器", nav_jupaschoices: "JUPAS 選科", nav_planner: "放榜行動計劃", lang: "EN", menu: "選單"
    }
  };

  var file = (location.pathname.split("/").pop() || "index.html") || "index.html";

  var html =
    '<header class="site"><div class="bar">' +
      '<a class="brand" href="index.html">' +
        '<img id="logo-img" class="logo" src="images/logo.jpg?v=2" alt="Career Team logo">' +
        '<div class="titles">' +
          '<div class="school" id="brand-school"></div>' +
          '<div class="dept" id="brand-dept"></div>' +
          '<div class="motto" id="brand-motto"></div>' +
        '</div>' +
      '</a>' +
      '<nav class="main">' +
        '<input type="checkbox" id="nav-toggle" class="nav-toggle" aria-hidden="true">' +
        '<label for="nav-toggle" class="nav-burger" id="nav-burger">☰</label>' +
        '<div class="nav-links">' +
          '<div class="navgroup navgroup-info">' +
            '<button type="button" class="navgroup-btn" id="nav-info"></button>' +
            '<div class="navgroup-menu">' +
              '<a href="useful-links.html" id="nav-res"></a>' +
              '<a href="faq.html" id="nav-faq"></a>' +
              '<a href="pathways.html" id="nav-pathways"></a>' +
            '</div>' +
          '</div>' +
          '<div class="navgroup navgroup-studytools">' +
            '<button type="button" class="navgroup-btn" id="nav-studytools"></button>' +
            '<div class="navgroup-menu">' +
              '<a href="career-quiz.html" id="nav-quiz"></a>' +
              '<a href="pomodoro.html" id="nav-pomodoro"></a>' +
              '<a href="study-plan.html" id="nav-studyplan"></a>' +
              '<a href="dse-portfolio.html" id="nav-dse"></a>' +
              '<a href="streaming-tool.html" id="nav-streaming"></a>' +
            '</div>' +
          '</div>' +
          '<div class="navgroup navgroup-jupastools">' +
            '<button type="button" class="navgroup-btn" id="nav-jupastools"></button>' +
            '<div class="navgroup-menu">' +
              '<a href="jupas-finder.html" id="nav-jupas"></a>' +
              '<a href="jupas-choices.html" id="nav-jupaschoices"></a>' +
              '<a href="jupas-planner.html" id="nav-planner"></a>' +
            '</div>' +
          '</div>' +
          '<button class="langbtn"></button>' +
        '</div>' +
      '</nav>' +
    '</div></header>';

  var mount = document.getElementById("site-header");
  if (mount) mount.innerHTML = html; else document.write(html);

  function curLang() {
    var s; try { s = localStorage.getItem("clp_lang"); } catch (e) {}
    if (s === "en" || s === "zh") return s;
    return (document.documentElement.lang || "").indexOf("zh") === 0 ? "zh" : "en";
  }
  function setText(id, v) { var el = document.getElementById(id); if (el) el.textContent = v; }

  function applyLabels() {
    var t = L[curLang()];
    setText("brand-school", t.school); setText("brand-dept", t.dept); setText("brand-motto", t.motto);
    setText("nav-info", t.nav_info); setText("nav-res", t.nav_res);
    setText("nav-faq", t.nav_faq);
    setText("nav-studytools", t.nav_studytools); setText("nav-jupastools", t.nav_jupastools);
    setText("nav-quiz", t.nav_quiz); setText("nav-pathways", t.nav_pathways);
    setText("nav-pomodoro", t.nav_pomodoro); setText("nav-studyplan", t.nav_studyplan);
    setText("nav-dse", t.nav_dse); setText("nav-streaming", t.nav_streaming);
    setText("nav-jupas", t.nav_jupas); setText("nav-jupaschoices", t.nav_jupaschoices);
    setText("nav-planner", t.nav_planner);
    var lb = document.querySelector("#site-header .langbtn"); if (lb) lb.textContent = t.lang;
    var burger = document.getElementById("nav-burger");
    if (burger) { burger.setAttribute("aria-label", t.menu); burger.setAttribute("title", t.menu); }
  }

  function markActive() {
    var links = document.querySelectorAll('#site-header .nav-links a[id^="nav-"]');
    Array.prototype.forEach.call(links, function (a) {
      var target = (a.getAttribute("href") || "").split("#")[0] || "index.html";
      if (target === file) { a.classList.add("active"); a.setAttribute("aria-current", "page"); }
    });
  }

  applyLabels();
  markActive();
  // re-label when the page's language toggle flips <html lang>
  new MutationObserver(applyLabels).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
})();
