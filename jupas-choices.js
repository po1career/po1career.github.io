/* JUPAS Choice Evaluator (STUDENT page) — jupas-choices.js (v3)
   Self-contained page script (do NOT load app.js here).
   - Gate: same scheme as jupas-tool.js — validates passcode by decrypting
     programmes.enc.json (PBKDF2-SHA256 150k + AES-GCM); shares localStorage "jupas_pass".
     Decrypted CSV powers the per-row programme autocomplete.
   - ALL-MANUAL by design: students compute their weighted score with the institutions' own
     online calculators and pick the position vs UQ/Median/LQ themselves, then hand the PDF
     to the Career Team. NO stats database on this page (teacher page holds it, encrypted).
   - NO evaluative wording (teacher evaluates): summary shows factual counts only.
   - Bands per JUPAS official: A=1-3, B=4-6, C=7-10, D=11-15, E=16-20.
   - Exports: hand-built PDF embedding state as base64 in /Keywords + trailing
     %JCDATA:<b64>:END (dse-portfolio pattern; teacher page imports it), CSV (BOM), browser print.
   - State in localStorage "jupas_choices" (opt-out toggle).
   - WORDING RULE: never "cut-off score" user-facing — "admission score references (past intakes)". */
(function () {
'use strict';

function $(id) { return document.getElementById(id); }
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

// ---------- constants ----------
var LEVELS = ['5**', '5*', '5', '4', '3', '2', '1', 'U'];
var DSE_POINTS = { '5**': 7, '5*': 6, '5': 5, '4': 4, '3': 3, '2': 2, '1': 1, 'U': 0, '': 0 };

var CORE = [
  { key: 'chi',  en: 'Chinese Language', zh: '中國語文' },
  { key: 'eng',  en: 'English Language', zh: '英國語文' },
  { key: 'math', en: 'Mathematics',      zh: '數學（必修）' }
];

var ELECT_SUBJ = [
  { key: 'bafs',    en: 'BAFS',                  zh: '企業、會計與財務概論' },
  { key: 'bio',     en: 'Biology',               zh: '生物' },
  { key: 'chem',    en: 'Chemistry',             zh: '化學' },
  { key: 'chist',   en: 'Chinese History',       zh: '中國歷史' },
  { key: 'chinlit', en: 'Chinese Literature',    zh: '中國文學' },
  { key: 'econ',    en: 'Economics',             zh: '經濟' },
  { key: 'geog',    en: 'Geography',             zh: '地理' },
  { key: 'hist',    en: 'History',               zh: '歷史' },
  { key: 'ict',     en: 'ICT',                   zh: '資訊及通訊科技' },
  { key: 'm2',      en: 'Maths Ext. (M2)',       zh: '數學延伸單元二 (M2)' },
  { key: 'phys',    en: 'Physics',               zh: '物理' }
];

var N_ELECT = 4, N_CHOICES = 20;

// JUPAS official banding: A=1-3, B=4-6, C=7-10, D=11-15, E=16-20
var BANDS = [
  { name: 'A', from: 1, to: 3 },
  { name: 'B', from: 4, to: 6 },
  { name: 'C', from: 7, to: 10 },
  { name: 'D', from: 11, to: 15 },
  { name: 'E', from: 16, to: 20 }
];
function bandOf(i) {
  for (var b = 0; b < BANDS.length; b++) if (i + 1 <= BANDS[b].to) return BANDS[b];
  return BANDS[BANDS.length - 1];
}
function choiceLabel(i) { return bandOf(i).name + (i + 1); }

// manual position values vs admission score references (factual)
var MANUAL_CMP = ['aboveUQ', 'aboveM', 'aboveLQ', 'belowLQ', 'nodata'];
var CMP_TO_POS = { aboveUQ: 'uq', aboveM: 'm', aboveLQ: 'lq', belowLQ: 'below', nodata: 'na' };
var POS_KEYS = ['uq', 'm', 'lq', 'below', 'na'];

// ---------- i18n ----------
var STRINGS = {
  en: {
    home: '← Back to home',
    title: 'JUPAS Choice Evaluator',
    subtitle: 'Record your 20 JUPAS programme choices with your calculated scores, then download the PDF and hand it to your Career Team teachers.',
    disc: 'Unofficial self-evaluation tool for PLK No.1 students — not affiliated with JUPAS or any institution. Admission score statistics (Upper Quartile / Median / Lower Quartile) are references published by institutions for PAST years and do not guarantee this year’s results. Always verify programme details on www.jupas.edu.hk before submitting your application.',
    s1: '1 · Student information',
    name: 'Name', klass: 'Class', cno: 'Class no.',
    s2: '2 · Your HKDSE results (actual or predicted)',
    s2hint: 'Enter the level for each subject. The Best 5 score below uses the common scale (5** = 7 … 1 = 1). Individual universities weight subjects differently — that is what the “Calculated score” column in the table is for.',
    electLabel: function (i) { return 'Elective ' + i; },
    pickSubj: '— subject —', pickLv: 'Level',
    b5label: 'Best 5 score:',
    b5none: 'Enter at least 5 subjects to see your Best 5.',
    b5detail: function (list) { return 'Counted: ' + list; },
    s3: '3 · Your 20 programme choices',
    s3hint: 'Type a JS code or keyword to search the programme list. Then use each university’s own admission-score calculator on its admissions website to work out your weighted score for that programme, enter it, and choose where it sits against the programme’s published admission score references (UQ / Median / LQ of previous intakes).',
    bandRow: function (b) { return 'Band ' + b.name + ' · choices ' + b.from + '–' + b.to; },
    thChoice: 'Choice', thProg: 'Programme (JS code)', thIntake: 'First-year intake', thScore: 'Calculated score',
    thPos: 'Position vs admission score references', thRemark: 'Remarks',
    progPh: 'JS code / keyword…',
    notFound: 'Not in our list — double-check the code on jupas.edu.hk',
    official: 'Official page ↗',
    cmpPick: '— select —',
    cmpFull: {
      aboveUQ: 'At or above Upper Quartile (UQ)',
      aboveM:  'Between Median and UQ',
      aboveLQ: 'Between Lower Quartile and Median',
      belowLQ: 'Below Lower Quartile (LQ)',
      nodata:  'No data / not sure'
    },
    pos: { uq: '≥ UQ', m: 'Median – UQ', lq: 'LQ – Median', below: '< LQ', na: 'No data' },
    s4: '4 · Overview',
    sumFilled: function (n) { return n + ' of 20 choices filled in'; },
    sumUnclassified: function (n) { return n + ' without position yet'; },
    sumByBand: 'By band:',
    s5: '5 · Save & export',
    btnPdf: '⬇ PDF for my teacher', btnCsv: '⬇ Excel (CSV)', btnPrint: '🖨 Print',
    btnImport: '📂 Restore from my PDF', btnClear: 'Clear all',
    rememberLbl: 'Save my progress on this computer',
    sharedNote: 'On a shared or school computer, untick the box above and your data is kept in memory only (cleared when the tab closes). The “PDF for my teacher” file is your record — you can also re-upload it here later to restore everything and continue.',
    confirmClear: 'Clear all entered data? This cannot be undone.',
    exportOk: 'PDF downloaded — hand this file to your teacher. Keep it to restore your progress later.',
    importOk: 'Progress restored from your PDF.',
    importErr: 'Couldn’t read data from that PDF. Make sure it’s the file this page exported.',
    tooBig: 'That file is too large. Please upload the small PDF this page exported.',
    footer: 'Unofficial reference tool for PLK No.1 students — not affiliated with JUPAS. Data may be incomplete or out of date; always verify on the official JUPAS website (www.jupas.edu.hk) and each institution’s website before applying.',
    rpTitle: 'JUPAS Programme Choices — Student Self-Report',
    rpSchool: 'PLK No.1 W.H. Cheung College · Career Team',
    rpGen: 'Generated', rpName: 'Name', rpClass: 'Class', rpCno: 'Class no.', rpBest5: 'Best 5 score',
    rpResults: 'HKDSE Results', rpSubject: 'Subject', rpLevel: 'Level', rpPoints: 'Points',
    rpChoices: 'Programme Choices', rpInst: 'Institution', rpBand: 'Band',
    rpSummary: 'Overview', rpComments: 'Teacher’s evaluation & comments',
    rpSignS: 'Student signature: ______________________', rpSignT: 'Teacher signature: ______________________', rpDate: 'Date: ______________'
  },
  zh: {
    home: '← 返回主頁',
    title: 'JUPAS 選科自評工具',
    subtitle: '記錄你 20 個 JUPAS 課程選擇及計算分數，下載 PDF 後交給升學輔導組老師。',
    disc: '本工具為保良局第一張永慶中學學生自評之用，並非 JUPAS 或任何院校的官方工具。收生分數統計（上四分位數／中位數／下四分位數）屬院校公布的「過往年度」參考數字，不代表本年度結果。遞交申請前，請務必於 www.jupas.edu.hk 核實課程資料。',
    s1: '1 · 學生資料',
    name: '姓名', klass: '班別', cno: '學號',
    s2: '2 · 你的香港中學文憑試成績（實際或預測）',
    s2hint: '請選擇每科等級。下方「最佳五科」採用常見換算（5** = 7 … 1 = 1）。個別大學對科目有不同加權——表格中的「計算分數」一欄正是為此而設。',
    electLabel: function (i) { return '選修科 ' + i; },
    pickSubj: '— 科目 —', pickLv: '等級',
    b5label: '最佳五科總分：',
    b5none: '輸入至少五科成績後會顯示最佳五科總分。',
    b5detail: function (list) { return '計入科目：' + list; },
    s3: '3 · 你的 20 個課程選擇',
    s3hint: '輸入 JS 編號或關鍵字搜尋課程。然後使用各大學收生網頁上的收生分數計算機，計算你在該課程的加權分數並填入，再對照該課程公布的收生分數參考（過往年度的上四分位數／中位數／下四分位數），選出你所屬的區間。',
    bandRow: function (b) { return 'Band ' + b.name + ' · 第 ' + b.from + '–' + b.to + ' 志願'; },
    thChoice: '志願', thProg: '課程（JS 編號）', thIntake: '首年學額', thScore: '計算分數',
    thPos: '對比收生分數參考的位置', thRemark: '備註',
    progPh: 'JS 編號／關鍵字…',
    notFound: '不在清單內——請於 jupas.edu.hk 核對編號',
    official: '官方網頁 ↗',
    cmpPick: '— 請選擇 —',
    cmpFull: {
      aboveUQ: '達到或高於上四分位數 (UQ)',
      aboveM:  '介乎中位數與上四分位數之間',
      aboveLQ: '介乎下四分位數與中位數之間',
      belowLQ: '低於下四分位數 (LQ)',
      nodata:  '沒有資料／不確定'
    },
    pos: { uq: '≥ UQ', m: '中位數 – UQ', lq: 'LQ – 中位數', below: '< LQ', na: '沒有資料' },
    s4: '4 · 總覽',
    sumFilled: function (n) { return '已填寫 ' + n + ' / 20 個志願'; },
    sumUnclassified: function (n) { return n + ' 個未選擇位置'; },
    sumByBand: '按 Band 顯示：',
    s5: '5 · 儲存及匯出',
    btnPdf: '⬇ 給老師的 PDF', btnCsv: '⬇ Excel (CSV)', btnPrint: '🖨 列印',
    btnImport: '📂 從我的 PDF 還原', btnClear: '清除全部',
    rememberLbl: '在此電腦儲存我的進度',
    sharedNote: '如使用共用或學校電腦，請取消勾選上方選項，資料只會暫存於記憶體（關閉分頁即清除）。「給老師的 PDF」就是你的紀錄——日後亦可重新上載到本頁還原所有資料繼續填寫。',
    confirmClear: '確定清除所有已輸入的資料？此操作無法復原。',
    exportOk: '已下載 PDF——請把檔案交給老師，並保留作日後還原進度之用。',
    importOk: '已從你的 PDF 還原進度。',
    importErr: '無法從該 PDF 讀取資料，請確認是本頁匯出的檔案。',
    tooBig: '檔案太大。請上載本頁匯出的小型 PDF 檔案。',
    footer: '本工具為保良局第一張永慶中學學生的非官方參考工具，與 JUPAS 無關。資料或不完整或過時；申請前請務必於 JUPAS 官方網站 (www.jupas.edu.hk) 及各院校網站核實。',
    rpTitle: 'JUPAS 課程選擇學生自評表',
    rpSchool: '保良局第一張永慶中學 · 升學輔導及生涯規劃組',
    rpGen: '產生日期', rpName: '姓名', rpClass: '班別', rpCno: '學號', rpBest5: '最佳五科總分',
    rpResults: '香港中學文憑試成績', rpSubject: '科目', rpLevel: '等級', rpPoints: '分數',
    rpChoices: '課程選擇', rpInst: '院校', rpBand: 'Band',
    rpSummary: '總覽', rpComments: '老師評估及評語',
    rpSignS: '學生簽署：______________________', rpSignT: '老師簽署：______________________', rpDate: '日期：______________'
  }
};

var lang = (localStorage.getItem('clp_lang') === 'zh') ? 'zh' : 'en';
function t() { return STRINGS[lang]; }

// ---------- state ----------
var LS = 'jupas_choices', REMEMBER_KEY = 'jupas_choices_remember';
var programmes = [];

function blankState() {
  return {
    name: '', klass: '', cno: '',
    core: { chi: '', eng: '', math: '' },
    elect: Array.from({ length: N_ELECT }, function () { return { s: '', lv: '' }; }),
    choices: Array.from({ length: N_CHOICES }, function () { return { code: '', intake: '', score: '', cmp: '', remark: '' }; }),
    remember: true
  };
}
var state = blankState();

// whitelist-copy raw object → state (used by load() and PDF import)
function applyData(d) {
  if (typeof d.name === 'string') state.name = d.name.slice(0, 60);
  if (typeof d.klass === 'string') state.klass = d.klass.slice(0, 10);
  if (typeof d.cno === 'string') state.cno = d.cno.slice(0, 4);
  CORE.forEach(function (c) {
    if (d.core && LEVELS.indexOf(d.core[c.key]) >= 0) state.core[c.key] = d.core[c.key];
  });
  if (Array.isArray(d.elect)) for (var i = 0; i < N_ELECT; i++) {
    var e = d.elect[i] || {};
    if (ELECT_SUBJ.some(function (s) { return s.key === e.s; })) state.elect[i].s = e.s;
    if (LEVELS.indexOf(e.lv) >= 0) state.elect[i].lv = e.lv;
  }
  if (Array.isArray(d.choices)) for (var j = 0; j < N_CHOICES; j++) {
    var c2 = d.choices[j] || {};
    state.choices[j].code = String(c2.code || '').slice(0, 40);
    state.choices[j].intake = String(c2.intake || '').slice(0, 12);
    state.choices[j].score = String(c2.score || '').slice(0, 12);
    state.choices[j].cmp = MANUAL_CMP.indexOf(c2.cmp) >= 0 ? c2.cmp : '';
    state.choices[j].remark = String(c2.remark || '').slice(0, 120);
  }
}

function load() {
  try {
    state.remember = localStorage.getItem(REMEMBER_KEY) !== '0';
    var raw = localStorage.getItem(LS);
    if (raw) applyData(JSON.parse(raw));
  } catch (e) { /* corrupted save — start fresh */ }
}

var saveTimer = null;
function save() {
  localStorage.setItem(REMEMBER_KEY, state.remember ? '1' : '0');
  if (!state.remember) { localStorage.removeItem(LS); return; }
  clearTimeout(saveTimer);
  saveTimer = setTimeout(function () {
    localStorage.setItem(LS, JSON.stringify({
      name: state.name, klass: state.klass, cno: state.cno,
      core: state.core, elect: state.elect, choices: state.choices
    }));
  }, 250);
}

// ---------- grades / Best 5 ----------
function gradeEntries() {
  var out = [];
  CORE.forEach(function (c) {
    if (state.core[c.key]) out.push({ label: c[lang], label_en: c.en, lv: state.core[c.key], pts: DSE_POINTS[state.core[c.key]] });
  });
  state.elect.forEach(function (e, i) {
    if (e.lv) {
      var subj = ELECT_SUBJ.filter(function (x) { return x.key === e.s; })[0];
      out.push({ label: subj ? subj[lang] : t().electLabel(i + 1), label_en: subj ? subj.en : ('Elective ' + (i + 1)), lv: e.lv, pts: DSE_POINTS[e.lv] });
    }
  });
  return out;
}

function best5Total() {
  return gradeEntries().sort(function (a, b) { return b.pts - a.pts; }).slice(0, 5)
    .reduce(function (s, e) { return s + e.pts; }, 0);
}

function updateBest5() {
  var entries = gradeEntries().slice().sort(function (a, b) { return b.pts - a.pts; });
  var used = entries.slice(0, 5);
  $('best5-val').textContent = entries.length ? String(used.reduce(function (s, e) { return s + e.pts; }, 0)) : '0';
  $('best5-detail').textContent = entries.length >= 5
    ? t().b5detail(used.map(function (e) { return e.label + ' ' + e.lv; }).join(' · '))
    : t().b5none;
}

// ---------- programme lookup ----------
function findProg(code) {
  var q = code.trim().toUpperCase();
  return programmes.filter(function (p) { return (p.code || '').toUpperCase() === q; })[0] || null;
}

function searchProg(q) {
  q = q.trim().toLowerCase();
  if (q.length < 2) return [];
  var starts = [], contains = [];
  for (var i = 0; i < programmes.length; i++) {
    var p = programmes[i];
    if ((p.code || '').toLowerCase().indexOf(q) === 0) { starts.push(p); }
    else {
      var hay = [p.code, p.name_en, p.name_zh, p.institution_en, p.institution_zh, p.tags].join(' ').toLowerCase();
      if (hay.indexOf(q) >= 0) contains.push(p);
    }
    if (starts.length >= 8) break;
  }
  return starts.concat(contains).slice(0, 8);
}

function progName(p) { return lang === 'zh' ? (p.name_zh || p.name_en) : p.name_en; }
function progInst(p) { return lang === 'zh' ? (p.institution_zh || p.institution_en) : p.institution_en; }

function rowPosition(i) {
  var ch = state.choices[i];
  if (!ch.code.trim()) return null;
  return ch.cmp ? CMP_TO_POS[ch.cmp] : null;
}

// ---------- UI builders ----------
function fillSelect(sel, options, value, placeholder) {
  sel.innerHTML = '';
  var o0 = document.createElement('option');
  o0.value = ''; o0.textContent = placeholder;
  sel.appendChild(o0);
  options.forEach(function (op) {
    var o = document.createElement('option');
    o.value = op.value; o.textContent = op.label;
    sel.appendChild(o);
  });
  sel.value = value || '';
}

function levelOptions() { return LEVELS.map(function (l) { return { value: l, label: l }; }); }

function buildScores() {
  var box = $('grades');
  box.innerHTML = '';
  CORE.forEach(function (c) {
    var row = document.createElement('div');
    row.className = 'grade-row';
    var nm = document.createElement('span');
    nm.className = 'core-name'; nm.textContent = c[lang];
    var sel = document.createElement('select');
    sel.className = 'lv';
    fillSelect(sel, levelOptions(), state.core[c.key], t().pickLv);
    sel.addEventListener('change', function () { state.core[c.key] = sel.value; save(); updateBest5(); });
    row.appendChild(nm); row.appendChild(sel);
    box.appendChild(row);
  });
  state.elect.forEach(function (e, i) {
    var row = document.createElement('div');
    row.className = 'grade-row';
    var subj = document.createElement('select');
    subj.className = 'subj';
    fillSelect(subj, ELECT_SUBJ.map(function (s) { return { value: s.key, label: s[lang] }; }),
      e.s, t().pickSubj + ' ' + t().electLabel(i + 1));
    subj.addEventListener('change', function () { e.s = subj.value; save(); updateBest5(); });
    var lv = document.createElement('select');
    lv.className = 'lv';
    fillSelect(lv, levelOptions(), e.lv, t().pickLv);
    lv.addEventListener('change', function () { e.lv = lv.value; save(); updateBest5(); });
    row.appendChild(subj); row.appendChild(lv);
    box.appendChild(row);
  });
}

function buildTable() {
  var tbody = $('choice-rows');
  tbody.innerHTML = '';
  state.choices.forEach(function (ch, i) {
    var band = bandOf(i);
    var bandCls = 'band-' + band.name.toLowerCase();
    if (i + 1 === band.from) {
      var sep = document.createElement('tr');
      sep.className = 'band-sep ' + bandCls;
      var sepTd = document.createElement('td');
      sepTd.colSpan = 6;
      sepTd.textContent = t().bandRow(band);
      sep.appendChild(sepTd);
      tbody.appendChild(sep);
    }

    var tr = document.createElement('tr');
    tr.className = bandCls;

    var tdN = document.createElement('td');
    var badge = document.createElement('span');
    badge.className = 'band-badge'; badge.textContent = choiceLabel(i);
    tdN.appendChild(badge);

    var tdP = document.createElement('td');
    var wrap = document.createElement('div'); wrap.className = 'pp-wrap';
    var inp = document.createElement('input');
    inp.type = 'text'; inp.className = 'pp-in'; inp.maxLength = 40;
    inp.placeholder = t().progPh; inp.value = ch.code; inp.autocomplete = 'off';
    var drop = document.createElement('div'); drop.className = 'pp-drop';
    var info = document.createElement('div'); info.className = 'pp-info';

    function updateInfo() {
      var code = ch.code.trim();
      if (!code) { info.innerHTML = ''; return; }
      var p = findProg(code);
      if (!p) { info.innerHTML = '<span class="warn">' + esc(t().notFound) + '</span>'; return; }
      var link = p.url ? ' <a href="' + esc(p.url) + '" target="_blank" rel="noopener noreferrer">' + esc(t().official) + '</a>' : '';
      info.innerHTML = esc(progName(p)) + '<br>' + esc(progInst(p)) + link;
    }

    inp.addEventListener('input', function () {
      ch.code = inp.value; save();
      var hits = searchProg(inp.value);
      drop.innerHTML = '';
      if (hits.length) {
        hits.forEach(function (p) {
          var b = document.createElement('button');
          b.type = 'button';
          b.innerHTML = '<span class="ppc">' + esc(p.code) + '</span>' + esc(progName(p)) + ' · ' + esc(progInst(p));
          b.addEventListener('mousedown', function (ev) {
            ev.preventDefault();
            ch.code = p.code; inp.value = p.code; save();
            drop.style.display = 'none';
            updateInfo(); updateSummary();
          });
          drop.appendChild(b);
        });
        drop.style.display = 'block';
      } else { drop.style.display = 'none'; }
      updateInfo(); updateSummary();
    });
    inp.addEventListener('blur', function () { setTimeout(function () { drop.style.display = 'none'; }, 150); });
    wrap.appendChild(inp); wrap.appendChild(drop); wrap.appendChild(info);
    tdP.appendChild(wrap);
    updateInfo();

    var tdI = document.createElement('td');
    var ik = document.createElement('input');
    ik.type = 'text'; ik.className = 'intake'; ik.maxLength = 12; ik.inputMode = 'numeric'; ik.value = ch.intake;
    ik.addEventListener('input', function () { ch.intake = ik.value; save(); });
    tdI.appendChild(ik);

    var tdS = document.createElement('td');
    var sc = document.createElement('input');
    sc.type = 'text'; sc.className = 'score'; sc.maxLength = 12; sc.inputMode = 'decimal'; sc.value = ch.score;
    sc.addEventListener('input', function () { ch.score = sc.value; save(); });
    tdS.appendChild(sc);

    var tdC = document.createElement('td');
    var cmpSel = document.createElement('select');
    cmpSel.className = 'cmp';
    fillSelect(cmpSel, MANUAL_CMP.map(function (k) { return { value: k, label: t().cmpFull[k] }; }), ch.cmp, t().cmpPick);
    cmpSel.addEventListener('change', function () { ch.cmp = cmpSel.value; save(); updateSummary(); });
    tdC.appendChild(cmpSel);

    var tdM = document.createElement('td');
    var rm = document.createElement('input');
    rm.type = 'text'; rm.className = 'remark'; rm.maxLength = 120; rm.value = ch.remark;
    rm.addEventListener('input', function () { ch.remark = rm.value; save(); });
    tdM.appendChild(rm);

    tr.appendChild(tdN); tr.appendChild(tdP); tr.appendChild(tdI); tr.appendChild(tdS);
    tr.appendChild(tdC); tr.appendChild(tdM);
    tbody.appendChild(tr);
  });
}

// ---------- summary (factual counts only) ----------
function updateSummary() {
  var s = t();
  var filled = state.choices.filter(function (c) { return c.code.trim(); }).length;
  var counts = { uq: 0, m: 0, lq: 0, below: 0, na: 0 };
  var unclassified = 0;
  state.choices.forEach(function (c, i) {
    if (!c.code.trim()) return;
    var pos = rowPosition(i);
    if (pos) counts[pos]++; else unclassified++;
  });

  var box = $('sum-chips');
  box.innerHTML = '';
  function chip(cls, text) {
    var sp = document.createElement('span');
    sp.className = 'pos-badge ' + cls; sp.textContent = text;
    box.appendChild(sp);
  }
  chip('p-na', s.sumFilled(filled));
  POS_KEYS.forEach(function (k) { if (counts[k]) chip('p-' + k, s.pos[k] + ' × ' + counts[k]); });
  if (unclassified) chip('p-na', s.sumUnclassified(unclassified));

  var bb = $('sum-bands');
  bb.innerHTML = '<div class="sum-band-label">' + esc(s.sumByBand) + '</div>';
  BANDS.forEach(function (b) {
    var row = document.createElement('div');
    row.className = 'sum-band-row band-' + b.name.toLowerCase();
    var nameEl = document.createElement('span');
    nameEl.className = 'sum-band-name'; nameEl.textContent = s.bandRow(b);
    row.appendChild(nameEl);
    for (var i = b.from - 1; i < b.to; i++) {
      var c = state.choices[i];
      var sp = document.createElement('span');
      if (!c.code.trim()) { sp.className = 'pos-badge p-empty'; sp.textContent = '—'; }
      else {
        var pos = rowPosition(i);
        sp.className = 'pos-badge p-' + (pos || 'na');
        sp.textContent = c.code.trim().toUpperCase() + (pos ? ' ' + s.pos[pos] : '');
      }
      row.appendChild(sp);
    }
    bb.appendChild(row);
  });
}

// ---------- export: CSV (Excel) ----------
function csvField(v) {
  v = deSmart(v);
  return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
}

function exportCSV() {
  var s = t(), lines = [];
  function row() { lines.push(Array.prototype.slice.call(arguments).map(csvField).join(',')); }

  row(s.rpTitle);
  row(s.rpSchool);
  row(s.rpGen, new Date().toISOString().slice(0, 10));
  row();
  row(s.rpName, state.name, s.rpClass, state.klass, s.rpCno, state.cno);
  row();
  row(s.rpResults);
  row(s.rpSubject, s.rpLevel, s.rpPoints);
  gradeEntries().forEach(function (e) { row(e.label, e.lv, e.pts); });
  row(s.rpBest5, gradeEntries().length ? best5Total() : '');
  row();
  row(s.rpChoices);
  row(s.thChoice, s.rpBand, 'JS', s.thProg, s.rpInst, s.thIntake, s.thScore, s.thPos, s.thRemark);
  state.choices.forEach(function (c, i) {
    var p = c.code.trim() ? findProg(c.code) : null;
    row(choiceLabel(i), bandOf(i).name, c.code, p ? progName(p) : '', p ? progInst(p) : '',
        c.intake, c.score, c.cmp ? s.cmpFull[c.cmp] : '', c.remark);
  });

  var blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  var who = (state.name || 'student').replace(/[^\w一-鿿-]+/g, '_');
  a.download = 'jupas-choices_' + who + '_' + new Date().toISOString().slice(0, 10) + '.csv';
  document.body.appendChild(a); a.click();
  setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

// ---------- export: hand-built PDF embedding the data (teacher imports this) ----------
function utf8ToB64(str) { return btoa(unescape(encodeURIComponent(str))); }
function b64ToUtf8(b64) { return decodeURIComponent(escape(atob(b64))); }
function pdfEsc(s) { return String(s).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)'); }
// normalise typographic punctuation to plain ASCII (smart apostrophes/quotes/dashes would
// otherwise render as "?" in the Helvetica PDF). Used by both PDF and CSV exports.
function deSmart(s) {
  return String(s == null ? '' : s)
    .replace(/[‘’ʼ]/g, "'").replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-').replace(/…/g, '...').replace(/ /g, ' ');
}
function ascii(s) {
  var o = '', str = deSmart(s);
  for (var i = 0; i < str.length; i++) { var c = str.charCodeAt(i); o += (c >= 32 && c < 256) ? str[i] : '?'; }
  return o;
}

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
    var s = '';
    pg.forEach(function (ln) {
      var f = ln.bold ? 'F2' : 'F1';
      s += 'BT /' + f + ' ' + ln.size + ' Tf 1 0 0 1 ' + (left + ln.indent) + ' ' + ln.y + ' Tm (' + pdfEsc(ascii(ln.t)) + ') Tj ET\n';
    });
    var cN = n++, pN = n++;
    streams.push({ cN: cN, pN: pN, s: s }); pageNums.push(pN);
  });
  var total = n - 1, body = {};
  body[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  body[2] = '<< /Type /Pages /Kids [' + pageNums.map(function (p) { return p + ' 0 R'; }).join(' ') + '] /Count ' + pageNums.length + ' >>';
  body[NF1] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
  body[NF2] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';
  body[NINFO] = '<< /Title (JUPAS Choice Evaluator) /Producer (PLK No.1 Career Team) /Keywords (JCDATA:' + dataB64 + ') >>';
  streams.forEach(function (cs) {
    body[cs.cN] = '<< /Length ' + cs.s.length + ' >>\nstream\n' + cs.s + 'endstream';
    body[cs.pN] = '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + pageW + ' ' + pageH + '] /Resources << /Font << /F1 ' + NF1 + ' 0 R /F2 ' + NF2 + ' 0 R >> >> /Contents ' + cs.cN + ' 0 R >>';
  });
  var pdf = '%PDF-1.4\n', off = [];
  for (var i = 1; i <= total; i++) { off[i] = pdf.length; pdf += i + ' 0 obj\n' + body[i] + '\nendobj\n'; }
  var xref = pdf.length;
  pdf += 'xref\n0 ' + (total + 1) + '\n0000000000 65535 f \n';
  for (var j = 1; j <= total; j++) { pdf += ('0000000000' + off[j]).slice(-10) + ' 00000 n \n'; }
  pdf += 'trailer\n<< /Size ' + (total + 1) + ' /Root 1 0 R /Info ' + NINFO + ' 0 R >>\nstartxref\n' + xref + '\n%%EOF\n';
  pdf += '%JCDATA:' + dataB64 + ':END\n';
  return pdf;
}

