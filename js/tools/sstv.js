import { $, ICONS, seg, bindSeg, toast, esc, pickFile, loadImageFile, download, shareOrDownload, fitCanvas, scopeColors, theme } from '../ui.js';
import { MODES, encodeSSTV, SSTVDecoder } from '../lib/sstv.js';
import { audioCtx, playSamples, startMic, decodeAudioFile } from '../lib/audio.js';
import { encodeWav } from '../lib/dsp.js';

const fmtDur = s => s >= 60 ? `${Math.floor(s / 60)}m ${Math.round(s % 60)}s` : `${Math.round(s)}s`;

export function mount(root) {
  const modeOpts = Object.values(MODES).map(m => `<option value="${m.name}">${m.name} · ${m.w}×${m.h} · ${fmtDur(m.durationS)}</option>`).join('');
  root.innerHTML = `
    <div class="tabs">${seg('tab', [['tx', 'Send picture'], ['rx', 'Receive picture']], 'tx', 'tabs')}</div>

    <section class="panel" id="tx">
      <h2 class="panel-title">Picture to sound</h2>
      <div class="media" style="background:#000"><canvas id="tx-cv"></canvas></div>
      <div class="btns">
        <button class="btn" id="pick">${ICONS.upload}Choose picture</button>
        <button class="btn" id="snap">${ICONS.camera}Take photo</button>
      </div>
      <div class="stack" style="margin-top:12px">
        <div class="field"><label for="tx-mode">Mode</label><select id="tx-mode">${modeOpts}</select></div>
        <div class="row">
          <div class="field"><span class="label">Framing</span>${seg('fit', [['fill', 'Fill'], ['fit', 'Fit']], 'fill')}</div>
          <div class="field grow"><label for="cap">Caption / callsign</label><input type="text" id="cap" value="CRYPTEX" spellcheck="false"></div>
        </div>
      </div>
      <div class="btns">
        <button class="btn primary" id="tx-play">${ICONS.play}Transmit</button>
        <button class="btn" id="tx-wav">${ICONS.download}Save WAV</button>
      </div>
      <p class="hint" id="tx-stat">Hold the phone near the receiving device's microphone. Robot 36 is the quickest; PD 120 is what the ISS uses.</p>
    </section>

    <section class="panel" id="rx" hidden>
      <h2 class="panel-title">Sound to picture<span class="spacer"></span><span class="lamp" id="rx-lamp"></span></h2>
      <canvas id="meter" class="scope" style="height:54px"></canvas>
      <p class="hint" id="rx-stat">Idle. Start listening, then play an SSTV signal (VIS header auto-detects the mode).</p>
      <div class="media" style="background:#000;margin-top:10px"><canvas id="rx-cv" width="320" height="256"></canvas></div>
      <div class="btns">
        <button class="btn primary" id="listen">${ICONS.mic}Listen</button>
        <button class="btn" id="file">${ICONS.upload}Decode audio file</button>
        <button class="btn" id="save" disabled>${ICONS.download}Save image</button>
      </div>
      <div class="row" style="margin-top:12px">
        <div class="field grow"><label for="rx-mode">Missed the start? Force a mode</label><select id="rx-mode">${modeOpts}</select></div>
        <button class="btn small" id="force">Start now</button>
      </div>
      <h2 class="panel-title" style="margin-top:16px">Received</h2>
      <div class="thumbs" id="gallery"><p class="hint" style="margin:0">Nothing yet.</p></div>
    </section>`;

  bindSeg(root, 'tab', v => { $('#tx', root).hidden = v !== 'tx'; $('#rx', root).hidden = v !== 'rx'; if (v === 'rx') drawMeter(null); });

  // ================= TRANSMIT =================
  const txcv = $('#tx-cv', root), txMode = $('#tx-mode', root), cap = $('#cap', root);
  const fit = bindSeg(root, 'fit', () => renderTx());
  let srcImg = null, player = null, raf = 0;
  txMode.value = 'Robot 36';

  function testCard(ctx, w, h) {
    if (theme() === 'radio') {
      const bars = ['#c0c0c0', '#c0c000', '#00c0c0', '#00c000', '#c000c0', '#c00000', '#0000c0'];
      bars.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(i * w / 7, 0, w / 7 + 1, h * 0.67); });
      const g = ctx.createLinearGradient(0, 0, w, 0); g.addColorStop(0, '#000'); g.addColorStop(1, '#fff');
      ctx.fillStyle = g; ctx.fillRect(0, h * 0.67, w, h * 0.13);
      ctx.fillStyle = '#101010'; ctx.fillRect(0, h * 0.8, w, h * 0.2);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(2, w / 160);
      ctx.beginPath(); ctx.arc(w / 2, h * 0.4, h * 0.28, 0, 7); ctx.stroke();
    } else {
      const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#efdcab'); g.addColorStop(1, '#c9a868');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#5b4630'; ctx.lineWidth = Math.max(2, w / 160); ctx.strokeRect(w * .04, h * .05, w * .92, h * .9);
      ctx.fillStyle = '#2a1d12'; ctx.font = `${Math.round(h * .1)}px "Special Elite", monospace`; ctx.textAlign = 'center';
      ctx.fillText('CASE FILE 221B', w / 2, h * .3);
      ctx.save(); ctx.translate(w * .5, h * .58); ctx.rotate(-.12);
      ctx.strokeStyle = '#a3221d'; ctx.fillStyle = '#a3221d'; ctx.lineWidth = Math.max(3, w / 100);
      ctx.font = `${Math.round(h * .12)}px "Special Elite", monospace`;
      const tw = ctx.measureText('CLASSIFIED').width;
      ctx.strokeRect(-tw / 2 - 12, -h * .1, tw + 24, h * .15); ctx.fillText('CLASSIFIED', 0, h * .02);
      ctx.restore();
    }
  }

  function renderTx() {
    const m = MODES[txMode.value];
    txcv.width = m.w; txcv.height = m.h;
    const ctx = txcv.getContext('2d');
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, m.w, m.h);
    if (srcImg) {
      const s = fit.get() === 'fill' ? Math.max(m.w / srcImg.width, m.h / srcImg.height) : Math.min(m.w / srcImg.width, m.h / srcImg.height);
      const w = srcImg.width * s, h = srcImg.height * s;
      ctx.drawImage(srcImg, (m.w - w) / 2, (m.h - h) / 2, w, h);
    } else testCard(ctx, m.w, m.h);
    const text = cap.value.trim();
    if (text) {
      const fs = Math.round(m.h * 0.085);
      ctx.font = `bold ${fs}px "Share Tech Mono", monospace`; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
      const tw = ctx.measureText(text).width;
      ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.fillRect(0, m.h - fs * 1.4, tw + fs, fs * 1.4);
      ctx.fillStyle = '#fff'; ctx.fillText(text, fs / 2, m.h - fs * 0.2);
    }
  }
  txMode.onchange = renderTx; cap.oninput = renderTx;
  document.fonts?.ready.then(renderTx);
  renderTx();

  const loadPic = async (capture) => {
    const f = await pickFile('image/*', capture);
    if (!f) return;
    try { srcImg = await loadImageFile(f); renderTx(); } catch (e) { toast(e.message); }
  };
  $('#pick', root).onclick = () => loadPic();
  $('#snap', root).onclick = () => loadPic('environment');

  function makeAudio(fs) {
    const m = MODES[txMode.value];
    const data = txcv.getContext('2d').getImageData(0, 0, m.w, m.h).data;
    return encodeSSTV(m.name, data, fs);
  }
  const txBtn = $('#tx-play', root), txStat = $('#tx-stat', root);
  function stopTx() {
    player?.stop(); player = null; cancelAnimationFrame(raf);
    txBtn.innerHTML = `${ICONS.play}Transmit`; txBtn.classList.remove('on');
    renderTx();
  }
  txBtn.onclick = () => {
    if (player) return stopTx();
    const fs = audioCtx().sampleRate;
    const m = MODES[txMode.value];
    renderTx();
    const snapshot = txcv.getContext('2d').getImageData(0, 0, m.w, m.h);
    player = playSamples(makeAudio(fs), fs);
    txBtn.innerHTML = `${ICONS.stop}Stop`; txBtn.classList.add('on');
    player.ended.then(() => { if (player) { stopTx(); txStat.textContent = 'Transmission complete.'; } });
    const ctx = txcv.getContext('2d');
    const loop = () => {
      if (!player) return;
      const el = player.ctx.currentTime - player.startTime - 0.1 - 0.91 - m.preambleMs / 1000;
      const row = Math.max(0, el * 1000 / m.rowMs);
      const y = Math.min(m.h, Math.floor(row * (m.family === 'pd' ? 2 : 1)));
      ctx.putImageData(snapshot, 0, 0);
      ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, y, m.w, m.h - y);
      ctx.fillStyle = theme() === 'radio' ? '#5cff8a' : '#ffcf5a'; ctx.fillRect(0, y, m.w, 2);
      txStat.textContent = el < 0 ? 'Sending VIS header…' : `Sending line ${Math.min(m.h, y)} / ${m.h} · ${fmtDur(Math.max(0, m.durationS - el - 0.9))} left`;
      raf = requestAnimationFrame(loop);
    };
    loop();
  };
  $('#tx-wav', root).onclick = () => {
    renderTx();
    const fs = 44100;
    download(encodeWav(makeAudio(fs), fs), `sstv-${txMode.value.replace(/\s+/g, '').toLowerCase()}.wav`, 'audio/wav');
  };

  // ================= RECEIVE =================
  const rxcv = $('#rx-cv', root), rxStat = $('#rx-stat', root), meter = $('#meter', root), lamp = $('#rx-lamp', root);
  const listenBtn = $('#listen', root);
  let mic = null, dec = null, cur = null, freqNow = null, meterRaf = 0;
  const gallery = [];

  function drawMeter(f) {
    const { ctx, w, h } = fitCanvas(meter);
    const c = scopeColors();
    ctx.fillStyle = c.bg; ctx.fillRect(0, 0, w, h);
    const x = hz => (hz - 1000) / 1500 * w;
    ctx.font = `13px ${c.font}`; ctx.textAlign = 'center';
    [[1200, 'SYNC'], [1500, 'BLACK'], [1900, 'VIS'], [2300, 'WHITE']].forEach(([hz, l]) => {
      ctx.strokeStyle = c.grid; ctx.beginPath(); ctx.moveTo(x(hz), 0); ctx.lineTo(x(hz), h); ctx.stroke();
      ctx.fillStyle = c.line; ctx.globalAlpha = .7; ctx.fillText(l, x(hz), h - 6); ctx.globalAlpha = 1;
    });
    const g = ctx.createLinearGradient(x(1500), 0, x(2300), 0); g.addColorStop(0, '#000'); g.addColorStop(1, '#fff');
    ctx.fillStyle = g; ctx.fillRect(x(1500), 8, x(2300) - x(1500), 8);
    if (f) {
      ctx.strokeStyle = c.accent; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x(f), 2); ctx.lineTo(x(f), h - 22); ctx.stroke();
    }
  }
  drawMeter(null);

  function newDecoder(fs) {
    return new SSTVDecoder(fs, {
      onFreq: f => { freqNow = f; },
      onStart: (m, manual) => {
        cur = m;
        rxcv.width = m.w; rxcv.height = m.h;
        const ctx = rxcv.getContext('2d'); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, m.w, m.h);
        lamp.classList.add('on');
        rxStat.textContent = `${manual ? 'Forced' : 'VIS detected'}: ${m.name} (${m.w}×${m.h})`;
        $('#save', root).disabled = false;
      },
      onRows: (img, y0, y1) => {
        const m = cur; if (!m) return;
        const id = new ImageData(img.slice(y0 * m.w * 4, y1 * m.w * 4), m.w, y1 - y0);
        rxcv.getContext('2d').putImageData(id, 0, y0);
        rxStat.textContent = `Receiving ${m.name} — line ${y1} / ${m.h}`;
      },
      onDone: (img, m, rows) => {
        lamp.classList.remove('on');
        rxcv.getContext('2d').putImageData(new ImageData(img.slice(), m.w, m.h), 0, 0);
        rxStat.textContent = `Complete: ${m.name}, ${rows * (m.family === 'pd' ? 2 : 1)} lines (slant-corrected). Listening for the next picture…`;
        addToGallery();
        cur = null;
      },
    });
  }
  function addToGallery() {
    const url = rxcv.toDataURL('image/png');
    gallery.unshift(url);
    $('#gallery', root).innerHTML = gallery.map((u, i) => `<a href="${u}" download="sstv-${gallery.length - i}.png"><img src="${u}" alt="Received picture ${gallery.length - i}"></a>`).join('');
  }

  async function startListen() {
    try {
      dec = null;
      mic = await startMic(chunk => { dec ??= newDecoder(mic.sampleRate); dec.push(chunk); });
      listenBtn.innerHTML = `${ICONS.stop}Stop`; listenBtn.classList.add('on');
      rxStat.textContent = 'Listening for a VIS header…';
      const loop = () => { drawMeter(freqNow); meterRaf = requestAnimationFrame(loop); };
      loop();
    } catch (e) { rxStat.textContent = e.message || 'Microphone unavailable'; toast('Microphone permission needed'); }
  }
  function stopListen() {
    if (!mic) return;
    mic.stop(); mic = null; cancelAnimationFrame(meterRaf);
    if (dec?.state === 'image') dec.stop();
    listenBtn.innerHTML = `${ICONS.mic}Listen`; listenBtn.classList.remove('on');
    lamp.classList.remove('on');
    drawMeter(null);
  }
  listenBtn.onclick = () => mic ? stopListen() : startListen();

  $('#force', root).onclick = () => {
    if (!mic || !dec) return toast('Start listening first');
    if (dec.state === 'image') dec.stop();
    dec.forceStart($('#rx-mode', root).value);
  };

  $('#file', root).onclick = async () => {
    const f = await pickFile('audio/*,.wav,.mp3,.ogg,.m4a');
    if (!f) return;
    stopListen();
    rxStat.textContent = `Reading ${esc(f.name)}…`;
    try {
      const { samples, sampleRate } = await decodeAudioFile(f);
      const d = newDecoder(sampleRate);
      let found = false;
      const prevStart = d.cb.onStart;
      d.cb.onStart = (...a) => { found = true; prevStart(...a); };
      const CH = 16384;
      for (let i = 0; i < samples.length; i += CH) {
        d.push(samples.subarray(i, i + CH));
        if ((i / CH) % 8 === 0) { drawMeter(freqNow); if (!cur) rxStat.textContent = `Scanning… ${Math.round(i / samples.length * 100)}%`; await new Promise(r => setTimeout(r)); }
      }
      if (d.state === 'image') d.stop();
      if (!found) rxStat.textContent = 'No SSTV VIS header found in that file. If it starts mid-picture, use “Force a mode” while listening.';
    } catch (e) { rxStat.textContent = 'Could not read that audio: ' + e.message; }
    drawMeter(null);
  };

  $('#save', root).onclick = () => rxcv.toBlob(b => shareOrDownload(b, `sstv-${Date.now()}.png`));

  const redraw = () => { renderTx(); drawMeter(freqNow); };
  window.addEventListener('themechange', redraw);
  return () => { stopTx(); stopListen(); window.removeEventListener('themechange', redraw); };
}
