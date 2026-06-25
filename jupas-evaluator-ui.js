/* JUPAS All-in-One Evaluator (TEACHER) — UI + passcode gate.
   Loads after jupas-evaluator-engine.js and jupas-evaluator-analytics.js.
   Gate mirrors po1career's jupas-choices.js: PBKDF2-SHA256 150k + AES-GCM-256,
   decrypting jupas-evaluator-db.enc.json into the in-memory programmes DB.
   Adapted from JUPASCal (MIT, © 2026 JUPASCal) — see LICENSE. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var PROGRAMMES = null, BY_CODE = new Map();
  var DSE_PTS = { '5**': 7, '5*': 6, '5': 5, '4': 4, '3': 3, '2': 2, '1': 1, 'U': 0, '': 0 };
  var ELECT_LABEL = { bafs: 'BAFS', bio: 'Biology', chem: 'Chemistry', chist: 'Chinese History', chinlit: 'Chinese Literature', econ: 'Economics', geog: 'Geography', hist: 'History', ict: 'ICT', m2: 'Maths Ext. (M2)', phys: 'Physics' };
  var CORE_LABEL = { chi: 'Chinese Language', eng: 'English Language', math: 'Mathematics (Compulsory)' };
  var CMP_BAND = { aboveUQ: 'above-uq', aboveM: 'above-median', aboveLQ: 'above-lq', belowLQ: 'below-lq', nodata: 'no-score' };
  var BAND_LABEL = { 'above-uq': '≥ UQ', 'above-median': 'Median–UQ', 'above-lq': 'LQ–Median', 'below-lq': '< LQ', 'no-score': 'No data' };
  var SAFETY = { 'above-uq': ['Very safe', 'p-safe'], 'above-median': ['Safe', 'p-safe'], 'above-lq': ['Moderate', 'p-mod'], 'below-lq': ['Risky', 'p-risky'], 'no-score': ['Unknown', 'p-unk'] };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function flash(t, ok) { var e = $('msg'); if (!e) return; e.textContent = t; e.className = 'msg ' + (ok ? 'ok' : 'err'); }
  function indexProgrammes(arr) { PROGRAMMES = arr; BY_CODE = new Map(); arr.forEach(function (p) { BY_CODE.set(p.jupas_code.toUpperCase(), p); }); }

  /* ---------- passcode gate (PBKDF2 + AES-GCM, same as jupas-choices.js) ---------- */
  var PBKDF2_ITER = 150000, GATE_LS = 'jupas_eval_pass', ENC_URL = 'jupas-evaluator-db.enc.json', encBlob = null;
  function b64ToBytes(b64) { return Uint8Array.from(atob(b64), function (c) { return c.charCodeAt(0); }); }
  function deriveKey(passcode, salt) {
    return crypto.subtle.importKey('raw', new TextEncoder().encode(passcode), 'PBKDF2', false, ['deriveKey'])
      .then(function (base) {
        return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: salt, iterations: PBKDF2_ITER, hash: 'SHA-256' },
          base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
      });
  }
  function decryptDb(passcode) {
    return deriveKey(passcode, b64ToBytes(encBlob.salt)).then(function (key) {
      return crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64ToBytes(encBlob.iv) }, key, b64ToBytes(encBlob.data));
    }).then(function (plain) { return JSON.parse(new TextDecoder().decode(plain)); });
  }
  function tryUnlock(passcode, remember) {
    return decryptDb(passcode).then(function (arr) {
      indexProgrammes(arr);
      if (remember) { try { localStorage.setItem(GATE_LS, passcode); } catch (e) {} }
      $('lock').style.display = 'none'; $('app').style.display = '';
      $('db-status').textContent = 'Database unlocked: ' + arr.length + ' programmes.'; $('db-status').className = 'msg ok';
      return true;
    }).catch(function () { try { localStorage.removeItem(GATE_LS); } catch (e) {} return false; });
  }
  function showLock(msg) { $('app').style.display = 'none'; $('lock').style.display = 'flex'; $('lock-err').textContent = msg || ''; }
  function wireLock() {
    function submit() {
      var pc = $('passcode').value; if (!pc) return;
      $('lock-err').textContent = 'Checking…';
      tryUnlock(pc, true).then(function (ok) { if (!ok) { $('lock-err').textContent = 'Incorrect passcode 通行碼錯誤'; $('passcode').value = ''; } });
    }
    $('unlock-btn').addEventListener('click', submit);
    $('passcode').addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });
  }
  function initGate() {
    wireLock();
    fetch(ENC_URL, { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (j) {
      encBlob = j;
      var saved = null; try { saved = localStorage.getItem(GATE_LS); } catch (e) {}
      if (saved) return tryUnlock(saved, false).then(function (ok) { if (!ok) showLock(''); });
      showLock('');
    }).catch(function () { showLock('Could not load the encrypted database file.'); });
  }

  /* ---------- PDF parsing ---------- */
  function parsePdf(file, cb) {
    if (file.size > 5 * 1024 * 1024) { flash('File too large — upload the small PDF the page exported.', false); return; }
    var rd = new FileReader();
    rd.onload = function () {
      try {
        var buf = new Uint8Array(rd.result), str = '';
        for (var i = 0; i < buf.length; i++) str += String.fromCharCode(buf[i]);
        var m = str.match(/JCDATA:([A-Za-z0-9+\/=]+)/);
        if (!m) { flash('No JUPAS data found in that PDF. Make sure it was exported by the student page.', false); return; }
        cb(JSON.parse(decodeURIComponent(escape(atob(m[1])))));
      } catch (e) { flash('Could not read data from that PDF.', false); }
    };
    rd.onerror = function () { flash('Could not read that file.', false); };
    rd.readAsArrayBuffer(file);
  }

  /* ---------- rendering ---------- */
  function render(payload) {
    if (!PROGRAMMES) { flash('Database not unlocked.', false); return; }
    flash('', true);
    var grades = window.JUPASEngine.gradesFromPdfPayload(payload);

    $('meta').innerHTML = '<span><b>Name:</b> ' + esc(payload.name || '—') + '</span>' +
      '<span><b>Class:</b> ' + esc(payload.klass || '—') + '</span>' +
      '<span><b>Class no.:</b> ' + esc(payload.cno || '—') + '</span>' +
      '<span><b>Generated:</b> ' + esc(payload.generated || '—') + '</span>';
    var rows = '<tr><th>Subject</th><th>Level</th><th>Pts (7-scale)</th></tr>', entries = [];
    ['chi', 'eng', 'math'].forEach(function (k) { var lv = (payload.core || {})[k]; if (lv) { entries.push([CORE_LABEL[k], lv]); rows += '<tr><td>' + esc(CORE_LABEL[k]) + '</td><td>' + esc(lv) + '</td><td>' + DSE_PTS[lv] + '</td></tr>'; } });
    (payload.elect || []).forEach(function (e) { if (e && e.lv) { var nm = ELECT_LABEL[e.s] || 'Elective'; entries.push([nm, e.lv]); rows += '<tr><td>' + esc(nm) + '</td><td>' + esc(e.lv) + '</td><td>' + DSE_PTS[e.lv] + '</td></tr>'; } });
    $('grades-tbl').innerHTML = rows;
    var best5 = entries.map(function (e) { return DSE_PTS[e[1]] || 0; }).sort(function (a, b) { return b - a; }).slice(0, 5).reduce(function (a, b) { return a + b; }, 0);
    $('b5').textContent = 'Best-5 (common 7-point scale): ' + best5;

    var evalAll = window.JUPASEngine.evaluateAll(PROGRAMMES, grades);
    var choices = (payload.choices || []).map(function (c, i) { c = c || {}; return { code: (c.code || '').trim(), intake: c.intake, score: c.score, cmp: c.cmp, remark: c.remark, no: i + 1, _raw: c }; });

    renderChoices(choices, evalAll);
    var strat = window.JUPASAnalytics.listStrategy(choices, evalAll);
    renderOverview(strat); renderFlags(strat); renderNotes(strat, choices, evalAll);
    var chosen = choices.filter(function (c) { return c.code; }).map(function (c) { return c.code; });
    renderSuggestions(window.JUPASAnalytics.suggestions(PROGRAMMES, grades, chosen, 12));

    $('results').classList.remove('hidden');
    $('results').scrollIntoView({ behavior: 'smooth' });
  }

  function renderChoices(choices, evalAll) {
    var box = $('choices'); box.innerHTML = ''; var lastBand = '';
    choices.forEach(function (c) {
      var band = window.JUPASAnalytics.placedBand(c.no);
      if (band !== lastBand) { lastBand = band; var sep = document.createElement('div'); sep.className = 'band-sep'; sep.textContent = 'Band ' + band + ' · choices ' + (band === 'A' ? '1–3' : band === 'B' ? '4–6' : band === 'C' ? '7–10' : band === 'D' ? '11–15' : '16–20'); box.appendChild(sep); }
      if (!c.code) { var empty = document.createElement('div'); empty.className = 'choice'; empty.style.opacity = .5; empty.innerHTML = '<div class="ch-head"><span class="ch-badge">' + band + c.no + '</span><span class="ch-inst">(empty)</span></div>'; box.appendChild(empty); return; }
      var ev = evalAll.get(c.code.toUpperCase());
      var div = document.createElement('div'); div.className = 'choice band-' + band + (ev && !ev.eligibility.eligible ? ' inelig' : '');
      if (!ev) { div.innerHTML = '<div class="ch-head"><span class="ch-badge">' + band + c.no + '</span><span class="ch-code">' + esc(c.code) + '</span><span class="warn-inline">Not found in database</span></div>'; box.appendChild(div); return; }
      var p = ev.programme, chance = window.JUPASAnalytics.chanceForChoice(ev, c.no);
      var h = '<div class="ch-head"><span class="ch-badge">' + band + c.no + '</span><span class="ch-code">' + esc(p.jupas_code) + '</span>' +
        '<span class="ch-name">' + esc(p.name_en || '') + '</span><span class="ch-inst">' + esc(p.institution || '') + '</span>' +
        (p.jupas_url ? '<a class="ch-link" href="' + esc(p.jupas_url) + '" target="_blank" rel="noopener">JUPAS ↗</a>' : '') + '</div>';
      var ref = window.JUPASEngine.refScores(p);
      var medComp = ev.comparisons.find(function (x) { return x.key === 'median'; }) || ev.comparisons.find(function (x) { return x.key === 'mean' || x.key === 'expected_score'; });
      var saf = SAFETY[ev.band] || SAFETY['no-score'];
      var studentScore = parseFloat(c.score);
      var mismatch = (!isNaN(studentScore) && ev.calculation.totalScore) && Math.abs(studentScore - ev.calculation.totalScore) > 1.5;
      var chanceCls = { 'Strong': 'p-safe', 'Likely': 'p-safe', 'Possible': 'p-mod', 'Stretch': 'p-mod', 'Unlikely': 'p-risky', 'Ineligible': 'p-inelig', 'Unknown': 'p-unk' }[chance.label] || 'p-unk';
      var m = '<div class="metrics">';
      m += '<div class="metric"><div class="k">Eligible</div><div class="v"><span class="pill ' + (ev.eligibility.eligible ? 'p-elig' : 'p-inelig') + '">' + (ev.eligibility.eligible ? 'Yes' : 'No') + '</span></div></div>';
      m += '<div class="metric"><div class="k">Computed score</div><div class="v">' + ev.calculation.totalScore + (mismatch ? ' <span class="warn-inline">⚠ vs ' + esc(c.score) + '</span>' : (c.score ? ' <span style="color:var(--muted);font-weight:600">(said ' + esc(c.score) + ')</span>' : '')) + '</div></div>';
      m += '<div class="metric"><div class="k">Position</div><div class="v"><span class="pill p-' + (ev.band === 'above-uq' ? 'uq' : ev.band === 'above-median' ? 'median' : ev.band === 'above-lq' ? 'lq' : ev.band === 'below-lq' ? 'below' : 'na') + '">' + BAND_LABEL[ev.band] + '</span>' + (medComp ? ' <span style="color:var(--muted)">Δmed ' + (medComp.delta >= 0 ? '+' : '') + medComp.delta.toFixed(1) + '</span>' : '') + '</div></div>';
      m += '<div class="metric"><div class="k">Safety</div><div class="v"><span class="pill ' + saf[1] + '">' + saf[0] + '</span></div></div>';
      m += '<div class="metric"><div class="k">Chance (as placed)</div><div class="v"><span class="pill ' + chanceCls + '">' + chance.label + '</span></div></div>';
      m += '<div class="metric"><div class="k">Ref median / LQ</div><div class="v">' + (ref.median != null ? ref.median : '—') + (ref.lq != null ? ' / ' + ref.lq : '') + (ref.source !== 'actual' && ref.median != null ? ' <span style="color:var(--muted)">(' + ref.source + ')</span>' : '') + '</div></div>';
      var comp = chance.competition;
      m += '<div class="metric"><div class="k">Quota / competition</div><div class="v">' + (p.quota != null ? p.quota : '—') + (comp ? ' · ' + comp.ratio.toFixed(0) + ' applicants/place' : '') + '</div></div>';
      var dep = chance.dependency;
      m += '<div class="metric"><div class="k">Band-A offer share</div><div class="v">' + (dep ? Math.round(dep.share * 100) + '%' : '—') + '</div></div>';
      m += '</div>';
      var r = '<ul class="reasons">';
      chance.reasons.forEach(function (x) { r += '<li>' + esc(x) + '</li>'; });
      if (!ev.eligibility.eligible) { var fails = ev.eligibility.details.filter(function (d) { return !d.pass; }).map(function (d) { return d.label + ' (need ' + d.need + ', got ' + d.got + ')'; }); r += '<li class="warn-inline">Fails: ' + esc(fails.join('; ')) + '</li>'; }
      if (c.cmp && CMP_BAND[c.cmp] && CMP_BAND[c.cmp] !== ev.band && ev.band !== 'no-score') { r += '<li class="warn-inline">Student self-assessed position (' + esc(BAND_LABEL[CMP_BAND[c.cmp]]) + ') differs from computed (' + esc(BAND_LABEL[ev.band]) + ')</li>'; }
      if (c.remark) r += '<li>Student remark: ' + esc(c.remark) + '</li>';
      r += '</ul>';
      div.innerHTML = h + m + r; box.appendChild(div);
    });
  }

  function renderOverview(strat) {
    var s = strat.stats;
    var chips = [['p-na', s.filled + '/20 filled'], ['p-elig', s.eligible + ' eligible'], s.ineligible ? ['p-inelig', s.ineligible + ' ineligible'] : null,
      ['p-safe', s.safe + ' safe'], ['p-mod', s.moderate + ' moderate'], ['p-risky', s.risky + ' reach'], s.unknown ? ['p-unk', s.unknown + ' no data'] : null].filter(Boolean);
    $('overview-chips').innerHTML = chips.map(function (c) { return '<span class="pill ' + c[0] + '">' + esc(c[1]) + '</span>'; }).join('');
  }
  function renderFlags(strat) {
    var box = $('flags');
    if (!strat.flags.length) { box.innerHTML = '<div class="flag ok">No structural problems detected in the choice list.</div>'; return; }
    box.innerHTML = strat.flags.map(function (f) { return '<div class="flag ' + f.level + '">' + esc(f.text) + '</div>'; }).join('');
  }
  function renderNotes(strat, choices, evalAll) {
    $('notes').innerHTML = window.JUPASAnalytics.counselingNotes(strat, choices, evalAll).map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('');
  }
  function renderSuggestions(list) {
    var box = $('suggestions');
    if (!list.length) { box.innerHTML = '<div class="hint">No additional at/above-median eligible programmes found.</div>'; return; }
    box.innerHTML = list.map(function (s) {
      return '<div class="sugg"><span class="code">' + esc(s.code) + '</span>' +
        '<span style="flex:1;min-width:220px">' + esc(s.prog.name_en || '') + ' <span class="ch-inst">' + esc(s.prog.institution) + '</span></span>' +
        '<span>your ' + s.yourScore + ' vs median ' + (s.median != null ? s.median : '—') + ' <span class="pill p-safe">+' + (s.pct || 0).toFixed(0) + '%</span></span>' +
        (s.prog.jupas_url ? ' <a class="ch-link" href="' + esc(s.prog.jupas_url) + '" target="_blank" rel="noopener">↗</a>' : '') + '</div>';
    }).join('');
  }

  /* ---------- wire upload ---------- */
  function wireUpload() {
    var drop = $('drop'), file = $('file');
    file.addEventListener('change', function (e) { if (e.target.files[0]) parsePdf(e.target.files[0], render); });
    ['dragover', 'dragenter'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('drag'); }); });
    ['dragleave', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('drag'); }); });
    drop.addEventListener('drop', function (e) { var f = e.dataTransfer.files[0]; if (f) parsePdf(f, render); });
  }

  initGate();
  wireUpload();
  window.__renderPayload = render;
})();