function pdfLines() {
  var en = STRINGS.en, L = [];
  L.push({ t: en.rpTitle, size: 17, bold: true });
  L.push({ t: en.rpSchool, size: 10, gap: 2 });
  L.push({ t: en.rpGen + ': ' + new Date().toISOString().slice(0, 10), size: 10 });
  L.push({ t: en.rpName + ': ' + (state.name || '-') + '    ' + en.rpClass + ': ' + (state.klass || '-') +
           '    ' + en.rpCno + ': ' + (state.cno || '-'), size: 11, bold: true, gap: 8 });
  L.push({ t: en.rpResults, size: 13, bold: true, gap: 12 });
  gradeEntries().forEach(function (e) {
    L.push({ t: e.label_en + ': ' + e.lv + ' (' + e.pts + ')', size: 10, indent: 14 });
  });
  L.push({ t: en.rpBest5 + ': ' + (gradeEntries().length ? best5Total() : '-'), size: 11, bold: true, gap: 4 });
  L.push({ t: en.rpChoices, size: 13, bold: true, gap: 12 });
  state.choices.forEach(function (c, i) {
    if (!c.code.trim()) return;
    var p = findProg(c.code);
    var nm = p ? (p.name_en + ' (' + p.institution_en + ')') : '';
    L.push({ t: choiceLabel(i) + '  ' + c.code.trim().toUpperCase() + '  ' + nm.slice(0, 90), size: 10, bold: true, gap: 4 });
    var detail = [];
    if (c.intake.trim()) detail.push(en.thIntake + ': ' + c.intake.trim());
    if (c.score.trim()) detail.push(en.thScore + ': ' + c.score.trim());
    if (c.cmp) detail.push(en.cmpFull[c.cmp]);
    if (c.remark.trim()) detail.push(c.remark.trim());
    if (detail.length) L.push({ t: detail.join('  |  '), size: 9, indent: 14 });
  });
  L.push({ t: en.rpComments + ':', size: 12, bold: true, gap: 16 });
  for (var k = 0; k < 5; k++) L.push({ t: '', size: 11 });
  L.push({ t: en.rpSignS + '      ' + en.rpSignT + '      ' + en.rpDate, size: 10, gap: 8 });
  return L;
}

