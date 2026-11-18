/* ============================================================================
   DSE 人生模擬器 — fun pack: characters (self-made art), dreams, end titles, quick-start students.
   Pure logic + drawing data: no DOM needed to load it (tools/life-paths-test.mjs loads it in node).
   All player-facing text lives in life-paths-content.js (avatars, dreams, personas, quick).
   Nothing here changes the simulation: dreams and titles only READ a finished life.
   Exposes window.LifePathsFun.
   ========================================================================== */
(function () {
  'use strict';
  function C() { return window.LifePathsCore; }
  function L() { return window.LifePathsLife; }

  /* ---------- characters: simple animals as path data on a 64×64 board, so the page (SVG) and the
     share image (canvas, via Path2D) draw exactly the same picture ---------- */
  function ell(cx, cy, rx, ry) {
    return 'M' + (cx - rx) + ' ' + cy + 'a' + rx + ' ' + ry + ' 0 1 0 ' + (2 * rx) + ' 0a' + rx + ' ' + ry + ' 0 1 0 ' + (-2 * rx) + ' 0Z';
  }
  function circ(cx, cy, r) { return ell(cx, cy, r, r); }
  function tri(a, b, c, d, e, f) { return 'M' + a + ' ' + b + 'L' + c + ' ' + d + 'L' + e + ' ' + f + 'Z'; }
  var INK = '#5B3A24';
  var AVATARS = {
    cat: [[circ(32, 32, 31), '#F6EBD3'], [tri(15, 25, 21, 7, 29, 20), '#E0A458'], [tri(35, 20, 43, 7, 49, 25), '#E0A458'],
      [tri(19, 21, 22, 12, 26, 19), '#F6C9A0'], [tri(38, 19, 42, 12, 45, 21), '#F6C9A0'], [ell(32, 36, 17, 15), '#E0A458'],
      [circ(26, 35, 2.3), INK], [circ(38, 35, 2.3), INK], [tri(30, 40, 34, 40, 32, 42.6), '#B5654A'],
      [circ(22, 41, 2.6), '#F2B8A0'], [circ(42, 41, 2.6), '#F2B8A0']],
    dog: [[circ(32, 32, 31), '#E7F0E4'], [ell(32, 35, 16, 15), '#C99A6B'], [ell(17, 32, 6, 11), '#8A5E3B'], [ell(47, 32, 6, 11), '#8A5E3B'],
      [ell(32, 41, 8, 6), '#F1DDC1'], [ell(32, 38, 3, 2.2), INK], [circ(26, 32, 2.3), INK], [circ(38, 32, 2.3), INK],
      [ell(32, 46, 2.2, 2), '#E07A7A']],
    panda: [[circ(32, 32, 31), '#EEF4EC'], [circ(19, 21, 6), INK], [circ(45, 21, 6), INK], [ell(32, 35, 18, 16), '#D9D2C3'],
      [ell(32, 35, 17, 15), '#FFFFFF'], [ell(25, 34, 5, 6), INK], [ell(39, 34, 5, 6), INK], [circ(25.5, 33, 1.7), '#FFFFFF'],
      [circ(38.5, 33, 1.7), '#FFFFFF'], [ell(32, 41, 3, 2), INK]],
    rabbit: [[circ(32, 32, 31), '#FBEFEF'], [ell(25, 15, 4.5, 12), '#FFFFFF'], [ell(39, 15, 4.5, 12), '#FFFFFF'],
      [ell(25, 15, 2.2, 8), '#F2B8C0'], [ell(39, 15, 2.2, 8), '#F2B8C0'], [ell(32, 38, 16.5, 14.5), '#E5DCCF'],
      [ell(32, 38, 15.5, 13.5), '#FFFFFF'], [circ(26, 37, 2.1), INK], [circ(38, 37, 2.1), INK],
      [tri(30, 42, 34, 42, 32, 44.6), '#E58E9E'], [circ(22, 42, 2.5), '#F7CAD0'], [circ(42, 42, 2.5), '#F7CAD0']],
    owl: [[circ(32, 32, 31), '#F3E8CE'], [tri(16, 22, 20, 9, 27, 19), '#9C7A55'], [tri(37, 19, 44, 9, 48, 22), '#9C7A55'],
      [ell(32, 36, 17, 18), '#9C7A55'], [ell(32, 42, 10, 11), '#E9D8B8'], [circ(25, 31, 6.5), '#FFFDF8'],
      [circ(39, 31, 6.5), '#FFFDF8'], [circ(25, 31, 3), INK], [circ(39, 31, 3), INK], [tri(30, 36, 34, 36, 32, 41), '#E0A458']],
    fox: [[circ(32, 32, 31), '#FDF0E2'], [tri(13, 27, 18, 8, 28, 21), '#D9733B'], [tri(36, 21, 46, 8, 51, 27), '#D9733B'],
      [tri(17, 23, 19, 13, 25, 20), '#F6C9A0'], [tri(39, 20, 45, 13, 47, 23), '#F6C9A0'], [ell(32, 36, 17, 14), '#D9733B'],
      ['M17 38Q32 30 47 38Q40 50 32 51Q24 50 17 38Z', '#FFF6EC'], [circ(32, 46, 2.3), INK],
      [ell(25, 34, 2, 2.5), INK], [ell(39, 34, 2, 2.5), INK]],
    penguin: [[circ(32, 32, 31), '#E8F1F6'], [ell(16, 40, 3.5, 8), '#3E4A5A'], [ell(48, 40, 3.5, 8), '#3E4A5A'],
      [ell(32, 38, 16, 18), '#3E4A5A'], [ell(32, 39, 11, 13), '#FFFFFF'], [circ(27, 34, 2.1), INK], [circ(37, 34, 2.1), INK],
      [tri(29, 39, 35, 39, 32, 43), '#F0A040'], [ell(26, 56, 4, 2), '#F0A040'], [ell(38, 56, 4, 2), '#F0A040']],
    chick: [[circ(32, 32, 31), '#FFF6D8'], [tri(28, 23, 32, 14, 36, 23), '#F0A040'], [circ(32, 37, 16), '#F6CE4A'],
      [ell(46, 41, 4, 6), '#E9B93A'], [circ(27, 34, 2.1), INK], [circ(37, 34, 2.1), INK], [tri(29, 39, 35, 39, 32, 43), '#E58A2E'],
      [circ(23, 40, 2.5), '#F7B7A3'], [circ(41, 40, 2.5), '#F7B7A3']]
  };
  var AVATAR_IDS = Object.keys(AVATARS);
  function avatarSVG(id, size, label) {
    var a = AVATARS[id] || AVATARS.cat;
    return '<svg viewBox="0 0 64 64" width="' + size + '" height="' + size + '"' + (label ? ' role="img" aria-label="' + label + '"' : ' aria-hidden="true"') + '>' +
      a.map(function (s) { return '<path d="' + s[0] + '" fill="' + s[1] + '"/>'; }).join('') + '</svg>';
  }
  function drawAvatar(ctx, id, x, y, size) {
    var a = AVATARS[id] || AVATARS.cat;
    ctx.save(); ctx.translate(x, y); ctx.scale(size / 64, size / 64);
    a.forEach(function (s) { ctx.fillStyle = s[1]; ctx.fill(new Path2D(s[0])); });
    ctx.restore();
  }

  /* ---------- dreams: picked at the start, judged on the finished life (0–3 stars). ILLUSTRATIVE ---------- */
  // career dreams: ★ studied in the field · ★★ a qualification in the field at the level · ★★★ working with it
  // meter dreams: the meter at the end ≥ 55 / 65 / 75 · "see the world": exchange or study outside HK (★★) + 人脈 ≥ 60 (★)
  var DREAMS = {
    nurse: { icon: '🩺', fields: ['Health', 'Medicine'], level: 'degree', cat: 'Health' },
    engineer: { icon: '⚙️', fields: ['Engineering'], level: 'degree', cat: 'Engineering' },
    it: { icon: '💻', fields: ['Computing'], level: 'subdegree', cat: 'Computing' },
    designer: { icon: '🎨', fields: ['Design', 'Arts'], level: 'subdegree', cat: 'Design' },
    teacher: { icon: '📚', fields: ['Education'], level: 'degree', cat: 'Education' },
    business: { icon: '💼', fields: ['Business'], level: 'subdegree', cat: 'Business' },
    savings: { icon: '💰', meter: 'money' },
    world: { icon: '🌏', world: true },
    balance: { icon: '💚', meter: 'wellbeing' }
  };
  var DREAM_IDS = Object.keys(DREAMS);
  var METER_STARS = [55, 65, 75];
  function dreamStars(l, id) {
    var d = DREAMS[id]; if (!d) return 0;
    if (d.meter) { var v = l.meters[d.meter]; return METER_STARS.filter(function (t) { return v >= t; }).length; }
    if (d.world) {
      var away = l.decisions.some(function (x) { return x.key === 'route' && (x.data.route === 'mainland' || x.data.route === 'overseas'); }) ||
        l.decisions.some(function (x) { return x.key === 'event' && x.data.id === 'exchange' && x.data.choice === 0; });
      return Math.min(3, (away ? 2 : 0) + (l.meters.connections >= 60 ? 1 : 0));
    }
    var R = L().CRED_RANK, inField = function (f) { return d.fields.indexOf(f) >= 0; };
    var cred = l.creds.some(function (c) { return inField(c.field) && R[c.level] >= R[d.level]; });
    if (cred && l.job && inField(l.job.field || l.field)) return 3;
    if (cred) return 2;
    var studied = l.creds.some(function (c) { return inField(c.field); }) ||
      (l.track && L().TRACKS[l.track.id].kind === 'study' && inField(l.track.field));
    return studied ? 1 : 0;
  }

  /* ---------- the end title: the focus chosen most, plus a twist from the story ---------- */
  var PERSONA_OF_FOCUS = { study: 'scholar', learn: 'scholar', experience: 'doer', perform: 'doer', parttime: 'saver', save: 'saver',
    balance: 'balanced', wbalance: 'balanced', explore: 'connector', network: 'connector' };
  var PERSONA_IDS = ['scholar', 'doer', 'saver', 'balanced', 'connector', 'allround'];
  var MOD_IDS = ['comeback', 'clearing', 'parttime', 'exchange', 'masters'];
  // story: { retake: bool, clearing: bool } from the screens (chapter 1 lives outside the life record)
  function persona(l, story) {
    var n = {}, total = 0;
    l.decisions.forEach(function (d) { if (d.key === 'focus') { var p = PERSONA_OF_FOCUS[d.data.id]; n[p] = (n[p] || 0) + 1; total++; } });
    var top = Object.keys(n).sort(function (a, b) { return n[b] - n[a] || (a < b ? -1 : 1); })[0];
    var id = !total ? 'balanced' : n[top] / total < 0.4 ? 'allround' : top;
    var mod = story && story.retake ? 'comeback' : story && story.clearing ? 'clearing'
      : l.log.some(function (e) { return e.key === 'partTimeDone'; }) ? 'parttime'
      : l.decisions.some(function (d) { return d.key === 'event' && d.data.id === 'exchange' && d.data.choice === 0; }) ? 'exchange'
      : L().topCred(l) === 'masters' ? 'masters' : null;
    return { id: id, mod: mod };
  }

  /* ---------- quick start: four ready-made students and a random one (grades + interests only) ---------- */
  var SAMPLES = {
    sci: { pred: { chi: '4', eng: '4', math: '5', csd: 'attained', elect: [{ s: 'chem', lv: '5' }, { s: 'bio', lv: '5' }, { s: 'phys', lv: '4' }] }, cats: ['Science', 'Health'] },
    biz: { pred: { chi: '4', eng: '5', math: '4', csd: 'attained', elect: [{ s: 'bafs', lv: '4' }, { s: 'econ', lv: '5' }] }, cats: ['Business', 'SocialSciences'] },
    arts: { pred: { chi: '5', eng: '4', math: '3', csd: 'attained', elect: [{ s: 'chist', lv: '5' }, { s: 'chinlit', lv: '4' }, { s: 'hist', lv: '4' }] }, cats: ['Arts', 'Education'] },
    maker: { pred: { chi: '3', eng: '3', math: '3', csd: 'attained', elect: [{ s: 'ict', lv: '4' }, { s: 'phys', lv: '3' }] }, cats: ['Computing', 'Engineering', 'Design'] }
  };
  var SAMPLE_IDS = Object.keys(SAMPLES);
  var RANDOM_LEVELS = ['2', '3', '3', '4', '4', '4', '5', '5', '5*'];          // weighted toward 3–5
  var RANDOM_CATS = ['Science', 'Engineering', 'Computing', 'Business', 'Health', 'SocialSciences', 'Arts', 'Education', 'Law', 'Design'];
  // rand: a () => [0,1) function (the screens pass Math.random — these are inputs, not game luck)
  function randomStudent(rand) {
    function lv() { return RANDOM_LEVELS[Math.floor(rand() * RANDOM_LEVELS.length)]; }
    var pool = C().ELECTIVES.slice(), elect = [], k = 2 + Math.floor(rand() * 2);
    for (var i = 0; i < k; i++) elect.push({ s: pool.splice(Math.floor(rand() * pool.length), 1)[0], lv: lv() });
    return { pred: { chi: lv(), eng: lv(), math: lv(), csd: rand() < 0.97 ? 'attained' : 'notattained', elect: elect },
      cats: [RANDOM_CATS[Math.floor(rand() * RANDOM_CATS.length)]] };
  }

  /* ---------- 估一估: guesses before a reveal ---------- */
  var PAY_BANDS = [0, 15000, 20000, 25000, 35000];            // under 15k · 15–20k · 20–25k · 25–35k · 35k+
  function payBand(monthly) { var b = 0; PAY_BANDS.forEach(function (t, i) { if (monthly >= t) b = i; }); return b; }

  window.LifePathsFun = {
    AVATARS: AVATARS, AVATAR_IDS: AVATAR_IDS, avatarSVG: avatarSVG, drawAvatar: drawAvatar,
    DREAMS: DREAMS, DREAM_IDS: DREAM_IDS, METER_STARS: METER_STARS, dreamStars: dreamStars,
    PERSONA_IDS: PERSONA_IDS, MOD_IDS: MOD_IDS, persona: persona,
    SAMPLES: SAMPLES, SAMPLE_IDS: SAMPLE_IDS, randomStudent: randomStudent,
    PAY_BANDS: PAY_BANDS, payBand: payBand
  };
})();
