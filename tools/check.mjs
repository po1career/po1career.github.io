#!/usr/bin/env node
/* ============================================================
   tools/check.mjs — the site's safety checks, in one place.
   Run locally before every PR (same checks CI runs):
       node tools/check.mjs                    # whole-repo checks
       node tools/check.mjs --base origin/main # + "did you bump ?v=" checks for a PR
   No dependencies; Node 18+. Exit code 1 if any ERROR.
   Rules are explained in AGENTS.md.
   ============================================================ */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
process.chdir(ROOT);
const CI = !!process.env.GITHUB_ACTIONS;
const argBase = (() => { const i = process.argv.indexOf('--base'); return i > 0 ? process.argv[i + 1] : null; })();

const errors = [], warnings = [];
function err(check, msg, file) { errors.push({ check, msg, file }); }
function warn(check, msg, file) { warnings.push({ check, msg, file }); }
const git = (...a) => execFileSync('git', a, { encoding: 'utf8' });
const tracked = git('ls-files').split('\n').filter(Boolean);
const read = (f) => fs.readFileSync(f, 'utf8');
const htmls = tracked.filter((f) => f.endsWith('.html'));
const html = Object.fromEntries(htmls.map((f) => [f, read(f)]));

/* ---------- helpers ---------- */
// every local src/href in an HTML file: { url, path, v }
function refsOf(file, src = html[file]) {
  const out = [], re = /(?:src|href)\s*=\s*"([^"]+)"/g, dir = path.posix.dirname(file);
  let m;
  while ((m = re.exec(src))) {
    const url = m[1];
    if (/^(https?:|data:|mailto:|tel:|\/\/|#)/i.test(url)) continue;
    const clean = url.split('#')[0];
    const [p, q] = clean.split('?');
    if (!p) continue;
    const v = /(?:^|&)v=(\d+)/.exec(q || '');
    out.push({ url, path: path.posix.normalize(p.startsWith('/') ? p.slice(1) : (dir === '.' ? p : dir + '/' + p)), v: v ? +v[1] : null });
  }
  return out;
}
const refs = Object.fromEntries(htmls.map((f) => [f, refsOf(f)]));
function swCore(src) {
  const m = /var\s+CORE\s*=\s*\[([\s\S]*?)\];/.exec(src);
  if (!m) return null;
  return [...m[1].matchAll(/'([^']+)'/g)].map((x) => {
    const [p, q] = x[1].replace(/^\.\//, '').split('?');
    const v = /v=(\d+)/.exec(q || '');
    return { raw: x[1], path: p === '' ? 'index.html' : p, v: v ? +v[1] : null };
  });
}
const metaRobotsNoindex = (src) => /<meta\s+name="robots"\s+content="[^"]*noindex/i.test(src);
const cspOf = (src) => (/<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]+)"/i.exec(src) || [])[1];
const isGated = (src) => /type="password"/.test(src) && /id="(?:dse-)?lock"/.test(src);

/* ---------- 1. JavaScript syntax ---------- */
for (const f of tracked.filter((f) => /\.(m?js)$/.test(f))) {
  const r = spawnSync(process.execPath, ['--check', f], { encoding: 'utf8' });
  if (r.status !== 0) err('js-syntax', (r.stderr || '').trim().split('\n').slice(0, 4).join(' | '), f);
}

/* ---------- 2. Shared engine smoke test ---------- */
try {
  const sandbox = { window: {} };
  new Function('window', read('jupas-engine.js'))(sandbox.window);
  const E = sandbox.window.JUPASEngine;
  if (!E) throw new Error('window.JUPASEngine was not exported');
  for (const fn of ['gradesFromPdfPayload', 'evaluateProgramme', 'evaluateAll', 'refScores', 'bandOf'])
    if (typeof E[fn] !== 'function') throw new Error('engine missing function: ' + fn);
  const g = E.gradesFromPdfPayload({ core: { chi: '5', csd: 'attained' }, elect: [{ s: 'bio', lv: '4' }] });
  if (g['Chinese Language'] !== '5' || g['Biology'] !== '4') throw new Error('gradesFromPdfPayload wrong: ' + JSON.stringify(g));
  const band = E.bandOf(30, { scores_2025: { lq: '25', median: '28', uq: '32' } });
  if (band !== 'above-median') throw new Error('bandOf expected above-median, got ' + band);
} catch (e) { err('engine', e.message, 'jupas-engine.js'); }

