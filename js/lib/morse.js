// Morse code tables, timing generation and an adaptive timing decoder (for audio / light input).

export const MORSE = {
  A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....', I: '..', J: '.---',
  K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.', S: '...', T: '-',
  U: '..-', V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..',
  0: '-----', 1: '.----', 2: '..---', 3: '...--', 4: '....-', 5: '.....', 6: '-....', 7: '--...', 8: '---..', 9: '----.',
  '.': '.-.-.-', ',': '--..--', '?': '..--..', "'": '.----.', '!': '-.-.--', '/': '-..-.', '(': '-.--.', ')': '-.--.-',
  '&': '.-...', ':': '---...', ';': '-.-.-.', '=': '-...-', '+': '.-.-.', '-': '-....-', '_': '..--.-', '"': '.-..-.',
  '$': '...-..-', '@': '.--.-.',
};
export const PROSIGNS = { '<SOS>': '...---...', '<AR>': '.-.-.', '<SK>': '...-.-', '<BT>': '-...-', '<KN>': '-.--.' };
const REVERSE = Object.fromEntries(Object.entries(MORSE).map(([k, v]) => [v, k]));
REVERSE['...---...'] = 'SOS';

export function textToMorse(text) {
  const words = text.toUpperCase().trim().split(/\s+/).filter(Boolean);
  return words.map(w => {
    const out = [];
    for (let i = 0; i < w.length; i++) {
      const pro = w.slice(i).match(/^<[A-Z]{2,3}>/);
      if (pro && PROSIGNS[pro[0]]) { out.push(PROSIGNS[pro[0]]); i += pro[0].length - 1; continue; }
      if (MORSE[w[i]]) out.push(MORSE[w[i]]);
    }
    return out.join(' ');
  }).filter(Boolean).join(' / ');
}

export function morseToText(code) {
  return code.trim()
    .replace(/[•·∙]/g, '.').replace(/[–—−_]/g, '-')
    .split(/\s*[\/|]\s*|\s{3,}/)
    .map(w => w.trim().split(/\s+/).filter(Boolean).map(s => REVERSE[s] ?? '?').join(''))
    .join(' ');
}

export const unitMs = wpm => 1200 / wpm;

/** Morse string → [{on, units}] timeline. */
export function morseTimeline(code) {
  const tl = [];
  const push = (on, units) => tl.push({ on, units });
  const words = code.trim().split(/\s*\/\s*/).filter(Boolean);
  words.forEach((word, wi) => {
    if (wi) push(false, 7);
    word.split(/\s+/).filter(Boolean).forEach((letter, li) => {
      if (li) push(false, 3);
      [...letter].forEach((s, si) => {
        if (si) push(false, 1);
        push(true, s === '-' ? 3 : 1);
      });
    });
  });
  return tl;
}

/**
 * Adaptive on/off slicer for a noisy level signal (tone energy or brightness).
 * Uses percentiles of the recent history for floor/peak and hysteresis around the midpoint.
 */
export class Slicer {
  constructor({ windowMs = 4000, minContrast = 2.0, minDelta = 0 } = {}) {
    this.windowMs = windowMs; this.minContrast = minContrast; this.minDelta = minDelta;
    this.hist = []; this.on = false; this.lo = 0; this.hi = 1; this.thr = 0.5; this.active = false;
  }
  push(v, t) {
    this.hist.push([t, v]);
    while (this.hist.length && t - this.hist[0][0] > this.windowMs) this.hist.shift();
    if (this.hist.length % 4 === 0 || this.hist.length < 8) {
      const s = this.hist.map(h => h[1]).sort((a, b) => a - b);
      this.lo = s[Math.floor(s.length * 0.15)];
      this.hi = s[Math.floor(s.length * 0.97)];
    }
    const span = this.hi - this.lo;
    this.active = span > this.minDelta && (this.lo <= 0 ? this.hi > 0 : this.hi / this.lo > this.minContrast);
    this.thr = this.lo + span * 0.5;
    const h = span * 0.12;
    if (!this.active) this.on = false;
    else if (this.on && v < this.thr - h) this.on = false;
    else if (!this.on && v > this.thr + h) this.on = true;
    return this.on;
  }
  /** value normalised to the current range, for drawing */
  norm(v) { return Math.max(0, Math.min(1, (v - this.lo) / Math.max(1e-9, this.hi - this.lo))); }
}

