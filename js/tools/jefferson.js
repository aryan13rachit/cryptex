// The Jefferson wheel cipher: a cylinder of lettered disks. Key = disk order. Set the message on one
// row, send another row. The receiver sets the ciphertext and scans the cylinder for the readable row.
import { $, $$, esc, seg, bindSeg, copy, ICONS, theme } from '../ui.js';
import { sfx } from '../lib/sfx.js';
import { haptic } from '../lib/native.js';
import { DISKS, parseOrder, jefferson, cylinderRows } from '../lib/spycraft.js';
import { letterCounts, chiSquared } from '../lib/classical.js';

const DEFAULT_KEY = '7 2 19 4 33 12 25 1 30 16 9 21';

export function mount(root) {
  root.innerHTML = `
    <section class="panel">
      <h2 class="panel-title">The key: disk order</h2>
      <div class="field"><label for="jw-key">Disks on the axle, left to right (1–${DISKS.length})</label>
        <input id="jw-key" type="text" inputmode="numeric" value="${DEFAULT_KEY}" spellcheck="false"></div>
      <div class="btns"><button class="btn small" id="jw-shuffle">${ICONS.reset}New random key</button></div>
      <p class="hint" id="jw-keyhint"></p>
    </section>
    <section class="panel">
      <div class="row" style="justify-content:space-between;margin-bottom:12px">${seg('jmode', [['enc', 'Encode'], ['dec', 'Decode']], 'enc')}</div>
      <div class="field"><label for="jw-in" id="jw-inlabel">Message</label>
        <textarea id="jw-in" spellcheck="false">Meet me at the old mill at midnight</textarea></div>
      <div class="field jw-offset"><label for="jw-off">Send the row <b id="jw-offv">5</b> below the message</label>
        <input id="jw-off" type="range" min="1" max="25" value="5"></div>
      <div class="field" style="margin-top:12px"><label for="jw-out" id="jw-outlabel">Ciphertext</label>
        <textarea id="jw-out" class="out" readonly spellcheck="false"></textarea></div>
      <p class="hint warn" id="jw-err" hidden></p>
      <div class="btns"><button class="btn primary" id="jw-copy">${ICONS.copy}Copy</button></div>
    </section>
    <section class="panel">
      <h2 class="panel-title">The cylinder<span class="spacer"></span><span class="readout" id="jw-chunk"></span></h2>
      <p class="hint" id="jw-help" style="margin-top:0"></p>
      <div class="jw-cyl" id="jw-cyl"></div>
      <div class="btns" id="jw-pager"></div>
    </section>
    <section class="panel">
      <h2 class="panel-title">The history</h2>
      <p class="hint" style="margin-top:0">Thomas Jefferson described a “wheel cypher” of 36 wooden disks around 1795. It was forgotten, then reinvented by Étienne Bazeries in 1891, and the US Army used it as the M-94 (25 aluminium disks) from 1922 into the Second World War. The disk alphabets in this kit are a fixed, reproducible set made for Cryptex — not a historical set — so both ends just need the same disk order.</p>
    </section>`;

  const keyIn = $('#jw-key', root), inp = $('#jw-in', root), out = $('#jw-out', root), off = $('#jw-off', root), err = $('#jw-err', root);
  let chunk = 0, manual = [];   // manual: extra turns per disk from dragging (visual only)
  const mode = bindSeg(root, 'jmode', () => { chunk = 0; manual = []; render(); });

  const render = () => {
    let order;
    try { order = parseOrder(keyIn.value); err.hidden = true; }
    catch (e) { err.textContent = e.message; err.hidden = false; out.value = ''; $('#jw-cyl', root).innerHTML = ''; return; }
    const dec = mode.get() === 'dec', o = +off.value;
    $('#jw-offv', root).textContent = o;
    $('#jw-keyhint', root).textContent = `${order.length} disks · ${order.length} letters per turn of the cylinder.`;
    $('#jw-inlabel', root).textContent = dec ? 'Ciphertext received' : 'Message';
    $('#jw-outlabel', root).textContent = dec ? 'Plaintext' : 'Ciphertext';
    $('.jw-offset', root).hidden = dec;
    const text = inp.value.toUpperCase().replace(/[^A-Z]/g, '');
    const chunks = text.match(new RegExp(`.{1,${order.length}}`, 'g')) || [];
    chunk = Math.min(chunk, Math.max(0, chunks.length - 1));
    const c = chunks[chunk] || '';

    // rows of the current chunk; decode: find the most English-looking row per chunk
    const best = s => { const rows = cylinderRows(s, order); let k = 1, b = Infinity; for (let r = 1; r < 26; r++) { const x = chiSquared(letterCounts(rows[r])); if (x < b) { b = x; k = r; } } return k; };
    if (dec) out.value = chunks.map(s => cylinderRows(s, order)[best(s)]).join(' ');
    else out.value = (jefferson(text, order, o).match(/.{1,5}/g) || []).join(' ');

    const rows = c ? cylinderRows(c, order) : [];
    const hot = dec ? (c ? best(c) : -1) : o;
    const cyl = $('#jw-cyl', root);
    cyl.style.setProperty('--n', c.length || 1);
    cyl.innerHTML = c ? [...c].map((_, i) => `<div class="jw-disk" data-i="${i}" style="--t:${manual[i] || 0}">
        <span class="jw-no">${order[i % order.length] + 1}</span>
        ${rows.map((row, r) => { const ch = rows[(r + (manual[i] || 0) + 26) % 26][i]; return `<i class="${r === 0 ? 'set' : ''}${r === hot ? ' hot' : ''}">${ch}</i>`; }).join('')}
      </div>`).join('') : '<p class="hint">Type a message to load the cylinder.</p>';
    $('#jw-help', root).textContent = dec
      ? `Top row: the ciphertext you received. Highlighted: row ${hot}, the one that reads as language — the message.`
      : `Top row: your message. Highlighted: row ${o}, which you send. Drag any disk to turn it.`;
    $('#jw-chunk', root).textContent = chunks.length > 1 ? `TURN ${chunk + 1}/${chunks.length}` : '';
    $('#jw-pager', root).innerHTML = chunks.length > 1 ? chunks.map((_, k) => `<button class="btn small${k === chunk ? ' primary' : ''}" data-chunk="${k}">${k + 1}</button>`).join('') : '';
  };

  // drag a disk up/down to turn it (visual exploration; the cipher always uses the set rows)
  let drag = null;
  root.addEventListener('pointerdown', e => {
    const d = e.target.closest('.jw-disk'); if (!d) return;
    drag = { i: +d.dataset.i, y: e.clientY, base: manual[+d.dataset.i] || 0, step: d.querySelector('i').offsetHeight || 20 };
    d.setPointerCapture?.(e.pointerId);
  });
  root.addEventListener('pointermove', e => {
    if (!drag) return;
    const t = drag.base - Math.round((e.clientY - drag.y) / drag.step);
    if (t !== (manual[drag.i] || 0)) { manual[drag.i] = t; sfx('keydown'); haptic('light'); render(); }
  });
  root.addEventListener('pointerup', () => { drag = null; });
  root.addEventListener('pointercancel', () => { drag = null; });
  root.addEventListener('click', e => { const b = e.target.closest('[data-chunk]'); if (b) { chunk = +b.dataset.chunk; manual = []; render(); } });

  $('#jw-shuffle', root).onclick = () => {
    const ids = Array.from({ length: DISKS.length }, (_, i) => i + 1);
    for (let i = ids.length - 1; i > 0; i--) { const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1); [ids[i], ids[j]] = [ids[j], ids[i]]; }
    keyIn.value = ids.slice(0, 12).join(' '); manual = []; render(); sfx('keydown');
  };
  $('#jw-copy', root).onclick = () => copy(out.value);
  for (const el of [keyIn, inp, off]) el.addEventListener('input', () => { manual = []; render(); });
  render();
}
