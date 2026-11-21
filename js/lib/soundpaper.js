// "Sound paper": encode audio as a printable spectrogram image framed by marker bars,
// and turn such an image (file or live camera column) back into sound by additive synthesis.
import { hann, magnitudeSpectrum } from './dsp.js';

export const SP = {
  rows: 192,        // frequency bands in the encoded image
  fMin: 80, fMax: 8000,
  rangeDb: 50,      // dynamic range mapped to ink darkness
  pxPerSec: 48,
  marker: 14,       // marker bar thickness (px)
  gap: 6,           // white gap between marker and content (px)
  margin: 18,       // white margin around everything (px)
};

export const bandFreq = (k, n = SP.rows) => SP.fMax * Math.pow(SP.fMin / SP.fMax, (k + 0.5) / n); // row 0 = top = highest

/** Encode mono samples into an RGBA image. Returns { width, height, data, content:{x,y,w,h} }. */
export function soundToImage(samples, fs, opts = {}) {
  const o = { ...SP, ...opts };
  const cols = Math.max(8, Math.ceil(samples.length / fs * o.pxPerSec));
  const N = fs > 30000 ? 4096 : 2048, win = hann(N);
  const spec = new Float32Array(cols * o.rows);
  const binHz = fs / N;
  // band edges
  const edge = k => o.fMax * Math.pow(o.fMin / o.fMax, k / o.rows);
  let maxDb = -Infinity;
  const frame = new Float32Array(N);
  for (let c = 0; c < cols; c++) {
    const center = Math.round((c + 0.5) / o.pxPerSec * fs);
    for (let i = 0; i < N; i++) frame[i] = samples[center - N / 2 + i] || 0;
    const mag = magnitudeSpectrum(frame, win);
    for (let k = 0; k < o.rows; k++) {
      const hi = edge(k), lo = edge(k + 1);
      let b0 = Math.floor(lo / binHz), b1 = Math.ceil(hi / binHz);
      let e = 0;
      for (let b = Math.max(1, b0); b <= Math.min(N / 2 - 1, b1); b++) e = Math.max(e, mag[b]);
      const db = 20 * Math.log10(e + 1e-9);
      spec[c * o.rows + k] = db;
      if (db > maxDb) maxDb = db;
    }
  }
  const cw = cols, ch = o.rows;
  const width = cw + 2 * o.margin;
  const height = ch + 2 * (o.margin + o.marker + o.gap) + 16;
  const data = new Uint8ClampedArray(width * height * 4).fill(255);
  const put = (x, y, v) => { const i = (y * width + x) * 4; data[i] = data[i + 1] = data[i + 2] = v; data[i + 3] = 255; };
  const cy = o.margin + o.marker + o.gap;
  // markers span exactly the content width
  for (let x = 0; x < cw; x++) for (let t = 0; t < o.marker; t++) {
    put(o.margin + x, o.margin + t, 0);
    put(o.margin + x, cy + ch + o.gap + t, 0);
  }
  for (let c = 0; c < cols; c++) for (let k = 0; k < o.rows; k++) {
    const d = Math.max(0, Math.min(1, (spec[c * o.rows + k] - (maxDb - o.rangeDb)) / o.rangeDb));
    put(o.margin + c, cy + k, Math.round(255 * (1 - d)));
  }
  return { width, height, data, content: { x: o.margin, y: cy, w: cw, h: ch }, seconds: cols / o.pxPerSec };
}

export const ampFromDark = d => d < 0.12 ? 0 : Math.pow(10, (d - 1) * SP.rangeDb / 20);

/**
 * Locate the marker frame in a grayscale image (Float32 luminance 0..1, row-major).
 * Returns { x0, x1, top, bottom } where top/bottom are the inner edges of the marker bars, or null.
 */
export function findFrame(lum, w, h) {
  // dark fraction per row over the middle 70% of the width
  const xs = Math.floor(w * 0.15), xe = Math.ceil(w * 0.85);
  const white = percentile(lum, 0.9), black = percentile(lum, 0.02);
  const thr = black + (white - black) * 0.45;
  const rowDark = new Float32Array(h);
  for (let y = 0; y < h; y++) {
    let c = 0; for (let x = xs; x < xe; x++) if (lum[y * w + x] < thr) c++;
    rowDark[y] = c / (xe - xs);
  }
  const bands = runs(rowDark, v => v > 0.85, Math.max(2, Math.round(h * 0.015)));
  if (bands.length < 2) return null;
  const topBar = bands[0], botBar = bands[bands.length - 1];
  // horizontal extent from the middle of the top bar
  const my = Math.floor((topBar.start + topBar.end) / 2);
  let x0 = 0, x1 = w - 1;
  while (x0 < w && lum[my * w + x0] >= thr) x0++;
  while (x1 > 0 && lum[my * w + x1] >= thr) x1--;
  if (x1 - x0 < w * 0.2) return null;
  return { x0, x1, top: topBar.end, bottom: botBar.start, white, black };
}