/** Goertzel power of `x` at frequency f. */
export function goertzel(x, start, n, f, fs) {
  const w = 2 * Math.PI * f / fs, c = 2 * Math.cos(w);
  let s1 = 0, s2 = 0;
  for (let i = start; i < start + n; i++) { const s0 = x[i] + c * s1 - s2; s2 = s1; s1 = s0; }
  return s1 * s1 + s2 * s2 - c * s1 * s2;
}

/**
 * Adaptive Morse timing decoder. Call update(isOn, tMs) frequently with the thresholded signal;
 * call tick(tMs) periodically so trailing letters / word gaps are flushed.
 */
export class MorseTimingDecoder {
  constructor({ fixedUnitMs = null, debounceMs = 20, onText = () => {}, onSymbol = () => {} } = {}) {
    this.fixedUnitMs = fixedUnitMs;
    this.debounceMs = debounceMs;
    this.onText = onText;
    this.onSymbol = onSymbol;
    this.reset();
  }
  reset() {
    this.state = false;
    this.lastT = null;
    this.pending = null;
    this.current = [];        // on-durations of the letter in progress
    this.history = [];        // recent durations (on and off) for unit estimation
    this.text = '';
    this.symbols = '';
    this.flushedLetter = true;
    this.flushedWord = true;
    this.unit = this.fixedUnitMs || null;
  }
  estimateUnit() {
    if (this.fixedUnitMs) return this.fixedUnitMs;
    const d = this.history.filter(x => x > 15).slice(-60).sort((a, b) => a - b);
    if (d.length < 2) return this.unit || (d[0] || 100);
    // Lowest cluster: scan up from the smallest until a jump in ratio > 1.7
    let end = d.length;
    for (let i = 0; i < d.length - 1; i++) if (d[i + 1] / d[i] > 1.7) { end = i + 1; break; }
    const cluster = d.slice(0, end);
    let u = cluster[Math.floor(cluster.length / 2)];
    // If everything is one cluster we can't tell dots from dashes; keep the previous estimate if it's compatible
    if (end === d.length && this.unit && u > this.unit * 2.2) u = this.unit;
    this.unit = this.unit ? this.unit * 0.5 + u * 0.5 : u;
    return this.unit;
  }
  update(isOn, t) {
    if (this.lastT === null) { this.lastT = t; this.state = isOn; return; }
    if (isOn === this.state) { this.pending = null; return; }
    if (!this.pending) { this.pending = t; }
    if (t - this.pending < this.debounceMs) return;
    const at = this.pending;
    this.pending = null;
    const dur = at - this.lastT;
    if (this.state) this.endOn(dur); else this.endOff(dur);
    this.state = isOn;
    this.lastT = at;
  }
  endOn(dur) {
    this.history.push(dur);
    this.current.push(dur);
    this.flushedLetter = false;
    this.flushedWord = false;
    const u = this.estimateUnit();
    this.onSymbol(dur < 2 * u ? '.' : '-', this.liveSymbols());
  }
  endOff(dur) {
    if (this.history.length) this.history.push(dur);
    const u = this.estimateUnit();
    if (dur >= 2 * u) this.flushLetter();
    if (dur >= 5 * u) this.flushWord();
  }
  liveSymbols() {
    const u = this.estimateUnit();
    return this.current.map(d => d < 2 * u ? '.' : '-').join('');
  }
  flushLetter() {
    if (this.flushedLetter || !this.current.length) return;
    const code = this.liveSymbols();
    const ch = REVERSE[code] ?? '?';
    this.text += ch;
    this.symbols += (this.symbols && !this.symbols.endsWith(' ') ? ' ' : '') + code;
    this.current = [];
    this.flushedLetter = true;
    this.onText(this.text, this.symbols);
  }
  flushWord() {
    if (this.flushedWord) return;
    this.flushLetter();
    if (this.text && !this.text.endsWith(' ')) { this.text += ' '; this.symbols += ' / '; this.onText(this.text, this.symbols); }
    this.flushedWord = true;
  }
  tick(t) {
    if (this.lastT === null || this.state) return;
    const gap = t - this.lastT;
    const u = this.estimateUnit();
    if (gap >= 2.5 * u) this.flushLetter();
    if (gap >= 7 * u) this.flushWord();
  }
}
