import { $, esc, textTool, ICONS } from '../ui.js';
import { vigenere, vigenereCrack, cleanKey } from '../lib/classical.js';

export function mount(root) {
  const tt = textTool(root, {
    sample: 'The package will be left beneath the third bench in the park.',
    params: `
      <div class="row">
        <div class="field grow"><label for="vk">Keyword</label><input type="text" id="vk" value="SHERLOCK" autocomplete="off" autocapitalize="characters" spellcheck="false"></div>
        <label class="field inline" style="padding-bottom:10px"><input type="checkbox" id="auto"><span class="label">Autokey</span></label>
      </div>`,
    transform: (t, m) => {
      if (!cleanKey($('#vk', root).value)) throw new Error('Enter a keyword (letters only).');
      const out = vigenere(t, $('#vk', root).value, m === 'dec', $('#auto', root).checked);
      showAlign(t, out);
      return out;
    },
  });
  root.insertAdjacentHTML('beforeend', `
    <section class="panel">
      <h2 class="panel-title">How the key lines up</h2>
      <div class="align-view" id="align"></div>
      <p class="hint">Each letter is shifted by the key letter beneath it (A=0, B=1 … Z=25).</p>
    </section>
    <section class="panel">
      <h2 class="panel-title">Break it without the key</h2>
      <p class="hint" style="margin-top:0">Paste ciphertext in the message box (switch to <b>Decode</b>), then crack. Works best with 60+ letters.</p>
      <div class="btns"><button class="btn primary" id="crack">${ICONS.key}Recover the keyword</button></div>
      <div id="crack-out" style="margin-top:12px"></div>
    </section>`);

  function showAlign(inp, out) {
    const k = cleanKey($('#vk', root).value);
    const el = $('#align', root);
    if (!el) return;
    const src = inp.slice(0, 48);
    let n = 0, keyLine = '';
    for (const ch of src) keyLine += /[a-z]/i.test(ch) ? k[n++ % k.length] : ' ';
    el.textContent = `IN  ${src}\nKEY ${$('#auto', root).checked ? '(autokey: key, then message)' : keyLine}\nOUT ${out.slice(0, 48)}`;
  }

  $('#crack', root).onclick = () => {
    const box = $('#crack-out', root);
    try {
      const { results } = vigenereCrack(tt.input.value);
      box.innerHTML = `<ul class="list">${results.map((r, i) => `
        <li><span class="tag ${i ? '' : 'best'}">${esc(r.key)}</span><span class="${i ? '' : 'best'}">${esc(r.text.slice(0, 140))}</span></li>`).join('')}</ul>
        <div class="btns"><button class="btn" id="use">Use key “${esc(results[0].key)}”</button></div>`;
      $('#use', root).onclick = () => { $('#vk', root).value = results[0].key; tt.mode.set('dec'); };
    } catch (e) { box.innerHTML = `<p class="hint warn">${esc(e.message)}</p>`; }
  };
  tt.run();
}
