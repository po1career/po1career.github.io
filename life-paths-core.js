/* ============================================================================
   DSE 人生模擬器 / DSE Life Paths — simulation core (no DOM; testable in node).
   Phase 1: predicted grades → JUPAS list → results day → August Main Round offer → route.
   Design (owner-approved 2026-11-18): private repo docs/dse-life-paths-design.md.
   Depends on window.JUPASEngine (shared scoring engine), window.JUPASFinder (effectiveUq / slotTag — the same
   slot rules the Finder and Planner show) and window.JUPASAnalytics (jupas-evaluator-analytics.js — the teacher
   JUPAS Evaluator's own Chance and Band rules, which decide Main Round offers since 2026-11-19).
   Exposes window.LifePathsCore.

   Randomness is SEEDED and KEYED: every draw is derived from (run seed, purpose, item),
   e.g. "line|JS6004" or "result|chi". Changing one choice never shifts the luck of any
   other draw, so two players with the same seed (class mode) or a "what if" replay see
   the same luck and differ only by their decisions.
   ========================================================================== */
(function () {
  'use strict';

  function E() { return window.JUPASEngine; }
  function F() { return window.JUPASFinder; }
  function A() { return window.JUPASAnalytics; }

  /* ---------- seeded, keyed randomness ---------- */
  function hash32(str) {                                   // FNV-1a
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return h >>> 0;
  }
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function uniform(seed, key) { return mulberry32(hash32(String(seed) + '|' + key))(); }
  function normal(seed, key) {                             // standard normal (Box–Muller)
    var r = mulberry32(hash32(String(seed) + '|' + key));
    var u = r() || 1e-12, v = r();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  function newSeed() {
    var a = new Uint32Array(2);
    (window.crypto || {}).getRandomValues ? window.crypto.getRandomValues(a) : (a[0] = Date.now(), a[1] = Math.random() * 4294967296);
    return (a[0].toString(36) + a[1].toString(36)).slice(0, 10);
  }

  /* ---------- subjects & grades ---------- */
  var LEVELS = ['U', '1', '2', '3', '4', '5', '5*', '5**'];          // low → high
  var CORES = ['chi', 'eng', 'math'];
  var ELECTIVES = ['phys', 'chem', 'bio', 'econ', 'bafs', 'ict', 'geog', 'hist', 'chist', 'chinlit', 'm2'];
  var SUBJ_ZH = { chi: '中國語文', eng: '英國語文', math: '數學（必修部分）', csd: '公民與社會發展',
    phys: '物理', chem: '化學', bio: '生物', econ: '經濟', bafs: '企業、會計與財務概論', ict: '資訊及通訊科技',
    geog: '地理', hist: '歷史', chist: '中國歷史', chinlit: '中國文學', m2: '數學延伸部分單元二（M2）' };
  function lvIndex(lv) { return LEVELS.indexOf(lv); }
  // student grades {chi,eng,math,csd:'attained'|'notattained',elect:[{s,lv}]} → engine grade map
  function toEngineGrades(g) {
    return E().gradesFromPdfPayload({ core: { chi: g.chi, eng: g.eng, math: g.math, csd: g.csd }, elect: g.elect || [] });
  }
  function meets332A(g) {
    return lvIndex(g.chi) >= 3 && lvIndex(g.eng) >= 3 && lvIndex(g.math) >= 2 && g.csd === 'attained';
  }
  // five subjects at Level 2 or above, including Chinese and English (sub-degree / VTC Higher Diploma)
  function meets22222(g) {
    if (lvIndex(g.chi) < 2 || lvIndex(g.eng) < 2) return false;
    var others = [g.math].concat((g.elect || []).map(function (e) { return e.lv; }));
    return others.filter(function (lv) { return lvIndex(lv) >= 2; }).length >= 3;
  }

  /* ---------- results day (owner-approved stated rule, design §3) ---------- */
  // each subject independently: 55% as predicted · 25% one level lower · 15% one level higher ·
  // 5% two levels lower; clamped to U..5**. CSD stays as predicted.
  var RESULT_RULE = [{ shift: 0, p: 0.55 }, { shift: -1, p: 0.25 }, { shift: 1, p: 0.15 }, { shift: -2, p: 0.05 }];
  function drawShift(seed, key) {
    var u = uniform(seed, 'result|' + key), acc = 0;
    for (var i = 0; i < RESULT_RULE.length; i++) { acc += RESULT_RULE[i].p; if (u < acc) return RESULT_RULE[i].shift; }
    return 0;
  }
  function shiftLevel(lv, shift) {
    var i = Math.max(0, Math.min(LEVELS.length - 1, lvIndex(lv) + shift));
    return LEVELS[i];
  }
  function resultsDay(pred, seed) {
    var actual = { chi: pred.chi, eng: pred.eng, math: pred.math, csd: pred.csd, elect: [] }, changes = [];
    function apply(key, lv) {
      var to = shiftLevel(lv, drawShift(seed, key));
      changes.push({ key: key, from: lv, to: to, diff: lvIndex(to) - lvIndex(lv) });
      return to;
    }
    CORES.forEach(function (k) { actual[k] = apply(k, pred[k]); });
    (pred.elect || []).forEach(function (e) { actual.elect.push({ s: e.s, lv: apply(e.s, e.lv) }); });
    return { actual: actual, changes: changes };
  }

  /* ---------- the offer model v2 — STRICTLY the teacher JUPAS Evaluator's rules (owner decision 2026-11-19) ----------
     The game loads the Evaluator's own analytics file (jupas-evaluator-analytics.js), so the two cannot drift apart.
     For each choice, A1 → E20, with the results-day grades:
       1. not eligible (incl. CSD and extra rules)                                     → never offered;
       2. the Evaluator's Band check says "wrong band" (≥ 85% of the latest year's offers went to Band A and the
          choice sits in B4–E20)                                                       → never offered;
       3. otherwise the Evaluator's Chance level for that slot sets the chance below (ILLUSTRATIVE: the Evaluator
          shows labels, not odds — owner-approved numbers). One draw per programme per year, shared by everyone
          with the same seed, so a better level means a better chance on the same luck;
       4. the first choice that succeeds is the (only) offer — the JUPAS rule.
     Interviews are not modelled separately (the Evaluator does not); the repeater −5% below still applies. */
  var OFFER_CHANCE = { safe: 0.90, fair: 0.70, risky: 0.40, 'high-risk': 0.15, unsafe: 0.05, unknown: 0.30 };
  // the Evaluator's on-screen tag for each level (its Chance column collapses seven levels into five tags)
  var CHANCE_TAG = { safe: 'likely', fair: 'likely', risky: 'moderate', 'high-risk': 'risky', unsafe: 'risky', blocked: 'ineligible', unknown: 'nodata' };
  function firmNonAcademic(prog) {
    return (prog.non_academic || []).some(function (it) {
      var w = (it && it.when || '').toLowerCase();
      return it && it.type && !/when necessary|if necessary|if required|where necessary/.test(w);
    });
  }
  // the year key: round 2 = the year after a DSE retake, a fresh year, so fresh draws
  function yk(opts) { return opts && opts.round === 2 ? 'y2|' : ''; }
  // repeaters: programmes whose DB entry states a repeater policy get a flat −5% (ILLUSTRATIVE simplification,
  // design §10b) — the real rules differ by university (e.g. HKU −10% on the retaken subject).
  function retakePenalty(prog, opts) { return opts && opts.retake && prog.retake && (prog.retake.policy_en || prog.retake.penalty) ? 0.95 : 1; }
  // an engine result with another total score (for the repeater penalty), everything else shared
  function withScore(ev, total) {
    var c = {}, calc = {};
    Object.keys(ev).forEach(function (k) { c[k] = ev[k]; });
    Object.keys(ev.calculation).forEach(function (k) { calc[k] = ev.calculation[k]; });
    calc.totalScore = total; c.calculation = calc;
    return c;
  }

  function bandOfSlot(i) { return i < 3 ? 'A' : i < 6 ? 'B' : i < 10 ? 'C' : i < 15 ? 'D' : 'E'; }
  function slotLabel(i) { return bandOfSlot(i) + (i + 1); }

  // the Evaluator's reading of one choice at slot i (0-based) with these grades:
  // { ev, eligible, score, tier, tag, verdict, bandAShare, chance, fewPlaces, interview }
  function assessEval(prog, grades, i, opts) {
    var ev = E().evaluateProgramme(prog, grades), k = retakePenalty(prog, opts);
    if (k !== 1) ev = withScore(ev, ev.calculation.totalScore * k);
    var tier = A().getSlotRisk(ev, i), band = A().bandPlacementCheck(prog, i + 1), quota = parseInt(prog.quota, 10);
    return {
      ev: ev, eligible: ev.eligibility.eligible, score: ev.calculation.totalScore, tier: tier, tag: CHANCE_TAG[tier],
      verdict: band.verdict, bandAShare: band.dependency ? band.dependency.share : null,
      chance: tier === 'blocked' || band.verdict === 'wrong' ? 0 : OFFER_CHANCE[tier],
      fewPlaces: !isNaN(quota) && quota <= 20, interview: firmNonAcademic(prog)
    };
  }
  // the same reading for the list screen (predicted grades), without the engine result
  function assessChoice(code, i, grades, db, opts) {
    var prog = db.byCode[code]; if (!prog) return null;
    var a = assessEval(prog, toEngineGrades(grades), i, opts); delete a.ev;
    return a;
  }

  // JUPAS Main Round (simplified): walk the list A1 → E20; the FIRST choice that succeeds gives the (only)
  // offer. Every choice is still read so the game can explain each one.
  function mainRound(codes, actual, db, seed, opts) {
    var grades = toEngineGrades(actual), byCode = db.byCode, rows = [], offer = null, y = yk(opts);
    codes.forEach(function (code, i) {
      var prog = byCode[code];
      if (!prog) { rows.push({ i: i, code: code, status: 'notfound' }); return; }
      var a = assessEval(prog, grades, i, opts);
      var row = { i: i, code: code, slot: slotLabel(i), band: bandOfSlot(i), score: a.score, eligible: a.eligible,
        fails: a.eligible ? [] : a.ev.eligibility.details.filter(function (d) { return d.pass === false; }),
        tier: a.tier, tag: a.tag, verdict: a.verdict, bandAShare: a.bandAShare, chance: a.chance,
        noData: a.tier === 'unknown', fewPlaces: a.fewPlaces, interview: a.interview };
      if (!a.eligible) { row.status = 'ineligible'; rows.push(row); return; }
      if (a.verdict === 'wrong') { row.status = 'wrongBand'; row.cleared = false; rows.push(row); return; }
      row.draw = uniform(seed, 'offer|' + y + code);
      row.cleared = row.draw < a.chance;
      row.status = row.cleared ? (offer ? 'clearedLower' : 'offer') : 'notCleared';
      if (row.cleared && !offer) offer = { i: i, code: code, slot: slotLabel(i), prog: prog, score: a.score };
      rows.push(row);
    });
    return { offer: offer, rows: rows };
  }

  /* ---------- Clearing Round (late August; ILLUSTRATIVE, design §10b) ---------- */
  // Programmes the student is eligible for whose score is at or above last year's LQ (the Evaluator's score
  // position near-LQ or better; bands do not apply in the Clearing Round), the ones closest to their LQ first —
  // where a spare place is most plausible. A pick succeeds with ~60% (a place may still be free).
  var CLEARING_CHANCE = 0.6, CLEARING_POS = ['uq', 'med', 'near-med', 'near-lq'];
  function clearingCandidates(actual, db, seed, opts, exclude) {
    var grades = toEngineGrades(actual), out = [];
    db.list.forEach(function (prog) {
      if (exclude && exclude.indexOf(prog.jupas_code) >= 0) return;
      var refs = E().refScores(prog); if (refs.median == null) return;
      var ev = E().evaluateProgramme(prog, grades); if (!ev.eligibility.eligible) return;
      var k = retakePenalty(prog, opts); if (k !== 1) ev = withScore(ev, ev.calculation.totalScore * k);
      if (CLEARING_POS.indexOf(A().getScoreBand(ev)) < 0) return;
      var M = +refs.median, LQ = refs.lq != null ? +refs.lq : M, s = Math.max(M - LQ, 0.05 * M), score = ev.calculation.totalScore;
      out.push({ code: prog.jupas_code, score: score, margin: (score - LQ) / s });
    });
    return out.sort(function (a, b) { return a.margin - b.margin; }).slice(0, 6);
  }
  function clearingResult(code, seed, opts) { return uniform(seed, 'clearing|' + yk(opts) + code) < CLEARING_CHANCE; }

  /* ---------- retaking the DSE (ILLUSTRATIVE, design §10b) ---------- */
  // each retaken subject (max 2): 30% same · 45% +1 · 15% +2 · 10% −1; the better of the two sittings counts.
  var RETAKE_RULE = [{ shift: 0, p: 0.30 }, { shift: 1, p: 0.45 }, { shift: 2, p: 0.15 }, { shift: -1, p: 0.10 }];
  function retakeResults(prev, keys, seed) {
    var next = { chi: prev.chi, eng: prev.eng, math: prev.math, csd: prev.csd, elect: (prev.elect || []).map(function (e) { return { s: e.s, lv: e.lv }; }) };
    var changes = [];
    (keys || []).slice(0, 2).forEach(function (k) {
      var u = uniform(seed, 'retake|' + k), acc = 0, shift = 0;
      for (var i = 0; i < RETAKE_RULE.length; i++) { acc += RETAKE_RULE[i].p; if (u < acc) { shift = RETAKE_RULE[i].shift; break; } }
      var cur = CORES.indexOf(k) >= 0 ? next[k] : (next.elect.filter(function (e) { return e.s === k; })[0] || {}).lv;
      if (!cur) return;
      var sat = shiftLevel(cur, shift), best = lvIndex(sat) > lvIndex(cur) ? sat : cur;
      if (CORES.indexOf(k) >= 0) next[k] = best; else next.elect.forEach(function (e) { if (e.s === k) e.lv = best; });
      changes.push({ key: k, from: cur, sat: sat, to: best, diff: lvIndex(best) - lvIndex(cur) });
    });
    return { actual: next, changes: changes };
  }

  /* ---------- "suggest for me" (same slot rules as the Finder/Planner, design §2) ---------- */
  // A1 ≥ LQ · A2 ≥ median · A3 ≥ UQ · B4–E20 ≥ UQ+10%. Within a slot rule, the choice nearest to its
  // threshold from above (most ambitious that still meets the rule) comes first. Interest categories
  // first; widened to all programmes if there aren't enough. Since the Evaluator decides offers, B4–E20
  // never gets a programme the Evaluator would call "wrong band" there (≥ 85% of offers to Band A).
  function suggestList(pred, cats, db) {
    var grades = toEngineGrades(pred), out = [], used = {};
    var all = db.list.map(function (p) {
      var ev = E().evaluateProgramme(p, grades), refs = E().refScores(p);
      if (!ev.eligibility.eligible || refs.median == null) return null;
      var M = +refs.median, LQ = refs.lq != null ? +refs.lq : null, UQ = F().effectiveUq(refs);
      var s = Math.max(LQ != null ? M - LQ : 0.05 * M, 0.05 * M);
      return { p: p, ev: ev, score: ev.calculation.totalScore, M: M, LQ: LQ != null ? LQ : M, UQ: UQ, s: s,
        wrongOutsideA: A().bandPlacementCheck(p, 4).verdict === 'wrong',
        inCats: !cats || !cats.length || (p.categories || []).some(function (c) { return cats.indexOf(c) >= 0; }) };
    }).filter(Boolean);
    function pickFor(threshold, n, pool) {
      var c = pool.filter(function (r) { return !used[r.p.jupas_code] && r.score >= threshold(r) - 1e-9; })
        .sort(function (x, y) { return (x.score - threshold(x)) / x.s - (y.score - threshold(y)) / y.s; });
      return c.slice(0, n);
    }
    var rules = [
      { n: 1, thr: function (r) { return r.LQ; } },
      { n: 1, thr: function (r) { return r.M; } },
      { n: 1, thr: function (r) { return r.UQ; } },
      { n: 17, thr: function (r) { return r.UQ * 1.10; }, outsideA: true }
    ];
    rules.forEach(function (rule) {
      var ok = function (r) { return !(rule.outsideA && r.wrongOutsideA); };
      var got = pickFor(rule.thr, rule.n, all.filter(function (r) { return r.inCats && ok(r); }));
      if (got.length < rule.n) got = got.concat(pickFor(rule.thr, rule.n - got.length, all.filter(function (r) { return !r.inCats && !used[r.p.jupas_code] && ok(r); })));
      got.forEach(function (r) { used[r.p.jupas_code] = true; out.push(r.p.jupas_code); });
    });
    return out;
  }
  // the Finder/Planner slot tag for one choice with the PREDICTED grades: 'good' | 'mid' | 'bad'
  function slotTagFor(code, i, pred, db) {
    var prog = db.byCode[code]; if (!prog) return 'bad';
    var ev = E().evaluateProgramme(prog, toEngineGrades(pred));
    return F().slotTag(ev, prog, i);
  }

  /* ---------- routes after August (design §5; entry rules as stated on the site's Pathways page) ---------- */
  var ROUTES = ['degree', 'selffin', 'subdeg', 'vtc', 'dae', 'mainland', 'overseas', 'retake', 'work'];
  function routeOptions(actual, offer) {
    var m332 = meets332A(actual), m22 = meets22222(actual);
    return ROUTES.map(function (id) {
      var ok = true, why = '';
      if (id === 'degree') { ok = !!offer; why = offer ? '' : 'noOffer'; }
      else if (id === 'selffin' || id === 'mainland') { ok = m332; why = m332 ? '' : 'needs332A'; }
      else if (id === 'subdeg') { ok = m22; why = m22 ? '' : 'needs22222'; }
      return { id: id, available: ok, why: why };
    });
  }

  /* ---------- database index ---------- */
  function indexDB(list) {
    var byCode = {};
    list.forEach(function (p) { byCode[p.jupas_code] = p; });
    return { list: list, byCode: byCode };
  }

  window.LifePathsCore = {
    LEVELS: LEVELS, CORES: CORES, ELECTIVES: ELECTIVES, SUBJ_ZH: SUBJ_ZH, RESULT_RULE: RESULT_RULE,
    ROUTES: ROUTES, OFFER_CHANCE: OFFER_CHANCE, CHANCE_TAG: CHANCE_TAG,
    newSeed: newSeed, uniform: uniform, normal: normal,
    lvIndex: lvIndex, toEngineGrades: toEngineGrades, meets332A: meets332A, meets22222: meets22222,
    resultsDay: resultsDay, assessChoice: assessChoice, mainRound: mainRound,
    clearingCandidates: clearingCandidates, clearingResult: clearingResult, CLEARING_CHANCE: CLEARING_CHANCE,
    retakeResults: retakeResults, RETAKE_RULE: RETAKE_RULE,
    suggestList: suggestList, slotTagFor: slotTagFor, slotLabel: slotLabel, bandOfSlot: bandOfSlot,
    routeOptions: routeOptions, indexDB: indexDB
  };
})();
