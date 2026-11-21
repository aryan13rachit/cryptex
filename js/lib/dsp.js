// Small DSP helpers: FFT, windows, WAV encode/decode, resampling. Pure JS.

/** In-place iterative radix-2 complex FFT. re/im are Float32Array/Float64Array of length 2^k. */
export function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len;
    const wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k, b = a + len / 2;
        const tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr; im[b] = im[a] - ti;
        re[a] += tr; im[a] += ti;
        const ncr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = ncr;
      }
    }
  }
}

export function hann(n) {
  const w = new Float32Array(n);
  for (let i = 0; i < n; i++) w[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (n - 1));
  return w;
}

/** Magnitude spectrum of a real frame (length power of 2) with window. Returns Float32Array(n/2). */
export function magnitudeSpectrum(frame, window) {
  const n = frame.length;
  const re = new Float64Array(n), im = new Float64Array(n);
  for (let i = 0; i < n; i++) re[i] = frame[i] * (window ? window[i] : 1);
  fft(re, im);
  const mag = new Float32Array(n / 2);
  for (let i = 0; i < n / 2; i++) mag[i] = Math.hypot(re[i], im[i]);
  return mag;
}

/** Windowed-sinc low-pass FIR taps (Hamming). */
export function lowpassTaps(cutoffHz, fs, taps) {
  const h = new Float32Array(taps);
  const m = (taps - 1) / 2, fc = cutoffHz / fs;
  let sum = 0;
  for (let i = 0; i < taps; i++) {
    const x = i - m;
    const sinc = x === 0 ? 2 * fc : Math.sin(2 * Math.PI * fc * x) / (Math.PI * x);
    h[i] = sinc * (0.54 - 0.46 * Math.cos(2 * Math.PI * i / (taps - 1)));
    sum += h[i];
  }
  for (let i = 0; i < taps; i++) h[i] /= sum;
  return h;
}

/** Linear-interpolation resample (good enough for analysis / tests). */
export function resample(samples, fromRate, toRate) {
  if (fromRate === toRate) return samples;
  const ratio = fromRate / toRate;
  const out = new Float32Array(Math.floor(samples.length / ratio));
  for (let i = 0; i < out.length; i++) {
    const p = i * ratio, i0 = Math.floor(p), f = p - i0;
    out[i] = (samples[i0] || 0) * (1 - f) + (samples[i0 + 1] || 0) * f;
  }
  return out;
}

/** Encode mono float samples as 16-bit PCM WAV. Returns ArrayBuffer. */
export function encodeWav(samples, sampleRate) {
  const buf = new ArrayBuffer(44 + samples.length * 2);
  const v = new DataView(buf);
  const str = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); v.setUint32(4, 36 + samples.length * 2, true); str(8, 'WAVE');
  str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  str(36, 'data'); v.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buf;
}

/** Minimal PCM WAV decoder (8/16/24/32-bit int, 32-bit float), mixed to mono. */
export function decodeWav(arrayBuffer) {
  const v = new DataView(arrayBuffer);
  const tag = o => String.fromCharCode(v.getUint8(o), v.getUint8(o + 1), v.getUint8(o + 2), v.getUint8(o + 3));
  if (tag(0) !== 'RIFF' || tag(8) !== 'WAVE') throw new Error('Not a WAV file');
  let off = 12, fmt = null;
  while (off + 8 <= v.byteLength) {
    const id = tag(off), size = v.getUint32(off + 4, true);
    if (id === 'fmt ') fmt = { format: v.getUint16(off + 8, true), ch: v.getUint16(off + 10, true), rate: v.getUint32(off + 12, true), bits: v.getUint16(off + 22, true) };
    if (id === 'data' && fmt) {
      const bps = fmt.bits / 8, frames = Math.floor(Math.min(size, v.byteLength - off - 8) / (bps * fmt.ch));
      const out = new Float32Array(frames);
      for (let i = 0; i < frames; i++) {
        let s = 0;
        for (let c = 0; c < fmt.ch; c++) {
          const p = off + 8 + (i * fmt.ch + c) * bps;
          if (fmt.format === 3) s += v.getFloat32(p, true);
          else if (bps === 1) s += (v.getUint8(p) - 128) / 128;
          else if (bps === 2) s += v.getInt16(p, true) / 32768;
          else if (bps === 3) s += ((v.getUint8(p) | (v.getUint8(p + 1) << 8) | (v.getInt8(p + 2) << 16))) / 8388608;
          else s += v.getInt32(p, true) / 2147483648;
        }
        out[i] = s / fmt.ch;
      }
      return { samples: out, sampleRate: fmt.rate };
    }
    off += 8 + size + (size & 1);
  }
  throw new Error('WAV has no audio data');
}
