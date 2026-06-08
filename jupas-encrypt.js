// JUPAS data encryptor — locks programmes.csv into programmes.enc.json with a passcode.
// Uses the browser's built-in Web Crypto (PBKDF2-SHA256 + AES-GCM). No third-party code.
// Parameters MUST match the decryptor in jupas-tool.js.
const PBKDF2_ITER = 150000;

function bytesToB64(bytes) {
  let s = '';
  bytes.forEach(b => s += String.fromCharCode(b));
  return btoa(s);
}

async function deriveKey(passcode, salt) {
  const base = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(passcode), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITER, hash: 'SHA-256' },
    base, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
}

async function encryptCSV(csvText, passcode) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passcode, salt);
  const ct = new Uint8Array(await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv }, key, new TextEncoder().encode(csvText)));
  return { v: 1, salt: bytesToB64(salt), iv: bytesToB64(iv), data: bytesToB64(ct) };
}

let csvText = null;
const $ = id => document.getElementById(id);

document.addEventListener('DOMContentLoaded', () => {
  $('csv').addEventListener('change', e => {
    const f = e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = ev => { csvText = ev.target.result; $('status').textContent = '✓ Loaded ' + f.name; };
    r.readAsText(f, 'UTF-8');
  });

  $('gen').addEventListener('click', async () => {
    const pc = $('pass').value;
    if (!csvText) { $('status').textContent = 'Please choose your programmes.csv first.'; return; }
    if (!pc) { $('status').textContent = 'Please enter a passcode.'; return; }
    const blob = await encryptCSV(csvText, pc);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(blob)], { type: 'application/json' }));
    a.download = 'programmes.enc.json';
    a.click();
    $('status').textContent = '✓ Done — programmes.enc.json downloaded. Commit it to the site (replace the old one).';
  });
});
