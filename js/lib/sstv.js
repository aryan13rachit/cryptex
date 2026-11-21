// SSTV (Slow-Scan Television) encoder + streaming decoder.
// Modes: Martin M1/M2, Scottie S1/S2/DX, Robot 36/72, PD 90/120/180. VIS auto-detect + slant correction.
import { lowpassTaps } from './dsp.js';

export const MODES = {
  'Martin M1': { vis: 44, w: 320, h: 256, family: 'martin', ch: 146.432 },
  'Martin M2': { vis: 40, w: 320, h: 256, family: 'martin', ch: 73.216 },
  'Scottie S1': { vis: 60, w: 320, h: 256, family: 'scottie', ch: 138.24 },
  'Scottie S2': { vis: 56, w: 320, h: 256, family: 'scottie', ch: 88.064 },
  'Scottie DX': { vis: 76, w: 320, h: 256, family: 'scottie', ch: 345.6 },
  'Robot 36': { vis: 8, w: 320, h: 240, family: 'robot36' },
  'Robot 72': { vis: 12, w: 320, h: 240, family: 'robot72' },
  'PD 90': { vis: 99, w: 320, h: 256, family: 'pd', ch: 170.24 },
  'PD 120': { vis: 95, w: 640, h: 496, family: 'pd', ch: 121.6 },
  'PD 180': { vis: 96, w: 640, h: 496, family: 'pd', ch: 183.04 },
};
for (const [name, m] of Object.entries(MODES)) {
  m.name = name;
  m.rows = m.family === 'pd' ? m.h / 2 : m.h;
  m.ycc = !['martin', 'scottie'].includes(m.family);
  const l = rowLayout(m, 0);
  m.rowMs = l.segs.reduce((s, x) => s + x.ms, 0);
  m.syncOff = l.syncOff;
  m.syncMs = l.syncMs;
  m.preambleMs = m.family === 'scottie' ? 9 : 0;
  m.durationS = (910 + m.preambleMs + m.rows * m.rowMs) / 1000;
}
export const MODE_BY_VIS = Object.fromEntries(Object.values(MODES).map(m => [m.vis, m]));

/** Segments for one scan row. Tone: {ms,f}. Pixel channel: {ms,ch,lines}. */
export function rowLayout(m, r) {
  const T = (ms, f) => ({ ms, f });
  const C = (ms, ch, lines) => ({ ms, ch, lines });
  switch (m.family) {
    case 'martin':
      return { syncOff: 0, syncMs: 4.862, segs: [T(4.862, 1200), T(0.572, 1500), C(m.ch, 'G', [r]), T(0.572, 1500), C(m.ch, 'B', [r]), T(0.572, 1500), C(m.ch, 'R', [r]), T(0.572, 1500)] };
    case 'scottie':
      return { syncOff: 3 + 2 * m.ch, syncMs: 9, segs: [T(1.5, 1500), C(m.ch, 'G', [r]), T(1.5, 1500), C(m.ch, 'B', [r]), T(9, 1200), T(1.5, 1500), C(m.ch, 'R', [r])] };
    case 'robot36': {
      const even = r % 2 === 0;
      const pair = even ? [r, r + 1] : [r - 1, r];
      return { syncOff: 0, syncMs: 9, segs: [T(9, 1200), T(3, 1500), C(88, 'Y', [r]), T(4.5, even ? 1500 : 2300), T(1.5, 1900), C(44, even ? 'CR' : 'CB', pair)] };
    }
    case 'robot72':
      return { syncOff: 0, syncMs: 9, segs: [T(9, 1200), T(3, 1500), C(138, 'Y', [r]), T(4.5, 1500), T(1.5, 1900), C(69, 'CR', [r]), T(4.5, 2300), T(1.5, 1900), C(69, 'CB', [r])] };
    case 'pd':
      return { syncOff: 0, syncMs: 20, segs: [T(20, 1200), T(2.08, 1500), C(m.ch, 'Y', [2 * r]), C(m.ch, 'CR', [2 * r, 2 * r + 1]), C(m.ch, 'CB', [2 * r, 2 * r + 1]), C(m.ch, 'Y', [2 * r + 1])] };
  }
  throw new Error('Unknown SSTV family ' + m.family);
}

