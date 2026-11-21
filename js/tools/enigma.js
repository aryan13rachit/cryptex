import { $, $$, esc, ICONS, copy, toast } from '../ui.js';
import { Enigma, ROTORS, parsePlugboard } from '../lib/enigma.js';

const L = i => String.fromCharCode(65 + ((i % 26) + 26) % 26);
const ROWS = ['QWERTZUIO', 'ASDFGHJK', 'PYXCVBNML'];
const MODELS = {
  I: { name: 'Enigma I (Army / Luftwaffe)', rotors: ['I', 'II', 'III', 'IV', 'V'], reflectors: ['B', 'C', 'A'] },
  M3: { name: 'Enigma M3 (Kriegsmarine)', rotors: Object.keys(ROTORS), reflectors: ['B', 'C'] },
  M4: { name: 'Enigma M4 (U-boat, 4 rotors)', rotors: Object.keys(ROTORS), reflectors: ['B-thin', 'C-thin'] },
};
const U534 = {
  model: 'M4', greek: 'Beta', rotors: ['II', 'IV', 'I'], reflector: 'B-thin', rings: [0, 0, 0, 21], positions: [21, 9, 13, 0],
  plugboard: 'AT BL DF GJ HM NW OP QY RZ VX',
  text: 'NCZW VUSX PNYM INHZ XMQX SFWX WLKJ AHSH NMCO CCAK UQPM KCSM HKSE INJU SBLK IOSX CKUB HMLL XCSJ USRR DVKO HULX WCCB GVLI YXEO AHXR HKKF VDRE WEZL XOBA FGYU JQUK GRTV UKAM EURB VEKS UHHV OYHA BCJW MAKL FKLM YFVN RIZR VVRT KOFD ANJM OLBG FFLE OPRG TFLV RHOW OPBE KVWM UQFM PWPA RMFH AGKX IIBG',
};

