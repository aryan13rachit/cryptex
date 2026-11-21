// About the developer.
// Detective: a personnel file slams onto the desk → booking photo + dossier → evidence board with red string.
// Radio Room: a vintage terminal boots into a hologram → Morse callsign on an oscilloscope → readouts.
import { $, $$, esc, theme, ICONS, scopeColors, fitCanvas } from '../ui.js';
import { haptic } from '../lib/native.js';
import { sfx } from '../lib/sfx.js';
import { textToMorse, morseTimeline } from '../lib/morse.js';

const P = {
  name: 'Rachit Aryan Asthana',
  short: 'R. A. ASTHANA',
  bio: 'I have loved cryptography and ciphers since I was a child. It started with detective stories — Sherlock Holmes, Hercule Poirot, and the codes woven through The Da Vinci Code — and it never stopped. I have solved Jane Street puzzles, gone hunting for the treasures of “The Secret”, and I start most days with the Minute Cryptic. Cryptex is the kit I always wanted: every cipher, signal and secret in one place.',
};
const EVIDENCE = [
  { kind: 'sticky', title: 'Jane Street puzzles', by: 'Monthly puzzles', tag: 'Solved' },
  { kind: 'map', title: 'The Secret: A Treasure Hunt', by: 'Byron Preiss', tag: 'Ongoing' },
  { kind: 'calendar', title: 'Minute Cryptic', by: 'One clue a day', tag: 'Daily' },
];
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function mount(root) {
  let timers = [], raf = 0, obs = null, onResize = null, stopZola = null;
  const later = (ms, fn) => timers.push(setTimeout(fn, ms));
  const clear = () => {
    timers.forEach(clearTimeout); timers = []; cancelAnimationFrame(raf); obs?.disconnect(); stopZola?.(); stopZola = null;
    if (onResize) window.removeEventListener('resize', onResize);
    document.getElementById('app')?.classList.remove('shake');
  };
  const typeInto = (el, text, speed, done) => {
    if (reduced()) { el.textContent = text; done?.(); return; }
    let i = 0;
    const step = () => { el.textContent = text.slice(0, ++i); i < text.length ? later(speed, step) : done?.(); };
    step();
  };

  /**
   * Typewriter: every character is a separately struck glyph with its own ink density and a slight
   * baseline wobble; words stay unbroken when lines wrap; rhythm is human (pauses after punctuation),
   * with key strikes, and a bell + carriage return when the line runs out.
   */
  const typewriter = (el, text, { speed = 55, sound = true } = {}, done) => {
    el.textContent = '';
    if (reduced()) { el.textContent = text; done?.(); return; }
    const tokens = text.match(/\S+|\s+/g) || [];
    let ti = 0, ci = 0, word = null, lastTop = null;
    const next = () => {
      if (ti >= tokens.length) { done?.(); return; }
      const tok = tokens[ti];
      if (/^\s/.test(tok)) { el.append(document.createTextNode(tok)); ti++; later(speed * rnd(0.8, 1.6), next); return; }
      if (ci === 0) { word = document.createElement('span'); word.className = 'tw-word'; el.append(word); }
      const ch = tok[ci];
      const g = document.createElement('span');
      g.className = 'tw';
      g.textContent = ch;
      g.style.setProperty('--ink', rnd(0.72, 1).toFixed(2));
      g.style.setProperty('--dy', `${rnd(-0.6, 0.8).toFixed(2)}px`);
      g.style.setProperty('--rot', `${rnd(-1.2, 1.2).toFixed(2)}deg`);
      word.append(g);
      // the carriage hit the margin: bell, then return
      const top = g.offsetTop;
      if (sound && lastTop !== null && top > lastTop + 4) { sfx('bell'); later(90, () => sfx('carriage')); }
      lastTop = top;
      if (sound) sfx('type');
      ci++;
      if (ci >= tok.length) { ti++; ci = 0; }
      const pause = /[.,;:!?—]/.test(ch) ? speed * 3.2 : speed * rnd(0.6, 1.5);
      later(pause, next);
    };
    next();
  };
  const rnd = (a, b) => a + Math.random() * (b - a);
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
          <figure class="board-photo" data-pin="hub"><img src="assets/dev.jpg" alt=""><figcaption>The subject</figcaption><i class="pin"></i></figure>
          ${EVIDENCE.map((e, i) => note(e, i)).join('')}
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
      const next = () => k < fields.length ? typewriter(dds[k], fields[k][1], { speed: 48 }, () => { k++; later(200, () => { sfx('carriage'); later(380, next); }); }) : done?.();
      next();
    };
    const stamp = () => { $('#stamp', root).classList.add('in'); later(140, () => { sfx('stamp'); haptic('heavy'); }); };

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
        const d = `M${hx},${hy} Q${mx},${my} ${x},${y}`, st = `--len:${len};animation-delay:${animate ? i * 0.12 : 0}s`; return `<path d="${d}" style="${st}" class="${animate ? 'draw' : ''}"/><path d="${d}" style="${st}" class="twist ${animate ? 'draw' : ''}"/>`;
      }).join('');
    };
    const showBoard = animate => {
      $('#board', root).classList.add('pinned');
      later(animate ? 450 : 0, () => drawStrings(animate));
      $('#bio', root).textContent = P.bio;
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
    root.innerHTML = `
      <div class="about about-radio">
        <div class="monitor">
          <div class="bezel"><div class="crt" id="crt">
            <div class="crt-face" id="face"><canvas id="zola" role="img" aria-label="${esc(P.name)} rendered as glowing data on the terminal"></canvas></div><div class="crt-mask"></div>
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
          <section class="panel rv"><h2 class="panel-title">Puzzle log</h2><ul class="rack-list">${log.map(([t, b, s, c]) => `<li><span class="led led-${c}"></span><div><b>${esc(t)}</b><small>${esc(b)}</small></div><span class="nixie">${s}</span></li>`).join('')}</ul></section>
        </div>
        <div class="about-actions"><button class="btn" id="replay">${ICONS.reset}Reboot</button></div>
      </div>`;
    const crt = $('#crt', root), face = $('#face', root), stat = $('#static', root), boot = $('#boot', root);
    shapeTube(crt); onResize = () => shapeTube(crt); window.addEventListener('resize', onResize);
    const bootText = 'CRYPTEX BIOS v2.6\nMEMORY TEST ...... 640K OK\nTRANSFERRING OPERATOR TO TERMINAL';
    const finish = () => { $('#sections', root).classList.add('revealed'); root.querySelector('.tapebank').classList.add('run'); startTrace(); };
    if (reduced()) {
      $('#led', root).classList.add('on'); crt.classList.add('on', 'ready'); stopZola = startZola($('#zola', root), crt); face.classList.add('show'); boot.classList.add('gone');
      $('#cname', root).textContent = P.name.toUpperCase(); $('#crole', root).textContent = 'DEVELOPER · CODEBREAKER';
      finish(); return;
    }
    later(200, () => { $('#led', root).classList.add('on'); crt.classList.add('on'); haptic('light'); });
    later(1100, () => {
      crt.classList.add('ready');
      typeInto(boot, bootText, 12, () => later(250, () => {
        // burst of static, then the face resolves out of it
        stat.classList.add('burst'); boot.classList.add('gone');
        later(700, () => { stopZola = startZola($('#zola', root), crt); face.classList.add('show'); stat.classList.remove('burst'); });
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

/**
 * Curved tube: the glass is convex, so every edge bows outward. Built as a clip-path in pixels.
 */
function shapeTube(crt) {
  const r = crt.getBoundingClientRect(), w = r.width, h = r.height;
  if (!w || !h) return;
  const b = Math.min(w, h) * 0.045, c = Math.min(w, h) * 0.16;   // bow depth, corner size
  crt.style.clipPath = `path('M ${c} ${b} Q ${w / 2} ${-b} ${w - c} ${b} Q ${w - b * .3} ${b * .3} ${w - b} ${c} Q ${w + b} ${h / 2} ${w - b} ${h - c} Q ${w - b * .3} ${h - b * .3} ${w - c} ${h - b} Q ${w / 2} ${h + b} ${c} ${h - b} Q ${b * .3} ${h - b * .3} ${b} ${h - c} Q ${-b} ${h / 2} ${b} ${c} Q ${b * .3} ${b * .3} ${c} ${b} Z')`;
}

/**
 * The operator rendered as data: the portrait is resampled into a grid of glyph cells, each column a
 * vertical stream of small glowing dashes whose brightness follows the face, with "rain" heads
 * running down the columns. Everything is barrel-distorted to sit on the convex glass.
 */
function startZola(cv, crt) {
  const img = new Image();
  let raf = 0, alive = true;
  img.onload = () => {
    if (!alive) return;
    const rect = crt.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = cv.width = Math.round(rect.width * dpr), H = cv.height = Math.round(rect.height * dpr);
    const ctx = cv.getContext('2d');
    const cellW = 6.2 * dpr, cellH = 6.6 * dpr;
    const cols = Math.floor(W / cellW), rows = Math.floor(H / cellH);
    // sample the portrait into the grid (cover-fit, face slightly above centre)
    const off = document.createElement('canvas'); off.width = cols; off.height = rows;
    const o = off.getContext('2d', { willReadFrequently: true });
    // zoom so the face fills the tube: photo point (50%, 52%) lands at screen (50%, 44%)
    const s = Math.max(cols / img.width, rows / img.height) * 1.42;
    o.filter = 'contrast(1.7) brightness(1.25)';
    o.drawImage(img, cols / 2 - img.width * s * 0.5, rows * 0.44 - img.height * s * 0.52, img.width * s, img.height * s);
    const px = o.getImageData(0, 0, cols, rows).data;
    let L = new Float32Array(cols * rows);
    for (let i = 0; i < L.length; i++) L[i] = (0.3 * px[i * 4] + 0.59 * px[i * 4 + 1] + 0.11 * px[i * 4 + 2]) / 255;
    // feature map: local detail (difference of Gaussians) carries the face — brows, eye sockets,
    // nose ridge, mouth — on top of a stretched base tone
    const blur = (src, r) => {
      let a = src, b = new Float32Array(src.length);
      for (let pass = 0; pass < 2; pass++) {
        for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
          let s = 0, n = 0;
          for (let d = -r; d <= r; d++) { const xx = x + d; if (xx >= 0 && xx < cols) { s += a[y * cols + xx]; n++; } }
          b[y * cols + x] = s / n;
        }
        [a, b] = [b, new Float32Array(src.length)];
        for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
          let s = 0, n = 0;
          for (let d = -r; d <= r; d++) { const yy = y + d; if (yy >= 0 && yy < rows) { s += a[yy * cols + x]; n++; } }
          b[y * cols + x] = s / n;
        }
        a = b; b = new Float32Array(src.length);
      }
      return a;
    };
    const sorted = Array.from(L).sort((a, b) => a - b);
    const lo = sorted[Math.floor(L.length * .05)], hi = sorted[Math.floor(L.length * .98)];
    const fine = blur(L, 1), coarse = blur(L, 4);
    const B = new Float32Array(L.length);
    for (let i = 0; i < L.length; i++) {
      const base = Math.min(1, Math.max(0, (fine[i] - lo) / (hi - lo)));
      const dog = (fine[i] - coarse[i]) / (hi - lo);
      B[i] = Math.min(1, Math.max(0, base * 0.55 + dog * 3.4));
    }
    // smooth phosphor shading layer (drawn under the glyphs each frame)
    const shade = document.createElement('canvas'); shade.width = cols; shade.height = rows;
    const sc = shade.getContext('2d'), sd = sc.createImageData(cols, rows);
    for (let i = 0; i < B.length; i++) { sd.data[i * 4] = 30; sd.data[i * 4 + 1] = 150; sd.data[i * 4 + 2] = 75; sd.data[i * 4 + 3] = Math.round(255 * Math.min(1, base_(i))); }
    function base_(i) { return Math.max(0, (fine[i] - lo) / (hi - lo)) * 0.28 + B[i] * 0.12; }
    sc.putImageData(sd, 0, 0);    // barrel mapping for a convex tube
    const k = 0.07;
    const map = (x, y) => {
      const u = x / W * 2 - 1, v = y / H * 2 - 1;
      return [((u * (1 + k * (1 - v * v)) / (1 + k)) + 1) * W / 2, ((v * (1 + k * (1 - u * u)) / (1 + k)) + 1) * H / 2];
    };
    // per-column rain heads
    const head = Float32Array.from({ length: cols }, () => Math.random() * rows * 1.6);
    const speed = Float32Array.from({ length: cols }, () => 0.18 + Math.random() * 0.5);
    const seed = Float32Array.from({ length: cols * rows }, () => Math.random());
    let last = 0;
    const frame = now => {
      if (!alive) return;
      raf = requestAnimationFrame(frame);
      if (now - last < 33) return;          // ~30 fps is plenty for a CRT
      last = now;
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#041a0e'; ctx.fillRect(0, 0, W, H);
      // soft phosphor shading of the face underneath the glyphs
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(shade, 0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      const dashW = Math.max(1.5, 1.7 * dpr), dashH = cellH * 0.78;
      for (let x = 0; x < cols; x++) {
        head[x] += speed[x];
        if (head[x] > rows * 1.4) head[x] = -Math.random() * rows * 0.5;
        const jx = (seed[x] - 0.5) * cellW * 0.5;
        for (let y = 0; y < rows; y++) {
          const i = y * cols + x;
          let b = B[i];
          const d = head[x] - y;                                   // rain: brightest at the head, fading trail above it
          const rain = d >= 0 && d < 9 ? 1 - d / 9 : 0;
          const flick = 0.75 + 0.5 * Math.random();
          let a = b > 0.16 ? Math.min(1, b * 1.25) * (0.6 + 0.6 * rain) * flick : (seed[i] > 0.975 ? 0.4 * flick : 0);
          if (rain > 0.85 && b > 0.12) a = Math.max(a, 0.9);
          if (a < 0.06) continue;
          const [mx, my] = map(x * cellW + jx, y * cellH);
          // most cells are a single dash; some are two-part glyphs
          ctx.fillStyle = a > 0.8 ? `rgba(200, 255, 205, ${Math.min(1, a)})` : `rgba(70, 255, 120, ${Math.min(1, a)})`;
          if (seed[i] > 0.7) { ctx.fillRect(mx, my, dashW, dashH * 0.45); ctx.fillRect(mx, my + dashH * 0.6, dashW, dashH * 0.4); }
          else ctx.fillRect(mx, my, dashW, dashH);
        }
      }
    };
    raf = requestAnimationFrame(frame);
  };
  img.src = 'assets/dev.jpg';
  return () => { alive = false; cancelAnimationFrame(raf); };
}