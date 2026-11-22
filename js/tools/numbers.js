// Numbers station: encode with a straddling checkerboard + one-time pad, then broadcast it the way
// shortwave spy stations do (interval chime, call-up, group count, five-figure groups read twice).
import { $, esc, copy, ICONS, theme, toast } from '../ui.js';
import { BOARD, checkerEncode, checkerDecode, makePad, padCombine, groups, padToGroups } from '../lib/spycraft.js';
import { textToMorse, morseTimeline } from '../lib/morse.js';

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];

// ---- voice: Web Speech in browsers, native text-to-speech inside the app ----
const nativeTts = () => window.Capacitor?.Plugins?.Tts;
const hasVoice = () => !!nativeTts() || 'speechSynthesis' in window;
function say(text, signal) {
  if (signal.stopped) return Promise.resolve();
  const tts = nativeTts();
  if (tts) return tts.speak({ text, rate: 0.42, pitch: 1.05 }).catch(() => {});
  return new Promise(res => {
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.82; u.pitch = 1.05; u.lang = 'en-GB';
    u.onend = u.onerror = () => res();
    speechSynthesis.speak(u);
  });
}
const sleep = (ms, signal) => new Promise(r => { const t = setTimeout(r, ms); signal.timers.push(t); });

// ---- audio: interval signal and Morse fallback ----
let ac = null;
const ctx = () => (ac ||= new (window.AudioContext || window.webkitAudioContext)());
/** An original music-box interval signal: two short phrases, three times. */
async function chime(signal) {
  const c = ctx(); await c.resume();
  const notes = [659.3, 784, 880, 784, 659.3, 0, 587.3, 659.3, 523.3];
  for (let rep = 0; rep < 3 && !signal.stopped; rep++) {
    let t = c.currentTime + 0.05;
    for (const f of notes) {
      if (f) for (const [mult, vol] of [[1, 0.22], [2, 0.06], [3, 0.03]]) {
        const o = c.createOscillator(), g = c.createGain();
        o.type = 'sine'; o.frequency.value = f * mult;
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0005, t + 0.7);
        o.connect(g).connect(c.destination); o.start(t); o.stop(t + 0.75);
      }
      t += 0.24;
    }
    await sleep((t - c.currentTime) * 1000 + 500, signal);
  }
}
async function morseDigits(text, signal) {
  const c = ctx(); await c.resume();
  const unit = 0.07; let t = c.currentTime + 0.05;
  const o = c.createOscillator(), g = c.createGain(); o.frequency.value = 700; g.gain.value = 0; o.connect(g).connect(c.destination); o.start();
  for (const s of morseTimeline(textToMorse(text))) { if (s.on) { g.gain.setValueAtTime(0.25, t); g.gain.setValueAtTime(0, t + s.units * unit); } t += s.units * unit; }
  o.stop(t + 0.05);
  await sleep((t - c.currentTime) * 1000, signal);
}

