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

  /* ---------- tracks ---------- */
  var TRACKS = {
    ugc: { kind: 'study', years: 4, cred: 'degree' }, selffin: { kind: 'study', years: 4, cred: 'degree', fee: 3 },
    mainland: { kind: 'study', years: 4, cred: 'degree', fee: 2 }, overseas: { kind: 'study', years: 3, cred: 'degree', fee: 6 },
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
      choices: [{ fx: { connections: 8, skills: 5, money: -8, wellbeing: 3 } }, { fx: { study: 3 } }] },
    { id: 'internship', when: function (l) { return onStudy(l) && l.meters.skills >= 40; }, p: function (l) { return 0.18 + (l.meters.skills - 40) / 200; },
      choices: [{ fx: { skills: 10, connections: 4, wellbeing: -2 }, flag: 'internship' }, { fx: { study: 4 } }] },
    { id: 'award', when: function (l) { return onStudy(l) && (l.meters.skills >= 55 || l.meters.study >= 65); }, p: function () { return 0.12; },
      choices: [{ fx: { skills: 4, connections: 4, wellbeing: 3 } }] },
    { id: 'mentor', when: function (l) { return l.meters.connections >= 50; }, p: function () { return 0.12; },
      choices: [{ fx: { connections: 6, skills: 3 } }, { fx: {} }] },
    { id: 'volunteer', when: function () { return true; }, p: function () { return 0.12; },
      choices: [{ fx: { connections: 4, wellbeing: 4, money: -1 } }, { fx: {} }] },
    { id: 'switchField', when: function (l) { return onStudy(l) && l.track.yearsLeft >= 2 && l.meters.wellbeing < 45 && l.track.id !== 'dae'; }, p: function () { return 0.25; },
      choices: [{ fx: { wellbeing: 8, study: -2 }, special: 'switchField' }, { fx: { study: 3, wellbeing: -2 } }] },
    { id: 'familyMoney', when: function (l) { return l.meters.money < 50; }, p: function () { return 0.10; },
      choices: [{ fx: { money: 10, wellbeing: -4, study: -3 } }, { fx: { money: 6, wellbeing: -1 } }] },
    { id: 'familyCare', when: function () { return true; }, p: function () { return 0.06; },
      choices: [{ fx: { wellbeing: -3, connections: 2, study: -2, skills: -1 } }, { fx: { wellbeing: -1 } }] },
    { id: 'moveHome', when: function () { return true; }, p: function () { return 0.05; }, choices: [{ fx: { wellbeing: -2 } }] },
    { id: 'friendPath', when: function (l) { return l.age <= 21; }, p: function () { return 0.12; },
      choices: [{ fx: { connections: 4 } }, { fx: { connections: -2, study: 1 } }] },
    { id: 'overwhelmed', when: function (l) { return l.meters.wellbeing < 35; }, p: function () { return 0.6; },
      choices: [{ fx: { wellbeing: 12, study: -3, skills: -2 } }, { fx: { wellbeing: 10, connections: 3 } }] },
    { id: 'promotion', when: function (l) { return l.track.id === 'work' && l.meters.skills >= 58; }, p: function (l) { return 0.15 + (l.meters.skills - 58) / 160; },
      choices: [{ fx: { skills: 2, wellbeing: 2 }, special: 'promotion' }] },
    { id: 'jobOffer', when: function (l) { return l.track.id === 'work' && (l.meters.connections >= 55 || l.lastFocus === 'network'); }, p: function () { return 0.22; },
      choices: [{ fx: { connections: 3, wellbeing: -2 }, special: 'changeJob' }, { fx: { wellbeing: 2 } }] },
    { id: 'crunch', when: function (l) { return l.track.id === 'work'; }, p: function () { return 0.14; },
      choices: [{ fx: { skills: 4, wellbeing: -6 }, special: 'crunch' }, { fx: { wellbeing: -1, connections: 2 } }] },
    { id: 'masters', when: function (l) { return l.track.id === 'work' && l.age >= 23 && topCred(l) === 'degree' && l.meters.study >= 50 && !l.flags.mastersPT; }, p: function () { return 0.12; },
      choices: [{ fx: { study: 6, money: -8, wellbeing: -2 }, special: 'mastersPT' }, { fx: {} }] }
  ];
  function eventById(id) { for (var i = 0; i < EVENTS.length; i++) if (EVENTS[i].id === id) return EVENTS[i]; return null; }

  /* ---------- helpers ---------- */
  function topCred(l) { var best = 'dse'; l.creds.forEach(function (c) { if (CRED_RANK[c.level] > CRED_RANK[best]) best = c.level; }); return best; }
  function addFx(l, fx, scale) {
    Object.keys(fx || {}).forEach(function (k) { if (l.meters[k] != null) l.meters[k] = clamp(Math.round(l.meters[k] + fx[k] * (scale || 1)), 0, 100); });
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
    var z = C().normal(l.seed, 'pay|' + l.age + '|' + level);
    var personal = Math.exp(0.15 * z) * (1 + (l.meters.skills - 50) / 400 + (l.meters.connections - 50) / 800);
    var base = referencePay(level, l.field) * (level === 'masters' ? 1.08 : 1);
    return Math.round(base * personal / 100) * 100;
  }

  /* ---------- job search ---------- */
  var JOB_BASE = { masters: 0.9, degree: 0.9, subdegree: 0.85, dae: 0.85, dse: 0.85 };
  function jobSearch(l) {
    var level = topCred(l);
    var p = clamp(JOB_BASE[level] + (l.meters.skills - 50) / 250 + (l.meters.connections - 50) / 400 +
      (l.flags.internship ? 0.08 : 0) + 0.10 * (l.searchTries || 0), 0.55, 0.98);
    var u = C().uniform(l.seed, 'job|' + l.age + '|' + (l.searchTries || 0));
    if (u < p) {
      l.job = { monthly: startingPay(l, level), level: level, field: l.field, since: l.age };
      l.searchTries = 0; startTrack(l, 'work');
      log(l, 'gotJob', { monthly: l.job.monthly, level: level, field: l.field }, 'good');
    } else {
      l.searchTries = (l.searchTries || 0) + 1; startTrack(l, 'jobsearch');
      addFx(l, { money: -3, wellbeing: -2 });
      log(l, 'noJobYet', { level: level }, 'warn');
    }
  }

  /* ---------- graduation & branches ---------- */
  function graduate(l) {
    var t = TRACKS[l.track.id];
    l.creds.push({ level: t.cred, field: l.track.field, track: l.track.id, code: l.track.code, age: l.age });
    log(l, 'graduated', { track: l.track.id, cred: t.cred, field: l.track.field, code: l.track.code }, 'good');
    if (t.cred === 'degree') l.pend = { type: 'branch', id: 'afterDegree', options: ['work', 'masters'] };
    else if (t.cred === 'subdegree') l.pend = { type: 'branch', id: 'afterSub', options: ['senior', 'topup', 'work'] };
    else if (t.cred === 'dae') l.pend = { type: 'branch', id: 'afterDae', options: ['subdeg', 'vtc', 'work'] };
    else { jobSearch(l); l.pend = null; }                                       // masters → straight to work
  }
  function chooseBranch(l, opt) {
    var b = l.pend; if (!b || b.type !== 'branch' || b.options.indexOf(opt) < 0) throw new Error('not a valid option');
    decide(l, 'branch', { id: b.id, opt: opt }); l.pend = null;
    if (opt === 'work') jobSearch(l);
    else if (opt === 'senior') {
      var p = clamp(0.45 + (l.meters.study - 55) / 100, 0.15, 0.85);
      if (C().uniform(l.seed, 'senior|' + l.age) < p) { startTrack(l, 'senior'); log(l, 'seniorYes', { p: p }, 'good'); }
      else { log(l, 'seniorNo', { p: p }, 'warn'); l.pend = { type: 'branch', id: 'afterSeniorNo', options: ['topup', 'work'] }; return; }
    } else startTrack(l, opt);
    if (!l.pend) l.pend = l.age >= l.endAge ? { type: 'end' } : { type: 'focus' };
  }

  /* ---------- a turn ---------- */
  // years this turn covers: the mode's step, cut short by the study years left and by the final age
  function turnYears(l) {
    var dt = l.step;
    if (TRACKS[l.track.id].kind === 'study') dt = Math.min(dt, l.track.yearsLeft);
    return Math.max(1, Math.min(dt, l.endAge - l.age));
  }
  function drawEvents(l) {
    var picked = [];
    EVENTS.forEach(function (e) {
      if (!e.when(l)) return;
      var pYear = clamp(e.p(l), 0, 0.95), p = 1 - Math.pow(1 - pYear, turnYears(l));
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
    addFx(l, f.fx, turnYears(l) === 2 ? 1.6 : 1);                 // a 2-year turn = 1.6 × one year's effect
    l.lastFocus = focusId; decide(l, 'focus', { id: focusId, track: l.track.id });
    l.queue = drawEvents(l);
    l.pend = l.queue.length ? { type: 'event', id: l.queue[0] } : null;
    if (!l.pend) advance(l);
  }
  function chooseEvent(l, idx) {
    if (!l.pend || l.pend.type !== 'event') throw new Error('no event now');
    var e = eventById(l.pend.id), ch = e.choices[idx]; if (!ch) throw new Error('bad choice');
    addFx(l, ch.fx, 1);
    if (ch.flag) l.flags[ch.flag] = true;
    special(l, ch.special);
    log(l, 'event', { id: e.id, choice: idx }, ch.special === 'promotion' || ch.special === 'changeJob' ? 'good' : 'info');
    if (e.choices.length > 1) decide(l, 'event', { id: e.id, choice: idx });
    l.queue.shift();
    l.pend = l.queue.length ? { type: 'event', id: l.queue[0] } : null;
    if (!l.pend) advance(l);
  }
  function special(l, sp) {
    if (!sp) return;
    if (sp === 'promotion' && l.job) l.job.monthly = Math.round(l.job.monthly * 1.10 / 100) * 100;
    if (sp === 'changeJob' && l.job) l.job.monthly = Math.round(l.job.monthly * (1.08 + 0.07 * C().uniform(l.seed, 'chg|' + l.age)) / 100) * 100;
    if (sp === 'crunch' && l.job) l.job.monthly = Math.round(l.job.monthly * 1.03 / 100) * 100;
    if (sp === 'mastersPT') { l.flags.mastersPT = true; l.mastersLeft = 2; }
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
      else if (l.job) {
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
  // ctx: { seed, mode:'short'|'long', route, field, offer:{code}|null, prog (offer programme)|null, actual, startAge }
  function start(ctx) {
    var lv = [ctx.actual.chi, ctx.actual.eng, ctx.actual.math].concat((ctx.actual.elect || []).map(function (e) { return e.lv; }))
      .map(function (x) { return Math.max(0, C().lvIndex(x)); });
    var avg = lv.reduce(function (a, b) { return a + b; }, 0) / Math.max(1, lv.length);
    var long = ctx.mode === 'long';
    var l = { v: 1, seed: ctx.seed, mode: long ? 'long' : 'short', step: long ? 1 : 2, endAge: long ? 30 : 25,
      age: ctx.startAge || 18, field: ctx.field || 'Business',
      meters: { study: clamp(Math.round(25 + 8 * avg), 0, 100), skills: 30, wellbeing: 65, connections: 40, money: 40 },
      creds: [{ level: 'dse', age: ctx.startAge || 18 }], job: null, track: null, pend: null, queue: [], log: [], decisions: [], flags: {} };
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

  window.LifePathsLife = {
    METERS: METERS, TRACKS: TRACKS, EVENTS: EVENTS, FOCUS: FOCUS, CRED_RANK: CRED_RANK, HEALTH_SHARE: HEALTH_SHARE,
    start: start, chooseFocus: chooseFocus, chooseEvent: chooseEvent, chooseBranch: chooseBranch, turnYears: turnYears,
    programmeYears: programmeYears, isSubDegree: isSubDegree,
    focusOptions: focusOptions, trackKind: trackKind, topCred: topCred, referencePay: referencePay, eventById: eventById
  };
})();
