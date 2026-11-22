import { $, esc, ICONS } from '../ui.js';
import { letterCounts, ENGLISH_FREQ, indexOfCoincidence, caesarCrack, vigenereCrack, atbash, chiSquared, ALPHA, railFenceDecrypt } from '../lib/classical.js';

const SAMPLE = 'Wkh vxvshfw ohiw wkh krwho mxvw diwhu plgqljkw, fduublqj d eodfn ohdwkhu fdvh. Qr rqh vdz klp uhwxuq. Wkh srolfh irxqg wkh fdvh lq wkh ulyhu wkh qhaw prualqj, hpswb.';

export function mount(root) {
  root.innerHTML = `
    <section class="panel">
      <h2 class="panel-title">The evidence</h2>
      <div class="field"><label for="cb-in">Ciphertext</label><textarea id="cb-in" spellcheck="false" style="min-height:120px">${esc(SAMPLE)}</textarea></div>
    </section>
    <section class="panel">
      <h2 class="panel-title">Letter frequency</h2>
      <div class="bars" id="bars"></div>
      <p class="hint">Bars = your message · marks = normal English. A shifted pattern means a Caesar-type cipher.</p>
      <dl class="kv" style="margin-top:14px" id="stats"></dl>
      <p class="hint" id="verdict"></p>
    </section>
    <section class="panel">
      <h2 class="panel-title">Attempt a solution</h2>
      <div class="btns" style="margin-top:0">
        <button class="btn primary" id="auto">${ICONS.key}Auto-solve</button>
        <button class="btn small" data-try="caesar">Caesar</button>
        <button class="btn small" data-try="vig">Vigenère</button>
        <button class="btn small" data-try="atbash">Atbash</button>
        <button class="btn small" data-try="rail">Rail fence</button>
      </div>
      <ul class="list" id="sol" style="margin-top:12px"></ul>
    </section>`;

  const inp = $('#cb-in', root);
  const handoff = sessionStorage.getItem('cryptex-handoff');
  if (handoff) { inp.value = handoff; sessionStorage.removeItem('cryptex-handoff'); }
  const analyse = () => {
    const t = inp.value;
    const c = letterCounts(t), n = c.reduce((a, b) => a + b, 0) || 1;
    const pct = c.map(x => x / n * 100);
    const max = Math.max(13, ...pct);
    $('#bars', root).innerHTML = pct.map((p, i) => `<div class="b" title="${ALPHA[i]} ${p.toFixed(1)}%"><div class="col"><i style="height:${p / max * 100}%"></i><u style="bottom:${ENGLISH_FREQ[i] / max * 100}%"></u></div><span>${ALPHA[i]}</span></div>`).join('');
    const ioc = indexOfCoincidence(t);
    const top = pct.map((p, i) => [ALPHA[i], p]).sort((a, b) => b[1] - a[1]).slice(0, 5).map(x => x[0]).join(' ');
    $('#stats', root).innerHTML = `<dt>Letters</dt><dd>${n}</dd><dt>Most common</dt><dd>${top}</dd><dt>Index of coincidence</dt><dd>${ioc.toFixed(4)}</dd><dt>English fit (χ²)</dt><dd>${chiSquared(c).toFixed(0)}</dd>`;
    let v;
    if (n < 25) v = 'Too little evidence — gather at least 25 letters.';
    else if (chiSquared(c) < 60) v = 'The letters already match English — this may be a transposition (letters shuffled, not replaced) such as a rail fence, or not encrypted at all.';
    else if (ioc > 0.058) v = 'IoC ≈ English (0.066): one fixed alphabet was used — a Caesar, Atbash, Affine or keyword substitution.';
    else if (ioc > 0.045) v = 'IoC between languages and random: likely a short-key polyalphabetic cipher, e.g. Vigenère with a short keyword.';
    else v = 'IoC near random (0.038): a polyalphabetic cipher with a long key (Vigenère, Enigma) — or a modern cipher.';
    $('#verdict', root).textContent = v;
  };
  inp.oninput = analyse; analyse();

  const show = items => { $('#sol', root).innerHTML = items.map((r, i) => `<li><span class="tag ${i ? '' : 'best'}">${esc(r.tag)}</span><span class="${i ? '' : 'best'}">${esc(r.text.slice(0, 200))}</span></li>`).join(''); };
  const tries = {
    caesar: () => caesarCrack(inp.value).slice(0, 3).map(r => ({ tag: `shift ${r.shift}`, text: r.text, score: r.score })),
    atbash: () => { const t = atbash(inp.value); return [{ tag: 'atbash', text: t, score: chiSquared(letterCounts(t)) }]; },
    vig: () => { try { return vigenereCrack(inp.value).results.slice(0, 3).map(r => ({ tag: `key ${r.key}`, text: r.text, score: r.score })); } catch (e) { return [{ tag: '!', text: e.message, score: 1e9 }]; } },
    rail: () => Array.from({ length: 7 }, (_, k) => k + 2).map(r => { const t = railFenceDecrypt(inp.value, r); return { tag: `${r} rails`, text: t, score: bigramScore(t) }; }).sort((a, b) => a.score - b.score).slice(0, 3),
  };
  root.querySelectorAll('[data-try]').forEach(b => b.onclick = () => show(tries[b.dataset.try]()));
  $('#auto', root).onclick = () => {
    const all = [...tries.caesar(), ...tries.atbash(), ...tries.vig()];
    // Prefer the simplest explanation: penalise long Vigenère keys slightly
    // (a long key can always "fit" English letter frequencies, so each extra key letter must earn its place)
    all.forEach(r => { if (r.tag.startsWith('key ')) r.score *= 1 + (r.tag.length - 5) * 0.4; });
    show(all.sort((a, b) => a.score - b.score).slice(0, 4));
  };
}

// Transpositions keep letter frequencies, so rank them by common English bigrams instead
const BIGRAMS = ['TH', 'HE', 'IN', 'ER', 'AN', 'RE', 'ON', 'AT', 'EN', 'ND', 'TI', 'ES', 'OR', 'TE', 'OF', 'ED', 'IS', 'IT', 'AL', 'AR', 'ST', 'TO', 'NT', 'NG', 'SE', 'HA', 'AS', 'OU', 'IO', 'LE'];
function bigramScore(t) {
  const s = t.toUpperCase().replace(/[^A-Z]/g, '');
  let hits = 0; for (let i = 0; i < s.length - 1; i++) if (BIGRAMS.includes(s.slice(i, i + 2))) hits++;
  return -hits / Math.max(1, s.length);
}
