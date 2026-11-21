// About the developer.
// Detective: a personnel file slams onto the desk → booking photo + dossier → evidence board with red string.
// Radio Room: a vintage terminal boots into a hologram → Morse callsign on an oscilloscope → readouts.
import { $, $$, esc, theme, ICONS, scopeColors, fitCanvas } from '../ui.js';
import { haptic } from '../lib/native.js';
import { sfx, tapeLoop } from '../lib/sfx.js';
import { textToMorse, morseTimeline } from '../lib/morse.js';

const P = {
  name: 'Rachit Aryan Asthana',
  short: 'R. A. ASTHANA',
  bio: 'I have loved cryptography and ciphers since I was a child. It started with detective stories — Sherlock Holmes, Hercule Poirot, and the codes woven through The Da Vinci Code — and it never stopped. I have solved Jane Street puzzles, gone hunting for the treasures of “The Secret”, and I start most days with the Minute Cryptic. Over the years I have filled a diary with tons of my own cryptic poems, riddles and puzzles. Cryptex is the kit I always wanted: every cipher, signal and secret in one place.',
};
const EVIDENCE = [
  { kind: 'sticky', title: 'Jane Street puzzles', by: 'Monthly puzzles', tag: 'Solved' },
  { kind: 'map', title: 'The Secret: A Treasure Hunt', by: 'Byron Preiss', tag: 'Ongoing' },
  { kind: 'calendar', title: 'Minute Cryptic', by: 'One clue a day', tag: 'Daily' },
  { kind: 'diary', title: 'The Diary', by: 'Tons of cryptic poems, riddles & puzzles', tag: 'Authored' },
];
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function mount(root) {
  let timers = [], raf = 0, obs = null, onResize = null, stopZola = null, stopTape = null;
  const later = (ms, fn) => timers.push(setTimeout(fn, ms));
  const clear = () => {
    timers.forEach(clearTimeout); timers = []; cancelAnimationFrame(raf); obs?.disconnect(); stopZola?.(); stopZola = null; stopTape?.(); stopTape = null;
    if (onResize) window.removeEventListener('resize', onResize);
    document.getElementById('app')?.classList.remove('shake');
  };
  const typeInto = (el, text, speed, done, onChar) => {
    if (reduced()) { el.textContent = text; done?.(); return; }
    let i = 0;
    const step = () => { el.textContent = text.slice(0, ++i); onChar?.(text[i - 1], i); i < text.length ? later(speed, step) : done?.(); };
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
                  <canvas class="noir" data-noir="mug" role="img" aria-label="Booking photo of ${esc(P.name)}, eyes redacted, circled in red"></canvas>
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
          <figure class="board-photo" data-pin="hub"><canvas class="noir" data-noir="board" aria-hidden="true"></canvas><figcaption>The subject</figcaption><i class="pin"></i></figure>
          ${EVIDENCE.map((e, i) => note(e, i)).join('')}
        </div>

        <article class="statement">
          <h2>Statement of the subject</h2>
          <p id="bio"></p>
          <div class="sig"><span>R. A. Asthana</span><small>Signed</small></div>
        </article>
        <div class="about-actions"><button class="btn" id="replay">${ICONS.reset}Replay</button></div>
      </div>`;

    $$('canvas.noir', root).forEach(drawNoir);
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
      diary: `<small class="n-foil">DIARY</small><b>${esc(e.title)}</b><span>${esc(e.by)}</span><em>${esc(e.tag)}</em><i class="n-band"></i>`,
    }[e.kind];
    return `<div class="note note-${e.kind}" data-pin="note" style="--r:${[-3, 2.5, -1.5, 3, -2.5, 2][i]}deg;--d:${i * 0.08}s">${body}<i class="pin"></i></div>`;
  }

  // ======================= RADIO =======================
  function radio() {
    const log = [
      ['Jane Street puzzles', 'Monthly puzzles', 'SOLVED', 'ok'],
      ['The Secret: A Treasure Hunt', 'Byron Preiss', 'ONGOING', 'warn'],
      ['Minute Cryptic', 'One clue a day', 'DAILY', 'live'],
      ['The Diary', 'Cryptic poems, riddles & puzzles', 'AUTHORED', 'ok'],
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
          ${tapeDeckSVG()}
          <div class="bank-mid"><div class="bank-lights">${Array.from({ length: 12 }, (_, k) => `<i style="animation-delay:${(k * 0.37) % 1.9}s;animation-duration:${1.1 + (k * 0.29) % 1.4}s"></i>`).join('')}</div><span>MEMORY BANK 012</span></div>
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
    const term = (ch, i) => { if (ch === '\n') sfx('beep'); else if (ch !== ' ' && i % 2) sfx('chirp'); };
    const finish = () => {
      $('#sections', root).classList.add('revealed'); startTrace();
      sfx('relay');
      later(260, () => { root.querySelector('.tapebank').classList.add('run'); stopTape?.(); stopTape = tapeLoop(); });
    };
    if (reduced()) {
      $('#led', root).classList.add('on'); crt.classList.add('on', 'ready'); stopZola = startZola($('#zola', root), crt); face.classList.add('show'); boot.classList.add('gone');
      $('#cname', root).textContent = P.name.toUpperCase(); $('#crole', root).textContent = 'DEVELOPER · CODEBREAKER';
      finish(); return;
    }
    later(200, () => { $('#led', root).classList.add('on'); crt.classList.add('on'); haptic('light'); sfx('power'); });
    later(1100, () => {
      crt.classList.add('ready');
      typeInto(boot, bootText + '\n', 16, () => later(250, () => {
        // burst of static, then the face resolves out of it
        stat.classList.add('burst'); boot.classList.add('gone'); sfx('static');
        later(700, () => { stopZola = startZola($('#zola', root), crt); face.classList.add('show'); stat.classList.remove('burst'); });
        later(1700, () => typeInto($('#cname', root), P.name.toUpperCase(), 40, () =>
          typeInto($('#crole', root), 'DEVELOPER · CODEBREAKER', 22, () => later(120, finish), term), term));
      }), term);
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
 * Evidence print: a normal black-and-white photo (light grain, slight vignette, scuffs), with a
 * black redaction bar over the eyes and a hand-drawn red marker circle around the face.
 * Feature positions are in the source photo's coordinates (assets/dev-anon.jpg is 720×900).
 */
function drawNoir(cv) {
  const img = new Image();
  img.onload = () => {
    const board = cv.dataset.noir === 'board';
    const w = cv.width = 360, h = cv.height = board ? 360 : 450;
    const ctx = cv.getContext('2d');
    const s = Math.max(w / img.width, h / img.height) * 1.08;
    const ox = (w - img.width * s) / 2, oy = (h - img.height * s) * (board ? .3 : .45);
    const P = (fx, fy) => [ox + fx * img.width * s, oy + fy * img.height * s];   // source fraction → canvas
    ctx.drawImage(img, ox, oy, img.width * s, img.height * s);
    const d = ctx.getImageData(0, 0, w, h), p = d.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      let l = (0.3 * p[i] + 0.59 * p[i + 1] + 0.11 * p[i + 2]) / 255;
      l = Math.pow(Math.min(1, l * 1.12 + 0.04), 0.92);          // normal exposure, a little lift
      const vx = x / w - .5, vy = y / h - .45;
      l *= 1 - (vx * vx + vy * vy) * 0.9;                        // gentle vignette
      l = Math.max(0, Math.min(1, l + (Math.random() - .5) * 0.07));   // fine grain
      const v = l * 255;
      p[i] = v * (board ? 1.03 : 1); p[i + 1] = v * (board ? .98 : 1); p[i + 2] = v * (board ? .9 : .98); p[i + 3] = 255;
    }
    ctx.putImageData(d, 0, 0);
    ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.lineWidth = .6;
    for (let k = 0; k < 3; k++) { ctx.beginPath(); const x0 = Math.random() * w; ctx.moveTo(x0, 0); ctx.lineTo(x0 + (Math.random() - .5) * 30, h); ctx.stroke(); }

    // black redaction bar across the eyes (eyes sit at ~49% height, 28–70% width of the source)
    const [ex0, ey] = P(0.25, 0.497), [ex1] = P(0.75, 0.497);
    const barH = (ex1 - ex0) * 0.2;
    ctx.save();
    ctx.translate((ex0 + ex1) / 2, ey); ctx.rotate(-0.025);
    ctx.fillStyle = '#0b0b0b';
    ctx.beginPath();
    const bw = (ex1 - ex0) / 2;
    ctx.moveTo(-bw, -barH / 2 + 1); ctx.lineTo(bw, -barH / 2); ctx.lineTo(bw - 1, barH / 2); ctx.lineTo(-bw + 1, barH / 2 + 1); ctx.closePath();
    ctx.fill();
    ctx.restore();

    // red marker loop around the face: wobbly, overlapping at the start, streaky ink
    const [fcx, fcy] = P(0.5, 0.53);
    const rx = img.width * s * 0.34, ry = img.height * s * 0.33;
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let pass = 0; pass < 3; pass++) {
      ctx.strokeStyle = pass === 0 ? 'rgba(226, 30, 24, .92)' : 'rgba(255, 70, 60, .35)';
      ctx.lineWidth = pass === 0 ? 5.5 : 2.2;
      ctx.beginPath();
      const a0 = -2.2 + pass * 0.05, turns = Math.PI * 2 * 1.12;
      for (let t = 0; t <= 1.0001; t += 0.01) {
        const a = a0 + t * turns;
        const wob = 1 + Math.sin(a * 3 + pass) * 0.025 + Math.sin(a * 7) * 0.012 + t * 0.05;
        const x = fcx + Math.cos(a) * rx * wob + pass * 1.2, y = fcy + Math.sin(a) * ry * wob - pass;
        t ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();
  };
  img.src = 'assets/dev-anon.jpg';
}
/**
 * Reel-to-reel transport drawn to scale (modelled on 1970s decks such as the Sony TC-630):
 * smoked-plastic reels with three windows over glossy tape packs, white hubs, and a tape path that
 * leaves each pack on a true tangent, wraps the guide posts and crosses the head block,
 * capstan and pinch roller. Supply (left) is full, take-up (right) nearly empty.
 */
function tapeDeckSVG() {
  const W = 400, H = 200, R = 64, rg = 5, tapeY = 168;
  const L = { x: 80, y: 80, pack: 58 }, Rr = { x: 320, y: 80, pack: 33 };
  const GL = { x: 150, y: tapeY - rg }, GR = { x: 250, y: tapeY - rg };
  // tangent from external point P to circle (c, r); side = +1 picks the tangent point to the right
  const tangent = (c, r, P, side) => {
    const dx = P.x - c.x, dy = P.y - c.y, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx), o = Math.acos(r / d);
    const t1 = [c.x + r * Math.cos(a + o), c.y + r * Math.sin(a + o)], t2 = [c.x + r * Math.cos(a - o), c.y + r * Math.sin(a - o)];
    return (t1[0] - t2[0]) * side > 0 ? t1 : t2;
  };
  const pL = { x: GL.x - rg, y: GL.y }, pR = { x: GR.x + rg, y: GR.y };
  const tL = tangent(L, L.pack, pL, 1), tR = tangent(Rr, Rr.pack, pR, -1);
  const f = n => n.toFixed(2);
  const tape = `M${f(tL[0])},${f(tL[1])} L${f(pL.x)},${f(pL.y)} A${rg},${rg} 0 0 0 ${GL.x},${tapeY} L${GR.x},${tapeY} A${rg},${rg} 0 0 0 ${f(pR.x)},${f(pR.y)} L${f(tR[0])},${f(tR[1])}`;
  // reel flange with three kidney windows (annular sectors) cut out
  const flange = () => {
    let d = `M${R},0 A${R},${R} 0 1 1 ${-R},0 A${R},${R} 0 1 1 ${R},0 Z`;
    for (let k = 0; k < 3; k++) {
      const a0 = (k * 120 - 33) * Math.PI / 180, a1 = (k * 120 + 33) * Math.PI / 180, r0 = 24, r1 = R - 6;
      const P = (r, a) => `${f(r * Math.cos(a))},${f(r * Math.sin(a))}`;
      d += ` M${P(r0, a0)} L${P(r1, a0)} A${r1},${r1} 0 0 1 ${P(r1, a1)} L${P(r0, a1)} A${r0},${r0} 0 0 0 ${P(r0, a0)} Z`;
    }
    return d;
  };
  const packRings = r => Array.from({ length: Math.floor((r - 20) / 2.2) }, (_, i) => `<circle r="${f(20 + i * 2.2)}" fill="none" stroke="rgba(255,235,210,${(0.025 + ((i * 7) % 5) * 0.012).toFixed(3)})" stroke-width=".7"/>`).join('');
  const reel = (c, cls) => `
    <g transform="translate(${c.x} ${c.y})">
      <circle r="${R + 1.5}" fill="rgba(0,0,0,.35)" transform="translate(2 3)" filter="url(#tdBlur)"/>
      <circle r="${c.pack}" fill="url(#tdPack)"/>${packRings(c.pack)}
      <circle r="${c.pack}" fill="url(#tdSheen)"/>
      <g class="td-reel ${cls}">
        <path d="${flange()}" fill="url(#tdSmoke)" fill-rule="evenodd" stroke="rgba(255,255,255,.55)" stroke-width=".8"/>
        <circle r="${R - 1.2}" fill="none" stroke="rgba(0,0,0,.35)" stroke-width="1"/>
        <circle r="19" fill="url(#tdHub)" stroke="#9c9a92" stroke-width=".8"/>
        ${[0, 120, 240].map(a => `<rect x="-2.6" y="-15" width="5.2" height="6" rx="1" fill="#2b2a27" transform="rotate(${a})"/>`).join('')}
        <circle r="6.5" fill="url(#tdChrome)" stroke="#555" stroke-width=".6"/>
        ${[60, 180, 300].map(a => `<rect x="-1.4" y="-9.5" width="2.8" height="4" rx=".8" fill="url(#tdChrome)" transform="rotate(${a})"/>`).join('')}
      </g>
      <path d="M${-R * .62},${-R * .55} A${R * .82},${R * .82} 0 0 1 ${R * .35},${-R * .78}" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="2.5" stroke-linecap="round"/>
    </g>`;
  const screw = (x, y) => `<image href="assets/hw/screw-steel.svg" x="${x - 5}" y="${y - 5}" width="10" height="10"/>`;
  return `
  <svg class="td" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
    <defs>
      <pattern id="tdAl" patternUnits="userSpaceOnUse" width="400" height="400"><image href="assets/tex/brushed-light.jpg" width="400" height="400" preserveAspectRatio="none"/></pattern>
      <linearGradient id="tdPlateLight" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".18"/></linearGradient>
      <radialGradient id="tdPack"><stop offset=".3" stop-color="#3b2a1d"/><stop offset=".75" stop-color="#2b1d13"/><stop offset="1" stop-color="#1c120b"/></radialGradient>
      <linearGradient id="tdSheen" x1="0" y1="0" x2="1" y2="1"><stop offset=".25" stop-color="#fff" stop-opacity="0"/><stop offset=".45" stop-color="#ffe9d0" stop-opacity=".16"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/></linearGradient>
      <radialGradient id="tdSmoke" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#e8ecef" stop-opacity=".42"/><stop offset=".7" stop-color="#c9ced3" stop-opacity=".24"/><stop offset="1" stop-color="#9aa0a6" stop-opacity=".38"/></radialGradient>
      <radialGradient id="tdHub" cx=".4" cy=".35"><stop offset="0" stop-color="#ffffff"/><stop offset=".7" stop-color="#e6e3da"/><stop offset="1" stop-color="#bdb9ae"/></radialGradient>
      <radialGradient id="tdChrome" cx=".35" cy=".3"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#a9ada6"/><stop offset="1" stop-color="#4f524d"/></radialGradient>
      <linearGradient id="tdTape" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3a281b"/><stop offset=".5" stop-color="#4a3424"/><stop offset="1" stop-color="#3a281b"/></linearGradient>
      <linearGradient id="tdHeadCover" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a3d38"/><stop offset="1" stop-color="#1c1e1b"/></linearGradient>
      <linearGradient id="tdHead" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6f736c"/><stop offset=".45" stop-color="#f2f3ef"/><stop offset="1" stop-color="#7c8079"/></linearGradient>
      <radialGradient id="tdRubber" cx=".38" cy=".32"><stop offset="0" stop-color="#4a4a4a"/><stop offset=".6" stop-color="#191919"/><stop offset="1" stop-color="#0a0a0a"/></radialGradient>
      <filter id="tdBlur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.2"/></filter>
    </defs>
    <!-- deck plate -->
    <rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="8" fill="url(#tdAl)" stroke="#5c5f58" stroke-width="1.5"/>
    <rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="8" fill="url(#tdPlateLight)"/>
    <rect x="3" y="3" width="${W - 6}" height="${H - 6}" rx="7" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="1"/>
    ${screw(12, 12)}${screw(W - 12, 12)}${screw(12, H - 12)}${screw(W - 12, H - 12)}
    <!-- head block -->
    <rect x="${GL.x + 12}" y="${tapeY - 26}" width="${GR.x - GL.x - 24}" height="34" rx="4" fill="url(#tdHeadCover)" stroke="#0c0d0b"/>
    ${[175, 200, 225].map(x => `<rect x="${x - 6}" y="${tapeY - 9}" width="12" height="10" rx="2.5" fill="url(#tdHead)" stroke="#3a3c38" stroke-width=".6"/><rect x="${x - .4}" y="${tapeY - 9}" width=".8" height="10" fill="#222"/>`).join('')}
    <!-- guide posts -->
    ${[GL, GR].map(g => `<circle cx="${g.x}" cy="${g.y}" r="${rg + 2.5}" fill="#2a2c28"/><circle cx="${g.x}" cy="${g.y}" r="${rg}" fill="url(#tdChrome)"/>`).join('')}
    <!-- capstan + pinch roller -->
    <circle cx="${GR.x - 8}" cy="${tapeY + 13}" r="9" fill="url(#tdRubber)" stroke="#000" stroke-width=".6"/>
    <circle cx="${GR.x - 8}" cy="${tapeY + 13}" r="2.2" fill="url(#tdChrome)"/>
    <circle cx="${GR.x - 8}" cy="${tapeY - 4}" r="2.6" fill="url(#tdChrome)" stroke="#333" stroke-width=".5"/>
    <!-- reels -->
    ${reel(L, 'td-supply')}${reel(Rr, 'td-takeup')}
    <!-- tape -->
    <path d="${tape}" fill="none" stroke="#000" stroke-opacity=".35" stroke-width="3.2" transform="translate(.8 1.4)"/>
    <path d="${tape}" fill="none" stroke="url(#tdTape)" stroke-width="2.4" stroke-linejoin="round"/>
    <path d="${tape}" fill="none" stroke="rgba(255,225,190,.22)" stroke-width=".6"/>
  </svg>`;
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
  img.src = 'assets/dev-soft.jpg';
  return () => { alive = false; cancelAnimationFrame(raf); };
}