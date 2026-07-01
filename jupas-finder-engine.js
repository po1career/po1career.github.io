/* ============================================================================
   JUPAS scoring & evaluation engine
   Faithful port of jupascal.com's dataWorker engine (de-minified + renamed),
   so computed scores match jupascal exactly.

   Adapted from JUPASCal — https://github.com/JUPASCal/JUPASCal.github.io
   Licensed under the MIT License. Copyright (c) 2026 JUPASCal.
   See the bundled LICENSE file; this notice must be retained in redistributions.

   Exposes:  window.JUPASEngine = {
     gradesFromPdfPayload(payload) -> { canonicalSubject: grade }   // adds CSD=Attained
     evaluateProgramme(prog, grades) -> { calculation, eligibility, comparisons, band, hasScoreData }
     evaluateAll(programmes, grades) -> Map code -> result
     refScores(prog), bandOf(score, prog)
   }

   Key fidelity notes:
   - Scores are computed on the SAME year-basis as the available reference stats:
     if scores_2025 has uq/median/lq/mean -> compute on the 2025 formula/weights
     (apples-to-apples with the published median/LQ), else on 2026.
   - The student input page does NOT capture Citizenship & Social Development (CSD).
     We inject CSD = "Attained" before eligibility (virtually all DSE students attain
     it and virtually all programmes only require "Attained"). Flagged in the UI.
   - Category-C (foreign-language) handling is preserved but never fires for the
     11 electives the student page offers (none are Cat C).
   ========================================================================== */
