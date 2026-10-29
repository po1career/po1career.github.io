#!/usr/bin/env node
/* ============================================================
   tools/gated-qa.mjs — automated check of the passcode-locked pages.
   Drives an invisible (headless) Google Chrome against a local copy of the
   site, with a fresh browser profile for every page, and checks:
     · every gated page starts LOCKED, rejects a wrong code AND the other
       tools' passcodes, and opens with its own passcode;
     · the JUPAS tools show the score the shared engine computes from the
       decrypted database (Finder card, Planner slot, Evaluator row) and
       Choices auto-fills the intake from the database quota;
     · zero console errors and zero requests to other sites.
   The passcodes are NEVER stored here — pass them as environment variables:
     PO1_STUDENT_PASS  PO1_TEACHER_PASS  PO1_STREAMING_PASS
   (the private repo's tools/run-gated-qa.sh does this for you).
   Usage:  node tools/gated-qa.mjs [--keep-open-on-fail]
   No npm packages: needs Node 22+ (built-in WebSocket) and Google Chrome.
   Optional: CHROME_PATH=/path/to/chrome
   ============================================================ */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { webcrypto } from 'node:crypto';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PASS = { student: process.env.PO1_STUDENT_PASS, teacher: process.env.PO1_TEACHER_PASS, streaming: process.env.PO1_STREAMING_PASS };
