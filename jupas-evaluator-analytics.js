/* ============================================================================
   JUPAS analytics layer — admission-chance modelling, list strategy,
   counseling notes, and whole-DB suggestions. Built on JUPASEngine results
   and the live offer_statistics (2012-2025).
   Exposes window.JUPASAnalytics.

   NOTE: flags / reasons / notes are returned as structured {key, ...data}
   objects, not pre-built English sentences — jupas-evaluator-ui.js renders
   them bilingually (EN/中) via its MSG template dictionary.
   ========================================================================== */
(function () {
  'use strict';

  // JUPAS official banding by choice position (1-based)
  function placedBand(i1) { // i1 = 1-based choice number
    if (i1 <= 3) return 'A'; if (i1 <= 6) return 'B'; if (i1 <= 10) return 'C';
    if (i1 <= 15) return 'D'; return 'E';
  }

  // Non-academic admission requirements (interview/portfolio/audition/test/OEA) —
  // read directly from the DB's officially-scraped `programme.non_academic` field.
  // Informational only, never affects eligibility or score. We deliberately do NOT
  // replicate jupascal's text/discipline-heuristic inference layers (fuzzy, always
  // hedged in their own UI) — only the confirmed official data.
  function isTentativeNonAcademic(item) {
    var w = (item && item.when || '').toLowerCase();
    return /when necessary|if necessary|if required|where necessary/.test(w);
  }
  // index offer_statistics -> { year: { app:{A..E,Total,Quota}, off:{...} } }
  function statsByYear(prog) {
    var m = {};
    (prog.offer_statistics || []).forEach(function (r) {
      var y = r.Year; if (!m[y]) m[y] = {};
      var rec = { A: r['Band A'], B: r['Band B'], C: r['Band C'], D: r['Band D'], E: r['Band E'], Total: r.Total, Quota: r.Quota };
      if (r.Type === 'Application') m[y].app = rec;
      else if (r.Type === 'Offer') m[y].off = rec;
    });
    return m;
  }
  function years(prog) { return Object.keys(statsByYear(prog)).map(Number).sort(function (a, b) { return b - a; }); }

  // pooled offer/applic ratio for a band over the most recent n complete years
  // (band is a single letter: 'A'..'E', matching statsByYear's keys)
  function bandSuccess(prog, band, n) {
    n = n || 3; var m = statsByYear(prog), ys = years(prog), off = 0, app = 0, used = 0;
    for (var k = 0; k < ys.length && used < n; k++) {
      var d = m[ys[k]]; if (!d || !d.app || !d.off) continue;
      var a = d.app[band], o = d.off[band];
      if (a != null && o != null && a > 0) { off += o; app += a; used++; }
    }
    if (!app) return null;
    return { rate: off / app, offers: off, apps: app, yearsUsed: used };
  }

  // share of offers that went to Band-A applicants (latest year with offer data)
  function bandADependency(prog) {
    var m = statsByYear(prog), ys = years(prog);
    for (var k = 0; k < ys.length; k++) {
      var d = m[ys[k]];
      if (d && d.off && d.off.Total) return { share: d.off.A / d.off.Total, year: ys[k], total: d.off.Total, bandA: d.off.A };
    }
    return null;
  }

  // applicants per place (latest year with application data + quota)
  function competition(prog) {
    var m = statsByYear(prog), ys = years(prog);
    for (var k = 0; k < ys.length; k++) {
      var d = m[ys[k]];
      if (d && d.app && d.app.Total && d.app.Quota) return { ratio: d.app.Total / d.app.Quota, apps: d.app.Total, quota: d.app.Quota, year: ys[k] };
    }
    return null;
  }

  // applications trend: % change in total applications, earliest->latest (popularity)
  function applicationTrend(prog) {
    var m = statsByYear(prog), ys = years(prog).slice().reverse(); // ascending
    var first = null, last = null;
    ys.forEach(function (y) { var d = m[y]; if (d && d.app && d.app.Total) { if (first == null) first = { y: y, v: d.app.Total }; last = { y: y, v: d.app.Total }; } });
    if (!first || !last || first.y === last.y || !first.v) return null;
    return { from: first, to: last, pct: (last.v - first.v) / first.v * 100 };
  }

  // ---- Band-placement sanity check -------------------------------------------
  // Compares where the student placed a choice (Band A-E of the 20-choice list)
  // against how dependent that programme's offers are on Band-A placements
  // (bandADependency). Tiers: >=85% share = "high" (near Band-A-only in
  // practice), 50-85% = "medium" (Band A strongly preferred), <50% = "low"
  // (offers spread across bands, placement is flexible).
  var BAND_A_HIGH = 0.85, BAND_A_MED = 0.5;
  function bandPlacementCheck(prog, choiceNo) {
    var band = placedBand(choiceNo);
    var dep = bandADependency(prog);
    if (!dep) return { placedBand: band, dependency: null, tier: 'no-data', verdict: 'no-data' };
    var tier = dep.share >= BAND_A_HIGH ? 'high' : dep.share >= BAND_A_MED ? 'medium' : 'low';
    var verdict;
    if (tier === 'low') verdict = 'flexible';
    else if (band === 'A') verdict = 'appropriate';
    else verdict = tier === 'high' ? 'wrong' : 'caution';
    return { placedBand: band, dependency: dep, tier: tier, verdict: verdict };
  }

  // ---- per-choice chance synthesis -------------------------------------------
  // Combines: eligibility, score-position band, and the EMPIRICAL success rate of
  // the band the student actually placed the choice in.
  var CHANCE = { strong: 'strong', likely: 'likely', possible: 'possible', stretch: 'stretch', unlikely: 'unlikely', ineligible: 'ineligible', unknown: 'unknown' };

  function chanceForChoice(evalResult, choiceNo) {
    var prog = evalResult.programme;
    var band = placedBand(choiceNo);
    var bs = bandSuccess(prog, band, 3);
    var dep = bandADependency(prog);
    var comp = competition(prog);
    var out = { placedBand: band, bandSuccess: bs, dependency: dep, competition: comp,
      positionBand: evalResult.band, reasons: [] };

    if (!evalResult.eligibility.eligible) { out.label = CHANCE.ineligible; out.reasons.push({ key: 'notEligible' }); return out; }

    // position score: 4=>=UQ-ish/median strong, down to 1 below LQ
    var posRank = { 'above-uq': 4, 'above-median': 3, 'above-lq': 2, 'below-lq': 1, 'no-score': null }[evalResult.band];

    // empirical band reality
    var empRank = null;
    if (bs) {
      if (bs.rate >= 0.5) empRank = 4;
      else if (bs.rate >= 0.15) empRank = 3;
      else if (bs.rate >= 0.04) empRank = 2;
      else empRank = 1;
      out.reasons.push({ key: 'bandOfferRate', band: band, rate: bs.rate, offers: bs.offers, apps: bs.apps, years: bs.yearsUsed });
    }
    if (dep && dep.share >= 0.9 && (band === 'C' || band === 'D' || band === 'E'))
      out.reasons.push({ key: 'bandADominates', pct: Math.round(dep.share * 100) });

    if (posRank != null) out.reasons.push({ key: 'scorePosition', posBand: evalResult.band });

    // Synthesis: JUPAS offers go top-down, so the EMPIRICAL offer rate of the band
    // the student placed the choice in is the dominant signal. Score position refines
    // it. A strong score in a band that historically never admits => "Stretch"
    // (i.e. move it to a higher band), not "Possible".
    var viab = null; // viability of the placed band, from history
    if (bs) { viab = bs.rate >= 0.15 ? 'high' : bs.rate >= 0.04 ? 'med' : bs.rate >= 0.01 ? 'low' : 'closed'; }
    var sc = posRank == null ? null : (posRank >= 3 ? 'strong' : posRank === 2 ? 'ok' : 'weak');

    if (viab == null && sc == null) { out.label = CHANCE.unknown; return out; }
    if (viab == null) {            // no offer stats -> score only (can't confirm "Strong")
      out.label = sc === 'strong' ? CHANCE.likely : sc === 'ok' ? CHANCE.possible : CHANCE.unlikely;
    } else if (sc == null) {       // no score -> empirical viability only
      out.label = viab === 'high' ? CHANCE.likely : viab === 'med' ? CHANCE.possible : CHANCE.unlikely;
    } else {
      out.label = {
        'high-strong': CHANCE.strong,  'high-ok': CHANCE.likely,   'high-weak': CHANCE.stretch,
        'med-strong':  CHANCE.likely,  'med-ok':  CHANCE.possible, 'med-weak':  CHANCE.stretch,
        'low-strong':  CHANCE.stretch, 'low-ok':  CHANCE.unlikely, 'low-weak':  CHANCE.unlikely,
        'closed-strong': CHANCE.stretch, 'closed-ok': CHANCE.unlikely, 'closed-weak': CHANCE.unlikely
      }[viab + '-' + sc];
    }
    return out;
  }

  // ---- list-level strategy ----------------------------------------------------
  function listStrategy(choices, evalByCode) {
    // choices: array of 20 {code,intake,score,cmp,remark, no(1-based)}
    var filled = choices.filter(function (c) { return c.code; });
    var flags = [];
    var stats = { filled: filled.length, empty: 20 - filled.length, eligible: 0, ineligible: 0,
      safe: 0, moderate: 0, risky: 0, unknown: 0, byInstitution: {}, duplicates: [] };

    // duplicates
    var seen = {};
    filled.forEach(function (c) { var k = c.code.toUpperCase(); seen[k] = (seen[k] || 0) + 1; });
    Object.keys(seen).forEach(function (k) { if (seen[k] > 1) stats.duplicates.push(k); });

    var perChoice = [];
    var naDuties = []; // choices with a FIRM (non-tentative) non-academic requirement (interview/portfolio/…)
    filled.forEach(function (c) {
      var ev = evalByCode.get(c.code.toUpperCase());
      var item = { no: c.no, code: c.code.toUpperCase(), eval: ev };
      if (ev) {
        var inst = ev.programme.institution; stats.byInstitution[inst] = (stats.byInstitution[inst] || 0) + 1;
        if (ev.eligibility.eligible) stats.eligible++; else stats.ineligible++;
        var b = ev.band;
        if (b === 'above-uq' || b === 'above-median') stats.safe++;
        else if (b === 'above-lq') stats.moderate++;
        else if (b === 'below-lq') stats.risky++;
        else stats.unknown++;
        // reachiness: % margin to median (scale-independent: -ve = reach, +ve = safety)
        var medComp = ev.comparisons.find(function (x) { return x.key === 'median'; }) || ev.comparisons.find(function (x) { return x.key === 'mean' || x.key === 'expected_score'; });
        item.delta = medComp ? medComp.delta : null;
        item.pct = medComp ? medComp.percent : null;
        item.placedBand = placedBand(c.no);
        var naItems = (ev.programme.non_academic || []).filter(function (na) { return !isTentativeNonAcademic(na); });
        if (naItems.length) naDuties.push({ no: c.no, types: naItems.map(function (na) { return na.type; }) });
      }
      perChoice.push(item);
    });

    // ordering inversions: a strong safety placed above (earlier than) a big reach.
    // Compared by % margin to median so it is fair across programmes on different scales.
    var withPct = perChoice.filter(function (p) { return p.pct != null; });
    var inversions = [];
    for (var a = 0; a < withPct.length; a++)
      for (var b2 = a + 1; b2 < withPct.length; b2++)
        if (withPct[a].pct - withPct[b2].pct >= 15) // earlier choice ~15%+ safer than a later one
          inversions.push([withPct[a], withPct[b2]]);

    // safety net: an eligible choice, above median, placed in band C/D/E, with workable band success
    var safetyNet = perChoice.filter(function (p) {
      return p.eval && p.eval.eligibility.eligible && (p.eval.band === 'above-uq' || p.eval.band === 'above-median') &&
        ['C', 'D', 'E'].indexOf(p.placedBand) >= 0;
    });

    // build flags — structured {level, key, ...data}, translated by ui.js
    if (stats.empty > 0) flags.push({ level: 'warn', key: 'emptySlots', n: stats.empty });
    if (stats.duplicates.length) flags.push({ level: 'err', key: 'duplicates', codes: stats.duplicates });
    if (stats.ineligible) flags.push({ level: 'err', key: 'ineligibleCount', n: stats.ineligible });
    if (filled.length && stats.safe === 0) flags.push({ level: 'err', key: 'noSafe' });
    if (!safetyNet.length && filled.length) flags.push({ level: 'warn', key: 'noSafetyNet' });
    if (filled.length && stats.risky / Math.max(1, filled.length) >= 0.6) flags.push({ level: 'warn', key: 'mostlyReach' });
    Object.keys(stats.byInstitution).forEach(function (inst) {
      if (stats.byInstitution[inst] >= 10) flags.push({ level: 'warn', key: 'overConcentrated', inst: inst, n: stats.byInstitution[inst] });
    });
    if (naDuties.length) flags.push({ level: 'info', key: 'nonAcademicDuties', n: naDuties.length, items: naDuties });
    // NOTE (2026-07-01, per user): ordering-inversion pairs are still computed below (`inversions`,
    // returned in the strategy object) but are no longer surfaced as a flag/note anywhere — the
    // commentary was judged not useful. Re-add `flags.push({level:'warn',key:'orderingIssues',n:...})`
    // here to restore it.

    return { stats: stats, flags: flags, inversions: inversions, safetyNet: safetyNet, perChoice: perChoice };
  }

  // ---- whole-DB suggestions: eligible, above-median, not already chosen --------
  function suggestions(programmes, grades, chosenCodes, limit, perInstCap) {
    limit = limit || 12; perInstCap = perInstCap || 3;
    var chosen = new Set((chosenCodes || []).map(function (c) { return c.toUpperCase(); }));
    var out = [];
    programmes.forEach(function (p) {
      if (chosen.has(p.jupas_code.toUpperCase())) return;
      var ev = window.JUPASEngine.evaluateProgramme(p, grades);
      if (!ev.eligibility.eligible) return;
      if (ev.band !== 'above-uq' && ev.band !== 'above-median') return;
      var medComp = ev.comparisons.find(function (x) { return x.key === 'median'; }) || ev.comparisons.find(function (x) { return x.key === 'mean' || x.key === 'expected_score'; });
      out.push({ code: p.jupas_code, prog: p, eval: ev,
        delta: medComp ? medComp.delta : 0, pct: medComp ? medComp.percent : 0,
        median: medComp ? medComp.score : null, yourScore: ev.calculation.totalScore });
    });
    // rank by % margin (scale-independent), then cap per institution so one score
    // scale (e.g. PolyU's ~300-point scale) cannot crowd out the rest.
    out.sort(function (a, b) { return b.pct - a.pct; });
    var perInst = {}, capped = [];
    for (var i = 0; i < out.length && capped.length < limit; i++) {
      var inst = out[i].prog.institution;
      if ((perInst[inst] || 0) >= perInstCap) continue;
      perInst[inst] = (perInst[inst] || 0) + 1; capped.push(out[i]);
    }
    return capped;
  }

  // ---- counseling notes: assemble structured advice entries -------------------
  // Returns an array of {key, ...data} (optionally with `level` when it mirrors
  // a strategy flag) — ui.js renders these bilingually.
  function counselingNotes(strategy, choices, evalByCode) {
    var notes = [];
    var s = strategy.stats;
    notes.push({ key: 'summaryLine', filled: s.filled, safe: s.safe, moderate: s.moderate, risky: s.risky, unknown: s.unknown });
    strategy.flags.forEach(function (f) { notes.push(f); });
    if (!strategy.flags.length) notes.push({ key: 'noProblems' });
    // band balance suggestion
    if (s.filled && s.safe < 3) notes.push({ key: 'addSafeChoices' });
    return notes;
  }

  window.JUPASAnalytics = {
    placedBand: placedBand, statsByYear: statsByYear, bandSuccess: bandSuccess,
    bandADependency: bandADependency, competition: competition, applicationTrend: applicationTrend,
    bandPlacementCheck: bandPlacementCheck, isTentativeNonAcademic: isTentativeNonAcademic,
    chanceForChoice: chanceForChoice, listStrategy: listStrategy, suggestions: suggestions,
    counselingNotes: counselingNotes
  };
})();
