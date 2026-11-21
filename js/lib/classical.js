// Classical ciphers, encoders and cryptanalysis helpers. Pure functions, no DOM.

export const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const mod = (n, m) => ((n % m) + m) % m;
const isUpper = c => c >= 'A' && c <= 'Z';
const isLower = c => c >= 'a' && c <= 'z';
const isLetter = c => isUpper(c) || isLower(c);

/** Map every letter through fn(index0to25, letterCounter) preserving case and punctuation. */
function mapLetters(text, fn) {
  let out = '', k = 0;
  for (const ch of text) {
    if (isUpper(ch)) out += ALPHA[fn(ch.charCodeAt(0) - 65, k++)];
    else if (isLower(ch)) out += ALPHA[fn(ch.charCodeAt(0) - 97, k++)].toLowerCase();
    else out += ch;
  }
  return out;
}

// ---------- Caesar / ROT ----------
export const caesar = (text, shift) => mapLetters(text, i => mod(i + shift, 26));
export const rot13 = text => caesar(text, 13);
export function rot47(text) {
  let out = '';
  for (const ch of text) {
    const c = ch.charCodeAt(0);
    out += c >= 33 && c <= 126 ? String.fromCharCode(33 + mod(c - 33 + 47, 94)) : ch;
  }
  return out;
}

// ---------- Vigenère ----------
export function cleanKey(key) { return (key || '').toUpperCase().replace(/[^A-Z]/g, ''); }
export function vigenere(text, key, decrypt = false, autokey = false) {
  const k = cleanKey(key);
  if (!k) return text;
  if (!autokey) {
    return mapLetters(text, (i, n) => mod(i + (decrypt ? -1 : 1) * (k.charCodeAt(n % k.length) - 65), 26));
  }
  // Autokey: keystream = key + plaintext
  const stream = k.split('').map(c => c.charCodeAt(0) - 65);
  return mapLetters(text, (i, n) => {
    const s = stream[n];
    const r = mod(i + (decrypt ? -s : s), 26);
    stream.push(decrypt ? r : i);
    return r;
  });
}

// ---------- Atbash / Affine / Keyed substitution ----------
export const atbash = text => mapLetters(text, i => 25 - i);

function modInverse(a, m) {
  a = mod(a, m);
  for (let x = 1; x < m; x++) if ((a * x) % m === 1) return x;
  return null;
}
export const AFFINE_VALID_A = [1, 3, 5, 7, 9, 11, 15, 17, 19, 21, 23, 25];
export function affine(text, a, b, decrypt = false) {
  const inv = modInverse(a, 26);
  if (inv === null) throw new Error(`"a" must be coprime with 26 (try ${AFFINE_VALID_A.join(', ')})`);
  return mapLetters(text, i => decrypt ? mod(inv * (i - b), 26) : mod(a * i + b, 26));
}

export function keyedAlphabet(keyword) {
  const seen = new Set();
  let out = '';
  for (const c of cleanKey(keyword) + ALPHA) if (!seen.has(c)) { seen.add(c); out += c; }
  return out;
}
export function substitution(text, keyword, decrypt = false) {
  const kab = keyedAlphabet(keyword);
  return mapLetters(text, i => decrypt ? kab.indexOf(ALPHA[i]) : kab.charCodeAt(i) - 65);
}

// ---------- Rail fence ----------
function railPattern(len, rails) {
  const pat = [];
  if (rails < 2) return new Array(len).fill(0);
  let r = 0, dir = 1;
  for (let i = 0; i < len; i++) {
    pat.push(r);
    if (r === 0) dir = 1; else if (r === rails - 1) dir = -1;
    r += dir;
  }
  return pat;
}
export function railFenceEncrypt(text, rails) {
  const chars = [...text];
  const pat = railPattern(chars.length, rails);
  let out = '';
  for (let r = 0; r < rails; r++) chars.forEach((c, i) => { if (pat[i] === r) out += c; });
  return out;
}
export function railFenceDecrypt(text, rails) {
  const chars = [...text];
  const pat = railPattern(chars.length, rails);
  const order = [];
  for (let r = 0; r < rails; r++) pat.forEach((p, i) => { if (p === r) order.push(i); });
  const out = new Array(chars.length);
  order.forEach((pos, k) => { out[pos] = chars[k]; });
  return out.join('');
}

