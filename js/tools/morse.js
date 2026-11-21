import { $, esc, ICONS, copy, seg, bindSeg, drawTrace, download, toast } from '../ui.js';
import { textToMorse, morseToText, morseTimeline, unitMs, MorseTimingDecoder, Slicer, goertzel, MORSE } from '../lib/morse.js';
import { playMorseTone, sidetone, startMic } from '../lib/audio.js';
import { encodeWav, magnitudeSpectrum, hann } from '../lib/dsp.js';

export function mount(root) {
  root.innerHTML = `
    <section class="panel">
      <h2 class="panel-title">Translator</h2>
      <div class="field"><label for="m-text">Plain text</label><textarea id="m-text" spellcheck="false">SOS — send help</textarea></div>
      <div class="field" style="margin-top:12px"><label for="m-code">Morse ( . - space between letters, / between words )</label><textarea id="m-code" class="out" spellcheck="false"></textarea></div>
      <div class="btns"><button class="btn" id="m-copy">${ICONS.copy}Copy Morse</button></div>
    </section>

    <section class="panel">
      <h2 class="panel-title">Sounder<span class="spacer"></span><span class="lamp" id="m-lamp"></span></h2>
      <div class="row">
        <div class="field grow"><label>Speed <span id="wpm-v">15</span> WPM</label><input type="range" id="wpm" min="5" max="35" value="15"></div>
        <div class="field grow"><label>Tone <span id="hz-v">600</span> Hz</label><input type="range" id="hz" min="300" max="1200" step="10" value="600"></div>
      </div>
      <div class="btns">
        <button class="btn primary" id="play">${ICONS.play}Play</button>
        <button class="btn" id="wav">${ICONS.download}Save WAV</button>
      </div>
      <div class="out-big" id="now" style="margin-top:12px">&nbsp;</div>
    </section>

    <section class="panel">
      <h2 class="panel-title">Telegraph key</h2>
      <p class="hint" style="margin-top:0">Press and hold to key. Short = dot, long = dash. Your fist is decoded live.</p>
      <button class="btn primary telegraph-key" id="key">${ICONS.key}Key</button>
      <div class="out-big" id="key-out" style="margin-top:12px"></div>
      <div class="btns"><button class="btn small" id="key-clear">Clear</button></div>
    </section>

    <section class="panel">
      <h2 class="panel-title">Listen &amp; decode</h2>
      <p class="hint" style="margin-top:0">Decodes Morse beeps heard by the microphone — from a radio, another phone, or a video.</p>
      <div class="row">
        <label class="field inline"><input type="checkbox" id="auto-hz" checked><span class="label">Auto-tune</span></label>
        <div class="field grow"><label>Listening at <span id="lhz-v">600</span> Hz</label><input type="range" id="lhz" min="300" max="1500" step="10" value="600"></div>
      </div>
      <canvas class="scope" id="scope" style="margin-top:10px"></canvas>
      <div class="row" style="margin-top:6px;justify-content:space-between"><span class="hint" id="l-stat" style="margin:0">Idle</span><span class="hint" id="l-wpm" style="margin:0"></span></div>
      <div class="out-big" id="l-out" style="margin-top:8px"></div>
      <div class="btns"><button class="btn primary" id="listen">${ICONS.mic}Start listening</button><button class="btn small" id="l-clear">Clear</button></div>
    </section>

    <section class="panel">
      <h2 class="panel-title">Code chart</h2>
      <div class="align-view" style="white-space:pre-wrap;columns:2 9em;font-size:15px">${[...'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'].map(k => `${k}  ${MORSE[k]}`).join('\n')}</div>
    </section>`;

  const text = $('#m-text', root), code = $('#m-code', root);
  text.oninput = () => { code.value = textToMorse(text.value); };
  code.oninput = () => { text.value = morseToText(code.value); };
  text.oninput();
  $('#m-copy', root).onclick = () => copy(code.value);

  const wpm = $('#wpm', root), hz = $('#hz', root);
  wpm.oninput = () => { $('#wpm-v', root).textContent = wpm.value; };
  hz.oninput = () => { $('#hz-v', root).textContent = hz.value; };

  // ---- Sounder ----
  let playing = null, raf = 0;
  const lampEl = $('#m-lamp', root), now = $('#now', root), playBtn = $('#play', root);
  function stopPlay() {
    playing?.stop(); playing = null; cancelAnimationFrame(raf);
    lampEl.classList.remove('on'); playBtn.innerHTML = `${ICONS.play}Play`; playBtn.classList.remove('on');
  }
  playBtn.onclick = () => {
    if (playing) return stopPlay();
    const tl = morseTimeline(code.value);
    if (!tl.length) return toast('Nothing to play');
    const u = unitMs(+wpm.value);
    playing = playMorseTone(tl, u, +hz.value);
    playBtn.innerHTML = `${ICONS.stop}Stop`; playBtn.classList.add('on');
    // Build a time → symbol map for the visual
    const marks = []; let t = 0;
    for (const s of tl) { marks.push({ t, end: t + s.units * u, on: s.on }); t += s.units * u; }
    const words = code.value.trim();
    const loop = () => {
      if (!playing) return;
      const el = (playing.ctx.currentTime - playing.startTime) * 1000;
      const m = marks.find(x => el >= x.t && el < x.end);
      lampEl.classList.toggle('on', !!m?.on);
      const idx = marks.filter(x => x.on && x.t <= el).length;
      let k = 0, shown = '';
      for (const ch of words) { if (ch === '.' || ch === '-') { if (k >= idx) break; k++; } shown += ch; }
      now.textContent = shown || ' ';
      if (el > t + 100) return stopPlay();
      raf = requestAnimationFrame(loop);
    };
    loop();
  };
  $('#wav', root).onclick = () => {
    const tl = morseTimeline(code.value);
    if (!tl.length) return toast('Nothing to save');
    const fs = 44100, u = unitMs(+wpm.value) / 1000, f = +hz.value;
    const total = tl.reduce((s, x) => s + x.units, 0) * u + 0.6;
    const out = new Float32Array(Math.ceil(total * fs));
    let t = 0.3;
    for (const s of tl) {
      const d = s.units * u;
      if (s.on) {
        const a = Math.round(t * fs), b = Math.round((t + d) * fs), r = Math.round(0.004 * fs);
        for (let i = a; i < b; i++) out[i] = 0.6 * Math.sin(2 * Math.PI * f * i / fs) * Math.min(1, (i - a) / r, (b - i) / r);
      }
      t += d;
    }
    download(encodeWav(out, fs), 'morse.wav', 'audio/wav');
  };

  // ---- Telegraph key ----
  let tone = null, keyDec, keyTimer;
  const keyOut = $('#key-out', root), keyBtn = $('#key', root);
  const newKeyDec = () => new MorseTimingDecoder({ debounceMs: 8, onText: (t) => { keyOut.textContent = t; }, onSymbol: (_, live) => { keyOut.textContent = keyDec.text + live; } });
  keyDec = newKeyDec();
  const keyDown = e => {
    e.preventDefault();
    tone ??= sidetone(+hz.value);
    tone.on(); keyBtn.classList.add('on');
    keyDec.update(true, performance.now());
    navigator.vibrate?.(10);
  };
  const keyUp = () => { tone?.off(); keyBtn.classList.remove('on'); keyDec.update(false, performance.now()); };
  keyBtn.addEventListener('pointerdown', keyDown);
  keyBtn.addEventListener('pointerup', keyUp);
  keyBtn.addEventListener('pointercancel', keyUp);
  keyBtn.addEventListener('pointerleave', keyUp);
  keyBtn.addEventListener('contextmenu', e => e.preventDefault());
  // keep feeding the decoder so debounced transitions commit and gaps flush
  keyTimer = setInterval(() => {
    const t = performance.now();
    keyDec.update(keyBtn.classList.contains('on'), t);
    keyDec.tick(t);
  }, 10);
  $('#key-clear', root).onclick = () => { keyDec = newKeyDec(); keyOut.textContent = ''; };

  // ---- Listen ----
  let mic = null, lDec = null, slicer = null, buf = null, bufN = 0, t0 = 0, trace = [], traceOn = [], lastTune = 0, sampleCount = 0;
  const lOut = $('#l-out', root), lStat = $('#l-stat', root), lhz = $('#lhz', root), scope = $('#scope', root), listenBtn = $('#listen', root);
  lhz.oninput = () => { $('#lhz-v', root).textContent = lhz.value; };
  drawTrace(scope, []);
  async function startListen() {
    try {
      lDec = new MorseTimingDecoder({ debounceMs: 12, onText: t => { lOut.textContent = t; }, onSymbol: (_, live) => { lOut.textContent = lDec.text + live; } });
      slicer = new Slicer({ windowMs: 5000, minContrast: 5 });
      trace = []; traceOn = []; sampleCount = 0;
      mic = await startMic(onAudio);
      buf = new Float32Array(mic.sampleRate * 2); bufN = 0; t0 = 0;
      listenBtn.innerHTML = `${ICONS.stop}Stop`; listenBtn.classList.add('on');
      lStat.textContent = 'Listening…';
    } catch (e) { lStat.textContent = e.message || 'Microphone unavailable'; toast('Microphone permission needed'); }
  }
  function stopListen() {
    mic?.stop(); mic = null;
    listenBtn.innerHTML = `${ICONS.mic}Start listening`; listenBtn.classList.remove('on');
    lStat.textContent = 'Idle';
  }
  function onAudio(chunk) {
    const fs = mic.sampleRate, B = Math.round(fs * 0.005);
    // ring-ish buffer for auto-tune
    if (bufN + chunk.length > buf.length) { buf.copyWithin(0, buf.length / 2, bufN); bufN -= buf.length / 2; }
    buf.set(chunk, bufN); bufN += chunk.length;
    const tNow = sampleCount / fs * 1000;
    if ($('#auto-hz', root).checked && tNow - lastTune > 400 && bufN >= 4096) {
      lastTune = tNow;
      const mag = magnitudeSpectrum(buf.subarray(bufN - 4096, bufN), hann(4096));
      const binHz = fs / 4096;
      let best = 0, bi = 0; const lo = Math.round(300 / binHz), hi = Math.round(1500 / binHz);
      const sorted = Array.from(mag.subarray(lo, hi)).sort((a, b) => a - b), med = sorted[sorted.length >> 1];
      for (let i = lo; i < hi; i++) if (mag[i] > best) { best = mag[i]; bi = i; }
      if (best > med * 12) { const f = Math.round(bi * binHz / 10) * 10; if (Math.abs(f - +lhz.value) > 15) { lhz.value = f; lhz.oninput(); } }
    }
    const f = +lhz.value;
    for (let i = 0; i + B <= chunk.length; i += B) {
      const amp = Math.sqrt(goertzel(chunk, i, B, f, fs)) / B;
      const t = (sampleCount + i) / fs * 1000;
      const on = slicer.push(amp, t);
      lDec.update(on, t); lDec.tick(t);
      trace.push(slicer.norm(amp)); traceOn.push(on);
    }
    sampleCount += chunk.length;
    if (trace.length > 400) { trace = trace.slice(-400); traceOn = traceOn.slice(-400); }
    drawTrace(scope, trace, { marks: traceOn });
    lStat.textContent = slicer.active ? `Signal at ${f} Hz` : 'Listening… (no signal)';
    $('#l-wpm', root).textContent = lDec.unit ? `≈ ${Math.round(1200 / lDec.unit)} WPM` : '';
  }
  listenBtn.onclick = () => mic ? stopListen() : startListen();
  $('#l-clear', root).onclick = () => { if (lDec) lDec.reset(); lOut.textContent = ''; };

  const redraw = () => drawTrace(scope, trace, { marks: traceOn });
  window.addEventListener('themechange', redraw);
  return () => { stopPlay(); stopListen(); tone?.close(); clearInterval(keyTimer); window.removeEventListener('themechange', redraw); };
}
