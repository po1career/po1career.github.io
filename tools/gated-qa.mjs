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
// DSE Life Paths: the same game computed in node (fixed seed) — the page must reach the same list, offer and life
win.crypto = webcrypto;
for (const f of ['jupas-evaluator-analytics.js', 'jupas-finder-core.js', 'life-paths-core.js', 'life-paths-stats.js', 'life-paths-life.js'])
  if (fs.existsSync(path.join(ROOT, f))) new Function('window', fs.readFileSync(path.join(ROOT, f), 'utf8'))(win);
const QA_STRENGTHS = ['learner', 'leader'];                 // the two strengths the page test picks
const LIFE = (() => {
  const L = win.LifePathsCore; if (!L) return null;
  const db = L.indexDB(DB), seed = 'qa-seed', pred = { chi: '4', eng: '4', math: '4', csd: 'attained', elect: PROFILE.elect };
  const list = L.suggestList(pred, [], db), actual = L.resultsDay(pred, seed).actual, round = L.mainRound(list, actual, db, seed);
  // chapter 2: the "work" route in short mode, always taking the first option (what the page test clicks)
  let life = null; const LL = win.LifePathsLife;
  if (LL) {
    const l = LL.start({ seed, mode: 'short', route: 'work', field: 'Business', offer: round.offer, prog: null, actual, startAge: 18,
      strengths: QA_STRENGTHS, wish: null });
    for (let n = 0; n < 120 && l.pend.type !== 'end'; n++) {
      if (l.pend.type === 'focus') LL.chooseFocus(l, LL.focusOptions(l)[0]);
      else if (l.pend.type === 'event') LL.chooseEvent(l, 0);
      else LL.chooseBranch(l, l.pend.options[0]);
    }
    life = { age: l.age, monthly: l.job ? l.job.monthly : null };
  }
  return { seed, list, offer: round.offer ? round.offer.code : null, life };
})();

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
  ...(LIFE ? [{ page: 'life-paths.html', app: 'app', pass: 'student', check: lifePathsCheck }] : []),
];
async function lifePathsCheck(b) {
  return b.js(`${H}
    const L=window.__lifePaths, q=(sel)=>document.querySelector(sel);
    // play a life by always clicking the first choice on screen, until the life summary shows
    const play=async()=>{ for(let n=0;n<120&&!q('.endcard');n++){ const c=q('[data-act="focus"],[data-act="evc"],[data-act="branch"],[data-act="to-end"]');
      if(!c)break; c.click(); await w(20); } return !!(await until(()=>q('.endcard'))); };
    await until(()=>q('[data-act="start"],[data-act="resume"]'));
    L.act('start'); const s=L.state; s.seed=${JSON.stringify(LIFE && LIFE.seed)}; s.mode='short';
    // fun pack: the character + dream screen comes first
    const meScreen=document.querySelectorAll('.avpick').length===9 && document.querySelectorAll('.drpick').length===10;
    // 自己設計: the creator opens, an option changes the look (and the big preview), a colour swatch too
    q('[data-act="av"][data-id="custom"]').click();
    const creatorOpen=!!q('.creator') && document.querySelectorAll('.lk-tab').length===13 && document.querySelectorAll('.lk-opts .lk-opt').length===10;
    const prev0=q('.cr-prev svg').innerHTML; q('[data-act="lk"][data-k="hair"][data-v="3"]').click();
    q('[data-act="lk-tab"][data-k="skin"]').click(); q('[data-act="lk"][data-k="skin"][data-v="4"]').click();
    q('[data-act="lk-tab"][data-k="head"]').click(); q('[data-act="lk"][data-k="head"][data-v="1"]').click();
    const designed=s.me.avatar==='custom' && s.me.look.hair===3 && s.me.look.skin===4 && s.me.look.head===1 && q('.cr-prev svg').innerHTML!==prev0 &&
      document.querySelectorAll('.lk-opts.sw .lk-sw').length===0 && JSON.parse(localStorage.getItem('life_paths_state')).me.look.head===1;
    const myLook=JSON.stringify(s.me.look), myLayers=window.LifePathsFun.lookLayers(s.me.look).length;
    q('[data-act="dr"][data-id="engineer"]').click();
    // strengths: 8 cards; 下一步 needs exactly two; once two are picked the other six are disabled
    const stCards=document.querySelectorAll('.stpick').length===8;
    q('[data-act="me-next"]').click(); const stNeed=L.state.step==='me' && /兩個強項/.test((q('#st-err')||{}).textContent||'');
    ${JSON.stringify(QA_STRENGTHS)}.forEach((id)=>q('[data-act="st"][data-id="'+id+'"]').click());
    const stTwo=JSON.stringify(s.me.strengths)===${JSON.stringify(JSON.stringify(QA_STRENGTHS))} && document.querySelectorAll('.stpick:disabled').length===6;
    Object.assign(s.pred,{chi:'4',eng:'4',math:'4',csd:'attained'});
    s.pred.elect=[{s:'chist',lv:'5'},{s:'econ',lv:'4'},{s:'',lv:''},{s:'',lv:''}]; s.cats=[]; s.me.dreamCat=null;
    L.go('list'); L.act('l-suggest'); const list=s.list.slice();
    const tags=document.querySelectorAll('#slots .evp .pill').length>=list.length?document.querySelectorAll('#slots .evp').length:-1;
    // the list shows the Evaluator's labels: a programme that gave 85%+ of offers to Band A, placed at B4 → 組別錯誤
    const pg=L.core.toEngineGrades({chi:'4',eng:'4',math:'4',csd:'attained',elect:[{s:'chist',lv:'5'},{s:'econ',lv:'4'}]});
    const wp=L.db().list.find((p)=>window.JUPASAnalytics.bandPlacementCheck(p,4).verdict==='wrong' &&
      window.JUPASEngine.evaluateProgramme(p,pg).eligibility.eligible);
    s.list=list.slice(0,3).concat([wp.jupas_code]); L.go('list');
    const wrongPill=!!wp && (document.querySelectorAll('#slots .slot')[3]||{textContent:''}).textContent.includes('組別錯誤')
      && !document.querySelectorAll('#slots .slot')[0].textContent.includes('組別錯誤');
    // the list page (Finder+-style): the picker groups programmes; a card adds one; search; drag-and-drop and ▲ reorder
    s.list=[]; L.go('list');
    const picker=document.querySelectorAll('#l-groups .gtab').length===6 && document.querySelectorAll('#l-res .pcard').length>0 &&
      document.querySelectorAll('#l-cats .chip').length===11 && document.querySelectorAll('#l-insts .chip').length>=10;
    for (let k=0;k<4;k++) q('#l-res .addbtn:not(.on)').click();          // re-query: each click re-renders the cards
    const added=s.list.length===4 && document.querySelectorAll('#slots .slot').length===4 && /A1/.test((q('#l-res .addbtn.on')||{}).textContent||'');
    const qi=q('#l-q'); qi.value=s.list[0]; qi.dispatchEvent(new Event('input',{bubbles:true}));
    const search=[...document.querySelectorAll('#l-groups .gtab .n')].reduce((a,n)=>a+(+n.textContent),0)===1;
    q('#l-ghint .linkbtn').click(); q('#slots').scrollIntoView({block:'center'}); await w(30);
    const d0=s.list.slice(), rw=[...document.querySelectorAll('#slots .slot')], dt=new DataTransfer(), r2=rw[2].getBoundingClientRect(), y2=r2.top+r2.height*0.75;
    rw[0].dispatchEvent(new DragEvent('dragstart',{bubbles:true,dataTransfer:dt}));
    rw[2].dispatchEvent(new DragEvent('dragover',{bubbles:true,cancelable:true,dataTransfer:dt,clientY:y2}));
    rw[2].dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:dt,clientY:y2}));
    const mouseDrag=JSON.stringify(s.list)===JSON.stringify([d0[1],d0[2],d0[0],d0[3]]);
    q('#slots').scrollIntoView({block:'center'}); await w(30);
    const d1=s.list.slice(), hd=document.querySelectorAll('#slots .slot')[3].querySelector('.drag'), hr=hd.getBoundingClientRect();
    const top=document.querySelectorAll('#slots .slot')[0].getBoundingClientRect(), tx=top.left+top.width/2, ty=top.top+top.height*0.25;
    const tc=(x,y)=>new Touch({identifier:1,target:hd,clientX:x,clientY:y});
    hd.dispatchEvent(new TouchEvent('touchstart',{bubbles:true,cancelable:true,touches:[tc(hr.left+4,hr.top+4)],changedTouches:[tc(hr.left+4,hr.top+4)]}));
    hd.dispatchEvent(new TouchEvent('touchmove',{bubbles:true,cancelable:true,touches:[tc(tx,ty)],changedTouches:[tc(tx,ty)]}));
    hd.dispatchEvent(new TouchEvent('touchend',{bubbles:true,cancelable:true,touches:[],changedTouches:[tc(tx,ty)]}));
    const touchDrag=JSON.stringify(s.list)===JSON.stringify([d1[3],d1[0],d1[1],d1[2]]);
    const d2=s.list.slice(); q('#slots [data-act="l-up"][data-i="1"]').click();
    const arrows=JSON.stringify(s.list)===JSON.stringify([d2[1],d2[0],d2[2],d2[3]]);
    s.list=list.slice(); L.go('list');
    // results day: 估一估 first, then the grades start face down (one tap, then 全部揭曉)
    L.act('l-next'); const guessMatch=!!(await until(()=>q('[data-act="guess-match"]')));
    q('[data-act="guess-match"][data-v="2"]').click(); q('[data-act="flip"]').click(); q('[data-act="reveal-all"]').click();
    const results=!!(await until(()=>q('.rtable')&&q('[data-act="r-next"]'))), reflect=!!q('.reflect'), guessRes=!!q('.guess-res');
    // offers: a Band guess, then the choices are scanned in order (skipped here)
    L.act('r-next'); q('[data-act="guess-band"][data-v="0"]').click();
    const scan=!!(await until(()=>q('.scanrow'))); q('[data-act="scan-skip"]').click();
    const offerCard=!!(await until(()=>q('.offer-card')));
    const evCol=document.querySelectorAll('.otable thead th').length===5 && !!q('.otable tbody .pill');
    const offer=s.round.offer?s.round.offer.code:null;
    L.act('o-others'); const routes=document.querySelectorAll('.route').length;
    q('[data-act="route"][data-id="work"]').click();
    const meters=document.querySelectorAll('.lifepanel .meter').length, walk=!!q('.walk .walker svg'), payGuess=!!q('[data-act="guess-pay"]');
    const avWalk=walk && q('.walk .walker svg').querySelectorAll('path').length===myLayers;
    const end=await play(), life=s.life?{age:s.life.age,monthly:s.life.job?s.life.job.monthly:null}:null, dataPage=!!q('.datapage');
    const titleCard=!!q('.titlecard .ptitle'), dreamCard=!!q('.dreamcard .stars'), guesses=!!q('.guesses');
    const avTitle=!!q('.titlecard svg') && q('.titlecard svg').querySelectorAll('path').length===myLayers && q('.titlecard svg').getAttribute('aria-label')==='自己設計';
    const stSummary=[...document.querySelectorAll('.endcard .summary dt')].some((dt)=>dt.textContent==='強項') && q('.endcard .summary').textContent.includes('好學不倦');
    // Phase 3 on the summary: "what if" (nothing changed = the same life; one change = a comparison), share image, runs
    const replaySame=L.replaySame(), wiBtn=q('[data-act="wi"]');
    if (wiBtn) wiBtn.click();
    const whatIf=!!wiBtn && !!(await until(()=>q('#wi-cmp .cmp'))), runs=!!q('.runs');
    // badges: the new ones show on the summary and are saved on the device (如果當初 too, from the comparison just opened)
    const kept=JSON.parse(localStorage.getItem('life_paths_badges')||'[]');
    const badges=!!q('.badges-new .bchip') && kept.includes('firstJob') && kept.includes('whatIf') && kept.includes('offer') &&
      new RegExp('（'+kept.length+' / 12）').test((q('.endcard details.badges summary')||{}).textContent||'') && document.querySelectorAll('.bgrid .badge.on').length===kept.length;
    const sh=q('[data-act="share"]'); if (sh) sh.click();
    const share=!!sh && !!(await until(()=>{const u=L.shareURL;return u&&/^data:image\\/png;base64,/.test(u.url)&&u.w===1080&&q('.shareimg');},20000));
    // the screens the work route skips: retake year → round 2 (→ Clearing Round) → field picker → a second life
    L.go('routes'); q('[data-act="route"][data-id="retake"]').click();
    q('[data-act="rt-sub"]').click(); q('[data-act="rt-go"]').click();
    const retake=!!(await until(()=>q('.rtable'))) && !!(s.retake&&s.retake.results);
    q('[data-act="reveal-all"]').click(); q('[data-act="r-next"]').click();
    { const sk=await until(()=>q('[data-act="scan-skip"]')||q('.offer-card')); if (sk&&sk.matches('[data-act="scan-skip"]')) sk.click(); }
    await until(()=>q('.offer-card'));
    let clearing=null;
    if (q('[data-act="o-clearing"]')) { q('[data-act="o-clearing"]').click(); clearing=!!(await until(()=>q('.cands,.panel .note'))); }
    L.go('routes'); q('[data-act="route"][data-id="vtc"]').click();
    const field=!!(await until(()=>q('[data-act="fld"]'))); q('[data-act="fld"]').click(); q('[data-act="f-go"]').click();
    const end2=await play(), age2=s.life?s.life.age:null;
    // class mode: a typed class code becomes the shared seed and shows on every screen
    L.act('restart'); await until(()=>q('#class-code'));
    const ci=q('#class-code'); ci.value='qa 7b'; ci.dispatchEvent(new Event('input',{bubbles:true})); q('[data-act="start"]').click();
    const classMode=L.state.seed==='class-QA7B' && L.state.classCode==='QA7B' && !!(await until(()=>q('.classpill')));
    // quick start (the character carried over): a ready-made student fills the grades and "suggest" builds the list
    // a badge's item is now selectable in 自己設計 (工作證 from 第一份全職); one not earned stays locked (皇冠 needs 夢想成真)
    q('[data-act="lk-tab"][data-k="extra"]').click(); const idOpen=!q('[data-act="lk"][data-k="extra"][data-v="6"]').disabled;
    q('[data-act="lk-tab"][data-k="head"]').click();
    const crownLocked=q('[data-act="lk"][data-k="head"][data-v="11"]').disabled && !!q('.lk-opt.locked .lk-lock') && !q('[data-act="lk"][data-k="head"][data-v="6"]').disabled;
    q('[data-act="me-next"]').click(); q('[data-act="sample"][data-id="biz"]').click();
    const quick=L.state.step==='list' && L.state.list.length>0 && L.state.pred.eng==='5' && L.state.me.avatar==='custom' && JSON.stringify(L.state.me.look)===myLook &&
      JSON.stringify(L.state.me.strengths)===${JSON.stringify(JSON.stringify(QA_STRENGTHS))};
    return JSON.stringify({list, tags, wrongPill, evCol, picker, added, search, mouseDrag, touchDrag, arrows, meScreen, creatorOpen, designed, avWalk, avTitle,
      stCards, stNeed, stTwo, stSummary, badges, idOpen, crownLocked, guessMatch, results, reflect, guessRes, scan, offerCard, offer, routes, meters, walk, payGuess,
      end, life, dataPage, titleCard, dreamCard, guesses, replaySame, whatIf, runs, share, retake, clearing, field, end2, age2, classMode, quick});`);
}
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
      else if (t.page === 'life-paths.html') {
        const r = JSON.parse(got || '{}');
        record(t.page, `"suggest" list matches the core (${LIFE.list.length} choices, slot tags shown)`,
          JSON.stringify(r.list) === JSON.stringify(LIFE.list) && r.tags === LIFE.list.length, `got ${JSON.stringify(r.list || []).slice(0, 80)}`);
        record(t.page, 'results day → offers → routes → life (5 meters) → summary + data page all render',
          r.results && r.offerCard && r.routes > 0 && r.meters === 5 && r.end && r.dataPage, got);
        record(t.page, `same seed → same offer as the core (${LIFE.offer || 'none'})`, r.offer === LIFE.offer, `got ${r.offer}`);
        if (LIFE.life) record(t.page, `same seed → same life as the core (work route, short mode: ends at ${LIFE.life.age}, HK$${LIFE.life.monthly})`,
          !!r.life && r.life.age === LIFE.life.age && r.life.monthly === LIFE.life.monthly, `got ${JSON.stringify(r.life)}`);
        record(t.page, 'retake year → round 2 (→ Clearing Round) → field picker → a second life to 25',
          r.retake && r.clearing !== false && r.field && r.end2 && r.age2 === 25, got);
        record(t.page, '"what if": nothing changed rebuilds the same life; one change shows the side-by-side comparison',
          r.replaySame === true && r.whatIf, got);
        record(t.page, 'reflection prompt, share image (PNG made in the browser) and recent runs render', r.reflect && r.share && r.runs, got);
        record(t.page, 'class mode: the class code becomes the shared seed and shows on screen', r.classMode, got);
        record(t.page, 'fun pack: character + dream screen, quick-start student (grades filled, list suggested, character kept)',
          r.meScreen && r.quick, got);
        record(t.page, 'badges: new ones shown on the summary and saved on the device (如果當初 too); an earned badge\'s item becomes ' +
          'selectable in 自己設計, an unearned one stays locked', r.badges && r.idOpen && r.crownLocked, got);
        record(t.page, 'strengths: 8 cards; 下一步 waits for exactly two; a third is disabled; the two shape the life (same as the core), ' +
          'show on the summary and are kept for a new game', r.stCards && r.stNeed && r.stTwo && r.stSummary && r.quick, got);
        record(t.page, 'avatar creator (自己設計): 13 parts, options and colours change the look and are saved; the design walks the road, ' +
          'heads the end card and the share image, and is kept for a new game', r.creatorOpen && r.designed && r.avWalk && r.avTitle && r.share && r.quick, got);
        record(t.page, 'fun pack: guess before results, grades turned over, Band guess + scan of the choices',
          r.guessMatch && r.guessRes && r.scan, got);
        record(t.page, 'fun pack: walking character + pay guess in the life; end title, dream stars and guess scorecard',
          r.walk && r.payGuess && r.titleCard && r.dreamCard && r.guesses, got);
        record(t.page, 'Evaluator rules on screen: a Band-A-only programme placed at B4 shows 組別錯誤; offer details show each choice\'s Evaluator level',
          r.wrongPill && r.evCol, got);
        record(t.page, 'list page like the Finder+: score-group tabs, subject + institution chips, cards add choices, search narrows',
          r.picker && r.added && r.search, got);
        record(t.page, 'reordering choices: mouse drag-and-drop, touch drag by the ⠿ handle, and ▲▼', r.mouseDrag && r.touchDrag && r.arrows, got);
      }
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
