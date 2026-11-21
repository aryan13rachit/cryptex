// About the developer.
// Detective: a personnel file slams onto the desk → booking photo + dossier → evidence board with red string.
// Radio Room: a vintage terminal boots into a hologram → Morse callsign on an oscilloscope → readouts.
import { $, $$, esc, theme, ICONS, scopeColors, fitCanvas } from '../ui.js';
import { haptic } from '../lib/native.js';
import { textToMorse, morseTimeline } from '../lib/morse.js';

const P = {
  name: 'Rachit Aryan Asthana',
  short: 'R. A. ASTHANA',
  bio: 'I have loved cryptography and ciphers since I was a child. It started with detective stories — Sherlock Holmes, Hercule Poirot, and the codes woven through The Da Vinci Code — and it never stopped. I have solved Jane Street puzzles, gone hunting for the treasures of “The Secret”, and I start most days with the Minute Cryptic. Cryptex is the kit I always wanted: every cipher, signal and secret in one place.',
};
const EVIDENCE = [
  { kind: 'card', title: 'Sherlock Holmes', by: 'Sir Arthur Conan Doyle', tag: 'Influence' },
  { kind: 'card', title: 'Hercule Poirot', by: 'Agatha Christie', tag: 'Influence' },
  { kind: 'clip', title: 'The Da Vinci Code', by: 'Dan Brown', tag: 'Influence' },
  { kind: 'sticky', title: 'Jane Street puzzles', by: 'Monthly puzzles', tag: 'Solved' },
  { kind: 'map', title: 'The Secret: A Treasure Hunt', by: 'Byron Preiss', tag: 'Ongoing' },
  { kind: 'calendar', title: 'Minute Cryptic', by: 'One clue a day', tag: 'Daily' },
];
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function mount(root) {
  let timers = [], raf = 0, obs = null, onResize = null;
  const later = (ms, fn) => timers.push(setTimeout(fn, ms));
  const clear = () => {
    timers.forEach(clearTimeout); timers = []; cancelAnimationFrame(raf); obs?.disconnect();
    if (onResize) window.removeEventListener('resize', onResize);
    document.getElementById('app')?.classList.remove('shake');
  };
  const typeInto = (el, text, speed, done) => {
    if (reduced()) { el.textContent = text; done?.(); return; }
    let i = 0;
    const step = () => { el.textContent = text.slice(0, ++i); i < text.length ? later(speed, step) : done?.(); };
    step();
  };

  // ======================= DETECTIVE =======================
  function detective() {
    const fields = [['Name', P.name], ['Alias', 'The Codebreaker'], ['Occupation', 'Developer of Cryptex'], ['First offence', 'Childhood — caught reading codes'], ['Status', 'At large · still solving']];
    root.innerHTML = `
      <div class="about about-det">
        <div class="det-stage">
          <div class="folder" id="folder">
            <div class="dossier" id="dossier">
              <div class="dz-head"><span>Bureau of Ciphers</span><span>File No. 012</span></div>
              <div class="booking">
                <div class="mug">
                  <div class="mug-chart">${['6′6', '6′0', '5′6', '5′0', '4′6'].map(h => `<span>${h}</span>`).join('')}</div>
                  <img src="assets/dev.jpg" alt="Booking photo of ${esc(P.name)}">
                  <div class="placard"><b>${esc(P.short)}</b><span>CRYPTEX · 012 · 2026</span></div>
                </div>
                <dl class="dz-fields">${fields.map(([k]) => `<dt>${esc(k)}</dt><dd></dd>`).join('')}</dl>
                <span class="dz-stamp" id="stamp">Identified</span>
              </div>
            </div>
            <div class="folder-cover" id="cover">
              <span class="cover-tab">PERSONNEL FILE</span>
              <div class="cover-label">SUBJECT<br><b>${esc(P.short)}</b><br><small>FILE No. 012</small></div>
              <span class="cover-stamp">CLASSIFIED</span>
            </div>
          </div>
        </div>

        <h2 class="board-title">Evidence board</h2>
        <div class="board" id="board">
          <svg class="strings" id="strings" aria-hidden="true"></svg>
          ${EVIDENCE.slice(0, 2).map((e, i) => note(e, i)).join('')}
          <figure class="board-photo" data-pin="hub"><img src="assets/dev.jpg" alt=""><figcaption>The subject</figcaption><i class="pin"></i></figure>
          ${EVIDENCE.slice(2).map((e, i) => note(e, i + 2)).join('')}
        </div>

        <article class="statement">
          <h2>Statement of the subject</h2>
          <p id="bio"></p>
          <div class="sig"><span>R. A. Asthana</span><small>Signed</small></div>
        </article>
        <div class="about-actions"><button class="btn" id="replay">${ICONS.reset}Replay</button></div>
      </div>`;

    const folder = $('#folder', root), cover = $('#cover', root), dds = $$('.dz-fields dd', root);
    const fillFields = done => {
      let k = 0;
      const next = () => k < fields.length ? typeInto(dds[k], fields[k][1], 18, () => { k++; later(60, next); }) : done?.();
      next();
    };
    const stamp = () => { $('#stamp', root).classList.add('in'); haptic('medium'); };

    // Red string: from the hub photo's pin to every evidence pin, with a little sag
    const drawStrings = animate => {
      const board = $('#board', root), svg = $('#strings', root);
      if (!board) return;
      const b = board.getBoundingClientRect();
      svg.setAttribute('viewBox', `0 0 ${b.width} ${b.height}`);
      const pt = el => { const r = el.querySelector('.pin').getBoundingClientRect(); return [r.left + r.width / 2 - b.left, r.top + r.height / 2 - b.top]; };
      const [hx, hy] = pt($('[data-pin="hub"]', board));
      svg.innerHTML = $$('[data-pin="note"]', board).map((n, i) => {
        const [x, y] = pt(n), mx = (hx + x) / 2, my = (hy + y) / 2 + Math.hypot(x - hx, y - hy) * 0.08;
        const len = Math.hypot(x - hx, y - hy) * 1.05;
        return `<path d="M${hx},${hy} Q${mx},${my} ${x},${y}" style="--len:${len};animation-delay:${animate ? i * 0.12 : 0}s" class="${animate ? 'draw' : ''}"/>`;
      }).join('');
    };
    const showBoard = animate => {
      $('#board', root).classList.add('pinned');
      later(animate ? 450 : 0, () => drawStrings(animate));
      typeInto($('#bio', root), P.bio, animate ? 6 : 0);
    };
    onResize = () => drawStrings(false);
    window.addEventListener('resize', onResize);

    if (reduced()) {
      folder.classList.add('landed'); cover.hidden = true;
      fields.forEach(([, v], i) => { dds[i].textContent = v; });
      stamp(); showBoard(false); return;
    }
    later(120, () => folder.classList.add('slam'));
    later(120 + 300, () => {
      haptic('heavy');
      const app = document.getElementById('app');
      app.classList.add('shake'); later(380, () => app.classList.remove('shake'));
    });
    later(1100, () => cover.classList.add('open'));
    later(1900, () => { cover.hidden = true; fillFields(() => later(250, stamp)); });
    // reveal the board when it scrolls into view
    obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { obs.disconnect(); showBoard(true); } }, { threshold: 0.25 });
    later(1900, () => obs.observe($('#board', root)));
  }

  function note(e, i) {
    const body = {
      card: `<small class="n-tag">${esc(e.tag)}</small><b>${esc(e.title)}</b><span>${esc(e.by)}</span>`,
      clip: `<small class="n-paper">THE DAILY CIPHER</small><b>${esc(e.title)}</b><span>${esc(e.by)}</span><i class="n-cols"></i>`,
      sticky: `<b>${esc(e.title)}</b><span>${esc(e.by)}</span><em>✓ ${esc(e.tag)}</em>`,
      map: `<b>${esc(e.title)}</b><span>${esc(e.by)}</span><em>✕ ${esc(e.tag)}</em>`,
      calendar: `<small class="n-month">EVERY DAY</small><b>${esc(e.title)}</b><span>${esc(e.by)}</span><em>${esc(e.tag)}</em>`,
    }[e.kind];
    return `<div class="note note-${e.kind}" data-pin="note" style="--r:${[-3, 2.5, -1.5, 3, -2.5, 2][i]}deg;--d:${i * 0.08}s">${body}<i class="pin"></i></div>`;
  }

  // ======================= RADIO =======================
  function radio() {
    const log = [
      ['Jane Street puzzles', 'Monthly puzzles', 'SOLVED', 'ok'],
      ['The Secret: A Treasure Hunt', 'Byron Preiss', 'ONGOING', 'warn'],
      ['Minute Cryptic', 'One clue a day', 'DAILY', 'live'],
    ];
    const infl = [['Sherlock Holmes', 'Sir Arthur Conan Doyle'], ['Hercule Poirot', 'Agatha Christie'], ['The Da Vinci Code', 'Dan Brown']];
    root.innerHTML = `
      <div class="about about-radio">
        <div class="monitor">
          <div class="bezel"><div class="crt" id="crt">
            <div class="crt-face" id="face"><canvas id="face-cv" role="img" aria-label="${esc(P.name)} on the terminal screen"></canvas></div>
            <div class="crt-static" id="static"></div>
            <div class="crt-roll"></div>
            <div class="crt-content">
              <pre class="boot" id="boot"></pre>
              <div class="crt-caption"><div class="crt-name" id="cname"></div><div class="crt-role" id="crole"></div></div>
            </div>
            <div class="crt-line"></div><div class="crt-glass"></div>
          </div></div>
          <div class="chin"><span class="chin-brand">CRYPTEX · OPERATOR TERMINAL</span><span class="chin-knobs"><i></i><i></i></span><span class="chin-led" id="led"></span></div>
        </div>
        <div class="tapebank" aria-hidden="true">
          <div class="reel"><i></i></div>
          <div class="bank-mid"><div class="bank-lights">${Array.from({ length: 12 }, (_, k) => `<i style="animation-delay:${(k * 0.37) % 1.9}s;animation-duration:${1.1 + (k * 0.29) % 1.4}s"></i>`).join('')}</div><span>MEMORY BANK 012</span></div>
          <div class="reel"><i></i></div>
        </div>

        <div class="radio-sections" id="sections">
          <section class="panel rv"><h2 class="panel-title">Callsign trace<span class="spacer"></span><span class="readout">R.A.A.</span></h2>
            <canvas class="scope" id="trace" style="height:90px"></canvas>
            <div class="align-view" style="margin-top:8px;text-align:center">${textToMorse('RAA')}</div></section>
          <section class="panel rv"><h2 class="panel-title">Operator file</h2><div class="out-big op-bio">${esc(P.bio)}</div></section>
          <section class="panel rv"><h2 class="panel-title">Influences</h2><ul class="rack-list">${infl.map(([t, b]) => `<li><span class="lamp on"></span><div><b>${esc(t)}</b><small>${esc(b)}</small></div></li>`).join('')}</ul></section>
          <section class="panel rv"><h2 class="panel-title">Puzzle log</h2><ul class="rack-list">${log.map(([t, b, s, c]) => `<li><span class="led led-${c}"></span><div><b>${esc(t)}</b><small>${esc(b)}</small></div><span class="nixie">${s}</span></li>`).join('')}</ul></section>
        </div>
        <div class="about-actions"><button class="btn" id="replay">${ICONS.reset}Reboot</button></div>
      </div>`;
    const crt = $('#crt', root), face = $('#face', root), stat = $('#static', root), boot = $('#boot', root);
    drawCrtFace($('#face-cv', root), crt);
    const bootText = 'CRYPTEX BIOS v2.6\nMEMORY TEST ...... 640K OK\nTRANSFERRING OPERATOR TO TERMINAL';
    const finish = () => { $('#sections', root).classList.add('revealed'); root.querySelector('.tapebank').classList.add('run'); startTrace(); };
    if (reduced()) {
      $('#led', root).classList.add('on'); crt.classList.add('on', 'ready'); face.classList.add('show'); boot.classList.add('gone');
      $('#cname', root).textContent = P.name.toUpperCase(); $('#crole', root).textContent = 'DEVELOPER · CODEBREAKER';
      finish(); return;
    }
    later(200, () => { $('#led', root).classList.add('on'); crt.classList.add('on'); haptic('light'); });
    later(1100, () => {
      crt.classList.add('ready');
      typeInto(boot, bootText, 12, () => later(250, () => {
        // burst of static, then the face resolves out of it
        stat.classList.add('burst'); boot.classList.add('gone');
        later(700, () => { face.classList.add('show'); stat.classList.remove('burst'); });
        later(1700, () => typeInto($('#cname', root), P.name.toUpperCase(), 40, () =>
          typeInto($('#crole', root), 'DEVELOPER · CODEBREAKER', 22, () => later(120, finish))));
      }));
    });
  }
  // Scrolling oscilloscope that keys the callsign in Morse, forever
  function startTrace() {
    const cv = $('#trace', root);
    if (!cv) return;
    const tl = morseTimeline(textToMorse('RAA'));
    const units = [];
    for (const s of tl) for (let k = 0; k < s.units; k++) units.push(s.on ? 1 : 0);
    for (let k = 0; k < 10; k++) units.push(0);
    const unitPx = 9, t0 = performance.now();
    const loop = now => {
      const { ctx, w, h } = fitCanvas(cv), c = scopeColors();
      ctx.fillStyle = c.bg; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = c.grid; ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 24) { ctx.beginPath(); ctx.moveTo(x + .5, 0); ctx.lineTo(x + .5, h); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(0, h / 2 + .5); ctx.lineTo(w, h / 2 + .5); ctx.stroke();
      ctx.strokeStyle = c.line; ctx.lineWidth = 1.6; ctx.shadowColor = c.line; ctx.shadowBlur = 6;
      ctx.beginPath();
      const off = (now - t0) / 1000 * 60;
      for (let x = 0; x <= w; x++) {
        const pos = (x + off) / unitPx, u = units[Math.floor(pos) % units.length];
        const y = h / 2 - (u ? Math.sin(pos * 9) * h * 0.34 : (Math.random() - .5) * 2);
        x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke(); ctx.shadowBlur = 0;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
  }

  const render = () => { clear(); theme() === 'radio' ? radio() : detective(); $('#replay', root).onclick = render; };
  render();
  window.addEventListener('themechange', render);
  return () => { clear(); window.removeEventListener('themechange', render); };
}

/** Render the portrait to fill the CRT: green phosphor monochrome, lifted shadows, edge-sharpened, vignetted. */
function drawCrtFace(cv, crt) {
  const img = new Image();
  img.onload = () => {
    const r = crt.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = cv.width = Math.max(200, Math.round(r.width * dpr)), h = cv.height = Math.max(220, Math.round(r.height * dpr));
    const ctx = cv.getContext('2d');
    // cover-fit, biased upward so the face sits in the upper-middle of the screen
    const s = Math.max(w / img.width, h / img.height) * 1.04;
    const dw = img.width * s, dh = img.height * s;
    ctx.drawImage(img, (w - dw) / 2, (h - dh) * 0.35, dw, dh);
    const d = ctx.getImageData(0, 0, w, h), p = d.data;
    const L = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) L[i] = (0.299 * p[i * 4] + 0.587 * p[i * 4 + 1] + 0.114 * p[i * 4 + 2]) / 255;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const k = y * w + x, i = k * 4;
      let l = L[k];
      // unsharp mask for that crisp, slightly over-processed video look
      if (x > 1 && y > 1 && x < w - 2 && y < h - 2) l += (l - (L[k - 2] + L[k + 2] + L[k - 2 * w] + L[k + 2 * w]) / 4) * 1.4;
      l = Math.pow(Math.min(1, Math.max(0, (l - 0.04) * 2.0)), 0.8);
      const vx = (x / w - 0.5) * 1.7, vy = (y / h - 0.45) * 1.5;
      const vig = Math.max(0.15, 1 - (vx * vx + vy * vy) * 0.7);
      l *= vig;
      p[i] = 30 + 90 * l * l; p[i + 1] = 18 + 237 * l; p[i + 2] = 22 + 110 * l; p[i + 3] = 255;
    }
    ctx.putImageData(d, 0, 0);
  };
  img.src = 'assets/dev.jpg';
}