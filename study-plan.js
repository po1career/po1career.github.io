/* ============================================================
   Study Plan Generator — PLK No.1 Career Team
   Builds a day-by-day revision timetable using the
   serial-position effect (primacy + recency).
   Strategy (confirmed with user):
     - Lead time = days before the FIRST exam that study begins.
     - One subject per day.
     - PASS A (recency): reserve the day right before each exam
       for that subject's FINAL REVISION (earliest exams first).
     - PASS B (primacy): fill remaining days, starting first-pass
       study on the subjects whose exams are furthest away.
   No third-party calls. Shares language with the rest of the site.
   ============================================================ */
(function () {
  "use strict";

  var T = {
    en: {
      school: "PLK No.1 W.H. Cheung College", dept: "Career Team", motto: "Dream high and fly high",
      nav_news: "Latest News", nav_res: "Resources", nav_studytools: "Study Tools", nav_jupastools: "JUPAS Tools", nav_pomodoro: "Pomodoro", nav_studyplan: "Study Plan", nav_dse: "DSE Portfolio", nav_streaming: "Streaming Tool", nav_jupas: "JUPAS Finder", nav_jupaschoices: "JUPAS Choices", lang: "中文",
      title: "Study Plan Generator",
      sub: "Enter your subjects and exam dates, and we'll build a revision timetable using the serial-position effect.",
      subjects_heading: "📚 Your subjects & exam dates",
      subjects_hint: "Add each subject and the date of its exam.",
      subject_ph: "Subject (e.g. Mathematics)",
      add_subject: "＋ Add subject",
      perday_a: "Study", perday_b: "subject(s) per day.",
      lead_a: "Start studying", lead_b: "day(s) before the first exam.",
      generate: "Generate study plan", clear: "Clear",
      plan_heading: "📅 Your suggested study plan",
      note: "Strategy: you begin with the subjects whose exams are furthest away (primacy), and revise each subject right before its own exam (recency) — based on the serial-position effect, which says we remember what we study first and most recently the best.",
      legend_study: "Study (first pass)", legend_revision: "Final revision", legend_exam: "Exam",
      col_date: "Date", col_action: "What to do",
      study_word: "Study", revision_word: "Final revision", exam_word: "Exam", rest_word: "Free / rest",
      range: "Plan runs from {a} to {b}.",
      warn: "Not enough time to fully prepare these subject(s): {list}. Try starting earlier (more lead days).",
      empty: "Please add at least one subject with an exam date.",
      footer_about: "We help students explore their interests, plan their academic pathways, and prepare for university and future careers through guidance, workshops, and information sharing."
    },
    zh: {
      school: "保良局第一張永慶中學", dept: "升學輔導及生涯規劃組", motto: "展翅高飛・逐夢前行",
      nav_news: "最新消息", nav_res: "資源下載", nav_studytools: "學習工具", nav_jupastools: "JUPAS 工具", nav_pomodoro: "番茄鐘", nav_studyplan: "溫習計劃", nav_dse: "DSE 試卷組合", nav_streaming: "選科工具", nav_jupas: "JUPAS 搜尋器", nav_jupaschoices: "JUPAS 選科", lang: "EN",
      title: "溫習計劃產生器",
      sub: "輸入你的科目及考試日期，我們會運用「序列位置效應」為你編排溫習時間表。",
      subjects_heading: "📚 你的科目及考試日期",
      subjects_hint: "輸入每一科及其考試日期。",
      subject_ph: "科目（例如：數學）",
      add_subject: "＋ 新增科目",
      perday_a: "每天溫習", perday_b: "科。",
      lead_a: "在第一科考試前", lead_b: "天開始溫習。",
      generate: "產生溫習計劃", clear: "清除",
      plan_heading: "📅 建議溫習計劃",
      note: "策略：先溫習考試日期較遲的科目（首因效應），並在每科考試前作最後重溫（近因效應）——這運用了「序列位置效應」：我們對最先及最近溫習的內容記得最牢。",
      legend_study: "溫習（第一遍）", legend_revision: "最後重溫", legend_exam: "考試",
      col_date: "日期", col_action: "建議",
      study_word: "溫習", revision_word: "最後重溫", exam_word: "考試", rest_word: "休息",
      range: "計劃由 {a} 至 {b}。",
      warn: "以下科目的準備時間不足：{list}。可嘗試提早開始（增加天數）。",
      empty: "請至少輸入一科及其考試日期。",
      footer_about: "我們透過輔導、工作坊及資訊分享，協助學生探索興趣、規劃學業路徑，為升學及未來事業作好準備。"
    }
  };

  var COLORS = [
    { bg: "#f6ecd2", fg: "#9a7b1f" }, { bg: "#e8f0e6", fg: "#5f7d5c" }, // gold, sage
    { bg: "#f1ddd5", fg: "#9c5b33" }, { bg: "#e3ebf3", fg: "#3f6184" }, // clay, blue
    { bg: "#efe6f0", fg: "#6f4b78" }, { bg: "#eef2e3", fg: "#6f8d3a" }, // purple, olive
    { bg: "#fbe7d6", fg: "#a85c2a" }, { bg: "#e6f0ef", fg: "#3f7d76" }, // orange, teal
    { bg: "#f7dde6", fg: "#a8456a" }, { bg: "#e2e2f2", fg: "#4a4790" }, // rose, indigo
    { bg: "#e8e6df", fg: "#6a665a" }, { bg: "#f0dcec", fg: "#8a3d77" }  // stone, plum
  ];

  var lang = localStorage.getItem("clp_lang") || "en";
  function t(k) { return T[lang][k]; }
  function $(id) { return document.getElementById(id); }
  function setText(id, v) { var e = $(id); if (e) e.textContent = v; }
  function esc(s){ return (s||"").replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];}); }

  // ---- date helpers ----
  function parseDate(s){ if(!s) return null; var p=s.split("-"); if(p.length!==3) return null; var d=new Date(+p[0], +p[1]-1, +p[2]); return isNaN(d)?null:d; }
  function addDays(d,n){ var x=new Date(d); x.setDate(x.getDate()+n); return x; }
  function dkey(d){ return d.getFullYear()+"-"+(d.getMonth()+1)+"-"+d.getDate(); }
  function fmtDate(d){ return d.toLocaleDateString(lang==="zh"?"zh-HK":"en-GB",{weekday:"short",day:"numeric",month:"short"}); }

  // ---- subject rows ----
  function addRow(name, date) {
    var list = $("subject-list");
    var idx = list.children.length;
    var color = COLORS[idx % COLORS.length];
    var row = document.createElement("div");
    row.className = "subj-row";
    row.innerHTML =
      '<span class="dot"></span>' +
      '<input type="text" class="s-name" placeholder="' + esc(t("subject_ph")) + '">' +
      '<input type="date" class="s-date">' +
      '<button type="button" class="rm" aria-label="remove">✕</button>';
    row.querySelector(".dot").style.background = color.bg;
    row.querySelector(".dot").style.boxShadow = "0 0 0 2px " + color.fg + "55";
    if (name) row.querySelector(".s-name").value = name;
    if (date) row.querySelector(".s-date").value = date;
    row.querySelector(".rm").onclick = function () { row.remove(); recolorDots(); };
    list.appendChild(row);
  }
  function recolorDots() {
    [].forEach.call($("subject-list").children, function (row, i) {
      var c = COLORS[i % COLORS.length];
      row.querySelector(".dot").style.background = c.bg;
      row.querySelector(".dot").style.boxShadow = "0 0 0 2px " + c.fg + "55";
    });
  }
  function readSubjects() {
    var out = [];
    [].forEach.call(document.querySelectorAll(".subj-row"), function (row, i) {
      var name = row.querySelector(".s-name").value.trim();
      var date = row.querySelector(".s-date").value;
      if (name && date) out.push({ name: name, date: date, color: COLORS[i % COLORS.length] });
    });
    return out;
  }

  // ---- the core algorithm (same serial-position logic, up to `perDay` slots/day) ----
  function generate(subjectsIn, leadDays, perDay) {
    perDay = (perDay === 2) ? 2 : 1;
    var subs = subjectsIn.map(function (s) { return { name: s.name, exam: parseDate(s.date), color: s.color }; })
      .filter(function (s) { return s.exam; });
    if (!subs.length) return null;

    var earliest = new Date(Math.min.apply(null, subs.map(function (s) { return s.exam.getTime(); })));
    var latest = new Date(Math.max.apply(null, subs.map(function (s) { return s.exam.getTime(); })));
    var start = addDays(earliest, -leadDays);

    var days = [];
    for (var d = new Date(start); d.getTime() <= latest.getTime(); d = addDays(d, 1)) {
      days.push({ date: new Date(d), slots: [], exams: [] });
    }
    // mark exams
    subs.forEach(function (s) {
      var day = days.find(function (x) { return dkey(x.date) === dkey(s.exam); });
      if (day) day.exams.push(s);
    });

    var counts = {}; subs.forEach(function (s) { counts[s.name] = 0; });
    function hasSub(day, s) { return day.slots.some(function (x) { return x.sub === s; }); }

    // PASS A — recency: earliest exam first; reserve the latest day-with-a-free-slot before each exam
    subs.slice().sort(function (a, b) { return a.exam - b.exam; }).forEach(function (s) {
      for (var i = days.length - 1; i >= 0; i--) {
        var day = days[i];
        if (day.date.getTime() >= s.exam.getTime()) continue;
        if (day.slots.length >= perDay || hasSub(day, s)) continue;
        day.slots.push({ sub: s, phase: "revision" });
        counts[s.name]++;
        break;
      }
    });

    // PASS B — primacy fill: chronological; fill each day's remaining slots.
    // Each slot: a subject (exam still ahead, not already on that day) with the fewest
    // study days so far; ties broken by LATEST exam (start far-off subjects first).
    days.forEach(function (day) {
      while (day.slots.length < perDay) {
        var cands = subs.filter(function (s) {
          return s.exam.getTime() > day.date.getTime() && !hasSub(day, s);
        });
        if (!cands.length) break;
        cands.sort(function (a, b) {
          if (counts[a.name] !== counts[b.name]) return counts[a.name] - counts[b.name];
          return b.exam - a.exam;
        });
        day.slots.push({ sub: cands[0], phase: "study" });
        counts[cands[0].name]++;
      }
    });

    var warn = subs.filter(function (s) { return counts[s.name] === 0; }).map(function (s) { return s.name; });
    return { days: days, start: start, latest: latest, warnings: warn };
  }

  function chip(sub) {
    return '<span class="subj-chip" style="background:' + sub.color.bg + ';color:' + sub.color.fg + '">' + esc(sub.name) + "</span>";
  }

  function render(plan) {
    var box = $("result");
    if (!plan) { box.innerHTML = '<div class="sp-card"><p class="rest">' + esc(t("empty")) + "</p></div>"; return; }

    var html = '<div class="sp-card">';
    html += '<h2>' + esc(t("plan_heading")) + "</h2>";
    html += '<div class="sp-note">' + esc(t("note")) + "</div>";
    if (plan.warnings.length) {
      html += '<div class="sp-warn">⚠ ' + esc(t("warn").replace("{list}", plan.warnings.join(", "))) + "</div>";
    }
    html += '<p class="range">' + esc(t("range").replace("{a}", fmtDate(plan.start)).replace("{b}", fmtDate(plan.latest))) + "</p>";
    html += '<div class="legend">' +
      '<span><i class="lg-dot" style="background:#cdb36a"></i>' + esc(t("legend_study")) + "</span>" +
      '<span><i class="lg-dot" style="background:#8ba888"></i>' + esc(t("legend_revision")) + "</span>" +
      '<span><i class="lg-dot" style="background:#c0512b"></i>' + esc(t("legend_exam")) + "</span></div>";

    html += '<table class="plan"><thead><tr><th>' + esc(t("col_date")) + "</th><th>" + esc(t("col_action")) + "</th></tr></thead><tbody>";
    plan.days.forEach(function (day) {
      var wd = day.date.getDay();
      var cls = (day.exams.length ? "exam-row " : "") + ((wd === 0 || wd === 6) ? "weekend" : "");
      html += '<tr class="' + cls.trim() + '"><td>' + esc(fmtDate(day.date)) + "</td><td><div class=\"act\">";
      day.exams.forEach(function (s) {
        html += '<div><span class="exam-tag">📝 ' + esc(t("exam_word")) + ":</span> " + chip(s) + "</div>";
      });
      // study slots (revision shown before first-pass on the same day)
      var slots = day.slots.slice().sort(function (a, b) {
        if (a.phase === b.phase) return 0;
        return a.phase === "revision" ? -1 : 1;
      });
      slots.forEach(function (sl) {
        var icon = sl.phase === "revision" ? "🔁" : "📖";
        var word = sl.phase === "revision" ? t("revision_word") : t("study_word");
        html += '<div><span class="lbl">' + icon + " " + esc(word) + ':</span> ' + chip(sl.sub) + "</div>";
      });
      if (!day.exams.length && !day.slots.length) {
        html += '<div class="rest">' + esc(t("rest_word")) + "</div>";
      }
      html += "</div></td></tr>";
    });
    html += "</tbody></table></div>";
    box.innerHTML = html;
    box.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ---- persistence ----
  function save() {
    var data = { subjects: [], lead: $("leadDays").value, perDay: $("perDay").value };
    [].forEach.call(document.querySelectorAll(".subj-row"), function (row) {
      data.subjects.push({ name: row.querySelector(".s-name").value, date: row.querySelector(".s-date").value });
    });
    localStorage.setItem("studyplan_input", JSON.stringify(data));
  }
  function load() {
    try { return JSON.parse(localStorage.getItem("studyplan_input")); } catch (e) { return null; }
  }

  // ---- i18n apply ----
  function applyLang() {
    document.documentElement.lang = lang === "zh" ? "zh-HK" : "en";
    setText("brand-school", t("school")); setText("brand-dept", t("dept")); setText("brand-motto", t("motto"));
    setText("nav-news", t("nav_news")); setText("nav-res", t("nav_res"));
    setText("nav-studytools", t("nav_studytools")); setText("nav-jupastools", t("nav_jupastools"));
    setText("nav-pomodoro", t("nav_pomodoro")); setText("nav-studyplan", t("nav_studyplan")); setText("nav-dse", t("nav_dse")); setText("nav-streaming", t("nav_streaming")); setText("nav-jupas", t("nav_jupas")); setText("nav-jupaschoices", t("nav_jupaschoices"));
    document.querySelector(".langbtn").textContent = t("lang");
    setText("pg-title", t("title")); setText("pg-sub", t("sub"));
    setText("subjects-heading", t("subjects_heading")); setText("subjects-hint", t("subjects_hint"));
    $("addSubjectBtn").textContent = t("add_subject");
    setText("perday-a", t("perday_a")); setText("perday-b", t("perday_b"));
    setText("lead-a", t("lead_a")); setText("lead-b", t("lead_b"));
    $("generateBtn").textContent = t("generate"); $("clearBtn").textContent = t("clear");
    setText("footer-about", t("footer_about"));
    // update existing placeholders
    [].forEach.call(document.querySelectorAll(".s-name"), function (i) { i.placeholder = t("subject_ph"); });
  }

  // ---- init ----
  document.addEventListener("DOMContentLoaded", function () {
    var logo = $("logo-img");
    if (logo) logo.onerror = function () { var fb = document.createElement("div"); fb.className = "logo-fallback"; fb.textContent = "PLK①"; logo.replaceWith(fb); };

    var saved = load();
    if (saved && saved.subjects && saved.subjects.length) {
      saved.subjects.forEach(function (s) { addRow(s.name, s.date); });
      if (saved.lead != null) $("leadDays").value = saved.lead;
      if (saved.perDay != null) $("perDay").value = saved.perDay;
    } else {
      addRow("", ""); addRow("", ""); addRow("", "");
    }

    $("addSubjectBtn").onclick = function () { addRow("", ""); };
    $("generateBtn").onclick = function () {
      save();
      var subs = readSubjects();
      var lead = parseInt($("leadDays").value, 10); if (isNaN(lead) || lead < 0) lead = 0;
      var perDay = parseInt($("perDay").value, 10) === 2 ? 2 : 1;
      render(subs.length ? generate(subs, lead, perDay) : null);
    };
    $("clearBtn").onclick = function () {
      $("subject-list").innerHTML = ""; addRow("", ""); addRow("", "");
      $("leadDays").value = 7; $("perDay").value = 1; $("result").innerHTML = "";
      localStorage.removeItem("studyplan_input");
    };

    document.querySelector(".langbtn").onclick = function () {
      lang = lang === "en" ? "zh" : "en";
      localStorage.setItem("clp_lang", lang);
      applyLang();
      // re-render plan if present
      var subs = readSubjects();
      if ($("result").innerHTML.trim() && subs.length) {
        var lead = parseInt($("leadDays").value, 10) || 0;
        var perDay = parseInt($("perDay").value, 10) === 2 ? 2 : 1;
        render(generate(subs, lead, perDay));
      }
    };

    applyLang();
  });
})();
