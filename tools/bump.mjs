#!/usr/bin/env node
/* ============================================================
   tools/bump.mjs — bump cache-busters (?v=N) the safe way.
       node tools/bump.mjs app.js styles.css   # bump these files everywhere
       node tools/bump.mjs --sync-sw            # make sw.js CORE match the pages
       add --dry-run to preview without writing
   For each file: finds its highest current ?v across all HTML + sw.js,
   sets it to N+1 in EVERY page that loads it and in sw.js CORE.
   --sync-sw: rewrites CORE entries to the versions the pages load and
   adds any versioned .js/.css used by a precached page but missing.
   Whenever sw.js CORE changes, the CACHE name is bumped once.
   No dependencies; Node 18+.
   ============================================================ */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
process.chdir(ROOT);
const args = process.argv.slice(2);
const DRY = args.includes('--dry-run'), SYNC = args.includes('--sync-sw');
const targets = args.filter((a) => !a.startsWith('--')).map((a) => path.posix.normalize(a.replace(/^\.\//, '')));
if (!targets.length && !SYNC) {
  console.log('usage: node tools/bump.mjs <file.js|file.css ...> [--sync-sw] [--dry-run]');
  process.exit(2);
}

const htmls = execFileSync('git', ['ls-files', '*.html'], { encoding: 'utf8' }).split('\n').filter(Boolean);
const files = Object.fromEntries([...htmls, 'sw.js'].map((f) => [f, fs.readFileSync(f, 'utf8')]));
const before = { ...files };
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// matches "<path>?v=N" when <path> starts right after a quote, "(" or "./" (never inside another name)
const refRe = (p) => new RegExp(`(?<=["'(]|["']\\./)(${esc(p)})\\?v=(\\d+)`, 'g');
const changes = [];

for (const t of targets) {
  if (!fs.existsSync(t)) { console.error(`✗ ${t}: no such file`); process.exit(1); }
  let max = 0, seen = 0;
  for (const src of Object.values(files)) for (const m of src.matchAll(refRe(t))) { max = Math.max(max, +m[2]); seen++; }
  if (!seen) { console.error(`✗ ${t}: no page loads it with ?v= (nothing to bump)`); process.exit(1); }
  const next = max + 1;
  for (const f of Object.keys(files)) {
    const out = files[f].replace(refRe(t), `$1?v=${next}`);
    if (out !== files[f]) { files[f] = out; changes.push(`${f}: ${t} → ?v=${next}`); }
  }
}

if (SYNC) {
  // version each path is loaded with by the pages (after any bumps above)
  const pageV = {}, pageRefs = {};
  for (const h of htmls) {
    pageRefs[h] = [];
    for (const m of files[h].matchAll(/(?:src|href)\s*=\s*"([^"?#]+)\?v=(\d+)"/g)) {
      const p = m[1].replace(/^\.\//, '');
      pageV[p] = Math.max(pageV[p] || 0, +m[2]);
      pageRefs[h].push(p);
    }
  }
  const sw = files['sw.js'];
  const m = /(var\s+CORE\s*=\s*\[)([\s\S]*?)(\];)/.exec(sw);
  if (!m) { console.error('✗ sw.js: CORE list not found'); process.exit(1); }
  let body = m[2];
  body = body.replace(/'\.\/([^'?]+)\?v=(\d+)'/g, (all, p, v) => {
    if (pageV[p] && pageV[p] !== +v) { changes.push(`sw.js CORE: ${p} ?v=${v} → ?v=${pageV[p]}`); return `'./${p}?v=${pageV[p]}'`; }
    return all;
  });
  const listed = new Set([...body.matchAll(/'\.\/([^'?]*)/g)].map((x) => x[1] || 'index.html'));
  const corePages = [...listed].filter((p) => p.endsWith('.html'));
  const add = [];
  for (const pg of corePages) for (const p of pageRefs[pg] || [])
    if (/\.(js|css)$/.test(p) && !listed.has(p) && !add.includes(p)) add.push(p);
  if (add.length) {
    // insert after the last versioned .js/.css entry, matching the file's indentation
    const lines = body.split('\n');
    let at = -1; lines.forEach((l, i) => { if (/\?v=\d+',?\s*$/.test(l) && /\.(js|css)\?/.test(l)) at = i; });
    const indent = (lines[at] || "  './x'").match(/^\s*/)[0];
    lines.splice(at + 1, 0, ...add.map((p) => `${indent}'./${p}?v=${pageV[p]}',`));
    body = lines.join('\n');
    add.forEach((p) => changes.push(`sw.js CORE: added ./${p}?v=${pageV[p]}`));
  }
  files['sw.js'] = sw.slice(0, m.index) + m[1] + body + m[3] + sw.slice(m.index + m[0].length);
}

// keep sw.js CORE in step with bumped files (a precached file bumped above is already rewritten by refRe)
const coreOf = (s) => (/var\s+CORE\s*=\s*\[([\s\S]*?)\];/.exec(s) || [])[1];
if (coreOf(files['sw.js']) !== coreOf(before['sw.js'])) {
  files['sw.js'] = files['sw.js'].replace(/(var\s+CACHE\s*=\s*'[^']*?)(\d+)(')/, (all, a, n, b) => {
    changes.push(`sw.js: CACHE ${a.split("'")[1]}${n} → ${a.split("'")[1]}${+n + 1}`);
    return `${a}${+n + 1}${b}`;
  });
}

if (!changes.length) { console.log('nothing to change — everything already up to date'); process.exit(0); }
console.log((DRY ? 'Would change:\n' : 'Changed:\n') + changes.map((c) => '  ' + c).join('\n'));
if (!DRY) for (const f of Object.keys(files)) if (files[f] !== before[f]) fs.writeFileSync(f, files[f]);
if (!DRY) console.log('\nNext: node tools/check.mjs');