export function mount(root) {
  const radio = theme() === 'radio';
  root.innerHTML = `
    <section class="panel">
      <h2 class="panel-title">${radio ? 'Encode traffic' : 'Prepare a message'}</h2>
      <div class="field"><label for="ns-msg">Message</label><textarea id="ns-msg" spellcheck="false">Agent Nightjar meet contact at the station 2300</textarea></div>
      <div class="field" style="margin-top:12px"><label for="ns-pad">One-time pad (digits — use once, then burn it)</label>
        <textarea id="ns-pad" class="mono" spellcheck="false" style="min-height:70px"></textarea></div>
      <div class="btns"><button class="btn small" id="ns-newpad">${ICONS.reset}New pad</button><button class="btn small" id="ns-copypad">${ICONS.copy}Copy pad</button></div>
      <div class="field" style="margin-top:12px"><label>${radio ? 'Transmission groups' : 'Five-figure groups to broadcast'}</label>
        <div class="ns-dial" id="ns-dial"></div></div>
      <p class="hint warn" id="ns-err" hidden></p>
      <div class="btns">
        <button class="btn primary" id="ns-play">${ICONS.play}Broadcast</button>
        <button class="btn" id="ns-stop" disabled>${ICONS.stop}Stop</button>
        <button class="btn" id="ns-copy">${ICONS.copy}Copy groups</button>
      </div>
      <p class="hint" id="ns-voice"></p>
    </section>
    <section class="panel">
      <h2 class="panel-title">${radio ? 'Decode traffic' : 'Decode a broadcast'}</h2>
      <div class="field"><label for="ns-rx">Groups received</label><textarea id="ns-rx" class="mono" spellcheck="false" placeholder="38174 90215 …"></textarea></div>
      <div class="field" style="margin-top:12px"><label for="ns-rxpad">Your copy of the pad</label><textarea id="ns-rxpad" class="mono" spellcheck="false"></textarea></div>
      <div class="btns"><button class="btn primary" id="ns-dec">${ICONS.key}Decode</button><button class="btn small" id="ns-fill">Use the message above</button></div>
      <div class="out-big" id="ns-plain" style="margin-top:12px;min-height:2.4em"></div>
      <p class="hint warn" id="ns-rxerr" hidden></p>
    </section>
    <section class="panel">
      <h2 class="panel-title">The straddling checkerboard</h2>
      <p class="hint" style="margin-top:0">The eight commonest letters — A T O N E S I R — become one digit; every other letter becomes two (row + column). 68 is a space, 69 means “the next digit is a number”. Then each digit is added to the pad without carrying.</p>
      <div class="ns-board">${boardTable()}</div>
    </section>
    <section class="panel">
      <h2 class="panel-title">${radio ? 'Background' : 'The real stations'}</h2>
      <p class="hint" style="margin-top:0">Since the Cold War, shortwave “numbers stations” have read out strings of digits to agents in the field. Anyone can listen — but with a one-time pad used only once, the traffic is mathematically unbreakable. Some stations are still on the air today.</p>
    </section>`;

  const msg = $('#ns-msg', root), pad = $('#ns-pad', root), dial = $('#ns-dial', root), err = $('#ns-err', root);
  let cipherGroups = [], signal = null;
  const id = String(100 + Math.floor(Math.random() * 900));

  const encode = () => {
    const d = padToGroups(checkerEncode(msg.value));
    const have = pad.value.replace(/\D/g, '');
    if (have.length < d.length) pad.value = groups(have + makePad(d.length - have.length + 10));   // extend, never replace
    try {
      cipherGroups = (groups(padCombine(d, pad.value)).match(/\d{5}/g) || []);
      err.hidden = true;
    } catch (e) { cipherGroups = []; err.textContent = e.message; err.hidden = false; }
    dial.innerHTML = cipherGroups.length
      ? `<span class="ns-hdr">ID ${id} · ${cipherGroups.length} GROUPS</span>${cipherGroups.map((g, i) => `<b data-g="${i}">${g}</b>`).join('')}`
      : '<span class="ns-hdr">NO TRAFFIC</span>';
  };
  pad.value = groups(makePad(60));
  msg.addEventListener('input', encode);
  pad.addEventListener('input', encode);
  $('#ns-newpad', root).onclick = () => { pad.value = groups(makePad(Math.max(60, checkerEncode(msg.value).length + 5))); encode(); };
  $('#ns-copypad', root).onclick = () => copy(pad.value);
  $('#ns-copy', root).onclick = () => copy(cipherGroups.join(' '));
  $('#ns-voice', root).textContent = hasVoice() ? 'The broadcast uses your phone’s text-to-speech voice.' : 'No speech voice found on this device — the groups will be sent in Morse instead.';

  const mark = i => dial.querySelectorAll('b').forEach(b => b.classList.toggle('on', +b.dataset.g === i));
  const speakDigits = (g, s) => hasVoice() ? say(g.split('').map(n => WORDS[n]).join(', '), s) : morseDigits(g, s);
  const stop = () => {
    if (!signal) return;
    signal.stopped = true; signal.timers.forEach(clearTimeout);
    try { nativeTts()?.stop(); } catch {}
    try { window.speechSynthesis?.cancel(); } catch {}
    signal = null; mark(-1);
    $('#ns-play', root).disabled = false; $('#ns-stop', root).disabled = true;
  };
  $('#ns-play', root).onclick = async () => {
    if (!cipherGroups.length) return;
    stop();
    const s = signal = { stopped: false, timers: [] };
    $('#ns-play', root).disabled = true; $('#ns-stop', root).disabled = false;
    try {
      await chime(s);
      const callup = hasVoice() ? (t => say(t, s)) : (t => morseDigits(t.replace(/[^0-9 ]/g, ''), s));
      await callup(`Attention. Attention. ${id.split('').map(n => WORDS[n]).join(' ')}. Group count, ${cipherGroups.length}.`);
      for (let pass = 0; pass < 2 && !s.stopped; pass++) {
        if (pass) await callup('Repeat.');
        for (let i = 0; i < cipherGroups.length && !s.stopped; i++) { mark(i); await speakDigits(cipherGroups[i], s); await sleep(450, s); }
      }
      mark(-1);
      if (!s.stopped) { await callup('End of message.'); await chime(s); }
    } finally { if (signal === s) stop(); }
  };
  $('#ns-stop', root).onclick = stop;

  $('#ns-fill', root).onclick = () => { $('#ns-rx', root).value = cipherGroups.join(' '); $('#ns-rxpad', root).value = pad.value; $('#ns-dec', root).click(); };
  $('#ns-dec', root).onclick = () => {
    const e = $('#ns-rxerr', root);
    try {
      const plain = checkerDecode(padCombine($('#ns-rx', root).value, $('#ns-rxpad', root).value, true));
      $('#ns-plain', root).textContent = plain || '—'; e.hidden = true;
    } catch (x) { e.textContent = x.message; e.hidden = false; }
  };
  encode();
  return stop;
}

function boardTable() {
  const head = `<tr><th></th>${[...'0123456789'].map(d => `<th>${d}</th>`).join('')}</tr>`;
  const row = (label, cells) => `<tr><th>${label}</th>${cells.map(c => `<td>${c === null ? '' : c === ' ' ? '␣' : c === '#' ? 'FIG' : esc(c)}</td>`).join('')}</tr>`;
  return `<table>${head}${row('', BOARD.top)}${row('2', BOARD[2])}${row('6', BOARD[6])}</table>`;
}
