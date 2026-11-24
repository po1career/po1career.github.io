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

  /* ---------- "自己設計": a student-made avatar, built from parts in the same [path, fill] format ---------- */
  function f2(n) { return String(+(+n).toFixed(2)); }
  function ellRev(cx, cy, rx, ry) {                         // drawn the other way round: cuts a hole inside a shape
    return 'M' + f2(cx - rx) + ' ' + f2(cy) + 'a' + rx + ' ' + ry + ' 0 1 1 ' + f2(2 * rx) + ' 0a' + rx + ' ' + ry + ' 0 1 1 ' + f2(-2 * rx) + ' 0Z';
  }
  function ring(cx, cy, r1, r2) { return circ(cx, cy, r1) + ellRev(cx, cy, r2, r2); }
  function rrect(x, y, w, h, r, rev) {
    r = Math.min(r, w / 2, h / 2);
    var X = [x, x + r, x + w - r, x + w].map(f2), Y = [y, y + r, y + h - r, y + h].map(f2);
    if (!rev) return 'M' + X[1] + ' ' + Y[0] + 'L' + X[2] + ' ' + Y[0] + 'Q' + X[3] + ' ' + Y[0] + ' ' + X[3] + ' ' + Y[1] + 'L' + X[3] + ' ' + Y[2] +
      'Q' + X[3] + ' ' + Y[3] + ' ' + X[2] + ' ' + Y[3] + 'L' + X[1] + ' ' + Y[3] + 'Q' + X[0] + ' ' + Y[3] + ' ' + X[0] + ' ' + Y[2] +
      'L' + X[0] + ' ' + Y[1] + 'Q' + X[0] + ' ' + Y[0] + ' ' + X[1] + ' ' + Y[0] + 'Z';
    return 'M' + X[1] + ' ' + Y[0] + 'Q' + X[0] + ' ' + Y[0] + ' ' + X[0] + ' ' + Y[1] + 'L' + X[0] + ' ' + Y[2] + 'Q' + X[0] + ' ' + Y[3] + ' ' + X[1] + ' ' + Y[3] +
      'L' + X[2] + ' ' + Y[3] + 'Q' + X[3] + ' ' + Y[3] + ' ' + X[3] + ' ' + Y[2] + 'L' + X[3] + ' ' + Y[1] + 'Q' + X[3] + ' ' + Y[0] + ' ' + X[2] + ' ' + Y[0] + 'Z';
  }
  function star(cx, cy, r) {
    var p = '';
    for (var i = 0; i < 10; i++) {
      var a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r;
      p += (i ? 'L' : 'M') + f2(cx + rr * Math.cos(a)) + ' ' + f2(cy + rr * Math.sin(a));
    }
    return p + 'Z';
  }
  function mix(a, b, t) {                                   // blend two #RRGGBB colours
    var pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16), out = 0;
    [16, 8, 0].forEach(function (s) { var x = (pa >> s) & 255, y = (pb >> s) & 255; out |= Math.round(x + (y - x) * t) << s; });
    return '#' + ('000000' + out.toString(16)).slice(-6).toUpperCase();
  }
  // how many options each part has; the names live in life-paths-content.js (T.look.options). LOOK_BASE = the options
  // open to everyone; the rest (headwear 6–11, tops 6–8, extra 6, backgrounds 8–9) are unlocked by badges (UNLOCKS)
  var LOOK_BASE = { face: 4, skin: 6, hair: 10, hairCol: 8, eyes: 5, brows: 4, mouth: 5, glasses: 4, head: 6, top: 6, topCol: 8, extra: 6, bg: 8 };
  var LOOK = { face: 4, skin: 6, hair: 10, hairCol: 8, eyes: 5, brows: 4, mouth: 5, glasses: 4, head: 12, top: 9, topCol: 8, extra: 7, bg: 10 };
  var LOOK_PARTS = ['face', 'skin', 'hair', 'hairCol', 'eyes', 'brows', 'mouth', 'glasses', 'head', 'top', 'topCol', 'extra', 'bg'];
  var LOOK_COLOURS = {
    skin: ['#FCE3CF', '#F4CDAE', '#E8B48B', '#CF9466', '#A56C44', '#73482B'],
    hairCol: ['#2B2B2B', '#4A2F22', '#7A4B2A', '#D9B25F', '#B5562E', '#9AA0A6', '#4F7CC9', '#E58EB4'],
    topCol: ['#C9A24B', '#8BA888', '#6189A3', '#E07A7A', '#927BA0', '#3E4A5A', '#F2D27A', '#BD7D54'],
    bg: ['#F6EBD3', '#E7F0E4', '#E3EEF6', '#FBEFEF', '#EEE8F6', '#FDF0E2', '#FFF6D8', '#E8F1F6']
  };
  var DEFAULT_LOOK = { face: 0, skin: 1, hair: 0, hairCol: 0, eyes: 1, brows: 0, mouth: 0, glasses: 0, head: 0, top: 0, topCol: 2, extra: 1, bg: 2 };
  var EYE = '#2A1D17', TONGUE = '#E58E9E', WHITE = '#FFFDF8', FRAME = '#3B2A20';
  var FACES = [ell(32, 28, 13, 14), ell(32, 28.5, 12, 15), rrect(19, 14.5, 26, 27.5, 8),
    'M19 27C19 17.5 25 14 32 14C39 14 45 17.5 45 27C45 35 39.5 41 32 43C24.5 41 19 35 19 27Z'];
  var FRINGE = 'M18.6 28.5C17 15.5 24.5 10.5 32 10.5C39.5 10.5 47 15.5 45.4 28.5C44.5 23.5 42.5 20.5 39.5 19.2C35.5 21.6 28.5 21.6 24.5 19.6C21.8 21 19.6 24 18.6 28.5Z';
  var SLEEK = 'M18.6 27C17.2 15.5 24.6 10.6 32 10.6C39.4 10.6 46.8 15.5 45.4 27C43.2 21.4 38.4 18.4 32 18.4C25.6 18.4 20.8 21.4 18.6 27Z';
  // each hairstyle: [shapes behind the head, shapes in front]
  var HAIR = [
    [[], [FRINGE]],                                                                                   // 短髮
    [[], ['M18.5 29C16.6 15 25 10 33 10.4C41 10.8 47.2 15.6 45.6 29C44.8 24 43.2 21 40.2 19.6C33.5 19.2 26.5 21.2 21.2 25.4C20.1 26.6 19.2 27.6 18.5 29Z']],   // 側分
    [[], ['M17 31C16 13.5 24.5 9.5 32 9.5C39.5 9.5 48 13.5 47 31L44.6 31L44.6 23.2L19.4 23.2L19.4 31Z']],   // 冬菇頭
    [['M15 50L15 28C15 13.5 23 8.6 32 8.6C41 8.6 49 13.5 49 28L49 50C45.5 51.6 41.5 51.6 38 50L26 50C22.5 51.6 18.5 51.6 15 50Z'],
      ['M17 35C15.6 14.6 24 10.2 32 10.2C40 10.2 48.4 14.6 47 35L44.6 35C44.6 26.5 43.2 22.4 40.2 20.2C35.6 22.8 28.4 22.8 23.8 20.2C20.8 22.4 19.4 26.5 19.4 35Z']],   // 長直髮
    [[ell(14.5, 36, 4.2, 8.5), ell(49.5, 36, 4.2, 8.5)], [FRINGE]],                                   // 孖辮
    [['M43 15C52 12 57 22 54 33C52 39.5 47.5 41 45.5 37.5C49.5 32 49.5 22 43 15Z'], [SLEEK]],        // 馬尾
    [[circ(32, 9.6, 5.6)], [SLEEK]],                                                                  // 丸子頭
    [[circ(17.5, 30, 4), circ(46.5, 30, 4)], [ell(32, 17, 13, 7), circ(20.5, 22, 4.8), circ(23.5, 15.5, 5.2), circ(29, 12.2, 5.2),
      circ(35, 12.2, 5.2), circ(40.5, 15.5, 5.2), circ(43.5, 22, 4.8)]],                             // 曲髮
    [[], ['M19.2 24.5C19.2 15.5 25 12 32 12C39 12 44.8 15.5 44.8 24.5C42 20 37.5 18.2 32 18.2C26.5 18.2 22 20 19.2 24.5Z']],   // 陸軍裝
    [[], ['M18.6 27L18 17.4L22.4 19.4L23 11.2L27.4 15.2L31 8.6L34.6 14.6L39.2 10.6L40.6 17.6L45.6 15.6L45.4 27C43 21.6 38.2 19.6 32 19.6C25.8 19.6 21 21.6 18.6 27Z']]   // 刺蝟頭
  ];
  var HAPPY_L = 'M24 30.4Q26.5 26.9 29 30.4Q26.5 28.7 24 30.4Z', HAPPY_R = 'M35 30.4Q37.5 26.9 40 30.4Q37.5 28.7 35 30.4Z';
  var EYES = [
    [[circ(26.5, 29.6, 1.9), EYE], [circ(37.5, 29.6, 1.9), EYE]],                                    // 圓眼
    [[ell(26.5, 29.4, 2.3, 2.7), EYE], [ell(37.5, 29.4, 2.3, 2.7), EYE], [circ(27.3, 28.5, 0.85), WHITE], [circ(38.3, 28.5, 0.85), WHITE]],   // 亮晶晶
    [[HAPPY_L, EYE], [HAPPY_R, EYE]],                                                                 // 笑眼
    [[ell(26.5, 29.8, 2.5, 1.05), EYE], [ell(37.5, 29.8, 2.5, 1.05), EYE]],                          // 單眼皮
    [[circ(26.5, 29.6, 1.9), EYE], [HAPPY_R, EYE]]                                                    // 眨眼
  ];
  var BROWS = [
    ['M23.4 25.4Q26.5 23.4 29.6 25L29.4 26Q26.5 24.7 23.6 26.4Z', 'M34.4 25Q37.5 23.4 40.6 25.4L40.4 26.4Q37.5 24.7 34.6 26Z'],   // 自然
    [rrect(23.2, 23.9, 6.4, 2.1, 1.05), rrect(34.4, 23.9, 6.4, 2.1, 1.05)],                          // 粗眉
    ['M23.4 25.2Q26.5 21.6 29.6 24.6L29.3 25.5Q26.5 23 23.7 26.1Z', 'M34.4 24.6Q37.5 21.6 40.6 25.2L40.3 26.1Q37.5 23 34.7 25.5Z'],   // 彎眉
    []                                                                                                // 無
  ];
  var SMILE = 'M28.6 35.3Q32 38.9 35.4 35.3Q32 37.2 28.6 35.3Z';
  // each mouth: (lip colour, inside colour) → layers; both are darker on the deeper skin tones so they stay visible
  var MOUTHS = [
    function (lip) { return [[SMILE, lip]]; },                                                       // 微笑
    function (lip, inn) { return [['M28 35.2L36 35.2Q36 40.2 32 40.2Q28 40.2 28 35.2Z', inn], [ell(32, 38.7, 2.3, 1.2), TONGUE]]; },   // 大笑
    function (lip) { return [[rrect(29.4, 35.7, 5.2, 1.1, 0.55), lip]]; },                         // 抿嘴
    function (lip, inn) { return [[ell(32, 36.6, 1.7, 2.1), inn]]; },                               // 驚訝
    function (lip) { return [[SMILE, lip], [ell(33.1, 37.7, 1.5, 1.7), TONGUE]]; }                  // 吐舌
  ];
  var GLASSES = [
    [],
    [[ring(26.5, 29.6, 4.4, 3.6), FRAME], [ring(37.5, 29.6, 4.4, 3.6), FRAME], [rrect(30.6, 28.6, 2.8, 0.9, 0.45), FRAME]],   // 圓框
    [[rrect(21.6, 26.2, 9.8, 7, 2) + rrect(22.4, 27, 8.2, 5.4, 1.4, true), FRAME],
      [rrect(32.6, 26.2, 9.8, 7, 2) + rrect(33.4, 27, 8.2, 5.4, 1.4, true), FRAME], [rrect(31.2, 28.4, 1.8, 0.9, 0.45), FRAME]],   // 方框
    [[rrect(21.4, 26.6, 10, 6.2, 2.6), '#2E3440'], [rrect(32.6, 26.6, 10, 6.2, 2.6), '#2E3440'], [rrect(31, 28.2, 2.2, 0.9, 0.45), '#2E3440'],
      [rrect(23, 27.6, 3, 1, 0.5), '#5E6A7D'], [rrect(34.2, 27.6, 3, 1, 0.5), '#5E6A7D']]           // 太陽眼鏡
  ];
  var TORSO = 'M6.8 50C8.2 44.2 17 42.2 26.4 41.9Q32 46.6 37.6 41.9C47 42.2 55.8 44.2 57.2 50A31 31 0 0 1 6.8 50Z';
  var SHIRT = '#F9F8F2', SHIRT_SHADE = '#E4E2D6';
  // each top: (colour, darker colour) → layers
  var TOPS = [
    function (c, d) { return [[TORSO, '#D9D4C5'], ['M8 50.4C9.4 45 17.6 43.1 26.6 42.8Q32 47.4 37.4 42.8C46.4 43.1 54.6 45 56 50.4A30 30 0 0 1 8 50.4Z', SHIRT],
      ['M26.4 41.9L31.6 45.2L28.3 48Z', SHIRT_SHADE], ['M37.6 41.9L32.4 45.2L35.7 48Z', SHIRT_SHADE],
      ['M30.7 45L33.3 45L34.3 47.2L33 55.5L32 57L31 55.5L29.7 47.2Z', c], [rrect(30.4, 43.6, 3.2, 2.3, 0.9), d]]; },   // 校服
    function (c, d) { return [[TORSO, c], ['M26.4 41.9Q32 46.6 37.6 41.9L38.6 42.4Q32 48.4 25.4 42.4Z', d]]; },   // T 恤
    function (c, d) { return [[TORSO, c], ['M21.5 42.4Q32 50.5 42.5 42.4Q32 47.8 21.5 42.4Z', d],
      [rrect(29.6, 46.2, 0.9, 5.4, 0.45), WHITE], [rrect(33.5, 46.2, 0.9, 5.4, 0.45), WHITE]]; },     // 衛衣
    function (c, d) { return [[TORSO, c], ['M26.4 41.9L37.6 41.9L32 49.5Z', SHIRT], ['M26.4 41.9L30.4 44.6L28.2 46.4Z', SHIRT_SHADE],
      ['M37.6 41.9L33.6 44.6L35.8 46.4Z', SHIRT_SHADE], ['M25.6 42L32 50.6L38.4 42L37.4 41.9L32 49.2L26.6 41.9Z', d]]; },   // 冷衫
    function (c, d) { return [[TORSO, c], ['M26.4 41.9L37.6 41.9L32 51Z', SHIRT], ['M26.4 41.9L32 51L29.4 52.4L24.8 44Z', d],
      ['M37.6 41.9L32 51L34.6 52.4L39.2 44Z', d]]; },                                                 // 西裝外套
    function (c, d) { return [[TORSO, c], ['M26.4 41.9Q32 46.6 37.6 41.9L38.8 42.5Q32 48.6 25.2 42.5Z', WHITE],
      ['M11.5 46.4L15.4 44.8L18.6 53.6L14.7 55.2Z', WHITE], ['M48.6 44.8L52.5 46.4L49.3 55.2L45.4 53.6Z', WHITE]]; },   // 運動衫
    // unlocked by badges
    function (c, d) { return [[TORSO, c], ['M26.4 41.9Q32 46.6 37.6 41.9L38.8 42.5Q32 48.6 25.2 42.5Z', WHITE], [rrect(31.4, 46.5, 1.2, 15, 0.6), d],
      [circ(29.6, 50, 0.85), WHITE], [circ(29.6, 54.5, 0.85), WHITE], [circ(34.4, 50, 0.85), WHITE], [circ(34.4, 54.5, 0.85), WHITE]]; },   // 學會外套
    function (c, d) { return [[TORSO, '#D9D4C5'], ['M8 50.4C9.4 45 17.6 43.1 26.6 42.8Q32 47.4 37.4 42.8C46.4 43.1 54.6 45 56 50.4A30 30 0 0 1 8 50.4Z', SHIRT],
      ['M26.4 41.9L37.6 41.9L32 51Z', c], ['M26.4 41.9L32 51L29.4 52.4L24.8 44Z', SHIRT_SHADE], ['M37.6 41.9L32 51L34.6 52.4L39.2 44Z', SHIRT_SHADE],
      [rrect(40, 50, 6, 1.2, 0.6), '#D9D4C5'], [rrect(42, 47.4, 0.9, 3, 0.45), '#6189A3']]; },   // 實驗袍
    function (c, d) { return [[TORSO, c], [rrect(26, 41.6, 1.3, 4.5, 0.65), WHITE], [rrect(36.7, 41.6, 1.3, 4.5, 0.65), WHITE],
      ['M25 45L39 45L40.5 58L23.5 58Z', WHITE], [rrect(29, 51, 6, 3, 1), '#E9E6DA']]; }   // 圍裙
  ];
  var HEADS = [
    function () { return []; },
    function (c, d) { return [['M17.6 22.5C17.6 12.5 24 8.2 32 8.2C40 8.2 46.4 12.5 46.4 22.5Z', c],
      ['M17.2 21.4L46.8 21.4C51.8 21.4 55.2 22.6 54.8 24.4C50 25 30 25 17.2 24.2Z', d], [circ(32, 8.6, 1.3), d]]; },   // 鴨舌帽
    function (c, d) { return [['M16.8 24.6C16 11.4 24 7 32 7C40 7 48 11.4 47.2 24.6Z', c], [rrect(16.4, 20.6, 31.2, 5.2, 2.6), d],
      [circ(32, 6.6, 3.3), WHITE]]; },                                                                // 冷帽
    function () { return [[tri(42, 13.5, 36.8, 9.6, 37.2, 17.4), '#E07A7A'], [tri(42, 13.5, 47.2, 9.6, 46.8, 17.4), '#E07A7A'],
      [circ(42, 13.5, 1.9), '#C95F5F']]; },                                                           // 蝴蝶結
    function () { return [[star(40.5, 16.5, 3.2), '#F2C94C']]; },                                    // 星星髮夾
    function (c) { return [['M15.4 29A16.6 16.6 0 0 1 48.6 29L46.4 29A14.4 14.4 0 0 0 17.6 29Z', '#3E4A5A'],
      [rrect(13, 25, 6.2, 9.4, 2.8), c], [rrect(44.8, 25, 6.2, 9.4, 2.8), c]]; },                    // 耳機
    // unlocked by badges
    function () { return [['M21 15L21 21Q32 25 43 21L43 15Q32 19 21 15Z', '#3E4A5A'], ['M13.5 13L32 6L50.5 13L32 20Z', '#2E3440'],
      [rrect(46.4, 13, 1.2, 9, 0.6), '#E0B84A'], [circ(47, 22.6, 1.7), '#E0B84A']]; },             // 畢業帽
    function () { return [[rrect(17.5, 18.4, 29, 4.4, 2.2), WHITE], [circ(32, 20.6, 1.7), '#E07A7A'],
      [tri(45, 19, 50.5, 16.4, 50, 22.4), WHITE]]; },                                                   // 必勝頭帶
    function () { var g = '#5FA35A'; return [[circ(39.3, 15.3, 1.6), g], [circ(41.9, 15.3, 1.6), g], [circ(39.3, 17.9, 1.6), g],
      [circ(41.9, 17.9, 1.6), g], [rrect(40.3, 18.6, 0.7, 2.8, 0.35), '#3F7A3B']]; },              // 四葉草髮夾
    function () { return [['M16.5 24C16.5 12.5 23.5 7.5 32 7.5C40.5 7.5 47.5 12.5 47.5 24Z', '#F2C94C'],
      [rrect(14.5, 22.4, 35, 3.6, 1.8), '#E0B23A'], [rrect(30.6, 7.6, 2.8, 15, 1.4), '#E0B23A']]; },   // 安全帽
    function (c, d) { return [['M20 20C20 11 25 8.5 32 8.5C39 8.5 44 11 44 20Z', c], [rrect(20, 17.4, 24, 2.6, 1.3), d],
      ['M14.5 21.5Q32 17 49.5 21.5L47.5 25Q32 21.5 16.5 25Z', d]]; },                                 // 漁夫帽
    function () { return [['M21 19L21 9L26.5 14L32 7L37.5 14L43 9L43 19Z', '#F2C94C'], [circ(32, 15, 1.3), '#E07A7A'],
      [circ(25.6, 16, 1), '#6189A3'], [circ(38.4, 16, 1), '#6189A3']]; }                           // 皇冠
  ];
  // backgrounds 8–9 are pictures, not colours (unlocked by badges)
  var BG_PICTURES = [
    function () { return [[circ(32, 32, 31), '#FFF6E2'],                                            // 彩虹
      ['M7 46A25 25 0 0 1 57 46L53.5 46A21.5 21.5 0 0 0 10.5 46Z', '#F4A6A0'], ['M10.5 46A21.5 21.5 0 0 1 53.5 46L50 46A18 18 0 0 0 14 46Z', '#F7D58A'],
      ['M14 46A18 18 0 0 1 50 46L46.5 46A14.5 14.5 0 0 0 17.5 46Z', '#A8D5A2'], ['M17.5 46A14.5 14.5 0 0 1 46.5 46L43 46A11 11 0 0 0 21 46Z', '#9CC3E6']]; },
    function () { var s = '#F2E6A7'; return [[circ(32, 32, 31), '#2F3B5C'], [circ(14, 15, 4), s], [circ(16, 13.4, 3.8), '#2F3B5C'],   // 星空
      [star(50, 12, 1.5), s], [star(55, 28, 1.2), s], [star(9, 32, 1.3), s], [star(47, 20, 0.9), s], [star(22, 8, 0.9), s], [star(57, 40, 0.8), s]]; }
  ];
  var END_EXTRAS = [5, 6];                                    // drawn last, over hair and clothes (earrings, staff ID)
  // small extras on the cheeks (drawn under the eyes), earrings last
  var EXTRAS = [
    function () { return []; },
    function (skin) { var c = mix(skin, '#F0607A', 0.4); return [[circ(23.2, 33.6, 2.3), c], [circ(40.8, 33.6, 2.3), c]]; },   // 腮紅
    function (skin) { var c = mix(skin, INK, 0.4); return [[circ(22.8, 32.6, 0.6), c], [circ(24.5, 33.6, 0.6), c], [circ(22.4, 34.4, 0.55), c],
      [circ(41.2, 32.6, 0.6), c], [circ(39.5, 33.6, 0.6), c], [circ(41.6, 34.4, 0.55), c]]; },     // 雀斑
    function () { return [['M38.4 35.2L43.6 32.2L44.7 34.1L39.5 37.1Z', '#F0C27A'], ['M40.4 34.5L41.9 33.6L42.6 34.8L41.1 35.7Z', '#E0A458']]; },   // 膠布
    function () { return [[star(41, 34, 2), '#F2C94C']]; },                                          // 星星貼紙
    function () { return [[circ(18.6, 34.6, 1.2), '#E0B84A'], [circ(45.4, 34.6, 1.2), '#E0B84A']]; },   // 耳環
    function () { return [['M28.5 43L31.2 52L32.8 52L35.5 43L34.2 43L32 50L29.8 43Z', '#6189A3'], [rrect(29, 51.5, 6, 7.5, 1), WHITE],
      [rrect(30.2, 52.8, 2.2, 2.6, 0.4), '#9AA0A6'], [rrect(30.2, 56.2, 3.6, 0.7, 0.35), '#C9C4B5'], [rrect(33, 53.2, 1.4, 0.7, 0.35), '#C9C4B5']]; }   // 工作證
  ];
  function cleanLook(look) {
    var out = {};
    LOOK_PARTS.forEach(function (k) {
      var v = look && look[k];
      out[k] = typeof v === 'number' && v >= 0 && v < LOOK[k] && v === Math.floor(v) ? v : DEFAULT_LOOK[k];
    });
    return out;
  }
  // rand: a () => [0,1) function; glasses, headwear and extras are "none" half the time so random looks stay tidy;
  // only the options open to everyone (LOOK_BASE) — badge items are the student's to choose
  function randomLook(rand) {
    var out = {};
    LOOK_PARTS.forEach(function (k) {
      out[k] = (k === 'glasses' || k === 'head' || k === 'extra') && rand() < 0.5 ? 0 : Math.floor(rand() * LOOK_BASE[k]);
    });
    return out;
  }
  function lookLayers(look) {
    var k = cleanLook(look), skin = LOOK_COLOURS.skin[k.skin], hair = LOOK_COLOURS.hairCol[k.hairCol];
    var top = LOOK_COLOURS.topCol[k.topCol], dark = mix(top, INK, 0.3), shade = mix(skin, INK, 0.16), out = [];
    var deep = k.skin >= 4, lip = deep ? '#3A1F16' : '#8A4B3A', inside = deep ? '#3A1414' : '#7A3030';
    function put(list) { list.forEach(function (s) { out.push(s); }); }
    function paint(paths, c) { paths.forEach(function (d) { out.push([d, c]); }); }
    if (k.bg < LOOK_COLOURS.bg.length) out.push([circ(32, 32, 31), LOOK_COLOURS.bg[k.bg]]);
    else put(BG_PICTURES[k.bg - LOOK_COLOURS.bg.length]());
    paint(k.hair === 6 && (k.head === 1 || k.head === 2) ? [] : HAIR[k.hair][0], hair);           // a bun hides under a cap or beanie
    if (k.hair === 4) put([[circ(15.5, 27.5, 1.9), '#E07A7A'], [circ(48.5, 27.5, 1.9), '#E07A7A']]);   // pigtail ties
    put([[rrect(28, 37, 8, 10, 3), skin], [ell(32, 39.5, 4, 1.6), shade]]);                           // neck + chin shadow
    put(TOPS[k.top](top, dark));
    put([[ell(19, 29, 2.6, 3.6), skin], [ell(45, 29, 2.6, 3.6), skin], [FACES[k.face], skin], [ell(32, 32.7, 1.2, 0.85), shade]]);
    if (END_EXTRAS.indexOf(k.extra) < 0) put(EXTRAS[k.extra](skin));
    put(EYES[k.eyes]);
    paint(BROWS[k.brows], mix(hair, INK, 0.25));
    put(MOUTHS[k.mouth](lip, inside));
    paint(HAIR[k.hair][1], hair);
    put(GLASSES[k.glasses]);
    put(HEADS[k.head](top, dark));
    if (END_EXTRAS.indexOf(k.extra) >= 0) put(EXTRAS[k.extra](skin));
    return out;
  }

  /* ---------- badges: earned across games (saved on the device by the screens); each unlocks one avatar item ---------- */
  var BADGES = ['offer', 'comeback', 'clearing', 'vocational', 'world', 'society', 'firstJob', 'learner', 'boss', 'balanced', 'dream', 'whatIf'];
  var BALANCED = 55;                                          // 五項均衡: every meter at least this at the end (~1 life in 8)
  var UNLOCKS = {                                             // badge → the item it unlocks (part + option number)
    offer: { part: 'head', v: 6 }, comeback: { part: 'head', v: 7 }, clearing: { part: 'head', v: 8 }, vocational: { part: 'head', v: 9 },
    world: { part: 'head', v: 10 }, dream: { part: 'head', v: 11 }, society: { part: 'top', v: 6 }, learner: { part: 'top', v: 7 },
    boss: { part: 'top', v: 8 }, firstJob: { part: 'extra', v: 6 }, balanced: { part: 'bg', v: 8 }, whatIf: { part: 'bg', v: 9 }
  };
  // the badge an avatar option needs, or null if it is open to everyone
  function lockedBy(part, v) {
    for (var i = 0; i < BADGES.length; i++) { var u = UNLOCKS[BADGES[i]]; if (u.part === part && u.v === v) return BADGES[i]; }
    return null;
  }
  // the badges one game earns. story: { offer (a Main Round offer), retake, clearing } from chapter 1; dream: the dream id.
  // 如果當初 (whatIf) is earned on the summary screen, not here. l may be null (no life played).
  function badgesFor(l, story, dream) {
    var got = [];
    if (story && story.offer) got.push('offer');
    if (story && story.retake) got.push('comeback');
    if (story && story.clearing) got.push('clearing');
    if (!l) return got;
    var route = l.decisions[0] && l.decisions[0].data.route;
    if (/^(vtc|dae|subdeg)$/.test(route) && l.creds.some(function (c) { return c.level === 'subdegree' || c.level === 'dae'; })) got.push('vocational');
    if (L().wentAway(l)) got.push('world');
    if (l.decisions.some(function (d) { return d.key === 'event' && d.data.id === 'society' && d.data.choice !== 1; })) got.push('society');
    if (l.log.some(function (e) { return e.key === 'gotJob'; })) got.push('firstJob');
    if (l.creds.some(function (c) { return c.partTime || c.level === 'masters'; })) got.push('learner');
    if (l.log.some(function (e) { return e.key === 'bizWin'; })) got.push('boss');
    if (L().METERS.every(function (k) { return l.meters[k] >= BALANCED; })) got.push('balanced');
    if (dream && dreamStars(l, dream) === 3) got.push('dream');
    return got;
  }
  // who: an animal id, or the player's { avatar, look } ("custom" = the student's own design)
  function layersOf(who) {
    if (who && typeof who === 'object') return who.avatar === 'custom' ? lookLayers(who.look) : AVATARS[who.avatar] || AVATARS.cat;
    return AVATARS[who] || AVATARS.cat;
  }
  // vb: an optional viewBox to zoom in (the creator's thumbnails show just the part that changes)
  function avatarSVG(who, size, label, vb) {
    return '<svg viewBox="' + (vb || '0 0 64 64') + '" width="' + size + '" height="' + size + '"' + (label ? ' role="img" aria-label="' + label + '"' : ' aria-hidden="true"') + '>' +
      layersOf(who).map(function (s) { return '<path d="' + s[0] + '" fill="' + s[1] + '"/>'; }).join('') + '</svg>';
  }
  function drawAvatar(ctx, who, x, y, size) {
    var a = layersOf(who);
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
      // study outside HK, an exchange, a posting abroad or a working holiday
      return Math.min(3, (L().wentAway(l) ? 2 : 0) + (l.meters.connections >= 60 ? 1 : 0));
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
      : l.decisions.some(function (d) { return d.key === 'event' && /^(exchange|posting)$/.test(d.data.id) && L().wentAway({ decisions: [d] }); }) ||
        l.decisions.some(function (d) { return d.key === 'branch' && d.data.opt === 'whs'; }) ? 'exchange'
      : L().topCred(l) === 'masters' ? 'masters' : null;
    return { id: id, mod: mod };
  }

  /* ---------- 同屆 100 人: classmates with the same predicted grades, JUPAS list and mode, each with their own luck,
     two strengths and choices — how differently the same start can turn out. Pure: the same seed always gives the
     same classmates, and the student's own game is never touched. Simplifications (ILLUSTRATIVE): first sitting only,
     no Clearing Round or retake; without an offer a classmate picks an open route by the weights below. ---------- */
  var COHORT_N = 100;
  var COHORT_ROUTES = { selffin: 3, subdeg: 3, vtc: 3, dae: 1, mainland: 0.5, overseas: 0.5, work: 1 };
  var COHORT_FIELDS = ['Business', 'SocialSciences', 'Science', 'Arts', 'Engineering', 'Education', 'Computing', 'Design', 'Health'];
  // at a turning point most classmates go straight to work (a uniform pick would send a third into a master's)
  var COHORT_BRANCH = { work: 6, masters: 2, whs: 1, senior: 4, topup: 3, subdeg: 3, vtc: 3 };
  function weighted(options, weights, u) {
    var total = options.reduce(function (a, o) { return a + (weights[o] || 1); }, 0), x = u * total;
    for (var i = 0; i < options.length; i++) { x -= weights[options[i]] || 1; if (x < 0) return options[i]; }
    return options[options.length - 1];
  }
  function cohort(pred, list, mode, seed, db, dream, n) {
    var Co = C(), Lf = L(), out = [];
    for (var i = 0; i < (n || COHORT_N); i++) {
      var s = seed + '|mate' + i, k = 0;
      var rand = function () { k++; return Co.uniform(s, 'mate|' + k); };
      var actual = Co.resultsDay(pred, s).actual, offer = Co.mainRound(list, actual, db, s).offer, route = 'degree';
      if (!offer) {
        var open = Co.routeOptions(actual, null).filter(function (o) { return o.available && COHORT_ROUTES[o.id]; });
        var u = rand() * open.reduce(function (a, o) { return a + COHORT_ROUTES[o.id]; }, 0);
        route = open.length ? open[open.length - 1].id : 'work';
        for (var j = 0; j < open.length; j++) { u -= COHORT_ROUTES[open[j].id]; if (u < 0) { route = open[j].id; break; } }
      }
      var prog = offer ? db.byCode[offer.code] : null;
      var field = prog ? (prog.categories && prog.categories[0]) || 'Business' : COHORT_FIELDS[Math.floor(rand() * COHORT_FIELDS.length)];
      if (!prog && field === 'Medicine') field = 'Health';
      var ids = Lf.STRENGTH_IDS.slice(), st = [ids.splice(Math.floor(rand() * ids.length), 1)[0]];
      st.push(ids[Math.floor(rand() * ids.length)]);
      var l = Lf.start({ seed: s, mode: mode, route: route, field: field, offer: offer, prog: prog, actual: actual, startAge: 18, strengths: st, wish: null });
      for (var t = 0; t < 300 && l.pend.type !== 'end'; t++) {
        var p = l.pend;
        if (p.type === 'focus') { var fo = Lf.focusOptions(l); Lf.chooseFocus(l, fo[Math.floor(rand() * fo.length)]); }
        else if (p.type === 'event') {
          var oc = Lf.openChoices(l, p.id);
          // a part-time master's while working: about one classmate in four says yes
          Lf.chooseEvent(l, p.id === 'masters' ? (rand() < 0.25 ? 0 : 1) : oc[Math.floor(rand() * oc.length)]);
        } else Lf.chooseBranch(l, weighted(p.options, COHORT_BRANCH, rand()));
      }
      out.push({ offer: !!offer, route: route, top: Lf.topCred(l), pay: l.job ? l.job.monthly : null,
        stars: dream ? dreamStars(l, dream) : null, age: l.age });
    }
    return out;
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

  /* ---------- the comic ending: four panels read from a finished life (the screens draw them on a canvas) ---------- */
  // 1 results day · 2 the first path (a scene per route) · 3 the first real decision (a turning point or an event with
  // a choice; else a graduation) · 4 now (working or studying)
  var ROUTE_SCENE = { degree: 'campus', selffin: 'campus', mainland: 'campus', overseas: 'campus', subdeg: 'workshop', vtc: 'workshop',
    dae: 'workshop', work: 'office', retake: 'desk' };
  var COMIC_SCENES = ['results', 'campus', 'workshop', 'office', 'desk', 'crossroads', 'moment', 'milestone', 'work', 'study'];
  function comicPanels(l, story) {
    var first = l.decisions[0], route = first.data.route;
    // the turning point: a choice of path (e.g. after graduating) if there was one, else an event after the first year
    var turn = l.decisions.filter(function (d) { return d.key === 'branch'; })[0] ||
      l.decisions.filter(function (d) { return d.key === 'event' && d.age > first.age; })[0] ||
      l.decisions.filter(function (d) { return d.key === 'event'; })[0];
    var grad = l.log.filter(function (e) { return e.key === 'graduated'; })[0];
    var p3 = turn ? { scene: turn.key === 'branch' ? 'crossroads' : 'moment', age: turn.age, decision: turn }
      : grad ? { scene: 'milestone', age: grad.age, log: grad } : { scene: 'moment', age: Math.min(l.age, first.age + 1), decision: null };
    return [
      { scene: 'results', age: first.age, offer: !!(story && story.offer), clearing: !!(story && story.clearing), retake: !!(story && story.retake) },
      { scene: ROUTE_SCENE[route] || 'campus', age: first.age, route: route },
      p3,
      { scene: l.job ? 'work' : 'study', age: l.age }
    ];
  }

  // 每日人生: the "student of the day" — grades and interests drawn from the date, so everyone playing that day starts
  // the same (ymd = 'YYYY-MM-DD' on the device; the game's seed is 'day-' + ymd, so the luck is shared too)
  function dailyStudent(ymd) {
    var k = 0;
    return randomStudent(function () { k++; return C().uniform('day-' + ymd, 'student|' + k); });
  }

  /* ---------- 估一估: guesses before a reveal ---------- */
  var PAY_BANDS = [0, 15000, 20000, 25000, 35000];            // under 15k · 15–20k · 20–25k · 25–35k · 35k+
  function payBand(monthly) { var b = 0; PAY_BANDS.forEach(function (t, i) { if (monthly >= t) b = i; }); return b; }

  window.LifePathsFun = {
    AVATARS: AVATARS, AVATAR_IDS: AVATAR_IDS, avatarSVG: avatarSVG, drawAvatar: drawAvatar,
    LOOK: LOOK, LOOK_BASE: LOOK_BASE, LOOK_PARTS: LOOK_PARTS, LOOK_COLOURS: LOOK_COLOURS, DEFAULT_LOOK: DEFAULT_LOOK,
    BADGES: BADGES, BALANCED: BALANCED, UNLOCKS: UNLOCKS, lockedBy: lockedBy, badgesFor: badgesFor,
    COHORT_N: COHORT_N, COHORT_ROUTES: COHORT_ROUTES, cohort: cohort, dailyStudent: dailyStudent,
    COMIC_SCENES: COMIC_SCENES, comicPanels: comicPanels,
    cleanLook: cleanLook, randomLook: randomLook, lookLayers: lookLayers, layersOf: layersOf,
    DREAMS: DREAMS, DREAM_IDS: DREAM_IDS, METER_STARS: METER_STARS, dreamStars: dreamStars,
    PERSONA_IDS: PERSONA_IDS, MOD_IDS: MOD_IDS, persona: persona,
    SAMPLES: SAMPLES, SAMPLE_IDS: SAMPLE_IDS, randomStudent: randomStudent,
    PAY_BANDS: PAY_BANDS, payBand: payBand
  };
})();