(function () {
  'use strict';

  // ---- subject alias / expansion tables (from jupascal) ----
  var CATEGORY_C = [
    "French: Advanced Diploma of French Language Studies / Diploma of French Language Studies",
    "German: Goethe-Certificate", "Japanese: Japanese-Language Proficiency Test",
    "Korean: Test of Proficiency in Korean II", "Spanish: Diploma of Spanish as a Foreign Language",
    "Urdu: Urdu (International)"
  ];
  var ALIASES = {
    ICT: "Information and Communication Technology",
    DAT: "Design and Applied Technology",
    BAFS: "Business, Accounting and Financial Studies",
    "Business, Accounting and Financial Studies (Accounting)": "Business, Accounting and Financial Studies",
    "Business, Accounting and Financial Studies (Business Management)": "Business, Accounting and Financial Studies",
    "Technology and Living": "Technology and Living (Food Science and Technology)",
    "Combined Science (Biology and Chemistry)": "Combined Science: Biology + Chemistry",
    "Combined Science (Chemistry and Biology)": "Combined Science: Biology + Chemistry",
    "Combined Science (Biology and Physics)": "Combined Science: Biology + Physics",
    "Combined Science (Physics and Biology)": "Combined Science: Biology + Physics",
    "Combined Science (Physics and Chemistry)": "Combined Science: Physics + Chemistry",
    "Combined Science (Chemistry and Physics)": "Combined Science: Physics + Chemistry"
  };
  var EXPANSIONS = {
    "Mathematics Extended Part (Module 1 or 2)": ["Mathematics Extended Part (Module 1)", "Mathematics Extended Part (Module 2)"],
    "Combined Science": ["Combined Science: Biology + Chemistry", "Combined Science: Biology + Physics", "Combined Science: Physics + Chemistry"]
  };
  var CAT_C_SET = new Set(CATEGORY_C);

  function applyAlias(s) { return ALIASES[s] != null ? ALIASES[s] : s; }
  function isCatC(s) { return CAT_C_SET.has(s); }

  // normalize Maths / M1 / M2 names to canonical DB names
  function normSubject(t) {
    if (!t) return t;
    var e = t.toUpperCase();
    if (e === "MATHEMATICS COMPULSORY PART" || e === "MATHEMATICS" || e === "MATHEMATICS (COMPULSORY PART)")
      return "Mathematics (Compulsory Part)";
    if ((e.indexOf("MODULE 1") >= 0 || e.indexOf("CALCULUS AND STATISTICS") >= 0 || e.indexOf("M1") >= 0) && (e.indexOf("EXTENDED") >= 0 || e.indexOf("PART") >= 0))
      return "Mathematics Extended Part (Module 1)";
    if ((e.indexOf("MODULE 2") >= 0 || e.indexOf("ALGEBRA AND CALCULUS") >= 0 || e.indexOf("M2") >= 0) && (e.indexOf("EXTENDED") >= 0 || e.indexOf("PART") >= 0))
      return "Mathematics Extended Part (Module 2)";
    return t;
  }

  // subject-in-list test, honouring aliases and expansions
  function subjectMatches(list, subj) {
    list = list || [];
    var s = applyAlias(subj), o = list.map(applyAlias);
    if (o.indexOf(s) >= 0) return true;
    var exp = EXPANSIONS[s];
    if (exp && exp.some(function (r) { return o.indexOf(r) >= 0; })) return true;
    return o.some(function (r) { return EXPANSIONS[r] && EXPANSIONS[r].indexOf(s) >= 0; });
  }

  // Cat-C points (never fires for student subjects; returns 0 safely)
  function catCPoints() { return 0; }
  function catCExclusionOk(prog, subj /*, grade, pool */) { return !isCatC(subj); }

  // ---- core scoring: computeScore(grades, prog, year) == jupascal te() ----
  function computeScore(grades, prog, year) {
    year = year || "2025";
    if (!prog || !prog.score_conversion_table)
      return { totalScore: 0, selected: [], allCandidates: [], score_type: "actual" };

    var rawWeights = prog["subject_weights_" + year] || {};
    var weights = {};
    Object.keys(rawWeights).forEach(function (n) { weights[normSubject(n)] = rawWeights[n]; });

    var bestOf = (prog["best_of_weights_" + year] || []).map(function (n) {
      return Object.assign({}, n, { subjects: (n.subjects || []).map(normSubject) });
    });
    var constraints = prog.calculation_constraints || [];
    var catA = (prog.score_conversion_table.category_a) || {};

    // build candidate subjects from the student's grades
    var cands = [];
    Object.keys(grades).forEach(function (subj) {
      var grade = grades[subj];
      if (!grade || grade === "U") return;
      var basePoints = isCatC(subj) ? (catCPoints() || 0) : (catA[grade] != null ? catA[grade] : 0);
      var mult = weights[subj] || 1;
      if (subj === "Mathematics Extended Part (Module 1 or 2)")
        mult = weights["Mathematics Extended Part (Module 1)"] || weights["Mathematics Extended Part (Module 2)"] || 1;
      cands.push({ subject: subj, grade: grade, basePoints: basePoints, multiplier: mult,
        weightedScore: basePoints * mult, isCompulsory: false, isBestOfPool: false, used: false, isBonus: false });
    });

    // best-of-pool weight upgrade
    bestOf.forEach(function (rule) {
      var pool = cands.filter(function (c) { return subjectMatches(rule.subjects, c.subject); })
        .sort(function (a, b) { return b.weightedScore - a.weightedScore; });
      for (var u = 0; u < Math.min(rule.count, pool.length); u++) {
        var d = pool[u];
        if (rule.weight > d.multiplier) { d.multiplier = rule.weight; d.weightedScore = d.basePoints * d.multiplier; d.isBestOfPool = true; }
      }
    });

    // cap number of weighted subjects
    var maxW = constraints.find(function (n) { return n.type === "max_weighted_subjects"; });
    if (maxW) {
      cands.sort(function (a, b) { return b.multiplier - a.multiplier; });
      var nW = 0;
      cands.forEach(function (c) {
        if (c.multiplier > 1) {
          if (nW < Number(maxW.limit || 0)) nW++;
          else { c.multiplier = 1; c.weightedScore = c.basePoints; c.isBestOfPool = false; }
        }
      });
    }

    // compulsory subjects
    var comp = constraints.find(function (n) { return n.type === "compulsory_subjects"; });
    if (comp && comp.subjects)
      cands.forEach(function (c) { c.isCompulsory = subjectMatches(comp.subjects, c.subject); });
    var pools = constraints.filter(function (n) { return n.type === "compulsory_subject_pool"; });

    var selected = [], total = 0, N = subjectsToCount(prog, year, constraints);

    cands.filter(function (c) { return c.isCompulsory; }).forEach(function (c) {
      c.used = true; selected.push(c); total += c.weightedScore;
    });
    pools.forEach(function (pool) {
      var matched = cands.filter(function (c) { return !c.used && subjectMatches(pool.subjects || [], c.subject); })
        .sort(function (a, b) { return b.weightedScore - a.weightedScore; });
      for (var u = 0; u < Math.min(Number(pool.count || 0), matched.length) && selected.length < N; u++) {
        var d = matched[u]; d.used = true; selected.push(d); total += d.weightedScore;
      }
    });

    var rest = cands.filter(function (c) { return !c.used; }).sort(function (a, b) { return b.weightedScore - a.weightedScore; });
    var m1m2One = constraints.find(function (n) { return n.type === "maths_m1m2_as_one"; });
    rest.forEach(function (c) {
      if (selected.length >= N) return;
      if (m1m2One && c.subject.indexOf("Mathematics") >= 0 && selected.some(function (u) { return u.subject.indexOf("Mathematics") >= 0; })) return;
      c.used = true; selected.push(c); total += c.weightedScore;
    });

    var leftover = cands.filter(function (c) { return !c.used; }).sort(function (a, b) { return b.weightedScore - a.weightedScore; });

    // bonus 6th
    var b6 = resolveBonus(constraints, "bonus_6th");
    if (b6 && selected.length === 5) {
      var pool6 = leftover;
      if (b6.polyu_style) {
        var pmap = { "5**": 7, "5*": 6, "5": 5, "4": 4, "3": 3, "2": 2, "1": 1 };
        pool6 = pool6.filter(function (d) { return (pmap[d.grade] || 0) >= 3; });
      }
      var c6 = pool6[0];
      if (c6) {
        var add6 = c6.weightedScore * Number(b6.multiplier || 0);
        total += add6; c6.used = true; c6.isBonus = true; c6.weightedScore = add6; c6.bonusValue = "+" + b6.multiplier + "x";
        selected.push(c6); leftover = leftover.filter(function (d) { return d !== c6; });
      }
    }

    // bonus 7th
    var b7 = resolveBonus(constraints, "bonus_7th");
    if (b7 && selected.length === 6) {
      var c7 = leftover[0];
      if (c7) {
        var add7 = c7.weightedScore * Number(b7.multiplier || 0);
        total += add7; c7.used = true; c7.isBonus = true; c7.weightedScore = add7; c7.bonusValue = "+" + b7.multiplier + "x";
        selected.push(c7);
      }
    }

    // HKUST weighted-best bonus
    var hk = constraints.find(function (n) { return n.type === "hkust_weighted_best"; });
    if (hk && selected.length === hk.subject_count) {
      var best = cands.filter(function (c) { return !c.used; }).sort(function (a, b) { return b.basePoints - a.basePoints; })[0];
      if (best) {
        var addH = Number(hk.max_attainable_weighting || 5) * (Number(hk.bonus_percentage || 5) / 100) * best.basePoints;
        total += addH; best.weightedScore = addH; best.used = true; best.isBonus = true;
        best.bonusValue = "+" + (best.basePoints / 8.5 * Number(hk.bonus_percentage || 5)).toFixed(2) + "% of total";
        selected.push(best);
      }
    }

    // M1/M2 half replacement
    if (constraints.find(function (n) { return n.type === "m1m2_half_replacement"; })) {
      var modBest = cands.filter(function (c) { return !c.used && (c.subject.indexOf("Module 1") >= 0 || c.subject.indexOf("Module 2") >= 0 || c.subject === "Mathematics Extended Part (Module 1 or 2)"); })
        .sort(function (a, b) { return b.weightedScore - a.weightedScore; })[0];
      if (modBest) {
        var lowest = selected.filter(function (u) { return !u.isCompulsory && !u.isBonus; }).sort(function (a, b) { return a.weightedScore - b.weightedScore; })[0];
        if (lowest) {
          var oldW = lowest.weightedScore, newW = oldW / 2 + modBest.weightedScore / 2;
          if (newW > oldW) {
            total = total - oldW + newW;
            lowest.weightedScore = oldW / 2; lowest.bonusValue = "50% counted";
            modBest.used = true; modBest.weightedScore = modBest.weightedScore / 2; modBest.isBonus = true; modBest.bonusValue = "50% replacement";
            selected.push(modBest);
          }
        }
      }
    }

    return { totalScore: Number(total.toFixed(3)), formula: prog["formula_" + year], selected: selected, allCandidates: cands,
      score_type: (prog.scores_2025 && prog.scores_2025.score_type) || "actual" };
  }

  // number of subjects to count (best4/5/6 etc.)
  function subjectsToCount(prog, year, constraints) {
    var formula = prog["formula_" + year] || "";
    var parsed = parseCountFromFormula(formula, prog.institution);
    if (parsed != null) return parsed;
    var id = prog["formula_" + year + "_id"];
    var has6 = constraints.some(function (h) { return h.type === "bonus_6th" || h.type === "additional_bonus_6th"; });
    var has7 = constraints.some(function (h) { return h.type === "bonus_7th"; });
    if (id === "best4") return 4;
    if (id === "best6" || has7) return 6;
    if (id === "best5" || has6) return 5;
    if (formula.indexOf("Best 6") >= 0 || formula.indexOf("3 Core + 3 Elective") >= 0 || formula.indexOf("4 Core + 2 Elective") >= 0) return 6;
    return 5;
  }

  function parseCountFromFormula(formula, institution) {
    if (!formula || (institution !== "HKU" && institution !== "CityUHK")) return null;
    var s = formula.replace(/\+?\s*\d*\.?\d+\s*x\s*\d+(?:st|nd|rd|th)\s+Best\b[^+]*Subject/gi, " ");
    if (institution === "CityUHK") {
      var r = s.match(/(\d+)\s*core\s*\+\s*(\d+)\s*elective/i);
      if (r) return Number(r[1]) + Number(r[2]);
      var a = s.match(/Best\s+(\d+)\s+subjects?/i);
      return a ? Number(a[1]) : null;
    }
    var count = 0, found = false;
    s.split("+").forEach(function (part) {
      var a = part.trim();
      if (!a) return;
      var p = a.match(/Best\s+(\d+)\b/i);
      if (p) { count += Number(p[1]); found = true; return; }
      if (/Best of /i.test(a) || /\bBest\b.*\bSubject\b/i.test(a) || /\b(Eng|Math|Chin|M1|M2)/i.test(a)) { count += 1; found = true; }
    });
    return (found && count >= 1 && count <= 8) ? count : null;
  }

  function resolveBonus(constraints, type) {
    var s = constraints.find(function (o) { return o.type === type; });
    if (!s && type === "bonus_6th" && constraints.some(function (o) { return o.type === "additional_bonus_6th"; }))
      return { type: type, multiplier: 0.1, polyu_style: true };
    return s;
  }

  // ---- eligibility (min requirements) == jupascal oe()/F()/re()/ie() ----
  var CORE_NAME = { chi: "Chinese Language", eng: "English Language",
    math: "Mathematics (Compulsory Part)", csd: "Citizenship and Social Development" };

  function meetsGrade(got, need, prog, subj) {
    if (!need) return true;
    if (!got) return false;
    var catA = (prog.score_conversion_table && prog.score_conversion_table.category_a) || {};
    var catC = (prog.score_conversion_table && prog.score_conversion_table.category_c) || {};
    function pts(p) {
      var h = String(p).toUpperCase();
      if (subj && isCatC(subj)) return catCPoints() || 0;
      if (catA[h] !== undefined) return catA[h];
      if (catC[h] !== undefined) return catC[h];
      if (h === "A" || h === "ATTAINED") return 2;
      return parseFloat(h) || 0;
    }
    return pts(got) >= pts(need);
  }

  function electiveQualifies(pool, subj, grade, prog) {
    var ok = pool.subjects.indexOf("Any") >= 0 || pool.subjects.indexOf("*") >= 0 || subjectMatches(pool.subjects, subj);
    var isM1M2 = subj.indexOf("Module 1") >= 0 || subj.indexOf("Module 2") >= 0;
    var noteExcludesM1M2 = pool.note && pool.note.indexOf("excluding M1/M2") >= 0;
    if (!ok && pool.note && pool.note.indexOf("Category A") >= 0 && isM1M2 && !noteExcludesM1M2) ok = true;
    // "CategoryA" token (added to the DB 2026-07): any Category-A subject qualifies, minus
    // whatever the pool's own note excludes (seen so far: "excluding M1/M2").
    if (!ok && pool.subjects.indexOf("CategoryA") >= 0 && !isCatC(subj) && !(isM1M2 && noteExcludesM1M2)) ok = true;
    if (!ok) return false;
    if (!catCExclusionOk(prog, subj, grade, pool)) return false;
    return meetsGrade(grade, pool.grade, prog, subj);
  }

  // bipartite matching of student electives to elective requirement pools
  function matchElectives(grades, pools, excludeSet, prog) {
    var subjects = Object.keys(grades).filter(function (k) { return !excludeSet.has(k) && k.indexOf(":subject") < 0; });
    var slots = [];
    pools.forEach(function (pool, idx) { for (var c = 0; c < Math.max(0, pool.count || 0); c++) slots.push(idx); });
    var slotOptions = slots.map(function (poolIdx) {
      return subjects.map(function (s, i) { return electiveQualifies(pools[poolIdx], s, grades[s], prog) ? i : -1; }).filter(function (i) { return i >= 0; });
    });
    var subjToSlot = new Array(subjects.length).fill(-1);
    var slotToSubj = new Array(slots.length).fill(-1);
    function augment(slot, visited) {
      for (var k = 0; k < slotOptions[slot].length; k++) {
        var c = slotOptions[slot][k];
        if (!visited[c]) {
          visited[c] = true;
          if (subjToSlot[c] === -1 || augment(subjToSlot[c], visited)) { subjToSlot[c] = slot; slotToSubj[slot] = c; return true; }
        }
      }
      return false;
    }
    var order = slots.map(function (_, i) { return i; }).sort(function (a, b) { return slotOptions[a].length - slotOptions[b].length; });
    order.forEach(function (slot) { augment(slot, new Array(subjects.length).fill(false)); });
    var perPool = pools.map(function () { return []; });
    slotToSubj.forEach(function (subjIdx, slot) { if (subjIdx >= 0) perPool[slots[slot]].push(subjects[subjIdx]); });
    return perPool;
  }

  function checkEligibility(grades, minReq, prog) {
    var details = [], eligible = true;
    ["chi", "eng", "math", "csd"].forEach(function (key) {
      var got = grades[CORE_NAME[key]], need = minReq && minReq[key], pass = meetsGrade(got, need, prog);
      if (!pass) eligible = false;
      details.push({ label: key.toUpperCase(), pass: pass, got: got || "N/A", need: need });
    });
    var exclude = new Set(["Chinese Language", "English Language", "Mathematics (Compulsory Part)", "Citizenship and Social Development"]);
    var slots = [{ label: "Elective 1", pool: minReq && minReq.elect1 }, { label: "Elective 2", pool: minReq && minReq.elect2 }];
    var pools = slots.map(function (a) { return a.pool; }).filter(Boolean);
    var matched = matchElectives(grades, pools, exclude, prog);
    var b = 0;
    slots.forEach(function (a) {
      if (!a.pool) { details.push({ label: a.label, pass: true, got: "N/A", need: "N/A" }); return; }
      var got = matched[b++], pass = got.length >= a.pool.count;
      if (!pass) eligible = false;
      details.push({ label: a.label, pass: pass, got: got.length > 0 ? grades[got[0]] : "None", need: a.pool.grade,
        note: a.pool.note || a.pool.subjects.join("/") || "", matchedSubjects: got });
    });
    return { eligible: eligible, details: details };
  }

  // ---- position vs reference scores == jupascal le()/de()/ue() ----
  function refScores(prog) {
    var e = prog.scores_2025 || {}, lq = e.lq != null ? e.lq : null, uq = e.uq != null ? e.uq : null;
    if (e.median != null) return { lq: lq, median: e.median, uq: uq, source: "actual" };
    if (e.mean != null) return { lq: lq, median: e.mean, uq: uq, source: "mean" };
    if (e.expected_score != null) return { lq: lq, median: e.expected_score, uq: uq, source: "expected" };
    return { lq: lq, median: null, uq: uq, source: "none" };
  }

  function comparisons(score, prog) {
    var labels = { uq: "UQ", median: "Median", lq: "LQ", mean: "Mean", expected_score: "Expected" };
    var o = prog.scores_2025 || {}, keys = ["uq", "median", "lq", "mean"];
    if (o.median == null && o.mean == null && o.expected_score != null) keys.push("expected_score");
    var out = [];
    keys.forEach(function (k) {
      var a = o[k];
      if (!a || !score) return;
      out.push({ key: k, label: labels[k], score: a, delta: score - a, percent: (score - a) / a * 100 });
    });
    return out;
  }

  function bandOf(score, prog) {
    var r = refScores(prog), s = r.lq, o = r.median, i = r.uq;
    if (!score || (i == null && o == null && s == null)) return "no-score";
    if (i != null && score >= i) return "above-uq";
    if (o != null && score >= o) return "above-median";
    if (s != null && score >= s) return "above-lq";
    return "below-lq";
  }

  function hasRefStats(prog) {
    var e = prog.scores_2025 || {};
    return !!(e.uq || e.median || e.lq || e.mean);
  }

  // ---- top-level per-programme evaluation == jupascal ae() ----
  function evaluateProgramme(prog, grades) {
    var calc = computeScore(grades, prog, hasRefStats(prog) ? "2025" : "2026");
    var elig = checkEligibility(grades, prog.min_requirements_2026, prog);
    var comps = comparisons(calc.totalScore, prog);
    return { programme: prog, calculation: calc, eligibility: elig, comparisons: comps,
      band: bandOf(calc.totalScore, prog), hasScoreData: comps.length > 0 };
  }

  function evaluateAll(programmes, grades) {
    var map = new Map();
    programmes.forEach(function (p) { map.set(p.jupas_code, evaluateProgramme(p, grades)); });
    return map;
  }

  // ---- convert the student-page PDF payload into a canonical grades map ----
  var ELECT_CANON = {
    bafs: "Business, Accounting and Financial Studies", bio: "Biology", chem: "Chemistry",
    chist: "Chinese History", chinlit: "Chinese Literature", econ: "Economics", geog: "Geography",
    hist: "History", ict: "Information and Communication Technology",
    m2: "Mathematics Extended Part (Module 2)", phys: "Physics"
  };
  function gradesFromPdfPayload(payload) {
    var g = {};
    var core = payload.core || {};
    if (core.chi) g["Chinese Language"] = core.chi;
    if (core.eng) g["English Language"] = core.eng;
    if (core.math) g["Mathematics (Compulsory Part)"] = core.math;
    (payload.elect || []).forEach(function (e) {
      if (e && e.s && e.lv && ELECT_CANON[e.s]) g[ELECT_CANON[e.s]] = e.lv;
    });
    // student page does not capture CSD -> assume Attained (flagged in UI)
    g["Citizenship and Social Development"] = "Attained";
    return g;
  }

  window.JUPASEngine = {
    gradesFromPdfPayload: gradesFromPdfPayload,
    evaluateProgramme: evaluateProgramme,
    evaluateAll: evaluateAll,
    computeScore: computeScore,
    checkEligibility: checkEligibility,
    refScores: refScores,
    comparisons: comparisons,
    bandOf: bandOf,
    subjectsToCount: subjectsToCount
  };
})();
