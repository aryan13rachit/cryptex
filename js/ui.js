// Shared UI helpers and icons.
import { isNative, nativeSaveShare } from './lib/native.js';

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const theme = () => document.documentElement.dataset.theme;

const P = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
export const ICONS = {
  caesar: P('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="M12 3v4M12 17v4M3 12h4M17 12h4"/><path d="M14.5 8.2l1.6-1.6"/>'),
  vigenere: P('<rect x="3" y="3" width="18" height="18" rx="1"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/><path d="M5 5.5h2M11 11.5h2M17 17.5h2"/>'),
  ciphers: P('<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M4 9h16M4 15h16M10 6h4M10 12h4M10 18h4"/>'),
  encoders: P('<path d="M8 6l-5 6 5 6M16 6l5 6-5 6M14 4l-4 16"/>'),
  morse: P('<circle cx="5" cy="7" r="1.6"/><path d="M10 7h10"/><path d="M4 13h9"/><circle cx="18" cy="13" r="1.6"/><path d="M3 19h18"/><path d="M8 19v-2h8v2"/>'),
  lightbeam: P('<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9V16h7v-2.1A6 6 0 0 0 12 3z"/><path d="M2 9h2M20 9h2M4.2 3.2l1.5 1.5M19.8 3.2l-1.5 1.5"/>'),
  enigma: P('<rect x="3" y="5" width="18" height="14" rx="2"/><rect x="6" y="8" width="3" height="4"/><rect x="10.5" y="8" width="3" height="4"/><rect x="15" y="8" width="3" height="4"/><path d="M6 15.5h1M9 15.5h1M12 15.5h1M15 15.5h1M18 15.5h-.5"/>'),
  sstv: P('<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 2.5l4 4 4-4"/><path d="M6 16l3.5-4 3 3 2-2 3.5 3"/><circle cx="16.5" cy="10.5" r="1"/>'),
  soundpaper: P('<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4"/><path d="M8 14h1.5l1-3 1.5 6 1.5-5 1 2H17"/>'),
  vault: P('<rect x="3" y="6" width="18" height="13" rx="1.5"/><path d="M3 7l9 6 9-6"/><circle cx="17.5" cy="16" r="3" fill="currentColor" stroke="none" opacity=".25"/>'),
  codebreaker: P('<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/><path d="M7.5 12.5v-2M10.5 12.5v-5M13.5 12.5V9.5"/>'),
  jefferson: P('<ellipse cx="12" cy="5" rx="8" ry="2.2"/><path d="M4 5v14c0 1.2 3.6 2.2 8 2.2s8-1 8-2.2V5"/><path d="M4 9.5c0 1.2 3.6 2.2 8 2.2s8-1 8-2.2M4 14c0 1.2 3.6 2.2 8 2.2s8-1 8-2.2"/>'),
  numbers: P('<path d="M12 10v11M8 21h8"/><circle cx="12" cy="8" r="2"/><path d="M7.8 3.8a6 6 0 0 0 0 8.4M16.2 3.8a6 6 0 0 1 0 8.4M5 1.5a9.5 9.5 0 0 0 0 13M19 1.5a9.5 9.5 0 0 1 0 13"/>'),
  anagram: P('<rect x="2.5" y="8" width="6" height="7" rx="1"/><rect x="9" y="5" width="6" height="7" rx="1"/><rect x="15.5" y="9" width="6" height="7" rx="1"/><path d="M5 19c3 2.5 11 2.5 14 0M17 17.5l2 1.5-1 2.2"/>'),
  coldcases: P('<path d="M3 6h7l2 2h9v12H3z"/><path d="M10.5 12.2a2 2 0 1 1 2.6 1.9c-.6.2-1.1.7-1.1 1.4v.4M12 18.2v.1"/>'),
  play: P('<path d="M7 4l13 8-13 8z"/>'),
  stop: P('<rect x="6" y="6" width="12" height="12" rx="1"/>'),
  mic: P('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>'),
  camera: P('<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>'),
  upload: P('<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>'),
  download: P('<path d="M12 4v12M7 11l5 5 5-5M4 20h16"/>'),
  copy: P('<rect x="8" y="8" width="12" height="12" rx="1"/><path d="M16 8V4H4v12h4"/>'),
  swap: P('<path d="M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/>'),
  up: P('<path d="M6 15l6-6 6 6"/>'),
  down: P('<path d="M6 9l6 6 6-6"/>'),
  flash: P('<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>'),
  key: P('<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3"/>'),
  print: P('<path d="M6 9V3h12v6M6 18H4v-7h16v7h-2M7 14h10v7H7z"/>'),
  reset: P('<path d="M4 4v6h6"/><path d="M5 10a8 8 0 1 1 2 6"/>'),
};

let toastTimer;
export function toast(msg, ms = 2200) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), ms);
}

export async function copy(text) {
  try { await navigator.clipboard.writeText(text); toast(theme() === 'radio' ? 'BUFFER COPIED' : 'Copied to clipboard'); }
  catch { toast('Copy failed — select and copy manually'); }
}

export async function download(data, filename, type) {
  const blob = data instanceof Blob ? data : new Blob([data], { type });
  if (isNative()) { try { if (await nativeSaveShare(blob, filename)) return; } catch (e) { toast('Could not save: ' + e.message); return; } }
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** Share a file via the Web Share API when available, else download it. */
export async function shareOrDownload(blob, filename) {
  if (isNative()) return download(blob, filename);
  const file = new File([blob], filename, { type: blob.type });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: filename }); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  download(blob, filename);
}

