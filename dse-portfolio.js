/* DSE Past Paper Portfolio — Subject × Year grid tracker.
   Each cell = one (subject, year) past-paper attempt: its paper marks → weighted
   score (SBA excluded) → estimated grade vs that year's cut-off (dse-data.js).
   Bilingual, localStorage-persisted, self-contained PDF export/import.
   No third-party calls; CSP-safe (all handlers via addEventListener). */
(function () {
  "use strict";
  var SUBJECTS = window.DSE_SUBJECTS || [];
  var CUTOFFS = window.DSE_CUTOFFS || {};
  var YEARS = (window.DSE_YEARS || []).slice();              // desc
  var YEARS_ASC = YEARS.slice().sort(function (a, b) { return a - b; });
  var GRADE_ORDER = ["5**", "5*", "5", "4"];

  /* ---------------- i18n ---------------- */
  var T = {
    en: {
      title: "DSE Past Paper Portfolio",
      sub: "Track your HKDSE past-paper marks for every subject across the years. Each cell turns your marks into a weighted score and an estimated grade, so you can watch your progress at a glance.",
      disclaimer: "⚠️ For self-reference only. The grades here are rough estimates produced by this tool from the marks you enter, and do NOT include the School-based Assessment (SBA). They are unofficial, may be inaccurate, and do not represent or predict your actual HKDSE results.",
      method: "How a grade is worked out: for each paper, your % = your marks ÷ full marks. The subject score = the weighting-average of its papers (SBA removed, remaining papers re-scaled to 100%). That score is then turned into an estimated grade for that year.",
      studentsOnly: "🔒 For PLK No.1 W.H. Cheung College students only.",
      setupH: "⚙️ Set up", setupHint: "Your name is only used on your exported file. Tick the elective subjects you study — your core subjects are always included.",
      name: "Your name (optional)", elec: "Elective subjects you study",
      gridH: "📊 Past-paper tracker", gridHint: "Click any cell to enter your marks for that subject in that year. The grade fills in automatically — watch your progress build across the years.",
      from: "Show years from", to: "to",
      colSubject: "Subject", core: "Core", add: "＋",
      saveH: "💾 Save & restore", saveHint: "Export a PDF to keep your record. Next time, upload that same PDF here to restore your whole grid and keep going.",
      export: "⬇ Export PDF", import: "Import previous PDF", clear: "Clear all",
      rememberLbl: "Save my progress on this computer",
      sharedNote: "🔒 Using a shared or school computer? Untick the box above, or click “Clear all” when you finish — so the next student can't see your name and marks.",
      // editor
      editMarks: "Enter your marks", paper: "Paper", weightCol: "Weight", yourMarks: "Your marks", full: "Full", pctCol: "%",
      subjectScore: "Weighted score", estGrade: "Estimated grade",
      save: "Save", remove: "Remove", cancel: "Cancel",
      na: "—", noData: "no estimate available", below: "below", belowHint: "below the lowest grade we can estimate", notAttempted: "—",
      legendDone: "grade", legendEmpty: "not done yet",
      exportOk: "PDF exported — keep this file to restore your progress next time.",
      importOk: "Progress restored from your PDF.",
      importErr: "Couldn't read progress from that PDF. Make sure it's the file this page exported.",
      tooBig: "That file is too large. Please upload the small PDF this page exported.",
      clearAsk: "Clear your name, electives and the whole grid on this device? (Exported PDFs are not affected.)",
      pdfDisc: "ESTIMATION ONLY - excludes SBA - not an official HKDSE result.",
      pdfName: "Name", pdfGenerated: "Generated", pdfNoData: "(no papers entered yet)",
      footer: "PLK No.1 W.H. Cheung College · Career Team — helping students explore pathways and plan for the future.",
      langBtn: "中文"
    },
    zh: {
      title: "DSE 試卷練習組合",
      sub: "記錄你各科歷年的 HKDSE 歷屆試題分數。每格會把你的分數換算成加權分數及估算等級，讓你一目了然地看到進度。",
      disclaimer: "⚠️ 只供自我參考。這裡的等級只是本工具根據你輸入的分數作出的粗略估算，並未計算校本評核（SBA）。估算等級並非官方結果，可能不準確，亦不代表或預測你真實的 HKDSE 成績。",
      method: "等級計算方法：每份試卷的百分比 = 你的分數 ÷ 滿分。科目分數 = 各卷按比重的加權平均（已剔除 SBA，餘下試卷重新調整至 100%），再換算成該年的估算等級。",
      studentsOnly: "🔒 只供保良局第一張永慶中學學生使用。",
      setupH: "⚙️ 設定", setupHint: "你的姓名只會顯示於匯出的檔案。請勾選你修讀的選修科 —— 核心科目會自動包含。",
      name: "你的姓名（可選）", elec: "你修讀的選修科",
      gridH: "📊 歷屆試題追蹤表", gridHint: "按任何一格輸入該科該年的分數，等級會自動填上 —— 看著你的進度逐年累積。",
      from: "顯示年份由", to: "至",
      colSubject: "科目", core: "核心", add: "＋",
      saveH: "💾 儲存與還原", saveHint: "匯出 PDF 以保存紀錄。下次把同一個 PDF 上載到這裡，即可還原整個表格並繼續。",
      export: "⬇ 匯出 PDF", import: "上載先前的 PDF", clear: "全部清除",
      rememberLbl: "在此電腦儲存我的進度",
      sharedNote: "🔒 使用共用或學校電腦？請取消勾選上方選項，或完成後按「全部清除」，以免下一位同學看到你的姓名和分數。",
      editMarks: "輸入你的分數", paper: "試卷", weightCol: "比重", yourMarks: "你的分數", full: "滿分", pctCol: "%",
      subjectScore: "加權分數", estGrade: "估算等級",
      save: "儲存", remove: "刪除", cancel: "取消",
      na: "—", noData: "未能估算", below: "未達", belowHint: "低於可估算的最低等級", notAttempted: "—",
      legendDone: "等級", legendEmpty: "尚未完成",
      exportOk: "已匯出 PDF —— 請保存此檔案，下次用來還原進度。",
      importOk: "已從你的 PDF 還原進度。",
      importErr: "無法從該 PDF 讀取進度，請確認是本頁匯出的檔案。",
      tooBig: "檔案太大。請上載本頁匯出的小型 PDF 檔案。",
      clearAsk: "確定清除此裝置上的姓名、選修科及整個表格嗎？（已匯出的 PDF 不受影響。）",
      pdfDisc: "ESTIMATION ONLY - excludes SBA - not an official HKDSE result.",
      pdfName: "Name", pdfGenerated: "Generated", pdfNoData: "(no papers entered yet)",
      footer: "保良局第一張永慶中學 · 升學輔導及生涯規劃組",
      langBtn: "EN"
    }
  };
  var lang = (localStorage.getItem("clp_lang") === "zh") ? "zh" : "en";
  function t() { return T[lang]; }
  function nm(s) { return lang === "zh" ? (s.zh || s.en) : s.en; }

  /* ---------------- state ---------------- */
  var LS = "dse_portfolio", REMEMBER_KEY = "dse_remember";
  var SAFE_FIELDS = ["name", "electives", "grid", "fromYear", "toYear"];
  var defFrom = (YEARS_ASC.indexOf(2015) >= 0) ? 2015 : YEARS_ASC[0];
  var defTo = YEARS_ASC[YEARS_ASC.length - 1];
  var state = { name: "", electives: [], grid: {}, fromYear: defFrom, toYear: defTo, remember: true };

  function mergeSafe(target, o) {
    if (!o || typeof o !== "object") return;
    SAFE_FIELDS.forEach(function (k) { if (Object.prototype.hasOwnProperty.call(o, k)) target[k] = o[k]; });
  }
  function subjById(key) { for (var i = 0; i < SUBJECTS.length; i++) if (SUBJECTS[i].key === key) return SUBJECTS[i]; return null; }
  function isYear(y) { return YEARS.indexOf(parseInt(y, 10)) >= 0; }
  function sanitizeNum(v) { if (v === "" || v == null) return ""; return String(v).replace(/[^\d.]/g, "").slice(0, 7); }

  // keep only known subjects / years / papers, marks as short numeric strings
  function sanitizeGrid(g) {
    var out = {};
    if (!g || typeof g !== "object") return out;
    SUBJECTS.forEach(function (s) {
      var sub = g[s.key]; if (!sub || typeof sub !== "object") return;
      var o = {};
      YEARS.forEach(function (y) {
        var arr = sub[String(y)]; if (!Array.isArray(arr)) return;
        o[String(y)] = s.papers.map(function (p, i) { var c = arr[i] || {}; return { got: sanitizeNum(c.got), full: sanitizeNum(c.full) }; });
      });
      if (Object.keys(o).length) out[s.key] = o;
    });
    return out;
  }
  function sanitizeElectives(arr) {
    if (!Array.isArray(arr)) return [];
    return arr.filter(function (k) { var s = subjById(k); return s && !s.core; }).slice(0, 30);
  }

  function load() {
    try {
      state.remember = localStorage.getItem(REMEMBER_KEY) !== "0";
      var raw = localStorage.getItem(LS);
      if (raw) mergeSafe(state, JSON.parse(raw));
    } catch (e) {}
    state.grid = sanitizeGrid(state.grid);
    state.electives = sanitizeElectives(state.electives);
    if (YEARS_ASC.indexOf(state.fromYear) < 0) state.fromYear = defFrom;
    if (YEARS_ASC.indexOf(state.toYear) < 0) state.toYear = defTo;
    if (state.fromYear > state.toYear) { state.fromYear = defFrom; state.toYear = defTo; }
    if (typeof state.name !== "string") state.name = "";
  }
  function save() {
    try {
      localStorage.setItem(REMEMBER_KEY, state.remember ? "1" : "0");
      if (state.remember) localStorage.setItem(LS, JSON.stringify({ name: state.name, electives: state.electives, grid: state.grid, fromYear: state.fromYear, toYear: state.toYear }));
      else localStorage.removeItem(LS);
    } catch (e) {}
  }

  function activeSubjects() { return SUBJECTS.filter(function (s) { return s.core || state.electives.indexOf(s.key) >= 0; }); }
  function visibleYears() { return YEARS_ASC.filter(function (y) { return y >= state.fromYear && y <= state.toYear; }); }

  /* ---------------- scoring ---------------- */
  function paperPct(m) {
    var g = parseFloat(m.got), f = parseFloat(m.full);
    if (isNaN(g) || isNaN(f) || f <= 0) return null;
    return Math.max(0, Math.min(100, (g / f) * 100));
  }
  function scoreFromMarks(subject, marks) {
    var wsum = 0, wtot = 0, any = false;
    subject.papers.forEach(function (p, i) {
      var pct = paperPct(marks[i] || {}); if (pct !== null) { wsum += p.w * pct; wtot += p.w; any = true; }
    });
    return (any && wtot > 0) ? wsum / wtot : null;
  }
  function estimateGrade(key, year, pct) {
    var s = subjById(key);
    if (!s || !s.cutoff || pct === null) return { grade: null, reason: (s && !s.cutoff) ? "noData" : null };
    var table = CUTOFFS[s.cutoff]; if (!table) return { grade: null, reason: "noData" };
    var row = table[String(year)]; if (!row) return { grade: null, reason: "noData" };
    for (var i = 0; i < GRADE_ORDER.length; i++) {
      var g = GRADE_ORDER[i], thr = row[g];
      if (thr !== null && thr !== undefined && pct >= thr) return { grade: g, reason: null };
    }
    // below every AVAILABLE threshold → report "< lowest known grade" (soft; lower cut-offs may be missing)
    var lowest = null;
    for (var j = GRADE_ORDER.length - 1; j >= 0; j--) { var lg = GRADE_ORDER[j]; if (row[lg] !== null && row[lg] !== undefined) { lowest = lg; break; } }
    return { grade: "below", below: lowest || "4", reason: null };
  }
  function cellResult(key, year) {
    var sub = state.grid[key]; if (!sub) return null;
    var marks = sub[String(year)]; if (!marks) return null;
    var s = subjById(key), pct = scoreFromMarks(s, marks);
    if (pct === null) return null;
    var res = estimateGrade(key, year, pct);
    return { pct: pct, grade: res.grade, reason: res.reason, below: res.below };
  }
  function gradeClass(g) { return g === "5**" ? "g-5ss" : (g === "5*" || g === "5") ? "g-5s" : g === "4" ? "g-4" : g === "below" ? "g-lo" : "g-na"; }
  function gradeShort(res) { if (!res) return ""; if (res.grade === "below") return "<" + res.below; if (res.grade) return res.grade; return t().na; }

  /* ---------------- rendering ---------------- */
  var $ = function (id) { return document.getElementById(id); };

  function renderStatic() {
    document.documentElement.lang = lang === "zh" ? "zh-HK" : "en";
    $("pg-title").textContent = t().title;
    $("pg-sub").textContent = t().sub;
    var so = $("students-only"); if (so) so.textContent = t().studentsOnly;
    $("disc").textContent = t().disclaimer;
    $("method-note").textContent = t().method;
    $("setup-h").textContent = t().setupH; $("setup-hint").textContent = t().setupHint;
    $("lbl-name").textContent = t().name; $("lbl-elec").textContent = t().elec;
    $("grid-h").textContent = t().gridH; $("grid-hint").textContent = t().gridHint;
    $("lbl-from").textContent = t().from; $("lbl-to").textContent = t().to;
    $("save-h").textContent = t().saveH; $("save-hint").textContent = t().saveHint;
    $("btn-export").textContent = t().export; $("lbl-import").textContent = t().import; $("btn-clear").textContent = t().clear;
    $("lbl-remember").textContent = t().rememberLbl; $("shared-note").textContent = t().sharedNote;
    document.title = t().title + " — PLK No.1 Career Team";
    var navTx = lang === "zh"
      ? { news: "最新消息", res: "實用連結", studytools: "學習工具", jupastools: "JUPAS 工具", pomodoro: "番茄鐘", studyplan: "溫習計劃", dse: "DSE 試卷組合", streaming: "選科工具", jupas: "JUPAS 搜尋器", jupaschoices: "JUPAS 選科" }
      : { news: "Latest News", res: "Useful Links", studytools: "Study Tools", jupastools: "JUPAS Tools", pomodoro: "Pomodoro", studyplan: "Study Plan", dse: "DSE Portfolio", streaming: "Streaming Tool", jupas: "JUPAS Finder", jupaschoices: "JUPAS Choices" };
    ["news", "res", "studytools", "jupastools", "pomodoro", "studyplan", "dse", "streaming", "jupas", "jupaschoices"].forEach(function (k) { var el = $("nav-" + k); if (el) el.textContent = navTx[k]; });
    var bs = $("brand-school"), bd = $("brand-dept"), bm = $("brand-motto");
    if (bs) bs.textContent = lang === "zh" ? "保良局第一張永慶中學" : "PLK No.1 W.H. Cheung College";
    if (bd) bd.textContent = lang === "zh" ? "升學輔導及生涯規劃組" : "Career Team";
    if (bm) bm.textContent = lang === "zh" ? "展翅高飛・逐夢前行" : "Dream high and fly high";
    var fa = $("footer-about"); if (fa) fa.textContent = t().footer;
    var lb = document.querySelector(".langbtn"); if (lb) lb.textContent = t().langBtn;
  }

  function renderElectives() {
    var box = $("elective-list"); box.innerHTML = "";
    SUBJECTS.filter(function (s) { return !s.core; }).forEach(function (s) {
      var on = state.electives.indexOf(s.key) >= 0;
      var lab = document.createElement("label"); lab.className = "echk" + (on ? " on" : "");
      var cb = document.createElement("input"); cb.type = "checkbox"; cb.checked = on;
      cb.addEventListener("change", function () {
        var i = state.electives.indexOf(s.key);
        if (cb.checked && i < 0) state.electives.push(s.key); else if (!cb.checked && i >= 0) state.electives.splice(i, 1);
        save(); renderElectives(); renderGrid();
      });
      lab.appendChild(cb);
      var sp = document.createElement("span"); sp.textContent = nm(s); lab.appendChild(sp);
      box.appendChild(lab);
    });
  }

  function fillYearSelect(sel, selectedVal) {
    sel.innerHTML = "";
    YEARS_ASC.forEach(function (y) { var o = document.createElement("option"); o.value = y; o.textContent = y; if (y === selectedVal) o.selected = true; sel.appendChild(o); });
  }
  function renderRange() { fillYearSelect($("from-year"), state.fromYear); fillYearSelect($("to-year"), state.toYear); }

  // Flexbox split: a frozen subject column beside a horizontally-scrolling year grid.
  // Fixed row heights make the two panels line up by construction (no sticky/table quirks).
  function renderGrid() {
    var host = $("grid-host"); host.innerHTML = "";
    var years = visibleYears(), subs = activeSubjects();
    var wrap = document.createElement("div"); wrap.className = "gwrap";

    // frozen subject column
    var col = document.createElement("div"); col.className = "gcol";
    var ch = document.createElement("div"); ch.className = "gcol-h"; ch.textContent = t().colSubject; col.appendChild(ch);
    subs.forEach(function (s) {
      var r = document.createElement("div"); r.className = "gcol-row";
      var main = document.createElement("span"); main.className = "gc-name"; main.textContent = lang === "zh" ? s.zh : s.en;
      if (s.core) { var b = document.createElement("span"); b.className = "g-core"; b.textContent = t().core; main.appendChild(b); }
      r.appendChild(main);
      col.appendChild(r);
    });
    wrap.appendChild(col);

    // scrollable year grid (header row + one row per subject)
    var sc = document.createElement("div"); sc.className = "gscroll";
    var grid = document.createElement("div"); grid.className = "ggrid";
    var hrow = document.createElement("div"); hrow.className = "ggrid-hrow";
    years.forEach(function (y) { var hc = document.createElement("div"); hc.className = "ggrid-h"; hc.textContent = y; hrow.appendChild(hc); });
    grid.appendChild(hrow);
    subs.forEach(function (s) {
      var row = document.createElement("div"); row.className = "ggrid-row";
      years.forEach(function (y) {
        var btn = document.createElement("button"); btn.type = "button"; btn.className = "cellbtn";
        var res = cellResult(s.key, y);
        if (res) {
          var cg = document.createElement("span"); cg.className = "cg " + gradeClass(res.grade); cg.textContent = gradeShort(res); btn.appendChild(cg);
          var cp = document.createElement("span"); cp.className = "cp"; cp.textContent = Math.round(res.pct) + "%"; btn.appendChild(cp);
          btn.title = (lang === "zh" ? s.zh : s.en) + " " + y;
        } else {
          btn.className += " empty"; btn.textContent = t().add;
          btn.setAttribute("aria-label", (lang === "zh" ? s.zh : s.en) + " " + y);
        }
        btn.addEventListener("click", function () { openEditor(s.key, y); });
        row.appendChild(btn);
      });
      grid.appendChild(row);
    });
    sc.appendChild(grid); wrap.appendChild(sc);
    host.appendChild(wrap);
    renderLegend();
  }

  function renderLegend() {
    var box = $("grid-legend"); box.innerHTML = "";
    [["5**", "g-5ss"], ["5*", "g-5s"], ["5", "g-5"], ["4", "g-4"], [t().below, "g-lo"]].forEach(function (p) {
      var sp = document.createElement("span"); var pill = document.createElement("span"); pill.className = "lg " + p[1]; pill.textContent = p[0]; sp.appendChild(pill); box.appendChild(sp);
    });
  }

  /* ---------------- cell editor modal ---------------- */
  var escHandler = null;
  function openEditor(key, year) {
    var s = subjById(key);
    var existing = (state.grid[key] && state.grid[key][String(year)]) || null;
    var marks = s.papers.map(function (p, i) { var e = existing && existing[i]; return { got: e ? e.got : "", full: e ? e.full : "" }; });

    var bg = document.createElement("div"); bg.className = "modal-bg";
    var modal = document.createElement("div"); modal.className = "modal";
    var h = document.createElement("h3"); h.textContent = (lang === "zh" ? s.zh : s.en) + " · " + year; modal.appendChild(h);
    var ms = document.createElement("p"); ms.className = "msub"; ms.textContent = t().editMarks; modal.appendChild(ms);

    var tbl = document.createElement("table"); tbl.className = "papers";
    var thead = document.createElement("thead");
    thead.innerHTML = "<tr><th>" + t().paper + "</th><th>" + t().weightCol + "</th><th>" + t().yourMarks + "</th><th>" + t().full + "</th><th>" + t().pctCol + "</th></tr>";
    tbl.appendChild(thead);
    var body = document.createElement("tbody");
    var pctCells = [];
    s.papers.forEach(function (p, i) {
      var tr = document.createElement("tr");
      var td1 = document.createElement("td"); var pn = document.createElement("span"); pn.className = "pname"; pn.textContent = nm(p); td1.appendChild(pn); tr.appendChild(td1);
      var td2 = document.createElement("td"); td2.className = "pw"; td2.textContent = p.w + "%"; tr.appendChild(td2);
      var td3 = document.createElement("td"); var ig = mkNum(marks[i].got); td3.appendChild(ig); tr.appendChild(td3);
      var td4 = document.createElement("td"); var ifu = mkNum(marks[i].full); td4.appendChild(ifu); tr.appendChild(td4);
      var td5 = document.createElement("td"); var pc = document.createElement("span"); pc.className = "ppct"; td5.appendChild(pc); tr.appendChild(td5); pctCells.push(pc);
      ig.addEventListener("input", function () { marks[i].got = ig.value; recompute(); });
      ifu.addEventListener("input", function () { marks[i].full = ifu.value; recompute(); });
      body.appendChild(tr);
    });
    tbl.appendChild(body); modal.appendChild(tbl);

    var foot = document.createElement("div"); foot.className = "modal-foot";
    var sc = document.createElement("div"); sc.className = "modal-score"; sc.innerHTML = t().subjectScore + ": <b data-score></b>"; foot.appendChild(sc);
    var gr = document.createElement("div"); gr.innerHTML = t().estGrade + ": <span data-grade></span>"; foot.appendChild(gr);
    modal.appendChild(foot);

    var acts = document.createElement("div"); acts.className = "modal-actions";
    if (existing) { var rm = document.createElement("button"); rm.type = "button"; rm.className = "btn-danger"; rm.textContent = t().remove; rm.addEventListener("click", function () { if (state.grid[key]) { delete state.grid[key][String(year)]; if (!Object.keys(state.grid[key]).length) delete state.grid[key]; } save(); close(); renderGrid(); }); acts.appendChild(rm); }
    var cancel = document.createElement("button"); cancel.type = "button"; cancel.className = "btn-ghost"; cancel.textContent = t().cancel; cancel.addEventListener("click", close); acts.appendChild(cancel);
    var saveb = document.createElement("button"); saveb.type = "button"; saveb.className = "btn-primary"; saveb.textContent = t().save; saveb.addEventListener("click", function () {
      var any = marks.some(function (m) { return paperPct(m) !== null; });
      if (any) { state.grid[key] = state.grid[key] || {}; state.grid[key][String(year)] = marks.map(function (m) { return { got: sanitizeNum(m.got), full: sanitizeNum(m.full) }; }); }
      else if (state.grid[key]) { delete state.grid[key][String(year)]; if (!Object.keys(state.grid[key]).length) delete state.grid[key]; }
      save(); close(); renderGrid();
    }); acts.appendChild(saveb);
    modal.appendChild(acts);

    function recompute() {
      s.papers.forEach(function (p, i) { var v = paperPct(marks[i]); pctCells[i].textContent = v === null ? t().notAttempted : Math.round(v) + "%"; });
      var pct = scoreFromMarks(s, marks);
      modal.querySelector("[data-score]").textContent = pct === null ? t().na : (Math.round(pct * 10) / 10) + "%";
      var res = estimateGrade(key, year, pct);
      var gspan = modal.querySelector("[data-grade]"); gspan.className = "grade " + gradeClass(res.grade);
      gspan.textContent = res.grade === "below" ? ("< " + res.below + "  (" + t().belowHint + ")") : (res.grade || (t().na + " (" + t().noData + ")"));
    }
    function close() { document.removeEventListener("keydown", escHandler); if (bg.parentNode) bg.parentNode.removeChild(bg); }
    escHandler = function (e) { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", escHandler);
    bg.addEventListener("click", function (e) { if (e.target === bg) close(); });

    bg.appendChild(modal); document.body.appendChild(bg); recompute();
    var first = modal.querySelector("input"); if (first) first.focus();
  }
  function mkNum(val) {
    var inp = document.createElement("input"); inp.type = "number"; inp.className = "mk"; inp.min = "0";
    inp.value = (val == null) ? "" : val; inp.setAttribute("inputmode", "decimal"); return inp;
  }

  /* ---------------- PDF (self-contained, embeds data) ---------------- */
  function utf8ToB64(str) { return btoa(unescape(encodeURIComponent(str))); }
  function b64ToUtf8(b64) { return decodeURIComponent(escape(atob(b64))); }
  function pdfEsc(s) { return String(s).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)"); }
  function ascii(s) { var o = "", str = String(s); for (var i = 0; i < str.length; i++) { var c = str.charCodeAt(i); o += (c >= 32 && c < 256) ? str[i] : "?"; } return o; }

  function buildPdf(lines, dataB64) {
    var pageH = 842, pageW = 595, left = 50, top = 798, bottom = 56;
    var pages = [], cur = [], y = top;
    lines.forEach(function (ln) {
      var size = ln.size || 11, lh = ln.lh || size * 1.5;
      if (ln.gap) y -= ln.gap;
      if (y < bottom) { pages.push(cur); cur = []; y = top; }
      cur.push({ t: ln.t, size: size, bold: ln.bold, indent: ln.indent || 0, y: y }); y -= lh;
    });
    pages.push(cur);
    var NF1 = 3, NF2 = 4, NINFO = 5, n = 6, pageNums = [], streams = [];
    pages.forEach(function (pg) {
      var s = "";
      pg.forEach(function (ln) { var f = ln.bold ? "F2" : "F1"; s += "BT /" + f + " " + ln.size + " Tf 1 0 0 1 " + (left + ln.indent) + " " + ln.y + " Tm (" + pdfEsc(ascii(ln.t)) + ") Tj ET\n"; });
      var cN = n++, pN = n++; streams.push({ cN: cN, pN: pN, s: s }); pageNums.push(pN);
    });
    var total = n - 1, body = {};
    body[1] = "<< /Type /Catalog /Pages 2 0 R >>";
    body[2] = "<< /Type /Pages /Kids [" + pageNums.map(function (p) { return p + " 0 R"; }).join(" ") + "] /Count " + pageNums.length + " >>";
    body[NF1] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
    body[NF2] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";
    body[NINFO] = "<< /Title (DSE Past Paper Portfolio) /Producer (PLK No.1 Career Team) /Keywords (DSEDATA:" + dataB64 + ") >>";
    streams.forEach(function (cs) {
      body[cs.cN] = "<< /Length " + cs.s.length + " >>\nstream\n" + cs.s + "endstream";
      body[cs.pN] = "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 " + pageW + " " + pageH + "] /Resources << /Font << /F1 " + NF1 + " 0 R /F2 " + NF2 + " 0 R >> >> /Contents " + cs.cN + " 0 R >>";
    });
    var pdf = "%PDF-1.4\n", off = [];
    for (var i = 1; i <= total; i++) { off[i] = pdf.length; pdf += i + " 0 obj\n" + body[i] + "\nendobj\n"; }
    var xref = pdf.length;
    pdf += "xref\n0 " + (total + 1) + "\n0000000000 65535 f \n";
    for (var j = 1; j <= total; j++) { pdf += ("0000000000" + off[j]).slice(-10) + " 00000 n \n"; }
    pdf += "trailer\n<< /Size " + (total + 1) + " /Root 1 0 R /Info " + NINFO + " 0 R >>\nstartxref\n" + xref + "\n%%EOF\n";
    pdf += "%DSEDATA:" + dataB64 + ":END\n";
    return pdf;
  }

  function reportLines() {
    var L = [];
    L.push({ t: "DSE Past Paper Portfolio", size: 19, bold: true });
    L.push({ t: t().pdfDisc, size: 9, gap: 2 });
    if (state.name) L.push({ t: t().pdfName + ": " + state.name, size: 11, gap: 6 });
    L.push({ t: t().pdfGenerated + ": " + new Date().toISOString().slice(0, 10), size: 10, gap: 2 });
    var anyData = false;
    activeSubjects().forEach(function (s) {
      var cells = YEARS_ASC.map(function (y) {
        var r = cellResult(s.key, y); if (!r) return null;
        var gl = r.grade === "below" ? ("<" + r.below) : (r.grade || "N/A");
        return y + ": " + gl + " (" + Math.round(r.pct) + "%)";
      }).filter(Boolean);
      if (!cells.length) return;
      anyData = true;
      L.push({ t: s.en + (s.core ? " [Core]" : ""), size: 13, bold: true, gap: 10 });
      for (var k = 0; k < cells.length; k += 4) { L.push({ t: cells.slice(k, k + 4).join("   "), size: 10, indent: 14 }); }
    });
    if (!anyData) L.push({ t: t().pdfNoData, size: 11, gap: 10 });
    return L;
  }

  function exportPdf() {
    var payload = { v: 2, name: state.name, electives: state.electives, grid: state.grid, fromYear: state.fromYear, toYear: state.toYear };
    var b64 = utf8ToB64(JSON.stringify(payload));
    var pdf = buildPdf(reportLines(), b64);
    var bytes = new Uint8Array(pdf.length);
    for (var i = 0; i < pdf.length; i++) bytes[i] = pdf.charCodeAt(i) & 0xff;
    var blob = new Blob([bytes], { type: "application/pdf" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = "DSE-portfolio" + (state.name ? "-" + state.name.replace(/[^\w\-]+/g, "_") : "") + "-" + new Date().toISOString().slice(0, 10) + ".pdf";
    document.body.appendChild(a); a.click();
    setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1500);
    flash(t().exportOk, true);
  }

  var MAX_IMPORT_BYTES = 5 * 1024 * 1024;
  function importPdf(file) {
    if (file && file.size > MAX_IMPORT_BYTES) { flash(t().tooBig, false); return; }
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var buf = new Uint8Array(reader.result), str = "";
        for (var i = 0; i < buf.length; i++) str += String.fromCharCode(buf[i]);
        var m = str.match(/DSEDATA:([A-Za-z0-9+/=]+)/);
        if (!m) { flash(t().importErr, false); return; }
        var data = JSON.parse(b64ToUtf8(m[1]));
        state.name = (typeof data.name === "string") ? data.name.slice(0, 80) : "";
        state.electives = sanitizeElectives(data.electives);
        state.grid = sanitizeGrid(data.grid);
        if (YEARS_ASC.indexOf(data.fromYear) >= 0) state.fromYear = data.fromYear;
        if (YEARS_ASC.indexOf(data.toYear) >= 0) state.toYear = data.toYear;
        if (state.fromYear > state.toYear) { state.fromYear = defFrom; state.toYear = defTo; }
        save();
        $("in-name").value = state.name;
        renderElectives(); renderRange(); renderGrid();
        flash(t().importOk, true);
      } catch (e) { flash(t().importErr, false); }
    };
    reader.onerror = function () { flash(t().importErr, false); };
    reader.readAsArrayBuffer(file);
  }

  var msgTimer = null;
  function flash(text, ok) {
    var el = $("io-msg"); el.textContent = text; el.className = "msg " + (ok ? "ok" : "err");
    if (msgTimer) clearTimeout(msgTimer);
    msgTimer = setTimeout(function () { el.textContent = ""; el.className = "msg"; }, 6000);
  }

  /* ---------------- wire up ---------------- */
  function startApp() {
    load();
    renderStatic(); renderElectives(); renderRange(); renderGrid();
    $("in-name").value = state.name;
    $("in-name").addEventListener("input", function () { state.name = $("in-name").value; save(); });
    $("from-year").addEventListener("change", function () {
      state.fromYear = parseInt($("from-year").value, 10);
      if (state.fromYear > state.toYear) { state.toYear = state.fromYear; fillYearSelect($("to-year"), state.toYear); }
      save(); renderGrid();
    });
    $("to-year").addEventListener("change", function () {
      state.toYear = parseInt($("to-year").value, 10);
      if (state.toYear < state.fromYear) { state.fromYear = state.toYear; fillYearSelect($("from-year"), state.fromYear); }
      save(); renderGrid();
    });
    $("btn-export").addEventListener("click", exportPdf);
    $("in-file").addEventListener("change", function (e) { if (e.target.files && e.target.files[0]) { importPdf(e.target.files[0]); e.target.value = ""; } });
    $("in-remember").checked = state.remember;
    $("in-remember").addEventListener("change", function () { state.remember = $("in-remember").checked; save(); });
    $("btn-clear").addEventListener("click", function () {
      if (confirm(t().clearAsk)) {
        state = { name: "", electives: [], grid: {}, fromYear: defFrom, toYear: defTo, remember: state.remember };
        save(); $("in-name").value = ""; renderElectives(); renderRange(); renderGrid();
      }
    });
    var lb = document.querySelector(".langbtn");
    if (lb) lb.addEventListener("click", function () { lang = (lang === "zh") ? "en" : "zh"; localStorage.setItem("clp_lang", lang); renderStatic(); renderElectives(); renderGrid(); });
  }
  /* ---------------- passcode gate (SAME passcode as JUPAS Finder) ----------------
     We never store the passcode or a hash here. Instead we validate it by decrypting
     the JUPAS data file (same PBKDF2-SHA256 + AES-GCM scheme). Success = correct passcode.
     Shares localStorage "jupas_pass" with the JUPAS page, so unlocking one unlocks the other. */
  var PBKDF2_ITER = 150000, GATE_LS = "jupas_pass", encBlob = null, started = false;
  function b64ToBytes(b64) { return Uint8Array.from(atob(b64), function (c) { return c.charCodeAt(0); }); }
  function deriveKey(pass, salt) {
    return crypto.subtle.importKey("raw", new TextEncoder().encode(pass), "PBKDF2", false, ["deriveKey"])
      .then(function (base) { return crypto.subtle.deriveKey({ name: "PBKDF2", salt: salt, iterations: PBKDF2_ITER, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["decrypt"]); });
  }
  function verifyPass(pass) {
    return deriveKey(pass, b64ToBytes(encBlob.salt)).then(function (key) {
      return crypto.subtle.decrypt({ name: "AES-GCM", iv: b64ToBytes(encBlob.iv) }, key, b64ToBytes(encBlob.data));
    });
  }
  function reveal() {
    var lk = document.getElementById("dse-lock"); if (lk) lk.style.display = "none";
    document.getElementById("dse-app").style.display = "";
    if (!started) { started = true; startApp(); }
  }
  function tryUnlock(pass, remember) {
    return verifyPass(pass).then(function () { if (remember) { try { localStorage.setItem(GATE_LS, pass); } catch (e) {} } reveal(); return true; })
      .catch(function () { try { localStorage.removeItem(GATE_LS); } catch (e) {} return false; });
  }
  function showLock(msg) {
    document.getElementById("dse-app").style.display = "none";
    var lk = document.getElementById("dse-lock"); lk.style.display = "flex";
    document.getElementById("lock-err").textContent = msg || "";
  }
  function wireLock() {
    var submit = function () {
      var pc = document.getElementById("passcode").value; if (!pc) return;
      document.getElementById("lock-err").textContent = "";
      tryUnlock(pc, true).then(function (ok) { if (!ok) { document.getElementById("lock-err").textContent = "Incorrect passcode  通行碼錯誤"; document.getElementById("passcode").value = ""; } });
    };
    document.getElementById("unlock-btn").addEventListener("click", submit);
    document.getElementById("passcode").addEventListener("keydown", function (e) { if (e.key === "Enter") submit(); });
  }
  function bootstrap() {
    wireLock();
    fetch("programmes.enc.json", { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (j) {
      encBlob = j;
      var saved = null; try { saved = localStorage.getItem(GATE_LS); } catch (e) {}
      if (saved) { tryUnlock(saved, false).then(function (ok) { if (!ok) showLock(""); }); }
      else showLock("");
    }).catch(function () { showLock("Could not load the passcode check.  無法載入通行碼檢查。"); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bootstrap); else bootstrap();
})();
