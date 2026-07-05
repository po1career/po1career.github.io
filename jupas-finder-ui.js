/* JUPAS Programme Finder+ — UI controller + passcode gate.
   Loads after jupas-engine.js (shared with jupas-evaluator.html), -analytics.js, -core.js.
   Gate mirrors jupas-tool.js (PBKDF2-SHA256 150k + AES-GCM-256) but decrypts a JSON DB.
   Adapted from JUPASCal (MIT, © 2026 JUPASCal). */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var F = window.JUPASFinder;
  var DB = null, results = null, input = null;
  var activeCats = new Set(), activeInsts = new Set();
  var shortlist = [], remember = true;             // ordered JS codes (chronological) = JUPAS A1–E20
  var SL_CAP = 20, GROUP_CAP = 48, SAVE_KEY = 'jupas_finder_state', REM_KEY = 'jupas_finder_remember';
  function resultFor(code) { return results ? results.find(function (r) { return r.prog.jupas_code === code; }) : null; }
  var lang = (function () { try { return localStorage.getItem('clp_lang') === 'zh' ? 'zh' : 'en'; } catch (e) { return 'en'; } })();

  var CATEGORIES = [
    { key: 'Science', en: 'Science', zh: '理學' }, { key: 'Engineering', en: 'Engineering', zh: '工程' },
    { key: 'Computing', en: 'Computing & IT', zh: '計算機及資訊科技' }, { key: 'Business', en: 'Business & Management', zh: '商業及管理' },
    { key: 'Medicine', en: 'Medicine & Dentistry', zh: '醫學及牙醫學' }, { key: 'Health', en: 'Nursing & Allied Health', zh: '護理及專職醫療' },
    { key: 'SocialSciences', en: 'Social Sciences', zh: '社會科學' }, { key: 'Arts', en: 'Arts & Humanities', zh: '文學及人文' },
    { key: 'Education', en: 'Education', zh: '教育' }, { key: 'Law', en: 'Law', zh: '法律' }, { key: 'Design', en: 'Design & Creative Media', zh: '設計及創意媒體' }
  ];
  var ELECTS = ['phys', 'chem', 'bio', 'econ', 'bafs', 'ict', 'geog', 'hist', 'chist', 'chinlit', 'm2'];
  var LEVELS = ['', '5**', '5*', '5', '4', '3', '2', '1', 'U'];
  var CORE_FIELDS = [{ k: 'chi', en: 'Chinese Language', zh: '中國語文' }, { k: 'eng', en: 'English Language', zh: '英國語文' }, { k: 'math', en: 'Mathematics (Compulsory)', zh: '數學（必修）' }];

  // short subject names for the shortlist's requirement text (fallback = full name)
  var SUBJ_SHORT = {
    en: { 'Biology': 'Bio', 'Chemistry': 'Chem', 'Physics': 'Phys', 'Economics': 'Econ', 'Geography': 'Geog', 'History': 'Hist', 'Chinese History': 'Chi Hist', 'Chinese Literature': 'Chi Lit', 'Information and Communication Technology': 'ICT', 'Business, Accounting and Financial Studies': 'BAFS', 'Mathematics Extended Part (Module 1)': 'M1', 'Mathematics Extended Part (Module 2)': 'M2', 'Mathematics (Compulsory Part)': 'Math', 'Chinese Language': 'Chi', 'English Language': 'Eng' },
    zh: { 'Biology': '生物', 'Chemistry': '化學', 'Physics': '物理', 'Economics': '經濟', 'Geography': '地理', 'History': '歷史', 'Chinese History': '中史', 'Chinese Literature': '中國文學', 'Information and Communication Technology': '資訊科技', 'Business, Accounting and Financial Studies': '企會財', 'Mathematics Extended Part (Module 1)': 'M1', 'Mathematics Extended Part (Module 2)': 'M2', 'Mathematics (Compulsory Part)': '數學', 'Chinese Language': '中文', 'English Language': '英文' }
  };
  var NA_TYPE = {
    en: { interview: 'Interview', portfolio: 'Portfolio', audition: 'Audition', 'physical-test': 'Physical test', 'practical-test': 'Practical test', 'written-test': 'Written test', 'aptitude-test': 'Aptitude test', oea: 'OEA' },
    zh: { interview: '面試', portfolio: '作品集', audition: '試演', 'physical-test': '體能測試', 'practical-test': '實務測試', 'written-test': '筆試', 'aptitude-test': '能力測試', oea: 'OEA' }
  };

  var S = {
    en: {
      title: 'JUPAS Programme Finder+', subtitle: 'Discover the JUPAS programmes you can reach and build your own A1–E20 choice list.',
      steps: [
        'Enter your HKDSE grades — 3 cores, Citizenship &amp; Social Development, and your electives.',
        'Pick a score band (≥ UQ / ≥ Median / ≥ LQ) and narrow down by subject area or institution.',
        'Tap ★ to add a programme to your list, then use ▲▼ to arrange your A1–E20 order.',
        'Save your list as a 2-page PDF to bring to your teacher.'
      ],
      s1: '1 · Your details & HKDSE grades', cs: 'Citizenship & Social Development', att: 'Attained', notatt: 'Not attained',
      electhint: 'Choose 2–4 elective subjects and your level for each.', find: 'Find programmes', pickSubj: '— subject —', lv: 'Level',
      s3: '2 · Narrow it down', search: 'Search programmes, keywords, or JS code…',
      catlab: 'Subject area', instlab: 'Institution', sortlab: 'Show:',
      bkUq: 'At or above UQ', bkMedian: 'At or above median', bkLq: 'At or above LQ', bkBelowlq: 'Below LQ',
      bkHint: {
        uq: 'Programmes where your score reaches the upper quartile (UQ) of last year\'s intake — the strongest band you clear. UQ is estimated where a university doesn\'t publish one.',
        median: 'Programmes where your score is at or above the median but below the upper quartile.',
        lq: 'Programmes where your score is at or above the lower quartile but below the median.',
        belowlq: 'Programmes you\'re eligible for but where your score is below the lower quartile — a reach. In your list these show red for a top choice.'
      },
      lic: 'Licensed professions only', clear: 'Clear filters',
      s5: 'Programmes you can reach', need2: 'Enter your 3 core grades and at least 2 electives, then press “Find programmes”.',
      heroDisc: 'For reference only. Always verify with the official JUPAS website (www.jupas.edu.hk) and each university’s own website. This tool bears no responsibility for any admission decision.',
      lock: 'Enter passcode', locksub: 'For PLK No.1 students only',
      unlockBtn: 'Unlock', pcPh: 'Passcode', lockErr: 'Incorrect passcode', loadErr: 'Could not load data file.',
      count: function (n) { return n + ' programme' + (n === 1 ? '' : 's') + ' shown'; },
      yourScore: 'Your score', med: 'median', lq: 'LQ', applicants: 'applicants/place', bandA: 'Band-A offers', quota: 'quota',
      whatif: 'What would help', elig: 'Requirements', eligOk: 'You meet all minimum requirements.', details: 'Details', hide: 'Hide', official: 'Official page ↗',
      noneFit: 'No programmes in this band match your filters. Try another band above, clearing a filter, or adding electives.',
      remember: 'Save my grades on this computer', sharednote: 'On a shared or school computer, untick the box — your grades then stay only in this tab.',
      shortlist: '⭐ My JUPAS choice list', pdfBtn: '💾 Save as PDF',
      slHint: 'Your JUPAS choice list (A1–E20). Programmes are added in the order you star them; use ▲▼ to reorder and ✕ to remove. The colour on “My score” follows the Planner: for each slot it checks whether your score clears that choice’s target (A1 ≥ LQ · A2 ≥ Median · A3 ≥ UQ · A4 onward ≥ UQ+10%).',
      slSlot: 'Choice', slProg: 'Programme', slMy: 'My score', slBand: 'Band', slReq: 'Requirements', slCalc: 'Weighted / calc', slInt: 'Interview', slRefs: '2025 scores',
      bandATip: 'Of 2025 offers, the share that went to students who placed it in Band A.', noBandData: '—',
      slFull: 'Your list is full (20 choices). Remove one to add another.',
      moveUp: 'Move up', moveDown: 'Move down', removeSl: 'Remove from list',
      bandPos: { 'above-uq': '≥ UQ', 'above-median': '≥ Median', 'above-lq': '≥ LQ', 'below-lq': '< LQ', 'no-score': 'No data' },
      nodataSum: function (n) { return '📋 Programmes with no admission statistics (' + n + ')'; },
      nodataHint: 'New or newly-restructured programmes have no past scores to compare against. You can still add them to your list — they show red there, because admission is hard to predict.',
      moreN: function (n) { return '+ ' + n + ' more'; },
      // requirement-text bits (mirror the Planner)
      chi: 'Chinese', eng: 'English', math: 'Maths', csd: 'CSD',
      anyElect: 'any elective', catA: 'any Cat. A elective', of: 'of',
      noneRecord: 'None on record', noData: 'No data',
      timBefore: 'before results', timAfter: 'after results', timBoth: 'before & after results', ifNec: '(if necessary)',
      extraReq: 'plus total ≥ {t} & {n} × {g}',
      aria: { elective: 'Elective subject ', level: 'Level for elective ', sort: 'Category', star: 'Add to your list', starOn: 'Remove from your list', details: 'Toggle details for ' },
      footer: 'Unofficial reference tool for PLK No.1 students — not affiliated with JUPAS. Scores are computed per each programme\'s own formula and are not comparable across institutions; admission statistics are from past intakes and do not guarantee this year\'s results. © 2026 PLK No.1 W.H. Cheung College · Career Team. Includes a third-party scoring engine and database used under licence.'
    },
    zh: {
      title: 'JUPAS 課程搜尋器＋', subtitle: '找出你有機會入讀的聯招課程，並編排你的 A1–E20 志願表。',
      steps: [
        '輸入文憑試成績——三科核心、公民與社會發展科，以及你的選修科。',
        '選擇分數範圍（≥ 上四分位／≥ 中位數／≥ 下四分位），再按學科範疇或院校收窄。',
        '按 ★ 把課程加入志願表，再用 ▲▼ 排成你的 A1–E20 次序。',
        '把志願表儲存為兩頁 PDF，帶給老師參考。'
      ],
      s1: '1 · 你的資料及文憑試成績', cs: '公民與社會發展科', att: '達標', notatt: '未達標',
      electhint: '選擇 2 至 4 個選修科及其等級。', find: '搜尋課程', pickSubj: '— 科目 —', lv: '等級',
      s3: '2 · 收窄範圍', search: '搜尋課程、關鍵字或 JS 編號…',
      catlab: '學科範疇', instlab: '院校', sortlab: '顯示：',
      bkUq: '達到或高於 UQ', bkMedian: '達到或高於中位數', bkLq: '達到或高於下四分位', bkBelowlq: '低於下四分位',
      bkHint: {
        uq: '你的分數達到去年收生上四分位（UQ）的課程——你能達到的最強範圍。院校若沒有公布 UQ，會以估算值比較。',
        median: '你的分數達到或高於中位數、但低於上四分位的課程。',
        lq: '你的分數達到或高於下四分位、但低於中位數的課程。',
        belowlq: '你符合資格、但分數低於下四分位的課程——屬挑戰之選。放在志願表前列時會顯示紅色。'
      },
      lic: '只顯示專業資格課程', clear: '清除篩選',
      s5: '你有機會入讀的課程', need2: '輸入三科核心成績及至少兩科選修，然後按「搜尋課程」。',
      heroDisc: '僅供參考。報讀前請以 JUPAS 官方網站（www.jupas.edu.hk）及各大學網站為準。本工具概不就任何收生決定承擔責任。',
      lock: '請輸入通行碼', locksub: '只供保良局第一張永慶中學學生使用',
      unlockBtn: '解鎖', pcPh: '通行碼', lockErr: '通行碼錯誤', loadErr: '無法載入資料檔。',
      count: function (n) { return '顯示 ' + n + ' 個課程'; },
      yourScore: '你的分數', med: '中位數', lq: '下四分位', applicants: '人爭一位', bandA: 'Band A 取錄', quota: '學額',
      whatif: '如何提升', elig: '入學要求', eligOk: '你已符合所有最低要求。', details: '詳情', hide: '收起', official: '官方網頁 ↗',
      noneFit: '此範圍沒有符合篩選的課程。可試試上一個範圍、清除篩選，或加選修科。',
      remember: '在此電腦儲存我的成績', sharednote: '如使用共用或學校電腦，請取消勾選，成績只會留在此分頁。',
      shortlist: '⭐ 我的聯招志願表', pdfBtn: '💾 儲存為 PDF',
      slHint: '你的聯招志願表（A1–E20）。課程按你加入的次序排列；用 ▲▼ 調整次序，✕ 移除。「我的分數」的顏色與放榜行動計劃一致：按志願位置判斷你的分數是否達到該志願的目標（A1 ≥ 下四分位 · A2 ≥ 中位數 · A3 ≥ 上四分位 · 第 4 志願起 ≥ 上四分位＋10%）。',
      slSlot: '志願', slProg: '課程', slMy: '我的分數', slBand: 'Band', slReq: '入學要求', slCalc: '計分方法', slInt: '面試', slRefs: '2025 收生分數',
      bandATip: '2025 年取錄中，將此課程放於 Band A 的學生所佔比例。', noBandData: '—',
      slFull: '志願表已滿（20 個）。請先移除一個再加入其他課程。',
      moveUp: '上移', moveDown: '下移', removeSl: '從志願表移除',
      bandPos: { 'above-uq': '≥ 上四分位', 'above-median': '≥ 中位數', 'above-lq': '≥ 下四分位', 'below-lq': '< 下四分位', 'no-score': '沒有數據' },
      nodataSum: function (n) { return '📋 沒有收生分數的課程（' + n + '）'; },
      nodataHint: '新開辦或重組的課程沒有往年收生分數可比較。你仍可加入志願表——在志願表中會顯示紅色，因為收生結果難以預測。',
      moreN: function (n) { return '再顯示 ' + n + ' 個'; },
      chi: '中文', eng: '英文', math: '數學', csd: '公社',
      anyElect: '任何選修', catA: '任何甲類選修', of: '其中',
      noneRecord: '沒有紀錄', noData: '沒有數據',
      timBefore: '放榜前', timAfter: '放榜後', timBoth: '放榜前後', ifNec: '（如有需要）',
      extraReq: '另需總分 ≥ {t} 及 {n} 科 {g}',
      aria: { elective: '選修科 ', level: '選修科等級 ', sort: '類別', star: '加入你的志願表', starOn: '從你的志願表移除', details: '顯示／收起詳情：' },
      footer: '本工具只供保良局第一張永慶中學學生參考，並非 JUPAS 官方工具。分數按各課程自己的公式計算，不可跨院校比較；收生統計為過往年度數據，不代表本年度結果。© 2026 保良局第一張永慶中學・升學輔導及生涯規劃組。當中包含第三方計分引擎及資料庫，並依授權條款使用。'
    }
  };
  function t() { return S[lang]; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function str(v, n) { return String(v == null ? '' : v).slice(0, n || 60); }
  function fmt(x) { if (x == null || isNaN(x)) return '—'; return String(Math.round(x * 100) / 100); }
  function catLabel(key) { var c = CATEGORIES.find(function (x) { return x.key === key; }); return c ? c[lang] : key; }
  // real provider: SSSDP programmes carry an "Offered by X:" prefix (X = HKMU / HSUHK / TWC / …),
  // which is the ACTUAL institution. Everything else is its own institution. Keying the filter on
  // this unifies HKMU — its 21 SSSDP programmes + 28 regular ones — under ONE chip, and gives every
  // self-funded provider its own chip (2026-07-05; the old raw `institution` lumped 8 into "SSSDP").
  var OFFERED_RE = /^\s*(?:Offered by [^:]+:|由[^：]+開辦：)\s*/;
  function provider(p) {
    if (p.institution !== 'SSSDP') return p.institution;
    var m = /Offered by ([^:]+):/.exec(p.name_en || '');
    return m ? m[1].trim() : 'SSSDP';
  }
  function providerLabel(p) { return lang === 'zh' ? (p.institution_zh || provider(p)) : provider(p); }
  function pName(p) { var n = lang === 'zh' ? (p.name_zh || p.name_en) : p.name_en; return String(n || '').replace(OFFERED_RE, ''); }
  function pInst(p) { return providerLabel(p); }
  function electLabel(k) { return lang === 'zh' ? (F.ELECT_LABEL_ZH[k] || k) : (F.ELECT_LABEL[k] || k); }
  function subjKeyLabel(key, fallback) {
    var c = CORE_FIELDS.find(function (x) { return x.k === key; });
    if (c) return c[lang];
    if (key && (F.ELECT_LABEL[key] || F.ELECT_LABEL_ZH[key])) return electLabel(key);
    return fallback;
  }
  function subjShort(name) { return (SUBJ_SHORT[lang] && SUBJ_SHORT[lang][name]) || name; }

  /* ---------- grade inputs ---------- */
  function lvOptions(sel, val) {
    return LEVELS.map(function (l) { return '<option value="' + l + '"' + (l === val ? ' selected' : '') + '>' + (l || t().lv) + '</option>'; }).join('');
  }
  function buildCores() {
    $('cores').innerHTML = CORE_FIELDS.map(function (c) {
      return '<div class="grow"><label>' + esc(c[lang]) + '</label><select class="lv" data-core="' + c.k + '" aria-label="' + esc(c[lang]) + '">' + lvOptions(null, '') + '</select></div>';
    }).join('');
    $('cores').querySelectorAll('select').forEach(function (s) { s.addEventListener('change', onGradeChange); });
  }
  function buildElectives() {
    var rows = '';
    for (var i = 0; i < 4; i++) {
      rows += '<div class="grow"><select class="subj" data-el="' + i + '" aria-label="' + esc(t().aria.elective) + (i + 1) + '"><option value="">' + t().pickSubj + '</option>' +
        ELECTS.map(function (k) { return '<option value="' + k + '">' + esc(electLabel(k)) + '</option>'; }).join('') +
        '</select><select class="lv" data-ellv="' + i + '" aria-label="' + esc(t().aria.level) + (i + 1) + '">' + lvOptions(null, '') + '</select></div>';
    }
    $('electives').innerHTML = rows;
    $('electives').querySelectorAll('select').forEach(function (s) { s.addEventListener('change', onGradeChange); });
  }
  function readInput() {
    var inp = { name: $('in-name').value, klass: $('in-class').value, cno: $('in-cno').value, csAttained: $('cs-att').classList.contains('on'), electives: [] };
    $('cores').querySelectorAll('select').forEach(function (s) { inp[s.getAttribute('data-core')] = s.value; });
    var seen = {};
    for (var i = 0; i < 4; i++) {
      var subj = $('electives').querySelector('[data-el="' + i + '"]').value;
      var lv = $('electives').querySelector('[data-ellv="' + i + '"]').value;
      if (subj && lv && !seen[subj]) { seen[subj] = true; inp.electives.push({ subj: subj, lv: lv }); }
    }
    return inp;
  }
  function inputReady(inp) { return inp.chi && inp.eng && inp.math && inp.electives.length >= 2; }
  function syncElectiveOptions() {
    var sels = $('electives').querySelectorAll('.subj');
    var chosen = Array.prototype.map.call(sels, function (s) { return s.value; });
    sels.forEach(function (sel) {
      sel.querySelectorAll('option').forEach(function (o) {
        o.disabled = !!o.value && o.value !== sel.value && chosen.indexOf(o.value) >= 0;
      });
    });
  }
  function setCs(att) {
    $('cs-att').classList.toggle('on', att); $('cs-not').classList.toggle('on', !att);
    $('cs-att').setAttribute('aria-pressed', String(att)); $('cs-not').setAttribute('aria-pressed', String(!att));
  }
  var onGradeChange = function () {
    syncElectiveOptions();
    saveState();
    if (results) {
      var inp = readInput();
      if (inputReady(inp)) { input = inp; runPipeline(); }
    }
  };

  /* ---------- compute + render ---------- */
  function runPipeline() {
    var grades = F.buildGrades(input);
    results = F.evaluateAll(DB, grades, input.csAttained);
    shortlist = shortlist.filter(function (c) { return !!resultFor(c); });   // drop codes not in DB
    $('results-area').style.display = '';
    renderCatChips(); renderInstChips();
    render();
    renderShortlist();
    saveState();
  }
  function compute() {
    input = readInput();
    if (!inputReady(input)) { $('b5note').textContent = t().need2; return; }
    $('b5note').textContent = '';
    runPipeline();
    $('results-area').scrollIntoView({ behavior: 'smooth' });
  }

  function matchesFilters(r) {
    var p = r.prog;
    if (activeCats.size) { var pc = p.categories || [], ok = false; activeCats.forEach(function (c) { if (pc.indexOf(c) >= 0) ok = true; }); if (!ok) return false; }
    if (activeInsts.size && !activeInsts.has(provider(p))) return false;
    if ($('lic').checked && !p.licensed) return false;
    var q = ($('search').value || '').trim().toLowerCase();
    if (q) { var hay = [p.jupas_code, p.name_en, p.name_zh, provider(p), p.institution_zh, p.tags].join(' ').toLowerCase(); if (hay.indexOf(q) < 0) return false; }
    return true;
  }
  function bucketList(bucket) {
    return results.filter(function (r) { return r.eligible && r.bucket === bucket && matchesFilters(r); })
      .sort(function (a, b) { var pa = a.medPct == null ? -1e9 : a.medPct, pb = b.medPct == null ? -1e9 : b.medPct; return pb - pa; });
  }
  function bucketCounts() {
    var c = { uq: 0, median: 0, lq: 0, belowlq: 0 };
    if (results) results.forEach(function (r) { if (r.eligible && r.bucket && matchesFilters(r)) c[r.bucket]++; });
    return c;
  }

  function renderCatChips() {
    $('chips').innerHTML = CATEGORIES.map(function (c) {
      return '<button class="chip' + (activeCats.has(c.key) ? ' active' : '') + '" data-cat="' + c.key + '">' + esc(c[lang]) + '</button>';
    }).join('');
    $('chips').querySelectorAll('.chip').forEach(function (b) {
      b.addEventListener('click', function () { var k = b.getAttribute('data-cat'); activeCats.has(k) ? activeCats.delete(k) : activeCats.add(k); renderCatChips(); render(); });
    });
  }
  function renderInstChips() {
    // key by real provider; label with the active language's provider name
    var set = {}; DB.forEach(function (p) { set[provider(p)] = providerLabel(p); });
    var keys = Object.keys(set).sort();
    $('inst-chips').innerHTML = keys.map(function (k) {
      return '<button class="chip' + (activeInsts.has(k) ? ' active' : '') + '" data-inst="' + esc(k) + '">' + esc(set[k]) + '</button>';
    }).join('');
    $('inst-chips').querySelectorAll('.chip').forEach(function (b) {
      b.addEventListener('click', function () { var k = b.getAttribute('data-inst'); activeInsts.has(k) ? activeInsts.delete(k) : activeInsts.add(k); renderInstChips(); render(); });
    });
  }
  function updateBucketOptions() {
    var c = bucketCounts(), s = t();
    $('t-bk-uq').textContent = s.bkUq + ' (' + c.uq + ')';
    $('t-bk-median').textContent = s.bkMedian + ' (' + c.median + ')';
    $('t-bk-lq').textContent = s.bkLq + ' (' + c.lq + ')';
    $('t-bk-belowlq').textContent = s.bkBelowlq + ' (' + c.belowlq + ')';
    $('t-bkhint').textContent = s.bkHint[$('bucket-sort').value] || '';
  }

  function gapHtml(r) {
    if (r.medPct == null) return '';
    var cls = r.medDelta >= 0 ? 'gap-pos' : 'gap-neg', sign = r.medDelta >= 0 ? '+' : '';
    return ' <span class="' + cls + '">' + sign + r.medDelta.toFixed(1) + ' (' + sign + r.medPct.toFixed(0) + '%)</span>';
  }
  function medPctText(r) { return r.medPct != null ? ((r.medDelta >= 0 ? '+' : '') + r.medPct.toFixed(0) + '%') : '—'; }

  function card(r) {
    var p = r.prog, s = t(), code = esc(p.jupas_code);
    var tags = (p.categories || []).map(function (c) { return '<span class="tag">' + esc(catLabel(c)) + '</span>'; }).join('');
    var lic = p.licensed ? '<span class="lic">' + (lang === 'zh' ? '專業資格' : 'Licensed') + '</span>' : '';
    var estim = (r.estimated && r.medScore != null) ? ' <span class="estim">' + (lang === 'zh' ? '估算' : 'est.') + '</span>' : '';
    var scoreLine = '<div class="scoreline">' + esc(s.yourScore) + ' <b>' + r.score + '</b>' +
      (r.medScore != null ? ' · ' + esc(s.med) + ' ' + r.medScore + estim + gapHtml(r) : '') + '</div>';
    var starOn = shortlist.indexOf(p.jupas_code) >= 0;
    var starDisabled = !starOn && shortlist.length >= SL_CAP;
    var tip = starDisabled ? s.slFull : (starOn ? s.aria.starOn : s.aria.star);
    var star = '<button class="iconbtn' + (starOn ? ' on' : '') + '" data-star="' + code + '"' + (starDisabled ? ' disabled' : '') +
      ' data-tip="' + esc(tip) + '" title="' + esc(tip) + '" aria-label="' + esc(starOn ? s.aria.starOn : s.aria.star) + '" aria-pressed="' + starOn + '">★</button>';
    return '<div class="prog" data-code="' + code + '">' +
      '<div class="code-row"><span class="code">' + code + '</span>' + lic + '<span class="card-acts">' + star + '</span></div>' +
      '<div class="pname">' + esc(pName(p)) + '</div><div class="inst">' + esc(pInst(p)) + '</div>' +
      scoreLine + '<div class="tags">' + tags + '</div>' +
      '<button class="det-btn" data-det="' + code + '" aria-expanded="false" aria-label="' + esc(s.aria.details) + code + '">' + esc(s.details) + ' ▾</button>' +
      '<div class="detail"></div></div>';
  }

  // detail card mirrors the choice-list columns (requirements · weighting · interview · 2025
  // scores · Band-A share · quota); the old "what would help" grade-raise tips were removed.
  function detailHtml(r) {
    var p = r.prog, s = t(), h = '';
    var fails = r.eval.eligibility.details.filter(function (d) { return !d.pass; });
    h += '<div class="k">' + esc(s.slReq) + '</div>';
    if (!fails.length) h += '<div>' + esc(reqText(p)) + '</div>';
    else h += fails.map(function (d) {
      var need = d.label === 'CSD' ? (lang === 'zh' ? '達標' : 'Attained') : ('≥ ' + d.need);
      var what = (d.label.indexOf('Elective') === 0) ? (d.note || (lang === 'zh' ? '指定選修科' : 'required elective')) : d.label;
      return '<div class="fail">✗ ' + esc(what) + ' — ' + (lang === 'zh' ? '需要 ' : 'need ') + esc(need) + '</div>';
    }).join('');
    h += '<div class="k">' + esc(s.slCalc) + '</div><div>' + esc(formulaText(p)) + '</div>';
    h += '<div class="k">' + esc(s.slInt) + '</div><div>' + esc(interviewText(p)) + '</div>';
    h += '<div class="k">' + esc(s.slRefs) + '</div><div>' + esc(scoresText(p)) + '</div>';
    h += '<div class="k">' + esc(s.slBand) + '</div><div title="' + esc(s.bandATip) + '">' + esc(bandAText(r)) + (r.bandA ? ' <span class="k2">(' + r.bandA.year + ')</span>' : '') + '</div>';
    h += '<div class="k">' + esc(s.quota) + '</div><div>' + (p.quota != null ? esc(String(p.quota)) : '—') + '</div>';
    if (p.url) h += '<div style="margin-top:8px"><a class="det-btn" href="' + esc(p.url) + '" target="_blank" rel="noopener">' + esc(s.official) + '</a></div>';
    return h;
  }

  // eligible programmes with NO admission statistics — collapsible; addable (forced red in the list)
  function renderNoData() {
    var s = t();
    var list = results.filter(function (r) { return r.eligible && r.noStats && matchesFilters(r); })
      .sort(function (a, b) { return (b.score || 0) - (a.score || 0); });
    if (!list.length) { $('nodata-panel').style.display = 'none'; return; }
    $('nodata-panel').style.display = '';
    $('nodata-sum').textContent = s.nodataSum(list.length);
    $('t-nodata-hint').textContent = s.nodataHint;
    $('nodata-list').innerHTML = list.slice(0, GROUP_CAP).map(card).join('');
  }

  function render() {
    var s = t(); if (!results) return;
    updateBucketOptions();
    renderNoData();
    var list = bucketList($('bucket-sort').value);
    $('count').textContent = s.count(list.length);
    if (!list.length) { $('results').innerHTML = '<div class="empty">' + esc(s.noneFit) + '</div>'; render._list = list; return; }
    var shown = list.slice(0, GROUP_CAP);
    var html = '<div class="grid">' + shown.map(card).join('') + '</div>';
    if (list.length > GROUP_CAP) html += '<div class="showmore"><button class="btn-ghost btn" data-more="1">' + esc(s.moreN(list.length - GROUP_CAP)) + '</button></div>';
    $('results').innerHTML = html;
    render._list = list;
  }
  function expandMore() {
    var grid = $('results').querySelector('.grid');
    if (grid) grid.innerHTML = render._list.map(card).join('');
    var sm = $('results').querySelector('.showmore'); if (sm) sm.remove();
  }

  /* ---------- shortlist: 20-slot A1–E20 table (Planner-style plain details) ---------- */
  // JUPAS official banding: A 1–3, B 4–6, C 7–10, D 11–15, E 16–20
  function bandLabel(i) { var n = i + 1, b = n <= 3 ? 'A' : n <= 6 ? 'B' : n <= 10 ? 'C' : n <= 15 ? 'D' : 'E'; return b + n; }
  function poolText(pool) {
    if (!pool || !pool.subjects || !pool.subjects.length) return '';
    var n = parseInt(pool.count, 10) || 1, g = pool.grade || '', subj;
    if (pool.subjects.length === 1 && pool.subjects[0] === 'Any') subj = (n > 1 ? n + ' × ' : '') + t().anyElect;
    else if (pool.subjects.length === 1 && pool.subjects[0] === 'CategoryA') subj = (n > 1 ? n + ' × ' : '') + t().catA;
    else {
      var list = pool.subjects.map(subjShort).join('/');
      if (pool.subjects.length === 1 && n === 1) subj = list;
      else subj = lang === 'zh' ? list + ' ' + t().of + ' ' + n : n + ' ' + t().of + ' ' + list;
    }
    return subj + (g ? ' @ ' + g : '');
  }
  function reqText(prog) {
    var r = prog.min_requirements_2026 || {}, parts = [];
    if (r.chi) parts.push(t().chi + ' ' + r.chi);
    if (r.eng) parts.push(t().eng + ' ' + r.eng);
    if (r.math) parts.push(t().math + ' ' + r.math);
    if (r.csd) parts.push(t().csd + ' ' + t().att);
    var p1 = poolText(r.elect1), p2 = poolText(r.elect2);
    if (p1) parts.push(p1);
    if (p2) parts.push(p2);
    var x = prog.extra_eligibility;
    if (x && (x.min_total || x.min_top_grade_count)) parts.push(t().extraReq.replace('{t}', x.min_total || '?').replace('{n}', x.min_top_grade_count || '?').replace('{g}', x.top_grade || ''));
    return parts.length ? parts.join(' · ') : '—';
  }
  function formulaText(prog) { return prog.formula_2026 || prog.formula_2025 || '—'; }
  function interviewText(prog) {
    var arr = prog.non_academic || [];
    if (!arr.length) return t().noneRecord;
    return arr.map(function (it) {
      var name = (NA_TYPE[lang][it.type]) || it.type || '';
      var tim = it.timing === 'both' ? t().timBoth : it.timing === 'before' ? t().timBefore : it.timing === 'after' ? t().timAfter : '';
      var nec = ((it.when || '') + (it.before || '') + (it.after || '')).toLowerCase().indexOf('necessary') >= 0 ? ' ' + t().ifNec : '';
      return name + (tim ? ' · ' + tim : '') + nec;
    }).join('; ');
  }
  function scoresText(prog) {
    var o = prog.scores_2025 || {}, parts = [];
    if (o.uq != null) parts.push('U' + fmt(+o.uq));
    if (o.median != null) parts.push('M' + fmt(+o.median));
    if (o.lq != null) parts.push('L' + fmt(+o.lq));
    if (o.median == null && o.mean != null) parts.push((lang === 'zh' ? '平均 ' : 'Mean ') + fmt(+o.mean));
    if (o.median == null && o.mean == null && o.expected_score != null) parts.push((lang === 'zh' ? '預估 ' : 'Expected ') + fmt(+o.expected_score));
    return parts.length ? '2025: ' + parts.join(' · ') : t().noData;
  }
  // My-score pill: TEXT = quartile position of the score (fixed per programme); COLOUR = the
  // Planner-synced slot-differential tag (varies with the slot: stricter deeper in the list).
  function qpPill(r, slotIdx) {
    var cls = F.slotTag(r.eval, r.prog, slotIdx);          // 'good' | 'mid' | 'bad'
    var lab = t().bandPos[r.eval.band] || r.eval.band;
    return '<span class="qp ' + cls + '">' + esc(lab) + '</span>';
  }
  // JUPAS banding by 0-based slot index: A 1–3 · B 4–6 · C 7–10 · D 11–15 · E 16–20
  function bandOfIdx(i) { var n = i + 1; return n <= 3 ? 'a' : n <= 6 ? 'b' : n <= 10 ? 'c' : n <= 15 ? 'd' : 'e'; }
  var BAND_NAMES = { a: 'Band A · Choices 1–3', b: 'Band B · Choices 4–6', c: 'Band C · Choices 7–10', d: 'Band D · Choices 11–15', e: 'Band E · Choices 16–20' };
  var BAND_FIRST = { 0: 'a', 3: 'b', 6: 'c', 10: 'd', 15: 'e' };   // slot index that opens each band
  function bandAText(r) { return r.bandA ? 'A ' + Math.round(r.bandA.share * 100) + '%' : t().noBandData; }
  function slAdd(code) { if (shortlist.indexOf(code) >= 0 || shortlist.length >= SL_CAP) return; shortlist.push(code); }
  function slRemove(code) { var i = shortlist.indexOf(code); if (i >= 0) shortlist.splice(i, 1); }
  function slMove(code, dir) {
    var i = shortlist.indexOf(code); if (i < 0) return;
    var j = dir === 'up' ? i - 1 : i + 1; if (j < 0 || j >= shortlist.length) return;
    var tmp = shortlist[i]; shortlist[i] = shortlist[j]; shortlist[j] = tmp;
  }
  // drag-drop reorder: move `code` to the slot currently occupied by `targetCode` (insert-before)
  function slReorder(code, targetCode) {
    var from = shortlist.indexOf(code); if (from < 0) return;
    shortlist.splice(from, 1);
    var to = shortlist.indexOf(targetCode);
    shortlist.splice(to < 0 ? shortlist.length : to, 0, code);
  }
  var dragCode = null;
  function wireDrag() {
    var rows = $('slist').querySelectorAll('tr.sl-row');
    rows.forEach(function (tr) {
      tr.addEventListener('dragstart', function (e) { dragCode = tr.getAttribute('data-code'); tr.classList.add('dragging'); try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', dragCode); } catch (x) {} });
      tr.addEventListener('dragend', function () { tr.classList.remove('dragging'); rows.forEach(function (r) { r.classList.remove('dragover'); }); dragCode = null; });
      tr.addEventListener('dragover', function (e) { if (dragCode == null) return; e.preventDefault(); try { e.dataTransfer.dropEffect = 'move'; } catch (x) {} tr.classList.add('dragover'); });
      tr.addEventListener('dragleave', function () { tr.classList.remove('dragover'); });
      tr.addEventListener('drop', function (e) {
        e.preventDefault(); tr.classList.remove('dragover');
        var to = tr.getAttribute('data-code');
        if (dragCode && to && dragCode !== to) { slReorder(dragCode, to); saveState(); refreshAll(); }
      });
    });
  }
  function renderShortlist() {
    var s = t();
    if (!shortlist.length) { $('shortlist-panel').style.display = 'none'; return; }
    $('shortlist-panel').style.display = '';
    $('t-slhint').textContent = s.slHint;
    var NCOLS = 10;
    var head = '<tr><th></th><th>' + esc(s.slSlot) + '</th><th>' + esc(s.slProg) + '</th><th>' + esc(s.slMy) + '</th><th title="' + esc(s.bandATip) + '">' + esc(s.slBand) + '</th><th>' + esc(s.slReq) + '</th><th>' + esc(s.slCalc) + '</th><th>' + esc(s.slInt) + '</th><th>' + esc(s.slRefs) + '</th><th>' + esc(s.quota) + '</th></tr>';
    var body = '';
    shortlist.forEach(function (code, i) {
      var band = bandOfIdx(i);
      if (BAND_FIRST[i]) body += '<tr class="band-sep band-' + band + '"><td colspan="' + NCOLS + '">' + esc(BAND_NAMES[band]) + '</td></tr>';
      var r = resultFor(code); if (!r) return;
      var p = r.prog, up = i > 0, down = i < shortlist.length - 1;
      var ctl = '<span class="drag" title="' + esc(s.moveUp + ' / ' + s.moveDown) + '" aria-hidden="true">⠿</span> ' +
        '<button class="mv" data-slmv="up" data-code="' + esc(code) + '"' + (up ? '' : ' disabled') + ' aria-label="' + esc(s.moveUp) + '">▲</button> ' +
        '<button class="mv" data-slmv="down" data-code="' + esc(code) + '"' + (down ? '' : ' disabled') + ' aria-label="' + esc(s.moveDown) + '">▼</button> ' +
        '<button class="mv rm" data-slrm="' + esc(code) + '" aria-label="' + esc(s.removeSl) + '">✕</button>';
      var my = r.score + ' ' + qpPill(r, i) + (r.medScore != null ? ' <span class="k2">(' + esc(s.med) + ' ' + medPctText(r) + ')</span>' : '');
      body += '<tr class="sl-row band-' + band + '" draggable="true" data-code="' + esc(code) + '">' +
        '<td class="ctl">' + ctl + '</td>' +
        '<td class="slot"><span class="sl-badge">' + bandLabel(i) + '</span></td>' +
        '<td class="prog-cell"><b>' + esc(p.jupas_code) + '</b> ' + esc(pName(p)) + '<br><span class="k2">' + esc(pInst(p)) + '</span></td>' +
        '<td>' + my + '</td>' +
        '<td title="' + esc(s.bandATip) + '">' + esc(bandAText(r)) + '</td>' +
        '<td>' + esc(reqText(p)) + '</td>' +
        '<td>' + esc(str(formulaText(p), 140)) + '</td>' +
        '<td>' + esc(interviewText(p)) + '</td>' +
        '<td>' + esc(scoresText(p)) + '</td>' +
        '<td>' + (p.quota != null ? esc(String(p.quota)) : '—') + '</td></tr>';
    });
    $('slist').innerHTML = head + body;
    wireDrag();
    var note = $('sl-note');
    if (shortlist.length >= SL_CAP) { note.style.display = ''; note.textContent = s.slFull; } else { note.style.display = 'none'; }
  }

  /* ---------- one-click 2-page A4 PDF (hand-built, standard Helvetica; English content) ---------- */
  // No third-party PDF library is possible under this page's CSP, so the PDF is built by hand
  // exactly like the Planner's exporter; content is ASCII/English regardless of the UI language.
  var PDF_UNI = { '’': "'", '‘': "'", '“': '"', '”': '"', '–': '-', '—': '-', '·': '|', '≥': '>=', '≤': '<=', '×': 'x', '✓': 'Y', '✗': 'N', '，': ', ', '、': ', ', '。': '. ' };
  function pdfAscii(s) { return String(s == null ? '' : s).replace(/[^\x20-\x7E]/g, function (c) { return PDF_UNI[c] != null ? PDF_UNI[c] : '?'; }).replace(/\?{2,}/g, '?').replace(/ {2,}/g, ' '); }
  function pdfEsc(s) { return pdfAscii(s).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)'); }
  function pdfTrunc(s, n) { s = pdfAscii(s); return s.length > n ? s.slice(0, n - 3) + '...' : s; }
  function pdfWrap(s, n) { s = pdfAscii(s); var out = []; while (s.length > n) { var cut = s.lastIndexOf(' ', n); if (cut < n * 0.5) cut = n; out.push(s.slice(0, cut)); s = s.slice(cut).replace(/^ +/, ''); } if (s) out.push(s); return out; }
  function PdfPage() { this.ops = []; }
  PdfPage.prototype.text = function (x, y, size, s, bold) { this.ops.push('BT /F' + (bold ? 2 : 1) + ' ' + size + ' Tf ' + x.toFixed(2) + ' ' + y.toFixed(2) + ' Td (' + pdfEsc(s) + ') Tj ET'); };
  PdfPage.prototype.line = function (x1, y1, x2, y2, w, gray) { this.ops.push((gray != null ? gray : 0.62) + ' G ' + (w || 0.5) + ' w ' + x1.toFixed(2) + ' ' + y1.toFixed(2) + ' m ' + x2.toFixed(2) + ' ' + y2.toFixed(2) + ' l S'); };
  function pdfBuild(pages) {
    var N = pages.length, objs = [];
    objs[1] = '<< /Type /Catalog /Pages 2 0 R >>';
    var kids = []; for (var i = 0; i < N; i++) kids.push((3 + i) + ' 0 R');
    objs[2] = '<< /Type /Pages /Kids [' + kids.join(' ') + '] /Count ' + N + ' >>';
    var fontA = 3 + 2 * N, fontB = 4 + 2 * N;
    pages.forEach(function (pg, k) {
      objs[3 + k] = '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /Font << /F1 ' + fontA + ' 0 R /F2 ' + fontB + ' 0 R >> >> /Contents ' + (3 + N + k) + ' 0 R >>';
      var st = pg.ops.join('\n');
      objs[3 + N + k] = '<< /Length ' + st.length + ' >>\nstream\n' + st + '\nendstream';
    });
    objs[fontA] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
    objs[fontB] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';
    var out = '%PDF-1.4\n', offs = [];
    for (var n = 1; n < objs.length; n++) { offs[n] = out.length; out += n + ' 0 obj\n' + objs[n] + '\nendobj\n'; }
    var xref = out.length;
    out += 'xref\n0 ' + objs.length + '\n0000000000 65535 f \n';
    for (n = 1; n < objs.length; n++) out += ('0000000000' + offs[n]).slice(-10) + ' 00000 n \n';
    out += 'trailer\n<< /Size ' + objs.length + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF';
    return out;
  }
  function pdfGradesLine() {
    var parts = [];
    if (input.chi) parts.push('Chinese ' + input.chi);
    if (input.eng) parts.push('English ' + input.eng);
    if (input.math) parts.push('Mathematics ' + input.math);
    parts.push('CSD: ' + (input.csAttained ? 'Attained' : 'Not attained'));
    (input.electives || []).forEach(function (e) { parts.push(pdfAscii(F.ELECT_LABEL[e.subj] || e.subj) + ' ' + e.lv); });
    return 'Grades: ' + parts.join(' | ');
  }
  function pdfRefs(prog) {
    var o = prog.scores_2025 || {}, parts = [];
    if (o.uq != null) parts.push('U' + fmt(+o.uq));
    if (o.median != null) parts.push('M' + fmt(+o.median));
    if (o.lq != null) parts.push('L' + fmt(+o.lq));
    if (o.median == null && o.mean != null) parts.push('Mean ' + fmt(+o.mean));
    if (o.median == null && o.mean == null && o.expected_score != null) parts.push('Exp ' + fmt(+o.expected_score));
    return parts.length ? parts.join(' ') : 'no data';
  }
  var PDF_POS = { 'above-uq': '>=UQ', 'above-median': '>=Med', 'above-lq': '>=LQ', 'below-lq': '<LQ', 'no-score': 'no data' };
  // PDF is ALWAYS English (Helvetica can't render CJK — a zh name would become "?"), so use name_en.
  function enName(p) { return String(p.name_en || '').replace(OFFERED_RE, ''); }
  function pdfBandA(r) { return r.bandA ? 'A ' + Math.round(r.bandA.share * 100) + '%' : '-'; }
  function pdfStatus(r, i) { var c = F.slotTag(r.eval, r.prog, i); return c === 'good' ? 'OK' : c === 'mid' ? 'CAUTION' : 'RISK'; }
  var PDF_X = { slot: 40, prog: 64, score: 280, stat: 366, band: 406, refs: 442, quota: 536 };
  function pdfChoiceRow(pg, r, i, y) {
    var X = PDF_X, p = r.prog, star = (p.non_academic || []).length ? ' *' : '';
    pg.text(X.slot, y, 8.5, bandLabel(i), true);
    pg.text(X.prog, y, 8.5, pdfTrunc(p.jupas_code + ' ' + enName(p) + ' (' + provider(p) + ')', 46) + star);
    var med = r.medPct != null ? ' (M' + (r.medDelta >= 0 ? '+' : '') + Math.round(r.medPct) + '%)' : '';
    pg.text(X.score, y, 8.5, r.score + ' ' + (PDF_POS[r.eval.band] || '') + med);
    pg.text(X.stat, y, 8.5, pdfStatus(r, i), true);
    pg.text(X.band, y, 8.5, pdfBandA(r));
    pg.text(X.refs, y, 8.5, pdfTrunc(pdfRefs(p), 16));
    pg.text(X.quota, y, 8.5, p.quota != null ? String(p.quota) : '-');
    pg.line(40, y - 3.5, 555, y - 3.5, 0.4, 0.82);
    return y - 13;
  }
  function pdfHeaderRow(pg, y) {
    var X = PDF_X;
    pg.text(X.slot, y, 7.5, 'Ch', true); pg.text(X.prog, y, 7.5, 'Programme', true);
    pg.text(X.score, y, 7.5, 'My score', true); pg.text(X.stat, y, 7.5, 'Status', true);
    pg.text(X.band, y, 7.5, 'Band A', true); pg.text(X.refs, y, 7.5, '2025 refs', true); pg.text(X.quota, y, 7.5, 'Quota', true);
    pg.line(40, y - 4, 555, y - 4, 0.7, 0.3);
    return y - 15;
  }
  function buildPdfBytes() {
    var M = 40, rows = shortlist.map(function (c) { return resultFor(c); }).filter(Boolean);
    var p1 = new PdfPage(), p2 = new PdfPage();
    // ---- page 1 ----
    var y = 800;
    p1.text(M, y, 15, 'JUPAS Choice List (A1-E20)', true); y -= 15;
    p1.text(M, y, 9, 'Name: ' + (pdfAscii(input.name) || '-') + '    Class: ' + (pdfAscii(input.klass) || '-') + '    Class no.: ' + (pdfAscii(input.cno) || '-') +
      '    Generated: ' + new Date().toLocaleDateString('en-GB') + '    Page 1 of 2'); y -= 7;
    p1.line(M, y, 555, y, 1, 0.2); y -= 14;
    pdfWrap(pdfGradesLine(), 118).slice(0, 2).forEach(function (ln) { p1.text(M, y, 8.5, ln); y -= 11; });
    y -= 4;
    y = pdfHeaderRow(p1, y);
    rows.slice(0, 12).forEach(function (r, i) { y = pdfChoiceRow(p1, r, i, y); });
    p1.text(M, 40, 7, '* interview / test / portfolio required. Status: OK = clears this choice\'s target | CAUTION = few places / no benchmark | RISK = below target or no stats.');
    // ---- page 2 ----
    y = 800;
    p2.text(M, y, 9, 'JUPAS Choice List - ' + (pdfAscii(input.name) || '-') + ' (' + (pdfAscii(input.klass) || '-') + ')    Page 2 of 2'); y -= 7;
    p2.line(M, y, 555, y, 1, 0.2); y -= 16;
    if (rows.length > 12) {
      y = pdfHeaderRow(p2, y);
      rows.slice(12).forEach(function (r, i) { y = pdfChoiceRow(p2, r, i + 12, y); });
      y -= 8;
    }
    p2.text(M, y, 11, 'Choice targets by slot', true); y -= 13;
    ['A1 = at or above the Lower Quartile (LQ)', 'A2 = at or above the Median', 'A3 = at or above the Upper Quartile (UQ)',
     'A4 onward (B/C/D/E) = at or above UQ + 10%', 'Programmes with no statistics are always shown RISK (admission is hard to predict).']
      .forEach(function (ln) { p2.text(M, y, 8.5, '- ' + ln); y -= 11; });
    y -= 8;
    pdfWrap('Unofficial reference tool for PLK No.1 students - not affiliated with JUPAS. Scores are computed per each programme\'s own formula and are not comparable across institutions; admission statistics are from past intakes and do not guarantee this year\'s results - always verify on www.jupas.edu.hk and each university\'s website. (c) 2026 PLK No.1 W.H. Cheung College | Career Team. Includes a third-party scoring engine and database used under licence.', 128)
      .forEach(function (ln) { p2.text(M, y, 6.5, ln); y -= 8.5; });
    // Append the evaluator-readable JCDATA payload (same marker the student Choices page uses):
    // jupas-evaluator.html scans the raw PDF bytes for /JCDATA:([A-Za-z0-9+/=]+)/ then
    // JSON.parse(decodeURIComponent(escape(atob(b64)))). It recomputes each choice from code+grades.
    return pdfBuild([p1, p2]) + '\n%JCDATA:' + jcdataB64() + ':END\n';
  }
  // payload matching what jupas-evaluator.html reads (name/klass/cno/core/elect/choices).
  // The elective keys (e.subj) are the engine's ELECT_CANON keys, identical to the evaluator's.
  function jcdataPayload() {
    return {
      name: input.name || '', klass: input.klass || '', cno: input.cno || '',
      generated: new Date().toISOString().slice(0, 10),
      core: { chi: input.chi || '', eng: input.eng || '', math: input.math || '', csd: input.csAttained ? 'attained' : 'notattained' },
      elect: (input.electives || []).map(function (e) { return { s: e.subj, lv: e.lv }; }),
      choices: shortlist.map(function (code) { return { code: code, intake: '', score: '', cmp: '', remark: '' }; })
    };
  }
  function jcdataB64() { return btoa(unescape(encodeURIComponent(JSON.stringify(jcdataPayload())))); }
  function downloadPdf() {
    if (!shortlist.length) return;
    var blob = new Blob([buildPdfBytes()], { type: 'application/pdf' });
    var a = document.createElement('a');
    var who = pdfAscii(input.name).replace(/[^A-Za-z0-9-]+/g, '_').replace(/^_+|_+$/g, '');
    a.href = URL.createObjectURL(blob);
    a.download = 'JUPAS-Choice-List' + (who ? '-' + who : '') + '.pdf';
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  /* ---------- persistence ---------- */
  function saveState() {
    try {
      localStorage.setItem(REM_KEY, remember ? '1' : '0');
      if (!remember) { localStorage.removeItem(SAVE_KEY); return; }
      localStorage.setItem(SAVE_KEY, JSON.stringify({ input: readInput(), shortlist: shortlist.slice() }));
    } catch (e) {}
  }
  function applyInputToUI(inp) {
    if (!inp) return;
    $('in-name').value = inp.name || ''; $('in-class').value = inp.klass || ''; $('in-cno').value = inp.cno || '';
    setCs(inp.csAttained !== false);
    $('cores').querySelectorAll('select').forEach(function (sel) { sel.value = inp[sel.getAttribute('data-core')] || ''; });
    for (var i = 0; i < 4; i++) {
      var e = (inp.electives || [])[i] || {};
      var subj = $('electives').querySelector('[data-el="' + i + '"]'), lv = $('electives').querySelector('[data-ellv="' + i + '"]');
      if (subj) subj.value = e.subj || ''; if (lv) lv.value = e.lv || '';
    }
    syncElectiveOptions();
  }
  function restoreState() {
    try {
      remember = localStorage.getItem(REM_KEY) !== '0'; $('remember').checked = remember;
      var raw = localStorage.getItem(SAVE_KEY); if (!raw) return false;
      var st = JSON.parse(raw);
      var codes = {}; (DB || []).forEach(function (p) { codes[p.jupas_code] = 1; });
      shortlist = (Array.isArray(st.shortlist) ? st.shortlist : []).filter(function (c) { return codes[c]; }).slice(0, SL_CAP);
      applyInputToUI(st.input); return !!(st.input && inputReady(st.input));
    } catch (e) { return false; }
  }

  function toggleDetail(b) {
    var code = b.getAttribute('data-det');
    var cardEl = b.closest ? b.closest('.prog') : null;
    var panel = cardEl && cardEl.querySelector('.detail');
    if (!panel) return;
    if (panel.classList.contains('open')) { panel.classList.remove('open'); panel.innerHTML = ''; b.textContent = t().details + ' ▾'; b.setAttribute('aria-expanded', 'false'); return; }
    panel.innerHTML = detailHtml(resultFor(code)); panel.classList.add('open'); b.textContent = t().hide + ' ▴'; b.setAttribute('aria-expanded', 'true');
  }
  function onAppClick(e) {
    var el = e.target.closest ? e.target.closest('[data-star],[data-det],[data-more],[data-slmv],[data-slrm]') : null;
    if (!el) return;
    if (el.hasAttribute('data-star')) { var c = el.getAttribute('data-star'); if (shortlist.indexOf(c) >= 0) slRemove(c); else slAdd(c); saveState(); refreshAll(); }
    else if (el.hasAttribute('data-det')) toggleDetail(el);
    else if (el.hasAttribute('data-more')) expandMore();
    else if (el.hasAttribute('data-slmv')) { slMove(el.getAttribute('data-code'), el.getAttribute('data-slmv')); saveState(); renderShortlist(); }
    else if (el.hasAttribute('data-slrm')) { slRemove(el.getAttribute('data-slrm')); saveState(); refreshAll(); }
  }
  function refreshAll() { render(); renderShortlist(); }

  /* ---------- static text / language ---------- */
  function applyStatic() {
    var s = t();
    document.documentElement.lang = lang === 'zh' ? 'zh-HK' : 'en';
    $('lang-en').classList.toggle('active', lang === 'en'); $('lang-zh').classList.toggle('active', lang === 'zh');
    $('lang-en').setAttribute('aria-pressed', String(lang === 'en')); $('lang-zh').setAttribute('aria-pressed', String(lang === 'zh'));
    var map = { 't-title': s.title, 't-subtitle': s.subtitle, 't-s1': s.s1, 't-cs': s.cs,
      't-electhint': s.electhint, 'find-btn': s.find, 't-s3': s.s3, 't-s5': s.s5,
      't-catlab': s.catlab, 't-instlab': s.instlab, 't-sortlab': s.sortlab,
      't-bk-uq': s.bkUq, 't-bk-median': s.bkMedian, 't-bk-lq': s.bkLq, 't-bk-belowlq': s.bkBelowlq,
      't-lic': s.lic, 'clear-btn': s.clear, 'cs-att': s.att, 'cs-not': s.notatt,
      't-remember': s.remember, 't-sharednote': s.sharednote, 't-shortlist': s.shortlist, 'pdf-btn': s.pdfBtn,
      't-slhint': s.slHint, 't-herodisc': s.heroDisc,
      't-lock': s.lock, 't-locksub': s.locksub, 'unlock-btn': s.unlockBtn };
    Object.keys(map).forEach(function (id) { var el = $(id); if (el) el.textContent = map[id]; });
    var hs = $('hero-steps'); if (hs) hs.innerHTML = (s.steps || []).map(function (x) { return '<li>' + x + '</li>'; }).join('');
    $('search').placeholder = s.search; $('in-name').placeholder = lang === 'zh' ? '姓名（可選）' : 'Name (optional)'; $('in-class').placeholder = lang === 'zh' ? '班別' : 'Class';
    $('in-cno').placeholder = lang === 'zh' ? '學號' : 'Class no.';
    var pc = $('passcode'); if (pc) { pc.placeholder = s.pcPh; pc.setAttribute('aria-label', s.pcPh); }
    $('search').setAttribute('aria-label', s.search);
    $('bucket-sort').setAttribute('aria-label', s.aria.sort);
    if (results) updateBucketOptions(); else $('t-bkhint').textContent = s.bkHint[$('bucket-sort').value] || '';
    var ft = $('t-footer'); if (ft) ft.textContent = s.footer;
    document.title = s.title;
  }
  function setLang(l) {
    lang = l; try { localStorage.setItem('clp_lang', l); } catch (e) {}
    var saved = readInput();
    applyStatic(); buildCores(); buildElectives(); applyInputToUI(saved);
    if (results) { renderCatChips(); renderInstChips(); render(); renderShortlist(); }
  }

  /* ---------- wiring ---------- */
  function wire() {
    $('lang-en').addEventListener('click', function () { setLang('en'); });
    $('lang-zh').addEventListener('click', function () { setLang('zh'); });
    $('cs-att').addEventListener('click', function () { setCs(true); onGradeChange(); });
    $('cs-not').addEventListener('click', function () { setCs(false); onGradeChange(); });
    $('find-btn').addEventListener('click', compute);
    ['search', 'bucket-sort', 'lic'].forEach(function (id) {
      $(id).addEventListener('input', function () { if (results) render(); });
      $(id).addEventListener('change', function () { if (results) render(); });
    });
    $('clear-btn').addEventListener('click', function () {
      activeCats.clear(); activeInsts.clear(); $('search').value = ''; $('lic').checked = false; $('bucket-sort').value = 'uq';
      if (results) { renderCatChips(); renderInstChips(); render(); }
    });
    document.addEventListener('click', onAppClick);
    $('remember').addEventListener('change', function () { remember = $('remember').checked; saveState(); });
    $('pdf-btn').addEventListener('click', downloadPdf);
  }

  /* ---------- passcode gate (PBKDF2 + AES-GCM, decrypts JSON DB) ---------- */
  var PBKDF2_ITER = 150000, LS_KEY = 'jupas_pass', ENC_URL = 'jupas-finder-db.enc.json', encBlob = null;
  function b64ToBytes(b64) { return Uint8Array.from(atob(b64), function (c) { return c.charCodeAt(0); }); }
  function deriveKey(pc, salt) {
    return crypto.subtle.importKey('raw', new TextEncoder().encode(pc), 'PBKDF2', false, ['deriveKey'])
      .then(function (base) { return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: salt, iterations: PBKDF2_ITER, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']); });
  }
  function tryUnlock(pc, remember) {
    return deriveKey(pc, b64ToBytes(encBlob.salt))
      .then(function (key) { return crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64ToBytes(encBlob.iv) }, key, b64ToBytes(encBlob.data)); })
      .then(function (plain) {
        DB = JSON.parse(new TextDecoder().decode(plain));
        if (remember) { try { localStorage.setItem(LS_KEY, pc); } catch (e) {} }
        $('lock').style.display = 'none'; $('app').style.display = '';
        buildCores(); buildElectives();
        if (restoreState()) compute();
        return true;
      }).catch(function () { try { localStorage.removeItem(LS_KEY); } catch (e) {} return false; });
  }
  function showLock(msg) { $('app').style.display = 'none'; $('lock').style.display = 'flex'; $('lock-err').textContent = msg || ''; }
  function wireLock() {
    function submit() { var pc = $('passcode').value; if (!pc) return; $('lock-err').textContent = ''; tryUnlock(pc, true).then(function (ok) { if (!ok) { $('lock-err').textContent = t().lockErr; $('passcode').value = ''; } }); }
    $('unlock-btn').addEventListener('click', submit);
    $('passcode').addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });
  }

  function init() {
    applyStatic(); wire(); wireLock();
    fetch(ENC_URL, { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (j) {
      encBlob = j; var saved = null; try { saved = localStorage.getItem(LS_KEY); } catch (e) {}
      if (saved) return tryUnlock(saved, false).then(function (ok) { if (!ok) showLock(''); });
      showLock('');
    }).catch(function () { showLock(t().loadErr); });
  }
  init();

  // test hooks
  window.__finder = {
    compute: compute, readInput: readInput, render: render,
    setDB: function (db) { DB = db; buildCores(); buildElectives(); },
    computeWith: function (inp) { input = inp; if (!inputReady(inp)) return false; runPipeline(); return true; },
    setActiveCats: function (arr) { activeCats = new Set(arr || []); },
    setActiveInsts: function (arr) { activeInsts = new Set(arr || []); },
    setBucket: function (b) { var el = $('bucket-sort'); if (el) el.value = b; if (results) render(); },
    setShortlist: function (arr) { shortlist = (arr || []).slice(0, SL_CAP); },
    shortlistOrder: function () { return shortlist.slice(); },
    slMove: function (code, dir) { slMove(code, dir); renderShortlist(); },
    slRemove: function (code) { slRemove(code); refreshAll(); },
    bucketCounts: function () { return bucketCounts(); },
    provider: provider, qpPill: qpPill, pdfBytes: buildPdfBytes,
    jcdataPayload: jcdataPayload, slReorder: function (a, b) { slReorder(a, b); refreshAll(); },
    get results() { return results; }
  };
})();