/* ---------- 3. No plaintext data / secrets ---------- */
for (const f of tracked) if (/programmes\.csv$|Unified_Data.*\.json$|-db\.json$/i.test(f))
  err('secrets', 'plaintext database/CSV must never be committed (only *.enc.json is deployable)', f);
const forbidden = (process.env.FORBIDDEN_STRINGS || '').split('\n').map((s) => s.trim()).filter(Boolean);
for (const s of forbidden) {
  const r = spawnSync('git', ['grep', '-lF', '--', s, '--', '.', ':!AGENTS.md', ':!.github/**'], { encoding: 'utf8' });
  if (r.stdout.trim()) err('secrets', 'a forbidden string (passcode) appears in: ' + r.stdout.trim().split('\n').join(', '));
}
if (CI && !forbidden.length) warn('secrets', 'repo secret FORBIDDEN_STRINGS is not set — passcode-leak guard is off');

/* ---------- 4. Referenced files exist ---------- */
const ASSET = /\.(js|css|png|jpe?g|svg|ico|webmanifest|json|woff2?|txt)$/i;
for (const f of htmls) for (const r of refs[f])
  if (ASSET.test(r.path) && !fs.existsSync(r.path)) err('assets', `references missing file ${r.url}`, f);

/* ---------- 5. Cache-buster (?v=) consistency across pages ---------- */
const versions = {}; // path -> { v -> [html files] }
for (const f of htmls) for (const r of refs[f]) if (r.v !== null) ((versions[r.path] ||= {})[r.v] ||= []).push(f);
for (const [p, byV] of Object.entries(versions)) {
  const vs = Object.keys(byV);
  if (vs.length > 1) err('versions', `${p} is loaded with different ?v= values: ` + vs.map((v) => `v=${v} in ${byV[v].join(', ')}`).join(' · '));
}
const currentV = (p) => { const vs = Object.keys(versions[p] || {}).map(Number); return vs.length ? Math.max(...vs) : null; };

/* ---------- 6. Service worker precache list (sw.js CORE) ---------- */
const swSrc = read('sw.js'), core = swCore(swSrc);
if (!core) err('sw', 'could not find `var CORE = [...]` in sw.js', 'sw.js');
else {
  const inCore = new Map(core.map((c) => [c.path, c]));
  for (const c of core) {
    if (!fs.existsSync(c.path)) err('sw', `CORE lists a missing file: ${c.raw}`, 'sw.js');
    const hv = currentV(c.path);
    if (hv !== null && c.v !== hv) err('sw', `CORE has ${c.raw} but pages load ${c.path}?v=${hv} — run: node tools/bump.mjs --sync-sw`, 'sw.js');
  }
  // every versioned script/style used by a precached page must itself be precached
  const corePages = core.filter((c) => c.path.endsWith('.html')).map((c) => c.path), missing = {};
  for (const pg of corePages) for (const r of refs[pg] || [])
    if (r.v !== null && /\.(js|css)$/.test(r.path) && !inCore.has(r.path)) (missing[`${r.path}?v=${r.v}`] ||= []).push(pg);
  for (const [a, pgs] of Object.entries(missing))
    err('sw', `${a} is loaded by precached pages (${pgs.join(', ')}) but is not in CORE — run: node tools/bump.mjs --sync-sw`, 'sw.js');
}

/* ---------- 7. Content-Security-Policy on every page; no third-party origins ---------- */
for (const f of htmls) {
  const csp = cspOf(html[f]);
  if (!csp) { err('csp', 'page has no Content-Security-Policy meta', f); continue; }
  if (/https?:|\*|wss?:/i.test(csp)) err('csp', 'CSP allows a third-party origin: ' + csp, f);
  if (/'unsafe-eval'/.test(csp)) err('csp', "CSP allows 'unsafe-eval'", f);
}
// third-party resource LOADS (plain links to other sites are fine)
for (const f of htmls) {
  const re = /<(script|img|iframe|audio|video|source|embed)\b[^>]*\bsrc\s*=\s*"(https?:)?\/\/[^"]+"|<link\b(?=[^>]*\brel="(?:stylesheet|preload|modulepreload|icon|apple-touch-icon|manifest)")[^>]*\bhref\s*=\s*"(https?:)?\/\/[^"]+"/gi;
  let m; while ((m = re.exec(html[f]))) err('third-party', 'loads a resource from another site: ' + m[0].slice(0, 120), f);
}

