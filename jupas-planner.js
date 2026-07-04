/* JUPAS Planner — DSE results-day expectation-management action plan (3 scenarios).
   Loads after jupas-engine.js (the shared JUPASCal scoring engine).
   Gate mirrors jupas-finder-ui.js: PBKDF2-SHA256 150k + AES-GCM decrypt of the
   finder database (same student passcode, LS key jupas_pass).
   Planning framework adapted from HKACMGM / Faith Education results-day materials. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var E = window.JUPASEngine;
  var DB = null, byCode = {};
  var SAVE_KEY = 'jupas_planner_state', REM_KEY = 'jupas_planner_remember';
  var PLANS = ['A', 'B', 'C'];
  var SLOTS = ['A1', 'A2', 'A3', 'B4', 'B5', 'B6'];
  var ELECTS = ['phys', 'chem', 'bio', 'econ', 'bafs', 'ict', 'geog', 'hist', 'chist', 'chinlit', 'm2'];
  var ELECT_CANON = {
    phys: 'Physics', chem: 'Chemistry', bio: 'Biology', econ: 'Economics',
    bafs: 'Business, Accounting and Financial Studies', ict: 'Information and Communication Technology',
    geog: 'Geography', hist: 'History', chist: 'Chinese History', chinlit: 'Chinese Literature',
    m2: 'Mathematics Extended Part (Module 2)'
  };
  var ELECT_LABEL = { phys: 'Physics', chem: 'Chemistry', bio: 'Biology', econ: 'Economics', bafs: 'BAFS', ict: 'ICT', geog: 'Geography', hist: 'History', chist: 'Chinese History', chinlit: 'Chinese Literature', m2: 'Maths Ext. (M2)' };
  var ELECT_LABEL_ZH = { phys: '物理', chem: '化學', bio: '生物', econ: '經濟', bafs: '企會財', ict: '資訊及通訊科技', geog: '地理', hist: '歷史', chist: '中國歷史', chinlit: '中國文學', m2: '數學延伸 M2' };
  var LEVELS = ['5**', '5*', '5', '4', '3', '2', '1', 'U'];
  // short subject names for requirement pools (fallback = full name)
  var SUBJ_SHORT = {
    en: { 'Biology': 'Bio', 'Chemistry': 'Chem', 'Physics': 'Phys', 'Economics': 'Econ', 'Geography': 'Geog', 'History': 'Hist', 'Chinese History': 'Chi Hist', 'Chinese Literature': 'Chi Lit', 'Information and Communication Technology': 'ICT', 'Business, Accounting and Financial Studies': 'BAFS', 'Mathematics Extended Part (Module 1)': 'M1', 'Mathematics Extended Part (Module 2)': 'M2', 'Mathematics (Compulsory Part)': 'Math', 'Chinese Language': 'Chi', 'English Language': 'Eng' },
    zh: { 'Biology': '生物', 'Chemistry': '化學', 'Physics': '物理', 'Economics': '經濟', 'Geography': '地理', 'History': '歷史', 'Chinese History': '中史', 'Chinese Literature': '中國文學', 'Information and Communication Technology': '資訊科技', 'Business, Accounting and Financial Studies': '企會財', 'Mathematics Extended Part (Module 1)': 'M1', 'Mathematics Extended Part (Module 2)': 'M2', 'Mathematics (Compulsory Part)': '數學', 'Chinese Language': '中文', 'English Language': '英文' }
  };
  var NA_TYPE = {
    en: { interview: 'Interview', portfolio: 'Portfolio', audition: 'Audition', 'physical-test': 'Physical test', 'practical-test': 'Practical test', 'written-test': 'Written test', 'aptitude-test': 'Aptitude test', oea: 'OEA' },
    zh: { interview: '面試', portfolio: '作品集', audition: '試演', 'physical-test': '體能測試', 'practical-test': '實務測試', 'written-test': '筆試', 'aptitude-test': '能力測試', oea: 'OEA' }
  };
  // engine fail labels: CHI/ENG/MATH/CSD (key.toUpperCase()), Elective 1/2, EXTRA
  var ELIG_LABEL_ZH = { 'CHI': '中文', 'ENG': '英文', 'MATH': '數學', 'CSD': '公民與社會發展', 'Elective 1': '選修 1', 'Elective 2': '選修 2', 'EXTRA': '額外要求' };
  // zh labels for the engine's comparison keys (EN uses the engine's own labels)
  var REF_LABEL_ZH = { uq: '上四分位', median: '中位數', lq: '下四分位', mean: '平均', expected_score: '預估' };

  var S = {
    en: {
      home: '← Back to home', title: 'JUPAS Planner',
      subtitle: 'DSE results-day expectation-management action plan — before results day, plan your Band A & B choices for three scenarios: results as expected, better, or worse.',
      heroDisc: 'For reference only — programme data and admission references are from past intakes and may be inaccurate or change. Always verify with the official JUPAS website (www.jupas.edu.hk) and each university’s own website. This tool bears no responsibility for any admission decision.',
      lock: 'Enter passcode', locksub: 'For PLK No.1 students only', unlockBtn: 'Unlock', pcPh: 'Passcode',
      lockErr: 'Incorrect passcode', loadErr: 'Could not load data file.', lockHome: '← Back to home',
      s1: '1 · Your details & grades for the three scenarios',
      ghint: 'Review your HKDSE performance objectively, then fill in one set of grades per scenario. Pick your elective subjects once — enter each scenario’s level for them.',
      namePh: 'Name (optional)', classPh: 'Class',
      subject: 'Subject', chi: 'Chinese', eng: 'English', math: 'Mathematics', csd: 'Citizenship and Social Development',
      elect: 'Elective', pickSubj: '— subject —', lv: 'Level', att: 'Attained', notatt: 'Not attained',
      copyA: '⟵ copy Plan A', remember: 'Save on this computer',
      sharednote: 'On a shared or school computer, untick the box — your plan then stays only in this tab.',
      print: 'Print my plan', pdfBtn: 'Save as PDF',
      pdfHint: '“Save as PDF” opens your browser’s print window — choose “Save as PDF” as the printer / destination there.',
      planh: { A: '2 · Plan A — results as expected', B: '3 · Plan B — results better than expected', C: '4 · Plan C — results worse than expected' },
      planq: {
        A: 'If your results are similar to your expectation, which JUPAS programmes will you enrol for? Fill in your Band A & B choices below.',
        B: 'If your results are better than your expectation, which JUPAS programmes will you enrol for?',
        C: 'If your results are worse than your expectation, which JUPAS programmes will you enrol for?'
      },
      gradeRow: { A: 'Expected grade', B: 'Best possible grade', C: 'Worst possible grade' },
      searchPh: 'Type JS code or programme name…', noMatch: 'No matching programme',
      interest: 'Interest', clearSlot: 'Clear this choice', req: 'Admission requirements',
      calc: 'Score calculation / weighted subjects', interview: 'Interview arrangement',
      scores: 'Past admission scores', myGrade: 'My grade (this scenario)', quota: '2026 quota',
      anyElect: 'any elective', catA: 'any Cat. A elective', of: 'of', need: 'need',
      noneRecord: 'None on record', noData: 'No data', enterGrades: 'Enter this scenario’s grades above first.',
      timBefore: 'before results', timAfter: 'after results', timBoth: 'before & after results', ifNec: '(if necessary)',
      eligYes: 'Eligible', eligNo: 'Not eligible',
      band: { 'above-uq': '≥ UQ', 'above-median': '≥ Median', 'above-lq': '≥ LQ', 'below-lq': '< LQ', 'no-score': 'No ref data' },
      fewPlaces: 'few places (quota < 20)', extraReq: 'plus total ≥ {t} & {n} × {g}',
      offersh: '5 · My conditional offers', offdate: 'As of (date):',
      offInst: 'Institution (local / non-local)', offProg: 'Programme', offReq: 'Requirement (if any)',
      bring: 'On results day, bring this plan to school together with: (1) your original JUPAS programme choice list; (2) programme choices and any conditional-offer information; (3) application information for other study / training options — to discuss with your career teachers, class teacher, subject teachers or social worker.',
      footer: 'Unofficial reference tool for PLK No.1 students — not affiliated with JUPAS. Scores are computed per each programme’s own formula and are not comparable across institutions; programme data and admission references are from past intakes, may be inaccurate and do not guarantee this year’s results — always verify on www.jupas.edu.hk and each university’s website. © 2026 PLK No.1 W.H. Cheung College · Career Team. Includes a third-party scoring engine and database used under licence.',
      prTitle: 'JUPAS Planner — Results-day action plan', prName: 'Name', prClass: 'Class', prDate: 'Printed',
      prChoice: 'Choice', prProg: 'Programme', prScore: 'My grade', prRefs: 'Admission refs', prGrades: 'Grades'
    },
    zh: {
      home: '← 返回主頁', title: 'JUPAS 放榜行動計劃',
      subtitle: 'DSE 放榜期望管理行動計劃——放榜前，先為三種情境（成績如預期、比預期好、比預期差）規劃 Band A 及 Band B 志願。',
      heroDisc: '僅供參考——課程資料及收生數據為過往年度資料，可能不準確或有變。請以 JUPAS 官方網站（www.jupas.edu.hk）及各大學網站為準。本工具概不就任何收生決定承擔責任。',
      lock: '請輸入通行碼', locksub: '只供保良局第一張永慶中學學生使用', unlockBtn: '解鎖', pcPh: '通行碼',
      lockErr: '通行碼錯誤', loadErr: '無法載入資料檔。', lockHome: '← 返回主頁',
      s1: '1 · 你的資料及三種情境的成績',
      ghint: '請客觀地預測自己文憑試的表現，為每個情境填寫一組成績。選修科目只需選一次——再分別填寫各情境的等級。',
      namePh: '姓名（可選）', classPh: '班別',
      subject: '科目', chi: '中文', eng: '英文', math: '數學', csd: '公民與社會發展',
      elect: '選修', pickSubj: '— 科目 —', lv: '等級', att: '達標', notatt: '未達標',
      copyA: '⟵ 複製計劃一', remember: '在此電腦儲存', sharednote: '如使用共用或學校電腦，請取消勾選，資料只會留在此分頁。',
      print: '列印我的計劃', pdfBtn: '儲存為 PDF',
      pdfHint: '「儲存為 PDF」會開啟瀏覽器的列印視窗——請在「印表機／目的地」選擇「儲存為 PDF」。',
      planh: { A: '2 · 計劃一——成績如預期', B: '3 · 計劃二——成績比預期好', C: '4 · 計劃三——成績比預期差' },
      planq: {
        A: '若如願考獲該成績，你會報讀哪些聯招課程？請在下方填寫 Band A 及 Band B 志願。',
        B: '若考獲的成績比預期好，你會報讀哪些聯招課程？',
        C: '若考獲的成績比預期差，你會報讀哪些聯招課程？'
      },
      gradeRow: { A: '預期成績', B: '比預期好的成績', C: '比預期差的成績' },
      searchPh: '輸入課程編號或名稱…', noMatch: '沒有符合的課程',
      interest: '興趣程度', clearSlot: '清除此志願', req: '課程入學要求',
      calc: '計分方法／計分較重科目', interview: '面試安排',
      scores: '過往收生成績', myGrade: '我的成績（此情境）', quota: '2026 學額',
      anyElect: '任何選修', catA: '任何甲類選修', of: '其中', need: '需',
      noneRecord: '沒有紀錄', noData: '沒有數據', enterGrades: '請先在上方輸入此情境的成績。',
      timBefore: '放榜前', timAfter: '放榜後', timBoth: '放榜前後', ifNec: '（如有需要）',
      eligYes: '符合資格', eligNo: '未符合資格',
      band: { 'above-uq': '≥ 上四分位', 'above-median': '≥ 中位數', 'above-lq': '≥ 下四分位', 'below-lq': '低於下四分位', 'no-score': '沒有參考數據' },
      fewPlaces: '學額較少（少於 20）', extraReq: '另需總分 ≥ {t} 及 {n} 科 {g}',
      offersh: '5 · 院校有條件取錄情況', offdate: '截至（日期）：',
      offInst: '院校（本地／非本地）', offProg: '課程', offReq: '有條件取錄的成績要求（如有）',
      bring: '請於放榜當天將此計劃連同：(1) 原本聯招課程排序；(2) 課程選擇及有條件取錄通知；(3) 其他已報名的升學／職訓課程資料，帶回學校，讓生涯規劃組老師、班主任、科任老師或社工了解你的想法和預備。',
      footer: '本工具只供保良局第一張永慶中學學生參考，並非 JUPAS 官方工具。分數按各課程自己的公式計算，不可跨院校比較；課程資料及收生數據為過往年度資料，可能不準確，亦不代表本年度結果——請以 www.jupas.edu.hk 及各大學網站為準。© 2026 保良局第一張永慶中學・升學輔導及生涯規劃組。當中包含第三方計分引擎及資料庫，並依授權條款使用。',
      prTitle: 'JUPAS 放榜行動計劃', prName: '姓名', prClass: '班別', prDate: '列印日期',
      prChoice: '排序', prProg: '課程', prScore: '我的成績', prRefs: '收生參考', prGrades: '成績'
    }
  };
  var lang = (function () { try { return localStorage.getItem('clp_lang') === 'zh' ? 'zh' : 'en'; } catch (e) { return 'en'; } })();
  function t() { return S[lang]; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function str(v, n) { return String(v == null ? '' : v).slice(0, n || 60); }
  function fmt(x) { if (x == null || isNaN(x)) return '—'; return String(Math.round(x * 100) / 100); }

  // ---------------- state ----------------
  function blankPlan() {
    return { chi: '', eng: '', math: '', csd: 'att', e: ['', '', '', ''], choices: SLOTS.map(function () { return { code: '', interest: 0 }; }) };
  }
  var state = {
    name: '', klass: '', electSubjs: ['', '', '', ''],
    plans: { A: blankPlan(), B: blankPlan(), C: blankPlan() },
    offersDate: '', offers: [0, 1, 2, 3, 4, 5].map(function () { return { inst: '', prog: '', req: '' }; })
  };
  var remember = true;
  var saveTimer = null;
  function save() {
    if (!remember) return;
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) {}
  }
  function saveSoon() { clearTimeout(saveTimer); saveTimer = setTimeout(save, 300); }
  function restore() {
    var raw = null;
    try { remember = localStorage.getItem(REM_KEY) !== '0'; raw = localStorage.getItem(SAVE_KEY); } catch (e) {}
    if (!raw) return;
    var d; try { d = JSON.parse(raw); } catch (e) { return; }
    if (!d || typeof d !== 'object') return;
    state.name = str(d.name, 40); state.klass = str(d.klass, 10);
    state.offersDate = str(d.offersDate, 20);
    if (Array.isArray(d.electSubjs)) for (var k = 0; k < 4; k++) state.electSubjs[k] = ELECTS.indexOf(d.electSubjs[k]) >= 0 ? d.electSubjs[k] : '';
    PLANS.forEach(function (p) {
      var sp = (d.plans || {})[p]; if (!sp) return;
      var tp = state.plans[p];
      ['chi', 'eng', 'math'].forEach(function (f) { tp[f] = LEVELS.indexOf(sp[f]) >= 0 ? sp[f] : ''; });
      tp.csd = sp.csd === 'not' ? 'not' : 'att';
      if (Array.isArray(sp.e)) for (var i = 0; i < 4; i++) tp.e[i] = LEVELS.indexOf(sp.e[i]) >= 0 ? sp.e[i] : '';
      if (Array.isArray(sp.choices)) for (var j = 0; j < 6; j++) {
        var c = sp.choices[j] || {};
        tp.choices[j].code = byCode[c.code] ? c.code : '';
        tp.choices[j].interest = Math.max(0, Math.min(5, parseInt(c.interest, 10) || 0));
      }
    });
    if (Array.isArray(d.offers)) for (var m = 0; m < 6; m++) {
      var o = d.offers[m] || {};
      state.offers[m] = { inst: str(o.inst, 60), prog: str(o.prog, 80), req: str(o.req, 80) };
    }
  }

  // ---------------- grades helpers ----------------
  var CSD_CANON = 'Citizenship and Social Development';
  function buildGrades(p) {
    var pl = state.plans[p], g = {};
    if (pl.chi) g['Chinese Language'] = pl.chi;
    if (pl.eng) g['English Language'] = pl.eng;
    if (pl.math) g['Mathematics (Compulsory Part)'] = pl.math;
    g[CSD_CANON] = pl.csd === 'not' ? 'Not Attained' : 'Attained';
    for (var k = 0; k < 4; k++) {
      var s = state.electSubjs[k], lv = pl.e[k];
      if (s && lv && ELECT_CANON[s]) g[ELECT_CANON[s]] = lv;
    }
    return g;
  }
  function planReady(p) { var pl = state.plans[p]; return !!(pl.chi && pl.eng && pl.math); }

  // ---------------- auto-fill helpers ----------------
  function subjShort(name) { return SUBJ_SHORT[lang][name] || name; }
  function poolText(pool) {
    if (!pool || !pool.subjects || !pool.subjects.length) return '';
    var n = parseInt(pool.count, 10) || 1, g = pool.grade || '';
    var subj;
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
    if (x && (x.min_total || x.min_top_grade_count)) {
      parts.push(t().extraReq.replace('{t}', x.min_total || '?').replace('{n}', x.min_top_grade_count || '?').replace('{g}', x.top_grade || ''));
    }
    return parts.length ? parts.join(' · ') : '—';
  }
  function formulaText(prog) { return prog.formula_2026 || prog.formula_2025 || '—'; }
  function interviewText(prog) {
    var arr = prog.non_academic || [];
    if (!arr.length) return t().noneRecord;
    return arr.map(function (it) {
      var name = NA_TYPE[lang][it.type] || it.type || '';
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
  function eligLabel(lb) { return lb === 'CSD' ? t().csd : lang === 'zh' ? (ELIG_LABEL_ZH[lb] || lb) : lb; }
  // effective UQ: the published one when usable, else synthesized the same way the
  // Chance algorithm estimates it (median + 1.25 × upper spread, floored at 5% of median)
  function effectiveUq(refs) {
    if (refs.uq != null && +refs.uq > +refs.median) return +refs.uq;
    if (refs.median == null) return null;
    var med = +refs.median, floor = 0.05 * med;
    var spread = refs.lq != null ? Math.max(med - +refs.lq, floor) : floor;
    return med + 1.25 * spread;
  }
  // slot-differential tag for "My grade": green when the score clears the slot's own
  // threshold (A1 ≥ LQ · A2 ≥ Median · A3 ≥ UQ · B4–B6 ≥ UQ+10%) AND all requirements
  // are met; amber when there is no reference data or quota < 20; red otherwise.
  function slotTag(prog, ev, slotIdx) {
    if (!ev.eligibility.eligible) return { cls: 'p-bad' };
    var refs = E.refScores(prog);
    if (refs.median == null && refs.lq == null && refs.uq == null) return { cls: 'p-mid', note: 'noData' };
    var quota = parseInt(prog.quota, 10);
    if (!isNaN(quota) && quota < 20) return { cls: 'p-mid', note: 'fewPlaces' };
    var score = +ev.calculation.totalScore, ok = false, thr = null, EPS = 1e-9;
    if (slotIdx === 0) thr = refs.lq != null ? +refs.lq : refs.median != null ? +refs.median : null;
    else if (slotIdx === 1) thr = refs.median != null ? +refs.median : null;
    else { var uqEff = effectiveUq(refs); thr = uqEff != null ? uqEff * (slotIdx === 2 ? 1 : 1.10) : null; }
    ok = thr != null && score >= thr - EPS;
    return { cls: ok ? 'p-good' : 'p-bad' };
  }
  function pctText(ev) {
    if (!ev.comparisons.length) return '';
    return ev.comparisons.map(function (c) {
      var lab = lang === 'zh' ? (REF_LABEL_ZH[c.key] || c.label) : c.label;
      var pc = Math.round(c.percent);
      return lab + ' ' + (pc >= 0 ? '+' : '') + pc + '%';
    }).join(' · ');
  }
  function myGradeHtml(prog, p, slotIdx) {
    if (!planReady(p)) return '<span class="hint" style="margin:0">' + esc(t().enterGrades) + '</span>';
    var ev = E.evaluateProgramme(prog, buildGrades(p));
    var tag = slotTag(prog, ev, slotIdx);
    var h = '<span class="mygrade"><span class="mg-score">' + esc(fmt(ev.calculation.totalScore)) + '</span>';
    h += '<span class="pill ' + tag.cls + '">' + esc(t().band[ev.band] || ev.band) + '</span></span>';
    var cmp = pctText(ev);
    if (cmp) h += ' <span style="font-size:0.78rem;color:var(--muted)">' + esc(cmp) + '</span>';
    if (tag.note === 'fewPlaces') h += ' <span style="font-size:0.78rem;color:var(--mid);font-weight:700">· ' + esc(t().fewPlaces) + '</span>';
    if (ev.eligibility.eligible) h += '<div class="elig-yes" style="margin-top:4px;font-size:0.8rem">✓ ' + esc(t().eligYes) + '</div>';
    else {
      var fails = (ev.eligibility.details || []).filter(function (d) { return !d.pass; });
      var f = fails.length ? fails[0] : null;
      // the DB encodes the CSD minimum as grade "A" — show the human meaning instead
      var needTxt = f ? (f.label === 'CSD' ? t().att : str(f.need, 24)) : '';
      h += '<div class="elig-no" style="margin-top:4px;font-size:0.8rem">✗ ' + esc(t().eligNo) +
        (f ? ' — ' + esc(eligLabel(f.label)) + (needTxt && needTxt !== 'N/A' ? ' (' + esc(t().need) + ' ' + esc(needTxt) + ')' : '') : '') + '</div>';
    }
    return h;
  }
  function progName(prog) { return (lang === 'zh' && prog.name_zh) ? prog.name_zh : prog.name_en; }
  function progInst(prog) { return lang === 'zh' && prog.institution_zh ? prog.institution + ' ' + prog.institution_zh : prog.institution; }

  // ---------------- build: grades table ----------------
  function lvOptions(cur) {
    var h = '<option value=""></option>';
    LEVELS.forEach(function (l) { h += '<option value="' + l + '"' + (cur === l ? ' selected' : '') + '>' + l + '</option>'; });
    return h;
  }
  function buildGradesTable() {
    var el = $('gtable'), h = '';
    h += '<tr><th>' + esc(t().subject) + '</th>';
    PLANS.forEach(function (p) {
      h += '<th><span class="plab">' + esc(t().planh[p].split('·')[1].split('—')[0].trim()) + '</span>' + esc(t().gradeRow[p]) +
        (p !== 'A' ? '<br><button type="button" class="copybtn" data-copy="' + p + '">' + esc(t().copyA) + '</button>' : '') + '</th>';
    });
    h += '</tr>';
    [['chi', t().chi], ['eng', t().eng], ['math', t().math]].forEach(function (row) {
      h += '<tr><td>' + esc(row[1]) + '</td>';
      PLANS.forEach(function (p) {
        h += '<td><select data-plan="' + p + '" data-f="' + row[0] + '" aria-label="' + esc(row[1] + ' ' + t().gradeRow[p]) + '">' + lvOptions(state.plans[p][row[0]]) + '</select></td>';
      });
      h += '</tr>';
    });
    h += '<tr><td>' + esc(t().csd) + '</td>';
    PLANS.forEach(function (p) {
      h += '<td><select data-plan="' + p + '" data-f="csd" aria-label="' + esc(t().csd + ' ' + t().gradeRow[p]) + '">' +
        '<option value="att"' + (state.plans[p].csd !== 'not' ? ' selected' : '') + '>' + esc(t().att) + '</option>' +
        '<option value="not"' + (state.plans[p].csd === 'not' ? ' selected' : '') + '>' + esc(t().notatt) + '</option></select></td>';
    });
    h += '</tr>';
    for (var k = 0; k < 4; k++) {
      h += '<tr><td><select data-es="' + k + '" aria-label="' + esc(t().elect + ' ' + (k + 1)) + '"><option value="">' + esc(t().pickSubj) + '</option>';
      ELECTS.forEach(function (s) {
        var taken = state.electSubjs.indexOf(s) >= 0 && state.electSubjs[k] !== s;
        h += '<option value="' + s + '"' + (state.electSubjs[k] === s ? ' selected' : '') + (taken ? ' disabled' : '') + '>' +
          esc(lang === 'zh' ? ELECT_LABEL_ZH[s] : ELECT_LABEL[s]) + '</option>';
      });
      h += '</select></td>';
      PLANS.forEach(function (p) {
        h += '<td><select data-plan="' + p + '" data-f="e' + k + '"' + (state.electSubjs[k] ? '' : ' disabled') + ' aria-label="' + esc(t().elect + ' ' + (k + 1) + ' ' + t().gradeRow[p]) + '">' + lvOptions(state.plans[p].e[k]) + '</select></td>';
      });
      h += '</tr>';
    }
    el.innerHTML = h;
    el.querySelectorAll('select[data-plan]').forEach(function (sel) {
      sel.addEventListener('change', function () {
        var p = sel.getAttribute('data-plan'), f = sel.getAttribute('data-f');
        if (f === 'csd') state.plans[p].csd = sel.value;
        else if (/^e\d$/.test(f)) state.plans[p].e[+f.slice(1)] = sel.value;
        else state.plans[p][f] = sel.value;
        renderPlanCards(p); saveSoon();
      });
    });
    el.querySelectorAll('select[data-es]').forEach(function (sel) {
      sel.addEventListener('change', function () {
        state.electSubjs[+sel.getAttribute('data-es')] = sel.value;
        buildGradesTable(); PLANS.forEach(renderPlanCards); saveSoon();
      });
    });
    el.querySelectorAll('.copybtn').forEach(function (b) {
      b.addEventListener('click', function () {
        var p = b.getAttribute('data-copy'), a = state.plans.A, tp = state.plans[p];
        tp.chi = a.chi; tp.eng = a.eng; tp.math = a.math; tp.csd = a.csd; tp.e = a.e.slice();
        buildGradesTable(); renderPlanCards(p); saveSoon();
      });
    });
  }

  // ---------------- build: plan slots + autocomplete ----------------
  function matches(q) {
    q = q.trim(); if (q.length < 2 || !DB) return [];
    var U = q.toUpperCase(), L = q.toLowerCase(), pre = [], mid = [], nm = [];
    for (var i = 0; i < DB.length; i++) {
      var p = DB[i], code = p.jupas_code;
      if (code.indexOf(U) === 0) pre.push(p);
      else if (code.indexOf(U) > 0) mid.push(p);
      else if ((p.name_en || '').toLowerCase().indexOf(L) >= 0 || (p.name_zh || '').indexOf(q) >= 0 || (p.institution || '').toLowerCase() === L) nm.push(p);
      if (pre.length >= 8) break;
    }
    return pre.concat(mid, nm).slice(0, 8);
  }
  function slotEls(p, i) {
    var slot = document.querySelector('.slot[data-plan="' + p + '"][data-i="' + i + '"]');
    return { slot: slot, pick: slot.querySelector('.slot-pick'), input: slot.querySelector('.pcode'), list: slot.querySelector('.ac-list'), card: slot.querySelector('.slot-card'), stars: slot.querySelector('.stars') };
  }
  function setInputDisplay(p, i) {
    var els = slotEls(p, i), c = state.plans[p].choices[i];
    if (c.code && byCode[c.code]) {
      var prog = byCode[c.code];
      els.input.value = c.code + ' · ' + progName(prog);
      els.pick.classList.add('has');
    } else { els.input.value = ''; els.pick.classList.remove('has'); }
  }
  function renderStars(p, i) {
    var els = slotEls(p, i), v = state.plans[p].choices[i].interest;
    els.stars.querySelectorAll('button').forEach(function (b, k) {
      var on = k < v;
      b.classList.toggle('on', on);
      b.textContent = on ? '★' : '☆';
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }
  function renderCard(p, i) {
    var els = slotEls(p, i), c = state.plans[p].choices[i], prog = c.code && byCode[c.code];
    if (!prog) { els.card.classList.remove('open'); els.card.innerHTML = ''; return; }
    var h = '<div class="sc-head">' + esc(prog.jupas_code) + ' · ' + esc(progName(prog)) +
      '<span class="inst">' + esc(progInst(prog)) + '</span></div>';
    h += '<div class="kv">';
    h += '<div class="k">' + esc(t().req) + '</div><div class="v">' + esc(reqText(prog)) + '</div>';
    h += '<div class="k">' + esc(t().calc) + '</div><div class="v">' + esc(str(formulaText(prog), 160)) + '</div>';
    h += '<div class="k">' + esc(t().interview) + '</div><div class="v">' + esc(interviewText(prog)) + '</div>';
    h += '<div class="k">' + esc(t().scores) + '</div><div class="v">' + esc(scoresText(prog)) + '</div>';
    h += '<div class="k">' + esc(t().quota) + '</div><div class="v">' + esc(prog.quota != null ? String(prog.quota) : '—') + '</div>';
    h += '<div class="k">' + esc(t().myGrade) + '</div><div class="v">' + myGradeHtml(prog, p, i) + '</div>';
    h += '</div>';
    els.card.innerHTML = h;
    els.card.classList.add('open');
  }
  function renderPlanCards(p) { for (var i = 0; i < 6; i++) renderCard(p, i); }
  function pick(p, i, code) {
    state.plans[p].choices[i].code = code;
    setInputDisplay(p, i); renderCard(p, i); saveSoon();
  }
  function buildSlots(p) {
    var box = document.querySelector('.slots[data-plan="' + p + '"]'), h = '';
    SLOTS.forEach(function (lab, i) {
      h += '<div class="slot" data-plan="' + p + '" data-i="' + i + '">' +
        '<div class="slot-top">' +
        '<span class="slot-chip ' + (i < 3 ? 'ba' : 'bb') + '">' + lab + '</span>' +
        '<div class="slot-pick"><input type="text" class="pcode" autocomplete="off" placeholder="' + esc(t().searchPh) + '" aria-label="' + lab + ' ' + esc(t().searchPh) + '">' +
        '<button type="button" class="slot-clear" aria-label="' + esc(t().clearSlot) + '">✕</button>' +
        '<div class="ac-list" hidden></div></div>' +
        '<span class="stars-lab">' + esc(t().interest) + '</span><span class="stars" role="group" aria-label="' + esc(t().interest) + ' ' + lab + '">' +
        '<button type="button" data-s="1">☆</button><button type="button" data-s="2">☆</button><button type="button" data-s="3">☆</button><button type="button" data-s="4">☆</button><button type="button" data-s="5">☆</button>' +
        '</span></div>' +
        '<div class="slot-card"></div></div>';
    });
    box.innerHTML = h;
    SLOTS.forEach(function (lab, i) {
      var els = slotEls(p, i), hi = -1, cur = [];
      function hide() { els.list.hidden = true; els.list.innerHTML = ''; hi = -1; cur = []; }
      function show(items) {
        cur = items; hi = items.length ? 0 : -1;
        if (!items.length) { els.list.innerHTML = '<div class="ac-none">' + esc(t().noMatch) + '</div>'; els.list.hidden = false; return; }
        var h2 = '';
        items.forEach(function (m, k) {
          h2 += '<div class="ac-item' + (k === hi ? ' hi' : '') + '" data-k="' + k + '"><b>' + esc(m.jupas_code) + '</b> · ' + esc(progName(m)) + ' <span class="ai">· ' + esc(m.institution) + '</span></div>';
        });
        els.list.innerHTML = h2; els.list.hidden = false;
        els.list.querySelectorAll('.ac-item').forEach(function (it) {
          it.addEventListener('mousedown', function (ev) { ev.preventDefault(); pick(p, i, cur[+it.getAttribute('data-k')].jupas_code); hide(); });
        });
      }
      els.input.addEventListener('input', function () {
        state.plans[p].choices[i].code = ''; els.pick.classList.remove('has'); renderCard(p, i);
        var m = matches(els.input.value);
        if (els.input.value.trim().length < 2) hide(); else show(m);
      });
      els.input.addEventListener('focus', function () { if (state.plans[p].choices[i].code) els.input.select(); });
      els.input.addEventListener('blur', function () { setTimeout(function () { hide(); setInputDisplay(p, i); }, 120); });
      els.input.addEventListener('keydown', function (ev) {
        if (els.list.hidden) return;
        if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
          ev.preventDefault();
          if (!cur.length) return;
          hi = (hi + (ev.key === 'ArrowDown' ? 1 : cur.length - 1)) % cur.length;
          els.list.querySelectorAll('.ac-item').forEach(function (it, k) { it.classList.toggle('hi', k === hi); });
        } else if (ev.key === 'Enter') {
          ev.preventDefault();
          if (hi >= 0 && cur[hi]) { pick(p, i, cur[hi].jupas_code); hide(); els.input.blur(); }
        } else if (ev.key === 'Escape') { hide(); }
      });
      els.slot.querySelector('.slot-clear').addEventListener('click', function () {
        state.plans[p].choices[i].code = ''; setInputDisplay(p, i); renderCard(p, i); saveSoon(); els.input.focus();
      });
      els.stars.querySelectorAll('button').forEach(function (b) {
        b.addEventListener('click', function () {
          var v = +b.getAttribute('data-s');
          var c = state.plans[p].choices[i];
          c.interest = c.interest === v ? 0 : v;
          renderStars(p, i); saveSoon();
        });
      });
      setInputDisplay(p, i); renderStars(p, i); renderCard(p, i);
    });
  }

  // ---------------- conditional offers ----------------
  function buildOffers() {
    var el = $('offers');
    var h = '<tr><th></th><th>' + esc(t().offInst) + '</th><th>' + esc(t().offProg) + '</th><th>' + esc(t().offReq) + '</th></tr>';
    for (var i = 0; i < 6; i++) {
      h += '<tr><td class="n">' + (i + 1) + '</td>' +
        '<td><input type="text" maxlength="60" data-off="inst" data-i="' + i + '" value="' + esc(state.offers[i].inst) + '"></td>' +
        '<td><input type="text" maxlength="80" data-off="prog" data-i="' + i + '" value="' + esc(state.offers[i].prog) + '"></td>' +
        '<td><input type="text" maxlength="80" data-off="req" data-i="' + i + '" value="' + esc(state.offers[i].req) + '"></td></tr>';
    }
    el.innerHTML = h;
    el.querySelectorAll('input[data-off]').forEach(function (inp) {
      inp.addEventListener('input', function () {
        state.offers[+inp.getAttribute('data-i')][inp.getAttribute('data-off')] = inp.value;
        saveSoon();
      });
    });
  }

  // ---------------- print ----------------
  function starsTxt(n) { var s = ''; for (var i = 0; i < 5; i++) s += i < n ? '★' : '☆'; return s; }
  function gradesLine(p) {
    var pl = state.plans[p], parts = [];
    if (pl.chi) parts.push(t().chi + ' ' + pl.chi);
    if (pl.eng) parts.push(t().eng + ' ' + pl.eng);
    if (pl.math) parts.push(t().math + ' ' + pl.math);
    parts.push(t().csd + ' ' + (pl.csd === 'not' ? t().notatt : t().att));
    for (var k = 0; k < 4; k++) {
      var s = state.electSubjs[k];
      if (s && pl.e[k]) parts.push((lang === 'zh' ? ELECT_LABEL_ZH[s] : ELECT_LABEL[s]) + ' ' + pl.e[k]);
    }
    return parts.join(' · ');
  }
  function buildPrint() {
    var h = '<h1>' + esc(t().prTitle) + '</h1>';
    h += '<div>' + esc(t().prName) + ': ' + esc(state.name || '—') + ' · ' + esc(t().prClass) + ': ' + esc(state.klass || '—') +
      ' · ' + esc(t().prDate) + ': ' + esc(new Date().toLocaleDateString()) + '</div>';
    PLANS.forEach(function (p) {
      h += '<div class="pr-plan"><h2>' + esc(t().planh[p].replace(/^\d+ · /, '')) + '</h2>';
      h += '<div><b>' + esc(t().prGrades) + ':</b> ' + esc(gradesLine(p)) + '</div>';
      h += '<table><tr><th>' + esc(t().prChoice) + '</th><th>' + esc(t().prProg) + '</th><th>' + esc(t().interest) + '</th><th>' + esc(t().prScore) + '</th><th>' + esc(t().prRefs) + '</th><th>' + esc(t().quota) + '</th><th>' + esc(t().interview) + '</th></tr>';
      SLOTS.forEach(function (lab, i) {
        var c = state.plans[p].choices[i], prog = c.code && byCode[c.code];
        if (!prog) { h += '<tr><td>' + lab + '</td><td></td><td></td><td></td><td></td><td></td><td></td></tr>'; return; }
        var mg = '—';
        if (planReady(p)) {
          var ev = E.evaluateProgramme(prog, buildGrades(p));
          var pct = pctText(ev);
          mg = fmt(ev.calculation.totalScore) + ' · ' + (t().band[ev.band] || '') + (pct ? ' · ' + pct : '') + ' · ' + (ev.eligibility.eligible ? '✓' : '✗ ' + t().eligNo);
        }
        h += '<tr><td>' + lab + '</td><td>' + esc(prog.jupas_code) + ' ' + esc(progName(prog)) + ' (' + esc(prog.institution) + ')</td>' +
          '<td>' + starsTxt(c.interest) + '</td><td>' + esc(mg) + '</td><td>' + esc(scoresText(prog)) + '</td>' +
          '<td>' + esc(prog.quota != null ? String(prog.quota) : '—') + '</td><td>' + esc(interviewText(prog)) + '</td></tr>';
      });
      h += '</table></div>';
    });
    h += '<h2>' + esc(t().offersh.replace(/^\d+ · /, '')) + '</h2>';
    h += '<div>' + esc(t().offdate) + ' ' + esc(state.offersDate || '—') + '</div>';
    h += '<table><tr><th></th><th>' + esc(t().offInst) + '</th><th>' + esc(t().offProg) + '</th><th>' + esc(t().offReq) + '</th></tr>';
    state.offers.forEach(function (o, i) {
      h += '<tr><td>' + (i + 1) + '</td><td>' + esc(o.inst) + '</td><td>' + esc(o.prog) + '</td><td>' + esc(o.req) + '</td></tr>';
    });
    h += '</table>';
    h += '<div class="pr-note">' + esc(t().bring) + '</div>';
    h += '<div class="pr-note">' + esc(t().footer) + '</div>';
    $('print-report').innerHTML = h;
  }

  // ---------------- static text + language ----------------
  function applyStatic() {
    var s = t();
    var map = { 't-home': s.home, 't-lockhome': s.lockHome, 't-lock': s.lock, 't-locksub': s.locksub,
      't-title': s.title, 't-subtitle': s.subtitle, 't-herodisc': s.heroDisc,
      't-s1': s.s1, 't-ghint': s.ghint, 't-remember': s.remember, 't-sharednote': s.sharednote,
      't-pdfhint': s.pdfHint,
      't-offersh': s.offersh, 't-offdate': s.offdate, 't-bring': s.bring, 't-footer': s.footer };
    Object.keys(map).forEach(function (id) { var el = $(id); if (el) el.textContent = map[id]; });
    $('unlock-btn').textContent = s.unlockBtn;
    $('passcode').placeholder = s.pcPh; $('passcode').setAttribute('aria-label', s.pcPh);
    $('in-name').placeholder = s.namePh; $('in-class').placeholder = s.classPh;
    $('print-btn').textContent = '🖨 ' + s.print;
    $('pdf-btn').textContent = '💾 ' + s.pdfBtn;
    document.querySelectorAll('.t-planh').forEach(function (el) { el.textContent = s.planh[el.getAttribute('data-plan')]; });
    document.querySelectorAll('.plan-q').forEach(function (el) { el.textContent = s.planq[el.getAttribute('data-plan')]; });
    document.title = s.title;
    document.documentElement.lang = lang === 'zh' ? 'zh-Hant' : 'en';
  }
  function rebuildAll() {
    applyStatic();
    buildGradesTable();
    PLANS.forEach(buildSlots);
    buildOffers();
    $('in-name').value = state.name; $('in-class').value = state.klass;
    $('off-date').value = state.offersDate;
    $('remember').checked = remember;
  }
  function setLang(l) {
    lang = l; try { localStorage.setItem('clp_lang', l); } catch (e) {}
    $('lang-en').classList.toggle('active', l === 'en');
    $('lang-zh').classList.toggle('active', l === 'zh');
    rebuildAll();
  }

  // ---------------- gate (mirrors jupas-finder-ui.js) ----------------
  var PBKDF2_ITER = 150000, LS_KEY = 'jupas_pass', ENC_URL = 'jupas-finder-db.enc.json', encBlob = null;
  function b64ToBytes(b64) { return Uint8Array.from(atob(b64), function (c) { return c.charCodeAt(0); }); }
  function deriveKey(pc, salt) {
    return crypto.subtle.importKey('raw', new TextEncoder().encode(pc), 'PBKDF2', false, ['deriveKey'])
      .then(function (base) { return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: salt, iterations: PBKDF2_ITER, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']); });
  }
  function onUnlocked() {
    byCode = {};
    DB.forEach(function (p) { byCode[p.jupas_code] = p; });
    restore();
    rebuildAll();
  }
  function tryUnlock(pc, rem) {
    return deriveKey(pc, b64ToBytes(encBlob.salt))
      .then(function (key) { return crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64ToBytes(encBlob.iv) }, key, b64ToBytes(encBlob.data)); })
      .then(function (plain) {
        DB = JSON.parse(new TextDecoder().decode(plain));
        if (rem) { try { localStorage.setItem(LS_KEY, pc); } catch (e) {} }
        $('lock').style.display = 'none'; $('app').style.display = '';
        onUnlocked();
        return true;
      }).catch(function () { try { localStorage.removeItem(LS_KEY); } catch (e) {} return false; });
  }
  function showLock(msg) { $('app').style.display = 'none'; $('lock').style.display = 'flex'; $('lock-err').textContent = msg || ''; }
  function wireLock() {
    function submit() { var pc = $('passcode').value; if (!pc) return; $('lock-err').textContent = ''; tryUnlock(pc, true).then(function (ok) { if (!ok) { $('lock-err').textContent = t().lockErr; $('passcode').value = ''; } }); }
    $('unlock-btn').addEventListener('click', submit);
    $('passcode').addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });
  }

  // ---------------- wiring ----------------
  function wire() {
    $('lang-en').addEventListener('click', function () { setLang('en'); });
    $('lang-zh').addEventListener('click', function () { setLang('zh'); });
    $('in-name').addEventListener('input', function () { state.name = str(this.value, 40); saveSoon(); });
    $('in-class').addEventListener('input', function () { state.klass = str(this.value, 10); saveSoon(); });
    $('off-date').addEventListener('input', function () { state.offersDate = str(this.value, 20); saveSoon(); });
    $('remember').addEventListener('change', function () {
      remember = this.checked;
      try {
        localStorage.setItem(REM_KEY, remember ? '1' : '0');
        if (remember) save(); else localStorage.removeItem(SAVE_KEY);
      } catch (e) {}
    });
    $('print-btn').addEventListener('click', function () { buildPrint(); window.print(); });
    // "Save as PDF" uses the same print document — the browser's print dialog offers
    // a PDF destination (no third-party PDF library allowed under this site's CSP).
    $('pdf-btn').addEventListener('click', function () { buildPrint(); window.print(); });
  }

  function init() {
    applyStatic(); wire(); wireLock();
    $('lang-en').classList.toggle('active', lang === 'en');
    $('lang-zh').classList.toggle('active', lang === 'zh');
    fetch(ENC_URL, { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (j) {
      encBlob = j; var saved = null; try { saved = localStorage.getItem(LS_KEY); } catch (e) {}
      if (saved) return tryUnlock(saved, false).then(function (ok) { if (!ok) showLock(''); });
      showLock('');
    }).catch(function () { showLock(t().loadErr); });
  }
  init();

  // test hooks
  window.__planner = {
    get state() { return state; },
    setDB: function (db) { DB = db; onUnlocked(); },
    pick: pick,
    grades: buildGrades,
    rebuild: rebuildAll,
    matches: matches,
    tag: slotTag, effUq: effectiveUq,
    print: function () { buildPrint(); return $('print-report').innerHTML; }
  };
})();
