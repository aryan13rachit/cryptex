import { $, esc, textTool } from '../ui.js';
import * as C from '../lib/classical.js';

const CIPHERS = {
  atbash: { name: 'Atbash (mirror alphabet)', run: t => C.atbash(t) },
  affine: {
    name: 'Affine (ax + b)', params: `<div class="row"><div class="field"><label>a</label><select id="pa">${C.AFFINE_VALID_A.map(a => `<option ${a === 5 ? 'selected' : ''}>${a}</option>`).join('')}</select></div><div class="field"><label>b</label><input type="number" id="pb" value="8" min="0" max="25"></div></div>`,
    run: (t, d) => C.affine(t, +$('#pa').value, +$('#pb').value, d),
  },
  rail: {
    name: 'Rail Fence (zig-zag)', params: `<div class="field"><label>Rails</label><input type="number" id="pr" value="3" min="2" max="12"></div>`,
    run: (t, d) => d ? C.railFenceDecrypt(t, Math.max(2, +$('#pr').value)) : C.railFenceEncrypt(t, Math.max(2, +$('#pr').value)),
  },
  playfair: {
    name: 'Playfair (5×5 digraphs)', params: `<div class="field"><label>Keyword</label><input type="text" id="pk" value="MONARCHY" spellcheck="false"></div><div class="align-view" id="sq"></div>`,
    run: (t, d) => { const sq = C.playfairSquare($('#pk').value); $('#sq').textContent = sq.match(/.{5}/g).map(r => r.split('').join(' ')).join('\n'); return C.playfair(t, $('#pk').value, d); },
  },
  substitution: {
    name: 'Keyword substitution', params: `<div class="field"><label>Keyword</label><input type="text" id="ps" value="DETECTIVE" spellcheck="false"></div><div class="align-view" id="kab"></div>`,
    run: (t, d) => { $('#kab').textContent = `PLAIN  ${C.ALPHA}\nCIPHER ${C.keyedAlphabet($('#ps').value)}`; return C.substitution(t, $('#ps').value, d); },
  },
  polybius: { name: 'Polybius square', run: (t, d) => d ? C.polybiusDecode(t) : C.polybiusEncode(t) },
  tap: { name: 'Prisoner tap code', run: (t, d) => d ? C.tapDecode(t) : C.tapEncode(t) },
  bacon: { name: "Bacon's cipher (A/B)", run: (t, d) => d ? C.baconDecode(t) : C.baconEncode(t) },
  a1z26: { name: 'A1Z26 (letter numbers)', run: (t, d) => d ? C.a1z26Decode(t) : C.a1z26Encode(t) },
  rot47: { name: 'ROT47 (all printable chars)', run: t => C.rot47(t) },
};

export function mount(root) {
  root.innerHTML = `
    <section class="panel">
      <div class="field"><label for="which">Cipher</label>
        <select id="which">${Object.entries(CIPHERS).map(([k, c]) => `<option value="${k}">${esc(c.name)}</option>`).join('')}</select></div>
    </section>`;
  const tt = textTool(root, {
    sample: 'The butler did it',
    params: '<div id="cparams"></div>',
    transform: (t, m) => CIPHERS[$('#which', root).value].run(t, m === 'dec'),
  });
  const which = $('#which', root);
  const load = () => { $('#cparams', root).innerHTML = CIPHERS[which.value].params || '<p class="hint" style="margin:0">No key needed for this one.</p>'; tt.run(); };
  which.onchange = load;
  load();
}
