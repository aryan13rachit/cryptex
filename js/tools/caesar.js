import { $, esc, textTool, ICONS } from '../ui.js';
import { caesar, caesarCrack, ALPHA } from '../lib/classical.js';

/**
 * Cipher disk modelled on real ones (spun-metal outer disk with engraved letters, raised celluloid
 * inner disk, domed rivet, index pointer). Colours come from theme variables:
 * brass + ivory on the detective's desk, black anodised + bare aluminium in the radio room.
 */
function wheelSVG() {
  const cx = 160, cy = 160, ro = 142, ri = 103;
  const letters = (r, fill) => ALPHA.split('').map((ch, i) => {
    const a = (i / 26) * 2 * Math.PI - Math.PI / 2;
    const x = (cx + r * Math.cos(a)).toFixed(1), y = (cy + r * Math.sin(a)).toFixed(1), rot = (i * 360 / 26).toFixed(2);
    // engraved: a light lip below each letter, dark fill
    return `<g transform="rotate(${rot} ${x} ${y})"><text x="${x}" y="${(+y + .7).toFixed(1)}" style="fill:var(--wl-hi)">${ch}</text><text x="${x}" y="${y}" style="fill:${fill}">${ch}</text></g>`;
  }).join('');
  const ticks = (r0, r1) => Array.from({ length: 26 }, (_, i) => {
    const a = ((i + 0.5) / 26) * 2 * Math.PI - Math.PI / 2;
    return `M${(cx + r0 * Math.cos(a)).toFixed(1)} ${(cy + r0 * Math.sin(a)).toFixed(1)}L${(cx + r1 * Math.cos(a)).toFixed(1)} ${(cy + r1 * Math.sin(a)).toFixed(1)}`;
  }).join('');
  const spin = (r0, r1, step, op) => Array.from({ length: Math.floor((r1 - r0) / step) }, (_, i) =>
    `<circle cx="${cx}" cy="${cy}" r="${(r0 + i * step).toFixed(1)}" fill="none" stroke="rgba(255,255,255,${(op * (0.4 + ((i * 7) % 5) / 5)).toFixed(3)})" stroke-width=".6"/>`).join('');
  return `<svg class="wheel" viewBox="0 0 320 320" role="img" aria-label="Cipher wheel" style="touch-action:none;cursor:grab;user-select:none;-webkit-user-select:none">
    <defs>
      <radialGradient id="wOuter" cx=".42" cy=".38" r=".7"><stop offset="0" style="stop-color:var(--wo-1)"/><stop offset=".6" style="stop-color:var(--wo-2)"/><stop offset="1" style="stop-color:var(--wo-3)"/></radialGradient>
      <radialGradient id="wInner" cx=".4" cy=".35" r=".75"><stop offset="0" style="stop-color:var(--wi-1)"/><stop offset=".75" style="stop-color:var(--wi-2)"/><stop offset="1" style="stop-color:var(--wi-3)"/></radialGradient>
      <linearGradient id="wSheen" x1="0" y1="0" x2="1" y2="1"><stop offset=".2" stop-color="#fff" stop-opacity="0"/><stop offset=".42" stop-color="#fff" stop-opacity=".22"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/><stop offset=".78" stop-color="#fff" stop-opacity=".1"/><stop offset=".9" stop-color="#fff" stop-opacity="0"/></linearGradient>
      <radialGradient id="wRivet" cx=".35" cy=".3"><stop offset="0" stop-color="#fffbe8"/><stop offset=".35" style="stop-color:var(--wr-1)"/><stop offset="1" style="stop-color:var(--wr-2)"/></radialGradient>
      <filter id="wShadow" x="-10%" y="-10%" width="120%" height="120%"><feDropShadow dx="0" dy="2.5" stdDeviation="2.5" flood-color="#000" flood-opacity=".45"/></filter>
    </defs>
    <circle cx="${cx}" cy="${cy + 3}" r="157" fill="#000" opacity=".35" style="filter:blur(4px)"/>
    <circle cx="${cx}" cy="${cy}" r="157" fill="url(#wOuter)" stroke="var(--wo-edge)" stroke-width="2"/>
    ${spin(126, 156, 1.6, .05)}
    <circle cx="${cx}" cy="${cy}" r="157" fill="url(#wSheen)"/>
    <circle cx="${cx}" cy="${cy}" r="153.5" fill="none" stroke="rgba(255,255,255,.3)" stroke-width=".8"/>
    <path d="${ticks(127, 156)}" style="stroke:var(--wl-tick)" stroke-width=".9"/>
    <g style="font:600 14px 'Courier Prime',monospace;text-anchor:middle;dominant-baseline:central">${letters(ro, 'var(--wl-out)')}</g>
    <g id="inner" style="transform-origin:160px 160px;transform-box:view-box;transition:transform .35s cubic-bezier(.3,1.4,.5,1)">
      <circle cx="${cx}" cy="${cy}" r="124" fill="url(#wInner)" stroke="var(--wi-edge)" stroke-width="1.4" filter="url(#wShadow)"/>
      ${spin(30, 122, 2.2, .025)}
      <circle cx="${cx}" cy="${cy}" r="124" fill="url(#wSheen)" opacity=".7"/>
      <circle cx="${cx}" cy="${cy}" r="88" fill="none" style="stroke:var(--wl-tick)" stroke-width=".7"/>
      <path d="${ticks(88, 118)}" style="stroke:var(--wl-tick)" stroke-width=".6" opacity=".7"/>
      <g style="font:600 13px 'Courier Prime',monospace;text-anchor:middle;dominant-baseline:central">${letters(ri, 'var(--wl-in)')}</g>
      <circle cx="${cx}" cy="${cy + 1.5}" r="15" fill="#000" opacity=".35" style="filter:blur(1.5px)"/>
      <circle cx="${cx}" cy="${cy}" r="14" fill="url(#wRivet)" stroke="rgba(0,0,0,.45)" stroke-width=".8"/>
      <ellipse cx="${cx - 4}" cy="${cy - 5}" rx="3.5" ry="1.8" fill="#fff" opacity=".32" transform="rotate(-30 ${cx - 4} ${cy - 5})"/>
    </g>
    <g filter="url(#wShadow)">
      <path d="M150 0 h20 v10 l-10 14 l-10 -14 z" fill="url(#wRivet)" stroke="rgba(0,0,0,.5)" stroke-width=".8"/>
      <circle cx="160" cy="6" r="2.2" fill="#3a3a3a"/><path d="M158.5 6h3" stroke="#bbb" stroke-width=".6"/>
    </g>
  </svg>`;
}
export function mount(root) {
  root.innerHTML = `
    <section class="panel">
      <h2 class="panel-title">Cipher wheel<span class="spacer"></span><span class="readout" id="shift-read">+3</span></h2>
      <div class="wheel-wrap">${wheelSVG()}</div>
      <div class="field" style="margin-top:12px"><label for="shift">Shift (drag the inner wheel or slide)</label>
        <input type="range" id="shift" min="0" max="25" value="3"></div>
      <div class="btns"><button class="btn small" data-step="-1" aria-label="Shift down">−</button><button class="btn small" data-step="1" aria-label="Shift up">+</button>${[1, 3, 13].map(s => `<button class="btn small" data-preset="${s}">${s === 13 ? 'ROT13' : s === 3 ? 'Caesar (3)' : 'ROT1'}</button>`).join('')}</div>
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
  const STEP = 360 / 26;
  let rot = 0;                                   // continuous wheel angle (deg), never wraps
  const norm = a => ((a + 180) % 360 + 360) % 360 - 180;
  const show = () => { inner.style.transform = `rotate(${rot}deg)`; };
  const set = (s, fromDrag) => {
    s = ((Math.round(s) % 26) + 26) % 26;
    shift.value = s;
    read.textContent = '+' + s;
    if (!fromDrag) { rot += norm(-s * STEP - rot); show(); }   // shortest way round
    tt.run();
  };
  shift.addEventListener('input', () => set(+shift.value));
  root.querySelectorAll('[data-preset]').forEach(b => b.onclick = () => set(+b.dataset.preset));

  // Drag the inner wheel. The whole <svg> is the touch surface (touch-action:none), so phones don't scroll instead.
  const svg = $('.wheel', root);
  let drag = null;
  const ang = e => { const r = svg.getBoundingClientRect(); return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180 / Math.PI; };
  svg.addEventListener('pointerdown', e => { e.preventDefault(); drag = { last: ang(e) }; try { svg.setPointerCapture(e.pointerId); } catch {} inner.style.transition = 'none'; });
  svg.addEventListener('pointermove', e => {
    if (!drag) return;
    const a = ang(e);
    rot += norm(a - drag.last);                  // unwrap across the ±180° seam
    drag.last = a;
    show();
    set(-rot / STEP, true);
  });
  const end = () => { if (!drag) return; drag = null; inner.style.transition = ''; set(+shift.value); };
  svg.addEventListener('pointerup', end); svg.addEventListener('pointercancel', end);
  root.querySelectorAll('[data-step]').forEach(b => b.onclick = () => set(+shift.value + +b.dataset.step));

  $('#crack', root).onclick = () => {
    const text = tt.input.value;
    const res = caesarCrack(text);
    $('#crack-list', root).innerHTML = res.slice(0, 26).map((r, i) =>
      `<li><span class="tag ${i === 0 ? 'best' : ''}">−${r.shift}</span><span class="${i === 0 ? 'best' : ''}">${esc(r.text.slice(0, 120))}</span></li>`).join('');
  };
  set(3);
}
