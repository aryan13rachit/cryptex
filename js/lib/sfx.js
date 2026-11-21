// Synthesised UI sound effects (no audio files). Two palettes: detective (typewriter, stamps, paper)
// and radio (relays, switches, CRT). All sounds are generated with WebAudio at play time.
import { audioCtx } from './audio.js';

let enabled = localStorage.getItem('cryptex-sound') !== 'off';
export const soundOn = () => enabled;
export function setSound(on) { enabled = on; localStorage.setItem('cryptex-sound', on ? 'on' : 'off'); }

let noiseBuf = null;
function noise(c) {
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const s = c.createBufferSource(); s.buffer = noiseBuf; return s;
}
function out(c, vol) { const g = c.createGain(); g.gain.value = vol; g.connect(c.destination); return g; }

/** Filtered noise burst. */
function burst(c, t, { dur = 0.03, type = 'bandpass', freq = 3000, q = 1, vol = 0.4, attack = 0.001, offset = 0 }) {
  const n = noise(c), f = c.createBiquadFilter(), g = c.createGain();
  f.type = type; f.frequency.value = freq; f.Q.value = q;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  n.connect(f).connect(g).connect(c.destination);
  n.start(t, offset || Math.random() * 0.5); n.stop(t + dur + 0.02);
}
/** Pitched blip with exponential pitch glide. */
function tone(c, t, { f0 = 800, f1 = f0, dur = 0.08, type = 'sine', vol = 0.2, attack = 0.002 }) {
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
}

const SOUNDS = {
  detective: {
    // typewriter key: sharp mechanical tick + small body thump
    click(c, t) { burst(c, t, { dur: 0.035, freq: 3200 + Math.random() * 900, q: 2.5, vol: 0.5 }); tone(c, t, { f0: 180, f1: 90, dur: 0.05, vol: 0.18 }); },
    // rubber stamp: thud then a papery slap
    primary(c, t) { tone(c, t, { f0: 140, f1: 55, dur: 0.16, vol: 0.55 }); burst(c, t + 0.005, { dur: 0.09, type: 'lowpass', freq: 1400, vol: 0.45 }); },
    // index-tab flick
    tab(c, t) { burst(c, t, { dur: 0.07, type: 'highpass', freq: 2500, vol: 0.22, attack: 0.012 }); burst(c, t + 0.03, { dur: 0.03, freq: 4200, q: 3, vol: 0.18 }); },
    // pulling a folder from the drawer: paper swoosh
    open(c, t) { burst(c, t, { dur: 0.22, type: 'bandpass', freq: 1800, q: 0.6, vol: 0.28, attack: 0.07 }); burst(c, t + 0.18, { dur: 0.05, type: 'lowpass', freq: 900, vol: 0.3 }); },
    back(c, t) { burst(c, t, { dur: 0.16, type: 'bandpass', freq: 1400, q: 0.7, vol: 0.22, attack: 0.05 }); },
    // the folder hits the desk
    slam(c, t) {
      tone(c, t, { f0: 95, f1: 38, dur: 0.45, vol: 0.9, attack: 0.003 });
      burst(c, t, { dur: 0.35, type: 'lowpass', freq: 600, vol: 0.9, attack: 0.002 });
      burst(c, t + 0.01, { dur: 0.12, type: 'bandpass', freq: 2500, q: 0.8, vol: 0.35 });
    },
    stamp(c, t) { SOUNDS.detective.primary(c, t); },
    type(c, t) { burst(c, t, { dur: 0.025, freq: 2800 + Math.random() * 1500, q: 3, vol: 0.28 }); },
    ding(c, t) { tone(c, t, { f0: 2093, dur: 0.9, vol: 0.12, attack: 0.001 }); tone(c, t, { f0: 4186, dur: 0.5, vol: 0.04 }); },
    boot(c, t) { tone(c, t, { f0: 60, f1: 60, dur: 0.12, type: 'square', vol: 0.05 }); burst(c, t, { dur: 0.05, freq: 1200, vol: 0.3 }); },
  },
  radio: {
    // relay click
    click(c, t) { burst(c, t, { dur: 0.012, type: 'highpass', freq: 3000, vol: 0.55 }); burst(c, t + 0.018, { dur: 0.01, type: 'highpass', freq: 4500, vol: 0.25 }); },
    // heavy toggle switch + confirmation beep
    primary(c, t) { burst(c, t, { dur: 0.03, type: 'bandpass', freq: 1800, q: 1.5, vol: 0.6 }); tone(c, t + 0.035, { f0: 1320, dur: 0.07, type: 'square', vol: 0.06 }); },
    tab(c, t) { tone(c, t, { f0: 880, f1: 1760, dur: 0.05, type: 'triangle', vol: 0.14 }); },
    open(c, t) { tone(c, t, { f0: 600, f1: 1200, dur: 0.06, type: 'square', vol: 0.05 }); tone(c, t + 0.07, { f0: 1200, f1: 1800, dur: 0.06, type: 'square', vol: 0.05 }); },
    back(c, t) { tone(c, t, { f0: 1400, f1: 500, dur: 0.09, type: 'square', vol: 0.05 }); },
    // CRT power-on: thunk, rising flyback whine, static
    boot(c, t) {
      burst(c, t, { dur: 0.05, type: 'lowpass', freq: 500, vol: 0.7 });
      tone(c, t + 0.05, { f0: 5000, f1: 15000, dur: 0.9, vol: 0.025, attack: 0.3 });
      burst(c, t + 0.08, { dur: 0.5, type: 'highpass', freq: 5000, vol: 0.12, attack: 0.05 });
      tone(c, t + 0.05, { f0: 50, f1: 50, dur: 1.2, type: 'sawtooth', vol: 0.03, attack: 0.2 });
    },
    type(c, t) { burst(c, t, { dur: 0.008, type: 'highpass', freq: 2500, vol: 0.2 }); },
    beep(c, t) { tone(c, t, { f0: 1000, dur: 0.12, type: 'square', vol: 0.05 }); },
    slam(c, t) { SOUNDS.radio.boot(c, t); },
    stamp(c, t) { SOUNDS.radio.primary(c, t); },
    ding(c, t) { tone(c, t, { f0: 1600, dur: 0.15, type: 'square', vol: 0.05 }); tone(c, t + 0.16, { f0: 2000, dur: 0.2, type: 'square', vol: 0.05 }); },
  },
};

let lastType = 0;
/** Play a named effect for the current theme. */
export function sfx(name) {
  if (!enabled) return;
  try {
    const c = audioCtx();
    const th = document.documentElement.dataset.theme === 'radio' ? 'radio' : 'detective';
    const fn = SOUNDS[th][name] || SOUNDS[th].click;
    if (name === 'type') { const now = performance.now(); if (now - lastType < 35) return; lastType = now; }
    fn(c, c.currentTime + 0.005);
  } catch { /* audio unavailable */ }
}

/** Wire every clickable control in the app to a sound + haptic tick. */
export function installClickSounds(haptic) {
  document.addEventListener('pointerdown', e => {
    const el = e.target.closest('button, .card, a.brand, select, input[type=checkbox], [data-sfx]');
    if (!el || el.disabled || el.closest('[data-nosfx]')) return;
    let name = el.dataset.sfx;
    if (!name) {
      if (el.classList.contains('card')) name = 'open';
      else if (el.id === 'back') name = 'back';
      else if (el.closest('.seg')) name = 'tab';
      else if (el.classList.contains('primary')) name = 'primary';
      else name = 'click';
    }
    sfx(name);
    haptic?.(name === 'primary' || name === 'open' ? 'medium' : 'light');
  }, { passive: true, capture: true });
}
