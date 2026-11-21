import { $, ICONS, seg, bindSeg, copy, toast, esc } from '../ui.js';

const enc = new TextEncoder(), dec = new TextDecoder();
const b64u = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), c => c.charCodeAt(0));
const ITER = 310000;

async function deriveKey(password, salt) {
  const base = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: ITER, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
async function seal(text, password) {
  const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(text)));
  const all = new Uint8Array(28 + ct.length); all.set(salt); all.set(iv, 16); all.set(ct, 28);
  return 'CRYPTEX1.' + b64u(all);
}
async function unseal(token, password) {
  const m = token.trim().match(/^CRYPTEX1\.([A-Za-z0-9_-]+)$/);
  if (!m) throw new Error('This doesn’t look like a Cryptex sealed message (it should start with CRYPTEX1.)');
  const all = unb64u(m[1]);
  const key = await deriveKey(password, all.slice(0, 16));
  try { return dec.decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: all.slice(16, 28) }, key, all.slice(28))); }
  catch { throw new Error('Wrong password, or the message was tampered with.'); }
}

export function mount(root) {
  const secure = !!globalThis.crypto?.subtle;
  root.innerHTML = `
    ${secure ? '' : '<section class="panel"><p class="hint warn" style="margin:0">Encryption needs a secure (https) connection. Open Cryptex over https or install it as an app.</p></section>'}
    <section class="panel">
      <div class="row" style="margin-bottom:12px">${seg('mode', [['seal', 'Seal'], ['open', 'Open']], 'seal')}</div>
      <div class="field"><label for="v-pw">Password</label>
        <div class="row" style="flex-wrap:nowrap"><input type="password" id="v-pw" autocomplete="new-password" placeholder="Shared secret"><button class="btn small" id="v-show" type="button">Show</button></div></div>
      <div class="field" style="margin-top:12px"><label for="v-in" id="v-in-l">Secret message</label><textarea id="v-in" spellcheck="false"></textarea></div>
      <div class="btns"><button class="btn primary" id="v-go">${ICONS.key}<span id="v-go-l">Seal envelope</span></button></div>
      <div class="field" style="margin-top:12px"><label>Result</label><textarea id="v-out" class="out" readonly></textarea></div>
      <p class="hint warn" id="v-err" hidden></p>
      <div class="btns"><button class="btn" id="v-copy">${ICONS.copy}Copy</button></div>
      <p class="hint">AES-256-GCM, key stretched with PBKDF2-SHA-256 (${ITER.toLocaleString()} rounds). Unlike the historic ciphers here, this one is genuinely secure — if you choose a strong password.</p>
    </section>

    <section class="panel">
      <h2 class="panel-title">Fingerprints (hashes)</h2>
      <div class="field"><label for="h-in">Text</label><textarea id="h-in" spellcheck="false" style="min-height:70px">The game is afoot.</textarea></div>
      <dl class="kv" id="h-out" style="margin-top:12px"></dl>
      <p class="hint">Change a single character and every fingerprint changes completely.</p>
    </section>

    <section class="panel">
      <h2 class="panel-title">Password generator</h2>
      <div class="out-big" id="pw-out"></div>
      <div class="row" style="margin-top:10px">
        <div class="field grow"><label>Length <span id="pw-len-v">20</span></label><input type="range" id="pw-len" min="8" max="48" value="20"></div>
        <label class="field inline"><input type="checkbox" id="pw-sym" checked><span class="label">Symbols</span></label>
      </div>
      <div class="btns"><button class="btn primary" id="pw-new">New</button><button class="btn" id="pw-copy">${ICONS.copy}Copy</button><button class="btn" id="pw-use">Use above</button></div>
    </section>`;

  const mode = bindSeg(root, 'mode', v => {
    $('#v-in-l', root).textContent = v === 'seal' ? 'Secret message' : 'Sealed message (CRYPTEX1.…)';
    $('#v-go-l', root).textContent = v === 'seal' ? 'Seal envelope' : 'Open envelope';
    $('#v-out', root).value = ''; $('#v-err', root).hidden = true;
  });
  $('#v-show', root).onclick = e => { const p = $('#v-pw', root); p.type = p.type === 'password' ? 'text' : 'password'; e.target.textContent = p.type === 'password' ? 'Show' : 'Hide'; };
  $('#v-go', root).onclick = async () => {
    const err = $('#v-err', root), pw = $('#v-pw', root).value, inp = $('#v-in', root).value;
    err.hidden = true;
    if (!secure) return;
    if (!pw) { err.textContent = 'Enter a password.'; err.hidden = false; return; }
    if (!inp.trim()) { err.textContent = 'Nothing to process.'; err.hidden = false; return; }
    $('#v-go', root).disabled = true;
    try { $('#v-out', root).value = mode.get() === 'seal' ? await seal(inp, pw) : await unseal(inp, pw); }
    catch (e) { $('#v-out', root).value = ''; err.textContent = e.message; err.hidden = false; }
    $('#v-go', root).disabled = false;
  };
  $('#v-copy', root).onclick = () => copy($('#v-out', root).value);

  const hin = $('#h-in', root);
  const hash = async () => {
    if (!secure) return;
    const data = enc.encode(hin.value);
    const rows = await Promise.all(['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'].map(async a =>
      [a, [...new Uint8Array(await crypto.subtle.digest(a, data))].map(b => b.toString(16).padStart(2, '0')).join('')]));
    $('#h-out', root).innerHTML = rows.map(([a, h]) => `<dt>${a}</dt><dd>${h}</dd>`).join('');
  };
  hin.oninput = hash; hash();

  const gen = () => {
    const sets = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789' + ($('#pw-sym', root).checked ? '!@#$%^&*-_=+?' : '');
    const n = +$('#pw-len', root).value, rnd = crypto.getRandomValues(new Uint32Array(n));
    $('#pw-out', root).textContent = Array.from(rnd, r => sets[r % sets.length]).join('');
  };
  $('#pw-len', root).oninput = e => { $('#pw-len-v', root).textContent = e.target.value; gen(); };
  $('#pw-sym', root).onchange = gen;
  $('#pw-new', root).onclick = gen;
  $('#pw-copy', root).onclick = () => copy($('#pw-out', root).textContent);
  $('#pw-use', root).onclick = () => { $('#v-pw', root).value = $('#pw-out', root).textContent; toast('Password filled in'); };
  gen();
}
