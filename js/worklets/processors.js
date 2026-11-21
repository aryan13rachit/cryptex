// AudioWorklet processors: microphone capture + additive oscillator bank.

class Capture extends AudioWorkletProcessor {
  constructor() { super(); this.buf = new Float32Array(2048); this.n = 0; }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (ch) {
      for (let i = 0; i < ch.length; i++) {
        this.buf[this.n++] = ch[i];
        if (this.n === this.buf.length) { this.port.postMessage(this.buf); this.buf = new Float32Array(2048); this.n = 0; }
      }
    }
    return true;
  }
}
registerProcessor('capture', Capture);

class Additive extends AudioWorkletProcessor {
  constructor(opts) {
    super();
    const f = opts.processorOptions.freqs;
    this.n = f.length;
    this.w = Float32Array.from(f, x => 2 * Math.PI * x / sampleRate);
    this.ph = Float32Array.from(f, () => Math.random() * 6.283);
    this.target = new Float32Array(this.n);
    this.amp = new Float32Array(this.n);
    this.gain = 1;
    this.port.onmessage = e => { this.target = e.data; };
  }
  process(_, outputs) {
    const out = outputs[0][0];
    const k = 1 - Math.exp(-1 / (0.012 * sampleRate)); // ~12 ms amplitude smoothing
    let sumT = 0; for (let j = 0; j < this.n; j++) sumT += this.target[j];
    const g = 0.35 / Math.max(1, Math.sqrt(sumT * 4));
    for (let i = 0; i < out.length; i++) {
      let s = 0;
      for (let j = 0; j < this.n; j++) {
        const a = this.amp[j] += (this.target[j] - this.amp[j]) * k;
        if (a > 1e-4) { this.ph[j] += this.w[j]; if (this.ph[j] > 6.283185) this.ph[j] -= 6.283185; s += a * Math.sin(this.ph[j]); }
        else this.ph[j] += this.w[j];
      }
      this.gain += (g - this.gain) * 0.001;
      out[i] = Math.tanh(s * this.gain * 2);
    }
    return true;
  }
}
registerProcessor('additive', Additive);
