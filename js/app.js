// Cryptex app shell: theme, routing, home screen.
import { $, $$, ICONS, esc, toast } from './ui.js';

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
  detective: { sub: 'Bureau of Ciphers · Case Files', home: 'The Case Files', homeP: 'Pick a file from the drawer. Every tool works offline.', num: n => `Case No. ${String(n).padStart(2, '0')}`, mark: 'CONFIDENTIAL', color: '#2a1c12' },
  radio: { sub: 'Signal Intelligence Unit · MK II', home: '> SELECT MODULE_', homeP: 'All modules operate offline. Valves warm.', num: n => `MOD-${String(n).padStart(2, '0')}`, mark: 'MODEL CX-07', color: '#1d201b' },
};

const view = $('#view');
let cleanup = null;
let current = null;

// ---------- Theme ----------
function applyTheme(t) {
  document.documentElement.dataset.theme = t;
  localStorage.setItem('cryptex-theme', t);
  $('meta[name="theme-color"]').content = COPY[t].color;
  $('#brand-sub').textContent = COPY[t].sub;
  updateHead();
  if (!current) renderHome();
  window.dispatchEvent(new CustomEvent('themechange', { detail: t }));
}
const ti = () => document.documentElement.dataset.theme === 'radio' ? 1 : 0;
const themeCopy = () => COPY[document.documentElement.dataset.theme];

$('#theme-btn').onclick = () => {
  applyTheme(document.documentElement.dataset.theme === 'radio' ? 'detective' : 'radio');
  toast(ti() ? 'RADIO ROOM — ONLINE' : "The Detective's Desk");
};
function showPicker() {
  const p = $('#picker');
  p.hidden = false;
  $$('[data-pick]', p).forEach(b => b.onclick = () => { applyTheme(b.dataset.pick); p.hidden = true; });
}

// ---------- Routing ----------
function renderHome() {
  const c = themeCopy();
  view.innerHTML = `
    <div class="home-intro"><h1>${c.home}</h1><p>${c.homeP}</p></div>
    <nav class="grid">${TOOLS.map((t, i) => `
      <a class="card" href="#/${t.id}" data-tab="${c.num(i + 1).toUpperCase()}">
        <span class="card-icon">${ICONS[t.icon]}</span>
        <span class="card-num">${ti() ? String(i + 1).padStart(2, '0') : c.num(i + 1)}</span>
        <span class="card-title">${esc(t.t[ti()][0])}</span>
        <span class="card-sub">${esc(t.t[ti()][1])}</span>
        ${i % 3 === 0 ? `<span class="card-stamp">${t.stamp}</span>` : ''}
      </a>`).join('')}
    </nav>
    <p class="home-foot">
      Tip: install Cryptex on your phone — open the browser menu and choose <b>Add to Home screen</b> / <b>Install app</b>.
      · <button id="repick">Change interface</button>
    </p>`;
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

async function route() {
  const id = location.hash.replace(/^#\/?/, '').split('?')[0];
  try { cleanup?.(); } catch (e) { console.warn(e); }
  cleanup = null;
  const tool = TOOLS.find(t => t.id === id);
  current = tool || null;
  $('#back').hidden = !tool;
  window.scrollTo(0, 0);
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

$('#back').onclick = () => { location.hash = '#/'; };
window.addEventListener('hashchange', route);

// ---------- Boot ----------
const forced = new URLSearchParams(location.search).get('theme');
const saved = COPY[forced] ? forced : localStorage.getItem('cryptex-theme');
applyTheme(saved === 'radio' ? 'radio' : 'detective');
if (!COPY[saved]) showPicker();
route();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(e => console.warn('SW registration failed', e));
}
