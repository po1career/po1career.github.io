/* ============================================================
   Parents' Corner. A calm, practical guide for parents:
   how JUPAS works, reading scores without panic, the F.6 year
   at a glance, and supporting choices without pressure.
   Bilingual, single language shown. General guidance only —
   exact dates and rules change yearly; confirm officially.
   ============================================================ */
(function () {
  "use strict";

  var CARDS = [
    { icon: "🎓", c: "#3b6fb0", c2: "#2f5a92",
      title: { en: "What JUPAS is", zh: "聯招是甚麼" },
      body: { en: "JUPAS lets students apply to programmes at participating institutions using DSE results. Your child lists up to 20 programmes in order of real preference; the top three (Band A) matter most. <a href=\"faq.html\">See the FAQ &amp; Glossary</a> for the terms.",
              zh: "聯招讓學生以文憑試成績報讀參與院校的課程。孩子最多可按真實意願排列 20 個課程，其中首三個（甲組）最為重要。詞語解釋可參閱<a href=\"faq.html\">常見問題與詞彙</a>。" } },
    { icon: "📊", c: "#2f8f7a", c2: "#247060",
      title: { en: "Reading scores calmly", zh: "冷靜看待分數" },
      body: { en: "Last year's “median” and quartile scores show how competitive a programme was — not a fixed pass mark. They move every year, so use them as a guide, not a verdict. A score is information about one exam, not a measure of your child's worth.",
              zh: "去年的「中位數」及四分位分數反映課程的競爭程度，並非固定的合格線。它們每年都會變動，宜作參考而非定論。分數只是一場考試的資訊，並不能衡量孩子的價值。" } },
    { icon: "🧭", c: "#9a5ba6", c2: "#7c4588",
      title: { en: "More than one path", zh: "出路不止一條" },
      body: { en: "Degrees, subsidised SSSDP degrees, sub-degrees, vocational study, Mainland and overseas options can all lead to a good future. The <a href=\"pathways.html\">Pathways Explorer</a> lays them out together.",
              zh: "學位、資助的 SSSDP 學位、副學位、職業專才教育、內地及海外升學，都能通往美好未來。<a href=\"pathways.html\">升學出路探索</a>把各條路一併呈現。" } },
    { icon: "💬", c: "#c9952f", c2: "#a9842f",
      title: { en: "Where to get help", zh: "何處尋求協助" },
      body: { en: "The Career team is here for both students and parents — for tailored advice, talk to your child's Career teacher, and watch for the school's parent talks and briefings on subject choice and JUPAS.",
              zh: "升學輔導組樂意協助學生及家長——如需個別意見，請與孩子的升學輔導老師聯絡，並留意學校就選科及聯招舉辦的家長講座及簡介會。" } }
  ];

  var TIMELINE = [
    { when: { en: "October–December 2026", zh: "2026 年十月至十二月" },
      what: { en: "2027 JUPAS applications: 7 October (9 am) to 2 December (5 pm) 2026. Submit the application and pay by the deadline.",
              zh: "2027 年度聯招申請期：2026 年 10 月 7 日上午 9 時至 12 月 2 日下午 5 時。請於限期前提交申請及繳費。" } },
    { when: { en: "December 2026–January 2027", zh: "2026 年十二月至 2027 年一月" },
      what: { en: "Late applications: 4 December 2026 (9 am) to 13 January 2027 (5 pm), with a higher fee. This is separate from updating existing programme choices.",
              zh: "逾期申請期：2026 年 12 月 4 日上午 9 時至 2027 年 1 月 13 日下午 5 時，費用較高。逾期申請與修改現有課程志願屬不同程序。" } },
    { when: { en: "January–April 2027", zh: "2027 年一月至四月" },
      what: { en: "Review choices together after school assessments. Check the separate official deadlines for OEA, SLP and other supporting documents, and follow school instructions.",
              zh: "校內評估後，可與孩子一同檢視志願。請分別查核 OEA、SLP 及其他證明文件的官方限期，並依照學校指示辦理。" } },
    { when: { en: "May 2027", zh: "2027 年五月" },
      what: { en: "Pre-results programme-choice updates close on 26 May 2027 at 5 pm. This is not the initial application deadline.",
              zh: "放榜前修改課程志願的截止時間為 2027 年 5 月 26 日下午 5 時。這並非首次申請的截止日期。" } },
    { when: { en: "July 2027", zh: "2027 年七月" },
      what: { en: "After results, review the official modification arrangements and confirm the submitted choices in the JUPAS account. Ask the Career Team for support.",
              zh: "放榜後，請查閱官方修改志願安排，並在聯招帳戶核對已提交的志願。如有需要，可向升學輔導組尋求協助。" } },
    { when: { en: "August 2027", zh: "2027 年八月" },
      what: { en: "Check offer results and acceptance deadlines promptly. Discuss any alternative routes with the Career Team before making commitments.",
              zh: "請及時查閱取錄結果及接受取錄的限期。作出承諾前，可與升學輔導組商討其他升學途徑。" } }
  ];

  var GOOD = [
    { en: "Listen more than you advise — ask what your child enjoys and is curious about.", zh: "多聆聽、少指示——問問孩子喜歡甚麼、對甚麼感興趣。" },
    { en: "Treat results as information, not a label on who they are.", zh: "把成績視為資訊，而非為孩子的人格貼上標籤。" },
    { en: "Praise effort and honest choices, not just outcomes.", zh: "讚賞努力與真誠的選擇，而不只是結果。" },
    { en: "Explore the different pathways together, with an open mind.", zh: "以開放的心態，與孩子一同探索不同出路。" },
    { en: "Protect routines — steady sleep, meals and breaks lift performance.", zh: "守護作息——穩定的睡眠、三餐與休息有助發揮。" },
    { en: "Come to the school's talks and reach out to the Career teacher early.", zh: "出席學校講座，並及早聯絡升學輔導老師。" }
  ];

  var AVOID = [
    { en: "Comparing your child with siblings, cousins or classmates.", zh: "拿孩子與兄弟姊妹、親戚或同學比較。" },
    { en: "Choosing the subjects or programmes for them.", zh: "代孩子決定科目或課程。" },
    { en: "Focusing only on prestige, salary or “safe” options, rather than your child's own interests and strengths.", zh: "只着眼於名氣、薪酬或「保險」的選擇，而忽略孩子自身的興趣與強項。" },
    { en: "Reacting to a disappointing score with panic or blame.", zh: "對不理想的成績以恐慌或責備回應。" },
    { en: "Bringing up results and the future at every meal.", zh: "每次吃飯都提起成績與前途。" }
  ];

  var T = {
    en: {
      school: "PLK No.1 W.H. Cheung College", dept: "Career Team", motto: "Dream high and fly high",
      nav_news: "Latest News", nav_info: "Info", nav_res: "Useful Links", nav_faq: "FAQ & Glossary", nav_parents: "For Parents",
      nav_studytools: "Study Tools", nav_jupastools: "JUPAS Tools",
      nav_quiz: "Career Quiz", nav_pathways: "Pathways Explorer", nav_pomodoro: "Pomodoro", nav_studyplan: "Study Plan",
      nav_dse: "DSE Portfolio", nav_streaming: "Streaming Tool", nav_jupas: "JUPAS Finder", nav_jupaschoices: "JUPAS Choices",
      pg_title: "For Parents",
      pg_sub: "A calm, practical guide to your child's senior-secondary journey — how it works, and how to help without adding pressure.",
      orient_h: "Getting your bearings",
      orient_sub: "Four things that make the rest easier to follow.",
      tl_h: "The F.6 year: 2027 JUPAS admission",
      tl_sub: "Dates checked on 29 October 2026; all times are Hong Kong time. Recheck the official arrangements before each deadline.",
      sup_h: "Supporting without pressure",
      sup_sub: "Your encouragement matters more than any score. A few things that help — and a few worth easing off.",
      good_h: "What helps",
      avoid_h: "Worth easing off",
      note: "This page is general guidance for PLK No.1 families. Schemes, requirements and dates change every year — please confirm details on the official websites and with the Career team before making decisions.",
      lang: "中文"
    },
    zh: {
      school: "保良局第一張永慶中學", dept: "升學輔導及生涯規劃組", motto: "展翅高飛・逐夢前行",
      nav_news: "最新消息", nav_info: "資訊", nav_res: "實用連結", nav_faq: "常見問題", nav_parents: "家長園地",
      nav_studytools: "學習工具", nav_jupastools: "JUPAS 工具",
      nav_quiz: "興趣測驗", nav_pathways: "升學出路", nav_pomodoro: "番茄鐘", nav_studyplan: "溫習計劃",
      nav_dse: "DSE 試卷組合", nav_streaming: "選科工具", nav_jupas: "JUPAS 搜尋器", nav_jupaschoices: "JUPAS 選科",
      pg_title: "家長園地",
      pg_sub: "陪伴孩子走過高中升學路的一份冷靜實用指南——了解整個流程，以及如何在不施加壓力下給予支持。",
      orient_h: "先掌握方向",
      orient_sub: "先弄清這四點，往後就更容易理解。",
      tl_h: "中六一年：2027 年度聯招",
      tl_sub: "日期於 2026 年 10 月 29 日核對，時間均為香港時間。請在各項限期前再次查核官方安排。",
      sup_h: "在不施壓下給予支持",
      sup_sub: "你的鼓勵比任何分數都重要。以下是一些有幫助的做法，以及一些值得放輕的地方。",
      good_h: "有幫助的做法",
      avoid_h: "值得放輕的地方",
      note: "本頁為保良局第一張永慶中學的家庭提供一般指引。各項計劃、要求及日期每年均有變動——作決定前請於官方網站及向升學輔導組查證詳情。",
      lang: "EN"
    }
  };

  var FOOTER_ABOUT = {
    en: "We help students explore their interests, plan their academic pathways, and prepare for university and future careers through guidance, workshops, and information sharing.",
    zh: "我們透過輔導、工作坊及資訊分享，協助學生探索興趣、規劃學業路徑，為升學及未來事業作好準備。"
  };

  var lang = localStorage.getItem("clp_lang") || "en";
  function t(k) { return (T[lang] || T.en)[k]; }
  function L(o) { return (o && o[lang]) || (o && o.en) || ""; }
  function setText(id, v) { var el = document.getElementById(id); if (el) el.textContent = v; }
  function $(id) { return document.getElementById(id); }

  function applyChrome() {
    document.documentElement.lang = lang === "zh" ? "zh-HK" : "en";
    document.title = t("pg_title") + " — PLK No.1 Career Team";
    setText("footer-about", FOOTER_ABOUT[lang]);
    setText("pg-title", t("pg_title")); setText("pg-sub", t("pg_sub"));
    $("orient-h").querySelector("span:last-child").textContent = t("orient_h");
    setText("orient-sub", t("orient_sub"));
    $("tl-h").querySelector("span:last-child").textContent = t("tl_h");
    setText("tl-sub", t("tl_sub"));
    $("tl-source").textContent = lang === "zh" ? "官方聯招申請日期及費用" : "Official JUPAS application dates and fees";
    $("sup-h").querySelector("span:last-child").textContent = t("sup_h");
    setText("sup-sub", t("sup_sub"));
    setText("good-h", t("good_h")); setText("avoid-h", t("avoid_h"));
    setText("pa-note", t("note"));
  }

  function renderCards() {
    var box = $("orient-cards"); box.innerHTML = "";
    CARDS.forEach(function (c) {
      var d = document.createElement("div");
      d.className = "pa-card";
      d.innerHTML =
        '<div class="pa-ic" style="--c:' + c.c + ';--c2:' + c.c2 + '">' + c.icon + "</div>" +
        "<h3>" + L(c.title) + "</h3><p>" + L(c.body) + "</p>";
      box.appendChild(d);
    });
  }

  function renderTimeline() {
    var box = $("tl-list"); box.innerHTML = "";
    TIMELINE.forEach(function (s) {
      var d = document.createElement("div");
      d.className = "pa-step";
      d.innerHTML = '<div class="pa-when">' + L(s.when) + '</div><div class="pa-what">' + L(s.what) + "</div>";
      box.appendChild(d);
    });
  }

  function renderList(id, arr) {
    var ul = $(id); ul.innerHTML = "";
    arr.forEach(function (x) {
      var li = document.createElement("li");
      li.innerHTML = "<span>" + L(x) + "</span>";
      ul.appendChild(li);
    });
  }

  function rerender() {
    applyChrome(); renderCards(); renderTimeline();
    renderList("good-list", GOOD); renderList("avoid-list", AVOID);
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelector(".langbtn").onclick = function () {
      lang = lang === "en" ? "zh" : "en";
      localStorage.setItem("clp_lang", lang);
      rerender();
    };
    var logo = $("logo-img");
    if (logo) logo.onerror = function () { var fb = document.createElement("div"); fb.className = "logo-fallback"; fb.textContent = "PLK①"; logo.replaceWith(fb); };
    rerender();
  });
})();
