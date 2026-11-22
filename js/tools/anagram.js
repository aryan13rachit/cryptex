// Anagram solver: exact anagrams, multi-word phrases, words from letters, crossword patterns.
import { $, esc, seg, bindSeg, copy, theme } from '../ui.js';
import { Lexicon } from '../lib/anagram.js';

let lexicon = null;           // shared across visits: the dictionary loads once
const MODES = [['ana', 'Anagram'], ['phrase', 'Phrases'], ['sub', 'From letters'], ['pat', 'Pattern']];
const HELP = {
  ana: 'Every word that uses exactly these letters. Use ? for an unknown letter.',
  phrase: 'Two- and three-word phrases that use every letter exactly once.',
  sub: 'Every word you can make from some of these letters — longest first. ? is a blank tile.',
  pat: 'Crossword gaps: ? for one missing letter, * for any run. Example: C?Y?T?? or *CIPHER',
};
const SAMPLE = { ana: 'listen', phrase: 'dormitory', sub: 'cryptex', pat: 'c?p?er' };

export function mount(root) {
  root.innerHTML = `
    <section class="panel">
      <div class="row" style="justify-content:space-between;margin-bottom:12px">${seg('amode', MODES, 'ana', 'wrap')}</div>
      <div class="field"><label for="an-in">Letters</label>
        <input id="an-in" type="text" value="${SAMPLE.ana}" autocomplete="off" autocapitalize="characters" spellcheck="false" class="an-in"></div>
      <p class="hint" id="an-help"></p>
      <div class="an-tiles" id="an-tiles" aria-hidden="true"></div>
    </section>
    <section class="panel">
      <h2 class="panel-title">Results<span class="spacer"></span><span class="readout" id="an-count">…</span></h2>
      <div id="an-out"><p class="hint">Loading the dictionary…</p></div>
      <p class="hint">Dictionary: ENABLE word list (172,000 words). Common words are listed first and in bold.</p>
    </section>`;

  const inp = $('#an-in', root), outEl = $('#an-out', root), count = $('#an-count', root);
  let timer = 0;
  const mode = bindSeg(root, 'amode', v => { inp.value = SAMPLE[v]; run(); });

  const tiles = () => {
    $('#an-tiles', root).innerHTML = [...inp.value.toUpperCase().replace(/[^A-Z?.*]/g, '')].slice(0, 16).map(c => `<b>${esc(c)}</b>`).join('');
  };
  const show = (words, isPhrase) => {
    count.textContent = words.length > 999 ? '999+' : String(words.length);
    if (!words.length) { outEl.innerHTML = `<p class="hint">${theme() === 'radio' ? 'NO MATCH IN LEXICON.' : 'Nothing in the dictionary fits.'}</p>`; return; }
    if (isPhrase) { outEl.innerHTML = `<ul class="an-list">${words.map(p => `<li><button class="an-w common" data-w="${esc(p)}">${esc(p)}</button></li>`).join('')}</ul>`; return; }
    const byLen = new Map();
    for (const w of words.slice(0, 600)) { const l = byLen.get(w.length) || []; l.push(w); byLen.set(w.length, l); }
    outEl.innerHTML = [...byLen].sort((a, b) => b[0] - a[0]).map(([n, ws]) =>
      `<div class="an-group"><h3>${n} letters <small>${ws.length}</small></h3><div class="an-words">${ws.map(w => `<button class="an-w${lexicon.common(w) ? ' common' : ''}" data-w="${w}">${w}</button>`).join('')}</div></div>`).join('')
      + (words.length > 600 ? `<p class="hint">Showing the first 600 of ${words.length}.</p>` : '');
  };
  const run = () => {
    tiles();
    $('#an-help', root).textContent = HELP[mode.get()];
    if (!lexicon) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      const q = inp.value.trim(), m = mode.get();
      if (!q) { show([]); count.textContent = '0'; return; }
      if (m === 'ana') show(lexicon.anagrams(q));
      else if (m === 'sub') show(lexicon.subwords(q));
      else if (m === 'pat') show(lexicon.pattern(q));
      else {
        const letters = q.replace(/[^a-z]/gi, '');
        if (letters.length > 18) { outEl.innerHTML = '<p class="hint">Phrase search works up to 18 letters.</p>'; count.textContent = '–'; return; }
        show(lexicon.phrases(letters), true);
      }
    }, 140);
  };
  inp.addEventListener('input', run);
  outEl.addEventListener('click', e => { const b = e.target.closest('[data-w]'); if (b) copy(b.dataset.w); });

  run();
  if (!lexicon) Lexicon.load('assets/dict/words.txt.gz').then(l => { lexicon = l; if (root.isConnected) run(); })
    .catch(e => { outEl.innerHTML = `<p class="hint warn">Could not load the dictionary: ${esc(e.message)}</p>`; });
}
