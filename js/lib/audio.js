// Browser audio plumbing: shared AudioContext, mic capture, playback, file decoding, Morse sounder.
import { decodeWav } from './dsp.js';

let ctx = null;
export function audioCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

const loaded = new WeakSet();
async function ensureWorklets(c) {
  if (loaded.has(c)) return;
  await c.audioWorklet.addModule(new URL('../worklets/processors.js', import.meta.url));
  loaded.add(c);
}

/**
 * Start capturing microphone audio. onChunk(Float32Array) is called ~every 43 ms.
 * Returns { stop(), sampleRate }.
 */
export async function startMic(onChunk) {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('Microphone needs a secure (https) connection and a modern browser.');
  const c = audioCtx();
  await ensureWorklets(c);
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
  const src = c.createMediaStreamSource(stream);
  const node = new AudioWorkletNode(c, 'capture', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1] });
  node.port.onmessage = e => onChunk(e.data);
  const mute = c.createGain(); mute.gain.value = 0;
  src.connect(node).connect(mute).connect(c.destination);
  return {
    sampleRate: c.sampleRate,
    stop() { try { src.disconnect(); node.disconnect(); mute.disconnect(); } catch {} stream.getTracks().forEach(t => t.stop()); },
  };
}

/** Decode an audio file (any browser-supported format) to mono samples. */
export async function decodeAudioFile(file) {
  const buf = await file.arrayBuffer();
  if (/\.wav$/i.test(file.name)) { try { return decodeWav(buf.slice(0)); } catch {} }
  const ab = await audioCtx().decodeAudioData(buf);
  const out = new Float32Array(ab.length);
  for (let ch = 0; ch < ab.numberOfChannels; ch++) {
    const d = ab.getChannelData(ch);
    for (let i = 0; i < d.length; i++) out[i] += d[i] / ab.numberOfChannels;
  }
  return { samples: out, sampleRate: ab.sampleRate };
}

/** Play mono samples. Returns { stop(), startTime, duration, ended: Promise }. */
export function playSamples(samples, sampleRate) {
  const c = audioCtx();
  const ab = c.createBuffer(1, samples.length, sampleRate);
  ab.copyToChannel(samples, 0);
  const src = c.createBufferSource();
  src.buffer = ab;
  src.connect(c.destination);
  const startTime = c.currentTime + 0.05;
  src.start(startTime);
  const ended = new Promise(r => { src.onended = r; });
  return { stop() { try { src.stop(); } catch {} }, startTime, duration: ab.duration, ended, ctx: c };
}

/** Schedule a Morse timeline ([{on, units}]) as a sine tone. Returns { stop(), duration, startTime }. */
export function playMorseTone(timeline, unitMs, freq = 600, volume = 0.5) {
  const c = audioCtx();
  const osc = c.createOscillator(), g = c.createGain();
  osc.frequency.value = freq; g.gain.value = 0;
  osc.connect(g).connect(c.destination);
  const t0 = c.currentTime + 0.08, ramp = 0.004;
  let t = t0;
  for (const s of timeline) {
    const d = s.units * unitMs / 1000;
    if (s.on) { g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(volume, t + ramp); g.gain.setValueAtTime(volume, t + d - ramp); g.gain.linearRampToValueAtTime(0, t + d); }
    t += d;
  }
  osc.start(t0); osc.stop(t + 0.05);
  return { stop() { try { g.gain.cancelScheduledValues(0); g.gain.value = 0; osc.stop(); } catch {} }, duration: t - t0, startTime: t0, ctx: c };
}

/** Continuous tone you can key on/off (telegraph key sidetone). */
export function sidetone(freq = 600, volume = 0.45) {
  const c = audioCtx();
  const osc = c.createOscillator(), g = c.createGain();
  osc.frequency.value = freq; g.gain.value = 0;
  osc.connect(g).connect(c.destination); osc.start();
  return {
    on() { g.gain.setTargetAtTime(volume, c.currentTime, 0.003); },
    off() { g.gain.setTargetAtTime(0, c.currentTime, 0.003); },
    close() { try { osc.stop(); osc.disconnect(); g.disconnect(); } catch {} },
  };
}

/** Real-time oscillator bank (live sound-paper scanning). setAmps(Float32Array). */
export async function oscillatorBank(freqs) {
  const c = audioCtx();
  await ensureWorklets(c);
  const node = new AudioWorkletNode(c, 'additive', { numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [1], processorOptions: { freqs: Float32Array.from(freqs) } });
  node.connect(c.destination);
  return { setAmps(a) { node.port.postMessage(a); }, close() { try { node.disconnect(); } catch {} } };
}