// BT.601 studio-range conversions (what Robot / PD decoders expect)
export function rgbToYcc(r, g, b) {
  return [16 + 0.256788 * r + 0.504129 * g + 0.097906 * b,
    128 - 0.148223 * r - 0.290993 * g + 0.439216 * b,
    128 + 0.439216 * r - 0.367788 * g - 0.071427 * b];
}
const clamp8 = v => v < 0 ? 0 : v > 255 ? 255 : v;
export function yccToRgb(y, cb, cr) {
  const Y = 1.164383 * (y - 16);
  return [clamp8(Y + 1.596027 * (cr - 128)), clamp8(Y - 0.391762 * (cb - 128) - 0.812968 * (cr - 128)), clamp8(Y + 2.017232 * (cb - 128))];
}

/** Build channel planes (Float32 w*h) from an RGBA image of the mode's size. */
function planesFromRgba(m, rgba) {
  const n = m.w * m.h, P = {};
  if (!m.ycc) {
    P.R = new Float32Array(n); P.G = new Float32Array(n); P.B = new Float32Array(n);
    for (let i = 0; i < n; i++) { P.R[i] = rgba[i * 4]; P.G[i] = rgba[i * 4 + 1]; P.B[i] = rgba[i * 4 + 2]; }
  } else {
    P.Y = new Float32Array(n); P.CB = new Float32Array(n); P.CR = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const [y, cb, cr] = rgbToYcc(rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2]);
      P.Y[i] = y; P.CB[i] = cb; P.CR[i] = cr;
    }
  }
  return P;
}

/** Encode an RGBA image (exactly mode.w x mode.h) into SSTV audio samples. */
export function encodeSSTV(modeName, rgba, fs = 48000, amp = 0.7) {
  const m = MODES[modeName];
  const P = planesFromRgba(m, rgba);
  const total = Math.ceil((m.durationS + 0.3) * fs);
  const out = new Float32Array(total);
  let i = Math.round(0.1 * fs), t = i, phase = 0;
  const tone = (f, ms) => {
    t += ms * fs / 1000;
    const end = Math.min(total, Math.round(t)), w = 2 * Math.PI * f / fs;
    for (; i < end; i++) { phase += w; out[i] = Math.sin(phase) * amp; }
    if (phase > 1e6) phase %= 2 * Math.PI;
  };
  const val = v => 1500 + clamp8(v) * 800 / 255;
  // VIS header
  tone(1900, 300); tone(1200, 10); tone(1900, 300); tone(1200, 30);
  let ones = 0;
  for (let b = 0; b < 7; b++) { const bit = (m.vis >> b) & 1; ones += bit; tone(bit ? 1100 : 1300, 30); }
  tone(ones % 2 ? 1100 : 1300, 30);
  tone(1200, 30);
  if (m.preambleMs) tone(1200, m.preambleMs);
  for (let r = 0; r < m.rows; r++) {
    for (const s of rowLayout(m, r).segs) {
      if (s.f) { tone(s.f, s.ms); continue; }
      const plane = P[s.ch], px = s.ms / m.w;
      for (let x = 0; x < m.w; x++) {
        let v = 0;
        for (const y of s.lines) v += plane[Math.min(m.h - 1, y) * m.w + x];
        tone(val(v / s.lines.length), px);
      }
    }
  }
  return out.subarray(0, Math.min(total, Math.round(t + 0.1 * fs)));
}

class Grow {
  constructor(Type, cap = 1 << 16) { this.Type = Type; this.a = new Type(cap); this.n = 0; }
  push(v) {
    if (this.n === this.a.length) { const b = new this.Type(this.a.length * 2); b.set(this.a); this.a = b; }
    this.a[this.n++] = v;
  }
  drop(k) { this.a.copyWithin(0, k, this.n); this.n -= k; }
}

/**
 * Streaming SSTV decoder. push() audio chunks; callbacks:
 *   onStart(mode), onRows(imageData RGBA, y0, y1), onDone(imageData, mode), onFreq(hz)
 */
