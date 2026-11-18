#!/usr/bin/env node
/* ============================================================
   tools/life-paths-test.mjs — simulation tests for DSE Life Paths (life-paths-core.js).
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
for (const f of ['jupas-engine.js', 'jupas-finder-core.js', 'life-paths-core.js'])
  new Function('window', fs.readFileSync(path.join(ROOT, f), 'utf8'))(window);
const C = window.LifePathsCore, DB = C.indexDB(LIST);

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

console.log(`\nsummary: ${offers}/${N} simulated students got a Main Round offer with a suggested list ` +
  `(${eligibleAny} had any suggestion; avg list ${(suggestedLen / N).toFixed(1)} choices; ${lowerCleared} lower choices also cleared)`);
console.log(failed ? `\n✗ ${failed} check(s) failed` : '\n✓ all checks passed');
process.exit(failed ? 1 : 0);
