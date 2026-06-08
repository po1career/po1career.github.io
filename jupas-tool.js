// ---- Category definitions (keys must match the "categories" column in the CSV) ----
const CATEGORIES = [
  { key: 'Science',        en: 'Science',                 zh: '理學' },
  { key: 'Engineering',    en: 'Engineering',             zh: '工程' },
  { key: 'Computing',      en: 'Computing & IT',          zh: '計算機及資訊科技' },
  { key: 'Business',       en: 'Business & Management',   zh: '商業及管理' },
  { key: 'Medicine',       en: 'Medicine & Dentistry',    zh: '醫學及牙醫學' },
  { key: 'Health',         en: 'Nursing & Allied Health', zh: '護理及專職醫療' },
  { key: 'SocialSciences', en: 'Social Sciences',         zh: '社會科學' },
  { key: 'Arts',           en: 'Arts & Humanities',       zh: '文學及人文' },
  { key: 'Education',      en: 'Education',               zh: '教育' },
  { key: 'Law',            en: 'Law',                     zh: '法律' },
  { key: 'Design',         en: 'Design & Creative Media', zh: '設計及創意媒體' },
];

const STRINGS = {
  en: {
    home: '← Back to home',
    title: 'JUPAS Programme Finder',
    subtitle: 'Filter undergraduate programmes by subject area, institution, or keyword.',
    searchPlaceholder: 'Search programmes, keywords, or JS code…',
    allInst: 'All institutions',
    catLabel: 'Filter by category',
    clear: 'Clear all',
    matchAny: 'Match any selected',
    matchAll: 'Match all selected',
    licensed: 'Leads to a registered / licensed profession only',
    licensedBadge: 'Licensed profession',
    count: n => `${n} programme${n === 1 ? '' : 's'} found`,
    empty: 'No programmes match your filters.',
    link: 'Official page ↗',
    duration: 'Duration',
    footer: 'Disclaimer: This tool is an unofficial study aid prepared by the Career Team of PLK No.1 W.H. Cheung College for the reference of its own students only. It is not affiliated with, endorsed by, or operated by JUPAS or any university. Programme information is compiled from publicly available official sources and may be incomplete, inaccurate, or out of date; programmes, JS codes, and entry requirements change. Always verify details on the official JUPAS website (www.jupas.edu.hk) and the relevant institution\'s website before making any application decision. All programme data, names, and trademarks remain the property of their respective owners. External links are provided for convenience only; we are not responsible for the content of third-party websites. The School and the Career Team accept no liability for any loss or decision arising from the use of this tool.',
    loadErr: 'Could not load programmes.csv. When opening the file directly from your computer, browsers block local file loading. It will work once hosted on GitHub Pages. To preview now, choose the CSV file below:',
  },
  zh: {
    home: '← 返回主頁',
    title: 'JUPAS 課程搜尋器',
    subtitle: '按學科範疇、院校或關鍵字篩選大學課程。',
    searchPlaceholder: '搜尋課程、關鍵字或 JS 編號…',
    allInst: '所有院校',
    catLabel: '按學科範疇篩選',
    clear: '清除全部',
    matchAny: '符合任何所選範疇',
    matchAll: '符合所有所選範疇',
    licensed: '只顯示可考取註冊／專業資格的課程',
    licensedBadge: '專業資格課程',
    count: n => `找到 ${n} 個課程`,
    empty: '沒有符合篩選條件的課程。',
    link: '官方網頁 ↗',
    duration: '修業年期',
    footer: '免責聲明：本工具由保良局第一張永慶中學升學輔導及生涯規劃組編製，僅供本校學生參考之用，並非 JUPAS（大學聯合招生辦法）或任何大學的官方工具，亦與其並無任何從屬或認可關係。課程資料輯錄自公開的官方資料，可能不完整、不準確或未及更新；課程、JS 編號及入學要求均可能有所變動。在作出任何報讀決定前，請務必於 JUPAS 官方網站（www.jupas.edu.hk）及相關院校網站核實資料。所有課程資料、名稱及商標均屬其各自擁有者所有。外部連結僅為方便瀏覽而提供，本校對第三方網站內容概不負責。本校及生涯規劃組就使用本工具所引致的任何損失或決定概不承擔法律責任。',
    loadErr: '無法載入 programmes.csv。直接開啟本機檔案時，瀏覽器會封鎖本地檔案讀取。上載到 GitHub Pages 後即可正常運作。如需即時預覽，請於下方選擇 CSV 檔案：',
  }
};

