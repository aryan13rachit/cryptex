// Chaocipher, the Jefferson wheel cipher, and numbers-station encoding (straddling checkerboard + one-time pad).
import { ALPHA } from './classical.js';

const letters = t => (t || '').toUpperCase().replace(/[^A-Z]/g, '');

// ---------------------------------------------------------------------------------------------
// Chaocipher (John F. Byrne, 1918; method published 2010). Two alphabets on wheels are permuted
// after every letter, so the substitution never repeats in a simple way.
//   left wheel = ciphertext alphabet, right wheel = plaintext alphabet. Positions: 0 = zenith, 13 = nadir.
export const CHAO_LEFT = 'HXUCZVAMDSLKPEFJRIGTWOBNYQ';
export const CHAO_RIGHT = 'PTLNBQDEOYSFAVZKGJRIHWXUMC';

function chaoPermute(left, right, idx) {
  // left: bring idx to the zenith, then move the letter at zenith+1 to the nadir
  let l = left.slice(idx) + left.slice(0, idx);
  l = l[0] + l.slice(2, 14) + l[1] + l.slice(14);
  // right: bring idx to the zenith, shift one more to the left, then move zenith+2 to the nadir
  let r = right.slice(idx) + right.slice(0, idx);
  r = r.slice(1) + r[0];
  r = r.slice(0, 2) + r.slice(3, 14) + r[2] + r.slice(14);
  return [l, r];
}

export function chaocipher(text, decrypt = false, left = CHAO_LEFT, right = CHAO_RIGHT) {
  let l = left, r = right, out = '';
  for (const ch of letters(text)) {
    const idx = decrypt ? l.indexOf(ch) : r.indexOf(ch);
    out += decrypt ? r[idx] : l[idx];
    [l, r] = chaoPermute(l, r, idx);
  }
  return out;
}
/** A valid Chaocipher alphabet: 26 distinct letters. */
export const isAlphabet = a => a.length === 26 && new Set(a).size === 26 && /^[A-Z]+$/.test(a);

// ---------------------------------------------------------------------------------------------
// Jefferson wheel cipher (Thomas Jefferson c. 1795; reinvented by Bazeries 1891; US Army M-94 1922–42).
// A stack of lettered disks on an axle. The key is the ORDER of the disks. Turn each disk so the
// message reads along one row, then send any other row. The receiver lines up that row and looks
// around the cylinder for the one row that reads as language.
// The disk alphabets here are a fixed, reproducible set (seeded shuffle), not a historical set.
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export const DISKS = (() => {
  const r = rng(1795), disks = [];
  for (let d = 0; d < 36; d++) {
    const a = ALPHA.split('');
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    disks.push(a.join(''));
  }
  return disks;
})();

/** Parse a disk-order key like "7 2 19 4" or "7,2,19" into 0-based disk indexes (validated, no repeats). */
export function parseOrder(key, count = DISKS.length) {
  const nums = (key.match(/\d+/g) || []).map(Number);
  if (!nums.length) throw new Error('Enter the disk order, e.g. 7 2 19 4 …');
  const bad = nums.find(n => n < 1 || n > count);
  if (bad !== undefined) throw new Error(`There is no disk ${bad} — use 1 to ${count}.`);
  if (new Set(nums).size !== nums.length) throw new Error('Each disk can be used only once.');
  return nums.map(n => n - 1);
}

/** Encrypt (or decrypt with the same offset) using the disks in `order`, reading `offset` rows below. */
export function jefferson(text, order, offset, decrypt = false) {
  const t = letters(text);
  let out = '';
  for (let i = 0; i < t.length; i++) {
    const disk = DISKS[order[i % order.length]];
    const k = disk.indexOf(t[i]);
    out += disk[(k + (decrypt ? 26 - offset % 26 : offset) + 26) % 26];
  }
  return out;
}

/** All 26 rows of the cylinder for one chunk: rows[k][i] = letter k steps round disk i from the set row. */
export function cylinderRows(chunk, order) {
  const t = letters(chunk);
  return Array.from({ length: 26 }, (_, k) => [...t].map((ch, i) => { const d = DISKS[order[i % order.length]]; return d[(d.indexOf(ch) + k) % 26]; }).join(''));
}

// ---------------------------------------------------------------------------------------------
// Numbers station: letters → digits with a straddling checkerboard, then a one-time pad (mod 10).
// The eight most common letters get one digit; the rest get two (row digit + column digit).
export const BOARD = {
  top: ['A', 'T', null, 'O', 'N', 'E', null, 'S', 'I', 'R'],   // blanks at 2 and 6 become the row prefixes
  2: ['B', 'C', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'M'],
  6: ['P', 'Q', 'U', 'V', 'W', 'X', 'Y', 'Z', ' ', '#'],       // 68 = space, 69 = figure (the next digit is literal)
};
const ENC = (() => {
  const m = {};
  BOARD.top.forEach((c, d) => { if (c) m[c] = String(d); });
  for (const row of [2, 6]) BOARD[row].forEach((c, d) => { m[c] = `${row}${d}`; });
  return m;
})();

export function checkerEncode(text) {
  let out = '';
  for (const ch of (text || '').toUpperCase()) {
    if (/[0-9]/.test(ch)) out += '69' + ch;
    else if (ENC[ch] !== undefined) out += ENC[ch];
    else if (/\s/.test(ch)) out += '68';
  }
  return out.replace(/(68)+$/, '');
}
export function checkerDecode(digits) {
  const d = (digits || '').replace(/\D/g, '');
  let out = '';
  for (let i = 0; i < d.length; i++) {
    const a = +d[i];
    if (a === 2 || a === 6) {
      if (i + 1 >= d.length) break;
      const b = +d[++i];
      if (a === 6 && b === 9) { if (i + 1 < d.length) out += d[++i]; continue; }
      out += BOARD[a][b];
    } else out += BOARD.top[a];
  }
  return out.replace(/\s+$/, '');
}
/** Random pad of n digits from the crypto RNG (true one-time pads must never be reused). */
export function makePad(n) {
  const b = new Uint8Array(n * 2), out = [];
  crypto.getRandomValues(b);
  for (let i = 0; out.length < n && i < b.length; i++) if (b[i] < 250) out.push(b[i] % 10);
  while (out.length < n) out.push(Math.floor(Math.random() * 10));
  return out.join('');
}
/** Non-carrying addition (encrypt) or subtraction (decrypt), digit by digit. */
export function padCombine(msg, pad, decrypt = false) {
  const m = msg.replace(/\D/g, ''), k = pad.replace(/\D/g, '');
  if (k.length < m.length) throw new Error(`The pad is too short: ${k.length} digits for a ${m.length}-digit message.`);
  return [...m].map((x, i) => (decrypt ? (+x - +k[i] + 10) : (+x + +k[i])) % 10).join('');
}
export const groups = (digits, n = 5) => (digits.match(new RegExp(`.{1,${n}}`, 'g')) || []).join(' ');
/** Pad a digit string to whole 5-digit groups with spaces (68) so groups come out even. */
export function padToGroups(d, n = 5) {
  const want = Math.ceil(d.length / n) * n;
  while (d.length < want) d += '68';            // spaces; a cut-off final '6' is ignored by the decoder
  return d.slice(0, want);
}
