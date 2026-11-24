/* ============================================================================
   DSE 人生模擬器 — Phase 2 life engine: the years after August, to age 25 (short) or 30 (long).
   Pure logic (no DOM). Rules + every number: private repo docs/dse-life-paths-design.md §10b.
   Cited figures come from life-paths-stats.js; everything else here is ILLUSTRATIVE and labelled
   so on the in-game 資料來源 page. Randomness is keyed (seed | purpose | age) like the core, so the
   same seed gives the same luck and one choice never reshuffles unrelated draws.
   Exposes window.LifePathsLife.
   ========================================================================== */
(function () {
  'use strict';
  function C() { return window.LifePathsCore; }
  function S() { return window.LifePathsStats; }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  var METERS = ['study', 'skills', 'wellbeing', 'connections', 'money'];

  /* ---------- strengths: pick 2 at the start (owner-approved 2026-11-19; ILLUSTRATIVE) ---------- */
  // start: a head start on the meters · boost: focus choices whose GAINS are bigger (by, else 25%) · soften: losses on
  // that meter are 30% smaller · events: chance multipliers · job: a better chance in every job search. Each strength also
  // opens one special choice in an event (choices with need: <strength>). They never touch DSE results or JUPAS offers.
  // Balance (owner decision 2026-11-19, "trim them"): 能力經驗 and 人脈 feed promotions, job offers and starting pay, so
  // the strengths built on them are trimmed — the biggest gap in average final pay between two pairs of strengths is
  // about 5% at 25 and 12% at 30 (tools/life-paths-test.mjs checks it).
  var STRENGTHS = {
    learner: { start: { study: 5 }, boost: ['study', 'learn'] },
    maker: { start: { skills: 4 }, boost: ['experience', 'perform'], by: 1.15 },
    people: { start: { connections: 5 }, boost: ['explore', 'network'] },
    resilient: { start: { wellbeing: 5 }, soften: 'wellbeing' },
    saver: { start: { money: 5 }, boost: ['parttime', 'save'] },
    creative: { start: { skills: 2, connections: 3 }, events: { award: 1.5 } },
    languages: { start: { study: 2, connections: 3 }, events: { exchange: 1.5, posting: 1.3 }, job: 0.03 },
    leader: { start: { connections: 3, skills: 1 }, events: { society: 1.5, promotion: 1.15 } }
  };
  var STRENGTH_IDS = Object.keys(STRENGTHS), BOOST = 1.25, SOFTEN = 0.7;
  function cleanStrengths(list) {
    var out = [];
    (Array.isArray(list) ? list : []).forEach(function (id) { if (STRENGTHS[id] && out.indexOf(id) < 0 && out.length < 2) out.push(id); });
    return out;
  }
  function has(l, id) { return !!l.strengths && l.strengths.indexOf(id) >= 0; }

  /* ---------- tracks ---------- */
  var TRACKS = {
    ugc: { kind: 'study', years: 4, cred: 'degree' }, selffin: { kind: 'study', years: 4, cred: 'degree', fee: 3 },
    mainland: { kind: 'study', years: 4, cred: 'degree', fee: 2 }, overseas: { kind: 'study', years: 3, cred: 'degree', fee: 6 },
    whs: { kind: 'work', years: 1 },                                  // a working-holiday year after a degree, then job search
    subdeg: { kind: 'study', years: 2, cred: 'subdegree', fee: 2 }, vtc: { kind: 'study', years: 2, cred: 'subdegree', fee: 1 },
    dae: { kind: 'study', years: 1, cred: 'dae', fee: 1 }, senior: { kind: 'study', years: 2, cred: 'degree' },
    topup: { kind: 'study', years: 2, cred: 'degree', fee: 3 }, masters: { kind: 'study', years: 1, cred: 'masters', fee: 5 },
    work: { kind: 'work' }, jobsearch: { kind: 'work' }
  };
  var CRED_RANK = { dse: 0, dae: 1, subdegree: 2, degree: 3, masters: 4 };

  /* ---------- focus choices (effects per YEAR; ×1.6 for a 2-year short-mode turn) ---------- */
  var FOCUS = {
    study: [
      { id: 'study', fx: { study: 8, wellbeing: -3 } }, { id: 'experience', fx: { skills: 8, connections: 2, study: -2 } },
      { id: 'parttime', fx: { money: 8, study: -3, wellbeing: -2 } }, { id: 'balance', fx: { wellbeing: 8, study: 1 } },
      { id: 'explore', fx: { connections: 7, skills: 2, study: -1 } }
    ],
    work: [
      { id: 'perform', fx: { skills: 6, money: 5, wellbeing: -4 } }, { id: 'learn', fx: { study: 6, skills: 2, money: -4, wellbeing: -2 } },
      { id: 'network', fx: { connections: 7 } }, { id: 'wbalance', fx: { wellbeing: 8, money: 1 } },
      { id: 'save', fx: { money: 8, wellbeing: -2 } }
    ]
  };

  /* ---------- events (ILLUSTRATIVE yearly chances; owner-approved gentle list) ---------- */
  // when(life) → eligible; p(life) → chance per YEAR; choices: fx = meter effects (+ optional special)
  function onStudy(l) { return TRACKS[l.track.id].kind === 'study'; }
  function onWork(l) { return TRACKS[l.track.id].kind === 'work'; }
  var EVENTS = [
    { id: 'scholarship', when: function (l) { return onStudy(l) && l.meters.study >= 68; }, p: function (l) { return 0.12 + (l.meters.study - 68) / 120; },
      choices: [{ fx: { money: 10, study: 2, wellbeing: 3 } }] },
    { id: 'exchange', when: function (l) { return onStudy(l) && /ugc|selffin|senior|topup|mainland|overseas/.test(l.track.id) && l.meters.connections >= 35; }, p: function () { return 0.16; },
      choices: [{ fx: { connections: 8, skills: 5, money: -8, wellbeing: 3 }, away: true }, { fx: { study: 3 } },
        { need: 'languages', fx: { connections: 10, skills: 6, money: -8, wellbeing: 3 }, away: true }] },
    { id: 'internship', when: function (l) { return onStudy(l) && l.meters.skills >= 40; }, p: function (l) { return 0.18 + (l.meters.skills - 40) / 200; },
      choices: [{ fx: { skills: 10, connections: 4, wellbeing: -2 }, flag: 'internship' }, { fx: { study: 4 } },
        { need: 'maker', fx: { skills: 12, connections: 4, wellbeing: -3 }, flag: ['internship', 'returnOffer'] }] },
    { id: 'award', when: function (l) { return onStudy(l) && (l.meters.skills >= 55 || l.meters.study >= 65); }, p: function () { return 0.12; },
      choices: [{ fx: { skills: 4, connections: 4, wellbeing: 3 } }] },
    { id: 'mentor', when: function (l) { return l.meters.connections >= 50; }, p: function () { return 0.12; },
      choices: [{ fx: { connections: 6, skills: 3 } }, { fx: {} }, { need: 'people', fx: { connections: 6, skills: 5 }, flag: 'internship' }] },
    { id: 'volunteer', when: function () { return true; }, p: function () { return 0.12; },
      choices: [{ fx: { connections: 4, wellbeing: 4, money: -1 } }, { fx: {} }] },
    { id: 'switchField', when: function (l) { return onStudy(l) && l.track.yearsLeft >= 2 && l.meters.wellbeing < 45 && l.track.id !== 'dae'; }, p: function () { return 0.25; },
      choices: [{ fx: { wellbeing: 8, study: -2 }, special: 'switchField' }, { fx: { study: 3, wellbeing: -2 } }] },
    { id: 'familyMoney', when: function (l) { return l.meters.money < 50; }, p: function () { return 0.10; },
      choices: [{ fx: { money: 10, wellbeing: -4, study: -3 } }, { fx: { money: 6, wellbeing: -1 } }, { need: 'saver', fx: { money: 9, wellbeing: -1 } }] },
    { id: 'familyCare', when: function () { return true; }, p: function () { return 0.06; },
      choices: [{ fx: { wellbeing: -3, connections: 2, study: -2, skills: -1 } }, { fx: { wellbeing: -1 } }] },
    { id: 'moveHome', when: function () { return true; }, p: function () { return 0.05; }, choices: [{ fx: { wellbeing: -2 } }] },
    { id: 'friendPath', when: function (l) { return l.age <= 21; }, p: function () { return 0.12; },
      choices: [{ fx: { connections: 4 } }, { fx: { connections: -2, study: 1 } }] },
    { id: 'overwhelmed', when: function (l) { return l.meters.wellbeing < 35; }, p: function () { return 0.6; },
      choices: [{ fx: { wellbeing: 12, study: -3, skills: -2 } }, { fx: { wellbeing: 10, connections: 3 } },
        { need: 'resilient', fx: { wellbeing: 14, connections: 2, study: -1 } }] },
    { id: 'promotion', when: function (l) { return l.track.id === 'work' && l.meters.skills >= 58; }, p: function (l) { return 0.15 + (l.meters.skills - 58) / 160; },
      choices: [{ fx: { skills: 2, wellbeing: 2 }, special: 'promotion' }] },
    { id: 'jobOffer', when: function (l) { return l.track.id === 'work' && (l.meters.connections >= 55 || l.lastFocus === 'network'); }, p: function () { return 0.22; },
      choices: [{ fx: { connections: 3, wellbeing: -2 }, special: 'changeJob' }, { fx: { wellbeing: 2 } }] },
    { id: 'crunch', when: function (l) { return l.track.id === 'work'; }, p: function () { return 0.14; },
      choices: [{ fx: { skills: 4, wellbeing: -6 }, special: 'crunch' }, { fx: { wellbeing: -1, connections: 2 } }] },
    { id: 'masters', when: function (l) { return l.track.id === 'work' && l.age >= 23 && topCred(l) === 'degree' && l.meters.study >= 50 && !l.flags.mastersPT; }, p: function () { return 0.12; },
      choices: [{ fx: { study: 6, money: -8, wellbeing: -2 }, special: 'mastersPT' }, { fx: {} }] },
    // more decisions (owner-approved 2026-11-19; ILLUSTRATIVE chances). once: at most once in a life
    { id: 'hall', once: true, when: function (l) { return /^(ugc|selffin)$/.test(l.track.id) && l.track.year === 1; }, p: function () { return 0.9; },
      choices: [{ fx: { connections: 6, wellbeing: 3, money: -4 } }, { fx: { money: 3, study: 2 } }] },
    { id: 'society', once: true, when: function (l) { return onStudy(l) && l.meters.connections >= 35; }, p: function () { return 0.18; },
      choices: [{ fx: { connections: 6, skills: 4, study: -3, wellbeing: -2 } }, { fx: { study: 3 } },
        { need: 'leader', fx: { connections: 9, skills: 6, study: -4, wellbeing: -3 }, flag: 'leader' }] },
    { id: 'minor', once: true, when: function (l) { return DEGREE_RE.test(l.track.id) && l.track.year >= 2 && l.track.yearsLeft >= 1 && l.meters.study >= 50; },
      p: function () { return 0.3; },
      choices: [{ fx: { study: 2, skills: 3, wellbeing: -3 }, flag: 'minor' }, { fx: { wellbeing: 2, study: 1 } },
        { need: 'learner', fx: { study: 5, skills: 4, wellbeing: -5 }, flag: 'doubleMajor' }] },
    { id: 'sports', once: true, when: function (l) { return onStudy(l); }, p: function (l) { return l.meters.wellbeing < 55 ? 0.3 : 0.12; },
      choices: [{ fx: { wellbeing: 6, connections: 3, study: -2 } }, { fx: { study: 1 } }] },
    { id: 'moveOut', once: true, when: function (l) { return l.track.id === 'work' && l.age >= 23 && l.meters.money >= 50; }, p: function () { return 0.25; },
      choices: [{ fx: { wellbeing: 4, connections: 2, money: -8 }, flag: 'ownPlace' }, { fx: { money: 5 } }] },
    { id: 'certificate', once: true, when: function (l) { return l.track.id === 'work' && l.meters.skills < 75; }, p: function () { return 0.15; },
      choices: [{ fx: { skills: 5, money: -3, wellbeing: -2 }, special: 'certificate' }, { fx: { wellbeing: 2 } }] },
    { id: 'careerSwitch', once: true, when: function (l) { return l.track.id === 'work' && l.age >= 23 && (l.meters.wellbeing < 50 || (!!l.wish && l.wish !== l.field)); },
      p: function () { return 0.15; },
      choices: [{ fx: { wellbeing: 8, skills: -3 }, special: 'careerSwitch' }, { fx: { skills: 2, wellbeing: -1 } }] },
    { id: 'sideBiz', once: true, when: function (l) { return l.track.id === 'work' && l.meters.skills >= 50; }, p: function () { return 0.12; },
      choices: [{ fx: { skills: 5 }, special: 'sideBiz' }, { fx: { wellbeing: 1 } }, { need: 'creative', fx: { skills: 6, connections: 2 }, special: 'sideBizShop' }] },
    { id: 'posting', once: true, when: function (l) { return l.track.id === 'work' && l.meters.skills >= 60 && l.meters.connections >= 50; }, p: function () { return 0.12; },
      choices: [{ fx: { connections: 5, wellbeing: -3 }, special: 'posting', away: true }, { fx: { wellbeing: 3 } }] },
    // mini-stories (2026-11-24; ILLUSTRATIVE): linked steps — a step only follows the choice that opens it, a year or more
    // later (the flags hold the age it happened). 朋友的初創: join → all in (luck: grew / closed) → what next ·
    // 家庭小店: weekend help → an online shop (luck) → taking it over one day?
    { id: 'startup1', story: 'startup', step: 1, once: true, when: function (l) { return l.age >= 19 && l.age <= 24; }, p: function () { return 0.10; },
      choices: [{ fx: { connections: 3, skills: 3, wellbeing: -2 }, special: 'startupJoin' }, { fx: { study: 1, skills: 1 } }] },
    { id: 'startup2', story: 'startup', step: 2, once: true, when: function (l) { return !!l.flags.startup && l.age >= l.flags.startup + 1; }, p: function () { return 0.6; },
      choices: [{ fx: { wellbeing: -3, money: -4 }, special: 'startupAllIn' }, { fx: { skills: 4, connections: 3 } }] },
    { id: 'startupGrew', story: 'startup', step: 3, once: true, when: function (l) { return !!l.flags.startupGrew && l.age >= l.flags.startupGrew + 1; },
      p: function () { return 0.8; }, choices: [{ fx: { study: 6, money: 4 } }, { fx: { money: 10 } }] },
    { id: 'startupClosed', story: 'startup', step: 3, once: true, when: function (l) { return !!l.flags.startupClosed && l.age >= l.flags.startupClosed + 1; },
      p: function () { return 0.8; }, choices: [{ fx: { skills: 4, connections: 4 } }, { fx: { wellbeing: 8 } }] },
    { id: 'shop1', story: 'shop', step: 1, once: true, when: function (l) { return l.age <= 22; }, p: function () { return 0.10; },
      choices: [{ fx: { money: 3, connections: 2, wellbeing: -2 }, special: 'shopHelp' }, { fx: { wellbeing: 1 } }] },
    { id: 'shop2', story: 'shop', step: 2, once: true, when: function (l) { return !!l.flags.shop && l.age >= l.flags.shop + 1; }, p: function () { return 0.7; },
      choices: [{ fx: { skills: 5, wellbeing: -2 }, special: 'shopOnline' }, { fx: { connections: 2 } }] },
    { id: 'shop3', story: 'shop', step: 3, once: true, when: function (l) { return !!l.flags.shopOnline && l.age >= l.flags.shopOnline + 1; }, p: function () { return 0.7; },
      choices: [{ fx: { money: 6, connections: 4 }, flag: 'shopHeir' }, { fx: { wellbeing: 4 } }] }
  ];
  var STORY_STEPS = { startup: 3, shop: 3 };
  var STARTUP_GROW = 0.4, SHOP_ONLINE_WIN = 0.6;                 // the stories' luck (ILLUSTRATIVE)
  var DEGREE_RE = /^(ugc|selffin|mainland|overseas|senior|topup)$/;
  // a special choice is open only to a student with its strength
  function choiceOpen(l, ch) { return !!ch && (!ch.need || has(l, ch.need)); }
  function openChoices(l, id) {
    var e = eventById(id);
    return e ? e.choices.map(function (c, i) { return choiceOpen(l, c) ? i : -1; }).filter(function (i) { return i >= 0; }) : [];
  }
  function eventMult(l, id) {
    var m = 1;
    (l.strengths || []).forEach(function (s) { var ev = STRENGTHS[s].events; if (ev && ev[id]) m *= ev[id]; });
    return m;
  }
  function eventById(id) { for (var i = 0; i < EVENTS.length; i++) if (EVENTS[i].id === id) return EVENTS[i]; return null; }

  /* ---------- helpers ---------- */
  function topCred(l) { var best = 'dse'; l.creds.forEach(function (c) { if (CRED_RANK[c.level] > CRED_RANK[best]) best = c.level; }); return best; }
  function addFx(l, fx, scale) {
    Object.keys(fx || {}).forEach(function (k) {
      if (l.meters[k] == null) return;
      var d = fx[k] * (scale || 1);
      if (d < 0 && (l.strengths || []).some(function (s) { return STRENGTHS[s].soften === k; })) d *= SOFTEN;   // 堅毅樂觀: smaller losses
      l.meters[k] = clamp(Math.round(l.meters[k] + d), 0, 100);
    });
  }
  // a focus choice's effects for this student: the gains (not the costs) of a strength's two focus choices are 25% bigger
  function focusFx(l, focusId, fx) {
    var by = 1;                                                 // the strength's own size (by), else BOOST
    (l.strengths || []).forEach(function (s) { if ((STRENGTHS[s].boost || []).indexOf(focusId) >= 0) by = Math.max(by, STRENGTHS[s].by || BOOST); });
    if (by === 1) return fx;
    var out = {};
    Object.keys(fx).forEach(function (k) { out[k] = fx[k] > 0 ? fx[k] * by : fx[k]; });
    return out;
  }
  // for the 看世界 dream and the 「看過世界的」 title: studied outside HK, went on exchange, took a posting abroad or a working holiday
  function wentAway(l) {
    return l.decisions.some(function (x) {
      if (x.key === 'route') return x.data.route === 'mainland' || x.data.route === 'overseas';
      if (x.key === 'branch') return x.data.opt === 'whs';
      if (x.key === 'event') { var e = eventById(x.data.id), c = e && e.choices[x.data.choice]; return !!(c && c.away); }
      return false;
    });
  }
  function log(l, key, data, tone) { l.log.push({ age: l.age, key: key, data: data || {}, tone: tone || 'info' }); }
  function decide(l, key, data) { l.decisions.push({ age: l.age, key: key, data: data || {} }); }
  // Years of a JUPAS programme. The database has no duration field (duration_en is blank), so the length is
  // APPROXIMATED: a Higher Diploma 2 · medicine, dentistry, Chinese medicine (not pharmacy), veterinary 6 ·
  // a description that says "N-year full-time / programme / double degree …" N · double degrees 5 · otherwise 4.
  var YEAR_WORDS = { four: 4, five: 5, six: 6 };
  function isSubDegree(prog) { return !!prog && /higher diploma|associate degree/i.test(prog.study_level || ''); }
  function programmeYears(prog) {
    if (!prog) return 4;
    if (isSubDegree(prog)) return 2;
    var d = /(\d)/.exec(prog.duration_en || ''); if (d && +d[1] >= 2 && +d[1] <= 6) return +d[1];
    var name = prog.name_en || '';
    if (/Medicine and Bachelor of Surgery|\bMBBS\b|\bMBChB\b|Dental Surgery|Veterinary Medicine/i.test(name) ||
      (/Chinese Medicine/i.test(name) && !/Pharmacy/i.test(name))) return 6;
    var m = /\b(four|five|six|4|5|6)[- ]year[- ](?:full[- ]time|programme|program|double|co-terminal|honours|undergraduate|bachelor)/i.exec(prog.short_description || '');
    if (m) return YEAR_WORDS[m[1].toLowerCase()] || +m[1];
    if (/double degree|dual degree|\band Bachelor of\b|\bB\.?A\.?\b.*\band B\.?Ed\b|Bachelor of Education and Bachelor/i.test(name)) return 5;
    return 4;
  }
  function startTrack(l, id, extra) {
    var t = TRACKS[id];
    l.track = { id: id, yearsLeft: (extra && extra.years) || t.years || 0, field: (extra && extra.field) || l.field,
      code: extra && extra.code || null, startedAge: l.age, year: 1, noFee: !!(extra && extra.noFee) };
    if (extra && extra.field) l.field = extra.field;
  }

  /* ---------- pay ---------- */
  // UGC's broad category "Medicine, Dentistry and Health" averages medicine, dentistry, nursing and allied health,
  // and medicine pulls the average up — so the game's Health field (nursing, allied health) uses 65% of it
  // (ILLUSTRATIVE; ≈ HK$30,000 a month, near a newly registered nurse's starting pay)
  var HEALTH_SHARE = 0.65;
  function referencePay(level, field) {
    var st = S();
    if (level === 'degree' || level === 'masters') {
      var cat = st.fieldToUgc[field] || 'Business and Management';
      return st.ugcUndergradAnnualK.values[cat] * 1000 / 12 * (field === 'Health' ? HEALTH_SHARE : 1);
    }
    var youth = st.csdByAge.values['15-24'] / st.csdByAge.values.total;          // 15,300 ÷ 20,400 = 0.75
    if (level === 'subdegree') return st.csdByEducation.values.subDegree * youth; // ≈ 17,250
    // school leaver / DAE: the 15–24 median scaled by the upper-secondary share of the all-age median
    // (15,300 × 17,200 ÷ 20,400 ≈ 12,900) — the 15–24 median alone also counts young graduates
    return st.csdByAge.values['15-24'] * st.csdByEducation.values.upperSecondary / st.csdByEducation.values.total;
  }
  // yearly pay growth by highest qualification (ILLUSTRATIVE, calibrated so that by about 30 the medians sit near
  // C&SD's all-age medians for each education level: upper secondary 17,200 · sub-degree 23,000 · degree 36,900)
  var GROWTH = { dse: 0.015, dae: 0.015, subdegree: 0.02, degree: 0.03, masters: 0.03 };
  function startingPay(l, level) {
    // ONE personal pay factor per life (keyed by the seed only), so a "what if" that starts work at another age or
    // with another qualification compares the decision, not a different draw of luck
    var z = C().normal(l.seed, 'pay');
    var personal = Math.exp(0.15 * z) * (1 + (l.meters.skills - 50) / 400 + (l.meters.connections - 50) / 800);
    var base = referencePay(level, l.field) * (level === 'masters' ? 1.08 : 1);
    return Math.round(base * personal / 100) * 100;
  }

  /* ---------- job search ---------- */
  var JOB_BASE = { masters: 0.9, degree: 0.9, subdegree: 0.85, dae: 0.85, dse: 0.85 };
  function jobSearch(l) {
    var level = topCred(l);
    var bonus = (l.flags.internship ? 0.08 : 0) + (l.flags.minor ? 0.03 : 0) + (l.flags.doubleMajor ? 0.05 : 0) + (l.flags.leader ? 0.04 : 0) +
      (l.strengths || []).reduce(function (a, s) { return a + (STRENGTHS[s].job || 0); }, 0);
    var p = clamp(JOB_BASE[level] + (l.meters.skills - 50) / 250 + (l.meters.connections - 50) / 400 + bonus + 0.10 * (l.searchTries || 0), 0.55, 0.98);
    var u = C().uniform(l.seed, 'job|' + l.age + '|' + (l.searchTries || 0));
    // 動手實幹: the internship company kept a place, so the first job search after it always succeeds
    var kept = !!l.flags.returnOffer && !l.flags.returnUsed;
    if (kept) l.flags.returnUsed = true;
    if (kept || u < p) {
      l.job = { monthly: startingPay(l, level), level: level, field: l.field, since: l.age };
      l.searchTries = 0; startTrack(l, 'work');
      log(l, 'gotJob', { monthly: l.job.monthly, level: level, field: l.field, kept: kept || undefined }, 'good');
    } else {
      l.searchTries = (l.searchTries || 0) + 1; startTrack(l, 'jobsearch');
      addFx(l, { money: -3, wellbeing: -2 });
      log(l, 'noJobYet', { level: level }, 'warn');
    }
  }

  /* ---------- graduation & branches ---------- */
  // the choice offered at each turning point (options in screen order)
  var BRANCHES = { afterDegree: ['work', 'masters', 'whs'], afterSub: ['senior', 'topup', 'work'], afterSeniorNo: ['topup', 'work'],
    afterDae: ['subdeg', 'vtc', 'work'] };
  function branch(id) { return { type: 'branch', id: id, options: BRANCHES[id].slice() }; }
  function graduate(l) {
    var t = TRACKS[l.track.id];
    l.creds.push({ level: t.cred, field: l.track.field, track: l.track.id, code: l.track.code, age: l.age });
    log(l, 'graduated', { track: l.track.id, cred: t.cred, field: l.track.field, code: l.track.code }, 'good');
    if (t.cred === 'degree') l.pend = branch('afterDegree');
    else if (t.cred === 'subdegree') l.pend = branch('afterSub');
    else if (t.cred === 'dae') l.pend = branch('afterDae');
    else { jobSearch(l); l.pend = null; }                                       // masters → straight to work
  }
  function chooseBranch(l, opt) {
    var b = l.pend; if (!b || b.type !== 'branch' || b.options.indexOf(opt) < 0) throw new Error('not a valid option');
    decide(l, 'branch', { id: b.id, opt: opt }); l.pend = null;
    if (opt === 'work') jobSearch(l);
    else if (opt === 'whs') {                                   // a working holiday: one year abroad, then job search
      startTrack(l, 'whs', { years: 1 }); l.flags.whs = true;
      addFx(l, { connections: 6, skills: 4, wellbeing: 6, money: -2 });
      log(l, 'whsStart', {}, 'good');
    } else if (opt === 'senior') {
      var p = clamp(0.45 + (l.meters.study - 55) / 100, 0.15, 0.85);
      if (C().uniform(l.seed, 'senior|' + l.age) < p) { startTrack(l, 'senior'); log(l, 'seniorYes', { p: p }, 'good'); }
      else { log(l, 'seniorNo', { p: p }, 'warn'); l.pend = branch('afterSeniorNo'); return; }
    } else startTrack(l, opt);
    if (!l.pend) l.pend = l.age >= l.endAge ? { type: 'end' } : { type: 'focus' };
  }

  /* ---------- a turn ---------- */
  // years this turn covers: the mode's step, cut short by the study years left and by the final age
  function turnYears(l) {
    var dt = l.step;
    if (TRACKS[l.track.id].kind === 'study' || l.track.id === 'whs') dt = Math.min(dt, l.track.yearsLeft);
    return Math.max(1, Math.min(dt, l.endAge - l.age));
  }
  function drawEvents(l) {
    var picked = [];
    EVENTS.forEach(function (e) {
      if ((e.once && l.flags['ev_' + e.id]) || !e.when(l)) return;
      var pYear = clamp(e.p(l) * eventMult(l, e.id), 0, 0.95), p = 1 - Math.pow(1 - pYear, turnYears(l));
      var u = C().uniform(l.seed, 'ev|' + l.age + '|' + e.id);
      if (u < p) picked.push({ id: e.id, u: u / p });
    });
    picked.sort(function (a, b) { return a.u - b.u; });
    return picked.slice(0, 2).map(function (x) { return x.id; });
  }
  function chooseFocus(l, focusId) {
    if (!l.pend || l.pend.type !== 'focus') throw new Error('not choosing a focus now');
    var kind = TRACKS[l.track.id].kind, f = FOCUS[kind].filter(function (x) { return x.id === focusId; })[0];
    if (!f) throw new Error('unknown focus');
    addFx(l, focusFx(l, focusId, f.fx), turnYears(l) === 2 ? 1.6 : 1);   // a 2-year turn = 1.6 × one year's effect
    l.lastFocus = focusId; decide(l, 'focus', { id: focusId, track: l.track.id });
    l.queue = drawEvents(l);
    l.pend = l.queue.length ? { type: 'event', id: l.queue[0] } : null;
    if (!l.pend) advance(l);
  }
  function chooseEvent(l, idx) {
    if (!l.pend || l.pend.type !== 'event') throw new Error('no event now');
    var e = eventById(l.pend.id), ch = e.choices[idx]; if (!choiceOpen(l, ch)) throw new Error('bad choice');
    addFx(l, ch.fx, 1);
    if (ch.flag) [].concat(ch.flag).forEach(function (f) { l.flags[f] = true; });
    if (e.once) l.flags['ev_' + e.id] = true;
    log(l, 'event', { id: e.id, choice: idx }, ch.special === 'promotion' || ch.special === 'changeJob' || ch.special === 'posting' ? 'good' : 'info');
    special(l, ch.special);                                    // after the event line, so an outcome (e.g. 副業) reads in order
    if (openChoices(l, e.id).length > 1) decide(l, 'event', { id: e.id, choice: idx });
    l.queue.shift();
    l.pend = l.queue.length ? { type: 'event', id: l.queue[0] } : null;
    if (!l.pend) advance(l);
  }
  var SWITCH_TO = ['Business', 'SocialSciences', 'Science', 'Arts', 'Engineering', 'Education', 'Computing', 'Design'];
  var BIZ_WIN = 0.55, BIZ_WIN_SHOP = 0.70;                       // a small business's chance of making money (ILLUSTRATIVE)
  function special(l, sp) {
    if (!sp) return;
    if (sp === 'promotion' && l.job) l.job.monthly = Math.round(l.job.monthly * 1.10 / 100) * 100;
    if (sp === 'changeJob' && l.job) l.job.monthly = Math.round(l.job.monthly * (1.08 + 0.07 * C().uniform(l.seed, 'chg|' + l.age)) / 100) * 100;
    if (sp === 'crunch' && l.job) l.job.monthly = Math.round(l.job.monthly * 1.03 / 100) * 100;
    if (sp === 'mastersPT') { l.flags.mastersPT = true; l.mastersLeft = 2; }
    if (sp === 'certificate' && l.job) l.job.monthly = Math.round(l.job.monthly * 1.03 / 100) * 100;
    if (sp === 'posting' && l.job) l.job.monthly = Math.round(l.job.monthly * 1.12 / 100) * 100;
    if (sp === 'careerSwitch') {                               // to the dream / interest field, else another field (keyed draw)
      var others = SWITCH_TO.filter(function (f) { return f !== l.field; });
      var to = l.wish && l.wish !== l.field ? l.wish : others[Math.floor(C().uniform(l.seed, 'cs|' + l.age) * others.length)];
      l.field = to;
      if (l.job) { l.job.field = to; l.job.monthly = Math.round(l.job.monthly * 0.92 / 100) * 100; }
      log(l, 'switchedField', { field: to }, 'info');
    }
    if (sp === 'startupJoin') l.flags.startup = l.age;
    if (sp === 'startupAllIn') {                                // the start-up: luck decides whether it grows
      var grew = C().uniform(l.seed, 'startup|' + l.age) < STARTUP_GROW;
      if (grew) { addFx(l, { money: 12, skills: 6, connections: 6 }); l.flags.startupGrew = l.age; }
      else { addFx(l, { money: -6, skills: 6, wellbeing: -3 }); l.flags.startupClosed = l.age; }
      log(l, grew ? 'startupGrew' : 'startupClosed', {}, grew ? 'good' : 'warn');
    }
    if (sp === 'shopHelp') l.flags.shop = l.age;
    if (sp === 'shopOnline') {                                  // the family shop goes online: luck decides how it sells
      var sold = C().uniform(l.seed, 'shop|' + l.age) < SHOP_ONLINE_WIN;
      if (sold) { addFx(l, { money: 8 }); l.flags.shopOnline = l.age; }
      log(l, sold ? 'shopOnlineWin' : 'shopOnlineSlow', {}, sold ? 'good' : 'info');
    }
    if (sp === 'sideBiz' || sp === 'sideBizShop') {            // a small business: luck decides (創意無限's online shop: better odds)
      var win = C().uniform(l.seed, 'biz|' + l.age) < (sp === 'sideBizShop' ? BIZ_WIN_SHOP : BIZ_WIN);
      addFx(l, win ? { money: 10, connections: 3 } : { money: -6 });
      log(l, win ? 'bizWin' : 'bizLoss', {}, win ? 'good' : 'warn');
    }
    if (sp === 'switchField') {
      var fields = ['Business', 'SocialSciences', 'Science', 'Arts', 'Engineering', 'Education', 'Computing'];
      var nf = fields.filter(function (f) { return f !== l.track.field; })[Math.floor(C().uniform(l.seed, 'sw|' + l.age) * 6)];
      l.track.field = nf; l.field = nf; l.track.yearsLeft += 1;
    }
  }
  function advance(l) {
    var t = TRACKS[l.track.id], dt = turnYears(l);
    var from = l.age; l.age += dt;
    if (t.kind === 'study') {
      l.track.yearsLeft -= dt; l.track.year += dt;
      if (t.fee && !l.track.noFee) addFx(l, { money: -t.fee * dt });
      if (l.track.yearsLeft <= 0) { graduate(l); if (l.pend && l.age >= l.endAge) autoResolve(l); }
    } else {
      if (l.track.id === 'jobsearch') jobSearch(l);
      else if (l.track.id === 'whs') {
        l.track.yearsLeft -= dt;
        if (l.track.yearsLeft <= 0) { log(l, 'whsDone', {}, 'info'); jobSearch(l); }
      } else if (l.job) {
        if (l.flags.ownPlace) addFx(l, { money: -2 * dt });          // rent, every year after moving out
        var g = Math.pow(1 + GROWTH[topCred(l)] + (l.lastFocus === 'perform' ? 0.02 : 0), dt);
        l.job.monthly = Math.round(l.job.monthly * g / 100) * 100;
        if (l.lastFocus === 'learn') partTime(l, dt);
        if (l.flags.mastersPT && l.mastersLeft > 0) {
          l.mastersLeft -= dt;
          if (l.mastersLeft <= 0) { l.creds.push({ level: 'masters', field: l.field, age: l.age }); l.job.monthly = Math.round(l.job.monthly * 1.08 / 100) * 100; log(l, 'mastersDone', {}, 'good'); }
        }
      }
    }
    l.turns = (l.turns || 0) + 1;
    if (!l.pend) l.pend = l.age >= l.endAge ? { type: 'end' } : { type: 'focus' };
    else if (l.age >= l.endAge && l.pend.type !== 'end') autoResolve(l);
    return from;
  }
  function partTime(l, dt) {
    l.ptYears = (l.ptYears || 0) + dt;
    var top = topCred(l), need = top === 'subdegree' ? 2 : 3;
    if ((top === 'dse' || top === 'dae' || top === 'subdegree') && l.ptYears >= need) {
      var lv = top === 'subdegree' ? 'degree' : 'subdegree';
      l.creds.push({ level: lv, field: l.field, age: l.age, partTime: true }); l.ptYears = 0;
      if (l.job) l.job.monthly = Math.round(l.job.monthly * 1.10 / 100) * 100;
      log(l, 'partTimeDone', { level: lv }, 'good');
    }
  }
  // reaching the final age in the middle of a branch: take the default (work) so the life has a clean ending
  function autoResolve(l) {
    if (l.pend && l.pend.type === 'branch') { l.pend = null; jobSearch(l); }
    l.pend = { type: 'end' };
  }

  /* ---------- start ---------- */
  // Rule version stamped on every life. BUMP IT whenever a rule change would replay an old saved life differently
  // (the "what if" screen then asks for a new game instead of comparing old rules with new ones).
  // 2 = Phase 3 (one personal pay factor per life). 3 = strengths + more decisions + working holiday (2026-11-19).
  // 4 = mini-stories (朋友的初創, 家庭小店; 2026-11-24).
  var MODEL_VERSION = 4;
  // ctx: { seed, mode:'short'|'long', route, field, offer:{code}|null, prog (offer programme)|null, actual, startAge }
  function start(ctx) {
    var lv = [ctx.actual.chi, ctx.actual.eng, ctx.actual.math].concat((ctx.actual.elect || []).map(function (e) { return e.lv; }))
      .map(function (x) { return Math.max(0, C().lvIndex(x)); });
    var avg = lv.reduce(function (a, b) { return a + b; }, 0) / Math.max(1, lv.length);
    var long = ctx.mode === 'long';
    var l = { v: 1, model: MODEL_VERSION, seed: ctx.seed, mode: long ? 'long' : 'short', step: long ? 1 : 2, endAge: long ? 30 : 25,
      age: ctx.startAge || 18, field: ctx.field || 'Business',
      meters: { study: clamp(Math.round(25 + 8 * avg), 0, 100), skills: 30, wellbeing: 65, connections: 40, money: 40 },
      creds: [{ level: 'dse', age: ctx.startAge || 18 }], job: null, track: null, pend: null, queue: [], log: [], decisions: [], flags: {},
      strengths: cleanStrengths(ctx.strengths), wish: ctx.wish === 'Medicine' ? 'Health' : ctx.wish || null };
    l.strengths.forEach(function (id) {                          // each strength's head start
      var s = STRENGTHS[id].start;
      Object.keys(s).forEach(function (k) { l.meters[k] = clamp(l.meters[k] + s[k], 0, 100); });
    });
    var r = ctx.route;
    decide(l, 'route', { route: r, code: ctx.offer && ctx.offer.code, field: l.field });
    if (r === 'degree') {
      var field = (ctx.prog && ctx.prog.categories && ctx.prog.categories[0]) || l.field, code = ctx.offer && ctx.offer.code;
      // a JUPAS offer is almost always a degree; the one JUPAS Higher Diploma runs as a (publicly funded) sub-degree
      if (isSubDegree(ctx.prog)) startTrack(l, 'subdeg', { years: 2, field: field, code: code, noFee: true });
      else startTrack(l, 'ugc', { years: programmeYears(ctx.prog), field: field, code: code });
      if (ctx.prog && ctx.prog.institution === 'SSSDP') l.flags.sssdp = true;
    } else if (r === 'work') { jobSearch(l); }
    else if (TRACKS[r]) startTrack(l, r, { field: l.field });
    else throw new Error('unknown route ' + r);
    log(l, 'start', { route: r, code: ctx.offer && ctx.offer.code, field: l.field, years: l.track && l.track.yearsLeft }, 'info');
    l.pend = { type: 'focus' };
    return l;
  }

  function trackKind(l) { return TRACKS[l.track.id].kind; }
  function focusOptions(l) { return FOCUS[trackKind(l)].map(function (f) { return f.id; }); }

  /* ---------- "what if": the same life again with ONE decision changed and the same luck ---------- */
  // Every draw is keyed by seed + purpose + age, so replaying with the same seed gives the same luck. The player's
  // other decisions are reused as habits: the focus they chose at that age (or the latest one before it, switched
  // to its study ↔ work twin when the track kind differs), the same answer to the same event, the same option at
  // the same turning point; anything new takes the first option. Replaying with no change reproduces the life exactly.
  var FOCUS_TWIN = { study: 'learn', experience: 'perform', parttime: 'save', balance: 'wbalance', explore: 'network',
    learn: 'study', perform: 'experience', save: 'parttime', wbalance: 'balance', network: 'explore' };
  // ctx: the start context of the alternative life (same seed); orig: the original life;
  // change: { key: 'route' } (ctx already holds the new route) | { key: 'branch', id, age, opt } |
  //         { key: 'event', id, age, choice } | { key: 'none' }
  function replay(ctx, orig, change) {
    var l = start(ctx), focusAt = {}, ages = [], evAt = {}, evAny = {}, brAny = {};
    orig.decisions.forEach(function (d) {
      if (d.key === 'focus') { focusAt[d.age] = d.data.id; ages.push(d.age); }
      else if (d.key === 'event') { evAt[d.data.id + '|' + d.age] = d.data.choice; if (!(d.data.id in evAny)) evAny[d.data.id] = d.data.choice; }
      else if (d.key === 'branch') { if (!(d.data.id in brAny)) brAny[d.data.id] = d.data.opt; }
    });
    ages.sort(function (a, b) { return a - b; });
    function habit() {
      var id = focusAt[l.age];
      if (id == null && ages.length) { var at = ages[0]; ages.forEach(function (a) { if (a <= l.age) at = a; }); id = focusAt[at]; }
      var opts = focusOptions(l);
      if (opts.indexOf(id) < 0) id = FOCUS_TWIN[id];
      return opts.indexOf(id) >= 0 ? id : opts[0];
    }
    for (var n = 0; n < 300 && l.pend.type !== 'end'; n++) {
      var p = l.pend;
      if (p.type === 'focus') chooseFocus(l, habit());
      else if (p.type === 'event') {
        var k = p.id + '|' + l.age, ch = change.key === 'event' && change.id === p.id && change.age === l.age ? change.choice
          : k in evAt ? evAt[k] : p.id in evAny ? evAny[p.id] : 0;
        var idx = Math.min(ch, eventById(p.id).choices.length - 1);
        chooseEvent(l, choiceOpen(l, eventById(p.id).choices[idx]) ? idx : 0);
      } else {
        var o = change.key === 'branch' && change.id === p.id && change.age === l.age ? change.opt : brAny[p.id];
        chooseBranch(l, p.options.indexOf(o) >= 0 ? o : p.options[0]);
      }
    }
    return l;
  }

  window.LifePathsLife = {
    METERS: METERS, TRACKS: TRACKS, EVENTS: EVENTS, FOCUS: FOCUS, CRED_RANK: CRED_RANK, HEALTH_SHARE: HEALTH_SHARE,
    BRANCHES: BRANCHES, FOCUS_TWIN: FOCUS_TWIN, MODEL_VERSION: MODEL_VERSION,
    STRENGTHS: STRENGTHS, STRENGTH_IDS: STRENGTH_IDS, BOOST: BOOST, SOFTEN: SOFTEN, BIZ_WIN: BIZ_WIN, BIZ_WIN_SHOP: BIZ_WIN_SHOP,
    STORY_STEPS: STORY_STEPS, STARTUP_GROW: STARTUP_GROW, SHOP_ONLINE_WIN: SHOP_ONLINE_WIN,
    cleanStrengths: cleanStrengths, choiceOpen: choiceOpen, openChoices: openChoices, wentAway: wentAway, focusFx: focusFx, addFx: addFx,
    start: start, chooseFocus: chooseFocus, chooseEvent: chooseEvent, chooseBranch: chooseBranch, turnYears: turnYears,
    replay: replay, programmeYears: programmeYears, isSubDegree: isSubDegree,
    focusOptions: focusOptions, trackKind: trackKind, topCred: topCred, referencePay: referencePay, eventById: eventById
  };
})();