let lang = 'en';
let programmes = [];
let activeCats = new Set();

// ---- Minimal CSV parser (handles quoted fields with commas) ----
function parseCSV(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') { inQuotes = false; }
      else { field += c; }
    } else {
      if (c === '"') { inQuotes = true; }
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else if (c === '\r') { /* ignore */ }
      else { field += c; }
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  const headers = rows.shift().map(h => h.trim());
  return rows.filter(r => r.length > 1 && r.some(c => c.trim() !== ''))
             .map(r => Object.fromEntries(headers.map((h, i) => [h, (r[i] || '').trim()])));
}

function catLabel(key) {
  const c = CATEGORIES.find(c => c.key === key);
  return c ? c[lang] : key;
}

function setLang(l) {
  lang = l;
  document.documentElement.lang = (l === 'zh') ? 'zh-HK' : 'en';
  document.getElementById('lang-en').classList.toggle('active', l === 'en');
  document.getElementById('lang-zh').classList.toggle('active', l === 'zh');
  applyStaticText();
  buildChips();
  buildInstOptions();
  render();
}

function applyStaticText() {
  const s = STRINGS[lang];
  document.getElementById('t-home').textContent = s.home;
  document.getElementById('t-title').textContent = s.title;
  document.getElementById('t-subtitle').textContent = s.subtitle;
  document.getElementById('search').placeholder = s.searchPlaceholder;
  document.getElementById('t-catlabel').textContent = s.catLabel;
  document.getElementById('t-clear').textContent = s.clear;
  document.getElementById('t-matchany').textContent = s.matchAny;
  document.getElementById('t-matchall').textContent = s.matchAll;
  document.getElementById('t-liclabel').textContent = s.licensed;
  document.getElementById('t-footer').textContent = s.footer;
  document.title = s.title;
}

function buildChips() {
  const box = document.getElementById('chips');
  box.innerHTML = '';
  CATEGORIES.forEach(c => {
    const b = document.createElement('button');
    b.className = 'chip' + (activeCats.has(c.key) ? ' active' : '');
    b.textContent = c[lang];
    b.onclick = () => {
      activeCats.has(c.key) ? activeCats.delete(c.key) : activeCats.add(c.key);
      buildChips(); render();
    };
    box.appendChild(b);
  });
}

function buildInstOptions() {
  const sel = document.getElementById('inst');
  const prev = sel.value;
  const insts = [...new Set(programmes.map(p => p.institution_en))].sort();
  sel.innerHTML = '';
  const all = document.createElement('option');
  all.value = ''; all.textContent = STRINGS[lang].allInst;
  sel.appendChild(all);
  insts.forEach(en => {
    const match = programmes.find(p => p.institution_en === en);
    const o = document.createElement('option');
    o.value = en;
    o.textContent = lang === 'zh' ? (match.institution_zh || en) : en;
    sel.appendChild(o);
  });
  sel.value = prev;
}

