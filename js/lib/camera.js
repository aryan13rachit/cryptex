// Camera + flashlight (torch) helpers.
import { nativeTorch } from './native.js';

export async function openCamera(videoEl, { facingMode = 'environment', width = 640, height = 480 } = {}) {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera needs a secure (https) connection and a modern browser.');
  const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: facingMode }, width: { ideal: width }, height: { ideal: height }, frameRate: { ideal: 30 } } });
  const track = stream.getVideoTracks()[0];
  if (videoEl) {
    videoEl.srcObject = stream;
    videoEl.setAttribute('playsinline', '');
    videoEl.muted = true;
    await videoEl.play().catch(() => {});
  }
  // Fix exposure where possible so the light meter isn't fighting auto-exposure
  return {
    stream, track,
    stop() { stream.getTracks().forEach(t => t.stop()); if (videoEl) videoEl.srcObject = null; },
  };
}

/** Open the rear camera purely to control its torch. Returns { supported, set(on), stop() }. */
export async function openTorch() {
  const nt = await nativeTorch();
  if (nt) return nt;
  if (!navigator.mediaDevices?.getUserMedia) return { supported: false, set() {}, stop() {} };
  const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } });
  const track = stream.getVideoTracks()[0];
  const caps = track.getCapabilities?.() || {};
  const supported = !!caps.torch;
  // Some Android devices need the track to be "consumed" by a video element before torch works
  const v = document.createElement('video');
  v.muted = true; v.setAttribute('playsinline', ''); v.srcObject = stream; v.play().catch(() => {});
  return {
    supported,
    set(on) { if (supported) return track.applyConstraints({ advanced: [{ torch: !!on }] }).catch(() => {}); },
    stop() { if (supported) track.applyConstraints({ advanced: [{ torch: false }] }).catch(() => {}); stream.getTracks().forEach(t => t.stop()); v.srcObject = null; },
  };
}
