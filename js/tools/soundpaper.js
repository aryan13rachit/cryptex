import { $, ICONS, seg, bindSeg, toast, pickFile, loadImageFile, shareOrDownload, drawTrace, theme } from '../ui.js';
import { soundToImage, imageToSound, toLuminance, columnToAmps, runs, bandFreq } from '../lib/soundpaper.js';
import { startMic, decodeAudioFile, playSamples, audioCtx, oscillatorBank } from '../lib/audio.js';
import { openCamera } from '../lib/camera.js';

const MAX_S = 12;
const LIVE_BANDS = 72;

export function mount(root) {
  root.innerHTML = `
    <div class="tabs">${seg('tab', [['make', 'Sound → Paper'], ['scan', 'Paper → Sound']], 'make', 'tabs')}</div>

    <section class="panel" id="make">
      <h2 class="panel-title">Record a sound<span class="spacer"></span><span class="readout" id="rec-t">0.0s</span></h2>
      <canvas class="scope" id="lvl" style="height:70px"></canvas>
      <div class="btns">
        <button class="btn primary" id="rec">${ICONS.mic}Record</button>
        <button class="btn" id="afile">${ICONS.upload}Use audio file</button>
      </div>
      <p class="hint">Up to ${MAX_S} seconds. Whistles, voices, melodies and bird song make the best pictures.</p>
    </section>

    <section class="panel" id="paper-panel" hidden>
      <h2 class="panel-title">Your sound paper</h2>
      <div style="overflow-x:auto;background:#fff;border-radius:4px"><canvas id="paper" style="display:block;max-width:none;height:auto"></canvas></div>
      <div class="btns">
        <button class="btn primary" id="p-play">${ICONS.play}Play from paper</button>
        <button class="btn" id="p-orig">${ICONS.play}Original</button>
        <button class="btn" id="p-save">${ICONS.download}Save image</button>
        <button class="btn" id="p-print">${ICONS.print}Print</button>
      </div>
      <p class="hint">Time runs left → right, pitch bottom → top, darker ink = louder. The thick bars above and below let the scanner find the paper.</p>
    </section>

    <section class="panel" id="scan" hidden>
      <h2 class="panel-title">Live scanner<span class="spacer"></span><span class="lamp" id="lock"></span></h2>
      <div class="media" style="aspect-ratio:3/4;max-height:60vh;margin:0 auto"><video id="vid" playsinline muted style="height:100%;object-fit:cover"></video><div class="scanline-v"></div></div>
      <canvas class="scope" id="colview" style="height:64px;margin-top:10px"></canvas>
      <p class="hint" id="scan-stat">Point the camera at a printed (or on-screen) sound paper so both black bars are visible, then sweep slowly from left to right along the red line.</p>
      <div class="btns"><button class="btn primary" id="cam">${ICONS.camera}Start scanner</button></div>
    </section>

    <section class="panel" id="scan2" hidden>
      <h2 class="panel-title">Play a photo of a sound paper</h2>
      <div class="btns" style="margin-top:0">
        <button class="btn" id="ipick">${ICONS.upload}Open image</button>
        <button class="btn" id="isnap">${ICONS.camera}Take photo</button>
      </div>
      <div id="img-wrap" style="position:relative;margin-top:12px" hidden>
        <img id="img" alt="Sound paper" style="width:100%;display:block;border-radius:4px">
        <div id="cursor" style="position:absolute;top:0;bottom:0;width:2px;background:var(--accent);left:0;box-shadow:0 0 8px var(--accent)"></div>
      </div>
      <p class="hint" id="img-stat"></p>
    </section>`;

  const tab = bindSeg(root, 'tab', v => {
    $('#make', root).hidden = v !== 'make';
    $('#paper-panel', root).hidden = v !== 'make' || !paper;
    $('#scan', root).hidden = $('#scan2', root).hidden = v !== 'scan';
    if (v !== 'scan') stopCam();
  });

  // ================= SOUND → PAPER =================
  let mic = null, chunks = [], fsRec = 48000, recN = 0, levels = [], paper = null, original = null, player = null, raf = 0;
  const recBtn = $('#rec', root), lvl = $('#lvl', root), recT = $('#rec-t', root);
  drawTrace(lvl, []);
  async function startRec() {
    try {
      chunks = []; recN = 0; levels = [];
      mic = await startMic(c => {
        chunks.push(c.slice()); recN += c.length;
        let pk = 0; for (const v of c) pk = Math.max(pk, Math.abs(v));
        levels.push(Math.min(1, pk * 1.4)); if (levels.length > 200) levels.shift();
        drawTrace(lvl, levels);
        recT.textContent = (recN / fsRec).toFixed(1) + 's';
        if (recN / fsRec >= MAX_S) stopRec();
      });
      fsRec = mic.sampleRate;
      recBtn.innerHTML = `${ICONS.stop}Stop`; recBtn.classList.add('on');
    } catch (e) { toast('Microphone permission needed'); }
  }
  function stopRec() {
    if (!mic) return;
    mic.stop(); mic = null;
    recBtn.innerHTML = `${ICONS.mic}Record`; recBtn.classList.remove('on');
    const s = new Float32Array(recN); let o = 0; for (const c of chunks) { s.set(c, o); o += c.length; }
    if (s.length < fsRec * 0.3) return toast('Too short — record at least half a second');
    makePaper(s, fsRec);
  }
  recBtn.onclick = () => mic ? stopRec() : startRec();
  $('#afile', root).onclick = async () => {
    const f = await pickFile('audio/*,.wav,.mp3,.ogg,.m4a');
    if (!f) return;
    try {
      const { samples, sampleRate } = await decodeAudioFile(f);
      if (samples.length > sampleRate * MAX_S) toast(`Using the first ${MAX_S} seconds`);
      makePaper(samples.subarray(0, sampleRate * MAX_S), sampleRate);
    } catch (e) { toast('Could not read that audio file'); }
  };

  function makePaper(samples, fs) {
    original = { samples, fs };
    const im = soundToImage(samples, fs);
    const cv = $('#paper', root);
    cv.width = im.width; cv.height = im.height;
    const ctx = cv.getContext('2d');
    ctx.putImageData(new ImageData(im.data, im.width, im.height), 0, 0);
    // light grey so the scanner never mistakes the caption for a marker bar
    ctx.fillStyle = '#a0a0a0'; ctx.font = '9px "Courier Prime", monospace'; ctx.textBaseline = 'bottom';
    ctx.fillText(`CRYPTEX SOUND PAPER · ${im.seconds.toFixed(1)} s · ${theme() === 'radio' ? 'MOD-07' : 'EXHIBIT A'}`, im.content.x, im.height - 4);
    cv.style.width = Math.max(im.width, 320) + 'px';
    paper = im;
    $('#paper-panel', root).hidden = false;
    $('#paper-panel', root).scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  const stopPlay = () => { player?.stop(); player = null; cancelAnimationFrame(raf); };
  $('#p-orig', root).onclick = () => { stopPlay(); if (original) player = playSamples(original.samples, original.fs); };
  $('#p-play', root).onclick = () => {
    stopPlay();
    const cv = $('#paper', root);
    const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height);
    try {
      const fs = audioCtx().sampleRate;
      const r = imageToSound(toLuminance(d.data, cv.width, cv.height), cv.width, cv.height, fs);
      player = playSamples(r.samples, fs);
    } catch (e) { toast(e.message); }
  };
  $('#p-save', root).onclick = () => $('#paper', root).toBlob(b => shareOrDownload(b, `sound-paper-${Date.now()}.png`));
  $('#p-print', root).onclick = () => {
    const url = $('#paper', root).toDataURL('image/png');
    const sheet = document.createElement('div');
    sheet.className = 'print-sheet';
    sheet.innerHTML = `<img src="${url}" alt="">`;
    document.body.appendChild(sheet);
    const done = () => { sheet.remove(); window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    setTimeout(() => window.print(), 100);
  };

  // ================= PAPER → SOUND (live camera) =================
  const vid = $('#vid', root), colview = $('#colview', root), stat = $('#scan-stat', root), lock = $('#lock', root), camBtn = $('#cam', root);
  const grab = document.createElement('canvas');
  const gctx = grab.getContext('2d', { willReadFrequently: true });
  let cam = null, bank = null, camRaf = 0;
  drawTrace(colview, []);
  async function startCam() {
    try {
      cam = await openCamera(vid, { width: 1280, height: 720 });
      bank = await oscillatorBank(Array.from({ length: LIVE_BANDS }, (_, k) => bandFreq(k, LIVE_BANDS)));
    } catch (e) { stopCam(); stat.textContent = e.message || 'Camera unavailable'; return toast('Camera permission needed'); }
    camBtn.innerHTML = `${ICONS.stop}Stop scanner`; camBtn.classList.add('on');
    const zeros = new Float32Array(LIVE_BANDS);
    const frame = () => {
      if (!cam) return;
      if (vid.readyState >= 2 && vid.videoWidth) {
        // sample the centre column of what the user sees (object-fit: cover keeps the centre aligned)
        const H = 360, W = 5;
        grab.width = W; grab.height = H;
        const sx = vid.videoWidth / 2 - 2;
        gctx.drawImage(vid, sx, 0, W, vid.videoHeight, 0, 0, W, H);
        const d = gctx.getImageData(0, 0, W, H).data;
        const col = new Float32Array(H);
        for (let y = 0; y < H; y++) { let s = 0; for (let x = 0; x < W; x++) { const i = (y * W + x) * 4; s += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]; } col[y] = s / W / 255; }
        const sorted = Array.from(col).sort((a, b) => a - b);
        const white = sorted[Math.floor(H * 0.92)], black = sorted[Math.floor(H * 0.03)];
        const thr = black + (white - black) * 0.45;
        const bars = white - black > 0.2 ? runs(col, v => v < thr, Math.round(H * 0.025)) : [];
        let ok = false;
        if (bars.length >= 2) {
          const top = bars[0].end, bottom = bars[bars.length - 1].start;
          if (bottom - top > H * 0.2) {
            ok = true;
            bank.setAmps(columnToAmps(col.subarray(top, bottom), white, black, LIVE_BANDS));
          }
        }
        if (!ok) bank.setAmps(zeros);
        lock.classList.toggle('on', ok);
        stat.textContent = ok ? 'Locked on — sweep slowly to play.' : 'Looking for the two black bars…';
        drawTrace(colview, Array.from(col, v => 1 - v));
      }
      camRaf = requestAnimationFrame(frame);
    };
    frame();
  }
  function stopCam() {
    cam?.stop(); cam = null; bank?.close(); bank = null; cancelAnimationFrame(camRaf);
    camBtn.innerHTML = `${ICONS.camera}Start scanner`; camBtn.classList.remove('on'); lock.classList.remove('on');
  }
  camBtn.onclick = () => cam ? stopCam() : startCam();

  // ================= PAPER → SOUND (photo) =================
  const playImage = async (capture) => {
    const f = await pickFile('image/*', capture);
    if (!f) return;
    const st = $('#img-stat', root);
    try {
      const img = await loadImageFile(f);
      const scale = Math.min(1, 1600 / img.width);
      const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      const ctx = cv.getContext('2d'); ctx.drawImage(img, 0, 0, w, h);
      const fs = audioCtx().sampleRate;
      const r = imageToSound(toLuminance(ctx.getImageData(0, 0, w, h).data, w, h), w, h, fs);
      $('#img', root).src = cv.toDataURL('image/jpeg', 0.85);
      $('#img-wrap', root).hidden = false;
      st.textContent = `Found the paper: ${r.seconds.toFixed(1)} s of sound.`;
      stopPlay();
      player = playSamples(r.samples, fs);
      const cur = $('#cursor', root);
      const loop = () => {
        if (!player) return;
        const p = (player.ctx.currentTime - player.startTime) / r.seconds;
        cur.style.left = ((r.frame.x0 + Math.max(0, Math.min(1, p)) * (r.frame.x1 - r.frame.x0)) / w * 100) + '%';
        if (p < 1.05) raf = requestAnimationFrame(loop);
      };
      loop();
    } catch (e) { st.textContent = e.message; }
  };
  $('#ipick', root).onclick = () => playImage();
  $('#isnap', root).onclick = () => playImage('environment');

  const redraw = () => drawTrace(lvl, levels);
  window.addEventListener('themechange', redraw);
  return () => { stopRec(); stopPlay(); stopCam(); window.removeEventListener('themechange', redraw); };
}
