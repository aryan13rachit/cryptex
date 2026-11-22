// Cold cases: codes and ciphers nobody has read (and a few famously cracked ones).
import { $, esc, copy, ICONS, theme } from '../ui.js';
import { CASES, CRACKED, K4, K4_CLUES } from '../lib/coldcases.js';

const STATUS = { open: ['UNSOLVED', 'OPEN'], sealed: ['ANSWER SEALED', 'SEALED'], partial: ['PARTLY SOLVED', 'PARTIAL'] };

/** K4 with Sanborn's published plaintext under the matching ciphertext letters. */
function k4Grid() {
  const plain = Array(97).fill('');
  for (const [p, t] of K4_CLUES) [...t].forEach((ch, i) => { plain[p - 1 + i] = ch; });
  const cells = [...K4].map((c, i) => `<span class="${plain[i] ? 'clue' : ''}" title="${i + 1}"><b>${c}</b><i>${plain[i] || '·'}</i></span>`);
  return `<div class="cc-k4">${cells.join('')}</div><p class="hint">Bold: K4 ciphertext. Below: the plaintext Sanborn released — EASTNORTHEAST (letters 22–34) and BERLINCLOCK (64–74).</p>`;
}

export function mount(root) {
  const radio = theme() === 'radio';
  root.innerHTML = `
    <p class="hint cc-intro">${radio ? 'STATUS CURRENT TO NOVEMBER 2026. ROUTE ANY INTERCEPT TO THE CRYPTANALYZER.' : 'The files nobody has closed. Each one is real; the status is current to November 2026. Load a ciphertext into the Codebreaker and try your luck.'}</p>
    ${CASES.map(c => `
      <section class="panel cc-case" id="cc-${c.id}">
        <div class="cc-head">
          <h2 class="panel-title">${esc(c.title)}</h2>
          <span class="cc-status cc-${c.status}">${STATUS[c.status][radio ? 1 : 0]}</span>
        </div>
        <p class="cc-meta">${esc(c.where)} · ${esc(c.when)} · <b>${esc(c.statusText)}</b></p>
        <p class="cc-sum">${esc(c.summary)}</p>
        <details class="cc-more"><summary>${radio ? 'CASE NOTES' : 'Case notes'}</summary><ul>${c.details.map(d => `<li>${esc(d)}</li>`).join('')}</ul></details>
        ${c.cipher ? `
          ${c.clues ? k4Grid() : `<pre class="align-view cc-ct">${esc(c.cipher)}</pre>`}
          <div class="btns">
            <button class="btn small" data-copy="${c.id}">${ICONS.copy}Copy</button>
            <button class="btn small primary" data-analyse="${c.id}">${ICONS.codebreaker}Analyse in Codebreaker</button>
          </div>` : ''}
      </section>`).join('')}
    <section class="panel">
      <h2 class="panel-title">${radio ? 'Traffic since read' : 'Cases closed'}</h2>
      <ul class="list cc-cracked">${CRACKED.map(([t, y, d]) => `<li><span class="tag">${esc(y)}</span><div><b>${esc(t)}</b><br><small>${esc(d)}</small></div></li>`).join('')}</ul>
    </section>`;

  root.addEventListener('click', e => {
    const c = e.target.closest('[data-copy]'), a = e.target.closest('[data-analyse]');
    const find = id => CASES.find(x => x.id === id).cipher;
    if (c) copy(find(c.dataset.copy));
    if (a) { sessionStorage.setItem('cryptex-handoff', find(a.dataset.analyse)); location.hash = '#/codebreaker'; }
  });
}
