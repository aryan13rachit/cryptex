// Cryptex app shell: theme, routing, home (grid/list + search), settings, splash.
import { $, $$, ICONS, esc, toast } from './ui.js';
import { installClickSounds, soundOn, setSound, sfx } from './lib/sfx.js';
import { isNative, haptic, hapticsEnabled, setHaptics, setStatusBar, installBackButton } from './lib/native.js';

export const VERSION = '2.1';

const GROUPS = [
  { id: 'classic', t: ['Classic ciphers', 'Cipher modules'] },
  { id: 'signals', t: ['Signals & transmissions', 'Signal modules'] },
  { id: 'utility', t: ['Analysis & utilities', 'Utility modules'] },
];
// t: [detective, radio] → [name, description]
export const TOOLS = [
  { id: 'caesar', g: 'classic', t: [['The Caesar Shift', 'Rotate the alphabet, or crack any shift.'], ['Caesar Shift', 'Alphabet rotation with brute-force search.']] },
  { id: 'vigenere', g: 'classic', t: [['The Vigenère Square', 'Keyword cipher with automatic key recovery.'], ['Vigenère', 'Polyalphabetic cipher and key solver.']] },
  { id: 'enigma', g: 'classic', t: [['The Enigma', 'The wartime rotor machine — I, M3 and M4.'], ['Enigma', 'Rotor machine emulator: I, M3, M4.']] },
  { id: 'ciphers', g: 'classic', t: [['The Cipher Cabinet', 'Atbash, Playfair, Rail Fence and seven more.'], ['Classic Ciphers', 'Ten historic algorithms in one place.']] },
  { id: 'morse', g: 'signals', t: [['Morse Telegraph', 'Translate, play, key by hand or decode by ear.'], ['Morse', 'Encoder, sounder, key and audio decoder.']] },
  { id: 'lightbeam', g: 'signals', t: [['The Signal Lamp', 'Flash Morse with light; read it with the camera.'], ['Optical Morse', 'Torch or screen transmitter, camera receiver.']] },
  { id: 'sstv', g: 'signals', t: [['Slow-Scan Pictures', 'Send photographs as sound and receive them back.'], ['SSTV', 'Slow-scan TV encoder and decoder.']] },
  { id: 'soundpaper', g: 'signals', t: [['Sound Paper', 'Print a sound as a picture; scan it to play.'], ['Sound Paper', 'Spectrogram print and optical playback.']] },
  { id: 'codebreaker', g: 'utility', t: [['The Codebreaker', 'Frequency analysis that identifies and breaks ciphers.'], ['Cryptanalysis', 'Frequency, index of coincidence, auto-solve.']] },
  { id: 'vault', g: 'utility', t: [['The Sealed Envelope', 'AES-256 encryption, hashes and passwords.'], ['Crypto Vault', 'AES-256-GCM, SHA hashes, passwords.']] },
  { id: 'encoders', g: 'utility', t: [['The Telegraph Office', 'Base64, hex, binary and other encodings.'], ['Encoders', 'Base64, hex, binary, octal, decimal, URL.']] },
];
const COPY = {
  detective: { hero: 'Cryptex', heroP: 'A field kit for ciphers, codes and secret signals.', nav: ['Case files', 'Personnel', 'Settings'], about: ['The Developer', 'Personnel file of the maker'], color: '#1d150f', search: 'Search the files' },
  radio: { hero: 'CRYPTEX', heroP: 'Signal intelligence unit · all modules offline.', nav: ['Modules', 'Operator', 'Settings'], about: ['Operator Profile', 'The engineer behind the unit'], color: '#0e120f', search: 'Search modules' },
};
const ICON = {
  chev: '<svg class="tool-chev" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>',
  search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>',
  grid: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/></svg>',
  list: '<svg viewBox="0 0 24 24"><path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/></svg>',
};

const view = $('#view');
let cleanup = null, current = null, headObs = null;
const ti = () => document.documentElement.dataset.theme === 'radio' ? 1 : 0;
const themeName = () => document.documentElement.dataset.theme;
const C = () => COPY[themeName()];
const viewMode = () => localStorage.getItem('cryptex-view') === 'list' ? 'list' : 'grid';

// ---------- Theme ----------
function applyTheme(t, rerender = true) {
  document.documentElement.dataset.theme = t;
  localStorage.setItem('cryptex-theme', t);
  $('meta[name="theme-color"]').content = COPY[t].color;
  setStatusBar(COPY[t].color, true);
  $$('[data-label]').forEach((el, i) => { el.textContent = COPY[t].nav[i]; });
  window.dispatchEvent(new CustomEvent('themechange', { detail: t }));
  if (rerender) route(false);
}
$('#theme-btn').onclick = () => { applyTheme(ti() ? 'detective' : 'radio'); haptic('light'); };