function render() {
  const s = STRINGS[lang];
  const q = document.getElementById('search').value.trim().toLowerCase();
  const inst = document.getElementById('inst').value;
  const matchAll = document.getElementById('match').value === 'all';
  const licOnly = document.getElementById('licensed').checked;

  const filtered = programmes.filter(p => {
    const cats = (p.categories || '').split('|').map(x => x.trim());
    if (activeCats.size) {
      const ok = matchAll ? [...activeCats].every(c => cats.includes(c))
                          : cats.some(c => activeCats.has(c));
      if (!ok) return false;
    }
    if (licOnly && (p.licensed || '').toLowerCase() !== 'yes') return false;
    if (inst && p.institution_en !== inst) return false;
    if (q) {
      const hay = [p.code, p.name_en, p.name_zh, p.institution_en, p.institution_zh, p.tags]
        .join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  document.getElementById('count').textContent = s.count(filtered.length);

  const res = document.getElementById('results');
  if (!filtered.length) {
    res.innerHTML = `<div class="empty">${s.empty}</div>`;
    return;
  }
  res.innerHTML = '<div class="grid">' + filtered.map(p => {
    const name = lang === 'zh' ? (p.name_zh || p.name_en) : p.name_en;
    const inst = lang === 'zh' ? (p.institution_zh || p.institution_en) : p.institution_en;
    const dur = lang === 'zh' ? (p.duration_zh || '') : (p.duration_en || '');
    const cats = (p.categories || '').split('|').map(x => x.trim()).filter(Boolean);
    const tagsHtml = cats.map(c => `<span class="tag">${catLabel(c)}</span>`).join('');
    const durHtml = dur ? `<div class="meta">${s.duration}: ${dur}</div>` : '';
    const linkHtml = p.url ? `<a class="link" href="${p.url}" target="_blank" rel="noopener">${s.link}</a>` : '';
    const licHtml = (p.licensed || '').toLowerCase() === 'yes' ? `<span class="badge-lic">${s.licensedBadge}</span>` : '';
    return `<div class="prog">
      <div class="code-row"><span class="code">${p.code || ''}</span>${licHtml}</div>
      <div class="pname">${name}</div>
      <div class="inst">${inst}</div>
      ${durHtml}
      <div class="tags">${tagsHtml}</div>
      ${linkHtml}
    </div>`;
  }).join('') + '</div>';
}

function clearAll() {
  activeCats.clear();
  document.getElementById('search').value = '';
  document.getElementById('inst').value = '';
  document.getElementById('match').value = 'any';
  document.getElementById('licensed').checked = false;
  buildChips();
  render();
}

function afterLoad() {
  buildInstOptions();
  render();
}

function wireEvents() {
  document.getElementById('lang-en').addEventListener('click', () => setLang('en'));
  document.getElementById('lang-zh').addEventListener('click', () => setLang('zh'));
  document.getElementById('search').addEventListener('input', render);
  document.getElementById('inst').addEventListener('change', render);
  document.getElementById('match').addEventListener('change', render);
  document.getElementById('licensed').addEventListener('change', render);
  document.getElementById('t-clear').addEventListener('click', clearAll);
}

// ---- Encryption gate (Web Crypto: PBKDF2-SHA256 + AES-GCM) ----
const PBKDF2_ITER = 150000;
const LS_KEY = 'jupas_pass';
let encBlob = null;

function b64ToBytes(b64) { return Uint8Array.from(atob(b64), c => c.charCodeAt(0)); }

async function deriveKey(passcode, salt) {
  const base = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(passcode), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITER, hash: 'SHA-256' },
    base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
}

async function decryptCSV(passcode) {
  const key = await deriveKey(passcode, b64ToBytes(encBlob.salt));
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: b64ToBytes(encBlob.iv) }, key, b64ToBytes(encBlob.data));
  return new TextDecoder().decode(plain);
}

async function tryUnlock(passcode, remember) {
  try {
    const csv = await decryptCSV(passcode);          // throws if passcode wrong
    programmes = parseCSV(csv);
    if (remember) localStorage.setItem(LS_KEY, passcode);
    document.getElementById('lock').style.display = 'none';
    document.getElementById('app').style.display = '';
    afterLoad();
    return true;
  } catch (e) {
    localStorage.removeItem(LS_KEY);
    return false;
  }
}

function showLock(msg) {
  document.getElementById('app').style.display = 'none';
  document.getElementById('lock').style.display = 'flex';
  document.getElementById('lock-err').textContent = msg || '';
}

function wireLock() {
  const submit = async () => {
    const pc = document.getElementById('passcode').value;
    if (!pc) return;
    document.getElementById('lock-err').textContent = '';
    if (!(await tryUnlock(pc, true))) {
      document.getElementById('lock-err').textContent = 'Incorrect passcode  通行碼錯誤';
      document.getElementById('passcode').value = '';
    }
  };
  document.getElementById('unlock-btn').addEventListener('click', submit);
  document.getElementById('passcode').addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
}

async function init() {
  wireEvents();
  wireLock();
  applyStaticText();
  buildChips();
  try {
    encBlob = await (await fetch('programmes.enc.json', { cache: 'no-store' })).json();
  } catch (e) {
    showLock('Could not load data file.  無法載入資料檔。');
    return;
  }
  const saved = localStorage.getItem(LS_KEY);
  if (saved && await tryUnlock(saved, false)) return;
  showLock('');
}

init();
