/* Staff area loader — intentionally generic. v2: per-teacher key slots.
   Fetches jupas-eval.enc.json: the payload is AES-GCM-encrypted under a random master key;
   each authorised user has a "slot" holding that master key wrapped under PBKDF2-SHA256
   ("<userid>:<password>", 150k iterations). Sign-in = unwrap own slot -> decrypt payload
   { css, html, js } -> inject and run. Removing a user from the build (which also rotates
   the master key) deactivates their credentials. Nothing exists here as plaintext. */
(function () {
'use strict';

var PBKDF2_ITER = 150000, AUTH_LS = 'jupas_eval_auth';
var encBlob = null, started = false;

function $(id) { return document.getElementById(id); }
function b64ToBytes(b64) { return Uint8Array.from(atob(b64), function (c) { return c.charCodeAt(0); }); }

function deriveKEK(uid, pw, salt) {
  return crypto.subtle.importKey('raw', new TextEncoder().encode(uid + ':' + pw), 'PBKDF2', false, ['deriveKey'])
    .then(function (base) {
      return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: salt, iterations: PBKDF2_ITER, hash: 'SHA-256' },
        base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    });
}

function decryptWith(uid, pw) {
  var slot = (encBlob.slots || {})[uid];
  if (!slot) return Promise.reject(new Error('no slot'));
  return deriveKEK(uid, pw, b64ToBytes(slot.salt))
    .then(function (kek) {
      return crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64ToBytes(slot.iv) }, kek, b64ToBytes(slot.wrapped));
    })
    .then(function (masterRaw) {
      return crypto.subtle.importKey('raw', masterRaw, 'AES-GCM', false, ['decrypt']);
    })
    .then(function (master) {
      return crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64ToBytes(encBlob.iv) }, master, b64ToBytes(encBlob.data));
    })
    .then(function (plain) { return new TextDecoder().decode(plain); });
}

function boot(plaintext) {
  if (started) return;
  started = true;
  var p = JSON.parse(plaintext);
  var st = document.createElement('style');
  st.textContent = p.css;
  document.head.appendChild(st);
  $('app').innerHTML = p.html;
  $('lock').style.display = 'none';
  $('app').style.display = '';
  /* AES-GCM is authenticated: this code cannot have been altered without a valid key. */
  (0, eval)(p.js);
}

function tryUnlock(uid, pw, remember) {
  uid = (uid || '').trim().toLowerCase();
  if (!uid || !pw) return Promise.resolve(false);
  return decryptWith(uid, pw).then(function (plain) {
    if (remember) {
      try { localStorage.setItem(AUTH_LS, JSON.stringify({ u: uid, p: pw })); } catch (e) {}
    }
    boot(plain);
    return true;
  }).catch(function () {
    try { localStorage.removeItem(AUTH_LS); } catch (e) {}
    return false;
  });
}

function showLock(msg) {
  $('app').style.display = 'none';
  $('lock').style.display = 'flex';
  $('lock-err').textContent = msg || '';
}

function wireLock() {
  function submit() {
    var uid = $('userid').value, pw = $('passcode').value;
    if (!uid || !pw) return;
    $('lock-err').textContent = '';
    tryUnlock(uid, pw, true).then(function (ok) {
      if (!ok) {
        $('lock-err').textContent = 'Incorrect user ID or password  用戶名稱或密碼錯誤';
        $('passcode').value = '';
      }
    });
  }
  $('unlock-btn').addEventListener('click', submit);
  ['userid', 'passcode'].forEach(function (id) {
    $(id).addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });
  });
}

function init() {
  wireLock();
  try { localStorage.removeItem('jupas_eval_pass'); } catch (e) {}   // pre-slot format
  fetch('jupas-eval.enc.json', { cache: 'no-store' })
    .then(function (r) { return r.json(); })
    .then(function (j) {
      encBlob = j;
      var saved = null;
      try { saved = JSON.parse(localStorage.getItem(AUTH_LS) || 'null'); } catch (e) {}
      if (saved && saved.u && saved.p) {
        return tryUnlock(saved.u, saved.p, false).then(function (ok) { if (!ok) showLock(''); });
      }
      showLock('');
    })
    .catch(function () { showLock('Could not load data file.  無法載入資料檔。'); });
}

init();
})();