/* ---------- 8. Passcode-gated pages ---------- */
const sitemapXml = fs.existsSync('sitemap.xml') ? read('sitemap.xml') : '';
const inSitemap = new Set([...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => { const u = new URL(m[1]); const p = u.pathname.replace(/^\//, ''); return p === '' ? 'index.html' : p; }));
const gated = htmls.filter((f) => isGated(html[f]));
for (const f of gated) {
  if (!metaRobotsNoindex(html[f])) err('gated', 'passcode-gated page is missing <meta name="robots" content="noindex">', f);
  if (inSitemap.has(f)) err('gated', 'passcode-gated page must not be listed in sitemap.xml', f);
  const csp = cspOf(html[f]) || '';
  if (!/connect-src '(?:self|none)'/.test(csp)) err('gated', "gated page CSP must restrict connect-src to 'self' or 'none'", f);
}

/* ---------- 9. sitemap.xml sanity ---------- */
for (const p of inSitemap) {
  if (!fs.existsSync(p)) err('sitemap', `sitemap.xml lists a missing page: ${p}`, 'sitemap.xml');
  else if (html[p] && metaRobotsNoindex(html[p])) err('sitemap', `sitemap.xml lists a noindex page: ${p}`, 'sitemap.xml');
}

/* ---------- 10. PR checks: edited files must get a new ?v= ---------- */
if (argBase) {
  let changed = [];
  try { changed = git('diff', '--name-only', `${argBase}...HEAD`).split('\n').filter(Boolean); }
  catch (e) { err('pr', `could not diff against ${argBase}: ${e.message.split('\n')[0]}`); }
  const showBase = (f) => { try { return git('show', `${argBase}:${f}`); } catch { return null; } };
  for (const f of changed.filter((f) => /\.(js|css)$/.test(f) && f !== 'sw.js' && fs.existsSync(f))) {
    for (const h of htmls) for (const r of refs[h]) {
      if (r.path !== f) continue;
      const old = showBase(h); if (old === null) continue;           // page is new in this PR
      const oldRef = refsOf(h, old).find((o) => o.path === f);
      if (r.v === null) warn('pr', `${f} was edited; ${h} loads it without ?v= (browsers may cache the old copy)`, h);
      else if (oldRef && oldRef.v !== null && r.v <= oldRef.v) err('pr', `${f} was edited but ${h} still loads ?v=${r.v} — bump it: node tools/bump.mjs ${f}`, h);
    }
  }
  if (changed.includes('sw.js')) {
    const oldSw = showBase('sw.js'), oldCore = oldSw && swCore(oldSw);
    const cacheOf = (s) => (/var\s+CACHE\s*=\s*'([^']+)'/.exec(s) || [])[1];
    if (oldCore && core && JSON.stringify(oldCore) !== JSON.stringify(core) && cacheOf(oldSw) === cacheOf(swSrc))
      err('pr', 'sw.js CORE changed but the CACHE name did not — bump CACHE so returning visitors refresh', 'sw.js');
  }
  const touchedGated = changed.filter((f) => /^(jupas-|streaming-tool|dse-portfolio|sw\.js)|\.enc\.json$/.test(f));
  if (touchedGated.length) warn('pr', 'touches gated pages/data — needs local QA behind the passcode before merge: ' + touchedGated.join(', '));
}

/* ---------- 11. Housekeeping (warnings only) ---------- */
const allText = tracked.filter((f) => /\.(html|js|css|webmanifest|json)$/.test(f) && !f.endsWith('.enc.json')).map(read).join('\n');
for (const f of tracked.filter((f) => f.startsWith('images/')))
  if (!allText.includes(path.posix.basename(f))) warn('unused', 'image is not referenced anywhere', f);

/* ---------- report ---------- */
const line = (x) => `  [${x.check}] ${x.file ? x.file + ': ' : ''}${x.msg}`;
if (CI) {
  for (const e of errors) console.log(`::error${e.file ? ' file=' + e.file : ''}::[${e.check}] ${e.msg}`);
  for (const w of warnings) console.log(`::warning${w.file ? ' file=' + w.file : ''}::[${w.check}] ${w.msg}`);
}
console.log(`\nSite checks — ${htmls.length} pages, ${gated.length} passcode-gated (${gated.join(', ')})`);
if (warnings.length) console.log(`\nWARNINGS (${warnings.length}):\n` + warnings.map(line).join('\n'));
if (errors.length) { console.log(`\nERRORS (${errors.length}):\n` + errors.map(line).join('\n') + '\n\n✗ checks failed'); process.exit(1); }
console.log('\n✓ all checks passed');