function exportPdf() {
  // embed resolved programme names so the teacher page can show them without this page's DB
  var payload = {
    v: 1, kind: 'jupas-choices',
    name: state.name, klass: state.klass, cno: state.cno,
    core: state.core, elect: state.elect,
    choices: state.choices.map(function (c) {
      var p = c.code.trim() ? findProg(c.code) : null;
      return { code: c.code, intake: c.intake, score: c.score, cmp: c.cmp, remark: c.remark,
               name_en: p ? p.name_en : '', inst_en: p ? p.institution_en : '',
               name_zh: p ? p.name_zh : '', inst_zh: p ? p.institution_zh : '' };
    }),
    generated: new Date().toISOString().slice(0, 10)
  };
  var b64 = utf8ToB64(JSON.stringify(payload));
  var pdf = buildPdf(pdfLines(), b64);
  var bytes = new Uint8Array(pdf.length);
  for (var i = 0; i < pdf.length; i++) bytes[i] = pdf.charCodeAt(i) & 0xff;
  var blob = new Blob([bytes], { type: 'application/pdf' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  var who = (state.name || 'student').replace(/[^\w\-]+/g, '_');
  a.download = 'JUPAS-choices-' + who + '-' + new Date().toISOString().slice(0, 10) + '.pdf';
  document.body.appendChild(a); a.click();
  setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  flash(t().exportOk, true);
}

// ---------- import: restore progress from an exported PDF ----------
var MAX_IMPORT_BYTES = 5 * 1024 * 1024;
function importPdf(file) {
  if (!file) return;
  if (file.size > MAX_IMPORT_BYTES) { flash(t().tooBig, false); return; }
  var reader = new FileReader();
  reader.onload = function () {
    try {
      var buf = new Uint8Array(reader.result), str = '';
      for (var i = 0; i < buf.length; i++) str += String.fromCharCode(buf[i]);
      var m = str.match(/JCDATA:([A-Za-z0-9+/=]+)/);
      if (!m) { flash(t().importErr, false); return; }
      var data = JSON.parse(b64ToUtf8(m[1]));
      var rem = state.remember;
      state = blankState(); state.remember = rem;
      applyData(data);
      save();
      buildUI();
      flash(t().importOk, true);
    } catch (e) { flash(t().importErr, false); }
  };
  reader.onerror = function () { flash(t().importErr, false); };
  reader.readAsArrayBuffer(file);
}

var msgTimer = null;
function flash(text, ok) {
  var el = $('io-msg');
  el.textContent = text; el.className = 'msg ' + (ok ? 'ok' : 'err');
  if (msgTimer) clearTimeout(msgTimer);
  msgTimer = setTimeout(function () { el.textContent = ''; el.className = 'msg'; }, 6000);
}

// ---------- print report (browser print, bilingual) ----------
function buildReport() {
  var s = t();
  var entries = gradeEntries();

  var h = '<h1>' + esc(s.rpTitle) + '</h1><p class="rp-sub">' + esc(s.rpSchool) +
    ' · ' + esc(s.rpGen) + ': ' + esc(new Date().toISOString().slice(0, 10)) + '</p>';

  h += '<table class="rp-meta"><tr>' +
    '<td><strong>' + esc(s.rpName) + ':</strong> ' + esc(state.name) + '</td>' +
    '<td><strong>' + esc(s.rpClass) + ':</strong> ' + esc(state.klass) + '</td>' +
    '<td><strong>' + esc(s.rpCno) + ':</strong> ' + esc(state.cno) + '</td>' +
    '<td><strong>' + esc(s.rpBest5) + ':</strong> ' + (entries.length ? best5Total() : '—') + '</td>' +
    '</tr></table>';

  h += '<h2>' + esc(s.rpResults) + '</h2><table><tr><th>' + esc(s.rpSubject) + '</th><th>' +
    esc(s.rpLevel) + '</th><th>' + esc(s.rpPoints) + '</th></tr>';
  entries.forEach(function (e) {
    h += '<tr><td>' + esc(e.label) + '</td><td>' + esc(e.lv) + '</td><td>' + e.pts + '</td></tr>';
  });
  h += '</table>';

  h += '<h2>' + esc(s.rpChoices) + '</h2><table><tr><th>' + esc(s.thChoice) + '</th><th>JS</th><th>' +
    esc(s.thProg) + '</th><th>' + esc(s.thIntake) + '</th><th>' + esc(s.thScore) + '</th><th>' + esc(s.thPos) + '</th><th>' +
    esc(s.thRemark) + '</th></tr>';
  state.choices.forEach(function (c, i) {
    var p = c.code.trim() ? findProg(c.code) : null;
    var pname = p ? (progName(p) + ' — ' + progInst(p)) : '';
    h += '<tr><td><strong>' + choiceLabel(i) + '</strong></td><td>' + esc(c.code) + '</td><td>' +
      esc(pname) + '</td><td>' + esc(c.intake) + '</td><td>' + esc(c.score) + '</td><td>' + esc(c.cmp ? s.cmpFull[c.cmp] : '') + '</td><td>' +
      esc(c.remark) + '</td></tr>';
  });
  h += '</table>';

  var counts = { uq: 0, m: 0, lq: 0, below: 0, na: 0 }, filled = 0;
  state.choices.forEach(function (c, i) {
    if (!c.code.trim()) return;
    filled++;
    var pos = rowPosition(i);
    if (pos) counts[pos]++;
  });
  h += '<h2>' + esc(s.rpSummary) + '</h2><p>' + esc(s.sumFilled(filled)) + ' · ' +
    POS_KEYS.map(function (k) { return esc(s.pos[k]) + ': ' + counts[k]; }).join(' · ') + '</p>';

  h += '<h2>' + esc(s.rpComments) + '</h2><div class="rp-comment"></div>';
  h += '<div class="rp-sign"><span>' + esc(s.rpSignS) + '</span><span>' + esc(s.rpSignT) +
    '</span><span>' + esc(s.rpDate) + '</span></div>';

  $('report').innerHTML = h;
}

// ---------- static text / language ----------
function renderStatic() {
  var s = t();
  document.documentElement.lang = (lang === 'zh') ? 'zh-HK' : 'en';
  document.title = s.title;
  $('lang-en').classList.toggle('active', lang === 'en');
  $('lang-zh').classList.toggle('active', lang === 'zh');
  $('t-home').textContent = s.home;
  $('t-title').textContent = s.title;
  $('t-subtitle').textContent = s.subtitle;
  $('t-s1').textContent = s.s1;
  $('t-name').textContent = s.name; $('t-class').textContent = s.klass; $('t-cno').textContent = s.cno;
  $('t-s2').textContent = s.s2; $('t-s2hint').textContent = s.s2hint;
  $('t-b5label').textContent = s.b5label;
  $('t-s3').textContent = s.s3;
  $('t-s3hint').textContent = s.s3hint;
  $('th-choice').textContent = s.thChoice; $('th-prog').textContent = s.thProg;
  $('th-intake').textContent = s.thIntake;
  $('th-score').textContent = s.thScore; $('th-pos').textContent = s.thPos;
  $('th-remark').textContent = s.thRemark;
  $('t-s4').textContent = s.s4;
  $('t-s5').textContent = s.s5;
  $('btn-pdf').textContent = s.btnPdf; $('btn-csv').textContent = s.btnCsv;
  $('btn-print').textContent = s.btnPrint; $('btn-clear').textContent = s.btnClear;
  $('lbl-import').textContent = s.btnImport;
  $('lbl-remember').textContent = s.rememberLbl;
  $('shared-note').textContent = s.sharedNote;
  $('t-footer').textContent = s.footer;
}

function buildUI() {
  renderStatic();
  $('in-name').value = state.name;
  $('in-class').value = state.klass;
  $('in-cno').value = state.cno;
  $('in-remember').checked = state.remember;
  buildScores();
  buildTable();
  updateBest5();
  updateSummary();
}

function wireEvents() {
  $('lang-en').addEventListener('click', function () { lang = 'en'; localStorage.setItem('clp_lang', lang); buildUI(); });
  $('lang-zh').addEventListener('click', function () { lang = 'zh'; localStorage.setItem('clp_lang', lang); buildUI(); });
  $('in-name').addEventListener('input', function () { state.name = $('in-name').value; save(); });
  $('in-class').addEventListener('input', function () { state.klass = $('in-class').value; save(); });
  $('in-cno').addEventListener('input', function () { state.cno = $('in-cno').value; save(); });
  $('in-remember').addEventListener('change', function () { state.remember = $('in-remember').checked; save(); });
  $('btn-pdf').addEventListener('click', exportPdf);
  $('btn-csv').addEventListener('click', exportCSV);
  $('btn-print').addEventListener('click', function () { buildReport(); window.print(); });
  $('in-import').addEventListener('change', function () {
    importPdf($('in-import').files[0]);
    $('in-import').value = '';
  });
  $('btn-clear').addEventListener('click', function () {
    if (!confirm(t().confirmClear)) return;
    var rem = state.remember;
    state = blankState(); state.remember = rem;
    localStorage.removeItem(LS);
    buildUI();
  });
}

// ---------- encryption gate (same contract as jupas-tool.js) ----------
var PBKDF2_ITER = 150000, GATE_LS = 'jupas_pass', encBlob = null;

function b64ToBytes(b64) { return Uint8Array.from(atob(b64), function (c) { return c.charCodeAt(0); }); }

function deriveKey(passcode, salt) {
  return crypto.subtle.importKey('raw', new TextEncoder().encode(passcode), 'PBKDF2', false, ['deriveKey'])
    .then(function (base) {
      return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: salt, iterations: PBKDF2_ITER, hash: 'SHA-256' },
        base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    });
}

function decryptCSV(passcode) {
  return deriveKey(passcode, b64ToBytes(encBlob.salt)).then(function (key) {
    return crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64ToBytes(encBlob.iv) }, key, b64ToBytes(encBlob.data));
  }).then(function (plain) { return new TextDecoder().decode(plain); });
}