export function seg(name, options, value, cls = '') {
  return `<div class="seg ${cls}" role="group" data-seg="${name}">${options.map(([v, l]) =>
    `<button type="button" data-v="${esc(v)}" aria-pressed="${v === value}">${l}</button>`).join('')}</div>`;
}
/** Wire a segmented control; returns { get(), set(v) }. */
export function bindSeg(root, name, onChange) {
  const el = $(`[data-seg="${name}"]`, root);
  let value = $('[aria-pressed="true"]', el)?.dataset.v;
  const set = (v, fire = true) => {
    value = v;
    $$('button', el).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === v)));
    if (fire) onChange?.(v);
  };
  el.addEventListener('click', e => { const b = e.target.closest('button'); if (b) set(b.dataset.v); });
  return { get: () => value, set };
}

export function cssVar(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
export function scopeColors() {
  return { bg: cssVar('--scope-bg'), grid: cssVar('--scope-grid'), line: cssVar('--scope-line'), accent: cssVar('--scope-accent'), font: cssVar('--font-mono') };
}

/** Size a canvas for its CSS box × devicePixelRatio. Returns { ctx, w, h } in CSS pixels. */
export function fitCanvas(canvas) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const r = canvas.getBoundingClientRect();
  const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
}

/** Draw a scrolling trace (values 0..1) with optional threshold line. */
export function drawTrace(canvas, values, { threshold = null, marks = null } = {}) {
  const { ctx, w, h } = fitCanvas(canvas);
  const c = scopeColors();
  ctx.fillStyle = c.bg; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = c.grid; ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 24) { ctx.beginPath(); ctx.moveTo(x + .5, 0); ctx.lineTo(x + .5, h); ctx.stroke(); }
  for (let y = 0; y < h; y += 24) { ctx.beginPath(); ctx.moveTo(0, y + .5); ctx.lineTo(w, y + .5); ctx.stroke(); }
  if (marks) {
    ctx.fillStyle = c.accent; ctx.globalAlpha = .18;
    const n = marks.length;
    marks.forEach((m, i) => { if (m) ctx.fillRect(i / n * w, 0, w / n + 1, h); });
    ctx.globalAlpha = 1;
  }
  if (threshold !== null) {
    ctx.strokeStyle = c.accent; ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.moveTo(0, h - threshold * h); ctx.lineTo(w, h - threshold * h); ctx.stroke(); ctx.setLineDash([]);
  }
  ctx.strokeStyle = c.line;
  ctx.beginPath();
  const n = values.length;
  values.forEach((v, i) => { const x = i / Math.max(1, n - 1) * w, y = h - 4 - v * (h - 8); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
  // phosphor glow without shadowBlur (which is slow on phones): a wide faint stroke under the line
  if (theme() === 'radio') { ctx.globalAlpha = .22; ctx.lineWidth = 6; ctx.stroke(); ctx.globalAlpha = 1; }
  ctx.lineWidth = theme() === 'radio' ? 2 : 1.6;
  ctx.stroke();
}

/** Pick a file via a hidden input. */
export function pickFile(accept, capture) {
  return new Promise(resolve => {
    const inp = Object.assign(document.createElement('input'), { type: 'file', accept });
    if (capture) inp.setAttribute('capture', capture);
    inp.onchange = () => resolve(inp.files[0] || null);
    inp.click();
  });
}

export function loadImageFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { resolve(img); setTimeout(() => URL.revokeObjectURL(url), 1000); };
    img.onerror = () => reject(new Error('Could not read that image'));
    img.src = url;
  });
}

/**
 * Standard text-in / text-out tool panel.
 * opts: { params: html, transform(text, mode) → string, sample, modes: [[v,label],...], inLabel, outLabel }
 */
export function textTool(root, opts) {
  const modes = opts.modes || [['enc', 'Encode'], ['dec', 'Decode']];
  root.insertAdjacentHTML('beforeend', `
    <section class="panel">
      <div class="row" style="justify-content:space-between;margin-bottom:12px">${seg('mode', modes, modes[0][0])}</div>
      ${opts.params ? `<div class="stack params" style="margin-bottom:12px">${opts.params}</div>` : ''}
      <div class="field"><label for="tt-in">${opts.inLabel || 'Message'}</label>
        <textarea id="tt-in" spellcheck="false" placeholder="Type or paste here…">${esc(opts.sample || '')}</textarea></div>
      <div class="field" style="margin-top:12px"><label for="tt-out">${opts.outLabel || 'Result'}</label>
        <textarea id="tt-out" class="out" readonly spellcheck="false"></textarea></div>
      <p class="hint warn" id="tt-err" hidden></p>
      <div class="btns">
        <button class="btn primary" id="tt-copy">${ICONS.copy}Copy</button>
        <button class="btn" id="tt-swap">${ICONS.swap}Swap</button>
        <button class="btn" id="tt-clear">Clear</button>
      </div>
    </section>`);
  const inp = $('#tt-in', root), out = $('#tt-out', root), err = $('#tt-err', root);
  const run = () => {
    try { out.value = opts.transform(inp.value, mode.get()); err.hidden = true; }
    catch (e) { out.value = ''; err.textContent = e.message; err.hidden = false; }
  };
  const mode = bindSeg(root, 'mode', run);
  inp.addEventListener('input', run);
  root.querySelector('.params')?.addEventListener('input', run);
  root.querySelector('.params')?.addEventListener('change', run);
  $('#tt-copy', root).onclick = () => copy(out.value);
  $('#tt-swap', root).onclick = () => {
    inp.value = out.value;
    const vals = modes.map(m => m[0]);
    if (vals.length === 2) mode.set(vals[mode.get() === vals[0] ? 1 : 0]); else run();
  };
  $('#tt-clear', root).onclick = () => { inp.value = ''; run(); inp.focus(); };
  run();
  return { run, input: inp, output: out, mode };
}
