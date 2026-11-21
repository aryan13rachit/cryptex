import { $, textTool } from '../ui.js';
import * as C from '../lib/classical.js';

const F = {
  base64: ['Base64', C.toBase64, C.fromBase64],
  hex: ['Hexadecimal', C.toHex, C.fromHex],
  binary: ['Binary (8-bit)', C.toBinary, C.fromBinary],
  octal: ['Octal', C.toOctal, C.fromOctal],
  decimal: ['Decimal bytes', C.toDecimal, C.fromDecimal],
  url: ['URL encoding', encodeURIComponent, decodeURIComponent],
};

export function mount(root) {
  root.innerHTML = '';
  textTool(root, {
    sample: 'Rendezvous at dawn',
    params: `<div class="field"><label for="fmt">Format</label><select id="fmt">${Object.entries(F).map(([k, f]) => `<option value="${k}">${f[0]}</option>`).join('')}</select></div>`,
    transform: (t, m) => {
      if (!t) return '';
      const f = F[$('#fmt', root).value];
      try { return m === 'enc' ? f[1](t) : f[2](t.trim()); }
      catch { throw new Error(`That doesn't look like valid ${f[0]}.`); }
    },
  });
}