// minimal CSV parser (same as jupas-tool.js — handles quoted fields with commas)
function parseCSV(text) {
  var rows = [], row = [], field = '', inQuotes = false;
  for (var i = 0; i < text.length; i++) {
    var c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') { inQuotes = false; }
      else { field += c; }
    } else {
      if (c === '"') { inQuotes = true; }
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else if (c === '\r') { /* ignore */ }
      else { field += c; }
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  var headers = rows.shift().map(function (h) { return h.trim(); });
  return rows.filter(function (r) { return r.length > 1 && r.some(function (x) { return x.trim() !== ''; }); })
    .map(function (r) {
      var o = {};
      headers.forEach(function (h, i2) { o[h] = (r[i2] || '').trim(); });
      return o;
    });
}

function tryUnlock(passcode, remember) {
  return decryptCSV(passcode).then(function (csv) {
    programmes = parseCSV(csv);
    if (remember) { try { localStorage.setItem(GATE_LS, passcode); } catch (e) {} }
    $('lock').style.display = 'none';
    $('app').style.display = '';
    buildUI();
    return true;
  }).catch(function () {
    try { localStorage.removeItem(GATE_LS); } catch (e) {}
    return false;
  });
}

function showLock(msg) {
  $('app').style.display = 'none';
  $('lock').style.display = 'flex';
  $('lock-err').textContent = msg || '';
}

function wireLock() {
  function submit() {
    var pc = $('passcode').value;
    if (!pc) return;
    $('lock-err').textContent = '';
    tryUnlock(pc, true).then(function (ok) {
      if (!ok) {
        $('lock-err').textContent = 'Incorrect passcode  通行碼錯誤';
        $('passcode').value = '';
      }
    });
  }
  $('unlock-btn').addEventListener('click', submit);
  $('passcode').addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });
}

function init() {
  load();
  wireLock();
  wireEvents();
  fetch('programmes.enc.json', { cache: 'no-store' })
    .then(function (r) { return r.json(); })
    .then(function (j) {
      encBlob = j;
      var saved = null;
      try { saved = localStorage.getItem(GATE_LS); } catch (e) {}
      if (saved) return tryUnlock(saved, false).then(function (ok) { if (!ok) showLock(''); });
      showLock('');
    })
    .catch(function () { showLock('Could not load data file.  無法載入資料檔。'); });
}

init();
})();
