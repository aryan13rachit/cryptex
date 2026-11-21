// "About the developer" — detective: a case file slams onto the desk and opens;
// radio: a vintage computer powers on and projects a green hologram.
import { $, $$, esc, theme, ICONS } from '../ui.js';
import { sfx } from '../lib/sfx.js';
import { haptic } from '../lib/native.js';

const NAME = 'Rachit Aryan Asthana';
const FIELDS = [
  ['Subject', NAME],
  ['Occupation', 'Developer of Cryptex · amateur codebreaker'],
  ['First offence', 'Childhood — caught falling for codes, ciphers and secret messages'],
  ['Known influences', 'Sherlock Holmes · Hercule Poirot · The Da Vinci Code'],
  ['Record', 'Jane Street puzzles — SOLVED'],
  ['', '“The Secret: A Treasure Hunt” — investigation ongoing'],
  ['Daily habit', 'The Minute Cryptic — solved every day'],
];
const BIO = `I have loved cryptography and ciphers since I was a child. It started with detective stories — Sherlock Holmes, Hercule Poirot, and the codes hidden all through The Da Vinci Code — and never stopped. I've solved Jane Street puzzles, gone hunting for the treasures of “The Secret”, and start my days with the Minute Cryptic. Cryptex is the kit I always wanted: every cipher, signal and secret in one place.`;

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function mount(root) {
  let timers = [], alive = true, raf = 0;
  const later = (ms, fn) => { const t = setTimeout(() => alive && fn(), ms); timers.push(t); return t; };
  const clear = () => { timers.forEach(clearTimeout); timers = []; cancelAnimationFrame(raf); };

  /** Type text into el, one character at a time, with key sounds. */
  const typeInto = (el, text, speed, done, sound = true) => {
    if (reduced()) { el.textContent = text; done?.(); return; }
    let i = 0;
    const step = () => {
      el.textContent = text.slice(0, ++i);
      if (sound && text[i - 1] !== ' ') sfx('type');
      if (i < text.length) later(speed, step); else done?.();
    };
    step();
  };
  const typeSeq = (items, speed, done) => {
    const next = k => k < items.length ? typeInto(items[k][0], items[k][1], speed, () => later(90, () => next(k + 1))) : done?.();
    next(0);
  };

  // ---------------- DETECTIVE ----------------
  function detective() {
    root.innerHTML = `
      <div class="about about-det">
        <div class="det-stage" id="stage">
          <div class="folder" id="folder">
            <div class="dossier">
              <div class="dossier-top">
                <figure class="polaroid"><img src="assets/dev.jpg" alt="Photo of ${esc(NAME)}"><figcaption>R. A. A.</figcaption><span class="clip"></span></figure>
                <div class="dossier-id">
                  <div class="dossier-kicker">Bureau of Ciphers · Personnel</div>
                  <h1 class="dossier-name">${esc(NAME)}</h1>
                  <div class="dossier-file">FILE No. 12 · CLEARANCE: CODEBREAKER</div>
                </div>
              </div>
              <dl class="dossier-fields">${FIELDS.map(([k]) => `<dt>${esc(k)}</dt><dd></dd>`).join('')}</dl>
              <p class="dossier-bio"></p>
              <p class="dossier-note">Investigator's note: subject cannot walk past a puzzle without solving it. Built this kit so you can't either.</p>
              <span class="stamp-ident">IDENTIFIED</span>
            </div>
            <div class="folder-cover" id="cover">
              <span class="cover-tab">PERSONNEL FILE</span>
              <div class="cover-label">SUBJECT:<br><b>R. A. ASTHANA</b><br><small>FILE No. 12</small></div>
              <span class="cover-stamp">CLASSIFIED</span>
              <span class="cover-string"></span>
            </div>
          </div>
          <div class="dust" id="dust"></div>
        </div>
        <div class="btns" style="justify-content:center"><button class="btn" id="replay">${ICONS.reset}Replay</button></div>
      </div>`;
    const folder = $('#folder', root), cover = $('#cover', root), stage = $('#stage', root);
    const dds = $$('.dossier-fields dd', root);
    const finish = () => {
      typeSeq(FIELDS.map(([, v], i) => [dds[i], v]), 16, () => {
        typeInto($('.dossier-bio', root), BIO, 7, () => {
          later(200, () => { $('.dossier-note', root).classList.add('show'); });
          later(700, () => { $('.stamp-ident', root).classList.add('show'); sfx('stamp'); haptic('heavy'); later(250, () => sfx('ding')); });
        });
      });
    };
    if (reduced()) {
      folder.classList.add('landed', 'open'); cover.hidden = true;
      FIELDS.forEach(([, v], i) => { dds[i].textContent = v; });
      $('.dossier-bio', root).textContent = BIO;
      $('.dossier-note', root).classList.add('show'); $('.stamp-ident', root).classList.add('show');
      return;
    }
    // 1. slam
    later(150, () => folder.classList.add('slam'));
    later(150 + 330, () => {
      sfx('slam'); haptic('heavy');
      document.getElementById('app').classList.add('shake');
      later(450, () => document.getElementById('app').classList.remove('shake'));
      const dust = $('#dust', root);
      dust.innerHTML = Array.from({ length: 18 }, (_, i) => {
        const side = i % 2 ? 1 : -1, x = side * (30 + Math.random() * 60), y = -10 - Math.random() * 50;
        return `<i style="left:${i % 2 ? 92 : 8}%;top:${55 + Math.random() * 40}%;--dx:${x}px;--dy:${y}px;--s:${0.6 + Math.random()}"></i>`;
      }).join('');
      dust.classList.add('go');
    });
    // 2. classified stamp thump, 3. open the cover
    later(1100, () => { cover.classList.add('stamped'); sfx('stamp'); haptic('medium'); });
    later(1900, () => { cover.classList.add('open'); sfx('open'); });
    later(2650, () => { cover.hidden = true; finish(); });
  }

  // ---------------- RADIO ----------------
  function radio() {
    root.innerHTML = `
      <div class="about about-radio">
        <div class="monitor" id="monitor">
          <div class="bezel">
            <div class="crt" id="crt">
              <div class="crt-content">
                <pre class="boot" id="boot"></pre>
                <div class="holo" id="holo"><canvas id="holo-cv" width="300" height="300" aria-label="Hologram of ${esc(NAME)}"></canvas><div class="holo-scan"></div><div class="holo-base"></div></div>
                <div class="term"><div class="term-name" id="tname"></div><pre id="term"></pre></div>
              </div>
              <div class="crt-line"></div>
              <div class="crt-glass"></div>
            </div>
          </div>
          <div class="chin">
            <span class="chin-brand">CRYPTEX · OPERATOR TERMINAL</span>
            <span class="chin-knobs"><i></i><i></i></span>
            <span class="chin-led" id="led"></span>
          </div>
        </div>
        <div class="monitor-stand"></div>
        <section class="panel" style="margin-top:18px"><h2 class="panel-title">Transmission log</h2><p class="term-bio" id="tbio"></p></section>
        <div class="btns" style="justify-content:center"><button class="btn" id="replay">${ICONS.reset}Reboot</button></div>
      </div>`;
    const crt = $('#crt', root), led = $('#led', root), holo = $('#holo', root);
    drawHologram($('#holo-cv', root));
    const boot = ['CRYPTEX BIOS v2.6  (C) BUREAU OF CIPHERS', 'MEMORY TEST ........ 640K OK', 'ROTOR BANK ......... ONLINE', 'LOADING OPERATOR PROFILE ▒▒▒▒▒▒▒▒▒▒ 100%'];
    const lines = [
      '> CLEARANCE  : CODEBREAKER',
      '> ORIGIN     : HOOKED ON CIPHERS SINCE CHILDHOOD',
      '> INFLUENCES : SHERLOCK HOLMES / HERCULE POIROT',
      '               THE DA VINCI CODE',
      '> LOG        : JANE STREET PUZZLES ....... SOLVED',
      '> LOG        : THE SECRET (TREASURE HUNT)  ACTIVE',
      '> LOG        : MINUTE CRYPTIC ............ DAILY',
      '> STATUS     : BUILDING CRYPTEX_',
    ];
    if (reduced()) {
      led.classList.add('on'); crt.classList.add('on', 'ready'); holo.classList.add('show');
      $('#boot', root).textContent = boot.join('\n'); $('#tname', root).textContent = NAME.toUpperCase();
      $('#term', root).textContent = lines.join('\n'); $('#tbio', root).textContent = BIO;
      return;
    }
    later(250, () => { led.classList.add('on'); sfx('boot'); haptic('medium'); crt.classList.add('on'); });
    later(1200, () => {
      crt.classList.add('ready');
      const bootEl = $('#boot', root);
      let k = 0;
      const nextBoot = () => {
        if (k >= boot.length) {
          later(250, () => {
            bootEl.classList.add('dim'); holo.classList.add('show'); sfx('ding'); haptic('light');
            later(900, () => typeInto($('#tname', root), NAME.toUpperCase(), 45, () => {
              const term = $('#term', root);
              let n = 0;
              const nextLine = () => {
                if (n >= lines.length) { later(200, () => typeInto($('#tbio', root), BIO, 6, null, false)); return; }
                const pre = term.textContent;
                const span = document.createElement('span'); term.append(span);
                typeInto(span, lines[n] + (n < lines.length - 1 ? '\n' : ''), 12, () => { n++; later(80, nextLine); });
                void pre;
              };
              nextLine();
            }));
          });
          return;
        }
        const line = document.createElement('span'); bootEl.append(line);
        typeInto(line, boot[k] + '\n', 6, () => { k++; sfx('beep'); later(160, nextBoot); });
      };
      nextBoot();
    });
  }

  const render = () => {
    clear();
    alive = true;
    theme() === 'radio' ? radio() : detective();
    $('#replay', root).onclick = () => render();
  };
  render();
  const onTheme = () => render();
  window.addEventListener('themechange', onTheme);
  return () => { alive = false; clear(); window.removeEventListener('themechange', onTheme); document.getElementById('app')?.classList.remove('shake'); };
}

/** Render the photo as a green, scan-lined hologram with a soft circular fade. */
function drawHologram(cv) {
  const img = new Image();
  img.onload = () => {
    const w = cv.width, h = cv.height, ctx = cv.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);
    const d = ctx.getImageData(0, 0, w, h), p = d.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      let l = (0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2]) / 255;
      l = Math.min(1, Math.max(0, (l - 0.12) * 1.7));              // punch up contrast
      l = Math.pow(l, 0.85);
      const r = Math.hypot(x - w / 2, y - h / 2) / (w / 2);
      const fade = Math.max(0, Math.min(1, (0.97 - r) * 3.2));         // circular edge fade
      const scan = y % 3 === 0 ? 0.55 : 1;                          // scanlines
      p[i] = 40 * l; p[i + 1] = 255 * l; p[i + 2] = 150 * l;
      p[i + 3] = (30 + 225 * l) * fade * scan;
    }
    ctx.putImageData(d, 0, 0);
  };
  img.src = 'assets/dev.jpg';
}
