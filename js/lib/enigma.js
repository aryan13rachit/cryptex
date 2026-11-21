// Historically accurate Enigma I / M3 / M4 simulator (with double-stepping). Pure JS.

export const ROTORS = {
  I: { wiring: 'EKMFLGDQVZNTOWYHXUSPAIBRCJ', notches: 'Q' },
  II: { wiring: 'AJDKSIRUXBLHWTMCQGZNPYFVOE', notches: 'E' },
  III: { wiring: 'BDFHJLCPRTXVZNYEIWGAKMUSQO', notches: 'V' },
  IV: { wiring: 'ESOVPZJAYQUIRHXLNFTGKDCMWB', notches: 'J' },
  V: { wiring: 'VZBRGITYUPSDNHLXAWMJQOFECK', notches: 'Z' },
  VI: { wiring: 'JPGVOUMFYQBENHZRDKASXLICTW', notches: 'ZM' },
  VII: { wiring: 'NZJHGRCXMYSWBOUFAIVLPEKQDT', notches: 'ZM' },
  VIII: { wiring: 'FKQHTLXOCBJSPDZRAMEWNIUYGV', notches: 'ZM' },
};
export const GREEK = {
  Beta: 'LEYJVCNIXWPBQMDRTAKZGFUHOS',
  Gamma: 'FSOKANUERHMBTIYCWLQPZXVGJD',
};
export const REFLECTORS = {
  A: 'EJMZALYXVBWFCRQUONTSPIKHGD',
  B: 'YRUHQSLDPXNGOKMIEBFZCWVJAT',
  C: 'FVPJIAOYEDRZXWGCTKUQSBNMHL',
  'B-thin': 'ENKQAUYWJICOPBLMDXZVFTHRGS',
  'C-thin': 'RDOBJNTKVEHMLFCWZAXGYIPSUQ',
};
const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const mod = (n) => ((n % 26) + 26) % 26;
const idx = c => c.charCodeAt(0) - 65;

class Rotor {
  constructor(wiring, notches, ring, pos) {
    this.fwd = [...wiring].map(idx);
    this.bwd = new Array(26);
    this.fwd.forEach((o, i) => { this.bwd[o] = i; });
    this.notches = [...(notches || '')].map(idx);
    this.ring = ring; this.pos = pos;
  }
  atNotch() { return this.notches.includes(this.pos); }
  step() { this.pos = mod(this.pos + 1); }
  forward(c) { const s = this.pos - this.ring; return mod(this.fwd[mod(c + s)] - s); }
  backward(c) { const s = this.pos - this.ring; return mod(this.bwd[mod(c + s)] - s); }
}

export function parsePlugboard(text) {
  const map = [...Array(26).keys()];
  const pairs = (text || '').toUpperCase().replace(/[^A-Z]/g, ' ').trim().split(/\s+/).filter(Boolean);
  const used = new Set();
  const valid = [];
  for (const p of pairs) {
    if (p.length !== 2 || p[0] === p[1] || used.has(p[0]) || used.has(p[1])) continue;
    used.add(p[0]); used.add(p[1]);
    map[idx(p[0])] = idx(p[1]); map[idx(p[1])] = idx(p[0]);
    valid.push(p);
  }
  return { map, pairs: valid };
}

export class Enigma {
  /**
   * cfg: { model: 'I'|'M3'|'M4', rotors: ['I','II','III'] (left→right), greek: 'Beta', reflector: 'B',
   *        rings: [0,0,0(,0)], positions: [0,0,0(,0)], plugboard: 'AB CD' }
   * For M4, rings/positions have 4 entries: [greek, left, middle, right].
   */
  constructor(cfg) {
    this.cfg = cfg;
    const m4 = cfg.model === 'M4';
    const rings = cfg.rings || [], pos = cfg.positions || [];
    const off = m4 ? 1 : 0;
    this.rotors = cfg.rotors.map((name, i) => new Rotor(ROTORS[name].wiring, ROTORS[name].notches, rings[i + off] || 0, pos[i + off] || 0));
    this.greek = m4 ? new Rotor(GREEK[cfg.greek || 'Beta'], '', rings[0] || 0, pos[0] || 0) : null;
    this.reflector = [...REFLECTORS[cfg.reflector || (m4 ? 'B-thin' : 'B')]].map(idx);
    this.plug = parsePlugboard(cfg.plugboard).map;
  }
  step() {
    const [L, M, R] = this.rotors;
    if (M.atNotch()) { M.step(); L.step(); }
    else if (R.atNotch()) M.step();
    R.step();
  }
  /** Encrypt one letter (A-Z). Returns { out, path } where path lists the signal at each stage. */
  press(letter) {
    this.step();
    const path = [];
    let c = idx(letter);
    path.push(c);
    c = this.plug[c]; path.push(c);
    for (let i = this.rotors.length - 1; i >= 0; i--) { c = this.rotors[i].forward(c); path.push(c); }
    if (this.greek) { c = this.greek.forward(c); path.push(c); }
    c = this.reflector[c]; path.push(c);
    if (this.greek) { c = this.greek.backward(c); path.push(c); }
    for (let i = 0; i < this.rotors.length; i++) { c = this.rotors[i].backward(c); path.push(c); }
    c = this.plug[c]; path.push(c);
    return { out: A[c], path };
  }
  positions() {
    const p = this.rotors.map(r => r.pos);
    return this.greek ? [this.greek.pos, ...p] : p;
  }
  /** Encrypt text; non-letters are dropped (as on the real machine), output grouped in 5s if group=true. */
  encode(text, group = false) {
    let out = '';
    for (const ch of text.toUpperCase()) if (ch >= 'A' && ch <= 'Z') out += this.press(ch).out;
    return group ? out.replace(/(.{5})/g, '$1 ').trim() : out;
  }
}
