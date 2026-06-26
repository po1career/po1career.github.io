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
      body: { en: "JUPAS is the main system for applying to Hong Kong's government-funded bachelor's degrees using DSE results. Your child lists up to 20 programmes in order of real preference; the top three (Band A) matter most. <a href=\"faq.html\">See the FAQ &amp; Glossary</a> for the terms.",
              zh: "聯招是以文憑試成績報讀香港政府資助學士課程的主要系統。孩子最多可按真實意願排列 20 個課程，其中首三個（甲組）最為重要。詞語解釋可參閱<a href=\"faq.html\">常見問題與詞彙</a>。" } },
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
    { when: { en: "November–December", zh: "十一月至十二月" },
      what: { en: "JUPAS registration opens; students set their initial 20 programme choices and submit non-academic records (OEA/SLP).",
              zh: "聯招開始接受登記；學生設定最初的 20 個課程志願，並提交非學術紀錄（OEA／SLP）。" } },
    { when: { en: "January–February", zh: "一月至二月" },
      what: { en: "Mock exams; a good time to review and reorder choices honestly, and to attend university info days together.",
              zh: "模擬考試；適合與孩子一同誠實檢視及重新排序志願，並出席大學資訊日。" } },
    { when: { en: "March–April", zh: "三月至四月" },
      what: { en: "Final choice-amendment window before the exam; some programmes make early conditional offers or hold interviews.",
              zh: "考試前最後的修改志願時段；部分課程會提早發出有條件取錄或安排面試。" } },
    { when: { en: "Late April–May", zh: "四月下旬至五月" },
      what: { en: "The DSE written examinations take place.",
              zh: "文憑試筆試舉行。" } },
    { when: { en: "July — results day", zh: "七月——放榜" },
      what: { en: "DSE results are released, followed by an important short window to amend JUPAS choices in light of the actual grades.",
              zh: "文憑試放榜，隨後設有一個重要而短促的時段，讓學生按實際成績修改聯招志願。" } },
    { when: { en: "July–August", zh: "七至八月" },
      what: { en: "Main-round JUPAS offers are released and accepted; sub-degree, self-financing and other routes also confirm places.",
              zh: "聯招正式遴選結果公布及接受取錄；副學位、自資及其他途徑亦同時確認學額。" } }
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
      nav_dse: "DSE Portfolio", nav_streaming: "Streaming Tool", nav_jupas: "JUPAS Finder", nav_finder: "Programme Finder+", nav_jupaschoices: "JUPAS Choices",
      pg_title: "For Parents",
      pg_sub: "A calm, practical guide to your child's senior-secondary journey — how it works, and how to help without adding pressure.",
      orient_h: "Getting your bearings",
      orient_sub: "Four things that make the rest easier to follow.",
      tl_h: "The F.6 year at a glance",
      tl_sub: "A typical rhythm — exact dates change each year, so always confirm them on the official websites and through the school.",
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
      nav_dse: "DSE 試卷組合", nav_streaming: "選科工具", nav_jupas: "JUPAS 搜尋器", nav_finder: "課程搜尋器＋", nav_jupaschoices: "JUPAS 選科",
      pg_title: "家長園地",
      pg_sub: "陪伴孩子走過高中升學路的一份冷靜實用指南——了解整個流程，以及如何在不施加壓力下給予支持。",
      orient_h: "先掌握方向",
      orient_sub: "先弄清這四點，往後就更容易理解。",
      tl_h: "中六一年一覽",
      tl_sub: "這是一個概略的節奏——確切日期每年均有變動，請務必於官方網站及透過學校查證。",
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
    setText("brand-school", t("school")); setText("brand-dept", t("dept")); setText("brand-motto", t("motto"));
    setText("nav-news", t("nav_news")); setText("nav-info", t("nav_info")); setText("nav-res", t("nav_res"));
    setText("nav-faq", t("nav_faq")); setText("nav-parents", t("nav_parents"));
    setText("nav-studytools", t("nav_studytools")); setText("nav-jupastools", t("nav_jupastools"));
    setText("nav-quiz", t("nav_quiz")); setText("nav-pathways", t("nav_pathways"));
    setText("nav-pomodoro", t("nav_pomodoro")); setText("nav-studyplan", t("nav_studyplan"));
    setText("nav-dse", t("nav_dse")); setText("nav-streaming", t("nav_streaming"));
    setText("nav-jupas", t("nav_jupas")); setText("nav-finder", t("nav_finder")); setText("nav-jupaschoices", t("nav_jupaschoices"));
    setText("footer-about", FOOTER_ABOUT[lang]);
    document.querySelector(".langbtn").textContent = t("lang");
    setText("pg-title", t("pg_title")); setText("pg-sub", t("pg_sub"));
    $("orient-h").querySelector("span:last-child").textContent = t("orient_h");
    setText("orient-sub", t("orient_sub"));
    $("tl-h").querySelector("span:last-child").textContent = t("tl_h");
    setText("tl-sub", t("tl_sub"));
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