// ---------- Playfair (I/J merged) ----------
export function playfairSquare(key) {
  return keyedAlphabet(cleanKey(key).replace(/J/g, 'I')).replace('J', '');
}
export function playfair(text, key, decrypt = false) {
  const sq = playfairSquare(key);
  const pos = c => { const i = sq.indexOf(c); return [Math.floor(i / 5), i % 5]; };
  let letters = cleanKey(text).replace(/J/g, 'I');
  const pairs = [];
  if (!decrypt) {
    let i = 0;
    while (i < letters.length) {
      const a = letters[i];
      let b = letters[i + 1];
      if (!b) { pairs.push([a, a === 'X' ? 'Q' : 'X']); i++; }
      else if (a === b) { pairs.push([a, a === 'X' ? 'Q' : 'X']); i++; }
      else { pairs.push([a, b]); i += 2; }
    }
  } else {
    if (letters.length % 2) letters += 'X';
    for (let i = 0; i < letters.length; i += 2) pairs.push([letters[i], letters[i + 1]]);
  }
  const d = decrypt ? 4 : 1;
  return pairs.map(([a, b]) => {
    const [ra, ca] = pos(a), [rb, cb] = pos(b);
    if (ra === rb) return sq[ra * 5 + (ca + d) % 5] + sq[rb * 5 + (cb + d) % 5];
    if (ca === cb) return sq[((ra + d) % 5) * 5 + ca] + sq[((rb + d) % 5) * 5 + cb];
    return sq[ra * 5 + cb] + sq[rb * 5 + ca];
  }).join(' ');
}

// ---------- Polybius / Tap code / Bacon / A1Z26 ----------
const POLY = 'ABCDEFGHIKLMNOPQRSTUVWXYZ';
export function polybiusEncode(text) {
  return cleanKey(text).replace(/J/g, 'I').split('').map(c => {
    const i = POLY.indexOf(c); return `${Math.floor(i / 5) + 1}${(i % 5) + 1}`;
  }).join(' ');
}
export function polybiusDecode(text) {
  const digits = text.replace(/[^1-5]/g, '');
  let out = '';
  for (let i = 0; i + 1 < digits.length; i += 2) out += POLY[(+digits[i] - 1) * 5 + (+digits[i + 1] - 1)];
  return out;
}
const TAP = 'ABCDEFGHIJLMNOPQRSTUVWXYZ'; // K -> C
export function tapEncode(text) {
  return cleanKey(text).replace(/K/g, 'C').split('').map(c => {
    const i = TAP.indexOf(c); return '.'.repeat(Math.floor(i / 5) + 1) + ' ' + '.'.repeat((i % 5) + 1);
  }).join('  /  ');
}
export function tapDecode(text) {
  const groups = text.split('/').map(g => g.trim()).filter(Boolean);
  return groups.map(g => {
    const [a, b] = g.split(/\s+/).map(s => s.length);
    return a && b && a <= 5 && b <= 5 ? TAP[(a - 1) * 5 + b - 1] : '?';
  }).join('');
}
export function baconEncode(text) {
  return cleanKey(text).split('').map(c => (c.charCodeAt(0) - 65).toString(2).padStart(5, '0').replace(/0/g, 'A').replace(/1/g, 'B')).join(' ');
}
export function baconDecode(text) {
  const s = text.toUpperCase().replace(/[^AB]/g, '');
  let out = '';
  for (let i = 0; i + 4 < s.length; i += 5) {
    const v = parseInt(s.slice(i, i + 5).replace(/A/g, '0').replace(/B/g, '1'), 2);
    out += v < 26 ? ALPHA[v] : '?';
  }
  return out;
}
export function a1z26Encode(text) {
  return text.toUpperCase().split(/\s+/).filter(Boolean)
    .map(w => w.replace(/[^A-Z]/g, '').split('').map(c => c.charCodeAt(0) - 64).join('-')).filter(Boolean).join(' ');
}
export function a1z26Decode(text) {
  return text.trim().split(/\s+|\/+/).map(w => w.split(/[^0-9]+/).filter(Boolean)
    .map(n => (+n >= 1 && +n <= 26) ? ALPHA[+n - 1] : '?').join('')).join(' ');
}

