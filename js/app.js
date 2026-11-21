// Cryptex app shell: theme, boot splash, routing, transitions, settings, home (grid/list + search).
import { $, $$, ICONS, esc, toast } from './ui.js';
import { soundOn, setSound, sfx } from './lib/sfx.js';
import { isNative, haptic, hapticsEnabled, setHaptics, setStatusBar, installBackButton } from './lib/native.js';

export const VERSION = '2.7';

// Each tool has a theme-specific name: [detective, radio]
export const TOOLS = [
  { id: 'caesar', g: 0, icon: 'caesar', t: [['The Caesar Shift', 'Rotate the alphabet — and crack any shift in seconds.'], ['Caesar Shifter', 'Alphabet rotation unit with brute-force scan.']], stamp: 'SOLVED' },
  { id: 'vigenere', g: 0, icon: 'vigenere', t: [['The Vigenère Square', 'The "indecipherable" keyword cipher, with an automatic codebreaker.'], ['Polyalpha Unit', 'Keyword cipher. Kasiski/IoC key-recovery circuit.']], stamp: 'URGENT' },
  { id: 'enigma', g: 0, icon: 'enigma', t: [['The Enigma', 'A faithful wartime rotor machine: I, M3 and the U-boat M4.'], ['Rotor Machine', 'Enigma I / M3 / M4 emulation with lampboard.']], stamp: 'TOP SECRET' },
  { id: 'morse', g: 1, icon: 'morse', t: [['Morse Telegraph', 'Translate, play, tap a key, or listen and decode.'], ['Morse Keyer', 'CW encoder, sounder, straight key and audio decoder.']], stamp: 'WIRE' },
  { id: 'lightbeam', g: 1, icon: 'lightbeam', t: [['The Signal Lamp', 'Flash Morse with the torch or screen; read it with the camera.'], ['Optical Telegraph', 'Light-beam Morse TX (torch/screen) and camera RX.']], stamp: 'NIGHT OPS' },
  { id: 'sstv', g: 1, icon: 'sstv', t: [['Slow-Scan Pictures', 'Send photographs as sound and receive them again.'], ['SSTV Terminal', 'Slow-scan TV encoder/decoder. Martin, Scottie, Robot, PD.']], stamp: 'EVIDENCE' },
  { id: 'soundpaper', g: 1, icon: 'soundpaper', t: [['Sound Paper', 'Print a sound as a picture. Scan the picture to hear it again.'], ['Phono-Optical Scanner', 'Audio → spectrogram print → camera playback.']], stamp: 'EXHIBIT A' },
  { id: 'ciphers', g: 0, icon: 'ciphers', t: [['The Cipher Cabinet', 'Atbash, Playfair, Rail Fence, Affine, Bacon, tap code and more.'], ['Classic Cipher Bank', '10 historic algorithms on one selector.']], stamp: 'FILED' },
  { id: 'encoders', g: 2, icon: 'encoders', t: [['The Telegraph Office', 'Base64, hex, binary, octal and decimal transcription.'], ['Data Encoder', 'Base64 / hex / binary / octal / decimal converter.']], stamp: 'RECEIVED' },
  { id: 'vault', g: 2, icon: 'vault', t: [['The Sealed Envelope', 'Real AES-256 encryption with a password, and fingerprints (hashes).'], ['Crypto Vault', 'AES-256-GCM + PBKDF2. SHA hash generator.']], stamp: 'SEALED' },
  { id: 'codebreaker', g: 2, icon: 'codebreaker', t: [['The Codebreaker', 'Letter-frequency forensics to identify and break a cipher.'], ['Cryptanalyzer', 'Frequency spectrum, index of coincidence, auto-solve.']], stamp: 'INVESTIGATE' },
];

const COPY = {
  detective: { sub: 'Bureau of Ciphers · Case Files', home: 'The Case Files', homeP: 'Pick a file from the drawer. Every tool works offline.', num: n => `Case No. ${String(n).padStart(2, '0')}`, mark: 'CONFIDENTIAL', color: '#24160d', about: ['Personnel File', 'The Developer', 'Who built this kit — and why.'], settings: 'Desk Drawer' },
  radio: { sub: 'Signal Intelligence Unit · MK II', home: '> SELECT MODULE_', homeP: 'All modules operate offline. Valves warm.', num: n => `MOD-${String(n).padStart(2, '0')}`, mark: 'MODEL CX-07', color: '#9a9e95', about: ['OPERATOR', 'Operator Profile', 'Identify the engineer on duty.'], settings: 'Control Panel' },
};

