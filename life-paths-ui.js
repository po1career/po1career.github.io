/* ============================================================================
   DSE 人生模擬器 — screens + passcode gate (繁中 only).
   Chapter 1: grades → interests → JUPAS list → results day → August offer (→ Clearing Round) → route.
   Chapter 2: retake year · field of study · the years after August (focus, events, transitions) → life summary.
   Gate = the Finder/Planner contract: PBKDF2-SHA256 150k + AES-GCM decrypt of
   jupas-finder-db.enc.json with the student passcode, remembered in LS jupas_pass.
   Simulation: life-paths-core.js (DSE → August) + life-paths-life.js (after August); text: life-paths-content.js;
   cited figures: life-paths-stats.js. Nothing leaves the browser: game state stays in this device's localStorage.
   ========================================================================== */
(function () {
  'use strict';
  var C = window.LifePathsCore, L = window.LifePathsLife, ST = window.LifePathsStats, T = window.LifePathsText;
  var PBKDF2_ITER = 150000, LS_PASS = 'jupas_pass', ENC_URL = 'jupas-finder-db.enc.json';
  var LS_STATE = 'life_paths_state', LS_RUNS = 'life_paths_runs';
  var LEVELS = ['5**', '5*', '5', '4', '3', '2', '1', 'U'];
  var DB = null, encBlob = null, state = null, resumeStep = null, lastMsg = null;

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fmt(n) { return n == null || isNaN(n) ? '—' : String(+(+n).toFixed(2)); }
  function money(n) { return 'HK$' + Math.round(n).toLocaleString('en-US'); }
  function pname(p) { return String(p.name_zh || p.name_en || '').replace(/^由[^：]+開辦：/, ''); }
  function pinst(p) { return p.institution_zh || p.institution || ''; }
  function catZh(k) { var c = T.categories.filter(function (x) { return x.key === k; })[0]; return c ? c.zh : ''; }
  function shortSubj(k) { return C.SUBJ_ZH[k].replace(/（.*）/, ''); }
  function btn(act, label, opts) {
    opts = opts || {};
    return '<button type="button" class="btn' + (opts.ghost ? ' btn-ghost' : '') + (opts.small ? ' small' : '') + '" data-act="' + act + '"' +
      (opts.data ? Object.keys(opts.data).map(function (k) { return ' data-' + k + '="' + esc(opts.data[k]) + '"'; }).join('') : '') +
      (opts.disabled ? ' disabled' : '') + '>' + esc(label) + '</button>';
  }

  /* ---------- state ---------- */
  function blankPred() {
    return { chi: '', eng: '', math: '', csd: 'attained', elect: [{ s: '', lv: '' }, { s: '', lv: '' }, { s: '', lv: '' }, { s: '', lv: '' }] };
  }
  function blank(mode) {
    return { v: 1, seed: C.newSeed(), step: 'grades', mode: mode || 'short', pred: blankPred(), cats: [], list: [],
      results: null, round: null, clearing: null, retake: null, retakePick: [], route: null, field: null, life: null, lifeFrom: null };
  }
  function predClean() {
    var p = state.pred;
    return { chi: p.chi, eng: p.eng, math: p.math, csd: p.csd,
      elect: p.elect.filter(function (e) { return e.s && e.lv; }).map(function (e) { return { s: e.s, lv: e.lv }; }) };
  }
  // the grades and the round that count now (a retake year replaces the first sitting's)
  function inRetakeYear() { return !!(state.retake && state.retake.results); }
  function curActual() { return inRetakeYear() ? state.retake.results.actual : state.results.actual; }
  function curRound() { return inRetakeYear() ? state.retake.round : state.round; }
  function roundOpts() { return inRetakeYear() ? { round: 2, retake: true } : null; }
  function save() { try { localStorage.setItem(LS_STATE, JSON.stringify(state)); } catch (e) {} }
  function load() {
    try {
      var s = JSON.parse(localStorage.getItem(LS_STATE) || 'null');
      if (s && s.v === 1 && s.pred) { if (!s.mode) s.mode = 'short'; if (!s.retakePick) s.retakePick = []; return s; }
    } catch (e) {}
    return null;
  }
  function saveRun() {
    try {
      var runs = JSON.parse(localStorage.getItem(LS_RUNS) || '[]'), o = curRound() && curRound().offer, l = state.life;
      runs.unshift({ at: new Date().toISOString().slice(0, 10), seed: state.seed, mode: state.mode, offer: o ? o.slot + ' ' + o.code : null,
        route: state.route, age: l ? l.age : null, cred: l ? L.topCred(l) : null, monthly: l && l.job ? l.job.monthly : null });
      localStorage.setItem(LS_RUNS, JSON.stringify(runs.slice(0, 5)));
    } catch (e) {}
  }

  /* ---------- navigation ---------- */
  var STEP_IDX = { grades: 0, interests: 1, list: 2, results: 3, offers: 4, clearing: 4, routes: 5, retake: 5, field: 5, life: 6, end: 7 };
  var BACK = { interests: 'grades', list: 'interests', results: 'list', offers: 'results', clearing: 'offers', routes: 'offers', retake: 'routes', field: 'routes' };
  // a new screen: back to the top, and keyboard / screen-reader focus to its heading
  function go(step) {
    state.step = step; save(); render(); window.scrollTo(0, 0);
    var h = $('screen').querySelector('h2');
    if (h) { h.setAttribute('tabindex', '-1'); try { h.focus({ preventScroll: true }); } catch (e) {} }
  }
  function backTarget() {
    if (state.step === 'results' && inRetakeYear()) return 'retake';
    // a life can be undone only before its first focus choice (luck is keyed to the seed, so nothing re-rolls)
    if (state.step === 'life') return state.life && state.life.decisions.length <= 1 && state.lifeFrom ? state.lifeFrom : null;
    return BACK[state.step] || null;
  }
  function back() {
    var to = backTarget(); if (!to) return;
    if (to === 'retake' || state.step === 'retake') state.retake = null;
    if (state.step === 'life') { state.life = null; lastMsg = null; }
    go(to);
  }
  function renderSteps() {
    var cur = STEP_IDX[state.step];
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
  function backBtn() { return backTarget() ? btn('back', '← ' + T.common.back, { ghost: true }) : '<span></span>'; }
  function navRow(nextAct, nextLabel, extra) {
    return '<div class="navrow">' + backBtn() + (extra || '') + (nextAct ? btn(nextAct, nextLabel + ' →') : '') + '</div>';
  }

  /* ---------- screens ---------- */
  var SCREENS = {
    intro: function () {
      var M = T.modes, how = '<div class="panel"><h2>' + esc(T.intro.how) + '</h2><ol class="how">' +
        T.howItWorks.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol><p class="note">' + esc(T.phase1Note) + '</p>';
      if (resumeStep) {
        return how + '<div class="navrow">' + btn('restart', T.intro.restart, { ghost: true }) + btn('resume', T.intro.resume + ' →') + '</div></div>';
      }
      var modes = ['short', 'long'].map(function (m) {
        var on = state.mode === m;
        return '<button type="button" class="mode' + (on ? ' on' : '') + '" aria-pressed="' + on + '" data-act="mode" data-v="' + m + '"><b>' + esc(M[m].name) + '</b><span>' + esc(M[m].desc) + '</span></button>';
      }).join('');
      return how + '<h3 class="sub">' + esc(M.heading) + '</h3><div class="modes" role="group" aria-label="' + esc(M.heading) + '">' + modes + '</div>' +
        '<div class="navrow"><span></span>' + btn('start', T.intro.start + ' →') + '</div></div>';
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
        navRow('i-next', I.next, btn('i-skip', I.skip, { ghost: true })) + '</div>';
    },

    list: function () {
      var L2 = T.list;
      return '<div class="panel"><h2>' + esc(L2.heading) + '</h2><p class="hint">' + esc(L2.hint) + '</p>' +
        '<div class="row">' + btn('l-suggest', '✨ ' + L2.suggest) + btn('l-clear', L2.clear, { ghost: true }) + '</div>' +
        '<div id="l-msg" class="note" role="status" hidden></div>' +
        '<div class="search"><input type="text" id="l-q" autocomplete="off" placeholder="' + esc(L2.searchPh) + '" aria-label="' + esc(L2.searchPh) + '">' +
        '<div id="l-res" class="results"></div></div>' +
        '<ol id="slots" class="slots"></ol><p class="hint small">' + esc(L2.tagNote) + '</p>' +
        '<div id="l-nav"></div></div>';
    },

    results: function () {
      var R = T.results, K = T.retake, rt = inRetakeYear(), res = rt ? state.retake.results : state.results, up = 0, down = 0, same = 0, rows, th, tally;
      if (rt) {
        rows = res.changes.map(function (c) {
          if (c.diff > 0) up++;
          return '<tr class="' + (c.diff > 0 ? 'up' : 'same') + '"><td>' + esc(C.SUBJ_ZH[c.key]) + '</td><td>' + esc(c.from) + '</td><td>' + esc(c.sat) + '</td>' +
            '<td class="big">' + esc(c.to) + ' <span class="mk">' + esc(c.diff > 0 ? '▲ ' + K.up : '＝ ' + K.same) + '</span></td></tr>';
        }).join('');
        th = K.th; tally = K.tally(res.changes.length, up);
      } else {
        rows = res.changes.map(function (c) {
          if (c.diff > 0) up++; else if (c.diff < 0) down++; else same++;
          var mark = c.diff > 0 ? '▲ ' + R.up : c.diff < 0 ? '▼ ' + R.down : '＝ ' + R.same;
          return '<tr class="' + (c.diff > 0 ? 'up' : c.diff < 0 ? 'down' : 'same') + '"><td>' + esc(C.SUBJ_ZH[c.key]) + '</td><td>' + esc(c.from) + '</td><td class="big">' + esc(c.to) + '</td><td class="mk">' + esc(mark) + '</td></tr>';
        }).join('');
        var csdTxt = res.actual.csd === 'attained' ? T.grades.csdAttained : T.grades.csdNot;
        rows += '<tr class="same"><td>' + esc(C.SUBJ_ZH.csd) + '</td><td>' + esc(csdTxt) + '</td><td class="big">' + esc(csdTxt) + '</td><td class="mk">＝ ' + esc(R.same) + '</td></tr>';
        th = R.th; tally = same + ' 科與預計相同 · ' + down + ' 科較預計低 · ' + up + ' 科較預計高';
      }
      var met = C.meets332A(res.actual);
      return '<div class="panel"><h2>📮 ' + esc(rt ? K.resultsHeading : R.heading) + '</h2><p class="hint">' + esc(rt ? K.resultsIntro : R.intro) + '</p>' +
        '<div class="tablewrap"><table class="rtable"><thead><tr>' + th.map(function (h) { return '<th>' + esc(h) + '</th>'; }).join('') + '</tr></thead><tbody>' + rows +
        '</tbody></table></div><p class="tally">' + esc(tally) + '</p>' +
        '<div class="callout ' + (met ? 'ok' : 'warn') + '">' + esc(met ? R.met332A : R.not332A) + '<br><span class="small">' + esc(R.stat332A) + '</span></div>' +
        '<details class="explain"><summary>' + esc(R.ruleTitle) + '</summary><p>' + esc(rt ? K.rule : R.rule) + '</p></details>' +
        (rt ? '<p class="hint small">' + esc(K.listNote) + '</p>' : '') +
        navRow('r-next', R.next) + '</div>';
    },

    offers: function () {
      var O = T.offers, round = curRound(), o = round.offer, card;
      if (o) {
        var p = DB.byCode[o.code];
        card = '<div class="offer-card"><div class="big-emoji" aria-hidden="true">🎉</div><p class="headline">' +
          esc(o.clearing ? T.clearing.success(pname(p), pinst(p)) : O.got(o.slot, pname(p), pinst(p))) + '</p></div>';
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
      var btns = o ? btn('o-others', O.others, { ghost: true }) + btn('o-accept', O.accept + ' →')
        : (!state.clearing ? btn('o-clearing', '🔄 ' + T.clearing.button, { ghost: true }) : '') + btn('o-others', O.toRoutes + ' →');
      return '<div class="panel"><h2>✉️ ' + esc(inRetakeYear() ? T.retake.roundHeading : O.heading) + '</h2>' + card + detail + how +
        '<div class="navrow">' + backBtn() + btns + '</div></div>';
    },

    clearing: function () {
      var K = T.clearing, cl = state.clearing, body;
      if (cl.picked) {
        var p = DB.byCode[cl.picked];
        body = '<div class="offer-card' + (cl.ok ? '' : ' none') + '"><div class="big-emoji" aria-hidden="true">' + (cl.ok ? '🎉' : '🌱') + '</div><p class="headline">' +
          esc(cl.ok ? K.success(pname(p), pinst(p)) : K.fail) + '</p></div>' +
          '<div class="navrow"><span></span>' + btn('o-others', K.toRoutes + ' →') + '</div>';
      } else if (!cl.cands.length) {
        body = '<p class="note">' + esc(K.none) + '</p>' + navRow('o-others', K.toRoutes);
      } else {
        body = '<div class="cands">' + cl.cands.map(function (c) {
          var p = DB.byCode[c.code];
          return '<div class="hit"><span><b>' + esc(c.code) + '</b> ' + esc(pname(p)) + '<span class="small muted"> ' + esc(pinst(p)) + ' · ' + esc(K.yourScore) + ' ' + esc(fmt(c.score)) + '</span></span>' +
            btn('c-pick', K.pick, { small: true, data: { code: c.code } }) + '</div>';
        }).join('') + '</div><p class="hint small">' + esc(K.note) + '</p>' + navRow(null, null);
      }
      return '<div class="panel"><h2>🔄 ' + esc(K.heading) + '</h2><p class="hint">' + esc(K.intro) + '</p>' + body + '</div>';
    },

    routes: function () {
      var R = T.routes, opts = C.routeOptions(curActual(), curRound().offer);
      var cards = opts.map(function (r) {
        var info = T.routeInfo[r.id];
        if (r.id === 'degree' && !r.available) return '';
        var retaken = r.id === 'retake' && !!state.retake, avail = r.available && !retaken;
        var why = retaken ? T.retake.done : (R.why[r.why] || '');
        return '<div class="route' + (avail ? '' : ' off') + '"><div class="rt-head"><span class="rt-icon" aria-hidden="true">' + info.icon + '</span><b>' + esc(info.name) + '</b>' +
          '<span class="pill ' + (avail ? 'p-good' : 'p-unk') + '">' + esc(avail ? R.available : R.unavailable + '：' + why) + '</span></div>' +
          '<p>' + esc(info.summary) + '</p><dl><dt>' + esc(R.entry) + '</dt><dd>' + esc(info.entry) + '</dd><dt>' + esc(R.leadsTo) + '</dt><dd>' + esc(info.leadsTo) + '</dd></dl>' +
          '<div class="rt-foot">' + (info.link ? '<a href="' + esc(info.link) + '" target="_blank" rel="noopener noreferrer">' + esc(R.more) + ' ↗</a>' : '<span></span>') +
          btn('route', R.choose, { small: true, data: { id: r.id }, disabled: !avail }) + '</div></div>';
      }).join('');
      return '<div class="panel"><h2>🧭 ' + esc(R.heading) + '</h2><p class="hint">' + esc(R.hint) + '</p><div class="routes">' + cards + '</div>' +
        '<div class="navrow">' + backBtn() + '<span></span></div></div>';
    },

    retake: function () {
      var K = T.retake, a = state.results.actual, picked = state.retakePick;
      var subs = C.CORES.map(function (k) { return { k: k, lv: a[k] }; }).concat((a.elect || []).map(function (e) { return { k: e.s, lv: e.lv }; }));
      return '<div class="panel"><h2>🔁 ' + esc(K.heading) + '</h2><p class="hint">' + esc(K.intro) + '</p><div class="chips">' +
        subs.map(function (s) {
          var on = picked.indexOf(s.k) >= 0, full = !on && picked.length >= 2;
          return '<button type="button" class="chip' + (on ? ' on' : '') + '" aria-pressed="' + on + '" data-act="rt-sub" data-k="' + s.k + '"' + (full ? ' disabled' : '') + '>' +
            esc(C.SUBJ_ZH[s.k]) + '（' + esc(s.lv) + '）</button>';
        }).join('') + '</div><p class="hint small">' + esc(K.pickMax) + ' ' + esc(K.rule) + '</p>' + navRow(picked.length ? 'rt-go' : null, K.next) + '</div>';
    },

    field: function () {
      var F = T.field, info = T.routeInfo[state.route];
      // medicine is only reached through a JUPAS offer: the field routes (self-financed, sub-degree, VTC, DAE,
      // Mainland, overseas) are modelled without a medical school, so the picker leaves it out
      return '<div class="panel"><h2>' + info.icon + ' ' + esc(info.name) + '</h2><h3 class="sub">' + esc(F.heading) + '</h3><p class="hint">' + esc(F.hint) + '</p><div class="chips">' +
        T.categories.filter(function (c) { return c.key !== 'Medicine'; }).map(function (c) {
          var on = state.field === c.key;
          return '<button type="button" class="chip' + (on ? ' on' : '') + '" aria-pressed="' + on + '" data-act="fld" data-k="' + c.key + '">' + esc(c.zh) + '</button>';
        }).join('') + '</div>' + navRow(state.field ? 'f-go' : null, F.start) + '</div>';
    },

    life: function () {
      var l = state.life, LT = T.life, card = '', code = l.track.code && DB.byCode[l.track.code];
      var study = L.trackKind(l) === 'study';
      var trackTxt = T.tracks[l.track.id] + (code ? '：' + pname(code) + '（' + pinst(code) + '）' : (study && l.track.field ? '（' + catZh(l.track.field) + '）' : ''));
      var sub = study && l.track.yearsLeft > 0 ? LT.yearOf(l.track.year) : l.job ? LT.income + ' ' + money(l.job.monthly) : '';
      var meters = L.METERS.map(function (k) {
        return '<div class="meter"><span class="ml">' + T.meterIcons[k] + ' ' + esc(T.meters[k]) + '</span>' +
          '<span class="bar" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + l.meters[k] + '" aria-label="' + esc(T.meters[k]) + '"><i style="width:' + l.meters[k] + '%"></i></span><b>' + l.meters[k] + '</b></div>';
      }).join('');
      if (lastMsg) {
        card += '<div class="outcome" role="status">' + (lastMsg.text ? '<p>' + esc(lastMsg.text) + '</p>' : '') +
          (lastMsg.deltas.length ? '<p class="deltas"><span class="small muted">' + esc(LT.changed) + '</span>' + lastMsg.deltas.map(function (d) {
            return '<span class="dl ' + (d.d > 0 ? 'up' : 'down') + '">' + T.meterIcons[d.k] + ' ' + esc(T.meters[d.k]) + ' ' + (d.d > 0 ? '+' : '−') + Math.abs(d.d) + '</span>';
          }).join('') + '</p>' : '') + '</div>';
      }
      var p = l.pend;
      if (p.type === 'focus') {
        card += '<h3 class="sub">' + esc(LT.focusHeading(l.age, L.turnYears(l))) + '</h3><div class="focus">' + L.focusOptions(l).map(function (id) {
          var f = T.focus[id];
          return '<button type="button" class="fcard" data-act="focus" data-id="' + id + '"><b>' + esc(f.name) + '</b><span>' + esc(f.desc) + '</span></button>';
        }).join('') + '</div>';
      } else if (p.type === 'event') {
        var ev = T.events[p.id];
        card += '<div class="event"><span class="pill p-mid">' + esc(LT.eventTag) + '</span><h3>' + esc(ev.title) + '</h3><p>' + esc(ev.body) + '</p>' +
          (ev.support ? '<p class="small support">' + esc(LT.support) + '</p>' : '') + '<div class="row wrap">' +
          ev.choices.map(function (c, i) { return btn('evc', c, { ghost: i > 0, data: { i: i } }); }).join('') + '</div></div>';
      } else if (p.type === 'branch') {
        var b = T.branches[p.id];
        card += '<div class="event"><h3>' + esc(b.title) + '</h3>' + (b.note ? '<p class="small">' + esc(b.note) + '</p>' : '') + '<div class="row wrap">' +
          p.options.map(function (o, i) { return btn('branch', b.options[o], { ghost: i > 0, data: { id: o } }); }).join('') + '</div></div>';
      } else {
        card += '<div class="navrow"><span></span>' + btn('to-end', LT.toEnd + ' →') + '</div>';
      }
      var tl = l.log.slice().reverse().map(function (e) {
        return '<li class="' + e.tone + '"><span class="tl-age">' + esc(LT.age(e.age)) + '</span>' + esc(logText(e)) + '</li>';
      }).join('');
      return '<div class="panel lifepanel"><h2 class="lifehead"><span class="age">' + esc(LT.age(l.age)) + '</span><span class="trk">' + esc(trackTxt) +
        (sub ? '<span class="small muted"> · ' + esc(sub) + '</span>' : '') + '</span></h2><div class="meters">' + meters + '</div>' + card +
        (backTarget() ? '<div class="navrow">' + backBtn() + '<span></span></div>' : '') +
        '<details class="explain timeline" open><summary>' + esc(LT.timeline) + '</summary><ol class="tl">' + tl + '</ol></details></div>';
    },

    end: function () {
      var X = T.end, LE = T.lifeEnd, res = state.results, ro = curRound() && curRound().offer, l = state.life;
      var predTxt = res.changes.map(function (c) { return shortSubj(c.key) + ' ' + c.from; }).join('、');
      var act = curActual();
      var actList = res.changes.map(function (c) {
        var lv = C.CORES.indexOf(c.key) >= 0 ? act[c.key] : ((act.elect || []).filter(function (e) { return e.s === c.key; })[0] || {}).lv;
        return shortSubj(c.key) + ' ' + lv;
      }).join('、');
      var offerTxt = ro ? ro.slot + '　' + pname(DB.byCode[ro.code]) + '（' + pinst(DB.byCode[ro.code]) + '）' : X.noOffer;
      var r = T.routeInfo[state.route] || { icon: '', name: '' };
      var ch1 = '<dl class="summary"><dt>' + esc(X.predicted) + '</dt><dd>' + esc(predTxt) + '</dd><dt>' + esc(X.actual) + '</dt><dd>' + esc(actList) + (state.retake ? esc(T.retake.after) : '') + '</dd>' +
        '<dt>' + esc(X.offer) + '</dt><dd>' + esc(offerTxt) + '</dd><dt>' + esc(X.path) + '</dt><dd>' + r.icon + ' ' + esc(r.name) + '</dd></dl>';
      var body;
      if (l) {
        var status = l.job ? T.tracks.work + '（' + LE.monthly + ' ' + money(l.job.monthly) + '）' : T.tracks[l.track.id] + (l.track.field ? '（' + catZh(l.track.field) + '）' : '');
        var meters = L.METERS.map(function (k) { return '<span class="mchip">' + T.meterIcons[k] + ' ' + esc(T.meters[k]) + ' <b>' + l.meters[k] + '</b></span>'; }).join('');
        var choices = l.decisions.filter(function (d) { return d.key !== 'focus'; }).map(function (d) {
          return '<li><span class="tl-age">' + esc(T.life.age(d.age)) + '</span>' + esc(decisionText(d)) + '</li>';
        }).join('');
        var focusCount = {};
        l.decisions.forEach(function (d) { if (d.key === 'focus') focusCount[d.data.id] = (focusCount[d.data.id] || 0) + 1; });
        var topFocus = Object.keys(focusCount).sort(function (a, b) { return focusCount[b] - focusCount[a]; }).slice(0, 2)
          .map(function (id) { return T.focus[id].name + '（' + LE.times(focusCount[id]) + '）'; }).join('、');
        body = '<h2>🌟 ' + esc(LE.heading(l.age)) + '</h2><dl class="summary"><dt>' + esc(LE.status) + '</dt><dd>' + esc(status) + '</dd>' +
          '<dt>' + esc(LE.cred) + '</dt><dd>' + esc(T.creds[L.topCred(l)]) + '</dd>' +
          (topFocus ? '<dt>' + esc(LE.topFocus) + '</dt><dd>' + esc(topFocus) + '</dd>' : '') + '</dl>' +
          '<p class="small muted">' + esc(LE.compare(l.age)) + '</p><h3 class="sub">' + esc(LE.meters) + '</h3><div class="mchips">' + meters + '</div>' +
          (choices ? '<h3 class="sub">' + esc(LE.keyChoices) + '</h3><ol class="tl">' + choices + '</ol>' : '') +
          '<p class="note">' + esc(LE.reflect) + '</p>' +
          '<details class="explain"><summary>' + esc(LE.chapter1) + '</summary>' + ch1 + '</details>' +
          '<details class="explain timeline"><summary>' + esc(T.life.timeline) + '</summary><ol class="tl">' +
          l.log.map(function (e) { return '<li class="' + e.tone + '"><span class="tl-age">' + esc(T.life.age(e.age)) + '</span>' + esc(logText(e)) + '</li>'; }).join('') + '</ol></details>';
      } else {
        body = '<h2>📘 ' + esc(X.heading) + '</h2>' + ch1;
      }
      return '<div class="panel endcard">' + body + dataPage() +
        '<div class="row wrap">' + btn('e-again', '🎲 ' + X.again) + btn('e-edit', X.edit, { ghost: true }) + btn('restart', X.restart, { ghost: true }) + '</div>' +
        '<p class="real">' + esc(X.real) + X.realLinks.map(function (k) { return '<a href="' + k.href + '">' + esc(k.label) + '</a>'; }).join(' · ') + '</p>' +
        '<p class="hint">' + esc(X.teacher) + '</p><p class="small muted">' + esc(X.runCode) + '：' + esc(state.seed) + '</p></div>';
    }
  };

  /* ---------- text for the life log + key decisions ---------- */
  function logText(e) {
    var G = T.logs, d = e.data || {};
    if (e.key === 'start') {
      if (d.route === 'degree' && d.code && DB.byCode[d.code]) return G.startDegree(pname(DB.byCode[d.code]), pinst(DB.byCode[d.code]), d.years);
      if (d.route === 'work') return G.startWork;
      return G.startTrack(T.tracks[d.route] || '', catZh(d.field));
    }
    if (e.key === 'graduated') return G.graduated(T.creds[d.cred]);
    if (e.key === 'gotJob') return G.gotJob(d.level === 'degree' || d.level === 'masters' || d.level === 'subdegree' ? catZh(d.field) : '', d.monthly);
    if (e.key === 'event') return evTitle(d.id) + '：' + T.events[d.id].results[d.choice];
    if (e.key === 'partTimeDone') return G.partTimeDone(T.creds[d.level]);
    return typeof G[e.key] === 'string' ? G[e.key] : '';
  }
  function evTitle(id) { return T.events[id].title.replace(/？$/, ''); }      // "進修碩士？" → "進修碩士：…"
  function decisionText(d) {
    if (d.key === 'route') return T.life.chose + (T.routeInfo[d.data.route] || {}).name;
    if (d.key === 'branch') { var b = T.branches[d.data.id]; return b.short + '：' + b.options[d.data.opt]; }
    if (d.key === 'event') return evTitle(d.data.id) + '：' + T.events[d.data.id].choices[d.data.choice];
    return '';
  }
  function dataPage() {
    var D = T.data, K = D.cite;
    var cited = [
      [K.dse(ST.hkeaa332A), ST.hkeaa332A], [K.ugc(ST.ugcUndergradAnnualK), ST.ugcUndergradAnnualK],
      [K.edu(ST.csdByEducation, money), ST.csdByEducation], [K.age(ST.csdByAge, money), ST.csdByAge], [K.senior(ST.seniorYearPlaces), ST.seniorYearPlaces]
    ].map(function (c) {
      return '<li>' + esc(c[0]) + '<br><span class="small muted">' + esc(c[1].source) + ' · <a href="' + esc(c[1].url) + '" target="_blank" rel="noopener noreferrer">' + esc(D.source) + ' ↗</a></span></li>';
    }).join('');
    return '<details class="explain datapage"><summary>📊 ' + esc(D.title) + '</summary><h4>' + esc(D.cited) + '</h4><ul>' + cited +
      '<li>' + esc(K.jupas) + '</li></ul><h4>' + esc(D.illustrative) + '</h4><ul>' +
      D.assumptions.map(function (a) { return '<li>' + esc(a) + '</li>'; }).join('') + '</ul></details>';
  }

  /* ---------- the JUPAS list (search + 20 slots) ---------- */
  function renderList() {
    var L2 = T.list, pc = predClean();
    $('slots').innerHTML = state.list.length ? state.list.map(function (code, i) {
      var p = DB.byCode[code], tag = C.slotTagFor(code, i, pc, DB);
      var tagTxt = tag === 'good' ? L2.tagGood : tag === 'mid' ? L2.tagMid : L2.tagBad;
      return '<li class="slot"><span class="chipband b' + C.bandOfSlot(i) + '">' + esc(C.slotLabel(i)) + '</span>' +
        '<span class="sname">' + (p ? esc(pname(p)) + '<span class="small muted"> ' + esc(pinst(p)) + ' · ' + esc(code) + '</span>' : esc(code)) + '</span>' +
        '<span class="pill p-' + tag + '">' + esc(tagTxt) + '</span>' +
        '<span class="ops"><button type="button" data-act="l-up" data-i="' + i + '" aria-label="上移"' + (i === 0 ? ' disabled' : '') + '>▲</button>' +
        '<button type="button" data-act="l-down" data-i="' + i + '" aria-label="下移"' + (i === state.list.length - 1 ? ' disabled' : '') + '>▼</button>' +
        '<button type="button" data-act="l-del" data-i="' + i + '" aria-label="移除">✕</button></span></li>';
    }).join('') : '<li class="empty">' + esc(L2.empty) + '</li>';
    $('l-nav').innerHTML = navRow('l-next', state.list.length ? L2.next : L2.nextEmpty);
    renderSearch();
  }
  function renderSearch() {
    var L2 = T.list, box = $('l-res'), q = ($('l-q').value || '').trim().toLowerCase();
    if (!q) { box.innerHTML = ''; return; }
    var hits = DB.list.filter(function (p) {
      return [p.jupas_code, p.name_zh, p.name_en, p.institution_zh, p.institution].some(function (f) { return String(f || '').toLowerCase().indexOf(q) >= 0; });
    }).slice(0, 8);
    var full = state.list.length >= 20;
    box.innerHTML = hits.length ? hits.map(function (p) {
      var inList = state.list.indexOf(p.jupas_code) >= 0;
      return '<div class="hit"><span><b>' + esc(p.jupas_code) + '</b> ' + esc(pname(p)) + '<span class="small muted"> ' + esc(pinst(p)) + '</span></span>' +
        '<button type="button" class="btn small" data-act="l-add" data-code="' + esc(p.jupas_code) + '"' + (inList || full ? ' disabled' : '') + '>' +
        (inList ? '✓' : full ? esc(L2.full) : '＋') + '</button></div>';
    }).join('') : '<div class="hit muted">' + esc(L2.noResult) + '</div>';
  }
  function listMsg(txt) { var m = $('l-msg'); if (!m) return; m.textContent = txt || ''; m.hidden = !txt; }

  /* ---------- the life (chapter 2) ---------- */
  function startLife() {
    var o = curRound() && curRound().offer, prog = state.route === 'degree' && o ? DB.byCode[o.code] : null;
    var field = prog ? (prog.categories && prog.categories[0]) || 'Business' : state.field || state.cats[0] || 'Business';
    state.lifeFrom = state.step;
    state.life = L.start({ seed: state.seed, mode: state.mode, route: state.route, field: field,
      offer: o, prog: prog, actual: curActual(), startAge: state.retake ? 19 : 18 });
    lastMsg = null; go('life');
  }
  // run one life choice, then show what it led to: the new timeline lines and how the five meters moved
  function lifeAfter(fn, intro) {
    var l = state.life, before = l.log.length, m0 = {};
    L.METERS.forEach(function (k) { m0[k] = l.meters[k]; });
    fn();
    var text = (intro ? [intro] : []).concat(l.log.slice(before).map(logText)).filter(Boolean).join(' ');
    var deltas = L.METERS.map(function (k) { return { k: k, d: l.meters[k] - m0[k] }; }).filter(function (x) { return x.d; });
    lastMsg = { text: text, deltas: deltas };
    if (l.pend.type === 'end') saveRun();
    save(); render();
    var top = $('screen').getBoundingClientRect().top;
    if (top < 0) window.scrollTo(0, window.pageYOffset + top - 8);
    // the clicked button was redrawn: put keyboard focus on what happened, just above the next choices
    var out = $('screen').querySelector('.outcome');
    if (out) { out.setAttribute('tabindex', '-1'); try { out.focus({ preventScroll: true }); } catch (e) {} }
  }

  /* ---------- actions ---------- */
  var ACT = {
    mode: function (b) { state.mode = b.getAttribute('data-v') === 'long' ? 'long' : 'short'; render(); },
    start: function () { state = blank(state && state.mode); resumeStep = null; go('grades'); },
    resume: function () { var s = resumeStep; resumeStep = null; go(s); },
    restart: function () { state = blank(state && state.mode); resumeStep = null; lastMsg = null; go('intro'); },
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
      state.round = null; state.clearing = null; state.retake = null; state.retakePick = [];
      state.route = null; state.field = null; state.life = null; state.lifeFrom = null; lastMsg = null;
      go('results');
    },
    'r-next': function () {
      var round = C.mainRound(state.list, curActual(), DB, state.seed, roundOpts());
      var r = { offer: round.offer ? { i: round.offer.i, code: round.offer.code, slot: round.offer.slot } : null, rows: round.rows };
      if (inRetakeYear()) state.retake.round = r; else state.round = r;
      state.clearing = null;
      go('offers');
    },
    'o-clearing': function () {
      var exclude = curRound().rows.filter(function (r) { return r.status === 'offer'; }).map(function (r) { return r.code; });
      state.clearing = { cands: C.clearingCandidates(curActual(), DB, state.seed, roundOpts(), exclude), picked: null, ok: null };
      go('clearing');
    },
    'c-pick': function (b) {
      if (state.clearing.picked) return;
      var code = b.getAttribute('data-code'), ok = C.clearingResult(code, state.seed, roundOpts());
      state.clearing.picked = code; state.clearing.ok = ok;
      if (ok) curRound().offer = { code: code, slot: '補選', clearing: true };
      save(); render();
    },
    'o-accept': function () { state.route = 'degree'; startLife(); },
    'o-others': function () { go('routes'); },
    route: function (b) {
      var id = b.getAttribute('data-id');
      state.route = id;
      if (id === 'degree' || id === 'work') { state.field = null; return startLife(); }
      if (id === 'retake') { state.retakePick = []; return go('retake'); }
      state.field = state.cats.filter(function (k) { return k !== 'Medicine'; })[0] || null;
      go('field');
    },
    'rt-sub': function (b) {
      var k = b.getAttribute('data-k'), p = state.retakePick, i = p.indexOf(k);
      if (i >= 0) p.splice(i, 1); else if (p.length < 2) p.push(k);
      save(); render();
    },
    'rt-go': function () {
      state.retake = { subjects: state.retakePick.slice(), results: C.retakeResults(state.results.actual, state.retakePick, state.seed), round: null };
      state.clearing = null; go('results');
    },
    fld: function (b) { state.field = b.getAttribute('data-k'); save(); render(); },
    'f-go': function () { startLife(); },
    focus: function (b) {
      var id = b.getAttribute('data-id'), n = L.turnYears(state.life);
      lifeAfter(function () { L.chooseFocus(state.life, id); }, T.life.focusDone(T.focus[id].name, n));
    },
    evc: function (b) { lifeAfter(function () { L.chooseEvent(state.life, +b.getAttribute('data-i')); }); },
    branch: function (b) { lifeAfter(function () { L.chooseBranch(state.life, b.getAttribute('data-id')); }); },
    'to-end': function () { lastMsg = null; go('end'); },
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
    resumeStep = saved && saved.step && saved.step !== 'intro' && SCREENS[saved.step] ? saved.step : null;
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
    db: function () { return DB; }, core: C, life: L
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
