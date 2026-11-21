// Cryptex app shell: theme, boot splash, routing, transitions, settings, sounds.
import { $, $$, ICONS, esc, toast } from './ui.js';
import { sfx, installClickSounds, soundOn, setSound } from './lib/sfx.js';
import { isNative, haptic, hapticsEnabled, setHaptics, setStatusBar, installBackButton } from './lib/native.js';

export const VERSION = '2.0';

// Each tool has a theme-specific name: [detective, radio]
export const TOOLS = [
  { id: 'caesar', icon: 'caesar', t: [['The Caesar Shift', 'Rotate the alphabet — and crack any shift in seconds.'], ['Caesar Shifter', 'Alphabet rotation unit with brute-force scan.']], stamp: 'SOLVED' },
  { id: 'vigenere', icon: 'vigenere', t: [['The Vigenère Square', 'The "indecipherable" keyword cipher, with an automatic codebreaker.'], ['Polyalpha Unit', 'Keyword cipher. Kasiski/IoC key-recovery circuit.']], stamp: 'URGENT' },
  { id: 'enigma', icon: 'enigma', t: [['The Enigma', 'A faithful wartime rotor machine: I, M3 and the U-boat M4.'], ['Rotor Machine', 'Enigma I / M3 / M4 emulation with lampboard.']], stamp: 'TOP SECRET' },
  { id: 'morse', icon: 'morse', t: [['Morse Telegraph', 'Translate, play, tap a key, or listen and decode.'], ['Morse Keyer', 'CW encoder, sounder, straight key and audio decoder.']], stamp: 'WIRE' },
  { id: 'lightbeam', icon: 'lightbeam', t: [['The Signal Lamp', 'Flash Morse with the torch or screen; read it with the camera.'], ['Optical Telegraph', 'Light-beam Morse TX (torch/screen) and camera RX.']], stamp: 'NIGHT OPS' },
  { id: 'sstv', icon: 'sstv', t: [['Slow-Scan Pictures', 'Send photographs as sound and receive them again.'], ['SSTV Terminal', 'Slow-scan TV encoder/decoder. Martin, Scottie, Robot, PD.']], stamp: 'EVIDENCE' },
  { id: 'soundpaper', icon: 'soundpaper', t: [['Sound Paper', 'Print a sound as a picture. Scan the picture to hear it again.'], ['Phono-Optical Scanner', 'Audio → spectrogram print → camera playback.']], stamp: 'EXHIBIT A' },
  { id: 'ciphers', icon: 'ciphers', t: [['The Cipher Cabinet', 'Atbash, Playfair, Rail Fence, Affine, Bacon, tap code and more.'], ['Classic Cipher Bank', '10 historic algorithms on one selector.']], stamp: 'FILED' },
  { id: 'encoders', icon: 'encoders', t: [['The Telegraph Office', 'Base64, hex, binary, octal and decimal transcription.'], ['Data Encoder', 'Base64 / hex / binary / octal / decimal converter.']], stamp: 'RECEIVED' },
  { id: 'vault', icon: 'vault', t: [['The Sealed Envelope', 'Real AES-256 encryption with a password, and fingerprints (hashes).'], ['Crypto Vault', 'AES-256-GCM + PBKDF2. SHA hash generator.']], stamp: 'SEALED' },
  { id: 'codebreaker', icon: 'codebreaker', t: [['The Codebreaker', 'Letter-frequency forensics to identify and break a cipher.'], ['Cryptanalyzer', 'Frequency spectrum, index of coincidence, auto-solve.']], stamp: 'INVESTIGATE' },
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
  if (radio) setTimeout(() => sfx('boot'), 80);
  else [0.45, 0.54, 0.63, 0.72, 0.81, 0.9, 0.99].forEach(d => setTimeout(() => sfx('type'), d * 1000)), setTimeout(() => sfx('ding'), 1150);
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
}
function openSettings() { const sh = $('#settings'); syncSettings(); sh.hidden = false; requestAnimationFrame(() => sh.classList.add('open')); }
function closeSettings() { const sh = $('#settings'); sh.classList.remove('open'); setTimeout(() => { sh.hidden = true; }, 250); }
$('#settings-btn').onclick = openSettings;
$('#settings').addEventListener('close', closeSettings);
$('#settings').addEventListener('click', e => {
  if (e.target.id === 'settings' || e.target.closest('[data-close]')) closeSettings();
  const t = e.target.closest('[data-set-theme]');
  if (t && t.dataset.setTheme !== themeName()) { applyTheme(t.dataset.setTheme); transition(); }
  if (e.target.closest('#set-about')) { closeSettings(); location.hash = '#/about'; }
});
$('#set-sound').onchange = e => { setSound(e.target.checked); if (e.target.checked) sfx('primary'); };
$('#set-haptics').onchange = e => { setHaptics(e.target.checked); haptic('medium'); };
$('#set-version').textContent = `Cryptex ${VERSION} · ${isNative() ? 'Android app' : 'web app'}`;

// ---------- Routing ----------
function renderHome() {
  const c = themeCopy();
  view.innerHTML = `
    <div class="home-intro"><h1>${c.home}</h1><p>${c.homeP}</p></div>
    <nav class="grid">${TOOLS.map((t, i) => `
      <a class="card" href="#/${t.id}" data-tab="${c.num(i + 1).toUpperCase()}" style="--i:${i}">
        <span class="card-icon">${ICONS[t.icon]}</span>
        <span class="card-num">${ti() ? String(i + 1).padStart(2, '0') : c.num(i + 1)}</span>
        <span class="card-title">${esc(t.t[ti()][0])}</span>
        <span class="card-sub">${esc(t.t[ti()][1])}</span>
        ${i % 3 === 0 ? `<span class="card-stamp">${t.stamp}</span>` : ''}
      </a>`).join('')}
      <a class="card card-about" href="#/about" data-tab="${c.about[0].toUpperCase()}" style="--i:${TOOLS.length}">
        <span class="card-photo"><img src="assets/dev.jpg" alt=""></span>
        <span class="card-num">${ti() ? 'OP' : c.about[0]}</span>
        <span class="card-title">${c.about[1]}</span>
        <span class="card-sub">${c.about[2]}</span>
      </a>
    </nav>
    <p class="home-foot">${isNative() ? '' : 'Tip: install Cryptex — browser menu → <b>Install app</b>. · '}<button id="repick">Change interface</button></p>`;
  $('#repick').onclick = showPicker;
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
installClickSounds(haptic);
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