export function mount(root) {
  let cfg = { model: 'I', greek: 'Beta', rotors: ['I', 'II', 'III'], reflector: 'B', rings: [0, 0, 0], positions: [0, 0, 0], plugboard: '' };
  let start = cfg.positions.slice();
  let machine;
  let tapeIn = '', tapeOut = '';

  root.innerHTML = `
    <section class="panel">
      <h2 class="panel-title">Daily key sheet<span class="spacer"></span><button class="btn small" id="u534">Load 1945 U-boat message</button></h2>
      <div class="stack">
        <div class="field"><label for="model">Machine</label><select id="model">${Object.entries(MODELS).map(([k, m]) => `<option value="${k}">${m.name}</option>`).join('')}</select></div>
        <div class="row" id="wheel-sel"></div>
        <div class="row" id="ring-sel"></div>
        <div class="field"><label for="plug">Plugboard (Steckerbrett) pairs</label><input type="text" id="plug" placeholder="e.g. AB CD EF" autocapitalize="characters" spellcheck="false"></div>
      </div>
    </section>
    <section class="panel">
      <h2 class="panel-title">Rotor windows<span class="spacer"></span><button class="btn small" id="reset">${ICONS.reset}Reset</button></h2>
      <div class="rotors" id="rotors"></div>
      <h2 class="panel-title" style="margin-top:18px">Lampboard</h2>
      <div class="kb lampboard" id="lamps">${ROWS.map(r => `<div class="kr">${[...r].map(c => `<span class="k" data-l="${c}">${c}</span>`).join('')}</div>`).join('')}</div>
      <h2 class="panel-title" style="margin-top:14px">Keyboard</h2>
      <div class="kb" id="keys">${ROWS.map(r => `<div class="kr">${[...r].map(c => `<button class="k" data-k="${c}" aria-label="${c}">${c}</button>`).join('')}</div>`).join('')}</div>
      <div class="field" style="margin-top:12px"><label>Paper tape</label>
        <div class="align-view" id="tape"></div></div>
      <div class="btns"><button class="btn" id="tape-copy">${ICONS.copy}Copy output</button><button class="btn" id="tape-clear">Clear tape</button></div>
    </section>
    <section class="panel">
      <h2 class="panel-title">Encipher a whole message</h2>
      <div class="field"><label for="bulk">Message</label><textarea id="bulk" spellcheck="false" placeholder="Type plain or cipher text — Enigma is its own inverse."></textarea></div>
      <div class="btns"><button class="btn primary" id="run">Run through machine</button></div>
      <div class="field" style="margin-top:12px"><label>Result</label><textarea class="out" id="bulk-out" readonly></textarea></div>
      <p class="hint">Runs from the current rotor positions, then advances them — just like the real thing. To decrypt, reset the rotors to the same start and run the ciphertext through.</p>
    </section>`;

  const sel = (id, opts, v) => `<select id="${id}">${opts.map(o => `<option ${o === v ? 'selected' : ''}>${o}</option>`).join('')}</select>`;

  function renderSettings() {
    const m = MODELS[cfg.model];
    const m4 = cfg.model === 'M4';
    $('#model', root).value = cfg.model;
    $('#wheel-sel', root).innerHTML = `
      <div class="field"><label>Reflector</label>${sel('refl', m.reflectors, cfg.reflector)}</div>
      ${m4 ? `<div class="field"><label>Greek</label>${sel('greek', ['Beta', 'Gamma'], cfg.greek)}</div>` : ''}
      ${['Left', 'Middle', 'Right'].map((n, i) => `<div class="field"><label>${n}</label>${sel('rot' + i, m.rotors, cfg.rotors[i])}</div>`).join('')}`;
    const ringNames = m4 ? ['Greek', 'Left', 'Mid', 'Right'] : ['Left', 'Mid', 'Right'];
    $('#ring-sel', root).innerHTML = ringNames.map((n, i) => `<div class="field"><label>Ring ${n}</label>
      <select data-ring="${i}">${Array.from({ length: 26 }, (_, k) => `<option value="${k}" ${cfg.rings[i] === k ? 'selected' : ''}>${String(k + 1).padStart(2, '0')} (${L(k)})</option>`).join('')}</select></div>`).join('');
    $('#plug', root).value = cfg.plugboard;
    renderRotors();
  }

  function renderRotors() {
    const names = cfg.model === 'M4' ? [cfg.greek, ...cfg.rotors] : cfg.rotors;
    $('#rotors', root).innerHTML = names.map((n, i) => `
      <div class="rotor">
        <span class="rname">${esc(n)}</span>
        <button data-up="${i}" aria-label="Rotor ${i + 1} up">${ICONS.up}</button>
        <div class="win" data-win="${i}">${L(cfg.positions[i])}</div>
        <button data-dn="${i}" aria-label="Rotor ${i + 1} down">${ICONS.down}</button>
      </div>`).join('');
  }
  const updateWindows = () => $$('[data-win]', root).forEach(w => { w.textContent = L(cfg.positions[+w.dataset.win]); });

  function rebuild() { machine = new Enigma(cfg); }

  function readSettings() {
    const m4 = cfg.model === 'M4';
    cfg.reflector = $('#refl', root).value;
    if (m4) cfg.greek = $('#greek', root).value;
    cfg.rotors = [0, 1, 2].map(i => $('#rot' + i, root).value);
    cfg.rings = $$('[data-ring]', root).map(s => +s.value);
    const pb = parsePlugboard($('#plug', root).value);
    cfg.plugboard = pb.pairs.join(' ');
    if (new Set(cfg.rotors).size < 3) toast('Each rotor can only be used once');
    rebuild();
    renderRotors();
  }

  function setModel(model) {
    const m4 = model === 'M4', was4 = cfg.model === 'M4';
    cfg.model = model;
    cfg.reflector = MODELS[model].reflectors[0];
    cfg.rotors = cfg.rotors.map(r => MODELS[model].rotors.includes(r) ? r : 'I');
    if (m4 && !was4) { cfg.rings = [0, ...cfg.rings]; cfg.positions = [0, ...cfg.positions]; }
    if (!m4 && was4) { cfg.rings = cfg.rings.slice(1); cfg.positions = cfg.positions.slice(1); }
    start = cfg.positions.slice();
    renderSettings(); rebuild();
  }

  function press(ch) {
    const { out } = machine.press(ch);
    cfg.positions = machine.positions();
    updateWindows();
    tapeIn += ch; tapeOut += out;
    renderTape();
    return out;
  }
  function renderTape() {
    const g = s => s.replace(/(.{5})/g, '$1 ').trim();
    $('#tape', root).textContent = `IN  ${g(tapeIn).slice(-60)}\nOUT ${g(tapeOut).slice(-60)}`;
  }
  const lamp = (ch, on) => $(`[data-l="${ch}"]`, root)?.classList.toggle('lit', on);

  // Events
  $('#model', root).onchange = e => setModel(e.target.value);
  root.addEventListener('change', e => { if (e.target.closest('#wheel-sel, #ring-sel') || e.target.id === 'plug') readSettings(); });
  $('#plug', root).addEventListener('input', () => { cfg.plugboard = $('#plug', root).value; rebuild(); });
  $('#rotors', root).addEventListener('click', e => {
    const up = e.target.closest('[data-up]'), dn = e.target.closest('[data-dn]');
    if (!up && !dn) return;
    const i = +(up || dn).dataset[up ? 'up' : 'dn'];
    cfg.positions[i] = (cfg.positions[i] + (up ? 1 : 25)) % 26;
    start = cfg.positions.slice();
    rebuild(); updateWindows();
  });
  $('#reset', root).onclick = () => { cfg.positions = start.slice(); rebuild(); updateWindows(); toast('Rotors reset to ' + start.map(L).join('')); };

  let lit = null;
  const keys = $('#keys', root);
  keys.addEventListener('pointerdown', e => {
    const k = e.target.closest('[data-k]'); if (!k) return;
    e.preventDefault();
    lit = press(k.dataset.k); lamp(lit, true);
    navigator.vibrate?.(8);
  });
  const release = () => { if (lit) { lamp(lit, false); lit = null; } };
  keys.addEventListener('pointerup', release); keys.addEventListener('pointerleave', release); keys.addEventListener('pointercancel', release);
  const onKey = e => {
    if (e.target.matches('input, textarea, select') || e.repeat || e.ctrlKey || e.metaKey) return;
    const c = e.key.toUpperCase();
    if (c.length === 1 && c >= 'A' && c <= 'Z') { release(); lit = press(c); lamp(lit, true); }
  };
  const onKeyUp = () => release();
  document.addEventListener('keydown', onKey);
  document.addEventListener('keyup', onKeyUp);

  $('#tape-copy', root).onclick = () => copy(tapeOut.replace(/(.{5})/g, '$1 ').trim());
  $('#tape-clear', root).onclick = () => { tapeIn = tapeOut = ''; renderTape(); };
  $('#run', root).onclick = () => {
    const out = machine.encode($('#bulk', root).value, true);
    cfg.positions = machine.positions(); updateWindows();
    $('#bulk-out', root).value = out;
  };
  $('#u534', root).onclick = () => {
    Object.assign(cfg, { model: U534.model, greek: U534.greek, rotors: U534.rotors.slice(), reflector: U534.reflector, rings: U534.rings.slice(), positions: U534.positions.slice(), plugboard: U534.plugboard });
    start = cfg.positions.slice();
    renderSettings(); rebuild();
    $('#bulk', root).value = U534.text;
    $('#bulk-out', root).value = '';
    toast('Key set: Beta II IV I · rings AAAV · start VJNA');
    $('#bulk', root).scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  renderSettings(); rebuild(); renderTape();
  return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('keyup', onKeyUp); };
}
