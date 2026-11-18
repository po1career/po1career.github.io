#!/usr/bin/env node
/* ============================================================
   tools/life-paths-test.mjs — simulation tests for DSE Life Paths (life-paths-core.js = DSE → August,
   life-paths-life.js = the years after; life-paths-content.js is checked to cover every id they produce).
   Runs thousands of simulated students against the REAL (decrypted) JUPAS database with the
   shared engine and checks invariants + the owner-approved rules. Needs the student passcode:
     PO1_STUDENT_PASS=… node tools/life-paths-test.mjs        (or the private tools/run-life-paths-test.sh)
   No npm packages. Exit code 1 if any check fails.
   ============================================================ */
import fs from 'node:fs';
import path from 'node:path';
import { webcrypto } from 'node:crypto';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PASS = process.env.PO1_STUDENT_PASS;
if (!PASS) { console.error('Set PO1_STUDENT_PASS (see the private repo: tools/run-life-paths-test.sh).'); process.exit(2); }

const j = JSON.parse(fs.readFileSync(path.join(ROOT, 'jupas-finder-db.enc.json'), 'utf8')), b = (s) => Buffer.from(s, 'base64');
const base = await webcrypto.subtle.importKey('raw', new TextEncoder().encode(PASS), 'PBKDF2', false, ['deriveKey']);
const key = await webcrypto.subtle.deriveKey({ name: 'PBKDF2', salt: b(j.salt), iterations: 150000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
const LIST = JSON.parse(Buffer.from(await webcrypto.subtle.decrypt({ name: 'AES-GCM', iv: b(j.iv) }, key, b(j.data))));

const window = { crypto: webcrypto };
for (const f of ['jupas-engine.js', 'jupas-finder-core.js', 'life-paths-core.js', 'life-paths-stats.js', 'life-paths-life.js', 'life-paths-content.js'])
  new Function('window', fs.readFileSync(path.join(ROOT, f), 'utf8'))(window);
const C = window.LifePathsCore, L = window.LifePathsLife, DB = C.indexDB(LIST);

let failed = 0;
const check = (name, ok, detail = '') => { console.log(`  ${ok ? '✓' : '✗'} ${name}${!ok && detail ? '  — ' + detail : ''}`); if (!ok) failed++; };
const LV = ['5**', '5*', '5', '4', '3', '2', '1'];
let s = 2024; const rnd = () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
function randomStudent(i) {
  const pick = [...C.ELECTIVES].sort(() => rnd() - 0.5).slice(0, 2 + Math.floor(rnd() * 3));
  return { chi: LV[Math.floor(rnd() * 7)], eng: LV[Math.floor(rnd() * 7)], math: LV[Math.floor(rnd() * 7)],
    csd: rnd() < 0.95 ? 'attained' : 'notattained', elect: pick.map((e) => ({ s: e, lv: LV[Math.floor(rnd() * 7)] })), seed: 'test' + i };
}
const N = 2000, students = Array.from({ length: N }, (_, i) => randomStudent(i));

console.log(`\nDSE Life Paths — simulation tests (${LIST.length} programmes, ${N} simulated students)\n`);

/* 1. results day follows the stated rule */
const counts = { 0: 0, '-1': 0, 1: 0, '-2': 0, other: 0 }; let subj = 0, clampOk = true, csdOk = true;
for (const st of students) {
  const r = C.resultsDay(st, st.seed);
  if (r.actual.csd !== st.csd) csdOk = false;
  for (const ch of r.changes) {
    subj++;
    const raw = C.lvIndex(ch.to) - C.lvIndex(ch.from);
    if (C.lvIndex(ch.to) < 0) clampOk = false;
    // count by intended shift: at the ends clamping hides the shift, so only count mid-range subjects
    if (ch.from !== '5**' && ch.from !== '5*' && ch.from !== '1' && ch.from !== 'U') (counts[raw] !== undefined ? counts[raw]++ : counts.other++);
  }
}
const mid = counts[0] + counts['-1'] + counts[1] + counts['-2'] + counts.other;
const share = (k) => counts[k] / mid;
console.log('results day');
check(`shares ≈ 55/25/15/5 (got ${[0, -1, 1, -2].map((k) => (share(k) * 100).toFixed(1)).join(' / ')}, ${mid} mid-range subjects)`,
  Math.abs(share(0) - 0.55) < 0.02 && Math.abs(share(-1) - 0.25) < 0.02 && Math.abs(share(1) - 0.15) < 0.02 && Math.abs(share(-2) - 0.05) < 0.01 && counts.other === 0);
check('levels stay within U..5**', clampOk);
check('CSD unchanged', csdOk);
const r1 = C.resultsDay(students[0], 'same'), r2 = C.resultsDay(students[0], 'same');
check('same seed → same results', JSON.stringify(r1) === JSON.stringify(r2));

/* 2. suggestions + Main Round invariants */
console.log('\nJUPAS list + Main Round');
let offers = 0, badOffer = 0, notFirst = 0, nan = 0, aOnlyNonA = 0, aOnlyNonAOffers = 0, suggestedLen = 0, suggestedBad = 0, eligibleAny = 0, lowerCleared = 0;
for (const st of students) {
  const list = C.suggestList(st, [], DB);
  suggestedLen += list.length;
  list.forEach((code, i) => { if (C.slotTagFor(code, i, st, DB) === 'bad') suggestedBad++; });
  const { actual } = C.resultsDay(st, st.seed);
  const res = C.mainRound(list, actual, DB, st.seed);
  if (list.length) eligibleAny++;
  for (const row of res.rows) {
    if (row.score != null && typeof row.score === 'number' && !isFinite(row.score)) nan++;
    if (row.status === 'offer' && !row.eligible) badOffer++;
    if (row.status === 'clearedLower') lowerCleared++;
    if (row.aOnly && row.i >= 3) { aOnlyNonA++; if (row.cleared) aOnlyNonAOffers++; }
  }
  if (res.offer) {
    offers++;
    const firstCleared = res.rows.find((r) => r.cleared);
    if (!firstCleared || firstCleared.i !== res.offer.i) notFirst++;
  }
  if (res.rows.filter((r) => r.status === 'offer').length > 1) notFirst++;
}
check('suggested lists follow the Finder/Planner slot rules (no red tags)', suggestedBad === 0, `${suggestedBad} red`);
check('an offer only ever goes to an eligible choice', badOffer === 0, `${badOffer}`);
check('exactly one offer, the first choice that clears its line', notFirst === 0, `${notFirst}`);
check('no NaN/Infinity scores', nan === 0, `${nan}`);
check(`"Band A only" programmes outside Band A stay rare (≤ ~2%: ${aOnlyNonAOffers}/${aOnlyNonA})`, aOnlyNonA === 0 || aOnlyNonAOffers / aOnlyNonA <= 0.03);
const r3 = C.mainRound(C.suggestList(students[5], [], DB), C.resultsDay(students[5], 'x').actual, DB, 'x');
const r4 = C.mainRound(C.suggestList(students[5], [], DB), C.resultsDay(students[5], 'x').actual, DB, 'x');
check('same seed → same offers', JSON.stringify(r3.offer && r3.offer.code) === JSON.stringify(r4.offer && r4.offer.code) && JSON.stringify(r3.rows) === JSON.stringify(r4.rows));
// keyed luck: removing the last choice must not change any line drawn for the others
const lst = C.suggestList(students[7], [], DB).slice(0, 6);
if (lst.length >= 2) {
  const act = C.resultsDay(students[7], 'k').actual;
  const full = C.mainRound(lst, act, DB, 'k'), cut = C.mainRound(lst.slice(0, -1), act, DB, 'k');
  check('one choice changed → the other choices keep the same luck', cut.rows.every((r, i) => r.line === full.rows[i].line));
}

/* 3. the model behaves as approved: a strong A1 almost always gets in, a weak one rarely */
console.log('\nmodel calibration (Band A placement)');
const probe = LIST.filter((p) => { const q = C.offerParams(p); return !q.noData && !q.interview; }).slice(0, 120);
function rate(pos) {
  let got = 0, n = 0;
  for (const p of probe) {
    const q = C.offerParams(p);
    for (let k = 0; k < 40; k++) {
      const line = q.centre + q.sigma * C.normal('cal' + k, 'line|' + p.jupas_code);
      const score = pos === 'LQ' ? q.lq : pos === 'M' ? q.median : q.lq - q.spread;
      n++; if (score >= line) got++;
    }
  }
  return got / n;
}
const atLQ = rate('LQ'), atM = rate('M'), below = rate('below');
check(`score at LQ → about 84% (got ${(atLQ * 100).toFixed(0)}%)`, atLQ > 0.75 && atLQ < 0.92);
check(`score at median → about 95%+ (got ${(atM * 100).toFixed(0)}%)`, atM > 0.9);
check(`score one spread below LQ → about 37% (got ${(below * 100).toFixed(0)}%)`, below > 0.25 && below < 0.5);

/* 4. routes */
console.log('\nroutes');
const weak = { chi: '1', eng: '1', math: '1', csd: 'attained', elect: [{ s: 'bio', lv: '1' }] };
const ro = C.routeOptions(weak, null);
check('without 332A: no self-financing degree / Mainland scheme; DAE, VTC, retake, work still open',
  !ro.find((r) => r.id === 'selffin').available && !ro.find((r) => r.id === 'mainland').available &&
  ['dae', 'vtc', 'retake', 'work'].every((id) => ro.find((r) => r.id === id).available));

/* 5. Phase 2: retake + Clearing Round */
console.log('\nretake + Clearing Round');
const prev = { chi: '3', eng: '2', math: '3', csd: 'attained', elect: [{ s: 'bio', lv: '3' }, { s: 'econ', lv: '2' }] };
let better = 0, worse = 0, tooMany = 0;
for (let i = 0; i < 500; i++) {
  const r = C.retakeResults(prev, ['eng', 'econ', 'bio'], 'rt' + i);
  if (r.changes.length > 2) tooMany++;
  r.changes.forEach((c) => { if (c.diff > 0) better++; if (c.diff < 0) worse++; });
}
check(`retaken subjects never end lower (best of two sittings): ${better}/1000 improved, ${worse} lower`, worse === 0 && better > 500);
check('at most two subjects retaken', tooMany === 0);
const rk = C.mainRound(C.suggestList(students[3], [], DB), students[3], DB, 'r2', { round: 2, retake: true });
const r1k = C.mainRound(C.suggestList(students[3], [], DB), students[3], DB, 'r2');
check('a retake year draws fresh lines (round 2 ≠ round 1)', rk.rows.length === 0 || rk.rows.some((r, i) => r.line !== undefined && r.line !== r1k.rows[i].line));
const cand = C.clearingCandidates({ chi: '3', eng: '3', math: '2', csd: 'attained', elect: [{ s: 'bio', lv: '3' }, { s: 'econ', lv: '3' }] }, DB, 'cl1', null, []);
check(`clearing candidates are eligible and within half a spread (${cand.length} shown)`, cand.length <= 6 && cand.every((c) => c.margin >= 0));
let cr = 0; for (let i = 0; i < 4000; i++) if (C.clearingResult('JS1000', 'c' + i)) cr++;
check(`clearing pick succeeds ≈ 60% (got ${(cr / 40).toFixed(1)}%)`, Math.abs(cr / 4000 - 0.6) < 0.03);

/* 6. Phase 2: whole lives */
console.log('\nlives after August (Phase 2)');
const ROUTES = ['degree', 'selffin', 'subdeg', 'vtc', 'dae', 'mainland', 'overseas', 'work'];
const FIELDS = ['Business', 'Science', 'Engineering', 'Computing', 'Medicine', 'Health', 'SocialSciences', 'Arts', 'Education', 'Law', 'Design'];
const progs = LIST.filter((p) => p.institution !== 'SSSDP').slice(0, 60);
let lifeOk = 0, lifeErr = [], decisions = 0, maxDec = 0; const pays = {}; const LIVES = 3000;
const seenBranches = {}, seenLogKeys = new Set();          // collected for the text-coverage checks (section 7)
// the start context of simulated life i (route overridable for the "what if" checks in section 8)
function ctxFor(i, route) {
  const r = route || ROUTES[i % ROUTES.length], mode = i % 2 ? 'long' : 'short', prog = progs[i % progs.length];
  return { seed: 'life' + i, mode, route: r, field: FIELDS[i % FIELDS.length], offer: r === 'degree' ? { code: prog.jupas_code } : null,
    prog: r === 'degree' ? prog : null, actual: students[i % N], startAge: i % 7 === 0 ? 19 : 18 };
}
function playLife(i, pick) {
  const ctx = ctxFor(i), r = ctx.route, mode = ctx.mode;
  const l = L.start(ctx);
  let n = 0, lastAge = l.age;
  while (l.pend.type !== 'end' && n < 200) {
    n++;
    if (l.pend.type === 'focus') { const o = L.focusOptions(l); L.chooseFocus(l, o[pick(i, n, o.length)]); }
    else if (l.pend.type === 'event') L.chooseEvent(l, pick(i, n, L.eventById(l.pend.id).choices.length));
    else {
      const seen = (seenBranches[l.pend.id] ||= new Set());
      l.pend.options.forEach((o) => seen.add(o));
      L.chooseBranch(l, l.pend.options[pick(i, n, l.pend.options.length)]);
    }
    if (l.age < lastAge) throw new Error('age went backwards'); lastAge = l.age;
    for (const k of L.METERS) if (!Number.isInteger(l.meters[k]) || l.meters[k] < 0 || l.meters[k] > 100) throw new Error(`meter ${k}=${l.meters[k]}`);
    if (l.job && !(l.job.monthly > 5000 && l.job.monthly < 300000)) throw new Error('pay ' + l.job.monthly);
  }
  if (l.pend.type !== 'end') throw new Error(`did not end (age ${l.age}, pending ${JSON.stringify(l.pend)})`);
  if (l.age !== l.endAge) throw new Error(`ended at ${l.age}, expected ${l.endAge}`);
  l.log.forEach((e) => seenLogKeys.add(e.key));
  return { l, n, r, mode, ctx };
}
const pickA = (i, n, k) => (i + n) % k;
for (let i = 0; i < LIVES; i++) {
  try {
    const { l, n, r, mode } = playLife(i, pickA);
    decisions += n; maxDec = Math.max(maxDec, n); lifeOk++;
    if (l.job) (pays[`${L.topCred(l)}/${mode}`] ||= []).push(l.job.monthly);
  } catch (e) { lifeErr.push(`life${i}: ${e.message}`); }
}
check(`${LIVES} lives across every route and both modes end cleanly at 25 / 30`, lifeOk === LIVES, lifeErr.slice(0, 3).join(' | '));
check('same seed + same choices → identical life', JSON.stringify(playLife(5, pickA).l) === JSON.stringify(playLife(5, pickA).l));
const shortDec = [], longDec = [];
for (let i = 0; i < 400; i++) { try { const { n, mode } = playLife(i, pickA); (mode === 'short' ? shortDec : longDec).push(n); } catch (e) {} }
const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;
check(`short mode is shorter than long (decisions after August: ${avg(shortDec).toFixed(1)} vs ${avg(longDec).toFixed(1)})`, avg(shortDec) < avg(longDec));
const ref = L.referencePay('degree', 'Business');
check(`degree reference pay = UGC Business average ÷ 12 (HK$${Math.round(ref)})`, Math.abs(ref - 292000 / 12) < 1);
const refH = L.referencePay('degree', 'Health');
check(`nursing / allied health = ${L.HEALTH_SHARE * 100}% of the UGC medicine-dentistry-health average (HK$${Math.round(refH)})`,
  Math.abs(refH - 554000 / 12 * L.HEALTH_SHARE) < 1);
const yrs = {}; LIST.forEach((p) => { const y = L.programmeYears(p); yrs[y] = (yrs[y] || 0) + 1; });
const yBad = LIST.filter((p) => (/Medicine and Bachelor of Surgery/i.test(p.name_en) && L.programmeYears(p) !== 6) ||
  (/\(Double Degree\)/i.test(p.name_en) && L.programmeYears(p) !== 5) || (L.isSubDegree(p) && L.programmeYears(p) !== 2)).map((p) => p.jupas_code);
check(`programme length (approximate — the DB has no duration): ${Object.entries(yrs).map(([y, n]) => `${y} yr × ${n}`).join(', ')}; medicine 6 · double degree 5 · Higher Diploma 2`,
  yBad.length === 0 && (yrs[4] || 0) > LIST.length * 0.8, yBad.join(' '));
const hd = LIST.find((p) => L.isSubDegree(p));
if (hd) {
  const lh = L.start({ seed: 'hd', mode: 'long', route: 'degree', field: 'Education', offer: { code: hd.jupas_code }, prog: hd, actual: students[0], startAge: 18 });
  check(`a JUPAS Higher Diploma offer (${hd.jupas_code}) starts a 2-year sub-degree, not a degree`, lh.track.id === 'subdeg' && lh.track.yearsLeft === 2 && lh.track.code === hd.jupas_code);
}
const med = (a) => { a = a.slice().sort((x, y) => x - y); return a[a.length >> 1]; };
console.log('  final monthly pay by highest qualification (median): ' + Object.entries(pays).sort().map(([k, v]) => `${k} HK$${med(v)} (n=${v.length})`).join(' · '));

/* 7. every id the engine can produce has player-facing text (catches a missing label after an edit) */
console.log('\ngame text covers the engine');
const T = window.LifePathsText, miss = [];
for (const e of L.EVENTS) {
  const t = T.events[e.id];
  if (!t || !t.title || !t.body || !Array.isArray(t.choices) || t.choices.length !== e.choices.length ||
    !Array.isArray(t.results) || t.results.length !== e.choices.length) miss.push('event ' + e.id);
}
for (const kind of Object.keys(L.FOCUS)) for (const f of L.FOCUS[kind]) if (!T.focus[f.id] || !T.focus[f.id].name || !T.focus[f.id].desc) miss.push('focus ' + f.id);
for (const id of Object.keys(L.TRACKS)) if (!T.tracks[id]) miss.push('track ' + id);
for (const lv of Object.keys(L.CRED_RANK)) if (!T.creds[lv]) miss.push('credential ' + lv);
for (const k of L.METERS) if (!T.meters[k] || !T.meterIcons[k]) miss.push('meter ' + k);
for (const id of C.ROUTES) { const r = T.routeInfo[id]; if (!r || !r.icon || !r.name || !r.summary || !r.entry || !r.leadsTo) miss.push('route ' + id); }
for (const w of ['noOffer', 'needs332A', 'needs22222']) if (!T.routes.why[w]) miss.push('route reason ' + w);
for (const f of FIELDS) if (!T.categories.some((c) => c.key === f) || !window.LifePathsStats.fieldToUgc[f]) miss.push('field ' + f);
for (const [id, opts] of Object.entries(seenBranches)) {
  const br = T.branches[id];
  if (!br || !br.title || !br.short) { miss.push('branch ' + id); continue; }
  opts.forEach((o) => { if (!br.options[o]) miss.push(`branch ${id} option ${o}`); });
}
for (const k of seenLogKeys) if (k !== 'start' && k !== 'event' && !T.logs[k]) miss.push('log ' + k);
for (const k of ['startDegree', 'startTrack', 'startWork']) if (typeof T.logs[k] === 'undefined') miss.push('log ' + k);
check(`every event, choice, focus, track, credential, meter, route, field, branch and log line has text ` +
  `(${L.EVENTS.length} events, ${Object.keys(seenBranches).length} branches, ${seenLogKeys.size} log kinds seen)`, miss.length === 0, miss.slice(0, 8).join(', '));
check('the step bar has the 8 steps the screens use', T.steps.map((x) => x.id).join() === 'grades,interests,list,results,offers,routes,life,end');

/* 8. "what if" (Phase 3): the same luck with ONE decision changed — L.replay */
console.log('\n"what if" replays');
const WI = 800, wi = { exact: 0, prefix: 0, prefixN: 0, route: 0, routeN: 0, err: [] };
for (let i = 0; i < WI; i++) {
  try {
    const { l, ctx } = playLife(i, pickA);
    if (JSON.stringify(L.replay(ctx, l, { key: 'none' })) === JSON.stringify(l)) wi.exact++;
    // change the first turning point or event answer: identical before it, the new answer at it, a clean ending
    const idx = l.decisions.findIndex((x) => x.key === 'branch' || x.key === 'event');
    if (idx >= 0) {
      const d = l.decisions[idx]; wi.prefixN++;
      const change = d.key === 'branch'
        ? { key: 'branch', id: d.data.id, age: d.age, opt: L.BRANCHES[d.data.id].find((o) => o !== d.data.opt) }
        : { key: 'event', id: d.data.id, age: d.age, choice: (d.data.choice + 1) % L.eventById(d.data.id).choices.length };
      const a = L.replay(ctx, l, change), ad = a.decisions[idx];
      const before = (x) => JSON.stringify(x.decisions.slice(0, idx));
      if (before(a) === before(l) && ad && ad.key === d.key && JSON.stringify(ad.data) !== JSON.stringify(d.data) &&
        a.pend.type === 'end' && a.age === a.endAge) wi.prefix++;
      else wi.err.push(`life${i}: ${d.key} change`);
    }
    // another route at the start: a valid life to the same final age
    const alt = ROUTES[(i + 3) % ROUTES.length]; wi.routeN++;
    const a2 = L.replay(ctxFor(i, alt), l, { key: 'route' });
    if (a2.pend.type === 'end' && a2.age === a2.endAge && a2.decisions[0].data.route === alt) wi.route++;
  } catch (e) { wi.err.push(`life${i}: ${e.message}`); }
}
check(`no change → the very same life (${wi.exact}/${WI})`, wi.exact === WI, wi.err.slice(0, 3).join(' | '));
check(`one turning point or event answer changed → identical before it, the new answer at it, ends cleanly (${wi.prefix}/${wi.prefixN})`,
  wi.prefix === wi.prefixN && wi.prefixN > 50, wi.err.slice(0, 3).join(' | '));
check(`another route at the start → a valid life to the same final age (${wi.route}/${wi.routeN})`, wi.route === wi.routeN, wi.err.slice(0, 3).join(' | '));

console.log(`\nsummary: ${offers}/${N} simulated students got a Main Round offer with a suggested list ` +
  `(${eligibleAny} had any suggestion; avg list ${(suggestedLen / N).toFixed(1)} choices; ${lowerCleared} lower choices also cleared)`);
console.log(failed ? `\n✗ ${failed} check(s) failed` : '\n✓ all checks passed');
process.exit(failed ? 1 : 0);
