import { $, ICONS, seg, bindSeg, drawTrace, toast, esc } from '../ui.js';
import { textToMorse, morseTimeline, unitMs, MorseTimingDecoder, Slicer } from '../lib/morse.js';
import { openCamera, openTorch } from '../lib/camera.js';

export function mount(root) {
  root.innerHTML = `
    <div class="tabs">${seg('tab', [['tx', 'Transmit'], ['rx', 'Receive']], 'tx', 'tabs')}</div>
    <section class="panel" id="tx">
      <h2 class="panel-title">Send a light message</h2>
      <div class="field"><label for="msg">Message</label><input type="text" id="msg" value="MEET AT DAWN" autocapitalize="characters" spellcheck="false"></div>
      <div class="align-view" id="tx-code" style="margin-top:10px;white-space:pre-wrap"></div>
      <div class="row" style="margin-top:12px">
        <div class="field grow"><label>Speed <span id="wpm-v">6</span> WPM <span class="hint" id="unit-v"></span></label><input type="range" id="wpm" min="2" max="14" value="6"></div>
      </div>
      <div class="field" style="margin-top:10px"><span class="label">Light source</span>${seg('src', [['screen', 'Screen'], ['torch', 'Flashlight'], ['both', 'Both']], 'torch')}</div>
      <label class="field inline" style="margin-top:12px"><input type="checkbox" id="repeat"><span class="label">Repeat until stopped</span></label>
      <div class="btns"><button class="btn primary" id="send">${ICONS.flash}Start signalling</button></div>
      <p class="hint">Tip: slower speeds (4–8 WPM) read much more reliably through a camera. The flashlight needs Chrome on Android; iPhones fall back to the screen.</p>
    </section>

    <section class="panel" id="rx" hidden>
      <h2 class="panel-title">Read a light with the camera</h2>
      <div class="media" id="media" style="aspect-ratio:4/3"><video id="vid" playsinline muted></video><div class="reticle"><i></i></div></div>
      <canvas class="scope" id="scope" style="margin-top:10px"></canvas>
      <div class="row" style="margin-top:6px;justify-content:space-between"><span class="hint" id="rx-stat" style="margin:0">Camera off</span><span class="hint" id="rx-wpm" style="margin:0"></span></div>
      <div class="out-big" id="rx-out" style="margin-top:8px"></div>
      <div class="btns">
        <button class="btn primary" id="rx-go">${ICONS.camera}Start camera</button>
        <button class="btn small" id="rx-clear">Clear</button>
      </div>
      <p class="hint">Point the circle at the flashing light and hold steady. Works best in a dim room. The decoder learns the sender's speed automatically.</p>
    </section>`;

  const tab = bindSeg(root, 'tab', v => { $('#tx', root).hidden = v !== 'tx'; $('#rx', root).hidden = v !== 'rx'; if (v === 'tx') stopRx(); });
  const src = bindSeg(root, 'src');
  const msg = $('#msg', root), wpm = $('#wpm', root);
  const upd = () => {
    $('#tx-code', root).textContent = textToMorse(msg.value) || '—';
    $('#wpm-v', root).textContent = wpm.value;
    $('#unit-v', root).textContent = `(dot = ${Math.round(unitMs(+wpm.value))} ms)`;
  };
  msg.oninput = upd; wpm.oninput = upd; upd();

  // ---------- Transmit ----------
  const flash = $('#flash');
  let tx = null;
  async function startTx() {
    const tl = morseTimeline(textToMorse(msg.value));
    if (!tl.length) return toast('Type a message first');
    const mode = src.get();
    const u = unitMs(+wpm.value);
    let torch = null, useScreen = mode !== 'torch';
    if (mode !== 'screen') {
      try { torch = await openTorch(); } catch { torch = null; }
      if (!torch?.supported) { torch?.stop(); torch = null; useScreen = true; toast('Flashlight not available here — using the screen'); }
    }
    const wake = await navigator.wakeLock?.request('screen').catch(() => null);
    flash.hidden = false; flash.classList.remove('on');
    flash.innerHTML = `<div class="flash-ui"><div id="fl-prog">GET READY…</div><button class="btn" id="fl-stop">${ICONS.stop}Stop</button></div>`;
    if (!useScreen) flash.style.background = '#000';
    if (useScreen) document.documentElement.requestFullscreen?.().catch(() => {});
    const state = { stop: false, timer: 0 };
    tx = { state, torch, wake };
    $('#fl-stop').onclick = stopTx;
    const set = on => { if (useScreen) flash.classList.toggle('on', on); torch?.set(on); };
    // timeline with lead-in darkness (receiver calibration) and tail
    const segs = [{ on: false, ms: 1500 }, ...tl.map(s => ({ on: s.on, ms: s.units * u })), { on: false, ms: 7 * u + 1500 }];
    const total = segs.reduce((a, s) => a + s.ms, 0);
    const run = () => {
      let t = performance.now(), i = 0, elapsed = 0;
      const step = () => {
        if (state.stop) return;
        if (i >= segs.length) { if ($('#repeat', root).checked) return run(); return stopTx(); }
        const s = segs[i++];
        set(s.on);
        elapsed += s.ms;
        const p = $('#fl-prog'); if (p) p.textContent = `${Math.round(elapsed / total * 100)}%  ·  ${esc(msg.value.toUpperCase())}`;
        t += s.ms;
        state.timer = setTimeout(step, Math.max(0, t - performance.now()));
      };
      step();
    };
    run();
  }
  function stopTx() {
    if (!tx) return;
    tx.state.stop = true; clearTimeout(tx.state.timer);
    tx.torch?.stop(); tx.wake?.release?.();
    tx = null;
    flash.hidden = true; flash.classList.remove('on'); flash.style.background = '';
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  }
  $('#send', root).onclick = startTx;

  // ---------- Receive ----------
  const vid = $('#vid', root), scope = $('#scope', root), out = $('#rx-out', root), stat = $('#rx-stat', root), go = $('#rx-go', root);
  const small = document.createElement('canvas'); small.width = 80; small.height = 60;
  const sctx = small.getContext('2d', { willReadFrequently: true });
  let cam = null, raf = 0, dec, slicer, trace = [], marks = [];
  drawTrace(scope, []);
  async function startRx() {
    try {
      cam = await openCamera(vid, { width: 640, height: 480 });
    } catch (e) { stat.textContent = e.message || 'Camera unavailable'; return toast('Camera permission needed'); }
    dec = new MorseTimingDecoder({ debounceMs: 30, onText: t => { out.textContent = t; }, onSymbol: (_, live) => { out.textContent = dec.text + live; } });
    slicer = new Slicer({ windowMs: 6000, minContrast: 1.25, minDelta: 18 });
    trace = []; marks = [];
    go.innerHTML = `${ICONS.stop}Stop camera`; go.classList.add('on');
    const frame = () => {
      if (!cam) return;
      if (vid.readyState >= 2) {
        sctx.drawImage(vid, 0, 0, 80, 60);
        // brightest 12% of pixels inside the central region → robust to small/offset light sources
        const d = sctx.getImageData(20, 15, 40, 30).data, vals = [];
        for (let i = 0; i < d.length; i += 4) vals.push(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
        vals.sort((a, b) => b - a);
        let s = 0; const k = Math.max(1, Math.floor(vals.length * 0.12)); for (let i = 0; i < k; i++) s += vals[i];
        const v = s / k, t = performance.now();
        const on = slicer.push(v, t);
        dec.update(on, t); dec.tick(t);
        trace.push(slicer.norm(v)); marks.push(on);
        if (trace.length > 240) { trace.shift(); marks.shift(); }
        drawTrace(scope, trace, { marks });
        stat.textContent = slicer.active ? (on ? '● LIGHT ON' : '○ light off') : 'Searching for a flashing light…';
        $('#rx-wpm', root).textContent = dec.unit && dec.history.length > 4 ? `≈ ${Math.round(1200 / dec.unit)} WPM` : '';
      }
      raf = vid.requestVideoFrameCallback ? vid.requestVideoFrameCallback(frame) : requestAnimationFrame(frame);
    };
    frame();
  }
  function stopRx() {
    if (!cam) return;
    cam.stop(); cam = null; cancelAnimationFrame(raf);
    go.innerHTML = `${ICONS.camera}Start camera`; go.classList.remove('on');
    stat.textContent = 'Camera off';
  }
  go.onclick = () => cam ? stopRx() : startRx();
  $('#rx-clear', root).onclick = () => { dec?.reset(); out.textContent = ''; };

  const redraw = () => drawTrace(scope, trace, { marks });
  window.addEventListener('themechange', redraw);
  return () => { stopTx(); stopRx(); window.removeEventListener('themechange', redraw); };
}
