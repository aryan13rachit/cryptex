// Anagram engine over a word list ordered by how common each word is (index 0 = most common).
// Exact anagrams, multi-word anagrams, words-from-letters and crossword patterns, with ? blanks.

const A = 97;
const key = w => [...w].sort().join('');
const counts = s => { const c = new Uint8Array(26); for (const ch of s) { const i = ch.charCodeAt(0) - A; if (i >= 0 && i < 26) c[i]++; } return c; };

export class Lexicon {
  /** @param {string[]} words lowercase a–z, most common first */
  constructor(words) {
    this.words = words;
    this.rank = new Map(words.map((w, i) => [w, i]));
    this.byKey = new Map();
    for (const w of words) { const k = key(w); const l = this.byKey.get(k); l ? l.push(w) : this.byKey.set(k, [w]); }
    this.byLen = [];
    for (const w of words) (this.byLen[w.length] ||= []).push(w);
  }
  static async load(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Dictionary missing');
    const buf = await res.arrayBuffer();
    let text;
    const bytes = new Uint8Array(buf);
    if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
      const ds = new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'));
      text = await new Response(ds).text();
    } else text = new TextDecoder().decode(buf);
    return new Lexicon(text.split('\n').filter(Boolean));
  }
  common(w) { return (this.rank.get(w) ?? 1e9) < 20000; }
  sortByRank(ws) { return ws.sort((a, b) => (this.rank.get(a) ?? 1e9) - (this.rank.get(b) ?? 1e9)); }

  /** Words that use exactly these letters; '?' is a blank tile. */
  anagrams(letters) {
    const s = clean(letters), blanks = (s.match(/\?/g) || []).length, fixed = s.replace(/\?/g, '');
    if (!blanks) return this.sortByRank([...(this.byKey.get(key(fixed)) || [])]);
    const need = counts(fixed), out = [];
    for (const w of this.byLen[s.length] || []) if (fits(counts(w), need, blanks, true)) out.push(w);
    return this.sortByRank(out);
  }

  /** Words that can be made from some of the letters (Scrabble rack style), longest and commonest first. */
  subwords(letters, min = 3) {
    const s = clean(letters), blanks = (s.match(/\?/g) || []).length, have = counts(s.replace(/\?/g, ''));
    const out = [];
    for (let n = Math.min(s.length, this.byLen.length - 1); n >= min; n--) for (const w of this.byLen[n] || []) if (fits(counts(w), have, blanks, false)) out.push(w);
    return out.sort((a, b) => b.length - a.length || (this.rank.get(a) ?? 1e9) - (this.rank.get(b) ?? 1e9));
  }

  /** Crossword pattern: ? or . = any one letter, * = any run of letters. */
  pattern(p) {
    const s = (p || '').toLowerCase().replace(/[^a-z?.*]/g, '');
    if (!s) return [];
    const re = new RegExp('^' + s.replace(/[?.]/g, '[a-z]').replace(/\*/g, '[a-z]*') + '$');
    const pool = s.includes('*') ? this.words : (this.byLen[s.length] || []);
    return this.sortByRank(pool.filter(w => re.test(w)));
  }

  /**
   * Phrases of up to `maxWords` words using exactly the letters (no blanks). Searches the
   * commonest words first and stops after `limit` results or `budgetMs`.
   */
  phrases(letters, { maxWords = 3, minLen = 2, limit = 60, budgetMs = 1200, commonOnly = true } = {}) {
    const s = clean(letters).replace(/\?/g, '');
    const total = counts(s), out = [], t0 = performance.now();
    // candidate words: those that fit inside the letters
    const cand = [];
    for (let n = s.length; n >= minLen; n--) for (const w of this.byLen[n] || []) {
      if ((commonOnly && !this.common(w)) || (n < 3 && !['a', 'i', 'an', 'at', 'as', 'be', 'by', 'do', 'go', 'he', 'if', 'in', 'is', 'it', 'me', 'my', 'no', 'of', 'oh', 'on', 'or', 'so', 'to', 'up', 'us', 'we'].includes(w))) continue;
      if (fits(counts(w), total, 0, false)) cand.push(w);
    }
    this.sortByRank(cand).sort((a, b) => b.length - a.length);
    const cc = cand.map(counts);
    const rem = total.slice();
    const left = () => rem.reduce((a, b) => a + b, 0);
    const path = [];
    const go = start => {
      if (out.length >= limit || performance.now() - t0 > budgetMs) return;
      const n = left();
      if (n === 0) { out.push(path.join(' ')); return; }
      if (path.length >= maxWords) return;
      for (let i = start; i < cand.length; i++) {
        const c = cc[i];
        if (cand[i].length > n) continue;
        let ok = true;
        for (let j = 0; j < 26; j++) if (c[j] > rem[j]) { ok = false; break; }
        if (!ok) continue;
        for (let j = 0; j < 26; j++) rem[j] -= c[j];
        path.push(cand[i]); go(i); path.pop();
        for (let j = 0; j < 26; j++) rem[j] += c[j];
        if (out.length >= limit) return;
      }
    };
    go(0);
    return out.filter(p => p.replace(/ /g, '') !== s || p.includes(' '));
  }
}

const clean = s => (s || '').toLowerCase().replace(/[^a-z?]/g, '');
/** word letter counts fit in `have` using at most `blanks` wildcards; exact=true also requires equal length. */
function fits(w, have, blanks, exact) {
  let need = 0;
  for (let j = 0; j < 26; j++) if (w[j] > have[j]) need += w[j] - have[j];
  if (need > blanks) return false;
  if (exact) { let a = 0, b = 0; for (let j = 0; j < 26; j++) { a += w[j]; b += have[j]; } return a === b + blanks; }
  return true;
}
