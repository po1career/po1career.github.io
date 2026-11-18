/* ============================================================================
   DSE 人生模擬器 — screens + passcode gate (繁中 only).
   Chapter 1: grades → interests → JUPAS list → results day → August offer (→ Clearing Round) → route.
   Chapter 2: retake year · field of study · the years after August (focus, events, transitions) → life summary.
   Phase 3: class mode (a shared class code = the same luck for everyone), reflection prompts, "what if" (the same
   luck with one decision changed, side by side), a share image drawn on a canvas, the last runs on this device.
   Fun pack: a character + dream screen, quick-start students, 估一估 guesses before each reveal, results revealed
   subject by subject, the JUPAS choices scanned in order, a character walking along the road through the years,
   animated meters, light confetti (none with "reduce motion"), and an end title (life-paths-fun.js).
   Gate = the Finder/Planner contract: PBKDF2-SHA256 150k + AES-GCM decrypt of
   jupas-finder-db.enc.json with the student passcode, remembered in LS jupas_pass.
   Simulation: life-paths-core.js (DSE → August) + life-paths-life.js (after August); text: life-paths-content.js;
   cited figures: life-paths-stats.js. Nothing leaves the browser: game state stays in this device's localStorage,
   the class code only seeds the luck, and the share image is made on the device (no upload, no social-media code).
   ========================================================================== */