if (!PASS.student || !PASS.teacher || !PASS.streaming) {
  console.error('Set PO1_STUDENT_PASS, PO1_TEACHER_PASS and PO1_STREAMING_PASS (see the private repo: tools/run-gated-qa.sh).');
  process.exit(2);
}
if (typeof WebSocket !== 'function') { console.error('Needs Node 22+ (built-in WebSocket).'); process.exit(2); }
const CHROME = process.env.CHROME_PATH || [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser',
].find((p) => fs.existsSync(p));
if (!CHROME) { console.error('Google Chrome not found — install it or set CHROME_PATH.'); process.exit(2); }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------- expected values, computed in node from the real database ---------- */
async function decrypt(file, pass) {
  const j = JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8')), b = (s) => Buffer.from(s, 'base64');
  const base = await webcrypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveKey']);
  const key = await webcrypto.subtle.deriveKey({ name: 'PBKDF2', salt: b(j.salt), iterations: 150000, hash: 'SHA-256' },
    base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
  return JSON.parse(Buffer.from(await webcrypto.subtle.decrypt({ name: 'AES-GCM', iv: b(j.iv) }, key, b(j.data))));
}
const DB = await decrypt('jupas-finder-db.enc.json', PASS.student);
const win = {}; new Function('window', fs.readFileSync(path.join(ROOT, 'jupas-engine.js'), 'utf8'))(win);
const E = win.JUPASEngine;
const PROFILE = { core: { chi: '4', eng: '4', math: '4', csd: 'attained' }, elect: [{ s: 'chist', lv: '5' }, { s: 'econ', lv: '4' }] };
const grades = E.gradesFromPdfPayload(PROFILE);
// probe programme: JS8013 if present (exercises a best-of pool), else the first eligible programme with a median
const probeProg = DB.find((p) => p.jupas_code === 'JS8013') ||
  DB.find((p) => { const r = E.evaluateProgramme(p, grades); return r.eligibility.eligible && r.hasScoreData; });
const PROBE = { code: probeProg.jupas_code, score: E.evaluateProgramme(probeProg, grades).calculation.totalScore, quota: probeProg.quota };
const fmt = (n) => String(+(+n).toFixed(2));

/* ---------- static server for the repo (no caching) ---------- */
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json', '.txt': 'text/plain' };
const server = http.createServer((req, res) => {
  const p = path.normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
  const file = path.join(ROOT, p.endsWith('/') ? p + 'index.html' : p);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end('not found'); }
  res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const ORIGIN = `http://127.0.0.1:${server.address().port}`;

/* ---------- minimal Chrome DevTools Protocol client ---------- */
async function openBrowser() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'po1-gated-qa-'));
  const proc = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${dir}`, '--no-first-run',
    '--no-default-browser-check', '--disable-extensions', '--disable-background-networking', '--disable-sync',
    '--window-size=1280,900', 'about:blank'], { stdio: 'ignore' });
  let port;
  for (let i = 0; i < 100 && !port; i++) {
    await sleep(100);
    try { port = fs.readFileSync(path.join(dir, 'DevToolsActivePort'), 'utf8').split('\n')[0]; } catch {}
  }
  if (!port) throw new Error('Chrome did not start');
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let id = 0; const pending = new Map(), events = [];
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); } else if (msg.method) events.push(msg);
  };
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable'); await send('Log.enable');
  return {
    events,
    async go(url) {
      events.length = 0;
      await send('Page.navigate', { url });
      for (let i = 0; i < 100; i++) { await sleep(100); if (events.some((e) => e.method === 'Page.loadEventFired')) break; }
    },
    async js(expr) {
      const r = await send('Runtime.evaluate', { expression: `(async()=>{${expr}})()`, awaitPromise: true, returnByValue: true });
      if (r.result && r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || 'page script error');
      return r.result && r.result.result && r.result.result.value;
    },
    async close() { try { ws.close(); } catch {} proc.kill(); await sleep(300); fs.rmSync(dir, { recursive: true, force: true }); },
  };
}
// in-page helpers: poll for a condition instead of fixed sleeps
const H = `const w=(ms)=>new Promise(r=>setTimeout(r,ms));
  const until=async(f,ms=15000)=>{const t=Date.now();while(Date.now()-t<ms){try{const v=f();if(v)return v;}catch(e){}await w(100);}return null;};
  const shown=(id)=>{const e=document.getElementById(id);return !!e&&getComputedStyle(e).display!=='none';};
  const unlock=async(pc,app)=>{const i=document.getElementById('passcode'),err=document.getElementById('lock-err');err.textContent='';
    i.value=pc;document.getElementById('unlock-btn').click();
    const r=await until(()=>shown(app)?'open':(/incorrect|錯誤|不正確/i.test(err.textContent)?'rejected':null),12000);
    return r==='open';};`;

/* ---------- the tests ---------- */
const PAGES = [
  { page: 'jupas-finder.html', app: 'app', pass: 'student', check: finderCheck },
  { page: 'jupas-planner.html', app: 'app', pass: 'student', check: plannerCheck },
  { page: 'jupas-choices.html', app: 'app', pass: 'student', check: choicesCheck },
  { page: 'dse-portfolio.html', app: 'dse-app', pass: 'student', check: dseCheck },
  { page: 'jupas-evaluator.html', app: 'app', pass: 'teacher', check: evaluatorCheck },
  { page: 'streaming-tool.html', app: 'app', pass: 'streaming', check: null },
];
async function finderCheck(b) {
  return b.js(`${H}
    const set=(el,v)=>{el.value=v;el.dispatchEvent(new Event('change',{bubbles:true}));el.dispatchEvent(new Event('input',{bubbles:true}));};
    document.querySelectorAll('#cores select').forEach(s=>set(s,'4'));
    set(document.querySelector('#electives [data-el="0"]'),'chist'); set(document.querySelector('#electives [data-ellv="0"]'),'5');
    set(document.querySelector('#electives [data-el="1"]'),'econ'); set(document.querySelector('#electives [data-ellv="1"]'),'4');
    await w(300); window.__finder.compute(); await w(400); const q=document.getElementById('search'); q.value=${JSON.stringify(PROBE.code)}; q.dispatchEvent(new Event('input',{bubbles:true}));
    for (const o of [...document.getElementById('bucket-sort').options]) { window.__finder.setBucket(o.value); await w(250);
      const c=[...document.querySelectorAll('.prog')].find(c=>c.innerText.includes(${JSON.stringify(PROBE.code)}));
      if (c) { const m=c.innerText.match(/Your score\\s*([0-9.]+)/i); return m?m[1]:'card without score'; } }
    return 'card not found';`);
}
async function plannerCheck(b) {
  return b.js(`${H}
    const P=window.__planner, st=P.state; st.electSubjs=['chist','econ','',''];
    Object.assign(st.plans.A,{chi:'4',eng:'4',math:'4',csd:'att',e:['5','4','','']}); P.rebuild(); await w(300);
    P.pick('A',0,${JSON.stringify(PROBE.code)}); const t=await until(()=>{const s=document.querySelector('.slot[data-plan="A"][data-i="0"]');
      const m=s&&s.innerText.replace(/\\s+/g,' ').match(/MY GRADE[^0-9]*([0-9.]+)/i);return m&&m[1];}); return t||'score not shown';`);
}
async function choicesCheck(b) {
  return b.js(`${H}
    const i=document.querySelector('#app .pp-in'); if(!i) return 'programme field not found';
    i.focus(); i.value=${JSON.stringify(PROBE.code)}; i.dispatchEvent(new Event('input',{bubbles:true})); i.dispatchEvent(new Event('change',{bubbles:true})); i.blur();
    const v=await until(()=>{const row=i.closest('tr');const vals=row&&[...row.querySelectorAll('input')].map(x=>x.value).filter(x=>x&&x!==i.value);return vals&&vals.length&&vals[0];});
    return v||'intake not filled';`);
}
async function dseCheck(b) {
  return b.js(`${H} const n=await until(()=>document.querySelectorAll('#dse-app button, #dse-app input, #dse-app select').length); return n?'ok':'app empty';`);
}
async function evaluatorCheck(b) {
  return b.js(`${H}
    const db=await until(()=>{const t=document.getElementById('db-status').textContent;return /\\d+/.test(t)&&t;});
    window.__renderPayload({name:'QA',klass:'6A',cno:'1',core:${JSON.stringify(PROFILE.core)},elect:${JSON.stringify(PROFILE.elect)},choices:[{code:${JSON.stringify(PROBE.code)}}]},{scroll:false});
    const row=await until(()=>[...document.querySelectorAll('#summary-tbl tr')].find(r=>r.innerText.includes(${JSON.stringify(PROBE.code)})));
    const m=row&&row.innerText.replace(/\\s+/g,' ').match(new RegExp(${JSON.stringify(PROBE.code)}+'.*?\\\\s([0-9]+(?:\\\\.[0-9]+)?)\\\\s'));
    return JSON.stringify({db, score:m?m[1]:null});`);
}

const results = []; let failed = 0;
const record = (page, test, ok, detail = '') => { results.push({ page, test, ok, detail }); if (!ok) failed++; };
for (const t of PAGES) {
  const others = Object.keys(PASS).filter((k) => k !== t.pass);
  const b = await openBrowser();
  try {
    await b.go(`${ORIGIN}/${t.page}?qa=1`);
    const locked = await b.js(`${H} await until(()=>document.getElementById('passcode')); await w(300); return !shown(${JSON.stringify(t.app)});`);
    record(t.page, 'locked on arrival', locked);
    record(t.page, 'wrong code rejected', !(await b.js(`${H} return await unlock('wrong-code-123', ${JSON.stringify(t.app)});`)));
    for (const o of others) record(t.page, `${o} passcode rejected`, !(await b.js(`${H} return await unlock(${JSON.stringify(PASS[o])}, ${JSON.stringify(t.app)});`)));
    record(t.page, `opens with ${t.pass} passcode`, await b.js(`${H} return await unlock(${JSON.stringify(PASS[t.pass])}, ${JSON.stringify(t.app)});`));
    if (t.check) {
      const got = await t.check(b);
      if (t.page === 'jupas-choices.html') record(t.page, `${PROBE.code} intake auto-fills ${PROBE.quota}`, String(got) === String(PROBE.quota), `got ${got}`);
      else if (t.page === 'dse-portfolio.html') record(t.page, 'app renders', got === 'ok', got);
      else if (t.page === 'jupas-evaluator.html') {
        const r = JSON.parse(got || '{}');
        record(t.page, `database unlocked (${DB.length} programmes)`, new RegExp('\\b' + DB.length + '\\b').test(r.db || ''), r.db || 'no status');
        record(t.page, `${PROBE.code} score = ${fmt(PROBE.score)}`, r.score !== null && fmt(r.score) === fmt(PROBE.score), `got ${r.score}`);
      } else record(t.page, `${PROBE.code} score = ${fmt(PROBE.score)}`, fmt(got) === fmt(PROBE.score), `got ${got}`);
    }
    await sleep(500);
    const errs = b.events.filter((e) =>
      e.method === 'Runtime.exceptionThrown' ||
      (e.method === 'Runtime.consoleAPICalled' && e.params.type === 'error') ||
      (e.method === 'Log.entryAdded' && e.params.entry.level === 'error' &&
        !/favicon\.ico|frame-ancestors/.test(e.params.entry.text + ' ' + (e.params.entry.url || ''))));
    record(t.page, 'no console errors', errs.length === 0, errs.slice(0, 2).map((e) => JSON.stringify(e.params).slice(0, 160)).join(' | '));
    const ext = [...new Set(b.events.filter((e) => e.method === 'Network.requestWillBeSent')
      .map((e) => e.params.request.url).filter((u) => /^https?:/.test(u) && !u.startsWith(ORIGIN)))];
    record(t.page, 'no third-party requests', ext.length === 0, ext.slice(0, 3).join(' '));
  } catch (e) {
    record(t.page, 'ran without crashing', false, e.message);
  } finally { await b.close(); }
}
server.close();

console.log(`\nGated-page QA — ${PAGES.length} pages · probe ${PROBE.code} (Chinese History 5 + Economics 4 → engine ${fmt(PROBE.score)}, quota ${PROBE.quota})\n`);
let last = '';
for (const r of results) {
  if (r.page !== last) { console.log(r.page); last = r.page; }
  console.log(`  ${r.ok ? '✓' : '✗'} ${r.test}${!r.ok && r.detail ? '  — ' + r.detail : ''}`);
}
console.log(failed ? `\n✗ ${failed} check(s) failed` : `\n✓ all ${results.length} checks passed`);
process.exit(failed ? 1 : 0);