// ---------- Byte encoders ----------
const enc = new TextEncoder(), dec = new TextDecoder();
const bytesOf = s => enc.encode(s);
export function toBase64(text) {
  let bin = ''; for (const b of bytesOf(text)) bin += String.fromCharCode(b);
  return btoa(bin);
}
export function fromBase64(text) {
  const bin = atob(text.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/'));
  return dec.decode(Uint8Array.from(bin, c => c.charCodeAt(0)));
}
export const toHex = t => [...bytesOf(t)].map(b => b.toString(16).padStart(2, '0')).join(' ');
export const toBinary = t => [...bytesOf(t)].map(b => b.toString(2).padStart(8, '0')).join(' ');
export const toOctal = t => [...bytesOf(t)].map(b => b.toString(8).padStart(3, '0')).join(' ');
export const toDecimal = t => [...bytesOf(t)].join(' ');
function fromRadix(text, radix, width) {
  let tokens = text.trim().split(/[\s,]+/).filter(Boolean);
  if (tokens.length === 1 && width && tokens[0].length > width) tokens = tokens[0].match(new RegExp(`.{1,${width}}`, 'g'));
  const bytes = tokens.map(t => parseInt(t.replace(/^0x/i, ''), radix));
  if (bytes.some(b => isNaN(b) || b < 0 || b > 255)) throw new Error('Invalid input for this format');
  return dec.decode(Uint8Array.from(bytes));
}
export const fromHex = t => fromRadix(t, 16, 2);
export const fromBinary = t => fromRadix(t, 2, 8);
export const fromOctal = t => fromRadix(t, 8, 3);
export const fromDecimal = t => fromRadix(t, 10, 0);

// ---------- Cryptanalysis ----------
export const ENGLISH_FREQ = [8.167, 1.492, 2.782, 4.253, 12.702, 2.228, 2.015, 6.094, 6.966, 0.153, 0.772, 4.025, 2.406,
  6.749, 7.507, 1.929, 0.095, 5.987, 6.327, 9.056, 2.758, 0.978, 2.360, 0.150, 1.974, 0.074];

export function letterCounts(text) {
  const counts = new Array(26).fill(0);
  for (const ch of text.toUpperCase()) if (isUpper(ch)) counts[ch.charCodeAt(0) - 65]++;
  return counts;
}
export function chiSquared(counts) {
  const n = counts.reduce((a, b) => a + b, 0) || 1;
  let chi = 0;
  for (let i = 0; i < 26; i++) {
    const e = ENGLISH_FREQ[i] / 100 * n;
    chi += (counts[i] - e) ** 2 / e;
  }
  return chi;
}
export function indexOfCoincidence(text) {
  const c = letterCounts(text);
  const n = c.reduce((a, b) => a + b, 0);
  if (n < 2) return 0;
  return c.reduce((s, f) => s + f * (f - 1), 0) / (n * (n - 1));
}

/** Rank all 26 Caesar shifts by how English the result looks. Returns [{shift, text, score}] best first. */
export function caesarCrack(text) {
  return Array.from({ length: 26 }, (_, s) => {
    const t = caesar(text, -s);
    return { shift: s, text: t, score: chiSquared(letterCounts(t)) };
  }).sort((a, b) => a.score - b.score);
}

/** Estimate Vigenère key: try key lengths by average IoC, then solve each column by chi-squared. */
export function vigenereCrack(text, maxLen = 16) {
  const letters = cleanKey(text);
  if (letters.length < 20) throw new Error('Need at least ~20 letters of ciphertext to crack');
  const candidates = [];
  for (let L = 1; L <= Math.min(maxLen, Math.floor(letters.length / 3)); L++) {
    let ioc = 0;
    for (let c = 0; c < L; c++) {
      let col = ''; for (let i = c; i < letters.length; i += L) col += letters[i];
      ioc += indexOfCoincidence(col);
    }
    candidates.push({ L, ioc: ioc / L });
  }
  // Prefer the shortest length whose IoC is close to the best (avoids picking multiples of the true length)
  const best = Math.max(...candidates.map(c => c.ioc));
  const chosen = candidates.find(c => c.ioc >= best * 0.9) || candidates[0];
  const results = [];
  for (const cand of [chosen, ...candidates.filter(c => c !== chosen).sort((a, b) => b.ioc - a.ioc).slice(0, 3)]) {
    let key = '';
    for (let c = 0; c < cand.L; c++) {
      let col = ''; for (let i = c; i < letters.length; i += cand.L) col += letters[i];
      key += ALPHA[caesarCrack(col)[0].shift];
    }
    const plain = vigenere(text, key, true);
    results.push({ key, length: cand.L, ioc: cand.ioc, text: plain, score: chiSquared(letterCounts(plain)) });
  }
  return { candidates, results };
}
