// Key sounds for the Enigma keyboard, synthesised with WebAudio (no audio files).
//   Detective's Desk → manual typewriter strike.   Radio Room → mechanical keyboard switch.
import { audioCtx } from './audio.js';

let enabled = localStorage.getItem('cryptex-sound') !== 'off';
export const soundOn = () => enabled;
export function setSound(on) { enabled = on; localStorage.setItem('cryptex-sound', on ? 'on' : 'off'); }

let noiseBuf = null, master = null;
function bus(c) {
  if (!master || master.context !== c) {
    master = c.createGain(); master.gain.value = 0.55;
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -12; comp.ratio.value = 4;
    master.connect(comp).connect(c.destination);
  }
  return master;
}
function noise(c) {
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const s = c.createBufferSource(); s.buffer = noiseBuf; return s;
}
const rnd = (a, b) => a + Math.random() * (b - a);

/** Filtered noise transient. */
function burst(c, t, { dur, type = 'bandpass', freq, q = 1, vol, attack = 0.0006 }) {
  const n = noise(c), f = c.createBiquadFilter(), g = c.createGain();
  f.type = type; f.frequency.value = freq; f.Q.value = q;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
  n.connect(f).connect(g).connect(bus(c));
  n.start(t, Math.random() * 0.8); n.stop(t + dur + 0.02);
}
/** Decaying sine (body resonance / metal ring). */
function ring(c, t, { f0, f1 = f0, dur, vol, type = 'sine' }) {
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
  o.connect(g).connect(bus(c)); o.start(t); o.stop(t + dur + 0.02);
}

const SOUNDS = {
  detective: {
    keydown(c, t) {
      // key lever snap
      burst(c, t, { dur: 0.012, type: 'highpass', freq: 3500, vol: 0.5 });
      // typebar slams the platen ~14 ms later: woody thud + paper slap
      const s = t + rnd(0.012, 0.018);
      burst(c, s, { dur: 0.05, type: 'bandpass', freq: rnd(1500, 2100), q: 1.2, vol: 0.9 });
      burst(c, s, { dur: 0.07, type: 'lowpass', freq: 700, vol: 0.6 });
      ring(c, s, { f0: rnd(150, 180), f1: 90, dur: 0.07, vol: 0.35 });
      // faint metallic ring of the type slug
      ring(c, s, { f0: rnd(2900, 3400), dur: 0.09, vol: 0.035 });
    },
    keyup(c, t) { burst(c, t, { dur: 0.018, type: 'bandpass', freq: 2400, q: 2, vol: 0.12 }); },
    // a typebar strike while a document is being typed (lighter than a full keypress)
    type(c, t) {
      const s = t + rnd(0.004, 0.01);
      burst(c, s, { dur: 0.04, type: 'bandpass', freq: rnd(1500, 2300), q: 1.3, vol: rnd(0.38, 0.55) });
      burst(c, s, { dur: 0.05, type: 'lowpass', freq: 650, vol: 0.25 });
      ring(c, s, { f0: rnd(150, 185), f1: 95, dur: 0.05, vol: 0.14 });
    },
    // rubber stamp: wooden handle thump, rubber slap on paper, desk resonance
    stamp(c, t) {
      ring(c, t, { f0: 118, f1: 52, dur: 0.22, vol: 0.85 });
      burst(c, t, { dur: 0.09, type: 'lowpass', freq: 900, vol: 1.0, attack: 0.002 });
      burst(c, t + 0.004, { dur: 0.05, type: 'bandpass', freq: 2200, q: 0.9, vol: 0.45 });
      burst(c, t + 0.06, { dur: 0.04, type: 'bandpass', freq: 1400, q: 1.5, vol: 0.12 });
    },
    // margin bell
    bell(c, t) { ring(c, t, { f0: 2637, dur: 1.1, vol: 0.09 }); ring(c, t, { f0: 5274, dur: 0.5, vol: 0.025 }); },
    // carriage return: ratchet clicks while the carriage slides back, then a thunk
    carriage(c, t) {
      for (let i = 0; i < 7; i++) burst(c, t + i * 0.028, { dur: 0.01, type: 'highpass', freq: 3000, vol: 0.18 });
      burst(c, t, { dur: 0.22, type: 'bandpass', freq: 900, q: 0.7, vol: 0.12, attack: 0.04 });
      burst(c, t + 0.22, { dur: 0.06, type: 'lowpass', freq: 500, vol: 0.5 });
      ring(c, t + 0.22, { f0: 120, f1: 70, dur: 0.08, vol: 0.2 });
    },
  },
  radio: {
    keydown(c, t) {
      // click-jacket snap (clicky switch)
      burst(c, t, { dur: 0.006, type: 'highpass', freq: 4200, vol: 0.55 });
      // bottom-out clack + low thock of the case
      const s = t + rnd(0.006, 0.01);
      burst(c, s, { dur: 0.025, type: 'bandpass', freq: rnd(1100, 1400), q: 1.6, vol: 0.55 });
      ring(c, s, { f0: rnd(260, 320), f1: 180, dur: 0.035, vol: 0.18 });
    },
    keyup(c, t) {
      burst(c, t, { dur: 0.005, type: 'highpass', freq: 3800, vol: 0.28 });
      burst(c, t + 0.004, { dur: 0.015, type: 'bandpass', freq: 1600, q: 2, vol: 0.14 });
    },
  },
};

/** Play a sound for the current theme: 'keydown' | 'keyup' (+ detective: 'type' | 'bell' | 'carriage'). */
export function sfx(name) {
  if (!enabled) return;
  try {
    const c = audioCtx();
    const th = document.documentElement.dataset.theme === 'radio' ? 'radio' : 'detective';
    SOUNDS[th][name]?.(c, c.currentTime + 0.002);
  } catch { /* audio unavailable */ }
}