const view = $('#view');
let cleanup = null;
let current = null;

const ti = () => document.documentElement.dataset.theme === 'radio' ? 1 : 0;
const themeName = () => document.documentElement.dataset.theme;
const themeCopy = () => COPY[themeName()];

// ---------- Theme ----------
function applyTheme(t) {
  document.documentElement.dataset.theme = t;
  localStorage.setItem('cryptex-theme', t);
  $('meta[name="theme-color"]').content = COPY[t].color;
  setStatusBar(COPY[t].color, t === 'detective');
  $('#brand-sub').textContent = COPY[t].sub;
  updateHead();
  if (!current && location.hash.replace(/^#\/?/, '') === '') renderHome();
  syncSettings();
  window.dispatchEvent(new CustomEvent('themechange', { detail: t }));
}
$('#theme-btn').onclick = () => {
  applyTheme(ti() ? 'detective' : 'radio');
  transition();
  toast(ti() ? 'RADIO ROOM — ONLINE' : "The Detective's Desk");
};
function showPicker() {
  const p = $('#picker');
  p.hidden = false;
  $$('[data-pick]', p).forEach(b => b.onclick = () => { applyTheme(b.dataset.pick); p.hidden = true; splash(); });
}

// ---------- Boot splash ----------
function splash() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const s = $('#splash');
  const radio = ti() === 1;
  s.className = 'splash ' + (radio ? 'splash-radio' : 'splash-det');
  s.innerHTML = radio
    ? `<div class="sp-crt"><div class="sp-line"></div><div class="sp-text"><b>CRYPTEX</b><span>SIGNAL INTELLIGENCE UNIT · MK II</span><em>SYSTEM READY_</em></div></div>`
    : `<div class="sp-lamp"></div><div class="sp-text"><b>${[...'CRYPTEX'].map((c, i) => `<i style="animation-delay:${0.45 + i * 0.09}s">${c}</i>`).join('')}</b><span>Bureau of Ciphers</span></div>`;
  s.hidden = false;
  let done = false;
  const end = () => { if (done) return; done = true; s.classList.add('out'); setTimeout(() => { s.hidden = true; s.innerHTML = ''; }, 450); };
  s.onclick = end;
  setTimeout(end, radio ? 1900 : 1800);
}

// ---------- Settings sheet ----------
function syncSettings() {
  const sh = $('#settings');
  if (!sh) return;
  $('#set-title').textContent = themeCopy().settings;
  $$('[data-set-theme]', sh).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.setTheme === themeName())));
  $('#set-sound').checked = soundOn();
  $('#set-haptics').checked = hapticsEnabled();
  $$('[data-set-view]', sh).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.setView === viewMode())));
}
function openSettings() { const sh = $('#settings'); syncSettings(); sh.hidden = false; requestAnimationFrame(() => sh.classList.add('open')); }
function closeSettings() { const sh = $('#settings'); sh.classList.remove('open'); const p = $('.sheet-panel', sh); p.style.transform = ''; p.style.transition = ''; setTimeout(() => { sh.hidden = true; }, 250); }

