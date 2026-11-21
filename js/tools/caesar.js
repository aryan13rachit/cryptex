import { $, esc, textTool, ICONS } from '../ui.js';
import { caesar, caesarCrack, ALPHA } from '../lib/classical.js';

function wheelSVG() {
  const cx = 160, cy = 160, ro = 142, ri = 104;
  const letters = (r, cls) => ALPHA.split('').map((ch, i) => {
    const a = (i / 26) * 2 * Math.PI - Math.PI / 2;
    return `<text class="${cls}" x="${(cx + r * Math.cos(a)).toFixed(1)}" y="${(cy + r * Math.sin(a)).toFixed(1)}" transform="rotate(${(i * 360 / 26).toFixed(2)} ${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)})">${ch}</text>`;
  }).join('');
  const ticks = Array.from({ length: 26 }, (_, i) => {
    const a = ((i + 0.5) / 26) * 2 * Math.PI - Math.PI / 2;
    return `M${cx + 124 * Math.cos(a)} ${cy + 124 * Math.sin(a)}L${cx + 158 * Math.cos(a)} ${cy + 158 * Math.sin(a)}`;
  }).join('');
  return `<svg class="wheel" viewBox="0 0 320 320" role="img" aria-label="Cipher wheel">
    <circle class="outer-ring" cx="${cx}" cy="${cy}" r="158"/>
    <path class="ticks" d="${ticks}"/>
    <g class="outer-text">${letters(ro, '')}</g>
    <g id="inner" style="transform-origin:160px 160px;transition:transform .35s cubic-bezier(.3,1.4,.5,1);cursor:grab;touch-action:none">
      <circle class="inner-ring" cx="${cx}" cy="${cy}" r="124"/>
      <g class="inner-text">${letters(ri, '')}</g>
      <circle class="hub" cx="${cx}" cy="${cy}" r="16"/>
    </g>
    <path class="pointer" d="M160 2v20M154 14l6 8 6-8"/>
  </svg>`;
}

export function mount(root) {
  root.innerHTML = `
    <section class="panel">
      <h2 class="panel-title">Cipher wheel<span class="spacer"></span><span class="readout" id="shift-read">+3</span></h2>
      <div class="wheel-wrap">${wheelSVG()}</div>
      <div class="field" style="margin-top:12px"><label for="shift">Shift (drag the inner wheel or slide)</label>
        <input type="range" id="shift" min="0" max="25" value="3"></div>
      <div class="btns">${[1, 3, 13].map(s => `<button class="btn small" data-preset="${s}">${s === 13 ? 'ROT13' : s === 3 ? 'Caesar (3)' : 'ROT1'}</button>`).join('')}</div>
    </section>`;
  const tt = textTool(root, {
    sample: 'Meet me at the old clock tower at midnight.',
    transform: (t, m) => { const s = +$('#shift', root).value; return caesar(t, m === 'enc' ? s : -s); },
  });
  root.insertAdjacentHTML('beforeend', `
    <section class="panel">
      <h2 class="panel-title">Brute-force all 26 shifts</h2>
      <p class="hint" style="margin-top:0">Got a Caesar message but no key? Every shift is tried and ranked by how English it looks.</p>
      <div class="btns"><button class="btn primary" id="crack">${ICONS.key}Crack the message above</button></div>
      <ul class="list" id="crack-list" style="margin-top:10px"></ul>
    </section>`);

  const shift = $('#shift', root), inner = $('#inner', root), read = $('#shift-read', root);
  const set = (s, fromDrag) => {
    s = ((Math.round(s) % 26) + 26) % 26;
    shift.value = s;
    read.textContent = '+' + s;
    if (!fromDrag) inner.style.transform = `rotate(${-s * 360 / 26}deg)`;
    tt.run();
  };
  shift.addEventListener('input', () => set(+shift.value));
  root.querySelectorAll('[data-preset]').forEach(b => b.onclick = () => set(+b.dataset.preset));

  // Drag the inner wheel
  const svg = $('.wheel', root);
  let drag = null;
  const ang = e => { const r = svg.getBoundingClientRect(); return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180 / Math.PI; };
  inner.addEventListener('pointerdown', e => { drag = { a0: ang(e), s0: +shift.value }; inner.setPointerCapture(e.pointerId); inner.style.transition = 'none'; });
  inner.addEventListener('pointermove', e => {
    if (!drag) return;
    const d = ang(e) - drag.a0;
    const rot = -drag.s0 * 360 / 26 + d;
    inner.style.transform = `rotate(${rot}deg)`;
    set(-rot / (360 / 26), true);
  });
  const end = () => { if (!drag) return; drag = null; inner.style.transition = ''; set(+shift.value); };
  inner.addEventListener('pointerup', end); inner.addEventListener('pointercancel', end);

  $('#crack', root).onclick = () => {
    const text = tt.input.value;
    const res = caesarCrack(text);
    $('#crack-list', root).innerHTML = res.slice(0, 26).map((r, i) =>
      `<li><span class="tag ${i === 0 ? 'best' : ''}">−${r.shift}</span><span class="${i === 0 ? 'best' : ''}">${esc(r.text.slice(0, 120))}</span></li>`).join('');
  };
  set(3);
}
