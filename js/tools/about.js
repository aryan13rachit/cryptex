// About the developer.
// Detective: a personnel file slams onto the desk and opens to a typeset dossier.
// Radio Room: an operator terminal powers up and projects a green hologram.
import { $, esc, theme, ICONS } from '../ui.js';
import { sfx } from '../lib/sfx.js';
import { haptic } from '../lib/native.js';

const P = {
  name: 'Rachit Aryan Asthana',
  role: 'Developer of Cryptex · Codebreaker',
  bio: 'I have loved cryptography and ciphers since I was a child. It started with detective stories — Sherlock Holmes, Hercule Poirot, and the codes woven through The Da Vinci Code — and it never stopped. I have solved Jane Street puzzles, gone hunting for the treasures of “The Secret”, and I start most days with the Minute Cryptic. Cryptex is the kit I always wanted: every cipher, signal and secret in one place.',
  influences: [
    { title: 'Sherlock Holmes', by: 'Sir Arthur Conan Doyle', kind: 'Stories & films' },
    { title: 'Hercule Poirot', by: 'Agatha Christie', kind: 'Novels & films' },
    { title: 'The Da Vinci Code', by: 'Dan Brown', kind: 'Novel & film' },
  ],
  record: [
    { title: 'Jane Street puzzles', note: 'Monthly puzzle challenges', status: 'solved', label: 'Solved' },
    { title: 'The Secret: A Treasure Hunt', note: 'Byron Preiss’s buried casques', status: 'open', label: 'Ongoing' },
    { title: 'The Minute Cryptic', note: 'One cryptic clue a day', status: 'daily', label: 'Daily' },
  ],
};
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function mount(root) {
  let timers = [];
  const later = (ms, fn) => timers.push(setTimeout(fn, ms));
  const clear = () => { timers.forEach(clearTimeout); timers = []; document.getElementById('app')?.classList.remove('shake'); };

  const typeInto = (el, text, speed, done) => {
    if (reduced()) { el.textContent = text; done?.(); return; }
    let i = 0;
    const step = () => { el.textContent = text.slice(0, ++i); i < text.length ? later(speed, step) : done?.(); };
    step();
  };

  // ---------------- DETECTIVE ----------------
  function detective() {
    root.innerHTML = `
      <div class="about about-det">
        <div class="det-stage">
          <div class="folder" id="folder">
            <article class="dossier" id="dossier">
              <header class="dz-head rv"><span>Personnel file</span><span>No. 012</span></header>
              <div class="dz-hero rv">
                <figure class="dz-photo"><img src="assets/dev.jpg" alt="Portrait of ${esc(P.name)}"><figcaption>Fig. 1 — The subject</figcaption></figure>
                <div class="dz-id">
                  <div class="kicker">Subject</div>
                  <h1>${esc(P.name)}</h1>
                  <p class="dz-role">${esc(P.role)}</p>
                  <dl class="dz-facts"><dt>Status</dt><dd>Active</dd><dt>Speciality</dt><dd>Ciphers &amp; puzzles</dd><dt>On the case</dt><dd>Since childhood</dd></dl>
                </div>
              </div>
              <section class="dz-sec rv"><h2>Statement</h2><p class="dz-bio">${esc(P.bio)}</p></section>
              <section class="dz-sec rv"><h2>Known influences</h2><ul class="dz-list">${P.influences.map(i => `<li><span><b>${esc(i.title)}</b><small>${esc(i.by)}</small></span><span class="meta">${esc(i.kind)}</span></li>`).join('')}</ul></section>
              <section class="dz-sec rv"><h2>Case record</h2><ul class="dz-list">${P.record.map(r => `<li><span>${esc(r.title)}<small>${esc(r.note)}</small></span><i class="st st-${r.status}">${esc(r.label)}</i></li>`).join('')}</ul></section>
              <footer class="dz-foot rv"><div><span class="dz-sign">R. A. Asthana</span><small>Signature of subject</small></div><span class="dz-stamp" id="stamp">Identified</span></footer>
            </article>
            <div class="folder-cover" id="cover">
              <div class="cover-label"><small>Personnel file</small><strong>R. A. Asthana</strong><span>No. 012 · Bureau of Ciphers</span></div>
              <span class="cover-stamp">Confidential</span>
            </div>
          </div>
        </div>
        <div class="about-actions"><button class="btn" id="replay">${ICONS.reset}Replay</button></div>
      </div>`;
    const folder = $('#folder', root), cover = $('#cover', root), dossier = $('#dossier', root);
    if (reduced()) { folder.classList.add('landed'); cover.hidden = true; dossier.classList.add('revealed'); $('#stamp', root).classList.add('in'); return; }
    later(120, () => folder.classList.add('slam'));
    later(120 + 310, () => {
      sfx('slam'); haptic('heavy');
      const app = document.getElementById('app');
      app.classList.add('shake'); later(380, () => app.classList.remove('shake'));
    });
    later(1250, () => cover.classList.add('open'));
    later(1700, () => dossier.classList.add('revealed'));
    later(2150, () => { cover.hidden = true; });
    later(2600, () => { $('#stamp', root).classList.add('in'); sfx('stamp'); haptic('medium'); });
  }

  // ---------------- RADIO ----------------
  function radio() {
    root.innerHTML = `
      <div class="about about-radio">
        <div class="terminal">
          <div class="crt" id="crt">
            <div class="crt-content">
              <pre class="boot" id="boot"></pre>
              <div class="holo" id="holo"><canvas id="holo-cv" width="320" height="320" role="img" aria-label="Hologram portrait of ${esc(P.name)}"></canvas><div class="holo-scan"></div></div>
              <div class="crt-id"><div class="crt-name" id="cname"></div><div class="crt-role" id="crole"></div></div>
            </div>
            <div class="crt-line"></div><div class="crt-glass"></div>
          </div>
          <div class="terminal-chin"><span>CRYPTEX · OPERATOR TERMINAL</span><i id="led"></i></div>
        </div>
        <div class="radio-sections" id="sections">
          <div class="section-label rv">Profile</div>
          <section class="panel rv"><p class="io-bio">${esc(P.bio)}</p></section>
          <div class="section-label rv">Influences</div>
          <section class="panel rv"><ul class="io-list">${P.influences.map(i => `<li><div class="io-main"><b>${esc(i.title)}</b><small>${esc(i.by)}</small></div><span class="io-tag">${esc(i.kind.toUpperCase())}</span></li>`).join('')}</ul></section>
          <div class="section-label rv">Puzzle log</div>
          <section class="panel rv"><ul class="io-list">${P.record.map(r => `<li><div class="io-main"><b>${esc(r.title)}</b><small>${esc(r.note)}</small></div><span class="io-status io-${r.status}">${esc(r.label.toUpperCase())}</span></li>`).join('')}</ul></section>
        </div>
        <div class="about-actions"><button class="btn" id="replay">${ICONS.reset}Reboot</button></div>
      </div>`;
    const crt = $('#crt', root), holo = $('#holo', root), boot = $('#boot', root);
    drawHologram($('#holo-cv', root));
    const bootText = 'CRYPTEX BIOS 2.1\nROTOR BANK ........ OK\nLOADING OPERATOR PROFILE ...';
    const finish = () => { $('#sections', root).classList.add('revealed'); };
    if (reduced()) {
      $('#led', root).classList.add('on'); crt.classList.add('on', 'ready'); holo.classList.add('show');
      boot.textContent = bootText; boot.classList.add('dim'); $('#cname', root).textContent = P.name.toUpperCase(); $('#crole', root).textContent = 'DEVELOPER · CODEBREAKER';
      finish(); return;
    }
    later(200, () => { $('#led', root).classList.add('on'); crt.classList.add('on'); sfx('boot'); });
    later(1000, () => { crt.classList.add('ready'); typeInto(boot, bootText, 14, () => later(250, () => {
      boot.classList.add('dim'); holo.classList.add('show'); haptic('light');
      later(800, () => typeInto($('#cname', root), P.name.toUpperCase(), 38, () => {
        typeInto($('#crole', root), 'DEVELOPER · CODEBREAKER', 22, () => later(150, finish));
      }));
    })); });
  }

  const render = () => {
    clear();
    theme() === 'radio' ? radio() : detective();
    $('#replay', root).onclick = render;
  };
  render();
  window.addEventListener('themechange', render);
  return () => { clear(); window.removeEventListener('themechange', render); };
}

/** Render the portrait as a green, scan-lined hologram with a soft oval fade. */
function drawHologram(cv) {
  const img = new Image();
  img.onload = () => {
    const w = cv.width, h = cv.height, ctx = cv.getContext('2d');
    // square crop centred on the face (portrait source is 4:5)
    const s = img.width * 0.92, sx = (img.width - s) / 2, sy = img.height * 0.02;
    ctx.drawImage(img, sx, sy, s, s, 0, 0, w, h);
    const d = ctx.getImageData(0, 0, w, h), p = d.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      let l = (0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2]) / 255;
      l = Math.pow(Math.min(1, Math.max(0, (l - 0.08) * 1.6)), 0.8);
      const dx = (x - w / 2) / (w * 0.44), dy = (y - h * 0.5) / (h * 0.5);
      const fade = Math.max(0, Math.min(1, (1 - Math.hypot(dx, dy)) * 3.5));
      const scan = y % 3 === 0 ? 0.5 : 1;
      p[i] = 50 * l; p[i + 1] = 255 * l; p[i + 2] = 150 * l;
      p[i + 3] = (25 + 230 * l) * fade * scan;
    }
    ctx.putImageData(d, 0, 0);
  };
  img.src = 'assets/dev.jpg';
}