(function () {
  'use strict';
  var C = window.LifePathsCore, L = window.LifePathsLife, ST = window.LifePathsStats, T = window.LifePathsText, F = window.LifePathsFun;
  var PBKDF2_ITER = 150000, LS_PASS = 'jupas_pass', ENC_URL = 'jupas-finder-db.enc.json';
  var LS_STATE = 'life_paths_state', LS_RUNS = 'life_paths_runs', LS_BIG = 'life_paths_big';
  var LEVELS = ['5**', '5*', '5', '4', '3', '2', '1', 'U'];
  var DB = null, encBlob = null, state = null, resumeStep = null, lastMsg = null;
  var codeDraft = null, shareURL = null;           // the class code being typed on the intro; the last share image {url, w, h}
  var flips = {}, anim = null, confettiNext = false, scanTimer = null;   // results tiles turned over; a life turn to animate

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
  function blank(mode, classCode) {
    return { v: 1, seed: classCode ? classSeed(classCode) : C.newSeed(), classCode: classCode || null, step: 'me',
      mode: mode || 'short', me: { avatar: F.AVATAR_IDS[0], dream: null, dreamCat: null }, pred: blankPred(), cats: [], list: [],
      guesses: {}, revealed: {}, results: null, round: null, clearing: null, retake: null,
      retakePick: [], route: null, field: null, life: null, lifeFrom: null, whatIf: null };
  }
  // class mode: the class code IS the run seed, so everyone typing the same code gets the same luck everywhere
  var CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';     // no 0/O, 1/I/L — easy to read off a projector
  function normCode(s) { return String(s || '').toUpperCase().replace(/\s+/g, ''); }
  function validCode(s) { return /^[A-Z0-9]{2,12}$/.test(s); }
  function classSeed(code) { return 'class-' + code; }
  function genCode() {
    var a = new Uint8Array(6), out = '';
    crypto.getRandomValues(a);
    for (var i = 0; i < a.length; i++) out += CODE_CHARS[a[i] % CODE_CHARS.length];
    return out;
  }
  // a new game keeps the player's character and dream (and the dream's field as an interest)
  function keepMe(old, s) {
    var me = old && old.me;
    if (me && me.avatar) {
      var cat = me.dream && F.DREAMS[me.dream] && F.DREAMS[me.dream].cat;
      s.me = { avatar: me.avatar, dream: me.dream || null, dreamCat: cat || null };
      if (cat) s.cats = [cat];
    }
    return s;
  }
  function isBig() { try { return localStorage.getItem(LS_BIG) === '1'; } catch (e) { return false; } }
  function setBig(on) {
    document.documentElement.classList.toggle('big', !!on);
    try { localStorage.setItem(LS_BIG, on ? '1' : '0'); } catch (e) {}
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
      if (s && s.v === 1 && s.pred) {
        if (!s.mode) s.mode = 'short'; if (!s.retakePick) s.retakePick = [];
        // saves from before the fun pack: a default character, no guesses, and anything already seen stays revealed
        if (!s.me) s.me = { avatar: F.AVATAR_IDS[0], dream: null, dreamCat: null };
        if (!s.guesses) s.guesses = {};
        if (!s.revealed) s.revealed = { results: true, offers: true, results2: true, offers2: true };
        return s;
      }
    } catch (e) {}
    return null;
  }
  function saveRun() {
    try {
      var runs = JSON.parse(localStorage.getItem(LS_RUNS) || '[]'), o = curRound() && curRound().offer, l = state.life;
      runs.unshift({ at: new Date().toISOString().slice(0, 10), seed: state.seed, cls: state.classCode || null, mode: l ? l.mode : state.mode,
        offer: o ? o.slot + ' ' + o.code : null, route: state.route, age: l ? l.age : null, cred: l ? L.topCred(l) : null,
        monthly: l && l.job ? l.job.monthly : null });
      localStorage.setItem(LS_RUNS, JSON.stringify(runs.slice(0, 5)));
    } catch (e) {}
  }

  /* ---------- navigation ---------- */
  var STEP_IDX = { me: 0, grades: 1, interests: 2, list: 3, results: 4, offers: 5, clearing: 5, routes: 6, retake: 6, field: 6, life: 7, end: 8 };
  var BACK = { grades: 'me', interests: 'grades', list: 'interests', results: 'list', offers: 'results', clearing: 'offers', routes: 'offers', retake: 'routes', field: 'routes' };
  // a new screen: back to the top, and keyboard / screen-reader focus to its heading
  function go(step) {
    if (step !== 'end') shareURL = null;
    if (step !== state.step) { flips = {}; clearTimeout(scanTimer); }
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
    $('screen').innerHTML = (state.classCode && state.step !== 'intro' ? classPill() : '') + s();
    if (state.step === 'list') renderList();
    afterRender();
  }
  function classPill() { return '<p class="classpill">👥 ' + esc(T.classMode.pill(state.classCode)) + '</p>'; }
  function backBtn() { return backTarget() ? btn('back', '← ' + T.common.back, { ghost: true }) : '<span></span>'; }
  function navRow(nextAct, nextLabel, extra) {
    return '<div class="navrow">' + backBtn() + (extra || '') + (nextAct ? btn(nextAct, nextLabel + ' →') : '') + '</div>';
  }

  /* ---------- screens ---------- */
  var SCREENS = {
    intro: function () {
      var M = T.modes, K = T.classMode, how = '<div class="panel">' + art() + '<h2>' + esc(T.intro.how) + '</h2><ol class="how">' +
        T.howItWorks.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol><p class="note">' + esc(T.phase1Note) + '</p>';
      var big = '<label class="toggle"><input type="checkbox" id="big-text"' + (isBig() ? ' checked' : '') + '> ' + esc(K.big) + '</label>';
      if (resumeStep) {
        return how + (state.classCode ? classPill() : '') + big +
          '<div class="navrow">' + btn('restart', T.intro.restart, { ghost: true }) + btn('resume', T.intro.resume + ' →') + '</div></div>';
      }
      var modes = ['short', 'long'].map(function (m) {
        var on = state.mode === m;
        return '<button type="button" class="mode' + (on ? ' on' : '') + '" aria-pressed="' + on + '" data-act="mode" data-v="' + m + '"><b>' + esc(M[m].name) + '</b><span>' + esc(M[m].desc) + '</span></button>';
      }).join('');
      var code = codeDraft != null ? codeDraft : state.classCode || '';
      var cls = '<h3 class="sub">👥 ' + esc(K.heading) + '</h3><p class="hint">' + esc(K.hint) + '</p>' +
        '<div class="row wrapping classrow"><input type="text" id="class-code" maxlength="12" autocomplete="off" autocapitalize="characters" spellcheck="false"' +
        ' aria-label="' + esc(K.label) + '" placeholder="' + esc(K.ph) + '" value="' + esc(code) + '">' + btn('class-gen', K.generate, { ghost: true }) + '</div>' +
        '<div id="class-err" class="err" role="alert"></div>' + big;
      return how + '<h3 class="sub">' + esc(M.heading) + '</h3><div class="modes" role="group" aria-label="' + esc(M.heading) + '">' + modes + '</div>' + cls +
        '<div class="navrow"><span></span>' + btn('start', T.intro.start + ' →') + '</div></div>';
    },

    me: function () {
      var M = T.me, me = state.me;
      var avs = F.AVATAR_IDS.map(function (id) {
        var on = me.avatar === id;
        return '<button type="button" class="avpick' + (on ? ' on' : '') + '" aria-pressed="' + on + '" data-act="av" data-id="' + id + '">' +
          F.avatarSVG(id, 56) + '<span>' + esc(T.avatars[id]) + '</span></button>';
      }).join('');
      var drs = F.DREAM_IDS.map(function (id) {
        var on = me.dream === id, d = T.dreams[id];
        return '<button type="button" class="drpick' + (on ? ' on' : '') + '" aria-pressed="' + on + '" data-act="dr" data-id="' + id + '">' +
          '<span class="dr-icon" aria-hidden="true">' + F.DREAMS[id].icon + '</span><b>' + esc(d.name) + '</b><span>' + esc(d.desc) + '</span></button>';
      }).join('') + '<button type="button" class="drpick' + (me.dream ? '' : ' on') + '" aria-pressed="' + !me.dream + '" data-act="dr" data-id="">' +
        '<span class="dr-icon" aria-hidden="true">🤔</span><b>' + esc(M.noDream) + '</b></button>';
      return '<div class="panel"><h2>' + esc(M.heading) + '</h2><h3 class="sub">' + esc(M.avatar) + '</h3><p class="hint">' + esc(M.avatarHint) + '</p>' +
        '<div class="avgrid" role="group" aria-label="' + esc(M.avatar) + '">' + avs + '</div>' +
        '<h3 class="sub">' + esc(M.dream) + '</h3><p class="hint">' + esc(M.dreamHint) + '</p>' +
        '<div class="drgrid" role="group" aria-label="' + esc(M.dream) + '">' + drs + '</div>' + navRow('me-next', M.next) + '</div>';
    },

    grades: function () {
      var p = state.pred, G = T.grades, Q = T.quick;
      var quick = '<div class="quick"><h3 class="sub">' + esc(Q.heading) + '</h3><p class="hint">' + esc(Q.hint) + '</p><div class="row wrapping">' +
        F.SAMPLE_IDS.map(function (id) { return btn('sample', Q.samples[id], { ghost: true, small: true, data: { id: id } }); }).join('') +
        btn('sample', Q.random, { small: true, data: { id: 'random' } }) + '</div></div><p class="hint small">' + esc(Q.or) + '</p>';
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
      return '<div class="panel"><h2>' + esc(G.heading) + '</h2>' + quick + '<p class="hint">' + esc(G.hint) + '</p>' +
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
      var R = T.results, K = T.retake, G = T.guess, rt = inRetakeYear(), res = rt ? state.retake.results : state.results;
      var shown = !!state.revealed[rt ? 'results2' : 'results'], up = 0, down = 0, same = 0, rows, th, tally;
      var head = '<div class="panel"><h2>📮 ' + esc(rt ? K.resultsHeading : R.heading) + '</h2><p class="hint">' + esc(rt ? K.resultsIntro : R.intro) + '</p>';
      // 估一估 before the envelope opens (first sitting): how many subjects will match the prediction?
      if (!rt && !shown && state.guesses.match == null) {
        var opts = '';
        for (var k = 0; k <= res.changes.length; k++) opts += btn('guess-match', String(k), { ghost: true, small: true, data: { v: k } });
        return head + guessBox(G.match(res.changes.length), opts + btn('guess-match', G.skip, { ghost: true, small: true, data: { v: -1 } })) +
          '<div class="navrow">' + backBtn() + '<span></span></div></div>';
      }
      // every result starts face down: a tap turns one over, 全部揭曉 turns them all
      function open(i) { return shown || !!flips[i]; }
      function face(i, val) {
        if (open(i)) return '<span class="' + (!shown && i === flips.last ? 'pop' : '') + '">' + esc(val) + '</span>';
        return '<button type="button" class="tile" data-act="flip" data-i="' + i + '" aria-label="' + esc(T.reveal.all) + '">' + esc(T.reveal.hidden) + '</button>';
      }
      if (rt) {
        rows = res.changes.map(function (c, i) {
          if (c.diff > 0) up++;
          return '<tr class="' + (open(i) ? (c.diff > 0 ? 'up' : 'same') : '') + '"><td>' + esc(C.SUBJ_ZH[c.key]) + '</td><td>' + esc(c.from) + '</td><td>' + (open(i) ? esc(c.sat) : '—') + '</td>' +
            '<td class="big">' + face(i, c.to) + (open(i) ? ' <span class="mk">' + esc(c.diff > 0 ? '▲ ' + K.up : '＝ ' + K.same) + '</span>' : '') + '</td></tr>';
        }).join('');
        th = K.th; tally = K.tally(res.changes.length, up);
      } else {
        rows = res.changes.map(function (c, i) {
          if (c.diff > 0) up++; else if (c.diff < 0) down++; else same++;
          var mark = c.diff > 0 ? '▲ ' + R.up : c.diff < 0 ? '▼ ' + R.down : '＝ ' + R.same;
          return '<tr class="' + (open(i) ? (c.diff > 0 ? 'up' : c.diff < 0 ? 'down' : 'same') : '') + '"><td>' + esc(C.SUBJ_ZH[c.key]) + '</td><td>' + esc(c.from) + '</td>' +
            '<td class="big">' + face(i, c.to) + '</td><td class="mk">' + (open(i) ? esc(mark) : '') + '</td></tr>';
        }).join('');
        var csdTxt = res.actual.csd === 'attained' ? T.grades.csdAttained : T.grades.csdNot;
        rows += '<tr class="same"><td>' + esc(C.SUBJ_ZH.csd) + '</td><td>' + esc(csdTxt) + '</td><td class="big">' + esc(csdTxt) + '</td><td class="mk">＝ ' + esc(R.same) + '</td></tr>';
        th = R.th; tally = same + ' 科與預計相同 · ' + down + ' 科較預計低 · ' + up + ' 科較預計高';
      }
      var table = '<div class="tablewrap"><table class="rtable"><thead><tr>' + th.map(function (h) { return '<th>' + esc(h) + '</th>'; }).join('') + '</tr></thead><tbody>' + rows + '</tbody></table></div>';
      if (!shown) {
        return head + '<p class="note envelope">' + esc(T.reveal.envelope) + '</p>' + table +
          '<div class="navrow">' + backBtn() + btn('reveal-all', T.reveal.all + ' →') + '</div></div>';
      }
      var met = C.meets332A(res.actual);
      return head + table + '<p class="tally">' + esc(tally) + '</p>' + (rt ? '' : guessResult('match')) +
        '<div class="callout ' + (met ? 'ok' : 'warn') + '">' + esc(met ? R.met332A : R.not332A) + '<br><span class="small">' + esc(R.stat332A) + '</span></div>' +
        reflectBox('results') +
        '<details class="explain"><summary>' + esc(R.ruleTitle) + '</summary><p>' + esc(rt ? K.rule : R.rule) + '</p></details>' +
        (rt ? '<p class="hint small">' + esc(K.listNote) + '</p>' : '') +
        navRow('r-next', R.next) + '</div>';
    },

    offers: function () {
      var O = T.offers, G = T.guess, round = curRound(), o = round.offer, card, rt = inRetakeYear();
      var h2 = '<h2>✉️ ' + esc(rt ? T.retake.roundHeading : O.heading) + '</h2>';
      if (!state.revealed[rt ? 'offers2' : 'offers'] && round.rows.length) {
        if (!rt && state.guesses.band == null) {
          return '<div class="panel">' + h2 + guessBox(G.band, G.bands.map(function (b, k) { return btn('guess-band', b, { ghost: true, small: true, data: { v: k } }); }).join('') +
            btn('guess-band', G.skip, { ghost: true, small: true, data: { v: -1 } })) + '<div class="navrow">' + backBtn() + '<span></span></div></div>';
        }
        // the scan: JUPAS looks at the choices in order and gives the first one whose line is cleared
        return '<div class="panel">' + h2 + '<p class="hint">' + esc(T.reveal.scan) + '</p><ol class="scan">' + round.rows.map(function (r) {
          var p = DB.byCode[r.code];
          return '<li class="scanrow"><span class="chipband b' + C.bandOfSlot(r.i) + '">' + esc(C.slotLabel(r.i)) + '</span>' +
            '<span class="sname">' + (p ? esc(pname(p)) : esc(r.code)) + '</span><span class="scan-st"></span></li>';
        }).join('') + '</ol><div class="navrow"><span></span>' + btn('scan-skip', T.reveal.skip, { ghost: true }) + '</div></div>';
      }
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
      return '<div class="panel">' + h2 + card + (rt ? '' : guessResult('band')) + detail + how +
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
        var dl = lastMsg && lastMsg.deltas.filter(function (x) { return x.k === k; })[0];
        return '<div class="meter"><span class="ml">' + T.meterIcons[k] + ' ' + esc(T.meters[k]) + '</span>' +
          '<span class="bar" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + l.meters[k] + '" aria-label="' + esc(T.meters[k]) + '"><i style="width:' + l.meters[k] + '%"></i></span><b>' + l.meters[k] + '</b>' +
          (dl ? '<em class="float ' + (dl.d > 0 ? 'up' : 'down') + '" aria-hidden="true">' + (dl.d > 0 ? '+' : '−') + Math.abs(dl.d) + '</em>' : '') + '</div>';
      }).join('');
      if (lastMsg) {
        card += '<div class="outcome" role="status">' + (lastMsg.text ? '<p>' + esc(lastMsg.text) + '</p>' : '') +
          (lastMsg.deltas.length ? '<p class="deltas"><span class="small muted">' + esc(LT.changed) + '</span>' + lastMsg.deltas.map(function (d) {
            return '<span class="dl ' + (d.d > 0 ? 'up' : 'down') + '">' + T.meterIcons[d.k] + ' ' + esc(T.meters[d.k]) + ' ' + (d.d > 0 ? '+' : '−') + Math.abs(d.d) + '</span>';
          }).join('') + '</p>' : '') + '</div>' + (lastMsg.reflect ? reflectBox(lastMsg.reflect) : '');
      }
      var p = l.pend, G = T.guess;
      // 估一估 at the start of the life (it does not block the first choice)
      if (state.guesses.pay == null && l.decisions.length <= 1 && p.type !== 'end') {
        card += guessBox(G.pay(l.endAge), G.payBands.map(function (t, k) { return btn('guess-pay', t, { ghost: true, small: true, data: { v: k } }); }).join('') +
          btn('guess-pay', G.skip, { ghost: true, small: true, data: { v: -1 } }));
      }
      if (p.type === 'focus') {
        card += '<h3 class="sub">' + esc(LT.focusHeading(l.age, L.turnYears(l))) + '</h3><div class="focus">' + L.focusOptions(l).map(function (id) {
          var f = T.focus[id];
          return '<button type="button" class="fcard" data-act="focus" data-id="' + id + '"><b>' + esc(f.name) + '</b><span>' + esc(f.desc) + '</span></button>';
        }).join('') + '</div>';
      } else if (p.type === 'event') {
        var ev = T.events[p.id];
        card += '<div class="event"><span class="pill p-mid">' + esc(LT.eventTag) + '</span><h3>' + esc(ev.title) + '</h3><p>' + esc(ev.body) + '</p>' +
          (ev.support ? '<p class="small support">' + esc(LT.support) + '</p>' : '') + '<div class="row wrapping">' +
          ev.choices.map(function (c, i) { return btn('evc', c, { ghost: i > 0, data: { i: i } }); }).join('') + '</div></div>';
      } else if (p.type === 'branch') {
        var b = T.branches[p.id];
        card += '<div class="event"><h3>' + esc(b.title) + '</h3>' + (b.note ? '<p class="small">' + esc(b.note) + '</p>' : '') + '<div class="row wrapping">' +
          p.options.map(function (o, i) { return btn('branch', b.options[o], { ghost: i > 0, data: { id: o } }); }).join('') + '</div></div>';
      } else {
        card += '<div class="navrow"><span></span>' + btn('to-end', LT.toEnd + ' →') + '</div>';
      }
      var tl = l.log.slice().reverse().map(function (e) {
        return '<li class="' + e.tone + '"><span class="tl-age">' + esc(LT.age(e.age)) + '</span>' + esc(logText(e)) + '</li>';
      }).join('');
      return '<div class="panel lifepanel"><h2 class="lifehead"><span class="age">' + esc(LT.age(l.age)) + '</span><span class="trk">' + esc(trackTxt) +
        (sub ? '<span class="small muted"> · ' + esc(sub) + '</span>' : '') + '</span></h2>' + walkStrip(l) + '<div class="meters">' + meters + '</div>' + card +
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
        var status = lifeStatus(l);
        var meters = L.METERS.map(function (k) { return '<span class="mchip">' + T.meterIcons[k] + ' ' + esc(T.meters[k]) + ' <b>' + l.meters[k] + '</b></span>'; }).join('');
        var choices = l.decisions.filter(function (d) { return d.key !== 'focus'; }).map(function (d) {
          return '<li><span class="tl-age">' + esc(T.life.age(d.age)) + '</span>' + esc(decisionText(d)) + '</li>';
        }).join('');
        var focusCount = {};
        l.decisions.forEach(function (d) { if (d.key === 'focus') focusCount[d.data.id] = (focusCount[d.data.id] || 0) + 1; });
        var topFocus = Object.keys(focusCount).sort(function (a, b) { return focusCount[b] - focusCount[a]; }).slice(0, 2)
          .map(function (id) { return T.focus[id].name + '（' + LE.times(focusCount[id]) + '）'; }).join('、');
        body = art() + '<h2>🌟 ' + esc(LE.heading(l.age)) + '</h2>' + titleCard(l) + dreamCard(l) +
          '<dl class="summary"><dt>' + esc(LE.status) + '</dt><dd>' + esc(status) + '</dd>' +
          '<dt>' + esc(LE.cred) + '</dt><dd>' + esc(T.creds[L.topCred(l)]) + '</dd>' +
          (topFocus ? '<dt>' + esc(LE.topFocus) + '</dt><dd>' + esc(topFocus) + '</dd>' : '') + '</dl>' +
          '<p class="small muted">' + esc(LE.compare(l.age)) + '</p><h3 class="sub">' + esc(LE.meters) + '</h3><div class="mchips">' + meters + '</div>' +
          (choices ? '<h3 class="sub">' + esc(LE.keyChoices) + '</h3><ol class="tl">' + choices + '</ol>' : '') +
          guessSummary() + reflectBox('end') + whatIfSection() + shareSection() +
          '<details class="explain"><summary>' + esc(LE.chapter1) + '</summary>' + ch1 + '</details>' +
          '<details class="explain timeline"><summary>' + esc(T.life.timeline) + '</summary><ol class="tl">' +
          l.log.map(function (e) { return '<li class="' + e.tone + '"><span class="tl-age">' + esc(T.life.age(e.age)) + '</span>' + esc(logText(e)) + '</li>'; }).join('') + '</ol></details>';
      } else {
        body = '<h2>📘 ' + esc(X.heading) + '</h2>' + ch1;
      }
      // class mode keeps the class luck: no "new luck" replay, and editing grades or the list keeps the same seed
      return '<div class="panel endcard">' + body + dataPage() + runsSection() +
        '<div class="row wrapping">' + (state.classCode ? '' : btn('e-again', '🎲 ' + X.again)) +
        btn('e-edit', state.classCode ? T.classMode.againClass : X.edit, { ghost: !state.classCode }) + btn('restart', X.restart, { ghost: true }) + '</div>' +
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

  /* ---------- Phase 3: reflection prompts, art, life summaries ---------- */
  // a short question at results day, after the first stretch of life, at each graduation and at the end;
  // in class mode a discussion prompt for the whole class is added
  function reflectBox(key) {
    var R = T.reflect, r = R[key]; if (!r) return '';
    return '<div class="reflect"><p><b>🪞 ' + esc(R.label) + '</b> ' + esc(r.q) + '</p>' +
      (state.classCode && r.c ? '<p><b>💬 ' + esc(R.classLabel) + '</b> ' + esc(r.c) + '</p>' : '') + '</div>';
  }
  function art() { return '<img class="art" src="images/life-paths-road.svg" alt="" width="600" height="140">'; }
  function lifeStatus(z) {
    return z.job ? T.tracks.work + '（' + T.lifeEnd.monthly + ' ' + money(z.job.monthly) + '）'
      : T.tracks[z.track.id] + (z.track.field ? '（' + catZh(z.track.field) + '）' : '');
  }
  // a programme name short enough for a one-line milestone: drop "[主修…]" / "（…）" details, then cut
  function shortName(s) {
    var t = String(s).replace(/\s*[\[［(（].*$/, '') || String(s);
    return t.length > 14 ? t.slice(0, 13) + '…' : t;
  }
  // the milestones of a life, for the "what if" comparison and the share image
  function pathSteps(z) {
    var P = T.path, out = [], job = false;
    z.log.forEach(function (e) {
      var d = e.data || {}, t = null, p = d.code && DB.byCode[d.code];
      if (e.key === 'start') t = d.route === 'degree' && p ? P.degree(shortName(pname(p))) : d.route === 'work' ? P.work : P.track(T.tracks[d.route] || '');
      else if (e.key === 'graduated') t = P.graduated(T.creds[d.cred]);
      else if (e.key === 'seniorYes') t = P.senior;
      else if (e.key === 'gotJob' && !job) { job = true; t = P.job(money(d.monthly)); }
      else if (e.key === 'partTimeDone') t = P.partTime(T.creds[d.level]);
      else if (e.key === 'mastersDone') t = P.masters;
      if (t) out.push({ age: e.age, text: t });
    });
    return out;
  }
  function pathLine(z) { return pathSteps(z).map(function (s) { return T.life.age(s.age) + ' ' + s.text; }).join(' → '); }

  /* ---------- Phase 3: "what if" — the same luck with one decision changed, side by side ---------- */
  // every decision that has another answer: the route at the start (other routes open to these grades; a retake
  // year is left out), each turning point, and each event with more than one answer
  function whatIfChoices() {
    var l = state.life, out = [];
    l.decisions.forEach(function (d) {
      var alts = [];
      if (d.key === 'route') {
        C.routeOptions(curActual(), curRound().offer).forEach(function (r) {
          if (r.available && r.id !== d.data.route && r.id !== 'retake') alts.push({ change: { key: 'route', route: r.id }, text: T.routeInfo[r.id].name });
        });
      } else if (d.key === 'branch') {
        L.BRANCHES[d.data.id].forEach(function (o) {
          if (o !== d.data.opt) alts.push({ change: { key: 'branch', id: d.data.id, age: d.age, opt: o }, text: T.branches[d.data.id].options[o] });
        });
      } else if (d.key === 'event') {
        T.events[d.data.id].choices.forEach(function (c, j) {
          if (j !== d.data.choice) alts.push({ change: { key: 'event', id: d.data.id, age: d.age, choice: j }, text: c });
        });
      }
      if (alts.length) out.push({ d: d, alts: alts });
    });
    return out;
  }
  function whatIfLife(change) {
    var l = state.life, f0 = l.decisions[0].data.field;
    return L.replay(lifeCtx(change.key === 'route' ? change.route : state.route, f0), l, change);
  }
  function whatIfSection() {
    var W = T.whatIf;
    // a life saved under older rules would be compared with a replay under today's rules — ask for a new game instead
    if (state.life.model !== L.MODEL_VERSION) {
      return '<section class="whatif" id="whatif"><h3 class="sub">🔀 ' + esc(W.heading) + '</h3><p class="hint">' + esc(W.stale) + '</p></section>';
    }
    var list = whatIfChoices(), w = state.whatIf;
    var items = list.length ? '<ol class="tl wi">' + list.map(function (x, n) {
      return '<li><span class="tl-age">' + esc(T.life.age(x.d.age)) + '</span><span>' + esc(decisionText(x.d)) +
        '<span class="wi-alts"><span class="small muted">' + esc(W.change) + '</span>' + x.alts.map(function (a, j) {
          var on = !!w && w.n === n && w.j === j;
          return '<button type="button" class="btn small' + (on ? '' : ' btn-ghost') + '" data-act="wi" data-n="' + n + '" data-j="' + j + '" aria-pressed="' + on + '">' + esc(a.text) + '</button>';
        }).join('') + '</span></span></li>';
    }).join('') + '</ol>' : '<p class="hint">' + esc(W.none) + '</p>';
    return '<section class="whatif" id="whatif"><h3 class="sub">🔀 ' + esc(W.heading) + '</h3><p class="hint">' + esc(W.hint) + '</p>' +
      items + compareBlock(list) + '</section>';
  }
  function compareBlock(list) {
    var w = state.whatIf, x = w && list[w.n], a = x && x.alts[w.j];
    if (!a) return '';
    var W = T.whatIf, l = state.life, z = whatIfLife(a.change);
    function diff(v1, v2, fmtv) {
      if (v1 == null || v2 == null || v1 === v2) return esc(v2 == null ? '—' : fmtv(v2));
      return esc(fmtv(v2)) + ' <span class="' + (v2 > v1 ? 'd-up' : 'd-down') + '">' + (v2 > v1 ? '▲' : '▼') + '</span>';
    }
    var id = function (v) { return String(v); };
    var rows = '<tr><th scope="row">' + esc(T.lifeEnd.cred) + '</th><td>' + esc(T.creds[L.topCred(l)]) + '</td><td>' +
        diff(L.CRED_RANK[L.topCred(l)], L.CRED_RANK[L.topCred(z)], function (r) { return T.creds[Object.keys(L.CRED_RANK)[r]]; }) + '</td></tr>' +
      '<tr><th scope="row">' + esc(T.lifeEnd.status) + '</th><td>' + esc(lifeStatus(l)) + '</td><td>' + esc(lifeStatus(z)) + '</td></tr>' +
      '<tr><th scope="row">' + esc(W.pay) + '</th><td>' + esc(l.job ? money(l.job.monthly) : '—') + '</td><td>' +
        diff(l.job ? l.job.monthly : null, z.job ? z.job.monthly : null, money) + '</td></tr>' +
      L.METERS.map(function (k) {
        return '<tr><th scope="row">' + T.meterIcons[k] + ' ' + esc(T.meters[k]) + '</th><td>' + l.meters[k] + '</td><td>' + diff(l.meters[k], z.meters[k], id) + '</td></tr>';
      }).join('');
    return '<div class="cmpbox" id="wi-cmp"><h4 tabindex="-1">' + esc(W.alt) + '「' + esc(a.text) + '」</h4><div class="tablewrap"><table class="cmp"><thead><tr><th></th><th>' +
      esc(W.yours) + '</th><th>' + esc(W.alt) + '「' + esc(a.text) + '」</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<div class="paths"><p><b>' + esc(W.yours) + '：</b>' + esc(pathLine(l)) + '</p><p><b>' + esc(W.alt) + '「' + esc(a.text) + '」：</b>' + esc(pathLine(z)) + '</p></div>' +
      '<p class="hint small">' + esc(W.habits) + '</p>' + btn('wi-close', W.close, { small: true, ghost: true }) + '</div>';
  }

  /* ---------- Phase 3: the share image (drawn on a canvas on this device; no grades, no name, no upload) ---------- */
  function shareSection() {
    var S = T.share;
    return '<section class="sharebox"><h3 class="sub">🖼 ' + esc(S.heading) + '</h3><p class="hint small">' + esc(S.hint) + '</p>' +
      (shareURL ? '<img class="shareimg" src="' + esc(shareURL.url) + '" alt="' + esc(S.title(state.life.age)) + '" width="' + shareURL.w / 2 + '" height="' + shareURL.h / 2 + '">' +
        '<p><a class="btn small" href="' + esc(shareURL.url) + '" download="' + esc(S.file) + '">⬇ ' + esc(S.download) + '</a></p>'
        : btn('share', S.button, { ghost: true })) + '</section>';
  }
  function roundRect(x, X0, Y0, w, h, r) {
    x.beginPath(); x.moveTo(X0 + r, Y0); x.arcTo(X0 + w, Y0, X0 + w, Y0 + h, r); x.arcTo(X0 + w, Y0 + h, X0, Y0 + h, r);
    x.arcTo(X0, Y0 + h, X0, Y0, r); x.arcTo(X0, Y0, X0 + w, Y0, r); x.closePath();
  }
  // draw text no wider than maxW: shrink the font a little, then cut with "…"
  function fitText(x, s, X0, Y0, maxW, weight, size, font) {
    var sz = size;
    x.font = weight + ' ' + sz + 'px ' + font;
    while (x.measureText(s).width > maxW && sz > size * 0.75) { sz -= 2; x.font = weight + ' ' + sz + 'px ' + font; }
    while (x.measureText(s).width > maxW && s.length > 2) s = s.slice(0, -2) + '…';
    x.fillText(s, X0, Y0);
  }
  function makeShare(l) {
    var steps = pathSteps(l).slice(0, 7), lt = lifeTitle(l), dream = state.me.dream;
    var dreamTxt = dream ? T.dreamEnd.heading + '：' + T.dreams[dream].name + '　' + stars(F.dreamStars(l, dream)) : '';
    // 1080 wide; the height follows the number of milestones (and the dream line) so there is no empty band
    var S = T.share, W = 1080, H = 1060 + 58 * Math.max(2, steps.length) + (dreamTxt ? 52 : 0);
    var FONT = '"Noto Sans TC", "PingFang HK", "Microsoft JhengHei", sans-serif';
    var title = S.title(l.age), now = S.now + lifeStatus(l), cred = S.cred + T.creds[L.topCred(l)];
    var all = [T.title, title, lt.name, now, cred, dreamTxt, S.foot1, S.foot2].concat(steps.map(function (s) { return T.life.age(s.age) + s.text; }))
      .concat(L.METERS.map(function (k) { return T.meters[k]; })).join('') + '0123456789HK$,.…★☆';
    var ready = document.fonts && document.fonts.load
      ? Promise.all(['800', '700', '500'].map(function (w) { return document.fonts.load(w + ' 40px "Noto Sans TC"', all); })) : Promise.resolve();
    return ready.catch(function () {}).then(function () {
      var cv = document.createElement('canvas'); cv.width = W; cv.height = H;
      var x = cv.getContext('2d'), M = 60, PX = 120, i;
      x.fillStyle = '#FAF4E6'; x.fillRect(0, 0, W, H);
      var glow = x.createRadialGradient(W - 80, 40, 40, W - 80, 40, 640);
      glow.addColorStop(0, 'rgba(201,162,75,0.28)'); glow.addColorStop(1, 'rgba(201,162,75,0)');
      x.fillStyle = glow; x.fillRect(0, 0, W, H);
      roundRect(x, M, M, W - 2 * M, H - 2 * M, 36); x.fillStyle = '#FFFDF8'; x.fill();
      x.lineWidth = 3; x.strokeStyle = '#E8DCC2'; x.stroke();
      x.save(); roundRect(x, M, M, W - 2 * M, H - 2 * M, 36); x.clip();
      var band = x.createLinearGradient(M, 0, W - M, 0); band.addColorStop(0, '#C9A24B'); band.addColorStop(1, '#8BA888');
      x.fillStyle = band; x.fillRect(M, M, W - 2 * M, 12); x.restore();
      x.textBaseline = 'alphabetic';
      // header: the title and the end title on the left, the character on the right
      var TW = W - 2 * PX - 190;
      x.fillStyle = '#936c1f'; fitText(x, T.title, PX, 150, TW, '800', 34, FONT);
      x.fillStyle = '#5B3A24'; fitText(x, title, PX, 226, TW, '800', 58, FONT);
      x.fillStyle = '#A9842F'; fitText(x, lt.name, PX, 284, TW, '800', 38, FONT);
      F.drawAvatar(x, state.me.avatar, W - PX - 168, 104, 168);
      // art: hills and a dashed road with a dot for every milestone
      var top = 318, hgt = 150, left = PX, right = W - PX;
      x.save(); roundRect(x, left, top, right - left, hgt, 22); x.clip();
      x.fillStyle = '#FFF6E2'; x.fillRect(left, top, right - left, hgt);
      x.fillStyle = '#F2D27A'; x.globalAlpha = 0.75; x.beginPath(); x.arc(right - 70, top + 42, 24, 0, Math.PI * 2); x.fill(); x.globalAlpha = 1;
      x.fillStyle = '#DCE7D6'; x.beginPath(); x.moveTo(left, top + 110);
      x.bezierCurveTo(left + 220, top + 70, left + 420, top + 120, right, top + 88); x.lineTo(right, top + hgt); x.lineTo(left, top + hgt); x.fill();
      x.fillStyle = '#C9DBC2'; x.beginPath(); x.moveTo(left, top + 132);
      x.bezierCurveTo(left + 260, top + 112, left + 520, top + 140, right, top + 120); x.lineTo(right, top + hgt); x.lineTo(left, top + hgt); x.fill();
      x.lineCap = 'round'; x.strokeStyle = '#E8DCC2'; x.lineWidth = 16; x.beginPath(); x.moveTo(left + 30, top + 128);
      x.bezierCurveTo(left + 260, top + 128, left + 300, top + 70, left + 480, top + 82); x.bezierCurveTo(left + 640, top + 92, left + 700, top + 40, right - 40, top + 34); x.stroke();
      x.strokeStyle = '#C9A24B'; x.lineWidth = 3; x.setLineDash([10, 11]); x.stroke(); x.setLineDash([]);
      var dots = Math.max(2, Math.min(steps.length, 6));
      for (i = 0; i < dots; i++) {
        var t = i / (dots - 1), dx = left + 30 + t * (right - left - 70), dy = top + 128 - t * 94 + Math.sin(t * Math.PI) * 18;
        x.fillStyle = i === dots - 1 ? '#5f7f5b' : '#A9842F'; x.beginPath(); x.arc(dx, dy, 9, 0, Math.PI * 2); x.fill();
        x.strokeStyle = '#FFFDF8'; x.lineWidth = 3; x.stroke();
      }
      x.restore();
      // milestones
      var y = 538, rowH = 58;
      x.strokeStyle = '#E8DCC2'; x.lineWidth = 4;
      if (steps.length > 1) { x.beginPath(); x.moveTo(PX + 10, y - 12); x.lineTo(PX + 10, y - 12 + (steps.length - 1) * rowH); x.stroke(); }
      steps.forEach(function (s, k) {
        var yy = y + k * rowH;
        x.fillStyle = k === steps.length - 1 ? '#5f7f5b' : '#C9A24B'; x.beginPath(); x.arc(PX + 10, yy - 12, 10, 0, Math.PI * 2); x.fill();
        x.fillStyle = '#8a6f59'; fitText(x, T.life.age(s.age), PX + 40, yy, 120, '800', 32, FONT);
        x.fillStyle = '#5B3A24'; fitText(x, s.text, PX + 160, yy, W - PX - (PX + 160), '700', 34, FONT);
      });
      // now + highest qualification (+ the dream)
      y = 538 + Math.max(steps.length, 1) * rowH + 30;
      x.fillStyle = '#5B3A24'; fitText(x, now, PX, y, W - 2 * PX, '800', 40, FONT);
      x.fillStyle = '#8a6f59'; fitText(x, cred, PX, y + 52, W - 2 * PX, '700', 34, FONT);
      if (dreamTxt) { x.fillStyle = '#A9842F'; fitText(x, dreamTxt, PX, y + 104, W - 2 * PX, '700', 34, FONT); }
      // the five meters (two columns)
      var my = y + 110 + (dreamTxt ? 52 : 0), colW = (W - 2 * PX - 40) / 2;
      L.METERS.forEach(function (k, n) {
        var cx = PX + (n % 2) * (colW + 40), cy = my + Math.floor(n / 2) * 56, v = l.meters[k];
        x.fillStyle = '#5B3A24'; fitText(x, T.meters[k], cx, cy, 150, '700', 30, FONT);
        roundRect(x, cx + 160, cy - 22, colW - 230, 18, 9); x.fillStyle = '#F1E7CF'; x.fill();
        if (v > 0) { roundRect(x, cx + 160, cy - 22, Math.max(18, (colW - 230) * v / 100), 18, 9); x.fillStyle = '#B7A35A'; x.fill(); }
        x.fillStyle = '#5B3A24'; fitText(x, String(v), cx + colW - 56, cy, 60, '800', 30, FONT);
      });
      // footer
      x.fillStyle = '#8a6f59'; fitText(x, S.foot1, PX, H - M - 78, W - 2 * PX, '700', 28, FONT);
      x.fillStyle = '#936c1f'; fitText(x, S.foot2, PX, H - M - 34, W - 2 * PX, '800', 28, FONT);
      return { url: cv.toDataURL('image/png'), w: W, h: H };
    });
  }

  /* ---------- Phase 3: the last runs on this device ---------- */
  function runsSection() {
    var R = T.runs, runs = [];
    try { runs = JSON.parse(localStorage.getItem(LS_RUNS) || '[]'); } catch (e) {}
    if (!runs.length) return '';
    var rows = runs.map(function (r, i) {
      var ri = T.routeInfo[r.route] || { icon: '', name: '—' }, cur = i === 0 && r.seed === state.seed && !!state.life && state.life.pend.type === 'end';
      return '<tr' + (cur ? ' class="cur"' : '') + '><td>' + esc(r.at) + (cur ? ' <span class="pill p-good">' + esc(R.current) + '</span>' : '') + '</td>' +
        '<td>' + ri.icon + ' ' + esc(ri.name) + ' <span class="small muted">（' + esc(r.mode === 'long' ? R.long : R.short) + (r.cls ? ' · ' + esc(r.cls) : '') + '）</span></td>' +
        '<td>' + esc(r.cred ? T.creds[r.cred] : '—') + '</td><td>' + esc(r.monthly ? money(r.monthly) : '—') + '</td></tr>';
    }).join('');
    return '<details class="explain runs"><summary>🗂 ' + esc(R.heading) + '</summary><div class="tablewrap"><table class="otable"><thead><tr>' +
      R.th.map(function (h) { return '<th>' + esc(h) + '</th>'; }).join('') + '</tr></thead><tbody>' + rows + '</tbody></table></div></details>';
  }

  /* ---------- fun pack: 估一估 guesses ---------- */
  function guessBox(q, buttons) {
    return '<div class="guess"><span class="tag">🎯 ' + esc(T.guess.tag) + '</span><p>' + esc(q) + '</p><div class="row wrapping">' + buttons + '</div></div>';
  }
  function verdict(g, a) { return g === a ? T.guess.exact : Math.abs(g - a) <= 1 ? T.guess.near : T.guess.far; }
  // the Band of the Main Round offer (0–4 = A–E, 5 = none), before any Clearing Round
  function mainBand() {
    var r = state.round && state.round.rows.filter(function (x) { return x.status === 'offer'; })[0];
    return r ? 'ABCDE'.indexOf(C.bandOfSlot(r.i)) : 5;
  }
  function guessOutcome(kind) {
    var G = T.guess, g = state.guesses[kind];
    if (g == null || g < 0) return null;
    if (kind === 'match') {
      if (!state.results) return null;
      var m = state.results.changes.filter(function (c) { return c.diff === 0; }).length;
      return G.matchResult(g, m) + ' ' + verdict(g, m);
    }
    if (kind === 'band') { if (!state.round) return null; var a = mainBand(); return G.bandResult(G.bands[g], G.bands[a]) + ' ' + verdict(g, a); }
    var l = state.life;
    if (!l || l.pend.type !== 'end') return null;
    if (!l.job) return G.payResult(G.payBands[g], G.noPay);
    var b = F.payBand(l.job.monthly);
    return G.payResult(G.payBands[g], G.payBands[b]) + ' ' + verdict(g, b);
  }
  function guessResult(kind) { var t = guessOutcome(kind); return t ? '<p class="guess-res">🎯 ' + esc(t) + '</p>' : ''; }
  function guessSummary() {
    var lines = ['match', 'band', 'pay'].map(guessOutcome).filter(Boolean);
    if (!lines.length) return '';
    return '<details class="explain guesses" open><summary>🎯 ' + esc(T.guess.summary) + '</summary><ul>' +
      lines.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></details>';
  }

  /* ---------- fun pack: the end title and the dream ---------- */
  function storyFlags() { var ro = curRound() && curRound().offer; return { retake: !!state.retake, clearing: !!(ro && ro.clearing) }; }
  function lifeTitle(l) {
    var pz = F.persona(l, storyFlags()), P = T.personas[pz.id];
    return { icon: P.icon, name: (pz.mod ? T.mods[pz.mod] : '') + P.name, desc: P.desc };
  }
  function stars(s) { return new Array(s + 1).join('★') + new Array(4 - s).join('☆'); }
  function titleCard(l) {
    var t = lifeTitle(l), av = state.me.avatar;
    return '<div class="titlecard">' + F.avatarSVG(av, 76, esc(T.avatars[av])) + '<div><span class="small muted">' + esc(T.titleHeading) + '</span>' +
      '<b class="ptitle">' + t.icon + ' ' + esc(t.name) + '</b><span>' + esc(t.desc) + '</span></div></div>';
  }
  function dreamCard(l) {
    var id = state.me.dream, D = T.dreamEnd;
    if (!id) return '';
    var s = F.dreamStars(l, id), d = T.dreams[id];
    return '<div class="dreamcard"><span class="dr-icon" aria-hidden="true">' + F.DREAMS[id].icon + '</span><div><span class="small muted">' + esc(D.heading) + '</span>' +
      '<b>' + esc(d.name) + ' <span class="stars" role="img" aria-label="' + s + ' / 3">' + stars(s) + '</span></b><span>' + esc(D.stars[s]) + '</span>' +
      (s < 3 ? '<span class="small tip">' + esc(D.tipLabel + d.tip) + '</span>' : '') + '</div></div>';
  }

  /* ---------- fun pack: the character walking along the road of the years ---------- */
  var WALK_W = 600, WALK_H = 96;                      // the strip is exactly WALK_H px tall, so % positions match the drawing
  function walkX(l, age) { var a0 = l.log[0].age, span = Math.max(1, l.endAge - a0); return 36 + (Math.min(age, l.endAge) - a0) / span * (WALK_W - 72); }
  function walkY(x) { return 68 + 7 * Math.sin(x / 60); }
  function walkPos(l, age, h) { var x = walkX(l, age); return { left: (x / WALK_W * 100).toFixed(2) + '%', top: ((walkY(x) - h) / WALK_H * 100).toFixed(2) + '%' }; }
  function walkStrip(l) {
    var pts = [], x;
    for (x = 0; x <= WALK_W; x += 12) pts.push(x + ',' + walkY(x).toFixed(1));
    var marks = l.log.filter(function (e) { return e.key === 'graduated' || e.key === 'gotJob' || e.key === 'mastersDone' || e.key === 'partTimeDone'; })
      .map(function (e) { var p = walkPos(l, e.age, 30); return '<span class="wmark" style="left:' + p.left + ';top:' + p.top + '">' + (e.key === 'gotJob' ? '💼' : '🎓') + '</span>'; }).join('');
    var me = walkPos(l, l.age, 40), flag = walkPos(l, l.endAge, 30);
    return '<div class="walk" role="img" aria-label="' + esc(T.walk(l.age, l.endAge)) + '"><svg viewBox="0 0 ' + WALK_W + ' ' + WALK_H + '" preserveAspectRatio="none" aria-hidden="true">' +
      '<rect width="' + WALK_W + '" height="' + WALK_H + '" fill="#FFF6E2"/>' +
      '<path d="M0 ' + WALK_H + 'L0 74C120 56 240 80 360 66C460 54 540 74 ' + WALK_W + ' 62L' + WALK_W + ' ' + WALK_H + 'Z" fill="#DCE7D6"/>' +
      '<polyline points="' + pts.join(' ') + '" fill="none" stroke="#E8DCC2" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<polyline points="' + pts.join(' ') + '" fill="none" stroke="#C9A24B" stroke-width="2" stroke-dasharray="6 8"/></svg>' +
      marks + '<span class="wmark" style="left:' + flag.left + ';top:' + flag.top + '">🏁</span>' +
      '<div class="walker" style="left:' + me.left + ';top:' + me.top + '">' + F.avatarSVG(state.me.avatar, 40) + '</div>' +
      '<div class="ages"><span>' + esc(T.life.age(l.log[0].age)) + '</span><span>' + esc(T.life.age(l.endAge)) + '</span></div></div>';
  }

  /* ---------- fun pack: motion (all of it skipped when the device asks for reduced motion) ---------- */
  function reduceMotion() { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  function confetti() {
    if (reduceMotion()) return;
    var colors = ['#C9A24B', '#8BA888', '#E07A7A', '#6189a3', '#F2D27A', '#bd7d54'], box = document.createElement('div'), h = '';
    box.className = 'confetti'; box.setAttribute('aria-hidden', 'true');
    for (var i = 0; i < 36; i++) {
      h += '<i style="left:' + (Math.random() * 100).toFixed(1) + '%;background:' + colors[i % colors.length] +
        ';animation-delay:' + (Math.random() * 0.35).toFixed(2) + 's;animation-duration:' + (1.4 + Math.random() * 0.9).toFixed(2) + 's"></i>';
    }
    box.innerHTML = h; document.body.appendChild(box);
    setTimeout(function () { if (box.parentNode) box.parentNode.removeChild(box); }, 2800);
  }
  // offer day: light up each choice in order until the one that clears (the real JUPAS rule), then show the offer
  function startScan() {
    clearTimeout(scanTimer);
    if (reduceMotion()) { scanTimer = setTimeout(finishScan, 0); return; }
    var rows = curRound().rows, els = document.querySelectorAll('#screen .scanrow'), i = 0;
    function next() {
      var el = els[i], r = rows[i];
      if (!el || !el.isConnected) return;                                   // the screen changed meanwhile
      el.classList.add('checking');
      if (el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
      scanTimer = setTimeout(function () {
        var ok = r.status === 'offer';
        el.classList.remove('checking'); el.classList.add(ok ? 'pass' : 'fail');
        el.querySelector('.scan-st').textContent = ok ? T.reveal.pass : T.reveal.fail;
        i++;
        if (ok) {
          for (var k = i; k < els.length; k++) { els[k].classList.add('skipped'); els[k].querySelector('.scan-st').textContent = T.reveal.after; }
          scanTimer = setTimeout(finishScan, 1000);
        } else scanTimer = setTimeout(i < els.length ? next : finishScan, i < els.length ? 90 : 800);
      }, 230);
    }
    scanTimer = setTimeout(next, 350);
  }
  function finishScan() {
    clearTimeout(scanTimer);
    if (state.step !== 'offers') return;
    state.revealed[inRetakeYear() ? 'offers2' : 'offers'] = true;
    if (curRound().offer) confettiNext = true;
    save(); render();
  }
  // a life turn: meters slide from the old values, the character walks on, the age counts up
  function animateLife(a) {
    if (reduceMotion()) return;
    var l = state.life;
    document.querySelectorAll('#screen .lifepanel .meter').forEach(function (row, n) {
      var k = L.METERS[n], bar = row.querySelector('.bar i');
      if (!bar || a.m0[k] == null || a.m0[k] === l.meters[k]) return;
      bar.style.transition = 'none'; bar.style.width = a.m0[k] + '%'; void bar.offsetWidth;
      bar.style.transition = ''; bar.style.width = l.meters[k] + '%';
    });
    var w = document.querySelector('#screen .walker');
    if (w && a.age0 !== l.age) {
      var p0 = walkPos(l, a.age0, 40), to = { left: w.style.left, top: w.style.top };
      w.style.transition = 'none'; w.style.left = p0.left; w.style.top = p0.top; void w.offsetWidth;
      w.style.transition = ''; w.classList.add('hop'); w.style.left = to.left; w.style.top = to.top;
    }
    var ag = document.querySelector('#screen .lifehead .age');
    if (ag && a.age0 < l.age) {
      var cur = a.age0; ag.textContent = T.life.age(cur);
      var t = setInterval(function () { cur++; ag.textContent = T.life.age(Math.min(cur, l.age)); if (cur >= l.age) clearInterval(t); }, 260);
    }
  }
  function afterRender() {
    if (state.step === 'offers' && document.querySelector('#screen .scanrow')) startScan();
    if (state.step === 'life' && anim) { var a = anim; anim = null; animateLife(a); }
    if (confettiNext) { confettiNext = false; confetti(); }
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
  // the start context of a life on this run — shared by startLife and the "what if" replays, so a replay with
  // nothing changed starts from exactly the same place (field: the offer's subject, else the chosen field / first
  // interest; medicine only through a JUPAS offer)
  function lifeCtx(route, field) {
    var o = curRound() && curRound().offer, prog = route === 'degree' && o ? DB.byCode[o.code] : null;
    var f = prog ? (prog.categories && prog.categories[0]) || 'Business' : field || state.field || state.cats[0] || 'Business';
    if (!prog && f === 'Medicine') f = 'Health';
    return { seed: state.seed, mode: state.life ? state.life.mode : state.mode, route: route, field: f, offer: o, prog: prog,
      actual: curActual(), startAge: state.retake ? 19 : 18 };
  }
  function startLife() {
    state.lifeFrom = state.step; state.whatIf = null; state.life = null;
    state.life = L.start(lifeCtx(state.route));
    lastMsg = null; go('life');
  }
  // run one life choice, then show what it led to: the new timeline lines, how the five meters moved, and a
  // reflection prompt after the first stretch of life and at each graduation
  function lifeAfter(fn, intro) {
    var l = state.life, before = l.log.length, m0 = {}, turns0 = l.turns || 0, age0 = l.age;
    var hadJob = l.log.some(function (e) { return e.key === 'gotJob'; });
    L.METERS.forEach(function (k) { m0[k] = l.meters[k]; });
    fn();
    var fresh = l.log.slice(before);
    anim = { age0: age0, m0: m0 };
    // a little celebration for the big moments
    if (fresh.some(function (e) {
      return e.key === 'graduated' || e.key === 'seniorYes' || e.key === 'mastersDone' || (e.key === 'gotJob' && !hadJob) ||
        (e.key === 'event' && e.data.id === 'promotion');
    })) confettiNext = true;
    var text = (intro ? [intro] : []).concat(fresh.map(logText)).filter(Boolean).join(' ');
    var deltas = L.METERS.map(function (k) { return { k: k, d: l.meters[k] - m0[k] }; }).filter(function (x) { return x.d; });
    var reflect = fresh.some(function (e) { return e.key === 'graduated'; }) ? 'graduation' : turns0 === 0 && (l.turns || 0) === 1 ? 'year1' : null;
    lastMsg = { text: text, deltas: deltas, reflect: reflect };
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
    start: function () {
      var code = normCode(codeDraft != null ? codeDraft : state && state.classCode);
      if (code && !validCode(code)) { $('class-err').textContent = T.classMode.invalid; return; }
      state = keepMe(state, blank(state && state.mode, code || null)); resumeStep = null; codeDraft = null; go('me');
    },
    av: function (b) { state.me.avatar = b.getAttribute('data-id'); save(); render(); },
    dr: function (b) {
      var id = b.getAttribute('data-id') || null, me = state.me;
      if (me.dreamCat) state.cats = state.cats.filter(function (k) { return k !== me.dreamCat; });   // undo the last dream's interest
      me.dream = id; me.dreamCat = null;
      var cat = id && F.DREAMS[id].cat;
      if (cat && state.cats.indexOf(cat) < 0) { state.cats.unshift(cat); me.dreamCat = cat; }   // the dream's field becomes an interest
      save(); render();
    },
    'me-next': function () { go('grades'); },
    // quick start: a ready-made (or random) student fills the grades and interests, then "suggest" builds the list
    sample: function (b) {
      var id = b.getAttribute('data-id'), s = id === 'random' ? F.randomStudent(Math.random) : F.SAMPLES[id];
      var el = s.pred.elect.map(function (e) { return { s: e.s, lv: e.lv }; });
      while (el.length < 4) el.push({ s: '', lv: '' });
      state.pred = { chi: s.pred.chi, eng: s.pred.eng, math: s.pred.math, csd: s.pred.csd, elect: el };
      var cats = s.cats.slice(), dc = state.me.dream && F.DREAMS[state.me.dream].cat;
      if (dc && cats.indexOf(dc) < 0) cats.unshift(dc);
      state.cats = cats; state.me.dreamCat = null;
      state.list = C.suggestList(predClean(), state.cats, DB);
      go('list');
      var name = (id === 'random' ? T.quick.random : T.quick.samples[id]).replace(/^\S+\s+/, '');
      listMsg(state.list.length ? T.quick.done(name) : T.list.noneEligible);
    },
    'guess-match': function (b) { state.guesses.match = +b.getAttribute('data-v'); save(); render(); },
    flip: function (b) {
      var i = +b.getAttribute('data-i'), res = inRetakeYear() ? state.retake.results : state.results;
      flips[i] = true; flips.last = i;
      if (res.changes.every(function (c, k) { return flips[k]; })) state.revealed[inRetakeYear() ? 'results2' : 'results'] = true;
      save(); render();
    },
    'reveal-all': function () { state.revealed[inRetakeYear() ? 'results2' : 'results'] = true; save(); render(); },
    'guess-band': function (b) { state.guesses.band = +b.getAttribute('data-v'); save(); render(); },
    'scan-skip': function () { finishScan(); },
    'guess-pay': function (b) { state.guesses.pay = +b.getAttribute('data-v'); save(); render(); },
    'class-gen': function () {
      codeDraft = genCode();
      var i = $('class-code'); if (i) i.value = codeDraft;
      var e = $('class-err'); if (e) e.textContent = '';
    },
    resume: function () { var s = resumeStep; resumeStep = null; go(s); },
    restart: function () {
      state = keepMe(state, blank(state && state.mode, state && state.classCode)); resumeStep = null; lastMsg = null; codeDraft = null; go('intro');
    },
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
      state.guesses = {}; state.revealed = {}; flips = {};
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
      if (ok) { curRound().offer = { code: code, slot: '補選', clearing: true }; confettiNext = true; }
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
      state.revealed.results2 = false; state.revealed.offers2 = false; flips = {};
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
    'e-again': function () { if (!state.classCode) state.seed = C.newSeed(); ACT['l-next'](); },
    'e-edit': function () { if (!state.classCode) state.seed = C.newSeed(); go('grades'); },
    wi: function (b) {
      state.whatIf = { n: +b.getAttribute('data-n'), j: +b.getAttribute('data-j') }; save(); render();
      var h = document.querySelector('#wi-cmp h4');
      if (h) { h.scrollIntoView({ block: 'nearest' }); try { h.focus({ preventScroll: true }); } catch (e) {} }
    },
    'wi-close': function () {
      state.whatIf = null; save(); render();
      var w = $('whatif'); if (w) w.scrollIntoView({ block: 'nearest' });
    },
    share: function (b) {
      b.disabled = true; b.textContent = T.share.making;
      makeShare(state.life).then(function (url) {
        shareURL = url; render();
        var im = document.querySelector('.shareimg'); if (im) im.scrollIntoView({ block: 'nearest' });
      }).catch(function () { b.disabled = false; b.textContent = T.share.failed; });
    }
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
      else if (t.id === 'big-text') setBig(t.checked);
    });
    scr.addEventListener('input', function (e) {
      if (e.target.id === 'l-q') renderSearch();
      else if (e.target.id === 'class-code') { codeDraft = e.target.value; $('class-err').textContent = ''; }
    });
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
    document.documentElement.classList.toggle('big', isBig());
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
    db: function () { return DB; }, core: C, life: L,
    // a "what if" with nothing changed must rebuild exactly the life on screen (same start context, same luck)
    replaySame: function () {
      var l = state.life; if (!l) return null;
      return JSON.stringify(L.replay(lifeCtx(state.route, l.decisions[0].data.field), l, { key: 'none' })) === JSON.stringify(l);
    },
    get shareURL() { return shareURL; }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
