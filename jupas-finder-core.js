/* ============================================================================
   JUPAS Finder — pure logic layer (no DOM). Built on JUPASEngine + JUPASAnalytics.
   Exposes window.JUPASFinder.
   ========================================================================== */
(function () {
  'use strict';

  var CORE = { chi: 'Chinese Language', eng: 'English Language', math: 'Mathematics (Compulsory Part)' };
  var ELECT_CANON = {
    phys: 'Physics', chem: 'Chemistry', bio: 'Biology', econ: 'Economics',
    bafs: 'Business, Accounting and Financial Studies', ict: 'Information and Communication Technology',
    geog: 'Geography', hist: 'History', chist: 'Chinese History', chinlit: 'Chinese Literature',
    m2: 'Mathematics Extended Part (Module 2)'
  };
  var ELECT_LABEL = {
    phys: 'Physics', chem: 'Chemistry', bio: 'Biology', econ: 'Economics', bafs: 'BAFS', ict: 'ICT',
    geog: 'Geography', hist: 'History', chist: 'Chinese History', chinlit: 'Chinese Literature', m2: 'Maths Ext. (M2)'
  };
  var ELECT_LABEL_ZH = {
    phys: '物理', chem: '化學', bio: '生物', econ: '經濟', bafs: '企會財', ict: '資訊及通訊科技',
    geog: '地理', hist: '歷史', chist: '中國歷史', chinlit: '中國文學', m2: '數學延伸 M2'
  };
  var LEVELS = ['5**', '5*', '5', '4', '3', '2', '1', 'U'];        // high → low
  var LEVELS_UP = ['U', '1', '2', '3', '4', '5', '5*', '5**'];      // low → high (for what-if)

  // student input -> canonical grade map the engine understands
  function buildGrades(input) {
    var g = {};
    if (input.chi) g[CORE.chi] = input.chi;
    if (input.eng) g[CORE.eng] = input.eng;
    if (input.math) g[CORE.math] = input.math;
    (input.electives || []).forEach(function (e) {
      if (e && e.subj && e.lv && ELECT_CANON[e.subj]) g[ELECT_CANON[e.subj]] = e.lv;
    });
    g['Citizenship and Social Development'] = input.csAttained ? 'Attained' : 'Unattained';
    return g;
  }

  // count of subjects the student actually graded (electives + cores), for "enough subjects" hints
  function gradedElectiveCount(input) { return (input.electives || []).filter(function (e) { return e && e.subj && e.lv; }).length; }

  // ----- fit tier (scale-independent: uses eligibility + position band) -----
  // strong = at/above median · reach = LQ..median · stretch = below LQ · ineligible · nodata
  function fitTier(ev) {
    if (!ev.eligibility.eligible) return 'ineligible';
    if (ev.band === 'above-uq' || ev.band === 'above-median') return 'strong';
    if (ev.band === 'above-lq') return 'reach';
    if (ev.band === 'below-lq') return 'stretch';
    return 'nodata';
  }
  var TIER_RANK = { strong: 4, reach: 3, stretch: 2, nodata: 1, ineligible: 0 };

  // The DB encodes the CSD requirement as grade "A", which its own conversion table
  // maps to 0 points — so the engine treats CSD as non-binding. But NOT attaining CSD
  // fails JUPAS general entry. So the finder enforces it: if csAttained === false and a
  // programme lists a CSD requirement, mark it ineligible.
  function csBlocks(prog, csAttained) {
    return csAttained === false && prog.min_requirements_2026 && prog.min_requirements_2026.csd;
  }
  function evalOne(prog, grades, csAttained) {
    var ev = window.JUPASEngine.evaluateProgramme(prog, grades);
    if (csBlocks(prog, csAttained)) {
      ev.eligibility.eligible = false;
      var d = ev.eligibility.details.find(function (x) { return x.label === 'CSD'; });
      if (d) { d.pass = false; d.got = 'Not attained'; }
    }
    return ev;
  }

  // effective upper quartile: the published UQ when usable, else synthesized exactly as
  // the Planner estimates it (median + 1.25 × upper spread, floored at 5% of median) so the
  // three score buckets are meaningful for every institution, not just the few that publish a UQ.
  function effectiveUq(refs) {
    if (refs.uq != null && +refs.uq > +refs.median) return +refs.uq;
    if (refs.median == null) return null;
    var med = +refs.median, floor = 0.05 * med;
    var spread = refs.lq != null ? Math.max(med - +refs.lq, floor) : floor;
    return med + 1.25 * spread;
  }
  // three mutually-exclusive score categories (ELIGIBLE programmes only). Ranges by construction:
  //   'uq'     : score ≥ effective UQ
  //   'median' : median ≤ score < UQ
  //   'lq'     : LQ ≤ score < median          (needs a published LQ)
  //   null     : ineligible, below LQ, or no median benchmark to compare against
  function scoreBucket(ev, prog, eligible) {
    if (!eligible) return null;
    var refs = window.JUPASEngine.refScores(prog);
    if (refs.median == null) return null;
    var score = ev.calculation.totalScore;
    if (score == null || isNaN(score)) return null;
    var EPS = 1e-9, uq = effectiveUq(refs), med = +refs.median, lq = refs.lq != null ? +refs.lq : null;
    if (uq != null && score >= uq - EPS) return 'uq';
    if (score >= med - EPS) return 'median';
    if (lq != null && score >= lq - EPS) return 'lq';
    return null;
  }

  // true when a programme has NO admission statistics at all (no median/mean/expected, no
  // published LQ/UQ) — e.g. new or newly-restructured programmes. Admission is unpredictable.
  function hasNoStats(prog) {
    var r = window.JUPASEngine.refScores(prog);
    return r.median == null && r.lq == null && r.uq == null;
  }

  // Slot-differential tag for the 20-slot choice list — MIRRORS the Planner's conservative-max
  // approach (kept in sync 2026-07-05; this is a parallel copy of the Planner's slotTag logic,
  // like analytics.js — patch both together). Each factor scores a severity (0 good / 1 mid /
  // 2 bad) and the WORST wins. Slot thresholds: A1(idx0) ≥ LQ · A2(idx1) ≥ Median · A3(idx2) ≥ UQ
  // · idx ≥ 3 (B4–E20) ≥ UQ+10% — bands C–E use the SAME rule as band B. Quartile position
  // outranks the small-quota caution; a below-threshold score is red even at quota < 20.
  // FINDER-SPECIFIC: a programme with no admission statistics is ALWAYS 'bad' (red).
  function slotTag(ev, prog, slotIdx) {
    var sev = [];                                            // severities: 0 good · 1 mid · 2 bad
    if (!ev.eligibility.eligible) sev.push(2);
    if (hasNoStats(prog)) sev.push(2);                       // no stats → always red (unpredictable)
    else {
      var refs = window.JUPASEngine.refScores(prog), thr = null, EPS = 1e-9;
      if (slotIdx === 0) thr = refs.lq != null ? +refs.lq : refs.median != null ? +refs.median : null;
      else if (slotIdx === 1) thr = refs.median != null ? +refs.median : null;
      else { var uq = effectiveUq(refs); thr = uq != null ? uq * (slotIdx === 2 ? 1 : 1.10) : null; }
      if (thr == null) sev.push(1);                          // can't judge this slot → amber
      else if (ev.calculation.totalScore < thr - EPS) sev.push(2);
      var quota = parseInt(prog.quota, 10);
      if (!isNaN(quota) && quota < 20) sev.push(1);          // few places → amber (only downgrades)
    }
    var worst = sev.reduce(function (a, b) { return b > a ? b : a; }, 0);
    return worst === 2 ? 'bad' : worst === 1 ? 'mid' : 'good';
  }

  // evaluate every programme for these grades; attach quartile bucket + gap-to-median
  function evaluateAll(programmes, grades, csAttained) {
    return programmes.map(function (p) {
      var ev = evalOne(p, grades, csAttained);
      var med = ev.comparisons.find(function (x) { return x.key === 'median'; })
        || ev.comparisons.find(function (x) { return x.key === 'mean' || x.key === 'expected_score'; });
      var ref = window.JUPASEngine.refScores(p);
      var eligible = ev.eligibility.eligible;
      return {
        prog: p, eval: ev, tier: fitTier(ev),
        bucket: scoreBucket(ev, p, eligible),                 // 'uq' | 'median' | 'lq' | null
        noStats: (ref.median == null && ref.lq == null && ref.uq == null),
        score: ev.calculation.totalScore,
        medScore: med ? med.score : null, medDelta: med ? med.delta : null, medPct: med ? med.percent : null,
        eligible: eligible,
        source: ref.source,                                   // 'actual' | 'mean' | 'expected' | 'none'
        estimated: ref.source !== 'actual' || ((p.scores_2025 || {}).score_type === 'estimated')
      };
    });
  }

  function progCats(p) { return p.categories || []; }

  // ----- filter + rank for discovery -----
  function filterRank(results, opts) {
    opts = opts || {};
    var cats = opts.cats || [], matchAll = !!opts.matchAll, inst = opts.inst || '',
      q = (opts.query || '').trim().toLowerCase(), licOnly = !!opts.licensedOnly,
      includeIneligible = !!opts.includeIneligible, minTier = opts.minTier || 0;
    var out = results.filter(function (r) {
      var p = r.prog;
      if (!includeIneligible && !r.eligible) return false;
      if (TIER_RANK[r.tier] < minTier) return false;
      if (cats.length) {
        var pc = progCats(p);
        var ok = matchAll ? cats.every(function (c) { return pc.indexOf(c) >= 0; })
          : cats.some(function (c) { return pc.indexOf(c) >= 0; });
        if (!ok) return false;
      }
      if (licOnly && !p.licensed) return false;
      if (inst && p.institution !== inst) return false;
      if (q) {
        var hay = [p.jupas_code, p.name_en, p.name_zh, p.institution, p.institution_zh, p.tags].join(' ').toLowerCase();
        if (hay.indexOf(q) < 0) return false;
      }
      return true;
    });
    // rank: best fit first. Secondary sort is tier-aware by default so the list is
    // useful and motivating, not dominated by the least-selective (low-median) options:
    //   strong  -> most SELECTIVE programmes you still qualify for first (aspirational+attainable)
    //   reach/stretch -> CLOSEST to the line first (most attainable reaches)
    // Overridable via opts.sort: 'selective' | 'attainable' | 'fit' (default).
    function compRatio(p) { var c = window.JUPASAnalytics.competition(p); return c ? c.ratio : 0; }
    function pctOf(r) { return r.medPct == null ? -1e9 : r.medPct; }
    out.sort(function (a, b) {
      if (TIER_RANK[b.tier] !== TIER_RANK[a.tier]) return TIER_RANK[b.tier] - TIER_RANK[a.tier];
      if (opts.sort === 'attainable') return pctOf(b) - pctOf(a);
      if (opts.sort === 'selective') return compRatio(b.prog) - compRatio(a.prog);
      // default 'fit'
      if (a.tier === 'strong') { var d = compRatio(b.prog) - compRatio(a.prog); return d !== 0 ? d : pctOf(a) - pctOf(b); }
      return pctOf(b) - pctOf(a);
    });
    return out;
  }

  // group a ranked list into Safe / Within reach / Reach / (Not eligible)
  function group(list) {
    var g = { strong: [], reach: [], stretch: [], nodata: [], ineligible: [] };
    list.forEach(function (r) { g[r.tier].push(r); });
    return g;
  }

  // "closest reaches": eligible programmes just below the line — motivation
  function closestReaches(results, opts, limit) {
    limit = limit || 8;
    var f = filterRank(results, Object.assign({}, opts, { includeIneligible: false, minTier: 0 }));
    return f.filter(function (r) { return (r.tier === 'reach' || r.tier === 'stretch') && r.medPct != null && r.medPct < 0; })
      .sort(function (a, b) { return b.medPct - a.medPct; })   // closest to 0 first
      .slice(0, limit);
  }

  // per-category counts at a given minimum tier (default: eligible & within reach or better)
  function categoryCounts(results, categoriesList, minTier) {
    minTier = minTier == null ? TIER_RANK.reach : minTier;
    var counts = {};
    categoriesList.forEach(function (c) { counts[c.key] = 0; });
    results.forEach(function (r) {
      if (!r.eligible || TIER_RANK[r.tier] < minTier) return;
      progCats(r.prog).forEach(function (c) { if (counts[c] != null) counts[c]++; });
    });
    return counts;
  }

  // ----- what-if: raise one subject by one level -----
  function nextLevelUp(lv) { var i = LEVELS_UP.indexOf(lv); return (i >= 0 && i < LEVELS_UP.length - 1) ? LEVELS_UP[i + 1] : null; }

  // for a single programme: effect of bumping each graded subject +1 level
  function whatIf(prog, input) {
    var baseGrades = buildGrades(input);
    var baseEv = evalOne(prog, baseGrades, input.csAttained);
    var baseTier = fitTier(baseEv), baseScore = baseEv.calculation.totalScore;
    var bumps = [];
    // collect graded subjects as {key,label,lv} (cores + electives), excluding CS
    var subs = [];
    if (input.chi) subs.push({ key: 'chi', canon: CORE.chi, label: 'Chinese', lv: input.chi });
    if (input.eng) subs.push({ key: 'eng', canon: CORE.eng, label: 'English', lv: input.eng });
    if (input.math) subs.push({ key: 'math', canon: CORE.math, label: 'Maths', lv: input.math });
    (input.electives || []).forEach(function (e) { if (e && e.subj && e.lv) subs.push({ key: e.subj, canon: ELECT_CANON[e.subj], label: ELECT_LABEL[e.subj] || e.subj, lv: e.lv }); });

    subs.forEach(function (s) {
      var to = nextLevelUp(s.lv); if (!to) return;
      var g2 = Object.assign({}, baseGrades); g2[s.canon] = to;
      var ev2 = evalOne(prog, g2, input.csAttained);
      bumps.push({ subject: s.label, key: s.key, from: s.lv, to: to,
        oldScore: baseScore, newScore: ev2.calculation.totalScore,
        deltaScore: Number((ev2.calculation.totalScore - baseScore).toFixed(3)),
        oldTier: baseTier, newTier: fitTier(ev2), tierChanged: fitTier(ev2) !== baseTier });
    });
    bumps.sort(function (a, b) { return b.deltaScore - a.deltaScore; });
    return { baseScore: baseScore, baseTier: baseTier, bumps: bumps };
  }

  // global what-if: bump ONE subject +1 level, count how many MORE programmes become
  // at-least-"reach" (within reach) and eligible. Returns best single improvement.
  function bestUnlock(programmes, input) {
    var base = evaluateAll(programmes, buildGrades(input), input.csAttained);
    var baseReach = base.filter(function (r) { return r.eligible && TIER_RANK[r.tier] >= TIER_RANK.reach; }).length;
    var subs = [];
    if (input.chi) subs.push({ key: 'chi', canon: CORE.chi, label: 'Chinese', lv: input.chi });
    if (input.eng) subs.push({ key: 'eng', canon: CORE.eng, label: 'English', lv: input.eng });
    if (input.math) subs.push({ key: 'math', canon: CORE.math, label: 'Maths', lv: input.math });
    (input.electives || []).forEach(function (e) { if (e && e.subj && e.lv) subs.push({ key: e.subj, canon: ELECT_CANON[e.subj], label: ELECT_LABEL[e.subj], lv: e.lv }); });
    var results = [];
    subs.forEach(function (s) {
      var to = nextLevelUp(s.lv); if (!to) return;
      var inp2 = JSON.parse(JSON.stringify(input));
      if (s.key === 'chi' || s.key === 'eng' || s.key === 'math') inp2[s.key] = to;
      else inp2.electives.forEach(function (e) { if (e.subj === s.key) e.lv = to; });
      var g2 = buildGrades(inp2);
      var ev2 = evaluateAll(programmes, g2, inp2.csAttained);
      var reach2 = ev2.filter(function (r) { return r.eligible && TIER_RANK[r.tier] >= TIER_RANK.reach; }).length;
      results.push({ subject: s.label, key: s.key, from: s.lv, to: to, unlocked: reach2 - baseReach, total: reach2 });
    });
    results.sort(function (a, b) { return b.unlocked - a.unlocked; });
    return { baseReach: baseReach, options: results };
  }

  // ----- subject strengths -> discipline discovery -----
  var PTS7 = { '5**': 7, '5*': 6, '5': 5, '4': 4, '3': 3, '2': 2, '1': 1, 'U': 0, '': 0 };
  // which categories a strong grade in a subject is evidence for
  var SUBJ_DISCIPLINE = {
    eng: ['Arts', 'Law', 'Business', 'SocialSciences'], math: ['Computing', 'Engineering', 'Business', 'Science'],
    phys: ['Engineering', 'Science', 'Computing'], chem: ['Science', 'Health', 'Medicine', 'Engineering'],
    bio: ['Science', 'Health', 'Medicine'], econ: ['Business', 'SocialSciences'], bafs: ['Business'],
    ict: ['Computing', 'Engineering'], geog: ['SocialSciences', 'Science'], hist: ['Arts', 'SocialSciences', 'Law'],
    chist: ['Arts', 'SocialSciences'], chinlit: ['Arts', 'Education'], m2: ['Engineering', 'Computing', 'Science', 'Business']
  };
  function subjectsOf(inp) {
    var s = [];
    [['chi', 'Chinese'], ['eng', 'English'], ['math', 'Maths']].forEach(function (c) { if (inp[c[0]]) s.push({ key: c[0], label: c[1], lv: inp[c[0]] }); });
    (inp.electives || []).forEach(function (e) { if (e && e.subj && e.lv) s.push({ key: e.subj, label: ELECT_LABEL[e.subj] || e.subj, lv: e.lv }); });
    return s;
  }
  function strongestSubjects(input, n) {
    return subjectsOf(input).map(function (s) { return { key: s.key, label: s.label, lv: s.lv, pts: PTS7[s.lv] || 0 }; })
      .sort(function (a, b) { return b.pts - a.pts; }).slice(0, n || 3);
  }
  // programmes in the disciplines implied by the student's strongest subjects, that fit and
  // aren't already shortlisted — for "you didn't search this, but it suits you"
  function suggestByStrength(results, input, excludeCodes, limit) {
    limit = limit || 8;
    var top = strongestSubjects(input, 3).filter(function (s) { return s.pts >= 4; });
    var cats = {};
    top.forEach(function (s) { (SUBJ_DISCIPLINE[s.key] || []).forEach(function (c) { cats[c] = true; }); });
    var catList = Object.keys(cats);
    if (!catList.length) return [];
    var exclude = {}; (excludeCodes || []).forEach(function (c) { exclude[c.toUpperCase()] = true; });
    var ranked = filterRank(results, { cats: catList, includeIneligible: false, minTier: TIER_RANK.reach });
    var out = [], perInst = {};
    for (var i = 0; i < ranked.length && out.length < limit; i++) {
      var r = ranked[i]; if (exclude[r.prog.jupas_code.toUpperCase()]) continue;
      var inst = r.prog.institution; if ((perInst[inst] || 0) >= 2) continue;
      perInst[inst] = (perInst[inst] || 0) + 1; out.push(r);
    }
    return { categories: catList, subjects: top, list: out };
  }

  // ----- dream-target roadmap: greedy grade-raise plan to reach a programme's median -----
  function cloneInput(inp) { return JSON.parse(JSON.stringify(inp)); }
  function setLevel(inp, key, lv) {
    if (key === 'chi' || key === 'eng' || key === 'math') inp[key] = lv;
    else (inp.electives || []).forEach(function (e) { if (e.subj === key) e.lv = lv; });
  }
  function levelOf(inp, key) {
    if (key === 'chi' || key === 'eng' || key === 'math') return inp[key];
    var e = (inp.electives || []).filter(function (x) { return x.subj === key; })[0]; return e ? e.lv : null;
  }
  function medOf(ev) { return ev.comparisons.find(function (x) { return x.key === 'median'; }) || ev.comparisons.find(function (x) { return x.key === 'mean' || x.key === 'expected_score'; }); }
  function atOrAboveMedian(ev) { return ev.eligibility.eligible && (ev.band === 'above-median' || ev.band === 'above-uq'); }

  function roadmapTo(prog, input) {
    var base = evalOne(prog, buildGrades(input), input.csAttained);
    var bm = medOf(base);
    if (base.band === 'no-score') return { status: 'noData', score: base.calculation.totalScore };
    if (atOrAboveMedian(base)) return { status: 'onTrack', score: base.calculation.totalScore, med: bm ? bm.score : null };
    // can it EVER be reached by raising grades? test all-5** best case
    var maxInp = cloneInput(input); subjectsOf(maxInp).forEach(function (s) { setLevel(maxInp, s.key, '5**'); });
    var maxEv = evalOne(prog, buildGrades(maxInp), maxInp.csAttained);
    if (!maxEv.eligibility.eligible) {
      if (input.csAttained === false && csBlocks(prog, false)) return { status: 'needCS' };
      var miss = maxEv.eligibility.details.filter(function (d) { return !d.pass; })
        .map(function (d) { return d.label.indexOf('Elective') === 0 ? (d.note || 'a required elective subject') : d.label; });
      return { status: 'blockedSubject', missing: miss };
    }
    // greedy: raise the single level that helps most (eligibility first, then % toward median)
    var cur = cloneInput(input), steps = [], used = {};
    for (var iter = 0; iter < 6; iter++) {
      var ev = evalOne(prog, buildGrades(cur), cur.csAttained);
      if (atOrAboveMedian(ev)) break;
      var best = null;
      subjectsOf(cur).forEach(function (s) {
        var curLv = levelOf(cur, s.key), to = nextLevelUp(curLv);
        if (!to || (used[s.key] || 0) >= 2) return;
        var trial = cloneInput(cur); setLevel(trial, s.key, to);
        var tev = evalOne(prog, buildGrades(trial), trial.csAttained);
        var gE = (tev.eligibility.eligible ? 1 : 0) - (ev.eligibility.eligible ? 1 : 0);
        var tm = medOf(tev), em = medOf(ev);
        var gP = (tm ? tm.percent : 0) - (em ? em.percent : 0);
        var sc = gE * 1000 + gP;
        if (!best || sc > best.sc) best = { sc: sc, key: s.key, label: s.label, from: curLv, to: to };
      });
      if (!best || best.sc <= 0) break;
      setLevel(cur, best.key, best.to); used[best.key] = (used[best.key] || 0) + 1;
      steps.push({ subject: best.label, key: best.key, from: best.from, to: best.to });
    }
    var fin = evalOne(prog, buildGrades(cur), cur.csAttained);
    return { status: 'plan', steps: steps, reached: atOrAboveMedian(fin),
      startScore: base.calculation.totalScore, endScore: fin.calculation.totalScore,
      finalTier: fitTier(fin), med: bm ? bm.score : null };
  }

  window.JUPASFinder = {
    CORE: CORE, ELECT_CANON: ELECT_CANON, ELECT_LABEL: ELECT_LABEL, ELECT_LABEL_ZH: ELECT_LABEL_ZH,
    LEVELS: LEVELS, buildGrades: buildGrades, gradedElectiveCount: gradedElectiveCount,
    fitTier: fitTier, TIER_RANK: TIER_RANK, evaluateAll: evaluateAll, filterRank: filterRank,
    effectiveUq: effectiveUq, scoreBucket: scoreBucket, slotTag: slotTag, hasNoStats: hasNoStats,
    group: group, closestReaches: closestReaches, categoryCounts: categoryCounts,
    whatIf: whatIf, bestUnlock: bestUnlock, nextLevelUp: nextLevelUp,
    strongestSubjects: strongestSubjects, suggestByStrength: suggestByStrength, roadmapTo: roadmapTo
  };
})();
