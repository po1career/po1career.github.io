/* JUPAS Programme Finder+ — UI controller + passcode gate.
   Loads after jupas-finder-engine.js, -analytics.js, -core.js.
   Gate mirrors jupas-tool.js (PBKDF2-SHA256 150k + AES-GCM-256) but decrypts a JSON DB.
   Adapted from JUPASCal (MIT, © 2026 JUPASCal). */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var F = window.JUPASFinder;
  var DB = null, results = null, input = null;
  var activeCats = new Set();
  var shortlist = new Set(), targets = new Set(), remember = true;
  var MAX_TARGETS = 3, SAVE_KEY = 'jupas_finder_state', REM_KEY = 'jupas_finder_remember';
  function resultFor(code) { return results ? results.find(function (r) { return r.prog.jupas_code === code; }) : null; }
  var lang = (function () { try { return localStorage.getItem('clp_lang') === 'zh' ? 'zh' : 'en'; } catch (e) { return 'en'; } })();
  var GROUP_CAP = 30;

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

  var S = {
    en: { home: '← Back to home', title: 'JUPAS Programme Finder+', subtitle: "Enter your grades, then discover the programmes that fit you — and how close you are to the ones you're aiming for.",
      s1: '1 · Your details & HKDSE grades', cs: 'Citizenship & Social Development', att: 'Attained', notatt: 'Not attained',
      electhint: 'Choose 2–4 elective subjects and your level for each.', find: 'Find programmes', pickSubj: '— subject —', lv: 'Level',
      s2: '3 · Where you stand', s3: '2 · Narrow it down', search: 'Search programmes, keywords, or JS code…', allInst: 'All institutions',
      lic: 'Licensed professions only', incin: "Include ones I'm not eligible for yet", clear: 'Clear filters',
      s4: "✨ You're nearly there", s4hint: 'Eligible programmes just below the line — a little push could get you in.',
      s5: 'Programmes that fit you', need2: 'Enter your 3 core grades and at least 2 electives, then press “Find programmes”.',
      heroDisc: 'For reference only. Always verify with the official JUPAS website (www.jupas.edu.hk) and each university’s own website. This tool bears no responsibility for any admission decision.',
      lock: 'Enter passcode', locksub: 'For PLK No.1 students only', lockHome: '← Back to home',
      unlockBtn: 'Unlock', pcPh: 'Passcode', lockErr: 'Incorrect passcode', loadErr: 'Could not load data file.',
      tiers: { strong: 'Strong match', reach: 'Within reach', stretch: 'Reach / aim higher', nodata: 'No score data', ineligible: 'Not eligible yet' },
      count: function (n) { return n + ' programme' + (n === 1 ? '' : 's') + ' shown'; },
      progress: function (a, t) { return 'You can aim for <span class="big-num">' + a + '</span> programmes now (eligible & within reach), out of ' + t + ' you qualify for.'; },
      qualifyFor: 'You currently qualify for: ', unlock: function (s, f, to, n) { return '💡 Raising <b>' + s + '</b> from ' + f + ' to ' + to + ' would bring <b>' + n + '</b> more programmes within reach.'; },
      yourScore: 'Your score', med: 'median', lq: 'LQ', chance: 'Chance', applicants: 'applicants/place', bandA: 'Band-A offers', quota: 'quota',
      whatif: 'What would help', elig: 'Requirements', eligOk: 'You meet all minimum requirements.', details: 'Details', hide: 'Hide', official: 'Official page ↗',
      noneFit: 'No programmes match yet. Try adding electives, widening the category filter, or ticking “include ones I’m not eligible for yet”.',
      remember: 'Save my grades on this computer', sharednote: 'On a shared or school computer, untick the box — your grades then stay only in this tab.',
      targets: '🎯 My targets', targetsHint: 'Your dream programmes and exactly what it would take to reach them.',
      shortlist: '⭐ My shortlist', printbtn: '🖨 Print my shortlist',
      moreN: function (n) { return '+ ' + n + ' more'; },
      footerHtml: 'Unofficial reference tool for PLK No.1 students — not affiliated with JUPAS. Scores are computed per each programme\'s own formula and are NOT comparable across institutions; admission statistics and chances are from PAST intakes and do not guarantee this year\'s results. Always verify on www.jupas.edu.hk.<br><br>Scoring engine and database adapted from <a href="https://github.com/JUPASCal/JUPASCal.github.io" target="_blank" rel="noopener">JUPASCal</a> under the MIT License — © 2026 JUPASCal. See jupas-finder-LICENSE.txt.',
      footer: '' },
    zh: { home: '← 返回主頁', title: 'JUPAS 課程搜尋器＋', subtitle: '輸入成績，找出適合你的課程，並看看你距離心儀課程有多近。',
      s1: '1 · 你的資料及文憑試成績', cs: '公民與社會發展科', att: '達標', notatt: '未達標',
      electhint: '選擇 2 至 4 個選修科及其等級。', find: '搜尋課程', pickSubj: '— 科目 —', lv: '等級',
      s2: '3 · 你的位置', s3: '2 · 收窄範圍', search: '搜尋課程、關鍵字或 JS 編號…', allInst: '所有院校',
      lic: '只顯示專業資格課程', incin: '包括我暫未符合資格的課程', clear: '清除篩選',
      s4: '✨ 你即將達標', s4hint: '你已符合資格、僅略低於收生線的課程——再努力一點就有機會。',
      s5: '適合你的課程', need2: '輸入三科核心成績及至少兩科選修，然後按「搜尋課程」。',
      heroDisc: '僅供參考。報讀前請以 JUPAS 官方網站（www.jupas.edu.hk）及各大學網站為準。本工具概不就任何收生決定承擔責任。',
      lock: '請輸入通行碼', locksub: '只供保良局第一張永慶中學學生使用', lockHome: '← 返回主頁',
      unlockBtn: '解鎖', pcPh: '通行碼', lockErr: '通行碼錯誤', loadErr: '無法載入資料檔。',
      tiers: { strong: '理想之選', reach: '有機會', stretch: '需努力／挑戰', nodata: '沒有分數資料', ineligible: '暫未符合資格' },
      count: function (n) { return '顯示 ' + n + ' 個課程'; },
      progress: function (a, t) { return '你現時有機會報讀 <span class="big-num">' + a + '</span> 個課程（符合資格且有機會），在你符合資格的 ' + t + ' 個課程之中。'; },
      qualifyFor: '你目前符合資格的範疇：', unlock: function (s, f, to, n) { return '💡 將<b>' + s + '</b>由 ' + f + ' 提升至 ' + to + '，可令多 <b>' + n + '</b> 個課程變得有機會。'; },
      yourScore: '你的分數', med: '中位數', lq: '下四分位', chance: '機會', applicants: '人爭一位', bandA: 'Band A 取錄', quota: '學額',
      whatif: '如何提升', elig: '入學要求', eligOk: '你已符合所有最低要求。', details: '詳情', hide: '收起', official: '官方網頁 ↗',
      noneFit: '暫無符合的課程。可嘗試加選修科、放寬範疇篩選，或勾選「包括我暫未符合資格的課程」。',
      remember: '在此電腦儲存我的成績', sharednote: '如使用共用或學校電腦，請取消勾選，成績只會留在此分頁。',
      targets: '🎯 我的目標', targetsHint: '你的心儀課程，以及達成所需的條件。',
      shortlist: '⭐ 我的候選名單', printbtn: '🖨 列印候選名單',
      moreN: function (n) { return '再顯示 ' + n + ' 個'; },
      footerHtml: '本工具只供保良局第一張永慶中學學生參考，並非 JUPAS 官方工具。分數按各課程自己的公式計算，不可跨院校比較；收生統計及機會均為過往年度數據，不代表本年度結果。報讀前請於 www.jupas.edu.hk 核實。<br><br>計分引擎及資料庫改編自 <a href="https://github.com/JUPASCal/JUPASCal.github.io" target="_blank" rel="noopener">JUPASCal</a>，採用 MIT 授權 — © 2026 JUPASCal。詳見 jupas-finder-LICENSE.txt。',
      footer: '' }
  };
  function t() { return S[lang]; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function catLabel(key) { var c = CATEGORIES.find(function (x) { return x.key === key; }); return c ? c[lang] : key; }
  function pName(p) { return lang === 'zh' ? (p.name_zh || p.name_en) : p.name_en; }
  function pInst(p) { return lang === 'zh' ? (p.institution_zh || p.institution) : p.institution; }
  function electLabel(k) { return lang === 'zh' ? (F.ELECT_LABEL_ZH[k] || k) : (F.ELECT_LABEL[k] || k); }

  /* ---------- grade inputs ---------- */
  function lvOptions(sel, val) {
    return LEVELS.map(function (l) { return '<option value="' + l + '"' + (l === val ? ' selected' : '') + '>' + (l || t().lv) + '</option>'; }).join('');
  }
  function buildCores() {
    $('cores').innerHTML = CORE_FIELDS.map(function (c) {
      return '<div class="grow"><label>' + esc(c[lang]) + '</label><select class="lv" data-core="' + c.k + '">' + lvOptions(null, '') + '</select></div>';
    }).join('');
    $('cores').querySelectorAll('select').forEach(function (s) { s.addEventListener('change', onGradeChange); });
  }
  function buildElectives() {
    var rows = '';
    for (var i = 0; i < 4; i++) {
      rows += '<div class="grow"><select class="subj" data-el="' + i + '"><option value="">' + t().pickSubj + '</option>' +
        ELECTS.map(function (k) { return '<option value="' + k + '">' + esc(electLabel(k)) + '</option>'; }).join('') +
        '</select><select class="lv" data-ellv="' + i + '">' + lvOptions(null, '') + '</select></div>';
    }
    $('electives').innerHTML = rows;
    $('electives').querySelectorAll('select').forEach(function (s) { s.addEventListener('change', onGradeChange); });
  }
  function readInput() {
    var inp = { name: $('in-name').value, klass: $('in-class').value, csAttained: $('cs-att').classList.contains('on'), electives: [] };
    $('cores').querySelectorAll('select').forEach(function (s) { inp[s.getAttribute('data-core')] = s.value; });
    for (var i = 0; i < 4; i++) {
      var subj = $('electives').querySelector('[data-el="' + i + '"]').value;
      var lv = $('electives').querySelector('[data-ellv="' + i + '"]').value;
      if (subj && lv) inp.electives.push({ subj: subj, lv: lv });
    }
    return inp;
  }
  function inputReady(inp) { return inp.chi && inp.eng && inp.math && inp.electives.length >= 2; }
  var onGradeChange = function () { saveState(); };

  /* ---------- compute + render ---------- */
  function runPipeline() {
    var grades = F.buildGrades(input);
    results = F.evaluateAll(DB, grades, input.csAttained);
    $('results-area').style.display = '';
    buildInstOptions();
    renderProgress();
    renderCatChips();
    renderUnlockTip();
    render();
    renderTargets(); renderShortlist();
    saveState();
  }
  function compute() {
    input = readInput();
    if (!inputReady(input)) { $('b5note').textContent = t().need2; return; }
    $('b5note').textContent = '';
    runPipeline();
    $('results-area').scrollIntoView({ behavior: 'smooth' });
  }

  function currentFilterOpts() {
    return {
      cats: Array.from(activeCats), matchAll: false, inst: $('inst').value,
      query: $('search').value, licensedOnly: $('lic').checked,
      includeIneligible: $('incIn').checked, sort: $('sort').value
    };
  }

  function renderProgress() {
    var aim = results.filter(function (r) { return r.eligible && F.TIER_RANK[r.tier] >= F.TIER_RANK.reach; }).length;
    var elig = results.filter(function (r) { return r.eligible; }).length;
    $('progress').innerHTML = t().progress(aim, elig);
  }

  function renderCatChips() {
    var counts = F.categoryCounts(results, CATEGORIES); // eligible & within-reach+
    // overview sentence (section 2)
    var top = CATEGORIES.map(function (c) { return { c: c, n: counts[c.key] || 0 }; }).filter(function (x) { return x.n; }).sort(function (a, b) { return b.n - a.n; });
    $('cat-counts').innerHTML = '<span style="font-weight:700;font-size:0.88rem">' + t().qualifyFor + '</span>' +
      top.map(function (x) { return '<span class="tag" style="font-size:0.78rem">' + esc(catLabel(x.c.key)) + ' ' + x.n + '</span>'; }).join(' ');
    // interactive filter chips (section 3) with counts
    $('chips').innerHTML = CATEGORIES.map(function (c) {
      return '<button class="chip' + (activeCats.has(c.key) ? ' active' : '') + '" data-cat="' + c.key + '">' +
        esc(c[lang]) + '<span class="cc">' + (counts[c.key] || 0) + '</span></button>';
    }).join('');
    $('chips').querySelectorAll('.chip').forEach(function (b) {
      b.addEventListener('click', function () { var k = b.getAttribute('data-cat'); activeCats.has(k) ? activeCats.delete(k) : activeCats.add(k); renderCatChips(); render(); });
    });
  }

  function renderUnlockTip() {
    var bu = F.bestUnlock(DB, input);
    var best = (bu.options || []).filter(function (o) { return o.unlocked > 0; })[0];
    $('unlock-tip').innerHTML = best ? t().unlock(esc(best.subject), best.from, best.to, best.unlocked) : '';
  }

  function buildInstOptions() {
    var sel = $('inst'), prev = sel.value;
    var insts = [].concat.apply([], []); var set = {};
    DB.forEach(function (p) { set[p.institution] = (lang === 'zh' ? (p.institution_zh || p.institution) : p.institution); });
    var keys = Object.keys(set).sort();
    sel.innerHTML = '<option value="">' + t().allInst + '</option>' + keys.map(function (k) { return '<option value="' + esc(k) + '">' + esc(set[k]) + '</option>'; }).join('');
    sel.value = prev;
  }

  function gapHtml(r) {
    if (r.medPct == null) return '';
    var cls = r.medDelta >= 0 ? 'gap-pos' : 'gap-neg';
    var sign = r.medDelta >= 0 ? '+' : '';
    return ' <span class="' + cls + '">' + sign + r.medDelta.toFixed(1) + ' (' + sign + r.medPct.toFixed(0) + '%)</span>';
  }
  var CHANCE_TXT = { Strong: { en: 'Strong', zh: '很高' }, Likely: { en: 'Likely', zh: '高' }, Possible: { en: 'Possible', zh: '中等' }, Stretch: { en: 'Stretch', zh: '需挑戰' }, Unlikely: { en: 'Unlikely', zh: '偏低' }, Ineligible: { en: 'Ineligible', zh: '不符資格' }, Unknown: { en: 'Unknown', zh: '未知' } };
  function chanceTxt(l) { return (CHANCE_TXT[l] || { en: l, zh: l })[lang]; }

  function card(r) {
    var p = r.prog, s = t(), code = esc(p.jupas_code);
    var tags = (p.categories || []).map(function (c) { return '<span class="tag">' + esc(catLabel(c)) + '</span>'; }).join('');
    var lic = p.licensed ? '<span class="lic">' + (lang === 'zh' ? '專業資格' : 'Licensed') + '</span>' : '';
    var estim = (r.estimated && r.medScore != null) ? ' <span class="estim">' + (lang === 'zh' ? '估算' : 'est.') + '</span>' : '';
    var scoreLine = '<div class="scoreline">' + esc(s.yourScore) + ' <b>' + r.score + '</b>' +
      (r.medScore != null ? ' · ' + esc(s.med) + ' ' + r.medScore + estim + gapHtml(r) : '') + '</div>';
    var chanceLine = '<div class="scoreline">' + esc(s.chance) + ': <b>' + esc(chanceTxt(r.chance.label)) + '</b></div>';
    var comp = r.chance.competition, dep = r.chance.dependency, nums = [];
    if (comp) nums.push(comp.ratio.toFixed(0) + ' ' + esc(s.applicants));
    if (dep) nums.push(esc(s.bandA) + ' ' + Math.round(dep.share * 100) + '%');
    if (r.trend && Math.abs(r.trend.pct) >= 15) nums.push('<span class="' + (r.trend.pct > 0 ? 'trend-up' : 'trend-dn') + '">' + (r.trend.pct > 0 ? '↑' : '↓') + ' ' + (lang === 'zh' ? '報讀' : 'apps') + '</span>');
    var numLine = nums.length ? '<div class="numbers">' + nums.join(' · ') + '</div>' : '';
    var notyet = '';
    if (!r.eligible) {
      var f = r.eval.eligibility.details.filter(function (d) { return !d.pass; })[0];
      if (f) { var what = f.label.indexOf('Elective') === 0 ? (f.note || (lang === 'zh' ? '指定選修科' : 'a required elective')) : (f.label === 'CSD' ? (lang === 'zh' ? '公民科達標' : 'CS attained') : f.label + ' ≥ ' + f.need); notyet = '<div class="notyet">' + (lang === 'zh' ? '未符合：需 ' : 'Not yet — needs ') + esc(what) + '</div>'; }
    }
    var star = '<button class="iconbtn' + (shortlist.has(p.jupas_code) ? ' on' : '') + '" data-star="' + code + '" title="shortlist">★</button>';
    var tgtOn = targets.has(p.jupas_code);
    var tgt = '<button class="iconbtn' + (tgtOn ? ' on' : '') + '" data-target="' + code + '"' + ((!tgtOn && targets.size >= MAX_TARGETS) ? ' disabled' : '') + ' title="target">🎯</button>';
    return '<div class="prog' + (r.eligible ? '' : ' inelig') + '" data-code="' + code + '">' +
      '<div class="code-row"><span class="code">' + code + '</span><span class="tier t-' + r.tier + '">' + esc(s.tiers[r.tier]) + '</span>' + lic +
      '<span class="card-acts">' + star + tgt + '</span></div>' +
      '<div class="pname">' + esc(pName(p)) + '</div><div class="inst">' + esc(pInst(p)) + '</div>' +
      scoreLine + chanceLine + numLine + notyet + '<div class="tags">' + tags + '</div>' +
      '<button class="det-btn" data-det="' + code + '">' + esc(s.details) + ' ▾</button>' +
      '<div class="detail" id="det-' + code + '"></div></div>';
  }

  function detailHtml(r) {
    var p = r.prog, s = t();
    var h = '';
    // requirements
    var fails = r.eval.eligibility.details.filter(function (d) { return !d.pass; });
    h += '<div class="k">' + esc(s.elig) + '</div>';
    if (!fails.length) h += '<div style="color:var(--vsafe);font-weight:700">' + esc(s.eligOk) + '</div>';
    else h += fails.map(function (d) {
      var need = d.label === 'CSD' ? (lang === 'zh' ? '達標' : 'Attained') : ('≥ ' + d.need);
      var what = (d.label.indexOf('Elective') === 0) ? (d.note || (lang === 'zh' ? '指定選修科' : 'required elective')) : d.label;
      return '<div class="fail">✗ ' + esc(what) + ' — ' + (lang === 'zh' ? '需要 ' : 'need ') + esc(need) + (d.got && d.got !== 'None' && d.label.indexOf('Elective') !== 0 ? (lang === 'zh' ? '，你是 ' : ', you have ') + esc(d.got) : '') + '</div>';
    }).join('');
    // offer stats
    var comp = window.JUPASAnalytics.competition(p), dep = window.JUPASAnalytics.bandADependency(p);
    h += '<div class="k">' + (lang === 'zh' ? '收生數據' : 'Admissions data') + '</div>';
    h += '<div>' + (p.quota != null ? esc(s.quota) + ': ' + p.quota : '') + (comp ? ' · ' + comp.ratio.toFixed(0) + ' ' + esc(s.applicants) : '') + (dep ? ' · ' + esc(s.bandA) + ' ' + Math.round(dep.share * 100) + '%' : '') + '</div>';
    // what-if
    var wi = F.whatIf(p, input);
    var ups = wi.bumps.filter(function (b) { return b.deltaScore > 0; }).slice(0, 5);
    if (ups.length) {
      h += '<div class="k">' + esc(s.whatif) + '</div>';
      h += ups.map(function (b) {
        return '<div class="wi-row"><span>' + esc(b.subject) + ' ' + b.from + '→' + b.to + '</span><span class="wi-up">+' + b.deltaScore + (b.tierChanged ? ' → ' + esc(s.tiers[b.newTier]) : '') + '</span></div>';
      }).join('');
    }
    if (p.url) h += '<div style="margin-top:8px"><a class="det-btn" href="' + esc(p.url) + '" target="_blank" rel="noopener">' + esc(s.official) + '</a></div>';
    return h;
  }

  function render() {
    var s = t();
    var list = F.filterRank(results, currentFilterOpts());
    $('count').textContent = s.count(list.length);
    // closest reaches (motivation) — uses category filter context
    var close = F.closestReaches(results, currentFilterOpts(), 6);
    if (close.length) { $('close-panel').style.display = ''; $('closest').innerHTML = close.map(card).join(''); }
    else { $('close-panel').style.display = 'none'; }

    if (!list.length) { $('results').innerHTML = '<div class="empty">' + esc(s.noneFit) + '</div>'; return; }
    var g = F.group(list);
    var order = ['strong', 'reach', 'stretch', 'nodata', 'ineligible'];
    var html = '';
    order.forEach(function (tier) {
      var arr = g[tier]; if (!arr.length) return;
      html += '<div class="group-h"><span class="dot d-' + (tier === 'ineligible' ? 'nodata' : tier) + '"></span>' + esc(s.tiers[tier]) + ' (' + arr.length + ')</div>';
      var shown = arr.slice(0, GROUP_CAP);
      html += '<div class="grid">' + shown.map(card).join('') + '</div>';
      if (arr.length > GROUP_CAP) html += '<div class="showmore"><button class="btn-ghost btn" data-more="' + tier + '">' + esc(s.moreN(arr.length - GROUP_CAP)) + '</button></div>';
    });
    $('results').innerHTML = html;
    // store full groups for show-more
    render._groups = g;
  }

  /* ---------- targets / shortlist / print / persistence ---------- */
  function renderTargets() {
    var s = t();
    if (!targets.size) { $('targets-panel').style.display = 'none'; return; }
    $('targets-panel').style.display = '';
    $('targets').innerHTML = Array.from(targets).map(function (code) {
      var r = resultFor(code); if (!r) return '';
      var p = r.prog, rm = F.roadmapTo(p, input), cls = 'plan', body = '';
      var head = '<div class="rh">🎯 ' + esc(p.jupas_code) + ' ' + esc(pName(p)) + ' <span class="inst">' + esc(pInst(p)) + '</span>' +
        '<button class="iconbtn" data-target="' + esc(p.jupas_code) + '" style="float:right">✕</button></div>';
      function tail(rm) { return '<div class="numbers" style="margin-top:4px">' + r.score + ' → ' + rm.endScore + (rm.med != null ? ' (' + esc(s.med) + ' ' + rm.med + ')' : '') + '</div>'; }
      if (rm.status === 'onTrack') { cls = 'ok'; body = '<div>' + (lang === 'zh' ? '你已達到或高於去年中位數 — 保持下去！' : 'You\'re at or above last year\'s median — keep it up!') + ' (' + esc(s.yourScore) + ' ' + r.score + (rm.med != null ? ' · ' + esc(s.med) + ' ' + rm.med : '') + ')</div>'; }
      else if (rm.status === 'noData') { body = '<div>' + (lang === 'zh' ? '此課程沒有公布收生分數作比較。' : 'No published cut-off to compare against — explore it on the official page.') + '</div>'; }
      else if (rm.status === 'needCS') { cls = 'hard'; body = '<div class="fail">' + (lang === 'zh' ? '先要在公民與社會發展科達標。' : 'First you must attain Citizenship & Social Development.') + '</div>'; }
      else if (rm.status === 'blockedSubject') { cls = 'hard'; body = '<div class="fail">' + (lang === 'zh' ? '此課程需要你未修讀的選修科：' : 'Needs an elective you didn\'t take: ') + esc((rm.missing || []).join(' / ')) + '</div>'; }
      else {
        var steps = rm.steps.map(function (st) { return '<span class="step">' + esc(st.subject) + ' ' + st.from + '→' + st.to + '</span>'; }).join('');
        if (rm.reached) { body = '<div>' + (lang === 'zh' ? '達到去年中位數的路線：' : 'A path to last year\'s median:') + '</div>' + steps + tail(rm); }
        else { cls = 'hard'; body = '<div>' + (lang === 'zh' ? '非常競爭 — 即使提升以下科目仍可能未達中位數，請先全力鞏固：' : 'Very competitive — even raising these may not reach the median; focus on maximising:') + '</div>' + steps + tail(rm); }
      }
      return '<div class="road ' + cls + '">' + head + body + '</div>';
    }).join('');
  }

  function renderShortlist() {
    var s = t();
    if (!shortlist.size) { $('shortlist-panel').style.display = 'none'; return; }
    $('shortlist-panel').style.display = '';
    var rows = Array.from(shortlist).map(function (code) { return resultFor(code); }).filter(Boolean);
    var head = '<tr><th></th><th>JS</th><th>' + (lang === 'zh' ? '課程' : 'Programme') + '</th><th>' + esc(s.yourScore) + '</th><th>' + esc(s.med) + '</th><th>' + esc(s.chance) + '</th><th></th></tr>';
    var body = rows.map(function (r) {
      var p = r.prog;
      return '<tr><td><button class="iconbtn on" data-star="' + esc(p.jupas_code) + '">★</button></td>' +
        '<td><b>' + esc(p.jupas_code) + '</b></td>' +
        '<td>' + esc(pName(p)) + '<br><span class="inst">' + esc(pInst(p)) + '</span></td>' +
        '<td>' + r.score + ' <span class="tier t-' + r.tier + '">' + esc(s.tiers[r.tier]) + '</span></td>' +
        '<td>' + (r.medScore != null ? r.medScore + gapHtml(r) : '—') + '</td>' +
        '<td>' + esc(chanceTxt(r.chance.label)) + '</td>' +
        '<td>' + (p.url ? '<a class="ch-link" href="' + esc(p.url) + '" target="_blank" rel="noopener">↗</a>' : '') + '</td></tr>';
    }).join('');
    $('compare').innerHTML = head + body;
  }

  function buildPrintReport() {
    var s = t(), entries = [];
    ['chi', 'eng', 'math'].forEach(function (k) { if (input[k]) entries.push([CORE_FIELDS.find(function (c) { return c.k === k; })[lang], input[k]]); });
    (input.electives || []).forEach(function (e) { entries.push([electLabel(e.subj), e.lv]); });
    var grTbl = '<table><tr><th>' + (lang === 'zh' ? '科目' : 'Subject') + '</th><th>' + (lang === 'zh' ? '等級' : 'Level') + '</th></tr>' +
      entries.map(function (e) { return '<tr><td>' + esc(e[0]) + '</td><td>' + esc(e[1]) + '</td></tr>'; }).join('') +
      '<tr><td>' + esc(s.cs) + '</td><td>' + (input.csAttained ? s.att : s.notatt) + '</td></tr></table>';
    var slRows = Array.from(shortlist).map(function (code) { return resultFor(code); }).filter(Boolean).map(function (r) {
      var p = r.prog;
      return '<tr><td>' + esc(p.jupas_code) + '</td><td>' + esc(pName(p)) + ' (' + esc(pInst(p)) + ')</td><td>' + r.score + '</td><td>' + (r.medScore != null ? r.medScore : '—') + '</td><td>' + esc(s.tiers[r.tier]) + '</td><td>' + esc(chanceTxt(r.chance.label)) + '</td></tr>';
    }).join('');
    var sl = shortlist.size ? '<h2>⭐ ' + esc(lang === 'zh' ? '我的候選課程' : 'My shortlist') + '</h2><table><tr><th>JS</th><th>' + (lang === 'zh' ? '課程' : 'Programme') + '</th><th>' + esc(s.yourScore) + '</th><th>' + esc(s.med) + '</th><th>' + (lang === 'zh' ? '適配' : 'Fit') + '</th><th>' + esc(s.chance) + '</th></tr>' + slRows + '</table>' : '';
    $('print-report').innerHTML = '<h1>' + esc(s.title) + '</h1>' +
      '<p>' + esc(input.name || '') + (input.klass ? ' · ' + esc(input.klass) : '') + ' · ' + new Date().toISOString().slice(0, 10) + '</p>' +
      '<h2>' + (lang === 'zh' ? '我的成績' : 'My grades') + '</h2>' + grTbl + sl +
      '<p style="font-size:9px;color:#555;margin-top:14px">' + (lang === 'zh' ? '非官方參考；分數按各課程公式計算，不可跨院校比較；數據為過往年度。請於 www.jupas.edu.hk 核實。' : 'Unofficial reference; scores are per-programme and not comparable across institutions; statistics are from past years. Verify on www.jupas.edu.hk.') + '</p>';
  }

  function saveState() {
    try {
      localStorage.setItem(REM_KEY, remember ? '1' : '0');
      if (!remember) { localStorage.removeItem(SAVE_KEY); return; }
      localStorage.setItem(SAVE_KEY, JSON.stringify({ input: readInput(), shortlist: Array.from(shortlist), targets: Array.from(targets) }));
    } catch (e) {}
  }
  function applyInputToUI(inp) {
    if (!inp) return;
    $('in-name').value = inp.name || ''; $('in-class').value = inp.klass || '';
    $('cs-att').classList.toggle('on', inp.csAttained !== false); $('cs-not').classList.toggle('on', inp.csAttained === false);
    $('cores').querySelectorAll('select').forEach(function (sel) { sel.value = inp[sel.getAttribute('data-core')] || ''; });
    for (var i = 0; i < 4; i++) {
      var e = (inp.electives || [])[i] || {};
      var subj = $('electives').querySelector('[data-el="' + i + '"]'), lv = $('electives').querySelector('[data-ellv="' + i + '"]');
      if (subj) subj.value = e.subj || ''; if (lv) lv.value = e.lv || '';
    }
  }
  function restoreState() {
    try {
      remember = localStorage.getItem(REM_KEY) !== '0'; $('remember').checked = remember;
      var raw = localStorage.getItem(SAVE_KEY); if (!raw) return false;
      var st = JSON.parse(raw); shortlist = new Set(st.shortlist || []); targets = new Set(st.targets || []);
      applyInputToUI(st.input); return !!(st.input && inputReady(st.input));
    } catch (e) { return false; }
  }

  function toggleDetail(b) {
    var code = b.getAttribute('data-det'), panel = $('det-' + code);
    if (!panel) return;
    if (panel.classList.contains('open')) { panel.classList.remove('open'); panel.innerHTML = ''; b.textContent = t().details + ' ▾'; return; }
    panel.innerHTML = detailHtml(resultFor(code)); panel.classList.add('open'); b.textContent = t().hide + ' ▴';
  }
  function expandMore(b) {
    var tier = b.getAttribute('data-more'), arr = render._groups[tier];
    var grid = b.parentNode.previousElementSibling;
    grid.innerHTML = arr.map(card).join(''); b.parentNode.remove();
  }
  // single delegated click handler (installed once) for all card actions
  function onAppClick(e) {
    var el = e.target.closest ? e.target.closest('[data-star],[data-target],[data-det],[data-more]') : null;
    if (!el) return;
    if (el.hasAttribute('data-star')) { var c = el.getAttribute('data-star'); shortlist.has(c) ? shortlist.delete(c) : shortlist.add(c); saveState(); refreshAll(); }
    else if (el.hasAttribute('data-target')) { var c2 = el.getAttribute('data-target'); if (targets.has(c2)) targets.delete(c2); else { if (targets.size >= MAX_TARGETS) return; targets.add(c2); } saveState(); refreshAll(); }
    else if (el.hasAttribute('data-det')) toggleDetail(el);
    else if (el.hasAttribute('data-more')) expandMore(el);
  }
  function refreshAll() { render(); renderTargets(); renderShortlist(); }

  /* ---------- static text / language ---------- */
  function applyStatic() {
    var s = t();
    document.documentElement.lang = lang === 'zh' ? 'zh-HK' : 'en';
    $('lang-en').classList.toggle('active', lang === 'en'); $('lang-zh').classList.toggle('active', lang === 'zh');
    var map = { 't-home': s.home, 't-title': s.title, 't-subtitle': s.subtitle, 't-s1': s.s1, 't-cs': s.cs,
      't-electhint': s.electhint, 'find-btn': s.find, 't-s2': s.s2, 't-s3': s.s3, 't-s4': s.s4, 't-s4hint': s.s4hint,
      't-s5': s.s5, 't-lic': s.lic, 't-incin': s.incin, 'clear-btn': s.clear, 'cs-att': s.att, 'cs-not': s.notatt,
      't-remember': s.remember, 't-sharednote': s.sharednote, 't-targets': s.targets, 't-targets-hint': s.targetsHint,
      't-shortlist': s.shortlist, 'print-btn': s.printbtn, 't-herodisc': s.heroDisc,
      't-lock': s.lock, 't-locksub': s.locksub, 't-lockhome': s.lockHome, 'unlock-btn': s.unlockBtn,
      't-sort-fit': lang === 'zh' ? '排序：最適合' : 'Sort: Best fit',
      't-sort-sel': lang === 'zh' ? '排序：我符合的最高門檻' : 'Sort: Most selective I qualify for',
      't-sort-att': lang === 'zh' ? '排序：最接近／高於中位數' : 'Sort: Closest to / above median' };
    Object.keys(map).forEach(function (id) { var el = $(id); if (el) el.textContent = map[id]; });
    $('search').placeholder = s.search; $('in-name').placeholder = lang === 'zh' ? '姓名（可選）' : 'Name (optional)'; $('in-class').placeholder = lang === 'zh' ? '班別' : 'Class';
    var pc = $('passcode'); if (pc) pc.placeholder = s.pcPh;
    var ft = $('t-footer'); if (ft) ft.innerHTML = s.footerHtml;
    document.title = s.title;
  }
  function setLang(l) {
    lang = l; try { localStorage.setItem('clp_lang', l); } catch (e) {}
    var saved = readInput();                         // preserve entered grades across the rebuild
    applyStatic(); buildCores(); buildElectives(); applyInputToUI(saved);
    if (results) { buildInstOptions(); renderCatChips(); render(); renderTargets(); renderShortlist(); }
  }

  /* ---------- wiring ---------- */
  function wire() {
    $('lang-en').addEventListener('click', function () { setLang('en'); });
    $('lang-zh').addEventListener('click', function () { setLang('zh'); });
    $('cs-att').addEventListener('click', function () { $('cs-att').classList.add('on'); $('cs-not').classList.remove('on'); });
    $('cs-not').addEventListener('click', function () { $('cs-not').classList.add('on'); $('cs-att').classList.remove('on'); });
    $('find-btn').addEventListener('click', compute);
    ['search', 'inst', 'sort', 'lic', 'incIn'].forEach(function (id) { $(id).addEventListener('input', function () { if (results) render(); }); $(id).addEventListener('change', function () { if (results) render(); }); });
    $('clear-btn').addEventListener('click', function () { activeCats.clear(); $('search').value = ''; $('inst').value = ''; $('sort').value = 'fit'; $('lic').checked = false; $('incIn').checked = false; if (results) { renderCatChips(); render(); } });
    document.addEventListener('click', onAppClick);                                  // delegated card actions
    $('remember').addEventListener('change', function () { remember = $('remember').checked; saveState(); });
    $('print-btn').addEventListener('click', function () { buildPrintReport(); window.print(); });
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
        if (restoreState()) compute();   // restore saved grades + shortlist/targets and auto-run
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
    setShortlist: function (arr) { shortlist = new Set(arr || []); },
    setTargets: function (arr) { targets = new Set(arr || []); },
    panels: function () { renderTargets(); renderShortlist(); },
    printReport: function () { buildPrintReport(); return $('print-report').innerHTML; },
    roadmap: function (code) { return F.roadmapTo(resultFor(code).prog, input); },
    get results() { return results; }
  };
})();
