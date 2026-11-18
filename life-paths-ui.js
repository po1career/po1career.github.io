/* ============================================================================
   DSE 人生模擬器 — screens + passcode gate (繁中 only). Phase 1: grades → interests →
   JUPAS list → results day → August offer → route → summary.
   Gate = the Finder/Planner contract: PBKDF2-SHA256 150k + AES-GCM decrypt of
   jupas-finder-db.enc.json with the student passcode, remembered in LS jupas_pass.
   Simulation lives in life-paths-core.js; all text in life-paths-content.js.
   Nothing leaves the browser: the game state is kept only in this device's localStorage.
   ========================================================================== */
(function () {
  'use strict';
  var C = window.LifePathsCore, T = window.LifePathsText;
  var PBKDF2_ITER = 150000, LS_PASS = 'jupas_pass', ENC_URL = 'jupas-finder-db.enc.json';
  var LS_STATE = 'life_paths_state', LS_RUNS = 'life_paths_runs';
  var LEVELS = ['5**', '5*', '5', '4', '3', '2', '1', 'U'];
  var DB = null, encBlob = null, state = null, resumeStep = null;

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fmt(n) { return n == null || isNaN(n) ? '—' : String(+(+n).toFixed(2)); }
  function pname(p) { return String(p.name_zh || p.name_en || '').replace(/^由[^：]+開辦：/, ''); }
  function pinst(p) { return p.institution_zh || p.institution || ''; }

  /* ---------- state ---------- */
  function blankPred() {
    return { chi: '', eng: '', math: '', csd: 'attained', elect: [{ s: '', lv: '' }, { s: '', lv: '' }, { s: '', lv: '' }, { s: '', lv: '' }] };
  }
  function blank() { return { v: 1, seed: C.newSeed(), step: 'grades', pred: blankPred(), cats: [], list: [], results: null, round: null, route: null }; }
  function predClean() {
    var p = state.pred;
    return { chi: p.chi, eng: p.eng, math: p.math, csd: p.csd,
      elect: p.elect.filter(function (e) { return e.s && e.lv; }).map(function (e) { return { s: e.s, lv: e.lv }; }) };
  }
  function save() { try { localStorage.setItem(LS_STATE, JSON.stringify(state)); } catch (e) {} }
  function load() {
    try { var s = JSON.parse(localStorage.getItem(LS_STATE) || 'null'); if (s && s.v === 1 && s.pred) return s; } catch (e) {}
    return null;
  }
  function saveRun() {
    try {
      var runs = JSON.parse(localStorage.getItem(LS_RUNS) || '[]');
      var o = state.round && state.round.offer;
      runs.unshift({ at: new Date().toISOString().slice(0, 10), seed: state.seed, offer: o ? o.slot + ' ' + o.code : null, route: state.route });
      localStorage.setItem(LS_RUNS, JSON.stringify(runs.slice(0, 5)));
    } catch (e) {}
  }

  /* ---------- navigation ---------- */
  var ORDER = ['intro', 'grades', 'interests', 'list', 'results', 'offers', 'routes', 'end'];
  function go(step) { state.step = step; save(); render(); window.scrollTo(0, 0); }
  function back() {
    var i = ORDER.indexOf(state.step);
    var prev = ORDER[Math.max(0, i - 1)];
    if (state.step === 'end' && state.route === 'degree') prev = 'offers';
    go(prev === 'intro' ? 'grades' : prev);
  }
  function renderSteps() {
    var cur = ORDER.indexOf(state.step) - 1;               // intro has no step
    $('steps').innerHTML = state.step === 'intro' ? '' : T.steps.map(function (s, i) {
      return '<li class="' + (i < cur ? 'done' : i === cur ? 'on' : '') + '"' + (i === cur ? ' aria-current="step"' : '') + '>' +
        '<span class="n">' + (i + 1) + '</span>' + esc(s.label) + '</li>';
    }).join('');
  }
  function render() {
    renderSteps();
    var s = SCREENS[state.step] || SCREENS.intro;
    $('screen').innerHTML = s();
    if (state.step === 'list') renderList();
  }
  function navRow(nextAct, nextLabel, extra) {
    return '<div class="navrow">' + (state.step !== 'grades' ? '<button type="button" class="btn btn-ghost" data-act="back">← ' + esc(T.common.back) + '</button>' : '<span></span>') +
      (extra || '') + (nextAct ? '<button type="button" class="btn" data-act="' + nextAct + '">' + esc(nextLabel) + ' →</button>' : '') + '</div>';
  }

  /* ---------- screens ---------- */
  var SCREENS = {
    intro: function () {
      return '<div class="panel"><h2>' + esc(T.intro.how) + '</h2><ol class="how">' +
        T.howItWorks.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol>' +
        '<p class="note">' + esc(T.phase1Note) + '</p>' +
        '<div class="navrow">' + (resumeStep ? '<button type="button" class="btn btn-ghost" data-act="restart">' + esc(T.intro.restart) + '</button>' +
          '<button type="button" class="btn" data-act="resume">' + esc(T.intro.resume) + ' →</button>'
          : '<span></span><button type="button" class="btn" data-act="start">' + esc(T.intro.start) + ' →</button>') + '</div></div>';
    },

    grades: function () {
      var p = state.pred, G = T.grades;
      function lvSel(attr, val) {
        return '<select ' + attr + ' aria-label="' + esc(G.level) + '"><option value="">' + esc(G.none) + '</option>' +
          LEVELS.map(function (l) { return '<option' + (l === val ? ' selected' : '') + '>' + l + '</option>'; }).join('') + '</select>';
      }
      var chosen = p.elect.map(function (e) { return e.s; });
      var rows = C.CORES.map(function (k) {
        return '<tr><td>' + esc(C.SUBJ_ZH[k]) + '</td><td>' + lvSel('data-core="' + k + '"', p[k]) + '</td></tr>';
      }).join('') +
        '<tr><td>' + esc(C.SUBJ_ZH.csd) + '</td><td><div class="seg" role="group">' +
        '<button type="button" data-act="csd" data-v="attained" class="' + (p.csd === 'attained' ? 'on' : '') + '">' + esc(G.csdAttained) + '</button>' +
        '<button type="button" data-act="csd" data-v="notattained" class="' + (p.csd === 'notattained' ? 'on' : '') + '">' + esc(G.csdNot) + '</button></div></td></tr>' +
        p.elect.map(function (e, i) {
          var opts = '<option value="">' + esc(G.none) + '</option>' + C.ELECTIVES.map(function (s) {
            return chosen.indexOf(s) >= 0 && e.s !== s ? '' : '<option value="' + s + '"' + (e.s === s ? ' selected' : '') + '>' + esc(C.SUBJ_ZH[s]) + '</option>';
          }).join('');
          return '<tr><td><select data-el="' + i + '" aria-label="' + esc(G.addElective) + ' ' + (i + 1) + '">' + opts + '</select></td><td>' + lvSel('data-ellv="' + i + '"', e.lv) + '</td></tr>';
        }).join('');
      return '<div class="panel"><h2>' + esc(G.heading) + '</h2><p class="hint">' + esc(G.hint) + '</p>' +
        '<table class="gtable"><tbody>' + rows + '</tbody></table><div id="err" class="err" role="alert"></div>' +
        navRow('g-next', G.next) + '</div>';
    },

    interests: function () {
      var I = T.interests;
      return '<div class="panel"><h2>' + esc(I.heading) + '</h2><p class="hint">' + esc(I.hint) + '</p><div class="chips">' +
        T.categories.map(function (c) {
          var on = state.cats.indexOf(c.key) >= 0;
          return '<button type="button" class="chip' + (on ? ' on' : '') + '" aria-pressed="' + on + '" data-act="cat" data-k="' + c.key + '">' + esc(c.zh) + '</button>';
        }).join('') + '</div>' +
        navRow('i-next', I.next, '<button type="button" class="btn btn-ghost" data-act="i-skip">' + esc(I.skip) + '</button>') + '</div>';
    },

    list: function () {
      var L = T.list;
      return '<div class="panel"><h2>' + esc(L.heading) + '</h2><p class="hint">' + esc(L.hint) + '</p>' +
        '<div class="row"><button type="button" class="btn" data-act="l-suggest">✨ ' + esc(L.suggest) + '</button>' +
        '<button type="button" class="btn btn-ghost" data-act="l-clear">' + esc(L.clear) + '</button></div>' +
        '<div id="l-msg" class="note" role="status" hidden></div>' +
        '<div class="search"><input type="text" id="l-q" autocomplete="off" placeholder="' + esc(L.searchPh) + '" aria-label="' + esc(L.searchPh) + '">' +
        '<div id="l-res" class="results"></div></div>' +
        '<ol id="slots" class="slots"></ol><p class="hint small">' + esc(L.tagNote) + '</p>' +
        '<div id="l-nav"></div></div>';
    },

    results: function () {
      var R = T.results, res = state.results, up = 0, down = 0, same = 0;
      var rows = res.changes.map(function (c) {
        var cls = c.diff > 0 ? 'up' : c.diff < 0 ? 'down' : 'same';
        if (c.diff > 0) up++; else if (c.diff < 0) down++; else same++;
        var mark = c.diff > 0 ? '▲ ' + R.up : c.diff < 0 ? '▼ ' + R.down : '＝ ' + R.same;
        return '<tr class="' + cls + '"><td>' + esc(C.SUBJ_ZH[c.key]) + '</td><td>' + esc(c.from) + '</td><td class="big">' + esc(c.to) + '</td><td class="mk">' + esc(mark) + '</td></tr>';
      }).join('');
      var met = C.meets332A(res.actual);
      return '<div class="panel"><h2>📮 ' + esc(R.heading) + '</h2><p class="hint">' + esc(R.intro) + '</p>' +
        '<div class="tablewrap"><table class="rtable"><thead><tr>' + R.th.map(function (h) { return '<th>' + esc(h) + '</th>'; }).join('') + '</tr></thead><tbody>' + rows +
        '<tr class="same"><td>' + esc(C.SUBJ_ZH.csd) + '</td><td>' + esc(res.actual.csd === 'attained' ? T.grades.csdAttained : T.grades.csdNot) + '</td><td class="big">' +
        esc(res.actual.csd === 'attained' ? T.grades.csdAttained : T.grades.csdNot) + '</td><td class="mk">＝ ' + esc(R.same) + '</td></tr></tbody></table></div>' +
        '<p class="tally">' + same + ' 科與預計相同 · ' + down + ' 科較預計低 · ' + up + ' 科較預計高</p>' +
        '<div class="callout ' + (met ? 'ok' : 'warn') + '">' + esc(met ? R.met332A : R.not332A) + '<br><span class="small">' + esc(R.stat332A) + '</span></div>' +
        '<details class="explain"><summary>' + esc(R.ruleTitle) + '</summary><p>' + esc(R.rule) + '</p></details>' +
        navRow('r-next', R.next) + '</div>';
    },

    offers: function () {
      var O = T.offers, round = state.round, o = round.offer, card;
      if (o) {
        var p = DB.byCode[o.code];
        card = '<div class="offer-card"><div class="big-emoji" aria-hidden="true">🎉</div><p class="headline">' + esc(O.got(o.slot, pname(p), pinst(p))) + '</p></div>';
      } else {
        card = '<div class="offer-card none"><div class="big-emoji" aria-hidden="true">🌱</div><p class="headline">' +
          esc(state.list.length ? O.none : O.noList) + '</p><p class="hint">' + esc(O.noneHint) + '</p></div>';
      }
      var rows = round.rows.map(function (r) {
        var p = DB.byCode[r.code], notes = [];
        if (r.noData) notes.push(O.noData);
        if (r.interview) notes.push(O.interview);
        if (r.fewPlaces) notes.push(O.fewPlaces);
        return '<tr class="st-' + r.status + '"><td><span class="chipband b' + C.bandOfSlot(r.i) + '">' + esc(C.slotLabel(r.i)) + '</span></td>' +
          '<td>' + (p ? esc(pname(p)) + '<div class="small muted">' + esc(pinst(p)) + ' · ' + esc(r.code) + '</div>' : esc(r.code)) + '</td>' +
          '<td>' + esc(fmt(r.score)) + '</td><td>' + esc(O.st[r.status] || '') + (notes.length ? '<div class="small muted">' + esc(notes.join(' ')) + '</div>' : '') + '</td></tr>';
      }).join('');
      var detail = round.rows.length ? '<details class="explain"' + (o ? '' : ' open') + '><summary>' + esc(O.detail) + '</summary><div class="tablewrap"><table class="otable"><thead><tr>' +
        O.th.map(function (h) { return '<th>' + esc(h) + '</th>'; }).join('') + '</tr></thead><tbody>' + rows + '</tbody></table></div></details>' : '';
      var how = '<details class="explain"><summary>' + esc(O.howTitle) + '</summary><ul>' + O.how.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></details>';
      var btns = o ? '<button type="button" class="btn btn-ghost" data-act="o-others">' + esc(O.others) + '</button><button type="button" class="btn" data-act="o-accept">' + esc(O.accept) + ' →</button>'
        : '<span></span><button type="button" class="btn" data-act="o-others">' + esc(O.toRoutes) + ' →</button>';
      return '<div class="panel"><h2>✉️ ' + esc(O.heading) + '</h2>' + card + detail + how +
        '<div class="navrow"><button type="button" class="btn btn-ghost" data-act="back">← ' + esc(T.common.back) + '</button>' + btns + '</div></div>';
    },

    routes: function () {
      var R = T.routes, opts = C.routeOptions(state.results.actual, state.round.offer);
      var cards = opts.map(function (r) {
        var info = T.routeInfo[r.id];
        if (r.id === 'degree' && !r.available) return '';
        return '<div class="route' + (r.available ? '' : ' off') + '"><div class="rt-head"><span class="rt-icon" aria-hidden="true">' + info.icon + '</span><b>' + esc(info.name) + '</b>' +
          '<span class="pill ' + (r.available ? 'p-good' : 'p-unk') + '">' + esc(r.available ? R.available : R.unavailable + '：' + (R.why[r.why] || '')) + '</span></div>' +
          '<p>' + esc(info.summary) + '</p><dl><dt>' + esc(R.entry) + '</dt><dd>' + esc(info.entry) + '</dd><dt>' + esc(R.leadsTo) + '</dt><dd>' + esc(info.leadsTo) + '</dd></dl>' +
          '<div class="rt-foot">' + (info.link ? '<a href="' + esc(info.link) + '" target="_blank" rel="noopener noreferrer">' + esc(R.more) + ' ↗</a>' : '<span></span>') +
          '<button type="button" class="btn small" data-act="route" data-id="' + r.id + '"' + (r.available ? '' : ' disabled') + '>' + esc(R.choose) + '</button></div></div>';
      }).join('');
      return '<div class="panel"><h2>🧭 ' + esc(R.heading) + '</h2><p class="hint">' + esc(R.hint) + '</p><div class="routes">' + cards + '</div>' +
        '<div class="navrow"><button type="button" class="btn btn-ghost" data-act="back">← ' + esc(T.common.back) + '</button><span></span></div></div>';
    },

    end: function () {
      var X = T.end, res = state.results, o = state.round && state.round.offer;
      var predTxt = res.changes.map(function (c) { return C.SUBJ_ZH[c.key].replace(/（.*）/, '') + ' ' + c.from; }).join('、');
      var actTxt = res.changes.map(function (c) { return C.SUBJ_ZH[c.key].replace(/（.*）/, '') + ' ' + c.to; }).join('、');
      var offerTxt = o ? o.slot + '　' + pname(DB.byCode[o.code]) + '（' + pinst(DB.byCode[o.code]) + '）' : X.noOffer;
      var r = T.routeInfo[state.route] || { icon: '', name: '' };
      return '<div class="panel endcard"><h2>📘 ' + esc(X.heading) + '</h2><dl class="summary">' +
        '<dt>' + esc(X.predicted) + '</dt><dd>' + esc(predTxt) + '</dd><dt>' + esc(X.actual) + '</dt><dd>' + esc(actTxt) + '</dd>' +
        '<dt>' + esc(X.offer) + '</dt><dd>' + esc(offerTxt) + '</dd><dt>' + esc(X.path) + '</dt><dd>' + r.icon + ' ' + esc(r.name) + '</dd></dl>' +
        '<p class="note">' + esc(X.next) + '</p>' +
        '<div class="row wrap"><button type="button" class="btn" data-act="e-again">🎲 ' + esc(X.again) + '</button>' +
        '<button type="button" class="btn btn-ghost" data-act="e-edit">' + esc(X.edit) + '</button>' +
        '<button type="button" class="btn btn-ghost" data-act="restart">' + esc(X.restart) + '</button></div>' +
        '<p class="real">' + esc(X.real) + X.realLinks.map(function (l) { return '<a href="' + l.href + '">' + esc(l.label) + '</a>'; }).join(' · ') + '</p>' +
        '<p class="hint">' + esc(X.teacher) + '</p><p class="small muted">' + esc(X.runCode) + '：' + esc(state.seed) + '</p></div>';
    }
  };

  /* ---------- the JUPAS list (search + 20 slots) ---------- */
  function renderList() {
    var L = T.list, pc = predClean();
    $('slots').innerHTML = state.list.length ? state.list.map(function (code, i) {
      var p = DB.byCode[code], tag = C.slotTagFor(code, i, pc, DB);
      var tagTxt = tag === 'good' ? L.tagGood : tag === 'mid' ? L.tagMid : L.tagBad;
      return '<li class="slot"><span class="chipband b' + C.bandOfSlot(i) + '">' + esc(C.slotLabel(i)) + '</span>' +
        '<span class="sname">' + (p ? esc(pname(p)) + '<span class="small muted"> ' + esc(pinst(p)) + ' · ' + esc(code) + '</span>' : esc(code)) + '</span>' +
        '<span class="pill p-' + tag + '">' + esc(tagTxt) + '</span>' +
        '<span class="ops"><button type="button" data-act="l-up" data-i="' + i + '" aria-label="上移"' + (i === 0 ? ' disabled' : '') + '>▲</button>' +
        '<button type="button" data-act="l-down" data-i="' + i + '" aria-label="下移"' + (i === state.list.length - 1 ? ' disabled' : '') + '>▼</button>' +
        '<button type="button" data-act="l-del" data-i="' + i + '" aria-label="移除">✕</button></span></li>';
    }).join('') : '<li class="empty">' + esc(L.empty) + '</li>';
    $('l-nav').innerHTML = navRow('l-next', state.list.length ? L.next : L.nextEmpty);
    renderSearch();
  }
  function renderSearch() {
    var L = T.list, box = $('l-res'), q = ($('l-q').value || '').trim().toLowerCase();
    if (!q) { box.innerHTML = ''; return; }
    var hits = DB.list.filter(function (p) {
      return [p.jupas_code, p.name_zh, p.name_en, p.institution_zh, p.institution].some(function (f) { return String(f || '').toLowerCase().indexOf(q) >= 0; });
    }).slice(0, 8);
    var full = state.list.length >= 20;
    box.innerHTML = hits.length ? hits.map(function (p) {
      var inList = state.list.indexOf(p.jupas_code) >= 0;
      return '<div class="hit"><span><b>' + esc(p.jupas_code) + '</b> ' + esc(pname(p)) + '<span class="small muted"> ' + esc(pinst(p)) + '</span></span>' +
        '<button type="button" class="btn small" data-act="l-add" data-code="' + esc(p.jupas_code) + '"' + (inList || full ? ' disabled' : '') + '>' +
        (inList ? '✓' : full ? esc(L.full) : '＋') + '</button></div>';
    }).join('') : '<div class="hit muted">' + esc(L.noResult) + '</div>';
  }
  function listMsg(txt) { var m = $('l-msg'); if (!m) return; m.textContent = txt || ''; m.hidden = !txt; }

  /* ---------- actions ---------- */
  var ACT = {
    start: function () { state = blank(); resumeStep = null; go('grades'); },
    resume: function () { var s = resumeStep; resumeStep = null; go(s); },
    restart: function () { state = blank(); resumeStep = null; go('grades'); },
    back: back,
    csd: function (b) { state.pred.csd = b.getAttribute('data-v'); save(); render(); },
    'g-next': function () {
      var p = state.pred, err = $('err');
      if (!p.chi || !p.eng || !p.math) { err.textContent = T.grades.needCores; return; }
      if (p.elect.filter(function (e) { return e.s && e.lv; }).length < 2) { err.textContent = T.grades.needElect; return; }
      go('interests');
    },
    cat: function (b) {
      var k = b.getAttribute('data-k'), i = state.cats.indexOf(k);
      if (i >= 0) state.cats.splice(i, 1); else state.cats.push(k);
      save(); render();
    },
    'i-next': function () { go('list'); },
    'i-skip': function () { state.cats = []; go('list'); },
    'l-suggest': function () {
      state.list = C.suggestList(predClean(), state.cats, DB); save(); renderList();
      listMsg(state.list.length ? T.list.suggested : T.list.noneEligible);
    },
    'l-clear': function () { state.list = []; save(); renderList(); listMsg(''); },
    'l-add': function (b) {
      var c = b.getAttribute('data-code');
      if (state.list.indexOf(c) < 0 && state.list.length < 20) { state.list.push(c); save(); renderList(); }
    },
    'l-up': function (b) { move(+b.getAttribute('data-i'), -1); },
    'l-down': function (b) { move(+b.getAttribute('data-i'), 1); },
    'l-del': function (b) { state.list.splice(+b.getAttribute('data-i'), 1); save(); renderList(); },
    'l-next': function () {
      state.results = C.resultsDay(predClean(), state.seed);
      state.round = null; state.route = null;
      go('results');
    },
    'r-next': function () {
      var round = C.mainRound(state.list, state.results.actual, DB, state.seed);
      state.round = { offer: round.offer ? { i: round.offer.i, code: round.offer.code, slot: round.offer.slot } : null, rows: round.rows };
      go('offers');
    },
    'o-accept': function () { state.route = 'degree'; saveRun(); go('end'); },
    'o-others': function () { go('routes'); },
    route: function (b) { state.route = b.getAttribute('data-id'); saveRun(); go('end'); },
    'e-again': function () { state.seed = C.newSeed(); ACT['l-next'](); },
    'e-edit': function () { state.seed = C.newSeed(); go('grades'); }
  };
  function move(i, d) {
    var j = i + d; if (j < 0 || j >= state.list.length) return;
    var t = state.list[i]; state.list[i] = state.list[j]; state.list[j] = t; save(); renderList();
  }
  function wireScreen() {
    var scr = $('screen');
    scr.addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]');
      if (!b || b.disabled || !ACT[b.getAttribute('data-act')]) return;
      ACT[b.getAttribute('data-act')](b, e);
    });
    scr.addEventListener('change', function (e) {
      var t = e.target;
      if (t.hasAttribute('data-core')) { state.pred[t.getAttribute('data-core')] = t.value; save(); }
      else if (t.hasAttribute('data-el')) { state.pred.elect[+t.getAttribute('data-el')].s = t.value; save(); render(); }
      else if (t.hasAttribute('data-ellv')) { state.pred.elect[+t.getAttribute('data-ellv')].lv = t.value; save(); }
    });
    scr.addEventListener('input', function (e) { if (e.target.id === 'l-q') renderSearch(); });
  }

  /* ---------- passcode gate (same contract as jupas-finder / jupas-planner) ---------- */
  function b64ToBytes(b64) { return Uint8Array.from(atob(b64), function (c) { return c.charCodeAt(0); }); }
  function deriveKey(pc, salt) {
    return crypto.subtle.importKey('raw', new TextEncoder().encode(pc), 'PBKDF2', false, ['deriveKey'])
      .then(function (base) { return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: salt, iterations: PBKDF2_ITER, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']); });
  }
  function tryUnlock(pc, remember) {
    return deriveKey(pc, b64ToBytes(encBlob.salt))
      .then(function (key) { return crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64ToBytes(encBlob.iv) }, key, b64ToBytes(encBlob.data)); })
      .then(function (plain) {
        DB = C.indexDB(JSON.parse(new TextDecoder().decode(plain)));
        if (remember) { try { localStorage.setItem(LS_PASS, pc); } catch (e) {} }
        $('lock').style.display = 'none'; $('app').style.display = '';
        startApp();
        return true;
      }).catch(function () { try { localStorage.removeItem(LS_PASS); } catch (e) {} return false; });
  }
  function showLock(msg) { $('app').style.display = 'none'; $('lock').style.display = 'flex'; $('lock-err').textContent = msg || ''; }
  function wireLock() {
    function submit() {
      var pc = $('passcode').value; if (!pc) return;
      $('lock-err').textContent = '';
      tryUnlock(pc, true).then(function (ok) { if (!ok) { $('lock-err').textContent = '通行碼錯誤'; $('passcode').value = ''; } });
    }
    $('unlock-btn').addEventListener('click', submit);
    $('passcode').addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });
  }
  function startApp() {
    var saved = load();
    state = saved || blank();
    resumeStep = saved && saved.step && saved.step !== 'intro' ? saved.step : null;
    state.step = 'intro';
    if (!wireScreen.done) { wireScreen(); wireScreen.done = true; }
    render();
  }
  function init() {
    document.title = T.title + ' — PLK No.1 Career Team';
    wireLock();
    fetch(ENC_URL, { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (j) {
      encBlob = j; var saved = null; try { saved = localStorage.getItem(LS_PASS); } catch (e) {}
      if (saved) return tryUnlock(saved, false).then(function (ok) { if (!ok) showLock(''); });
      showLock('');
    }).catch(function () { showLock('無法載入資料檔。'); });
  }

  // test hook (used by tools/gated-qa.mjs)
  window.__lifePaths = {
    get state() { return state; }, go: go, act: function (name, el) { return ACT[name](el || { getAttribute: function () { return null; } }); },
    db: function () { return DB; }, core: C
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
