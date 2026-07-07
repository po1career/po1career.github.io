/* ============================================================
   FAQ & Glossary. Plain-language answers + a glossary of the
   jargon. Bilingual, single language shown. All client-side.
   General guidance only — students should confirm specifics
   with their Career teacher and the official websites.
   ============================================================ */
(function () {
  "use strict";

  /* ---- glossary terms ---- */
  var GLOSSARY = [
    { abbr: "DSE", term: { en: "HKDSE", zh: "中學文憑試" },
      def: { en: "The Hong Kong Diploma of Secondary Education — the public exam taken at the end of F.6 that universities use for admission.",
             zh: "香港中學文憑考試——中六結束時應考的公開試，大學以此成績取錄學生。" } },
    { abbr: "JUPAS", term: { en: "JUPAS", zh: "大學聯招" },
      def: { en: "The Joint University Programmes Admissions System — the main route into government-funded bachelor's degrees using your DSE results.",
             zh: "大學聯合招生辦法——以文憑試成績入讀政府資助學士課程的主要途徑。" } },
    { abbr: "", term: { en: "Core subjects", zh: "核心科目" },
      def: { en: "The subjects everyone takes: Chinese Language, English Language, Mathematics (Compulsory) and Citizenship & Social Development.",
             zh: "所有學生必修的科目：中國語文、英國語文、數學（必修）及公民與社會發展。" } },
    { abbr: "", term: { en: "Elective", zh: "選修科" },
      def: { en: "The subjects you choose (usually 2–3) on top of the core — e.g. Physics, Economics, Biology, BAFS, Visual Arts.",
             zh: "在核心科以外自選的科目（一般 2–3 科），例如物理、經濟、生物、企會財、視覺藝術。" } },
    { abbr: "CSD", term: { en: "Citizenship & Social Development", zh: "公民與社會發展" },
      def: { en: "A core subject graded simply “Attained / Not Attained” (it replaced Liberal Studies).",
             zh: "核心科目，只評為「達標／未達標」（取代了通識教育科）。" } },
    { abbr: "M2", term: { en: "Maths Extended Module", zh: "數學延伸單元" },
      def: { en: "Optional extra maths — M2 (Algebra & Calculus), the module offered at our school. Many science, engineering and business degrees value or require it.",
             zh: "額外修讀的數學單元——M2（代數與微積分），即本校開設的單元。不少理工及商科學位重視或要求修讀。" } },
    { abbr: "332A", term: { en: "332A", zh: "332A" },
      def: { en: "The usual minimum for a JUPAS degree: Level 3 in Chinese and English, Level 2 in Maths, and “Attained” in Citizenship & Social Development (graded only Attained / Not Attained) — plus the programme's own elective requirements.",
             zh: "入讀聯招學位的一般最低要求：中、英達第 3 級，數學達第 2 級，公民與社會發展「達標」（只評達標／未達標）——再加課程本身的選修科要求。" } },
    { abbr: "", term: { en: "Best 5", zh: "最佳五科" },
      def: { en: "Many programmes add up the grades of your five strongest subjects to rank applicants. Some use Best 5, others Best 6 or a weighted formula.",
             zh: "不少課程把你最佳五科的成績相加來排名。部分用最佳五科，亦有用最佳六科或加權計分。" } },
    { abbr: "5** … 1", term: { en: "DSE levels", zh: "文憑試等級" },
      def: { en: "Subject grades run from 1 (lowest) up to 5, 5* and 5** (highest); U means unclassified. Scores often convert 5**=7 down to 1=1.",
             zh: "科目等級由第 1 級（最低）至 5、5* 及 5**（最高）；U 為不予評級。計分時常將 5** 算作 7 分，第 1 級算作 1 分。" } },
    { abbr: "Band A", term: { en: "Bands A / B / C", zh: "甲／乙／丙組" },
      def: { en: "How you group your up-to-20 JUPAS choices. Band A is your top 3 (A1–A3) and carries the most weight — put your real first choices there.",
             zh: "把最多 20 個聯招志願分組的方式。甲組是首 3 個志願（A1–A3），權重最大——請把真正首選放在這裡。" } },
    { abbr: "UQ / LQ", term: { en: "UQ · Median · LQ", zh: "上下四分位數・中位數" },
      def: { en: "Upper Quartile, Median and Lower Quartile of last year's admitted students' scores — a guide to how competitive a programme is.",
             zh: "去年獲取錄學生成績的上四分位、中位數及下四分位——可作課程競爭程度的參考。" } },
    { abbr: "", term: { en: "Cut-off score", zh: "收生分數" },
      def: { en: "Roughly the lowest score admitted last year. It changes each year, so treat it only as a rough guide.",
             zh: "大致是去年取錄的最低分數。每年都會變動，只宜作粗略參考。" } },
    { abbr: "SSSDP", term: { en: "SSSDP", zh: "指定專業／界別課程資助計劃" },
      def: { en: "The Study Subsidy Scheme for Designated Professions/Sectors — government-subsidised self-financing degrees in selected fields, at lower tuition.",
             zh: "政府資助、就讀指定專業／界別的自資學士課程，學費較低。" } },
    { abbr: "AD / HD", term: { en: "Sub-degree", zh: "副學位" },
      def: { en: "An Associate Degree (AD) or Higher Diploma (HD) — usually two years, leading to the workplace or to a bachelor's degree.",
             zh: "副學士（AD）或高級文憑（HD）——一般為期兩年，可銜接就業或學士課程。" } },
    { abbr: "", term: { en: "Articulation", zh: "銜接升學" },
      def: { en: "Moving up from a sub-degree into (often Year 2 of) a bachelor's degree.",
             zh: "由副學位升讀學士課程（多為二年級）。" } },
    { abbr: "JS code", term: { en: "JS code", zh: "JS 編號" },
      def: { en: "The JUPAS programme code (e.g. JS1234) that identifies each degree programme.",
             zh: "聯招課程編號（例如 JS1234），用以識別每個學位課程。" } },
    { abbr: "OEA / SLP", term: { en: "OEA · SLP", zh: "比賽／活動經歷・學習概覽" },
      def: { en: "Other Experiences & Achievements and the Student Learning Profile — your non-academic record (activities, awards, service) submitted through JUPAS.",
             zh: "「比賽／活動的經驗與成就」及「學生學習概覽」——經聯招提交的非學術紀錄（活動、獎項、服務）。" } },
    { abbr: "E-APP", term: { en: "E-APP", zh: "專上課程電子預先報名平台" },
      def: { en: "The Electronic Advance Application System for sub-degree and self-financing programmes that are not offered through JUPAS.",
             zh: "為聯招以外的副學位及自資課程而設的電子預先報名系統。" } }
  ];

  /* ---- frequently asked questions ---- */
  var FAQS = [
    { cat: "subjects",
      q: { en: "How many electives should I take — 2 or 3?", zh: "我應選 2 科還是 3 科選修？" },
      a: { en: "Most students take 2–3 electives plus the core subjects. Three can keep more degree options open but means a heavier load; two lets you focus. Choose subjects you're both interested in and can do well in — strong grades matter more than the number. The <a href=\"streaming-tool.html\">Subject Streaming helper</a> can rank combinations for you.",
           zh: "大部分學生在核心科以外修讀 2–3 科選修。三科可保留較多升學選擇，但課業較重；兩科則較能專注。請選你既感興趣、又能考好的科目——好成績比科目數量更重要。可用<a href=\"streaming-tool.html\">選科優次助手</a>為組合排序。" } },
    { cat: "grades",
      q: { en: "What does “332A” mean?", zh: "「332A」是甚麼意思？" },
      a: { en: "It's the usual minimum to be considered for a JUPAS degree: Level 3 in Chinese and English, Level 2 in Maths, and “Attained” in Citizenship & Social Development — which, unlike other subjects, is graded only “Attained / Not Attained” (the “A” in 332A) — plus the programme's own elective requirements. Competitive programmes ask for much more than the minimum.",
           zh: "這是被聯招學位考慮的一般最低要求：中、英達第 3 級，數學達第 2 級，公民與社會發展「達標」——此科與其他科目不同，只評「達標／未達標」（即 332A 中的「A」）——再加課程本身的選修科要求。熱門課程的實際收生遠高於此最低標準。" } },
    { cat: "grades",
      q: { en: "What is the “Best 5” and how is it counted?", zh: "「最佳五科」是甚麼？如何計算？" },
      a: { en: "Many programmes convert your subject grades to points (often 5**=7 down to 1=1) and add up your five strongest subjects to rank applicants. Others use Best 6 or weight certain subjects more heavily — always check each programme's own formula.",
           zh: "不少課程把科目等級換算成分數（常見 5** 算 7 分至第 1 級算 1 分），再把你最佳的五科相加來排名。亦有課程採用最佳六科或對某些科目加權——請查閱各課程的計分方法。" } },
    { cat: "jupas",
      q: { en: "What is JUPAS and when do I apply?", zh: "甚麼是聯招？何時報名？" },
      a: { en: "JUPAS is the main system for applying to government-funded bachelor's degrees with your DSE results. You register and set your choices in F.6 around December, keep refining them until late May, then accept an offer in August (main round early August, clearing round late August) after results are released in mid-July. Your Career teacher will guide you through each step.",
           zh: "聯招是以文憑試成績報讀政府資助學士課程的主要系統。你會在中六約十二月登記及設定志願，並可一直修改至五月底，待七月中放榜後於八月接受取錄（八月初為第一輪，八月下旬為補選）。升學輔導老師會逐步指導你。" } },
    { cat: "jupas",
      q: { en: "What do the UQ, Median and LQ scores tell me?", zh: "上四分位、中位數及下四分位代表甚麼？" },
      a: { en: "They summarise last year's admitted students' scores — the median is the “middle” student, while the upper and lower quartiles show the typical range. They're a useful guide to competitiveness, but they shift every year, so don't treat them as a guarantee.",
           zh: "它們概括了去年獲取錄學生的成績——中位數代表「中間」的學生，上、下四分位顯示常見的分數範圍。可作競爭程度的參考，但每年都會變動，不能視為保證。" } },
    { cat: "jupas",
      q: { en: "What's the difference between a degree, SSSDP and a sub-degree?", zh: "學位、SSSDP 與副學位有何分別？" },
      a: { en: "A JUPAS degree is a government-funded bachelor's degree. SSSDP degrees are subsidised self-financing degrees in selected professions (lower tuition). A sub-degree (Associate Degree / Higher Diploma) is a shorter two-year qualification that can lead to work or articulate into a degree. See the <a href=\"pathways.html\">Pathways Explorer</a> for all routes.",
           zh: "聯招學位是政府資助的學士課程。SSSDP 是就讀指定專業的資助自資學位（學費較低）。副學位（副學士／高級文憑）是為期兩年的較短資歷，可銜接就業或升讀學士。各條出路可參閱<a href=\"pathways.html\">升學出路探索</a>。" } },
    { cat: "after",
      q: { en: "My results are lower than I hoped — what are my options?", zh: "成績比預期低，我有甚麼選擇？" },
      a: { en: "There is more than one route. You might still qualify for some degrees, SSSDP programmes, a sub-degree that articulates to a degree later, vocational study (VTC), the Diploma of Applied Education, or study in the Mainland or overseas. Explore them in the <a href=\"pathways.html\">Pathways Explorer</a>, and talk to your Career teacher early — options are wider than they first seem.",
           zh: "出路不止一條。你可能仍符合部分學位或 SSSDP 課程的要求，也可考慮日後可銜接學位的副學位、職業專才教育（VTC）、應用教育文憑，或到內地及海外升學。可在<a href=\"pathways.html\">升學出路探索</a>了解，並及早與升學輔導老師商討——選擇往往比想像中多。" } },
    { cat: "after",
      q: { en: "Can I change my JUPAS choices after applying?", zh: "報名後還可以更改聯招志願嗎？" },
      a: { en: "Yes — you can update your choices during the application period (around December to late May). After the DSE results come out in mid-July, JUPAS allocates each applicant a 48-hour time slot for one final modification: you may add and / or replace up to 5 programmes, rearrange choices and / or delete choices. Watch the official dates and your own allocated time slot, and check your choices with your Career teacher before each deadline.",
           zh: "可以——在整個申請期內（約十二月至五月底）你可修改志願。文憑試於七月中放榜後，聯招會為每位申請人編配一個 48 小時修改時段；你只可在該時段內提交一次最後修改，可新增及／或更換最多 5 個課程、重新排序及／或刪除志願。請留意官方日期及你的個人編配時段，並在每個限期前與升學輔導老師檢視你的志願。" } },
    { cat: "general",
      q: { en: "Where can I get personal advice?", zh: "我可以向誰尋求個別意見？" },
      a: { en: "Your Career teacher is the best first stop for advice tailored to you. This site's tools and the official websites are starting points for your own research — final decisions should be made together with your teacher and family.",
           zh: "升學輔導老師是尋求個人化意見的最佳起點。本站的工具及官方網站可作自行研究的起點——最終決定宜與老師及家人一同作出。" } }
  ];

  var CATS = {
    subjects: { en: "Choosing subjects", zh: "選科" },
    grades: { en: "Results & grades", zh: "成績與等級" },
    jupas: { en: "JUPAS & university", zh: "聯招與升學" },
    after: { en: "After the DSE", zh: "放榜之後" },
    general: { en: "General", zh: "一般" }
  };

  var T = {
    en: {
      school: "PLK No.1 W.H. Cheung College", dept: "Career Team", motto: "Dream high and fly high",
      nav_news: "Latest News", nav_info: "Info", nav_res: "Useful Links", nav_faq: "FAQ & Glossary", nav_parents: "For Parents",
      nav_studytools: "Study Tools", nav_jupastools: "JUPAS Tools",
      nav_quiz: "Career Quiz", nav_pathways: "Pathways Explorer", nav_pomodoro: "Pomodoro", nav_studyplan: "Study Plan",
      nav_dse: "DSE Portfolio", nav_streaming: "Streaming Tool", nav_jupas: "JUPAS Finder", nav_jupaschoices: "JUPAS Choices",
      pg_title: "FAQ & Glossary",
      pg_sub: "The jargon, demystified — plus plain-language answers to the questions students and parents ask most.",
      jump_gloss: "Glossary", jump_faq: "Questions",
      gloss_h: "Glossary — the words decoded",
      gloss_hint: "The terms you'll hear around subject choice, the DSE and university admission.",
      faq_h: "Frequently asked questions",
      faq_hint: "Tap a question to see the answer.",
      note: "This page gives general guidance for PLK No.1 students. Schemes and requirements change each year — always confirm the details on the official websites and with your Career teacher before deciding.",
      lang: "中文"
    },
    zh: {
      school: "保良局第一張永慶中學", dept: "升學輔導及生涯規劃組", motto: "展翅高飛・逐夢前行",
      nav_news: "最新消息", nav_info: "資訊", nav_res: "實用連結", nav_faq: "常見問題", nav_parents: "家長園地",
      nav_studytools: "學習工具", nav_jupastools: "JUPAS 工具",
      nav_quiz: "興趣測驗", nav_pathways: "升學出路", nav_pomodoro: "番茄鐘", nav_studyplan: "溫習計劃",
      nav_dse: "DSE 試卷組合", nav_streaming: "選科工具", nav_jupas: "JUPAS 搜尋器", nav_jupaschoices: "JUPAS 選科",
      pg_title: "常見問題與詞彙",
      pg_sub: "拆解升學術語，並以淺白語言解答學生和家長最常問的問題。",
      jump_gloss: "詞彙表", jump_faq: "常見問題",
      gloss_h: "詞彙表——術語拆解",
      gloss_hint: "選科、文憑試及大學收生時常會聽到的詞語。",
      faq_h: "常見問題",
      faq_hint: "輕按問題即可展開答案。",
      note: "本頁為保良局第一張永慶中學學生提供一般指引。各項計劃及要求每年均有變動——決定前請於官方網站及向升學輔導老師查證詳情。",
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
    setText("jump-gloss", t("jump_gloss")); setText("jump-faq", t("jump_faq"));
    $("gloss-h").querySelector("span:last-child").textContent = t("gloss_h");
    setText("gloss-hint", t("gloss_hint"));
    $("faq-h").querySelector("span:last-child").textContent = t("faq_h");
    setText("faq-hint", t("faq_hint"));
    setText("fq-note", t("note"));
  }

  function renderGlossary() {
    var grid = $("gl-grid"); grid.innerHTML = "";
    GLOSSARY.forEach(function (g) {
      var d = document.createElement("div");
      d.className = "gl-card";
      d.innerHTML =
        '<div class="gl-term">' + L(g.term) +
        (g.abbr ? ' <span class="gl-abbr">' + g.abbr + "</span>" : "") + "</div>" +
        '<p class="gl-def">' + L(g.def) + "</p>";
      grid.appendChild(d);
    });
  }

  function renderFaqs() {
    var list = $("faq-list"); list.innerHTML = "";
    FAQS.forEach(function (f) {
      var d = document.createElement("details");
      d.className = "faq";
      d.innerHTML =
        "<summary><span class=\"qmark\" aria-hidden=\"true\">Q</span><span>" + L(f.q) + "</span>" +
        "<span class=\"chev\" aria-hidden=\"true\">▾</span></summary>" +
        '<div class="ans">' + L(f.a) + "</div>";
      list.appendChild(d);
    });
  }

  function rerender() { applyChrome(); renderGlossary(); renderFaqs(); }

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