function percentile(arr, p) {
  const step = Math.max(1, Math.floor(arr.length / 20000));
  const s = []; for (let i = 0; i < arr.length; i += step) s.push(arr[i]);
  s.sort((a, b) => a - b);
  return s[Math.floor(p * (s.length - 1))];
}

/** Runs of consecutive indices where pred(v) holds, at least minLen long. */
export function runs(arr, pred, minLen) {
  const out = [];
  let start = -1;
  for (let i = 0; i <= arr.length; i++) {
    const on = i < arr.length && pred(arr[i]);
    if (on && start < 0) start = i;
    if (!on && start >= 0) { if (i - start >= minLen) out.push({ start, end: i }); start = -1; }
  }
  return out;
}

/** Given luminance column samples between inner marker edges, return band amplitudes (length n). */
export function columnToAmps(colLum, white, black, n) {
  const L = colLum.length;
  const g = SP.gap / (SP.rows + 2 * SP.gap);
  const amps = new Float32Array(n);
  for (let k = 0; k < n; k++) {
    const a = (g + (1 - 2 * g) * k / n) * L, b = (g + (1 - 2 * g) * (k + 1) / n) * L;
    let s = 0, c = 0;
    for (let i = Math.floor(a); i < Math.max(Math.floor(a) + 1, Math.ceil(b)); i++) { s += colLum[Math.min(L - 1, i)]; c++; }
    const d = Math.max(0, Math.min(1, (white - s / c) / Math.max(0.05, white - black)));
    amps[k] = ampFromDark(d);
  }
  return amps;
}

/** Turn a framed image into audio by additive synthesis. lum: Float32 luminance (0..1). */
export function imageToSound(lum, w, h, fs, { seconds = null, bands = 128 } = {}) {
  const fr = findFrame(lum, w, h);
  if (!fr) throw new Error('Could not find the two black marker bars. Make sure the whole sound-paper is visible.');
  const cols = fr.x1 - fr.x0 + 1;
  // The frame's height tells us the print/photo scale, which tells us the original duration.
  const scale = (fr.bottom - fr.top) / (SP.rows + 2 * SP.gap);
  const dur = seconds || Math.max(0.5, cols / scale / SP.pxPerSec);
  const colAmps = [];
  const col = new Float32Array(fr.bottom - fr.top);
  for (let c = 0; c < cols; c++) {
    const x = fr.x0 + c;
    for (let y = fr.top; y < fr.bottom; y++) col[y - fr.top] = lum[y * w + x];
    colAmps.push(columnToAmps(col, fr.white, fr.black, bands));
  }
  return { samples: synthesize(colAmps, dur, fs, bands), seconds: dur, frame: fr };
}

/** Additive synthesis of a sequence of band-amplitude columns spread over `dur` seconds. */
export function synthesize(colAmps, dur, fs, bands) {
  const total = Math.round(dur * fs);
  const out = new Float32Array(total);
  const freqs = Array.from({ length: bands }, (_, k) => bandFreq(k, bands));
  const cols = colAmps.length;
  for (let k = 0; k < bands; k++) {
    const w = 2 * Math.PI * freqs[k] / fs;
    let phase = Math.random() * 2 * Math.PI;
    let any = false; for (let c = 0; c < cols; c++) if (colAmps[c][k] > 0) { any = true; break; }
    if (!any) continue;
    for (let i = 0; i < total; i++) {
      const p = i / total * cols - 0.5;
      const c0 = Math.max(0, Math.min(cols - 1, Math.floor(p))), c1 = Math.min(cols - 1, c0 + 1), f = Math.max(0, Math.min(1, p - c0));
      const a = colAmps[c0][k] * (1 - f) + colAmps[c1][k] * f;
      phase += w;
      if (a) out[i] += a * Math.sin(phase);
    }
  }
  let peak = 0; for (let i = 0; i < total; i++) peak = Math.max(peak, Math.abs(out[i]));
  if (peak > 0) for (let i = 0; i < total; i++) out[i] *= 0.9 / peak;
  return out;
}

/** RGBA → luminance (0..1). */
export function toLuminance(rgba, w, h) {
  const lum = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) lum[i] = (0.299 * rgba[i * 4] + 0.587 * rgba[i * 4 + 1] + 0.114 * rgba[i * 4 + 2]) / 255;
  return lum;
}
