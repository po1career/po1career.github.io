/* ============================================================
   Career Interest Quiz (RIASEC / Holland Codes).
   30 statements, 0/1/2 rating; top-3 interest types -> a
   profile with suggested study & career directions.
   Bilingual, single language shown. All client-side; nothing
   leaves the browser. For reference only.
   ============================================================ */
(function () {
  "use strict";

  // ---- the six RIASEC interest types ----
  var TYPES = [
    { k: "R", c: "#b5683f",
      name: { en: "Realistic", zh: "實幹型" }, label: { en: "The Doer", zh: "實踐者" },
      desc: { en: "You enjoy hands-on, practical work — building, fixing, using tools or machines, sport and the outdoors.",
              zh: "你喜歡動手實作——製作、維修、使用工具或機械，以及運動和戶外活動。" },
      careers: { en: "Engineer · IT technician · surveyor · physiotherapist · pilot · electrician · chef",
                 zh: "工程師．資訊科技技術員．測量師．物理治療師．機師．電工．廚師" },
      subjects: { en: "Physics · ICT · Design & Applied Technology · Biology",
                  zh: "物理．資訊及通訊科技．設計與應用科技．生物" } },
    { k: "I", c: "#3a7ca5",
      name: { en: "Investigative", zh: "研究型" }, label: { en: "The Thinker", zh: "思考者" },
      desc: { en: "You like to analyse, research and solve problems — figuring out how and why things work.",
              zh: "你喜歡分析、研究和解難——探究事物如何運作及背後的原因。" },
      careers: { en: "Scientist · doctor · researcher · data analyst · actuary · engineer · programmer",
                 zh: "科學家．醫生．研究員．數據分析師．精算師．工程師．程式設計師" },
      subjects: { en: "Physics · Chemistry · Biology · M2 · ICT · Economics",
                  zh: "物理．化學．生物．數學單元二．資訊及通訊科技．經濟" } },
    { k: "A", c: "#9a5ba6",
      name: { en: "Artistic", zh: "藝術型" }, label: { en: "The Creator", zh: "創作者" },
      desc: { en: "You enjoy creative, expressive activities — art, design, music, writing or performing.",
              zh: "你喜歡富創意和表達性的活動——藝術、設計、音樂、寫作或表演。" },
      careers: { en: "Designer · architect · journalist · musician · animator · marketer · writer",
                 zh: "設計師．建築師．記者．音樂家．動畫師．市場推廣．作家" },
      subjects: { en: "Visual Arts · Music · Chinese / English Literature · Design",
                  zh: "視覺藝術．音樂．中國／英國文學．設計" } },
    { k: "S", c: "#5b8a5b",
      name: { en: "Social", zh: "社會型" }, label: { en: "The Helper", zh: "助人者" },
      desc: { en: "You like helping, teaching and working with people, and caring for others.",
              zh: "你喜歡幫助、教導他人，與人合作及關懷別人。" },
      careers: { en: "Teacher · social worker · nurse · counsellor · doctor · HR · speech therapist",
                 zh: "教師．社工．護士．輔導員．醫生．人力資源．言語治療師" },
      subjects: { en: "Biology · Economics · History · Geography · Ethics & Religious Studies",
                  zh: "生物．經濟．歷史．地理．倫理與宗教" } },
    { k: "E", c: "#c9952f",
      name: { en: "Enterprising", zh: "企業型" }, label: { en: "The Persuader", zh: "領導者" },
      desc: { en: "You enjoy leading, persuading and taking initiative — business, management and making things happen.",
              zh: "你喜歡領導、說服和帶頭行動——商業、管理，並推動事情實現。" },
      careers: { en: "Entrepreneur · manager · lawyer · marketer · banker · sales · public relations",
                 zh: "創業家．管理人員．律師．市場推廣．銀行家．銷售．公關" },
      subjects: { en: "BAFS · Economics · History",
                  zh: "企業、會計與財務概論．經濟．歷史" } },
    { k: "C", c: "#5f7d8c",
      name: { en: "Conventional", zh: "常規型" }, label: { en: "The Organiser", zh: "組織者" },
      desc: { en: "You like organising, working with data and detail, and keeping things accurate and in order.",
              zh: "你喜歡組織、處理數據和細節，把事情做得準確而有條理。" },
      careers: { en: "Accountant · banker · auditor · administrator · logistics officer · civil servant",
                 zh: "會計師．銀行家．核數師．行政人員．物流主任．公務員" },
      subjects: { en: "BAFS · Economics · ICT · Mathematics",
                  zh: "企業、會計與財務概論．經濟．資訊及通訊科技．數學" } }
  ];
  var TYPE = {}; TYPES.forEach(function (x) { TYPE[x.k] = x; });

  // ---- 30 statements (5 per type, interleaved) ----
  var Q = [
    { t: "R", en: "Repair or build things with tools", zh: "用工具維修或製作物件" },
    { t: "I", en: "Solve maths or logic puzzles", zh: "解數學或邏輯難題" },
    { t: "A", en: "Draw, paint or design things", zh: "繪畫或設計東西" },
    { t: "S", en: "Help or care for other people", zh: "幫助或照顧別人" },
    { t: "E", en: "Lead a group or a project", zh: "領導小組或項目" },
    { t: "C", en: "Organise information or keep records", zh: "整理資料或保存記錄" },
    { t: "R", en: "Work with machines, engines or electronics", zh: "接觸機械、引擎或電子產品" },
    { t: "I", en: "Do science experiments", zh: "做科學實驗" },
    { t: "A", en: "Play music, sing or perform", zh: "演奏音樂、唱歌或表演" },
    { t: "S", en: "Teach or explain things to others", zh: "教導別人或解釋事情" },
    { t: "E", en: "Persuade or convince other people", zh: "說服別人" },
    { t: "C", en: "Work with numbers, accounts or budgets", zh: "處理數字、帳目或預算" },
    { t: "R", en: "Play sports or do active, physical tasks", zh: "做運動或動手的體力活動" },
    { t: "I", en: "Research how or why things happen", zh: "探究事物的原理或成因" },
    { t: "A", en: "Write stories, poems or articles", zh: "寫故事、詩或文章" },
    { t: "S", en: "Listen to others and give advice", zh: "聆聽別人並給予意見" },
    { t: "E", en: "Start a small business or sell things", zh: "創業或銷售產品" },
    { t: "C", en: "Follow clear steps and rules carefully", zh: "仔細地按清晰步驟和規則做事" },
    { t: "R", en: "Work outdoors, or with plants and animals", zh: "在戶外工作，或接觸動植物" },
    { t: "I", en: "Analyse data or information", zh: "分析數據或資料" },
    { t: "A", en: "Think up original, creative ideas", zh: "構思有創意的點子" },
    { t: "S", en: "Volunteer for community or charity work", zh: "參與社區或慈善義工" },
    { t: "E", en: "Speak in public or present ideas", zh: "公開演說或匯報意念" },
    { t: "C", en: "Keep things tidy and well-ordered", zh: "把事物整理得井井有條" },
    { t: "R", en: "Take apart gadgets to see how they work", zh: "拆開小裝置研究其運作" },
    { t: "I", en: "Read about science and technology", zh: "閱讀科學與科技資訊" },
    { t: "A", en: "Take photos or make videos", zh: "拍攝相片或影片" },
    { t: "S", en: "Work closely as part of a team", zh: "與團隊緊密合作" },
    { t: "E", en: "Make decisions and take charge", zh: "作決定、擔當主導" },
    { t: "C", en: "Plan schedules and manage details", zh: "編排時間表及管理細節" }
  ];

  var OPTS = [
    { v: 2, em: "👍", en: "Interested", zh: "有興趣" },
    { v: 1, em: "😐", en: "Neutral", zh: "一般" },
    { v: 0, em: "👎", en: "Not interested", zh: "沒興趣" }
  ];

  var T = {
    en: {
      school: "PLK No.1 W.H. Cheung College", dept: "Career Team", motto: "Dream high and fly high",
      nav_news: "Latest News", nav_info: "Info", nav_res: "Useful Links", nav_faq: "FAQ & Glossary", nav_parents: "For Parents", nav_studytools: "Study Tools", nav_jupastools: "JUPAS Tools",
      nav_quiz: "Career Quiz", nav_pathways: "Pathways Explorer", nav_pomodoro: "Pomodoro", nav_studyplan: "Study Plan", nav_dse: "DSE Portfolio",
      nav_streaming: "Streaming Tool", nav_jupas: "JUPAS Finder", nav_finder: "Programme Finder+", nav_jupaschoices: "JUPAS Choices",
      pg_title: "Career Interest Quiz",
      pg_sub: "Discover your interest types and the study and career directions that may suit you.",
      how: "This short quiz is based on the RIASEC model (Holland Codes). You'll rate 30 everyday activities — there are no right or wrong answers. At the end you'll see your top interest types, with example careers and subjects to explore.",
      disc: "Your interests can change as you grow and try new things. This quiz is just a starting point for reflection — not a fixed label or a prediction of your future. Use it as one reference, and talk it over with your Career teacher and family.",
      start: "Start the quiz",
      qlead: "How interested are you in this?",
      back: "← Back",
      count: "Question {n} of {total}",
      res_head: "Your interest profile",
      res_code: "Your Holland code: ",
      res_allhead: "All six interest types",
      next: "Next steps: explore matching electives with the <a href=\"streaming-tool.html\">Streaming Tool</a>, browse degree programmes in the <a href=\"jupas-tool.html\">JUPAS Finder</a>, or talk it through with your Career teacher.",
      retake: "Retake the quiz",
      rank: "Top interest", rank2: "2nd", rank3: "3rd",
      lbl_careers: "Example careers", lbl_subjects: "Subjects to explore",
      lang: "中文"
    },
    zh: {
      school: "保良局第一張永慶中學", dept: "升學輔導及生涯規劃組", motto: "展翅高飛・逐夢前行",
      nav_news: "最新消息", nav_info: "資訊", nav_res: "實用連結", nav_faq: "常見問題", nav_parents: "家長園地", nav_studytools: "學習工具", nav_jupastools: "JUPAS 工具",
      nav_quiz: "興趣測驗", nav_pathways: "升學出路", nav_pomodoro: "番茄鐘", nav_studyplan: "溫習計劃", nav_dse: "DSE 試卷組合",
      nav_streaming: "選科工具", nav_jupas: "JUPAS 搜尋器", nav_finder: "課程搜尋器＋", nav_jupaschoices: "JUPAS 選科",
      pg_title: "職業興趣測驗",
      pg_sub: "了解你的興趣類型，找出可能適合你的升學及職業方向。",
      how: "本測驗以 RIASEC 模型（霍蘭德職業興趣理論）為基礎。你將為 30 項日常活動評分——答案沒有對錯。完成後會顯示你最突出的興趣類型，以及可探索的職業和科目例子。",
      disc: "你的興趣會隨着成長和嘗試而改變。本測驗只是自我反思的起點，並非為你定型，也不能預測你的未來。請只作參考，並與升學輔導老師及家人商討。",
      start: "開始測驗",
      qlead: "你對這項活動有多大興趣？",
      back: "← 上一題",
      count: "第 {n} 題，共 {total} 題",
      res_head: "你的興趣概覽",
      res_code: "你的霍蘭德代碼：",
      res_allhead: "六種興趣類型總覽",
      next: "下一步：用<a href=\"streaming-tool.html\">選科工具</a>探索合適的選修科、在 <a href=\"jupas-tool.html\">JUPAS 搜尋器</a>瀏覽大學課程，或與升學輔導老師商討。",
      retake: "重新測驗",
      rank: "最突出興趣", rank2: "第二", rank3: "第三",
      lbl_careers: "職業例子", lbl_subjects: "可探索科目",
      lang: "EN"
    }
  };

  var lang = localStorage.getItem("clp_lang") || "en";
  var state = { screen: "intro", i: 0, answers: Q.map(function () { return null; }) };

  function t(k) { return (T[lang] || T.en)[k]; }
  function setText(id, v) { var el = document.getElementById(id); if (el) el.textContent = v; }
  function $(id) { return document.getElementById(id); }

  function applyChrome() {
    document.documentElement.lang = lang === "zh" ? "zh-HK" : "en";
    document.title = t("pg_title") + " — PLK No.1 Career Team";
    setText("brand-school", t("school")); setText("brand-dept", t("dept")); setText("brand-motto", t("motto"));
    setText("nav-news", t("nav_news")); setText("nav-res", t("nav_res")); setText("nav-info", t("nav_info")); setText("nav-faq", t("nav_faq")); setText("nav-parents", t("nav_parents"));
    setText("nav-studytools", t("nav_studytools")); setText("nav-jupastools", t("nav_jupastools"));
    setText("nav-quiz", t("nav_quiz")); setText("nav-pathways", t("nav_pathways")); setText("nav-pomodoro", t("nav_pomodoro"));
    setText("nav-studyplan", t("nav_studyplan")); setText("nav-dse", t("nav_dse"));
    setText("nav-streaming", t("nav_streaming")); setText("nav-jupas", t("nav_jupas")); setText("nav-finder", t("nav_finder"));
    setText("nav-jupaschoices", t("nav_jupaschoices"));
    setText("footer-about", FOOTER_ABOUT[lang]);
    document.querySelector(".langbtn").textContent = t("lang");
    setText("pg-title", t("pg_title")); setText("pg-sub", t("pg_sub"));
  }
  var FOOTER_ABOUT = {
    en: "We help students explore their interests, plan their academic pathways, and prepare for university and future careers through guidance, workshops, and information sharing.",
    zh: "我們透過輔導、工作坊及資訊分享，協助學生探索興趣、規劃學業路徑，為升學及未來事業作好準備。"
  };

  function show(screen) {
    state.screen = screen;
    $("cq-intro").style.display = screen === "intro" ? "block" : "none";
    $("cq-run").style.display = screen === "run" ? "block" : "none";
    $("cq-results").style.display = screen === "results" ? "block" : "none";
  }

  function renderIntro() {
    setText("how-text", t("how"));
    setText("disc-text", t("disc"));
    setText("disc-text2", t("disc"));
    setText("start-btn", t("start"));
    var box = $("types6"); box.innerHTML = "";
    TYPES.forEach(function (x) {
      var s = document.createElement("span");
      s.className = "cq-chip"; s.style.background = x.c;
      s.textContent = x.k + " · " + x.name[lang];
      box.appendChild(s);
    });
  }

  function renderQuestion() {
    var n = state.i, total = Q.length;
    $("prog-bar").style.width = Math.round((n) / total * 100) + "%";
    setText("prog-count", t("count").replace("{n}", n + 1).replace("{total}", total));
    setText("q-lead", t("qlead"));
    setText("q-text", Q[n][lang]);
    var ans = $("q-ans"); ans.innerHTML = "";
    OPTS.forEach(function (o) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "cq-opt" + (state.answers[n] === o.v ? " sel" : "");
      b.innerHTML = '<span class="em">' + o.em + "</span>" + o[lang];
      b.onclick = function () { answer(o.v); };
      ans.appendChild(b);
    });
    var back = $("back-btn");
    back.textContent = t("back");
    back.disabled = n === 0;
  }

  function answer(v) {
    state.answers[state.i] = v;
    if (state.i < Q.length - 1) { state.i++; renderQuestion(); }
    else { showResults(); }
  }

  function scores() {
    var s = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
    Q.forEach(function (q, i) { s[q.t] += (state.answers[i] || 0); });
    return s;
  }

  function showResults() {
    var s = scores();
    var ranked = TYPES.slice().sort(function (a, b) { return s[b.k] - s[a.k]; });
    var max = Q.length / 6 * 2; // 10 per type

    setText("res-head", t("res_head"));
    $("res-code").innerHTML = t("res_code") + "<b>" + ranked.slice(0, 3).map(function (x) { return x.k; }).join("") + "</b>";

    var rankLbl = [t("rank"), t("rank2"), t("rank3")];
    var top = $("res-top"); top.innerHTML = "";
    ranked.slice(0, 3).forEach(function (x, i) {
      var d = document.createElement("div");
      d.className = "cq-type"; d.style.setProperty("--tc", x.c);
      d.innerHTML =
        '<div class="rank">' + rankLbl[i] + "</div>" +
        "<h3><span class=\"code\">" + x.k + "</span>" + x.name[lang] + " · " + x.label[lang] + "</h3>" +
        "<p>" + x.desc[lang] + "</p>" +
        '<div class="lbl">' + t("lbl_careers") + "</div><div class=\"vals\">" + x.careers[lang] + "</div>" +
        '<div class="lbl">' + t("lbl_subjects") + "</div><div class=\"vals\">" + x.subjects[lang] + "</div>";
      top.appendChild(d);
    });

    setText("res-allhead", t("res_allhead"));
    var bars = $("res-bars"); bars.innerHTML = "";
    ranked.forEach(function (x) {
      var pct = Math.round(s[x.k] / max * 100);
      var row = document.createElement("div");
      row.className = "cq-bar"; row.style.setProperty("--tc", x.c);
      row.innerHTML =
        '<span class="bn">' + x.k + " · " + x.name[lang] + "</span>" +
        '<span class="bt"><span style="width:' + pct + '%"></span></span>' +
        '<span class="bv">' + s[x.k] + "</span>";
      bars.appendChild(row);
    });

    $("res-next").innerHTML = t("next");
    setText("retake-btn", t("retake"));
    show("results");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function rerender() {
    applyChrome();
    renderIntro();
    if (state.screen === "run") renderQuestion();
    else if (state.screen === "results") showResults();
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelector(".langbtn").onclick = function () {
      lang = lang === "en" ? "zh" : "en";
      localStorage.setItem("clp_lang", lang);
      rerender();
    };
    $("start-btn").onclick = function () { state.i = 0; show("run"); renderQuestion(); window.scrollTo({ top: 0, behavior: "smooth" }); };
    $("back-btn").onclick = function () { if (state.i > 0) { state.i--; renderQuestion(); } };
    $("retake-btn").onclick = function () {
      state.answers = Q.map(function () { return null; }); state.i = 0; show("intro");
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
    var logo = $("logo-img");
    if (logo) logo.onerror = function () { var fb = document.createElement("div"); fb.className = "logo-fallback"; fb.textContent = "PLK①"; logo.replaceWith(fb); };

    applyChrome(); renderIntro(); show("intro");
  });
})();