export class SSTVDecoder {
  constructor(fs, cb = {}) {
    this.fs = fs;
    this.cb = cb;
    this.D = Math.max(1, Math.round(fs / 12000));
    this.fr = fs / this.D;
    this.N = 2 * Math.floor(1.65 * fs / 1900) + 1;
    this.h = lowpassTaps(1100, fs, this.N);
    this.bI = new Float32Array(2 * this.N); this.bQ = new Float32Array(2 * this.N);
    this.wi = 0; this.dcount = 0; this.phase = 0; this.w0 = 2 * Math.PI * 1900 / fs;
    this.pI = 0; this.pQ = 0;
    this.freq = new Grow(Float32Array); this.cum = new Grow(Float64Array); this.cum.push(0);
    this.sync = new Grow(Float64Array); this.sync.push(0);
    this.base = 0;          // absolute index of freq[0]
    this.state = 'search';
    this.searchPos = 0;
    this.lastFreq = 1900;
  }
  m(ms) { return ms * this.fr / 1000; }
  get len() { return this.base + this.freq.n; }
  mean(a, b) {
    a = Math.max(this.base, Math.floor(a)); b = Math.min(this.len, Math.max(a + 1, Math.round(b)));
    if (b <= a) return 0;
    return (this.cum.a[b - this.base] - this.cum.a[a - this.base]) / (b - a);
  }
  syncFrac(a, b) {
    a = Math.max(this.base, Math.floor(a)); b = Math.min(this.len, Math.max(a + 1, Math.round(b)));
    if (b <= a) return 0;
    return (this.sync.a[b - this.base] - this.sync.a[a - this.base]) / (b - a);
  }

  push(x) {
    const { N, h, bI, bQ, D, w0 } = this;
    const k2pi = this.fr / (2 * Math.PI);
    let { wi, dcount, phase, pI, pQ } = this;
    let lastC = this.cum.a[this.cum.n - 1], lastS = this.sync.a[this.sync.n - 1];
    for (let n = 0; n < x.length; n++) {
      phase += w0; if (phase > 6.283185307179586) phase -= 6.283185307179586;
      const v = x[n];
      bI[wi] = bI[wi + N] = v * Math.cos(phase);
      bQ[wi] = bQ[wi + N] = -v * Math.sin(phase);
      wi = wi + 1 === N ? 0 : wi + 1;
      if (++dcount < D) continue;
      dcount = 0;
      let I = 0, Q = 0;
      for (let k = 0; k < N; k++) { I += h[k] * bI[wi + k]; Q += h[k] * bQ[wi + k]; }
      let f = 1900 + Math.atan2(Q * pI - I * pQ, I * pI + Q * pQ) * k2pi;
      pI = I; pQ = Q;
      if (f < 900) f = 900; else if (f > 2700) f = 2700;
      this.freq.push(f);
      lastC += f; this.cum.push(lastC);
      lastS += f < 1350 ? 1 : 0; this.sync.push(lastS);
    }
    Object.assign(this, { wi, dcount, phase, pI, pQ });
    if (this.freq.n) this.lastFreq = this.mean(this.len - this.m(20), this.len);
    this.cb.onFreq?.(this.lastFreq);
    this.process();
  }

  process() {
    if (this.state === 'search') this.searchVIS();
    if (this.state === 'image') this.decodeAvailableRows();
  }

  visAt(p) {
    const m = ms => this.m(ms);
    if (p - m(290) < this.base) return -1;
    if (Math.abs(this.mean(p + m(3), p + m(27)) - 1200) > 70) return -1;
    if (Math.abs(this.mean(p - m(290), p - m(10)) - 1900) > 70) return -1;
    let code = 0, ones = 0, parity = 0;
    for (let b = 0; b < 8; b++) {
      const v = this.mean(p + m(30 * (b + 1) + 4), p + m(30 * (b + 2) - 4));
      if (v < 1000 || v > 1400) return -1;
      const bit = v < 1200 ? 1 : 0;
      if (b < 7) { code |= bit << b; ones += bit; } else parity = bit;
    }
    if (Math.abs(this.mean(p + m(274), p + m(296)) - 1200) > 80) return -1;
    if (!MODE_BY_VIS[code]) return -1;
    return code;
  }

  searchVIS() {
    const step = Math.max(1, Math.round(this.m(1)));
    const limit = this.len - this.m(305);
    let p = Math.max(this.searchPos, this.base + this.m(300));
    for (; p < limit; p += step) {
      const code = this.visAt(p);
      if (code < 0) continue;
      // Refine the start-bit edge (1900 → 1200 drop)
      let best = p, bestScore = -Infinity;
      for (let q = p - this.m(12); q <= p + this.m(12); q++) {
        const s = this.mean(q - this.m(15), q) - this.mean(q, q + this.m(15));
        if (s > bestScore) { bestScore = s; best = q; }
      }
      this.startImage(MODE_BY_VIS[code], best + this.m(300), false);
      return;
    }
    this.searchPos = Math.max(this.searchPos, p);
    // Free memory while idle (keep 2 s of history)
    const keep = Math.floor(this.searchPos - this.m(2000));
    if (keep - this.base > this.fr * 20) this.compact(keep);
  }