function showPicker() {
  const p = $('#picker');
  p.hidden = false;
  $$('[data-pick]', p).forEach(b => b.onclick = () => { applyTheme(b.dataset.pick); p.hidden = true; splash(); });
}

function splash() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const s = $('#splash');
  s.className = 'splash ' + (ti() ? 'splash-radio' : 'splash-det');
  s.innerHTML = `<b>${ti() ? 'CRYPTEX' : 'Cryptex'}</b>`;
  s.hidden = false;
  setTimeout(() => s.classList.add('out'), 1050);
  setTimeout(() => { s.hidden = true; s.innerHTML = ''; }, 1500);
}

// ---------- App bar ----------
function setBar({ title = null, back = false } = {}) {
  $('#back').hidden = !back;
  const bt = $('#bar-title');
  headObs?.disconnect(); headObs = null;
  if (title === null) bt.innerHTML = '<span class="wordmark">CRYPTEX</span>'; else bt.textContent = title;
  // the bar title fades in once the page's own heading scrolls away
  const head = $('.page-head h1, .home-hero h1', view);
  if (!head) { bt.style.opacity = '1'; return; }
  bt.style.transition = 'opacity .2s'; bt.style.opacity = '0';
  headObs = new IntersectionObserver(([e]) => { bt.style.opacity = e.isIntersecting ? '0' : '1'; }, { rootMargin: '-60px 0px 0px 0px' });
  headObs.observe(head);
}
function setNav(which) {
  $$('.bottomnav a').forEach(a => { if (a.dataset.nav === which) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  $('.bottomnav').hidden = which === null;
}

// ---------- Home ----------
function toolItem(t) {
  const [name, desc] = t.t[ti()];
  return `<a class="tool" href="#/${t.id}" data-q="${esc((name + ' ' + desc + ' ' + t.id).toLowerCase())}">
    <span class="tool-icon">${ICONS[t.id]}</span>
    <span class="tool-text"><span class="tool-name">${esc(name)}</span><span class="tool-desc">${esc(desc)}</span></span>${ICON.chev}</a>`;
}
function renderHome() {
  const c = C(), mode = viewMode();
  view.innerHTML = `
    <section class="home-hero"><h1>${c.hero}</h1><p>${c.heroP}</p></section>
    <div class="home-tools">
      <label class="search">${ICON.search}<input type="search" id="q" placeholder="${c.search}" aria-label="${c.search}" autocomplete="off"></label>
      <div class="view-toggle" role="group" aria-label="Layout">
        <button data-view="grid" aria-pressed="${mode === 'grid'}" aria-label="Grid view">${ICON.grid}</button>
        <button data-view="list" aria-pressed="${mode === 'list'}" aria-label="List view">${ICON.list}</button>
      </div>
    </div>
    ${GROUPS.map(g => `<section class="group" data-group="${g.id}"><h2 class="section-label">${g.t[ti()]}</h2>
      <div class="tools ${mode}">${TOOLS.filter(t => t.g === g.id).map(toolItem).join('')}</div></section>`).join('')}
    <p class="empty" id="empty" hidden>Nothing matches that search.</p>
    <section class="group" data-group="about"><h2 class="section-label">${ti() ? 'Operator' : 'About'}</h2>
      <a class="dev-row" href="#/about" data-q="developer about rachit aryan asthana operator profile">
        <img src="assets/dev.jpg" alt=""><span class="tool-text"><span class="tool-name">${c.about[0]}</span><span class="tool-desc">${c.about[1]}</span></span>${ICON.chev}</a>
    </section>`;
  $$('.view-toggle button', view).forEach(b => b.onclick = () => {
    localStorage.setItem('cryptex-view', b.dataset.view);
    $$('.view-toggle button', view).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    $$('.tools', view).forEach(el => { el.classList.remove('grid', 'list'); el.classList.add(b.dataset.view); });
  });
  $('#q', view).oninput = e => {
    const q = e.target.value.trim().toLowerCase();
    let any = false;
    $$('.group', view).forEach(g => {
      let shown = 0;
      $$('[data-q]', g).forEach(a => { const hit = !q || a.dataset.q.includes(q); a.hidden = !hit; if (hit) shown++; });
      g.hidden = shown === 0; if (shown) any = true;
    });
    $('#empty', view).hidden = any;
  };
}

// ---------- Settings ----------
function renderSettings() {
  view.innerHTML = `
    <header class="page-head"><h1>Settings</h1></header>
    <h2 class="section-label">Appearance</h2>
    <div class="settings-group">
      <div class="theme-choices">
        <button class="theme-choice" data-set-theme="detective" aria-pressed="${themeName() === 'detective'}"><span class="tc-preview tc-detective"><i></i></span><span class="tc-name">Detective's Desk</span></button>
        <button class="theme-choice" data-set-theme="radio" aria-pressed="${themeName() === 'radio'}"><span class="tc-preview tc-radio"><i></i></span><span class="tc-name">Radio Room</span></button>
      </div>
      <div class="set-row"><span class="set-label"><b>Home layout</b><small>How tools are shown</small></span>
        <div class="seg" data-seg="layout"><button data-v="grid" aria-pressed="${viewMode() === 'grid'}">Grid</button><button data-v="list" aria-pressed="${viewMode() === 'list'}">List</button></div></div>
    </div>
    <h2 class="section-label">Feedback</h2>
    <div class="settings-group">
      <label class="set-row"><span class="set-label"><b>Sound effects</b><small>Subtle cues on key actions</small></span><input type="checkbox" class="switch" id="set-sound" ${soundOn() ? 'checked' : ''}></label>
      <label class="set-row"><span class="set-label"><b>Vibration</b><small>Haptic feedback on taps</small></span><input type="checkbox" class="switch" id="set-haptics" ${hapticsEnabled() ? 'checked' : ''}></label>
    </div>
    <h2 class="section-label">About</h2>
    <div class="settings-group">
      <a class="set-row" href="#/about"><span class="set-label"><b>${C().about[0]}</b><small>Rachit Aryan Asthana</small></span>${ICON.chev}</a>
      <div class="set-row"><span class="set-label"><b>Version</b><small>Cryptex ${VERSION} · ${isNative() ? 'Android app' : 'Web app'}</small></span></div>
    </div>`;
  $$('[data-set-theme]', view).forEach(b => b.onclick = () => { if (b.dataset.setTheme !== themeName()) applyTheme(b.dataset.setTheme); });
  $$('[data-seg="layout"] button', view).forEach(b => b.onclick = () => {
    localStorage.setItem('cryptex-view', b.dataset.v);
    $$('[data-seg="layout"] button', view).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
  });
  $('#set-sound', view).onchange = e => { setSound(e.target.checked); if (e.target.checked) sfx('primary'); };
  $('#set-haptics', view).onchange = e => { setHaptics(e.target.checked); haptic('medium'); };
}

// ---------- Routing ----------
function transition() { view.classList.remove('enter'); void view.offsetWidth; view.classList.add('enter'); }

async function route(animate = true) {
  const id = location.hash.replace(/^#\/?/, '').split('?')[0];
  try { cleanup?.(); } catch (e) { console.warn(e); }
  cleanup = null;
  const tool = TOOLS.find(t => t.id === id);
  current = tool || null;
  if (animate) { window.scrollTo(0, 0); transition(); }

  if (id === 'settings') { renderSettings(); setNav('settings'); setBar({ title: 'Settings' }); return; }
  if (id === 'about') {
    view.innerHTML = '<div class="tool-body"></div>';
    setNav('about'); setBar({ title: C().about[0] });
    const mod = await import('./tools/about.js');
    if (location.hash.replace(/^#\/?/, '') === 'about') cleanup = mod.mount($('.tool-body', view)) || null;
    return;
  }
  if (!tool) { renderHome(); setNav('home'); setBar(); return; }

  const [name, desc] = tool.t[ti()];
  const group = GROUPS.find(g => g.id === tool.g).t[ti()];
  view.innerHTML = `<header class="page-head"><div class="kicker">${esc(group)}</div><h1>${esc(name)}</h1><p>${esc(desc)}</p></header><div class="tool-body"></div>`;
  setNav(null); setBar({ title: name, back: true });
  try {
    const mod = await import(`./tools/${tool.id}.js`);
    if (current !== tool) return;
    cleanup = mod.mount($('.tool-body', view)) || null;
  } catch (e) {
    console.error(e);
    $('.tool-body', view).innerHTML = `<section class="panel"><p class="hint warn">Could not load this tool: ${esc(e.message)}</p></section>`;
  }
}

$('#back').onclick = () => { if (history.length > 1) history.back(); else location.hash = '#/'; };
window.addEventListener('hashchange', () => route());

// ---------- Boot ----------
installClickSounds(haptic);
installBackButton();
if (isNative()) document.documentElement.classList.add('native');
const forced = new URLSearchParams(location.search).get('theme');
const saved = COPY[forced] ? forced : localStorage.getItem('cryptex-theme');
applyTheme(saved === 'radio' ? 'radio' : 'detective', false);
if (!COPY[saved]) showPicker(); else if (!forced) splash();
route();

if ('serviceWorker' in navigator && location.protocol === 'https:' && !isNative()) {
  navigator.serviceWorker.register('sw.js').catch(e => console.warn('SW registration failed', e));
}
