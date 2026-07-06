/* ============================================================
   Multiple Pathways Explorer (Phase 1).
   A guided filter + browsable cards of the routes available
   after the HKDSE. Bilingual, single language shown. All
   client-side; nothing leaves the browser.

   The content here is a SIMPLIFIED overview for guidance only.
   Entry requirements and schemes change yearly — the Career
   team should fact-check against the official sites before
   relying on it. Keep specifics general; lean on the links.
   ============================================================ */
(function () {
  "use strict";

  /* ---- filter dimensions ----
     results: degree | mid | building
     mode:    academic | vocational | earn
     place:   hk | mainland | overseas              */

  var PATHWAYS = [
    { id: "jupas", icon: "🎓", c: "#2f6db0", c2: "#57a0db",
      tags: { results: ["degree"], mode: ["academic"], place: ["hk"] },
      name: { en: "JUPAS — Local Bachelor's Degrees", zh: "JUPAS — 本地學士學位" },
      summary: { en: "Full-time degrees at Hong Kong's UGC-funded universities.",
                 zh: "入讀香港教資會資助大學的全日制學士課程。" },
      forWho: { en: "Students aiming for a university degree who meet the minimum entry requirements.",
                zh: "有志升讀大學、並達到最低入學要求的學生。" },
      entry: { en: "Usually the “332A” minimum (Level 3 Chinese & English, Level 2 Maths, Citizenship & Social Development “Attained”) plus electives; each programme sets its own subject requirements.",
               zh: "一般須達「332A」最低要求（中、英達第 3 級，數學達第 2 級，公民與社會發展「達標」）並符合課程指定的選修科要求。" },
      leadsTo: { en: "A recognised bachelor's degree, leading to professional or postgraduate study.",
                 zh: "獲認可的學士學位，銜接專業資格或研究生課程。" },
      applyVia: { en: "JUPAS (jupas.edu.hk).", zh: "大學聯招辦法（JUPAS）。" },
      link: { href: "https://www.jupas.edu.hk", label: { en: "Visit JUPAS", zh: "前往 JUPAS" } },
      next: { en: "Browse programmes with the <a href=\"jupas-finder.html\">JUPAS Finder</a> on this site.",
              zh: "可用本站的 <a href=\"jupas-finder.html\">JUPAS 搜尋器</a>瀏覽課程。" } },

    { id: "sssdp", icon: "💡", c: "#1f8a7a", c2: "#4fb9a3",
      tags: { results: ["degree", "mid"], mode: ["academic", "vocational"], place: ["hk"] },
      name: { en: "SSSDP — Subsidised Professional Degrees", zh: "SSSDP — 指定專業資助學士" },
      summary: { en: "Government-subsidised self-financing degrees in selected professions and sectors.",
                 zh: "政府資助、就讀指定專業／界別的自資學士課程。" },
      forWho: { en: "Students keen on fields with manpower demand — healthcare, IT, construction, tourism, creative industries and more.",
                zh: "有意投身人力需求殷切行業的學生，例如醫療、資訊科技、建造、旅遊及創意產業等。" },
      entry: { en: "Meet the programme's DSE requirements; many are applied for through JUPAS.",
               zh: "達到課程的 DSE 入學要求；不少課程經 JUPAS 申請。" },
      leadsTo: { en: "A bachelor's degree in a targeted profession, at a lower subsidised tuition.",
                 zh: "以較低資助學費，修讀指定專業的學士學位。" },
      applyVia: { en: "Via JUPAS or the institution; see the SSSDP programme list.",
                  zh: "經 JUPAS 或院校申請；參閱 SSSDP 課程名單。" },
      link: { href: "https://www.cspe.edu.hk/en/sssdp/", label: { en: "About SSSDP", zh: "認識 SSSDP" } } },

    { id: "selffin", icon: "🏛️", c: "#7a52a8", c2: "#a481cf",
      tags: { results: ["degree", "mid"], mode: ["academic"], place: ["hk"] },
      name: { en: "Self-financing Bachelor's Degrees", zh: "自資學士學位" },
      summary: { en: "Degrees offered by self-financing institutions and universities.",
                 zh: "由自資院校及大學開辦的學士課程。" },
      forWho: { en: "Students wanting a degree place beyond the JUPAS-funded quota, or in a specific programme.",
                zh: "希望在資助學額以外升讀學士，或修讀特定課程的學生。" },
      entry: { en: "Programme-specific DSE requirements; some accept sub-degree graduates for senior-year entry.",
               zh: "按課程而定的 DSE 要求；部分課程接受副學位畢業生作高年級入學。" },
      leadsTo: { en: "A locally-accredited bachelor's degree.", zh: "獲本地認證的學士學位。" },
      applyVia: { en: "Directly to the institution, or via E-APP (eapp.gov.hk).",
                  zh: "直接向院校或經 E-APP 申請。" },
      link: { href: "https://www.cspe.edu.hk/en/", label: { en: "Browse programmes", zh: "瀏覽課程資訊" } } },

    { id: "subdeg", icon: "📗", c: "#b5683f", c2: "#db9461",
      tags: { results: ["mid", "building"], mode: ["academic", "vocational"], place: ["hk"] },
      name: { en: "Sub-degree — Associate Degree / Higher Diploma", zh: "副學位 — 副學士／高級文憑" },
      summary: { en: "Two-year programmes that can lead to year-two degree entry or the workplace.",
                 zh: "為期兩年的課程，可銜接學士二年級或就業。" },
      forWho: { en: "Students who want more time to lift their grades before a degree, or a practical qualification.",
                zh: "希望以更多時間提升成績再升讀學位，或取得實用資歷的學生。" },
      entry: { en: "Typically five DSE subjects at Level 2 (including languages), or equivalent.",
               zh: "一般須五科 DSE 達第二級（包括語文科）或同等學歷。" },
      leadsTo: { en: "Articulation to a bachelor's degree (often year 2), or employment.",
                 zh: "銜接學士課程（多為二年級）或就業。" },
      applyVia: { en: "E-APP (eapp.gov.hk) or the institution.", zh: "經 E-APP 或院校申請。" },
      link: { href: "https://www.eapp.gov.hk/en/", label: { en: "Apply via E-APP", zh: "經 E-APP 申請" } } },

    { id: "vtc", icon: "🔧", c: "#4c8a4c", c2: "#79b779",
      tags: { results: ["mid", "building"], mode: ["vocational"], place: ["hk"] },
      name: { en: "VTC / IVE — Vocational Education", zh: "VTC／IVE — 職業專才教育" },
      summary: { en: "Hands-on Higher Diplomas and vocational programmes across many industries.",
                 zh: "涵蓋多個行業、著重實踐的高級文憑及職業課程。" },
      forWho: { en: "Students who learn best by doing and want job-ready, industry-linked skills.",
                zh: "喜歡從實作中學習、希望掌握與行業接軌技能的學生。" },
      entry: { en: "Ranges from foundation programmes up to Higher Diploma, with different DSE requirements.",
               zh: "由基礎課程至高級文憑不等，入學要求各異。" },
      leadsTo: { en: "Direct employment, or articulation to a degree.", zh: "直接就業，或銜接學士課程。" },
      applyVia: { en: "VTC (vtc.edu.hk).", zh: "職業訓練局（VTC）。" },
      link: { href: "https://www.vtc.edu.hk", label: { en: "Visit VTC", zh: "前往 VTC" } } },

    { id: "dae", icon: "🪜", c: "#c1597a", c2: "#e58aa6",
      tags: { results: ["building"], mode: ["vocational"], place: ["hk"] },
      name: { en: "Diploma of Applied Education (formerly Yi Jin)", zh: "應用教育文憑（前稱毅進文憑）" },
      summary: { en: "A full-time alternative to the DSE, recognised as five subjects at Level 2.",
                 zh: "全日制的 DSE 替代途徑，獲認可等同五科達第二級。" },
      forWho: { en: "F.6 leavers or adult learners wanting another route to further study or work.",
                zh: "希望以另一途徑升學或就業的中六離校生及成人學員。" },
      entry: { en: "Open to F.6 leavers and learners aged 21 or above; no DSE results required.",
               zh: "適合中六離校生及 21 歲或以上人士；不需 DSE 成績。" },
      leadsTo: { en: "Recognised as equivalent to 5 DSE subjects (Level 2) for further study and many jobs.",
                 zh: "獲認可等同五科 DSE（第二級），可繼續升學或就業。" },
      applyVia: { en: "Participating institutions; see the EDB Diploma of Applied Education page.",
                  zh: "經參與院校報讀；詳見教育局「應用教育文憑」網頁。" },
      link: { href: "https://www.edb.gov.hk/en/edu-system/other-edu-training/vocational-other-edu-program/Diploma%20of%20Applied%20Education/Index.html",
              label: { en: "About the diploma", zh: "了解課程" } } },

    { id: "mainland", icon: "🏯", c: "#b23b3b", c2: "#db6a52",
      tags: { results: ["degree", "mid"], mode: ["academic"], place: ["mainland"] },
      name: { en: "Mainland University Admission Scheme", zh: "內地高校文憑試收生計劃" },
      summary: { en: "Mainland Chinese universities that admit Hong Kong students using DSE results.",
                 zh: "內地大學透過文憑試成績招收香港學生。" },
      forWho: { en: "Students open to studying in Mainland China, often at lower cost.",
                zh: "願意到內地升學、學費一般較低的學生。" },
      entry: { en: "Based on DSE results; each university sets its own required levels.",
               zh: "以 DSE 成績為準；各院校自訂分數要求。" },
      leadsTo: { en: "A bachelor's degree from a Mainland institution.", zh: "內地院校頒授的學士學位。" },
      applyVia: { en: "The Mainland admission scheme (文憑試收生計劃); see the EDB page.",
                  zh: "「文憑試收生計劃」；詳見教育局網頁。" },
      link: { href: "https://www.edb.gov.hk/en/edu-system/postsecondary/policy-doc/pilot-scheme.html",
              label: { en: "About the scheme", zh: "了解計劃" } } },

    { id: "overseas", icon: "✈️", c: "#2f86a8", c2: "#5fc0d6",
      tags: { results: ["degree", "mid", "building"], mode: ["academic", "vocational"], place: ["overseas"] },
      name: { en: "Study Overseas", zh: "海外升學" },
      summary: { en: "Bachelor's or foundation study abroad — the UK, Australia, Canada and beyond.",
                 zh: "到英國、澳洲、加拿大等地升讀學士或基礎課程。" },
      forWho: { en: "Students seeking international experience who have planned their funding and entry routes.",
                zh: "希望累積國際經驗、並已規劃學費及升學途徑的學生。" },
      entry: { en: "Varies by country and institution; the DSE is widely accepted by many overseas universities.",
               zh: "按國家及院校而定；不少海外大學均承認 DSE 成績。" },
      leadsTo: { en: "An overseas bachelor's degree and global exposure.", zh: "海外學士學位及國際視野。" },
      applyVia: { en: "Through each country's application system, or directly to the institution.",
                  zh: "經各國的升學申請系統，或直接向院校申請。" } }
  ];

  /* ---- filter question definitions ---- */
  var FILTERS = [
    { dim: "results", q: { en: "Your DSE results are likely to be…", zh: "你的 DSE 成績預計…" },
      opts: [
        { v: "degree",   em: "🎯", en: "Degree-ready",      zh: "達學位水平" },
        { v: "mid",      em: "📈", en: "Mid-range",         zh: "中等成績" },
        { v: "building", em: "🌱", en: "Still building up", zh: "仍在努力中" },
        { v: "any",      em: "🤷", en: "Not sure",          zh: "未定" } ] },
    { dim: "mode", q: { en: "You'd most like to…", zh: "你最希望…" },
      opts: [
        { v: "academic",   em: "📚", en: "Study academically", zh: "學術進修" },
        { v: "vocational", em: "🛠️", en: "Learn job skills",   zh: "學一技之長" },
        { v: "any",        em: "✨", en: "Open to any",        zh: "都可以" } ] },
    { dim: "place", q: { en: "Where would you like to study?", zh: "你希望在哪裡升學？" },
      opts: [
        { v: "hk",       em: "🏙️", en: "Hong Kong",     zh: "香港" },
        { v: "mainland", em: "🏯", en: "Mainland China", zh: "內地" },
        { v: "overseas", em: "🌏", en: "Overseas",       zh: "海外" },
        { v: "any",      em: "✨", en: "Open to any",    zh: "不限" } ] }
  ];

  var T = {
    en: {
      school: "PLK No.1 W.H. Cheung College", dept: "Career Team", motto: "Dream high and fly high",
      nav_news: "Latest News", nav_info: "Info", nav_res: "Useful Links", nav_faq: "FAQ & Glossary", nav_parents: "For Parents", nav_studytools: "Study Tools", nav_jupastools: "JUPAS Tools",
      nav_quiz: "Career Quiz", nav_pathways: "Pathways Explorer", nav_pomodoro: "Pomodoro", nav_studyplan: "Study Plan",
      nav_dse: "DSE Portfolio", nav_streaming: "Streaming Tool", nav_jupas: "JUPAS Finder", nav_jupaschoices: "JUPAS Choices",
      pg_title: "Multiple Pathways Explorer",
      pg_sub: "There is more than one route after the HKDSE. Answer three quick questions to highlight the pathways that may fit you — then explore them all.",
      disc: "Entry requirements and schemes change every year, and this page is a simplified overview — not official advice. Always check the latest details on each official website, and talk your options through with your Career teacher and family before deciding.",
      filter_h: "🧭 Find pathways that fit you",
      filter_sub: "Optional — pick what's true for you, or leave any question as it is. Matching pathways move to the top with a badge.",
      matches_only: "Show matching pathways only",
      reset: "Reset",
      count_one: "Showing <b>{shown}</b> of {total} pathways · <b>{match}</b> match you",
      count_none: "Showing all <b>{total}</b> pathways — answer above to see your matches",
      badge: "Matches you",
      k_forwho: "For who", k_entry: "Typical entry", k_leads: "Leads to", k_apply: "Apply via",
      lang: "中文"
    },
    zh: {
      school: "保良局第一張永慶中學", dept: "升學輔導及生涯規劃組", motto: "展翅高飛・逐夢前行",
      nav_news: "最新消息", nav_info: "資訊", nav_res: "實用連結", nav_faq: "常見問題", nav_parents: "家長園地", nav_studytools: "學習工具", nav_jupastools: "JUPAS 工具",
      nav_quiz: "興趣測驗", nav_pathways: "升學出路", nav_pomodoro: "番茄鐘", nav_studyplan: "溫習計劃",
      nav_dse: "DSE 試卷組合", nav_streaming: "選科工具", nav_jupas: "JUPAS 搜尋器", nav_jupaschoices: "JUPAS 選科",
      pg_title: "升學出路探索",
      pg_sub: "中學文憑試後，出路不止一條。回答三條簡單問題，找出可能適合你的途徑，再逐一探索。",
      disc: "入學要求及計劃每年均有變動，本頁只屬簡化概覽，並非官方指引。決定前請務必瀏覽各官方網站查證最新資料，並與升學輔導老師及家人商討。",
      filter_h: "🧭 找出適合你的出路",
      filter_sub: "可選填——選出符合你情況的選項，或保持不變。配對的出路會置頂並顯示標記。",
      matches_only: "只顯示配對的出路",
      reset: "重設",
      count_one: "顯示 {total} 條出路中的 <b>{shown}</b> 條 · <b>{match}</b> 條與你配對",
      count_none: "顯示全部 <b>{total}</b> 條出路——在上方作答即可看到配對結果",
      badge: "與你配對",
      k_forwho: "適合對象", k_entry: "一般入學", k_leads: "出路銜接", k_apply: "申請途徑",
      lang: "EN"
    }
  };

  var FOOTER_ABOUT = {
    en: "We help students explore their interests, plan their academic pathways, and prepare for university and future careers through guidance, workshops, and information sharing.",
    zh: "我們透過輔導、工作坊及資訊分享，協助學生探索興趣、規劃學業路徑，為升學及未來事業作好準備。"
  };

  var lang = localStorage.getItem("clp_lang") || "en";
  var state = { results: "any", mode: "any", place: "any", matchesOnly: false };
  var cards = []; // { p, el, badge }

  function t(k) { return (T[lang] || T.en)[k]; }
  function L(o) { return (o && o[lang]) || (o && o.en) || ""; }
  function setText(id, v) { var el = document.getElementById(id); if (el) el.textContent = v; }
  function $(id) { return document.getElementById(id); }

  function applyChrome() {
    document.documentElement.lang = lang === "zh" ? "zh-HK" : "en";
    document.title = t("pg_title") + " — PLK No.1 Career Team";
    setText("footer-about", FOOTER_ABOUT[lang]);
    setText("pg-title", t("pg_title")); setText("pg-sub", t("pg_sub"));
    setText("disc-text", t("disc"));
    setText("filter-h", t("filter_h")); setText("filter-sub", t("filter_sub"));
    setText("matches-only-lbl", t("matches_only")); setText("reset-btn", t("reset"));
  }

  function renderFilters() {
    var box = $("filter-questions"); box.innerHTML = "";
    FILTERS.forEach(function (f) {
      var wrap = document.createElement("div"); wrap.className = "pw-fq";
      var lbl = document.createElement("div"); lbl.className = "pw-fq-lbl"; lbl.textContent = L(f.q);
      var chips = document.createElement("div"); chips.className = "pw-chips";
      f.opts.forEach(function (o) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "pw-chip" + (state[f.dim] === o.v ? " active" : "");
        b.innerHTML = '<span class="em" aria-hidden="true">' + o.em + "</span>" + o[lang];
        b.setAttribute("aria-pressed", state[f.dim] === o.v ? "true" : "false");
        b.onclick = function () { state[f.dim] = o.v; renderFilters(); applyFilter(); };
        chips.appendChild(b);
      });
      wrap.appendChild(lbl); wrap.appendChild(chips); box.appendChild(wrap);
    });
  }

  function buildCards() {
    var grid = $("pw-grid"); grid.innerHTML = ""; cards = [];
    PATHWAYS.forEach(function (p) {
      var d = document.createElement("details");
      d.className = "pw-card";
      d.style.setProperty("--c", p.c);
      d.style.setProperty("--c2", p.c2);

      var rows =
        row(t("k_forwho"), L(p.forWho)) +
        row(t("k_entry"), L(p.entry)) +
        row(t("k_leads"), L(p.leadsTo)) +
        row(t("k_apply"), L(p.applyVia));

      var link = p.link ? '<a class="pw-link" href="' + p.link.href +
        '" target="_blank" rel="noopener noreferrer">' + L(p.link.label) +
        ' <span aria-hidden="true">↗</span></a>' : '';
      var nxt = p.next ? '<div class="pw-next">' + L(p.next) + "</div>" : "";

      d.innerHTML =
        '<summary>' +
          '<span class="pw-tile"><span>' + p.icon + "</span></span>" +
          '<span class="pw-headtext">' +
            '<span class="pw-name">' + L(p.name) + "</span>" +
            '<span class="pw-summary">' + L(p.summary) + "</span>" +
          "</span>" +
          '<span class="pw-badge">✓ ' + t("badge") + "</span>" +
          '<span class="pw-chev" aria-hidden="true">▾</span>' +
        "</summary>" +
        '<div class="pw-body">' + rows + link + nxt + "</div>";

      grid.appendChild(d);
      cards.push({ p: p, el: d });
    });
  }

  function row(k, v) {
    return '<div class="pw-row"><span class="k">' + k + '</span><span class="v">' + v + "</span></div>";
  }

  function matchInfo(p) {
    var dims = ["results", "mode", "place"], asked = 0, hit = 0;
    dims.forEach(function (d) {
      var sel = state[d];
      if (sel && sel !== "any") { asked++; if (p.tags[d].indexOf(sel) >= 0) hit++; }
    });
    return { asked: asked, hit: hit, isMatch: asked > 0 && hit === asked };
  }

  function applyFilter() {
    var grid = $("pw-grid");
    var scored = cards.map(function (c, idx) {
      return { c: c, idx: idx, m: matchInfo(c.p) };
    });
    // sort: full matches first, then by hits desc, then original order
    scored.sort(function (a, b) {
      if (a.m.isMatch !== b.m.isMatch) return a.m.isMatch ? -1 : 1;
      if (b.m.hit !== a.m.hit) return b.m.hit - a.m.hit;
      return a.idx - b.idx;
    });

    var shown = 0, matched = 0;
    scored.forEach(function (s) {
      var el = s.c.el;
      el.classList.toggle("is-match", s.m.isMatch);
      var hide = state.matchesOnly && !s.m.isMatch;
      el.classList.toggle("hidden", hide);
      if (!hide) shown++;
      if (s.m.isMatch) matched++;
      grid.appendChild(el); // reorder (preserves open state)
    });

    var anyAsked = state.results !== "any" || state.mode !== "any" || state.place !== "any";
    var tpl = anyAsked ? t("count_one") : t("count_none");
    $("pw-count").innerHTML = tpl
      .replace("{shown}", shown).replace("{total}", PATHWAYS.length).replace("{match}", matched);
  }

  function rerender() {
    applyChrome();
    renderFilters();
    buildCards();
    applyFilter();
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelector(".langbtn").onclick = function () {
      lang = lang === "en" ? "zh" : "en";
      localStorage.setItem("clp_lang", lang);
      rerender();
    };
    $("matches-only").onchange = function () { state.matchesOnly = this.checked; applyFilter(); };
    $("reset-btn").onclick = function () {
      state.results = "any"; state.mode = "any"; state.place = "any"; state.matchesOnly = false;
      $("matches-only").checked = false;
      renderFilters(); applyFilter();
    };
    var logo = $("logo-img");
    if (logo) logo.onerror = function () { var fb = document.createElement("div"); fb.className = "logo-fallback"; fb.textContent = "PLK①"; logo.replaceWith(fb); };

    applyChrome(); renderFilters(); buildCards(); applyFilter();
  });
})();