  compact(absKeep) {
    const k = absKeep - this.base;
    this.freq.drop(k); this.cum.drop(k); this.sync.drop(k);
    this.base = absKeep;
  }

  /** Start decoding mode `name` right now without a VIS header. */
  forceStart(name) { this.startImage(MODES[name], this.len, true); }

  startImage(mode, start, manual) {
    this.mode = mode;
    this.state = 'image';
    this.manual = manual;
    this.rowsStart = start + this.m(mode.preambleMs);
    this.rowLen = this.m(mode.rowMs);
    this.syncs = [];
    this.rowStarts = new Float64Array(mode.rows);
    this.nextRow = 0;
    const n = mode.w * mode.h;
    this.planes = mode.ycc
      ? { Y: new Float32Array(n).fill(16), CB: new Float32Array(n).fill(128), CR: new Float32Array(n).fill(128) }
      : { R: new Float32Array(n), G: new Float32Array(n), B: new Float32Array(n) };
    this.image = new Uint8ClampedArray(n * 4);
    for (let i = 3; i < this.image.length; i += 4) this.image[i] = 255;
    this.cb.onStart?.(mode, manual);
  }

  fit(pts = this.syncs) {
    for (let pass = 0; pass < 2; pass++) {
      const n = pts.length;
      let sx = 0, sy = 0, sxx = 0, sxy = 0;
      for (const { r, p } of pts) { sx += r; sy += p; sxx += r * r; sxy += r * p; }
      const den = n * sxx - sx * sx;
      const b = den ? (n * sxy - sx * sy) / den : this.rowLen;
      const a = (sy - b * sx) / n;
      if (pass === 1) return { a, b };
      const tol = this.m(1.5);
      const kept = pts.filter(({ r, p }) => Math.abs(p - (a + b * r)) < tol);
      if (kept.length >= 3) pts = kept; else return { a, b };
    }
  }

  findSync(center, W, minScore = 0.45) {
    const L = this.m(this.mode.syncMs), g = this.m(Math.min(2, this.mode.syncMs / 2));
    let best = -1, bestScore = -Infinity;
    const step = W > this.m(50) ? Math.max(1, Math.round(this.m(0.25))) : 1;
    for (let q = Math.round(center - W); q <= center + W; q += step) {
      const inside = this.syncFrac(q, q + L);
      const score = inside - 0.5 * (this.syncFrac(q - g, q) + this.syncFrac(q + L, q + L + g));
      if (score > bestScore) { bestScore = score; best = q; }
    }
    return bestScore > minScore ? best : -1;
  }

  /**
   * Piecewise slant model: split syncs where timing jumps (audio dropouts), fit each run linearly.
   * Returns r → sync position.
   */
  segmentModel() {
    const S = this.syncs;
    const { b } = this.fit();
    const segs = [];
    let cur = [S[0]];
    for (let i = 1; i < S.length; i++) {
      const jump = (S[i].p - S[i - 1].p) - (S[i].r - S[i - 1].r) * b;
      if (Math.abs(jump) > this.m(2)) { segs.push(cur); cur = []; }
      cur.push(S[i]);
    }
    segs.push(cur);
    const good = segs.filter(s => s.length >= 4).map(s => ({ first: s[0].r, last: s[s.length - 1].r, ...this.fit(s) }));
    if (!good.length) { const g = this.fit(); return r => g.a + g.b * r; }
    return r => {
      let best = good[0], bestD = Infinity;
      for (const s of good) {
        const d = r < s.first ? s.first - r : r > s.last ? r - s.last : 0;
        if (d < bestD || (d === bestD && r > s.last)) { bestD = d; best = s; }
      }
      return best.a + best.b * r;
    };
  }