// Drag the drawer / control panel: it follows the finger; flick or pull past a third to close, otherwise it snaps back.
(() => {
  const sh = $('#settings'), panel = $('.sheet-panel', sh);
  let drag = null;
  panel.addEventListener('pointerdown', e => {
    if (e.target.closest('button, input, label, select, a') && !e.target.closest('.sheet-grip')) return;
    drag = { y0: e.clientY, t0: performance.now(), dy: 0, id: e.pointerId };
    panel.setPointerCapture?.(e.pointerId);
    panel.style.transition = 'none';
  });
  panel.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    const dy = e.clientY - drag.y0;
    drag.dy = dy > 0 ? dy : dy / 4;                       // resists upward pull, follows downward
    panel.style.transform = `translateY(${drag.dy}px)`;
    sh.style.background = `rgba(0,0,0,${Math.max(0, .5 - drag.dy / panel.offsetHeight * .5)})`;
  });
  const end = e => {
    if (!drag || (e && e.pointerId !== drag.id)) return;
    const v = drag.dy / Math.max(1, performance.now() - drag.t0);   // px per ms
    const close = drag.dy > panel.offsetHeight / 3 || v > 0.6;
    panel.style.transition = 'transform .25s cubic-bezier(.2,.9,.3,1)';
    sh.style.background = '';
    if (close) { panel.style.transform = 'translateY(100%)'; setTimeout(closeSettings, 200); }
    else panel.style.transform = '';
    drag = null;
  };
  panel.addEventListener('pointerup', end); panel.addEventListener('pointercancel', end);
})();
$('#settings-btn').onclick = openSettings;
$('#settings').addEventListener('close', closeSettings);
$('#settings').addEventListener('click', e => {
  if (e.target.id === 'settings' || e.target.closest('[data-close]')) closeSettings();
  const t = e.target.closest('[data-set-theme]');
  if (t && t.dataset.setTheme !== themeName()) { applyTheme(t.dataset.setTheme); transition(); }
  if (e.target.closest('#set-about')) { closeSettings(); location.hash = '#/about'; }
});
$('#set-sound').onchange = e => { setSound(e.target.checked); if (e.target.checked) sfx('keydown'); };
$$('[data-set-view]', $('#settings')).forEach(b => b.onclick = () => { setView(b.dataset.setView); syncSettings(); });
$('#set-haptics').onchange = e => { setHaptics(e.target.checked); haptic('medium'); };
$('#set-version').textContent = `Cryptex ${VERSION} · ${isNative() ? 'Android app' : 'web app'}`;

// ---------- Routing ----------
const GROUPS = [
  ['Drawer I · Ciphers', 'RACK A — CIPHER MODULES'],
  ['Drawer II · Signals', 'RACK B — SIGNAL MODULES'],
  ['Drawer III · Forensics', 'RACK C — UTILITY MODULES'],
];
const STAMPED = new Set(['caesar', 'enigma', 'sstv', 'vault']);
const viewMode = () => localStorage.getItem('cryptex-view') === 'list' ? 'list' : 'grid';
function setView(v) {
  localStorage.setItem('cryptex-view', v);
  $$('.home-view button', view).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === v)));
  $$('.tools', view).forEach(n => { n.classList.toggle('grid', v === 'grid'); n.classList.toggle('list', v === 'list'); });
}
const VIEW_ICONS = {
  grid: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="4" width="7" height="7" rx="1"/><rect x="4" y="13" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/></svg>',
  list: '<svg viewBox="0 0 24 24"><path d="M9 6h11M9 12h11M9 18h11M4 6h1M4 12h1M4 18h1"/></svg>',
};

