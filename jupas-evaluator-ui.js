/* JUPAS All-in-One Evaluator (TEACHER) — UI + passcode gate + bilingual (EN/中).
   Loads after jupas-evaluator-engine.js and jupas-evaluator-analytics.js.
   Gate mirrors po1career's jupas-choices.js: PBKDF2-SHA256 150k + AES-GCM-256,
   decrypting jupas-evaluator-db.enc.json into the in-memory programmes DB.
   Adapted from JUPASCal (MIT, © 2026 JUPASCal) — see LICENSE. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var PROGRAMMES = null, BY_CODE = new Map();
  var lang = (function () { try { return localStorage.getItem('clp_lang') === 'zh' ? 'zh' : 'en'; } catch (e) { return 'en'; } })();
  var lastPayload = null; // cached so the language toggle can re-render without a re-upload

  var DSE_PTS = { '5**': 7, '5*': 6, '5': 5, '4': 4, '3': 3, '2': 2, '1': 1, 'U': 0, '': 0 };
  var CORE_LABEL = { chi: 'Chinese Language', eng: 'English Language', math: 'Mathematics (Compulsory)' };
  var CORE_LABEL_ZH = { chi: '中國語文', eng: '英國語文', math: '數學（必修）' };
  var ELECT_LABEL = { bafs: 'BAFS', bio: 'Biology', chem: 'Chemistry', chist: 'Chinese History', chinlit: 'Chinese Literature', econ: 'Economics', geog: 'Geography', hist: 'History', ict: 'ICT', m2: 'Maths Ext. (M2)', phys: 'Physics' };
  var ELECT_LABEL_ZH = { bafs: '企業、會計與財務概論', bio: '生物', chem: '化學', chist: '中國歷史', chinlit: '中國文學', econ: '經濟', geog: '地理', hist: '歷史', ict: '資訊及通訊科技', m2: '數學延伸單元二 (M2)', phys: '物理' };
  var INST_ZH = { HKU: '香港大學', CUHK: '香港中文大學', HKUST: '香港科技大學', CityUHK: '香港城市大學', PolyU: '香港理工大學', HKBU: '香港浸會大學', EdUHK: '香港教育大學', LingnanU: '嶺南大學', HKMU: '香港都會大學', SSSDP: '指定專業/界別課程資助計劃 (SSSDP)' };
  var ELIG_LABEL_ZH = { CHI: '中文', ENG: '英文', MATH: '數學', CSD: '公民與社會發展', 'Elective 1': '選修科一', 'Elective 2': '選修科二', EXTRA: '額外要求' };
  var CMP_BAND = { aboveUQ: 'above-uq', aboveM: 'above-median', aboveLQ: 'above-lq', belowLQ: 'below-lq', nodata: 'no-score' };
  // jupascal's 7 native risk tiers (safe/fair/risky/high-risk/unsafe/blocked/unknown)
  // collapsed to our 5 display tags, grouped by jupascal's OWN tone (good/good/warn/
  // alert/bad/bad/neutral) — blocked and unsafe share jupascal's "bad" tone but stay
  // split here since eligibility is a hard gate, not a soft risk read.
  var CHANCE_DISPLAY = { safe: 'likely', fair: 'likely', risky: 'moderate', 'high-risk': 'risky', unsafe: 'risky', blocked: 'ineligible', unknown: 'nodata' };
  var CHANCE_CLS = { likely: 'p-safe', moderate: 'p-mod', risky: 'p-risky', ineligible: 'p-inelig', nodata: 'p-unk' };
  function chanceKey(label) { return CHANCE_DISPLAY[label] || 'nodata'; }
  var BAND_VERDICT_CLS = { wrong: 'p-inelig', appropriate: 'p-elig', caution: 'p-mod', flexible: 'p-unk', 'no-data': 'p-unk' };
  var REF_KEYS_ZH = { uq: 'UQ', median: '中位數', lq: 'LQ', mean: '平均', expected_score: '預期' };
  var REF_KEYS_EN = { uq: 'UQ', median: 'Median', lq: 'LQ', mean: 'Mean', expected_score: 'Expected' };

  function posCls(b) { return 'p-' + (b === 'above-uq' ? 'uq' : b === 'above-median' ? 'median' : b === 'above-lq' ? 'lq' : b === 'below-lq' ? 'below' : 'na'); }
  function bandRange(b) { return b === 'A' ? '1–3' : b === 'B' ? '4–6' : b === 'C' ? '7–10' : b === 'D' ? '11–15' : '16–20'; }
  function pName(p) { return lang === 'zh' ? (p.name_zh || p.name_en) : p.name_en; }
  function pInst(p) { return lang === 'zh' ? (INST_ZH[p.institution] || p.institution) : p.institution; }
  function electLabel(k) { return lang === 'zh' ? (ELECT_LABEL_ZH[k] || k) : (ELECT_LABEL[k] || k); }
  function coreLabel(k) { return lang === 'zh' ? (CORE_LABEL_ZH[k] || k) : (CORE_LABEL[k] || k); }
  function eligLabel(l) { return lang === 'zh' ? (ELIG_LABEL_ZH[l] || l) : l; }

  /* ---------- static / dynamic text dictionary ---------- */
  // 6-level score-band phrases for the Chance reasons list (jupascal's getScoreBand
  // buckets) — distinct from posLabel below, which is the Position column's own
  // simpler 4-level band.
  var SCORE_BAND_PHRASE = {
    en: { uq: 'at or above this programme’s upper quartile (or its estimated equivalent)', med: 'at or above the median but below the upper quartile', 'near-med': 'just below the median', 'near-lq': 'around the lower quartile', 'below-lq': 'below the lower quartile', 'far-below-lq': 'well below the lower quartile' },
    zh: { uq: '達到或高於本課程的上四分位數（或其估算值）', med: '達到或高於中位數，但低於上四分位數', 'near-med': '僅低於中位數', 'near-lq': '接近下四分位數', 'below-lq': '低於下四分位數', 'far-below-lq': '遠低於下四分位數' }
  };
  var STR = {
    en: {
      title: 'JUPAS Evaluator (Teacher)', eyebrow: '🔐 STAFF · JUPAS EVALUATOR', heroTitle: 'JUPAS All-in-One Evaluator',
      heroSubtitle: 'Upload a student’s exported "JUPAS Choices" PDF. Scores, eligibility, competitiveness, admission chance and list strategy are computed against the live JUPAS 2026 database (422 programmes, offer statistics 2012–2025).',
      heroDisc: 'Unofficial reference tool. Figures come from past intakes and don’t guarantee this year’s results — always confirm programme details, entry requirements and the latest data on the official <a href="https://www.jupas.edu.hk" target="_blank" rel="noopener">JUPAS website</a> and each university’s own website before advising students.',
      panel1h: '1 · Load the student PDF', dropBig: 'Drop the student’s PDF here, or click to choose',
      dropHint: 'The file the student exported from the JUPAS Choice Evaluator page.', printBtn: '🖨 Print / Save as PDF report',
      studentH: 'Student', choicesH: 'The 20 choices',
      choicesHint: 'Position shows the computed score against this programme’s past-year quartiles (score only). Chance combines eligibility, the score position, AND the empirical success rate of the exact list position (Band A–E) the choice was placed in. Band flags whether the placement matches how Band-A-dependent the programme’s offers are; Eligible checks minimum subject/grade requirements; Intake is the programme’s published first-year quota.',
      detailH: 'Full detail per choice', notesH: 'Counseling notes', suggH: 'Good-fit programmes not chosen', suggSub: '(eligible · at/above median)',
      footer: 'Unofficial teacher tool, for internal guidance only. Admission statistics (median / LQ, offer rates) are from PAST intakes and do not guarantee this year’s results. © 2026 PLK No.1 W.H. Cheung College · Career Team. Includes a third-party scoring engine used under licence.',
      metaName: 'Name', metaClass: 'Class', metaCno: 'Class no.', metaGen: 'Generated',
      gSubject: 'Subject', gLevel: 'Level', gPts: 'Pts (7-scale)', b5Prefix: 'Best-5 (common 7-point scale): ',
      csdLabel: 'Citizenship and Social Development', csdAttained: 'Attained', csdNotAttained: 'Not Attained',
      th: ['Choice', 'Programme', 'Score', 'Position', 'Chance', 'Intake', 'Eligible', 'Band', 'Note'],
      posLabel: { 'above-uq': '≥ UQ', 'above-median': 'Median–UQ', 'above-lq': 'LQ–Median', 'below-lq': '< LQ', 'no-score': 'No data' },
      chanceLabel: { likely: 'Likely', moderate: 'Moderate', risky: 'Risky', ineligible: 'Ineligible', nodata: 'No data' },
      bandVerdict: { wrong: 'Wrong band position', appropriate: 'Appropriate', caution: 'Consider Band A', flexible: 'Flexible', 'no-data': 'No data' },
      bandAPct: function (pct) { return 'Band A ' + pct + '%'; },
      yes: 'Yes', no: 'No', noUqData: 'No UQ data', noteIneligible: 'Ineligible', noteSelfDiffers: 'Self-rated differs',
      emptySlot: '(empty slot)', emptyChoice: '(empty)', notFound: 'Not found in database', jupasLink: 'JUPAS ↗',
      bandSep: function (band) { return 'Band ' + band + ' · choices ' + bandRange(band); },
      mEligible: 'Eligible', mScore: 'Computed score', mPosition: 'Position (score vs past intakes)',
      mChance: function (no, band) { return 'Overall chance — placed as Choice ' + no + ' (Band ' + band + ')'; },
      mRefMedLq: 'Ref median / LQ', mQuota: 'Quota / competition', mBandA: 'Band-A offer share',
      mNonAcademic: 'Non-academic requirement',
      naType: { interview: 'Interview', portfolio: 'Portfolio', audition: 'Audition', 'physical-test': 'Physical test', 'practical-test': 'Practical test', 'written-test': 'Written test', 'aptitude-test': 'Aptitude test', oea: 'OEA note' },
      naPre: 'before results', naPost: 'after results', naBoth: 'before & after results', naTentative: 'only if necessary — unconfirmed',
      failsPrefix: 'Fails: ', failEntry: function (label, need, got) { return label === 'CSD' ? (eligLabel(label) + ' (need Attained, got ' + got + ')') : (eligLabel(label) + ' (need ' + need + ', got ' + got + ')'); },
      selfDiffers: function (a, b) { return 'Student self-assessed position (' + a + ') differs from computed (' + b + ')'; },
      remarkPrefix: 'Student remark: ', applicantsPerPlace: ' applicants/place',
      suggEmpty: 'No additional at/above-median eligible programmes found.',
      suggScore: function (y, m) { return 'your ' + y + ' vs median ' + (m != null ? m : '—'); },
      msgDbUnlocked: function (n) { return 'Database unlocked: ' + n + ' programmes.'; },
      msgFileTooBig: 'File too large — upload the small PDF the page exported.',
      msgNoData: 'No JUPAS data found in that PDF. Make sure it was exported by the student page.',
      msgCouldNotRead: 'Could not read data from that PDF.', msgCouldNotReadFile: 'Could not read that file.',
      msgDbLocked: 'Database not unlocked.', lockErr: 'Incorrect passcode 通行碼錯誤'
    },
    zh: {
      title: 'JUPAS 評估工具（教師版）', eyebrow: '🔐 職員專用 · JUPAS 評估工具', heroTitle: 'JUPAS 全方位評估工具',
      heroSubtitle: '上載學生從「JUPAS 選科自評工具」匯出的 PDF。系統會根據 JUPAS 2026 最新資料庫（422 個課程、2012–2025 收生統計）計算分數、資格、競爭力、錄取機會及選科策略。',
      heroDisc: '非官方參考工具。數據來自過往年度收生資料，不保證本年度結果 — 建議學生前務必於官方<a href="https://www.jupas.edu.hk" target="_blank" rel="noopener">JUPAS 網站</a>及各大學網站核實課程資料及最新入學要求。',
      panel1h: '1 · 上載學生 PDF', dropBig: '將學生的 PDF 拖放至此，或按此選擇檔案',
      dropHint: '學生從 JUPAS 選科自評工具頁面匯出的檔案。', printBtn: '🖨 列印／儲存為 PDF 報告',
      studentH: '學生資料', choicesH: '20 個選項',
      choicesHint: '「位置」只反映計算分數對比該課程過往年度四分位數（純分數比較）。「機會」則結合資格、分數位置，以及該選項所處志願順序（Band A–E）的實際過往取錄率。「Band」標示所置放的志願組別是否配合該課程對 Band A 申請人的依賴程度；「資格」檢查是否符合最低科目／成績要求；「學額」為課程公布的首年學額。',
      detailH: '各選項詳情', notesH: '輔導筆記', suggH: '未選但合適的課程', suggSub: '（符合資格・達到或高於中位數）',
      footer: '本工具只供教師內部參考，並非官方工具。收生統計數字（中位數／下四分位、取錄率）均為過往年度資料，不代表本年度結果。© 2026 保良局第一張永慶中學・升學輔導及生涯規劃組。當中包含第三方計分引擎，並依授權條款使用。',
      metaName: '姓名', metaClass: '班別', metaCno: '學號', metaGen: '匯出時間',
      gSubject: '科目', gLevel: '等級', gPts: '分數（7 分制）', b5Prefix: '最佳五科（共通 7 分制）：',
      csdLabel: '公民與社會發展', csdAttained: '達標', csdNotAttained: '未達標',
      th: ['志願', '課程', '分數', '位置', '機會', '學額', '資格', 'Band', '備註'],
      posLabel: { 'above-uq': '≥ UQ', 'above-median': '中位數 – UQ', 'above-lq': 'LQ – 中位數', 'below-lq': '< LQ', 'no-score': '沒有資料' },
      // jupascal.com's own ZH wording for the underlying tiers, reused verbatim rather than
      // invented afresh: safe->較有把握, fair->機會尚可 (both collapse into our "Likely" —
      // 較有把握 picked as the stronger/primary member), risky->較為進取 ("Moderate"),
      // high-risk->風險較高 + unsafe->危險 (both collapse into "Risky" — 風險較高 picked as
      // the closer literal match to the English word "Risky"), blocked->未達入學要求
      // ("Ineligible"), unknown->暫無數據 ("No data").
      chanceLabel: { likely: '較有把握', moderate: '較為進取', risky: '風險較高', ineligible: '未達入學要求', nodata: '暫無數據' },
      bandVerdict: { wrong: '組別錯誤', appropriate: '組別恰當', caution: '建議置 Band A', flexible: '彈性', 'no-data': '沒有資料' },
      bandAPct: function (pct) { return 'Band A 佔 ' + pct + '%'; },
      yes: '是', no: '否', noUqData: '沒有 UQ 資料', noteIneligible: '不符資格', noteSelfDiffers: '自評有出入',
      emptySlot: '（空白）', emptyChoice: '（空白）', notFound: '資料庫中找不到', jupasLink: 'JUPAS ↗',
      bandSep: function (band) { return 'Band ' + band + ' · 第 ' + bandRange(band) + ' 志願'; },
      mEligible: '資格', mScore: '計算分數', mPosition: '位置（分數對比過往收生資料）',
      mChance: function (no, band) { return '整體錄取機會 — 置於第 ' + no + ' 志願（Band ' + band + '）'; },
      mRefMedLq: '參考中位數／LQ', mQuota: '學額／競爭情況', mBandA: 'Band A 取錄佔比',
      mNonAcademic: '非學術要求',
      naType: { interview: '面試', portfolio: '作品集', audition: '甄選試演', 'physical-test': '體能測試', 'practical-test': '實習測試', 'written-test': '筆試', 'aptitude-test': '性向測試', oea: '其他經驗及成就 (OEA)' },
      naPre: '放榜前', naPost: '放榜後', naBoth: '放榜前及後', naTentative: '僅在有需要時——未確定',
      failsPrefix: '未達到：', failEntry: function (label, need, got) { if (label === 'CSD') { var g = got === 'Attained' ? '達標' : '未達標'; return eligLabel(label) + '（需要 達標，你是 ' + g + '）'; } return eligLabel(label) + '（需要 ' + need + '，你是 ' + got + '）'; },
      selfDiffers: function (a, b) { return '學生自評位置（' + a + '）與系統計算位置（' + b + '）不同'; },
      remarkPrefix: '學生備註：', applicantsPerPlace: ' 人爭一位',
      suggEmpty: '未有其他符合資格且達到或高於中位數的課程。',
      suggScore: function (y, m) { return '你的分數 ' + y + '，中位數 ' + (m != null ? m : '—'); },
      msgDbUnlocked: function (n) { return '資料庫已解鎖：共 ' + n + ' 個課程。'; },
      msgFileTooBig: '檔案太大 — 請上載本頁匯出的小型 PDF 檔案。',
      msgNoData: '此 PDF 中找不到 JUPAS 資料，請確認是學生頁面匯出的檔案。',
      msgCouldNotRead: '無法從該 PDF 讀取資料。', msgCouldNotReadFile: '無法讀取該檔案。',
      msgDbLocked: '資料庫尚未解鎖。', lockErr: 'Incorrect passcode 通行碼錯誤'
    }
  };
  function S() { return STR[lang]; }

  /* ---------- structured flag/reason/note -> localized text ---------- */
  var MSGT = {
    en: {
      emptySlots: function (d) { return d.n + ' of 20 choice slots are empty — unused opportunities.'; },
      duplicates: function (d) { return 'Duplicate choice(s): ' + d.codes.join(', ') + ' — wastes a slot.'; },
      ineligibleCount: function (d) { return d.n + ' choice(s) fail minimum requirements — effectively wasted unless grades change.'; },
      noSafe: function () { return 'No "safe" choice (none at/above median) — high risk of receiving no offer.'; },
      noSafetyNet: function () { return 'No safety net in Bands C–E (an above-median, eligible choice placed lower down).'; },
      mostlyReach: function () { return 'Most choices are below LQ (reaches) — consider adding realistic options.'; },
      overConcentrated: function (d) { return 'Over-concentrated: ' + d.n + ' choices at ' + d.inst + '.'; },
      summaryLine: function (d) { return 'Filled ' + d.filled + '/20 choices: ' + d.safe + ' safe (≥ median), ' + d.moderate + ' moderate (LQ–median), ' + d.risky + ' reach (< LQ), ' + d.unknown + ' without score data.'; },
      noProblems: function () { return 'No structural problems detected in the choice list.'; },
      addSafeChoices: function () { return 'Recommend at least 2–3 solid "safe" choices in Bands C–E as a fallback.'; },
      notEligible: function () { return 'Does not meet minimum entry requirements'; },
      noScoreBenchmark: function () { return 'No published median/mean/expected score to compare against, or no computed total — chance can’t be estimated.'; },
      scoreBandPosition: function (d) { return 'Your computed score is ' + SCORE_BAND_PHRASE.en[d.scoreBand] + '.'; },
      slotRole: function (d) {
        if (d.index === 0) return 'Placed as Choice 1 (A1) — the most lenient tier; an ambitious score is fine here.';
        if (d.index === 1) return 'Placed as Choice 2 (A2) — treated as a realistic target.';
        if (d.index === 2) return 'Placed as Choice 3 (A3) — your Band-A anchor; this one should be more certain.';
        return 'Placed as Choice ' + (d.index + 1) + ', outside Band A — only a score at/above the upper quartile counts as a real shot here.';
      },
      fewPlacesDampened: function (d) { return 'Small quota (' + d.quota + ' places) — even this strong a read is treated more cautiously internally, since a tiny intake makes the cut-off swing a lot year to year (may not change the tag shown, but it is the more conservative edge of "Likely")'; },
      nonAcademicDuties: function (d) {
        var s = S();
        var parts = d.items.map(function (it) { return window.JUPASAnalytics.placedBand(it.no) + it.no + ' ' + it.types.map(function (ty) { return s.naType[ty] || ty; }).join('/'); });
        return d.n + ' choice(s) carry a non-academic admission requirement (interview/portfolio/etc.) — confirm arrangements for: ' + parts.join(', ');
      }
    },
    zh: {
      emptySlots: function (d) { return '20 個選項中有 ' + d.n + ' 個仍空白——未善用的機會。'; },
      duplicates: function (d) { return '重複選項：' + d.codes.join('、') + '——浪費一個選項名額。'; },
      ineligibleCount: function (d) { return d.n + ' 個選項未達最低入學要求——除非成績有變，否則等同浪費。'; },
      noSafe: function () { return '沒有「穩妥」選項（沒有一個達到或高於中位數）——落空風險高。'; },
      noSafetyNet: function () { return 'C 至 E 組別中沒有安全網（即一個達中位數以上、符合資格的選項排在較後）。'; },
      mostlyReach: function () { return '大部分選項低於下四分位數（屬「搏一搏」）——建議加入較實際的選項。'; },
      overConcentrated: function (d) { return '選項過於集中：' + d.n + ' 個選項均在 ' + d.inst + '。'; },
      summaryLine: function (d) { return '已填 ' + d.filled + '/20 個選項：' + d.safe + ' 個穩妥（≥中位數）、' + d.moderate + ' 個中等（下四分位至中位數）、' + d.risky + ' 個搏一搏（<下四分位）、' + d.unknown + ' 個沒有分數資料。'; },
      noProblems: function () { return '選項名單未發現結構性問題。'; },
      addSafeChoices: function () { return '建議在 C 至 E 組別加入最少 2 至 3 個穩妥選項作為保底。'; },
      notEligible: function () { return '未符合最低入學要求'; },
      noScoreBenchmark: function () { return '沒有公布的中位數／平均分／預期分數作比較，或未能計算總分——無法評估機會。'; },
      scoreBandPosition: function (d) { return '你的計算分數' + SCORE_BAND_PHRASE.zh[d.scoreBand] + '。'; },
      slotRole: function (d) {
        if (d.index === 0) return '置於第 1 志願（A1）——最寬鬆的一級，大膽／進取的分數也可接受。';
        if (d.index === 1) return '置於第 2 志願（A2）——視為較實際的目標。';
        if (d.index === 2) return '置於第 3 志願（A3）——你在 Band A 的「錨」，應該更有把握。';
        return '置於第 ' + (d.index + 1) + ' 志願，Band A 以外——只有達到或高於上四分位數的分數才視為有實質機會。';
      },
      fewPlacesDampened: function (d) { return '學額較少（' + d.quota + ' 個）——即使分數本屬「高」評級，內部仍會較審慎看待，因為學額太少令收生分數線每年波動較大（標籤未必因此改變，但屬於「高」評級中較保守的一端）'; },
      nonAcademicDuties: function (d) {
        var s = S();
        var parts = d.items.map(function (it) { return window.JUPASAnalytics.placedBand(it.no) + it.no + ' ' + it.types.map(function (ty) { return s.naType[ty] || ty; }).join('／'); });
        return d.n + ' 個選項附帶非學術收生要求（面試／作品集等）——請確認以下安排：' + parts.join('、');
      }
    }
  };
  function tmsg(o) { var f = MSGT[lang][o.key]; return f ? f(o) : ''; }

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function flash(t, ok) { var e = $('msg'); if (!e) return; e.textContent = t; e.className = 'msg ' + (ok ? 'ok' : 'err'); }
  function indexProgrammes(arr) { PROGRAMMES = arr; BY_CODE = new Map(); arr.forEach(function (p) { BY_CODE.set(p.jupas_code.toUpperCase(), p); }); }

  /* ---------- passcode gate (PBKDF2 + AES-GCM, same as jupas-choices.js) ---------- */
  var PBKDF2_ITER = 150000, GATE_LS = 'jupas_eval_pass', ENC_URL = 'jupas-evaluator-db.enc.json', encBlob = null;
  function b64ToBytes(b64) { return Uint8Array.from(atob(b64), function (c) { return c.charCodeAt(0); }); }
  function deriveKey(passcode, salt) {
    return crypto.subtle.importKey('raw', new TextEncoder().encode(passcode), 'PBKDF2', false, ['deriveKey'])
      .then(function (base) {
        return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: salt, iterations: PBKDF2_ITER, hash: 'SHA-256' },
          base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
      });
  }
  function decryptDb(passcode) {
    return deriveKey(passcode, b64ToBytes(encBlob.salt)).then(function (key) {
      return crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64ToBytes(encBlob.iv) }, key, b64ToBytes(encBlob.data));
    }).then(function (plain) { return JSON.parse(new TextDecoder().decode(plain)); });
  }
  function tryUnlock(passcode, remember) {
    return decryptDb(passcode).then(function (arr) {
      indexProgrammes(arr);
      if (remember) { try { localStorage.setItem(GATE_LS, passcode); } catch (e) {} }
      $('lock').style.display = 'none'; $('app').style.display = '';
      $('db-status').textContent = S().msgDbUnlocked(arr.length); $('db-status').className = 'msg ok';
      return true;
    }).catch(function () { try { localStorage.removeItem(GATE_LS); } catch (e) {} return false; });
  }
  function showLock(msg) { $('app').style.display = 'none'; $('lock').style.display = 'flex'; $('lock-err').textContent = msg || ''; }
  function wireLock() {
    function submit() {
      var pc = $('passcode').value; if (!pc) return;
      $('lock-err').textContent = 'Checking… 核對中…';
      tryUnlock(pc, true).then(function (ok) { if (!ok) { $('lock-err').textContent = S().lockErr; $('passcode').value = ''; } });
    }
    $('unlock-btn').addEventListener('click', submit);
    $('passcode').addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });
  }
  function initGate() {
    wireLock();
    fetch(ENC_URL, { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (j) {
      encBlob = j;
      var saved = null; try { saved = localStorage.getItem(GATE_LS); } catch (e) {}
      if (saved) return tryUnlock(saved, false).then(function (ok) { if (!ok) showLock(''); });
      showLock('');
    }).catch(function () { showLock('Could not load the encrypted database file. 無法載入加密資料庫檔案。'); });
  }

  /* ---------- PDF parsing ---------- */
  function parsePdf(file, cb) {
    if (file.size > 5 * 1024 * 1024) { flash(S().msgFileTooBig, false); return; }
    var rd = new FileReader();
    rd.onload = function () {
      try {
        var buf = new Uint8Array(rd.result), str = '';
        for (var i = 0; i < buf.length; i++) str += String.fromCharCode(buf[i]);
        var m = str.match(/JCDATA:([A-Za-z0-9+\/=]+)/);
        if (!m) { flash(S().msgNoData, false); return; }
        cb(JSON.parse(decodeURIComponent(escape(atob(m[1])))));
      } catch (e) { flash(S().msgCouldNotRead, false); }
    };
    rd.onerror = function () { flash(S().msgCouldNotReadFile, false); };
    rd.readAsArrayBuffer(file);
  }

  /* ---------- % deviation helpers ---------- */
  function medComparison(ev) {
    return ev.comparisons.find(function (x) { return x.key === 'median'; }) || ev.comparisons.find(function (x) { return x.key === 'mean' || x.key === 'expected_score'; });
  }
  function medPctText(ev) {
    var c = medComparison(ev); if (!c) return '';
    var sign = c.percent >= 0 ? '+' : '';
    return sign + c.percent.toFixed(0) + '%';
  }
  function refBreakdown(ev) {
    var refMap = lang === 'zh' ? REF_KEYS_ZH : REF_KEYS_EN;
    return ev.comparisons.map(function (c) {
      var sign = c.percent >= 0 ? '+' : '';
      return (refMap[c.key] || c.label) + ' ' + sign + c.percent.toFixed(0) + '%';
    }).join(' · ');
  }
  function noUqNote(ref) { return ref.uq == null ? '<div class="pos-note">' + esc(S().noUqData) + '</div>' : ''; }

  // Non-academic requirement (interview/portfolio/…) display text for one item.
  function naItemText(item) {
    var s = S();
    var label = s.naType[item.type] || item.type;
    if (window.JUPASAnalytics.isTentativeNonAcademic(item)) return esc(label) + ' <span style="color:var(--muted);font-weight:600">(' + esc(s.naTentative) + ')</span>';
    var timing = item.timing === 'both' ? s.naBoth : item.timing === 'pre-results' ? s.naPre : item.timing === 'post-results' ? s.naPost : '';
    return esc(timing ? label + ' · ' + timing : label);
  }

  /* ---------- rendering ---------- */
  function render(payload, opts) {
    opts = opts || {};
    if (!PROGRAMMES) { flash(S().msgDbLocked, false); return; }
    lastPayload = payload;
    flash('', true);
    var s = S();
    var grades = window.JUPASEngine.gradesFromPdfPayload(payload);
    var csdRaw = (payload.core || {}).csd; // 'attained' | 'notattained' | undefined (older PDF, assumed Attained)

    $('meta').innerHTML = '<span><b>' + esc(s.metaName) + ':</b> ' + esc(payload.name || '—') + '</span>' +
      '<span><b>' + esc(s.metaClass) + ':</b> ' + esc(payload.klass || '—') + '</span>' +
      '<span><b>' + esc(s.metaCno) + ':</b> ' + esc(payload.cno || '—') + '</span>' +
      '<span><b>' + esc(s.metaGen) + ':</b> ' + esc(payload.generated || '—') + '</span>';
    var rows = '<tr><th>' + esc(s.gSubject) + '</th><th>' + esc(s.gLevel) + '</th><th>' + esc(s.gPts) + '</th></tr>', entries = [];
    ['chi', 'eng', 'math'].forEach(function (k) { var lv = (payload.core || {})[k]; if (lv) { entries.push([coreLabel(k), lv]); rows += '<tr><td>' + esc(coreLabel(k)) + '</td><td>' + esc(lv) + '</td><td>' + DSE_PTS[lv] + '</td></tr>'; } });
    var csdNotAttained = csdRaw === 'notattained';
    var csdCellText = csdNotAttained ? s.csdNotAttained : s.csdAttained;
    rows += '<tr><td>' + esc(s.csdLabel) + '</td><td>' + (csdNotAttained ? '<span class="warn-inline">' + esc(csdCellText) + '</span>' : esc(csdCellText)) + '</td><td>—</td></tr>';
    (payload.elect || []).forEach(function (e) { if (e && e.lv) { var nm = electLabel(e.s); entries.push([nm, e.lv]); rows += '<tr><td>' + esc(nm) + '</td><td>' + esc(e.lv) + '</td><td>' + DSE_PTS[e.lv] + '</td></tr>'; } });
    $('grades-tbl').innerHTML = rows;
    var best5 = entries.map(function (e) { return DSE_PTS[e[1]] || 0; }).sort(function (a, b) { return b - a; }).slice(0, 5).reduce(function (a, b) { return a + b; }, 0);
    $('b5').textContent = s.b5Prefix + best5;

    var evalAll = window.JUPASEngine.evaluateAll(PROGRAMMES, grades);
    var choices = (payload.choices || []).map(function (c, i) { c = c || {}; return { code: (c.code || '').trim(), intake: c.intake, score: c.score, cmp: c.cmp, remark: c.remark, no: i + 1, _raw: c }; });

    var strat = window.JUPASAnalytics.listStrategy(choices, evalAll);
    renderSummaryTable(choices, evalAll);
    renderChoices(choices, evalAll);
    renderNotes(strat, choices, evalAll);
    var chosen = choices.filter(function (c) { return c.code; }).map(function (c) { return c.code; });
    renderSuggestions(window.JUPASAnalytics.suggestions(PROGRAMMES, grades, chosen, 12));

    $('results').classList.remove('hidden');
    if (opts.scroll !== false) $('results').scrollIntoView({ behavior: 'smooth' });
  }

  function renderChoices(choices, evalAll) {
    var s = S();
    var box = $('choices'); box.innerHTML = ''; var lastBand = '';
    choices.forEach(function (c) {
      var band = window.JUPASAnalytics.placedBand(c.no);
      if (band !== lastBand) { lastBand = band; var sep = document.createElement('div'); sep.className = 'band-sep'; sep.textContent = s.bandSep(band); box.appendChild(sep); }
      if (!c.code) { var empty = document.createElement('div'); empty.className = 'choice'; empty.style.opacity = .5; empty.innerHTML = '<div class="ch-head"><span class="ch-badge">' + band + c.no + '</span><span class="ch-inst">' + esc(s.emptyChoice) + '</span></div>'; box.appendChild(empty); return; }
      var ev = evalAll.get(c.code.toUpperCase());
      var div = document.createElement('div'); div.className = 'choice band-' + band + (ev && !ev.eligibility.eligible ? ' inelig' : '');
      if (!ev) { div.innerHTML = '<div class="ch-head"><span class="ch-badge">' + band + c.no + '</span><span class="ch-code">' + esc(c.code) + '</span><span class="warn-inline">' + esc(s.notFound) + '</span></div>'; box.appendChild(div); return; }
      var p = ev.programme, chance = window.JUPASAnalytics.chanceForChoice(ev, c.no);
      var h = '<div class="ch-head"><span class="ch-badge">' + band + c.no + '</span><span class="ch-code">' + esc(p.jupas_code) + '</span>' +
        '<span class="ch-name">' + esc(pName(p)) + '</span><span class="ch-inst">' + esc(pInst(p)) + '</span>' +
        (p.jupas_url ? '<a class="ch-link" href="' + esc(p.jupas_url) + '" target="_blank" rel="noopener">' + esc(s.jupasLink) + '</a>' : '') + '</div>';
      var ref = window.JUPASEngine.refScores(p);
      var studentScore = parseFloat(c.score);
      var mismatch = (!isNaN(studentScore) && ev.calculation.totalScore) && Math.abs(studentScore - ev.calculation.totalScore) > 1.5;
      var chanceCls = CHANCE_CLS[chanceKey(chance.label)] || 'p-unk';
      var refBreak = refBreakdown(ev);
      var m = '<div class="metrics">';
      m += '<div class="metric"><div class="k">' + esc(s.mEligible) + '</div><div class="v"><span class="pill ' + (ev.eligibility.eligible ? 'p-elig' : 'p-inelig') + '">' + (ev.eligibility.eligible ? s.yes : s.no) + '</span></div></div>';
      m += '<div class="metric"><div class="k">' + esc(s.mScore) + '</div><div class="v">' + ev.calculation.totalScore + (mismatch ? ' <span class="warn-inline">⚠ vs ' + esc(c.score) + '</span>' : (c.score ? ' <span style="color:var(--muted);font-weight:600">(' + esc(c.score) + ')</span>' : '')) + '</div></div>';
      m += '<div class="metric"><div class="k">' + esc(s.mPosition) + '</div><div class="v"><span class="pill ' + posCls(ev.band) + '">' + esc(s.posLabel[ev.band]) + '</span>' + (refBreak ? '<div class="pos-pct">' + esc(refBreak) + '</div>' : '') + noUqNote(ref) + '</div></div>';
      m += '<div class="metric"><div class="k">' + esc(s.mChance(c.no, band)) + '</div><div class="v"><span class="pill ' + chanceCls + '">' + esc(s.chanceLabel[chanceKey(chance.label)]) + '</span></div></div>';
      m += '<div class="metric"><div class="k">' + esc(s.mRefMedLq) + '</div><div class="v">' + (ref.median != null ? ref.median : '—') + (ref.lq != null ? ' / ' + ref.lq : '') + (ref.source !== 'actual' && ref.median != null ? ' <span style="color:var(--muted)">(' + ref.source + ')</span>' : '') + '</div></div>';
      var comp = window.JUPASAnalytics.competition(p);
      m += '<div class="metric"><div class="k">' + esc(s.mQuota) + '</div><div class="v">' + (p.quota != null ? p.quota : '—') + (comp ? ' · ' + comp.ratio.toFixed(0) + esc(s.applicantsPerPlace) : '') + '</div></div>';
      var dep = window.JUPASAnalytics.bandADependency(p);
      m += '<div class="metric"><div class="k">' + esc(s.mBandA) + '</div><div class="v">' + (dep ? Math.round(dep.share * 100) + '%' : '—') + '</div></div>';
      var naItems = p.non_academic || [];
      if (naItems.length) m += '<div class="metric"><div class="k">' + esc(s.mNonAcademic) + '</div><div class="v">' + naItems.map(naItemText).join('<br>') + '</div></div>';
      m += '</div>';
      var r = '<ul class="reasons">';
      chance.reasons.forEach(function (x) { r += '<li>' + esc(tmsg(x)) + '</li>'; });
      if (!ev.eligibility.eligible) { var fails = ev.eligibility.details.filter(function (d) { return !d.pass; }).map(function (d) { return s.failEntry(d.label, d.need, d.got); }); r += '<li class="warn-inline">' + esc(s.failsPrefix) + esc(fails.join('; ')) + '</li>'; }
      if (c.cmp && CMP_BAND[c.cmp] && CMP_BAND[c.cmp] !== ev.band && ev.band !== 'no-score') { r += '<li class="warn-inline">' + esc(s.selfDiffers(s.posLabel[CMP_BAND[c.cmp]], s.posLabel[ev.band])) + '</li>'; }
      if (c.remark) r += '<li>' + esc(s.remarkPrefix) + esc(c.remark) + '</li>';
      r += '</ul>';
      div.innerHTML = h + m + r; box.appendChild(div);
    });
  }

  function renderNotes(strat, choices, evalAll) {
    var list = window.JUPASAnalytics.counselingNotes(strat, choices, evalAll);
    $('notes').innerHTML = list.map(function (n) {
      var prefix = n.level ? (n.level === 'err' ? '⚠ ' : '• ') : '';
      return '<li>' + prefix + esc(tmsg(n)) + '</li>';
    }).join('');
  }
  function renderSuggestions(list) {
    var box = $('suggestions'), s = S();
    if (!list.length) { box.innerHTML = '<div class="hint">' + esc(s.suggEmpty) + '</div>'; return; }
    box.innerHTML = list.map(function (sg) {
      return '<div class="sugg"><span class="code">' + esc(sg.code) + '</span>' +
        '<span style="flex:1;min-width:220px">' + esc(pName(sg.prog)) + ' <span class="ch-inst">' + esc(pInst(sg.prog)) + '</span></span>' +
        '<span>' + esc(s.suggScore(sg.yourScore, sg.median)) + ' <span class="pill p-safe">+' + (sg.pct || 0).toFixed(0) + '%</span></span>' +
        (sg.prog.jupas_url ? ' <a class="ch-link" href="' + esc(sg.prog.jupas_url) + '" target="_blank" rel="noopener">' + esc(s.jupasLink) + '</a>' : '') + '</div>';
    }).join('');
  }

  /* ---------- summary table of the 20 choices ---------- */
  function renderSummaryTable(choices, evalAll) {
    var tb = $('summary-rows'); if (!tb) return; tb.innerHTML = ''; var lastBand = ''; var s = S();
    choices.forEach(function (c) {
      var band = window.JUPASAnalytics.placedBand(c.no), bcls = 'band-' + band.toLowerCase();
      if (band !== lastBand) {
        lastBand = band;
        var sep = document.createElement('tr'); sep.className = 'band-sep ' + bcls;
        sep.innerHTML = '<td colspan="9">' + esc(s.bandSep(band)) + '</td>';
        tb.appendChild(sep);
      }
      var tr = document.createElement('tr'); tr.className = bcls;
      var badge = '<span class="band-badge">' + band + c.no + '</span>';
      if (!c.code) { tr.innerHTML = '<td>' + badge + '</td><td class="t-empty" colspan="8">' + esc(s.emptySlot) + '</td>'; tb.appendChild(tr); return; }
      var ev = evalAll.get(c.code.toUpperCase());
      if (!ev) { tr.innerHTML = '<td>' + badge + '</td><td class="t-prog"><span class="c">' + esc(c.code) + '</span></td><td colspan="7" class="t-note">' + esc(s.notFound) + '</td>'; tb.appendChild(tr); return; }
      var p = ev.programme, chance = window.JUPASAnalytics.chanceForChoice(ev, c.no);
      var ref = window.JUPASEngine.refScores(p);
      var pctTxt = medPctText(ev);
      var bandChk = window.JUPASAnalytics.bandPlacementCheck(p, c.no);
      var noteParts = [];
      if (!ev.eligibility.eligible) noteParts.push(s.noteIneligible);
      else if (c.cmp && CMP_BAND[c.cmp] && CMP_BAND[c.cmp] !== ev.band && ev.band !== 'no-score') noteParts.push(s.noteSelfDiffers);
      var firmNa = (p.non_academic || []).filter(function (na) { return !window.JUPASAnalytics.isTentativeNonAcademic(na); });
      if (firmNa.length) noteParts.push(firmNa.map(function (na) { return s.naType[na.type] || na.type; }).join('/'));
      var note = noteParts.join(' · ');
      var bandCls = BAND_VERDICT_CLS[bandChk.verdict] || 'p-unk';
      var bandSub = bandChk.dependency ? '<div class="pos-pct">' + esc(s.bandAPct(Math.round(bandChk.dependency.share * 100))) + '</div>' : '';
      tr.innerHTML =
        '<td>' + badge + '</td>' +
        '<td class="t-prog"><span class="c">' + esc(p.jupas_code) + '</span>' + esc(pName(p)) + '<span class="i">' + esc(pInst(p)) + '</span></td>' +
        '<td>' + (ev.calculation.totalScore != null ? ev.calculation.totalScore : '—') + '</td>' +
        '<td><span class="pill ' + posCls(ev.band) + '">' + esc(s.posLabel[ev.band]) + '</span>' + (pctTxt ? '<div class="pos-pct">' + esc(pctTxt) + '</div>' : '') + noUqNote(ref) + '</td>' +
        '<td><span class="pill ' + (CHANCE_CLS[chanceKey(chance.label)] || 'p-unk') + '">' + esc(s.chanceLabel[chanceKey(chance.label)]) + '</span></td>' +
        '<td>' + (p.quota != null ? p.quota : '—') + '</td>' +
        '<td><span class="pill ' + (ev.eligibility.eligible ? 'p-elig' : 'p-inelig') + '">' + (ev.eligibility.eligible ? s.yes : s.no) + '</span></td>' +
        '<td><span class="pill ' + bandCls + '">' + esc(s.bandVerdict[bandChk.verdict]) + '</span>' + bandSub + '</td>' +
        '<td class="t-note">' + esc(note) + '</td>';
      tb.appendChild(tr);
    });
  }

  /* ---------- static text / language toggle ---------- */
  function applyStaticText() {
    var s = S();
    document.documentElement.lang = lang === 'zh' ? 'zh-HK' : 'en';
    document.title = s.title;
    var lb = $('lang-en'), lz = $('lang-zh');
    if (lb) lb.classList.toggle('active', lang === 'en');
    if (lz) lz.classList.toggle('active', lang === 'zh');
    var map = {
      't-eyebrow': s.eyebrow, 't-title': s.heroTitle, 't-subtitle': s.heroSubtitle, 't-panel1h': s.panel1h,
      't-dropbig': s.dropBig, 't-drophint': s.dropHint, 'print-btn': s.printBtn,
      't-studenth': s.studentH, 't-choicesh': s.choicesH, 't-choiceshint': s.choicesHint,
      't-detailh': s.detailH, 't-notesh': s.notesH, 't-suggh': s.suggH, 't-suggsub': s.suggSub
    };
    Object.keys(map).forEach(function (id) { var el = $(id); if (el) el.textContent = map[id]; });
    var hd = $('t-herodisc'); if (hd) hd.innerHTML = '<span aria-hidden="true">⚠️</span><span>' + s.heroDisc + '</span>';
    var ft = $('t-footer'); if (ft) ft.textContent = s.footer;
    var th = $('summary-thead'); if (th) th.innerHTML = '<tr>' + s.th.map(function (h) { return '<th>' + esc(h) + '</th>'; }).join('') + '</tr>';
  }
  function setLang(l) {
    lang = l; try { localStorage.setItem('clp_lang', l); } catch (e) {}
    applyStaticText();
    if (lastPayload) render(lastPayload, { scroll: false });
  }

  /* ---------- wire upload ---------- */
  function wireUpload() {
    var drop = $('drop'), file = $('file');
    file.addEventListener('change', function (e) { if (e.target.files[0]) parsePdf(e.target.files[0], render); });
    ['dragover', 'dragenter'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('drag'); }); });
    ['dragleave', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('drag'); }); });
    drop.addEventListener('drop', function (e) { var f = e.dataTransfer.files[0]; if (f) parsePdf(f, render); });
  }
  function wireLang() {
    var lb = $('lang-en'), lz = $('lang-zh');
    if (lb) lb.addEventListener('click', function () { setLang('en'); });
    if (lz) lz.addEventListener('click', function () { setLang('zh'); });
  }

  applyStaticText();
  initGate();
  wireUpload();
  wireLang();
  window.__renderPayload = render;
})();