  predictSync(r) {
    const m = this.mode;
    if (this.syncs.length >= 6) { const { a, b } = this.fit(this.syncs.slice(-24)); return a + b * r; }
    if (this.syncs.length) { const s = this.syncs[this.syncs.length - 1]; return s.p + (r - s.r) * this.rowLen; }
    return this.rowsStart + r * this.rowLen + this.m(m.syncOff);
  }

  decodeAvailableRows() {
    const m = this.mode;
    while (this.nextRow < m.rows) {
      const r = this.nextRow;
      const pred = this.predictSync(r);
      const rowEnd = pred - this.m(m.syncOff) + this.rowLen;
      if (this.len < rowEnd + this.m(30)) return;
      const W = this.manual && !this.syncs.length ? this.rowLen / 2 + 1 : this.syncs.length >= 6 ? this.m(3) : this.m(15);
      const center = this.manual && !this.syncs.length ? pred + this.rowLen / 2 : pred;
      let found = this.carry?.r === r ? this.carry.p : this.findSync(center, W);
      this.carry = null;
      // Lost lock (e.g. an audio dropout shifted the timing)? Look wider for a clear sync pulse.
      if (found < 0 && this.syncs.length) found = this.findSync(pred, this.rowLen * 0.45, 0.7);
      const syncPos = found >= 0 ? found : pred;
      // Robot 36 marks even/odd lines with a 1500/2300 Hz separator tone: use it to re-align after lost audio
      if (m.family === 'robot36' && found >= 0 && r + 1 < m.rows) {
        const sep = this.mean(syncPos + this.m(100.5), syncPos + this.m(103.5));
        if ((sep > 1900) !== (r % 2 === 1)) {
          this.rowStarts[r] = pred - this.m(m.syncOff);
          this.nextRow++;
          this.carry = { r: r + 1, p: found };
          continue;          // this audio line is actually row r+1; decode it on the next pass
        }
      }
      if (found >= 0) this.syncs.push({ r, p: found });
      this.rowStarts[r] = syncPos - this.m(m.syncOff);
      const y0 = this.decodeRow(r, this.rowStarts[r]);
      this.nextRow++;
      // Too many rows without a sync → signal lost
      if (r > 20 && this.syncs.length && r - this.syncs[this.syncs.length - 1].r > 30) { this.finish(); return; }
    }
    this.finish();
  }

  decodeRow(r, start) {
    const m = this.mode;
    let t = start, minY = Infinity, maxY = -1;
    for (const s of rowLayout(m, r).segs) {
      const segLen = this.m(s.ms);
      if (s.ch) {
        const plane = this.planes[s.ch], px = segLen / m.w;
        for (let x = 0; x < m.w; x++) {
          const a = t + x * px, f = this.mean(a, a + px);
          const v = clamp8((f - 1500) * 255 / 800);
          for (const y of s.lines) if (y < m.h) { plane[y * m.w + x] = v; minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
        }
      }
      t += segLen;
    }
    // Robot 36: chroma for a line pair is complete after the odd row
    if (m.family === 'robot36') { minY = r & ~1; maxY = Math.min(m.h - 1, (r & ~1) + 1); }
    this.compose(minY, maxY);
    this.cb.onRows?.(this.image, minY, maxY + 1);
    return minY;
  }

  compose(y0, y1) {
    const m = this.mode, P = this.planes, img = this.image;
    for (let y = y0; y <= y1; y++) for (let x = 0; x < m.w; x++) {
      const i = y * m.w + x, o = i * 4;
      if (m.ycc) { const [r, g, b] = yccToRgb(P.Y[i], P.CB[i], P.CR[i]); img[o] = r; img[o + 1] = g; img[o + 2] = b; }
      else { img[o] = P.R[i]; img[o + 1] = P.G[i]; img[o + 2] = P.B[i]; }
    }
  }

  /** Re-render the whole image with a global slant fit, emit onDone, resume searching. */
  finish() {
    if (this.state !== 'image') return;
    const m = this.mode;
    const rows = this.nextRow;
    if (this.syncs.length >= 6) {
      const model = this.segmentModel();
      for (let r = 0; r < rows; r++) this.decodeRow(r, model(r) - this.m(m.syncOff));
    }
    this.state = 'search';
    this.searchPos = Math.floor(rows ? this.rowStarts[rows - 1] + this.rowLen : this.len);
    this.cb.onDone?.(this.image, m, rows);
  }

  /** Stop the current image early (keeps what was received). */
  stop() { this.finish(); }
}