function renderHome() {
  const c = themeCopy(), mode = viewMode();
  let n = 0;
  const card = t => {
    n++;
    const [name, sub] = t.t[ti()];
    return `<a class="card" href="#/${t.id}" data-tab="${c.num(n).toUpperCase()}" data-q="${esc((name + ' ' + sub + ' ' + t.id).toLowerCase())}" style="--i:${n}">
        <span class="card-icon">${ICONS[t.icon]}</span>
        <span class="card-num">${ti() ? String(n).padStart(2, '0') : c.num(n)}</span>
        <span class="card-title">${esc(name)}</span>
        <span class="card-sub">${esc(sub)}</span>
        ${STAMPED.has(t.id) ? `<span class="card-stamp">${t.stamp}</span>` : ''}
        <svg class="card-chev" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>
      </a>`;
  };
  view.innerHTML = `
    <div class="home-intro"><h1>${c.home}</h1><p>${c.homeP}</p></div>
    <div class="home-bar">
      <label class="home-search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>
        <input type="search" id="q" placeholder="${ti() ? 'SEARCH MODULES' : 'Search the files…'}" aria-label="Search tools" autocomplete="off" spellcheck="false"></label>
      <div class="home-view seg" role="group" aria-label="Layout">
        <button data-view="grid" aria-pressed="${mode === 'grid'}" aria-label="Grid view">${VIEW_ICONS.grid}</button>
        <button data-view="list" aria-pressed="${mode === 'list'}" aria-label="List view">${VIEW_ICONS.list}</button>
      </div>
    </div>
    ${GROUPS.map((g, gi) => `<section class="tool-group"><h2 class="group-label">${g[ti()]}</h2>
      <nav class="tools ${mode}">${TOOLS.filter(t => t.g === gi).map(card).join('')}</nav></section>`).join('')}
    <p class="home-empty" id="empty" hidden>${ti() ? 'NO MODULE MATCHES.' : 'No file matches that description.'}</p>
    <section class="tool-group"><h2 class="group-label">${ti() ? 'OPERATOR ON DUTY' : 'Personnel'}</h2>
      <a class="card card-about" href="#/about" data-tab="${c.about[0].toUpperCase()}" data-q="developer about rachit aryan asthana operator profile personnel">
        <span class="card-photo"><img src="assets/dev-anon.jpg" alt=""></span>
        <span class="card-num">${ti() ? 'OP' : c.about[0]}</span>
        <span class="card-title">${c.about[1]}</span>
        <span class="card-sub">${c.about[2]}</span>
      </a></section>
    <p class="home-foot">${isNative() ? '' : 'Tip: install Cryptex — browser menu → <b>Install app</b>. · '}<button id="repick">Change interface</button></p>`;
  $('#repick').onclick = showPicker;
  $$('.home-view button', view).forEach(b => b.onclick = () => setView(b.dataset.view));
  $('#q', view).oninput = e => {
    const q = e.target.value.trim().toLowerCase();
    let any = false;
    $$('.tool-group', view).forEach(g => {
      let shown = 0;
      $$('[data-q]', g).forEach(a => { const hit = !q || a.dataset.q.includes(q); a.hidden = !hit; if (hit) shown++; });
      g.hidden = !shown; if (shown) any = true;
    });
    $('#empty', view).hidden = any;
  };
}

function updateHead() {
  if (!current) return;
  const head = $('.view-head', view);
  if (!head) return;
  const i = TOOLS.indexOf(current);
  $('.tool-num', head).textContent = themeCopy().num(i + 1);
  $('h1', head).textContent = current.t[ti()][0];
  $('p', head).textContent = current.t[ti()][1];
  $('.head-mark', head).textContent = themeCopy().mark;
}

function transition() {
  view.classList.remove('enter');
  void view.offsetWidth;
  view.classList.add('enter');
}

async function route() {
  const id = location.hash.replace(/^#\/?/, '').split('?')[0];
  try { cleanup?.(); } catch (e) { console.warn(e); }
  cleanup = null;
  const tool = TOOLS.find(t => t.id === id);
  current = tool || null;
  $('#back').hidden = !tool && id !== 'about';
  window.scrollTo(0, 0);
  transition();
  if (id === 'about') {
    view.innerHTML = '<div class="tool-body"></div>';
    const mod = await import('./tools/about.js');
    if (location.hash.replace(/^#\/?/, '') === 'about') cleanup = mod.mount($('.tool-body', view)) || null;
    return;
  }
  if (!tool) { renderHome(); return; }
  view.innerHTML = `<header class="view-head"><div class="tool-num"></div><h1></h1><p></p><span class="head-mark"></span></header><div class="tool-body"></div>`;
  updateHead();
  try {
    const mod = await import(`./tools/${tool.id}.js`);
    if (current !== tool) return;
    cleanup = mod.mount($('.tool-body', view)) || null;
  } catch (e) {
    console.error(e);
    $('.tool-body', view).innerHTML = `<section class="panel"><p class="hint warn">Could not load this tool: ${esc(e.message)}</p></section>`;
  }
}

$('#back').onclick = () => { if (history.length > 1 && location.hash) history.back(); else location.hash = '#/'; };
window.addEventListener('hashchange', route);

// ---------- Boot ----------
installBackButton();
if (isNative()) document.documentElement.classList.add('native');
const forced = new URLSearchParams(location.search).get('theme');
const saved = COPY[forced] ? forced : localStorage.getItem('cryptex-theme');
applyTheme(saved === 'radio' ? 'radio' : 'detective');
if (!COPY[saved]) showPicker(); else if (!forced) splash();
route();

if ('serviceWorker' in navigator && location.protocol === 'https:' && !isNative()) {
  navigator.serviceWorker.register('sw.js').catch(e => console.warn('SW registration failed', e));
}
