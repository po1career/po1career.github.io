#!/usr/bin/env node
/* ============================================================
   tools/watch.mjs — weekly "anything need attention?" check.
       node tools/watch.mjs                  # print a report
       node tools/watch.mjs --report out.md  # also write it as Markdown
   1. JUPASCal upstream: has its data (or a new admission cycle, or a new
      release) appeared since our last sync recorded in tools/upstream.json?
   2. External links in the public pages: are any clearly broken?
   Never edits the site. Exit code is always 0; in GitHub Actions it sets the
   step output `findings=true` when something needs a human.
   No dependencies; Node 18+ (uses global fetch).
   ============================================================ */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
process.chdir(ROOT);
const reportPath = (() => { const i = process.argv.indexOf('--report'); return i > 0 ? process.argv[i + 1] : null; })();
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
const UPSTREAM_SITE = 'https://jupascal.com/data/processed';
const UPSTREAM_REPO = 'JUPASCal/JUPASCal.github.io';

async function get(url, { timeout = 20000, method = 'GET' } = {}) {
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), timeout);
  try {
    const res = await fetch(url, { method, redirect: 'follow', signal: ctl.signal, headers: { 'user-agent': UA, accept: '*/*' } });
    const body = method === 'GET' ? await res.text().catch(() => '') : '';
    return { status: res.status, finalUrl: res.url, body };
  } catch (e) {
    return { status: 0, error: (e.cause && e.cause.code) || e.name || String(e) };
  } finally { clearTimeout(t); }
}

/* ---------- 1. upstream ---------- */
const synced = JSON.parse(fs.readFileSync('tools/upstream.json', 'utf8'));
const upstream = { notes: [], changed: false };
{
  const cyc = synced.admissionCycle;
  const cur = await get(`${UPSTREAM_SITE}/JUPAS_${cyc}_Unified_Data.version`);
  if (cur.status === 200) {
    upstream.dataVersion = cur.body.trim();
    if (upstream.dataVersion !== synced.dataVersion) {
      upstream.changed = true;
      upstream.notes.push(`JUPASCal's **${cyc} data changed**: ours \`${synced.dataVersion}\` (synced ${synced.syncedOn}) → upstream \`${upstream.dataVersion}\`.`);
    }
  } else upstream.notes.push(`Could not read the upstream data version (${cur.status || cur.error}) — check manually.`);

  const next = await get(`${UPSTREAM_SITE}/JUPAS_${cyc + 1}_Unified_Data.version`);
  if (next.status === 200 && /^[0-9a-f]{6,}$/i.test(next.body.trim())) {
    upstream.changed = true;
    upstream.notes.push(`**A new admission cycle is published upstream: ${cyc + 1}** (data \`${next.body.trim()}\`). Time for the yearly refresh.`);
  }

  const rel = await get(`https://api.github.com/repos/${UPSTREAM_REPO}/releases/latest`);
  if (rel.status === 200) {
    try {
      const r = JSON.parse(rel.body);
      upstream.appVersion = r.tag_name;
      if (r.tag_name !== synced.appVersion) {
        upstream.changed = true;
        upstream.notes.push(`Newer JUPASCal release: ours ${synced.appVersion} → upstream **${r.tag_name}** (${(r.published_at || '').slice(0, 10)}). Review its notes for engine fixes: https://github.com/${UPSTREAM_REPO}/releases`);
      }
    } catch { /* ignore malformed */ }
  }
}

/* ---------- 2. external links ---------- */
const files = execFileSync('git', ['ls-files', '*.html', '*.js'], { encoding: 'utf8' }).split('\n')
  .filter((f) => f && !f.startsWith('tools/'));
const where = new Map(); // url -> [files]
for (const f of files) {
  const txt = fs.readFileSync(f, 'utf8');
  for (const m of txt.matchAll(/https?:\/\/[^\s"'<>)`\\]+/g)) {
    const url = m[0].replace(/[.,;]+$/, '');
    if (/^https?:\/\/(po1career\.(net|github\.io)|www\.w3\.org|localhost)/.test(url)) continue;
    if (!where.has(url)) where.set(url, []);
    if (!where.get(url).includes(f)) where.get(url).push(f);
  }
}
const urls = [...where.keys()].sort();
const results = [];
async function check(url) {
  let r = await get(url);
  if (r.status === 0 || r.status >= 400) { await new Promise((s) => setTimeout(s, 3000)); r = await get(url); }   // one retry
  // broken = definitely gone; uncertain = blocked/slow (common for HK sites from overseas servers)
  const kind = r.status >= 200 && r.status < 400 ? 'ok'
    : (r.status === 404 || r.status === 410 || ['ENOTFOUND', 'ECONNREFUSED', 'ERR_INVALID_URL'].includes(r.error)) ? 'broken'
    : 'uncertain';
  results.push({ url, kind, status: r.status || r.error, files: where.get(url) });
}
for (let i = 0; i < urls.length; i += 6) await Promise.all(urls.slice(i, i + 6).map(check));
const broken = results.filter((r) => r.kind === 'broken'), uncertain = results.filter((r) => r.kind === 'uncertain');

/* ---------- report ---------- */
const findings = upstream.changed || broken.length > 0;
const L = [];
L.push(`## Weekly site watch — ${new Date().toISOString().slice(0, 10)}`, '');
L.push('### JUPASCal upstream');
L.push(upstream.notes.length ? upstream.notes.map((n) => '- ' + n).join('\n')
  : `- No change: data \`${synced.dataVersion}\`, release ${synced.appVersion} (synced ${synced.syncedOn}).`);
if (upstream.changed) L.push('', '**What to do:** ask Claude for an "upstream JUPASCal sync" (procedure in the private `docs/jupas-engine-and-data.md`). Afterwards update `tools/upstream.json`.');
L.push('', `### External links (${results.length} checked)`);
if (broken.length) L.push('**Broken** (fix or remove):', ...broken.map((r) => `- ${r.url} — ${r.status} — in ${r.files.join(', ')}`));
else L.push('- None broken.');
if (uncertain.length) L.push('', '<details><summary>Could not verify (often just blocking automated checks — spot-check in a browser if they persist)</summary>', '',
  ...uncertain.map((r) => `- ${r.url} — ${r.status} — in ${r.files.join(', ')}`), '</details>');
L.push('', '_Programme links inside the encrypted JUPAS database are not checked here (CI never gets a passcode)._');
// fingerprint of what needs a human — the workflow only re-posts when this changes
const fingerprint = JSON.stringify({ d: upstream.dataVersion || null, a: upstream.changed ? upstream.appVersion || null : null,
  n: upstream.notes.filter((n) => /admission cycle/.test(n)).length, b: broken.map((r) => r.url) });
L.push('', `<!-- watch-fingerprint: ${Buffer.from(fingerprint).toString('base64')} -->`);
const md = L.join('\n') + '\n';

console.log(md);
console.log(findings ? '→ needs attention' : '→ all clear');
if (reportPath) fs.writeFileSync(reportPath, md);
if (process.env.GITHUB_OUTPUT)
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `findings=${findings}\nfingerprint=${Buffer.from(fingerprint).toString('base64')}\n`);
