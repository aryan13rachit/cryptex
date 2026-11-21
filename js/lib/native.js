// Native (Capacitor) bridges with graceful web fallbacks.
const Cap = () => window.Capacitor;
export const isNative = () => !!Cap()?.isNativePlatform?.();
const P = name => Cap()?.Plugins?.[name];

let hapticsOn = localStorage.getItem('cryptex-haptics') !== 'off';
export const hapticsEnabled = () => hapticsOn;
export function setHaptics(on) { hapticsOn = on; localStorage.setItem('cryptex-haptics', on ? 'on' : 'off'); }

/** Short haptic tick: 'light' | 'medium' | 'heavy'. */
export function haptic(kind = 'light') {
  if (!hapticsOn) return;
  const H = P('Haptics');
  if (isNative() && H) { H.impact({ style: kind.toUpperCase() }).catch(() => {}); return; }
  // Web: vibration is only allowed after a user gesture; ignore failures quietly
  try { navigator.userActivation?.hasBeenActive && navigator.vibrate?.(kind === 'heavy' ? 30 : kind === 'medium' ? 15 : 6); } catch {}
}

/** Native torch via @capawesome/capacitor-torch. Returns null when unavailable. */
export async function nativeTorch() {
  const T = P('Torch');
  if (!isNative() || !T) return null;
  try {
    const { available } = await T.isAvailable();
    if (!available) return null;
    return { supported: true, set: on => (on ? T.enable() : T.disable()).catch(() => {}), stop: () => T.disable().catch(() => {}) };
  } catch { return null; }
}

function blobToBase64(blob) {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(blob); });
}

/** Save a file natively: write to cache, then open the Android share sheet (Save to Files, Drive, WhatsApp…). */
export async function nativeSaveShare(blob, filename) {
  const FS = P('Filesystem'), SH = P('Share');
  if (!isNative() || !FS || !SH) return false;
  const data = await blobToBase64(blob);
  const { uri } = await FS.writeFile({ path: filename, data, directory: 'CACHE' });
  try { await SH.share({ title: filename, files: [uri], dialogTitle: 'Save or send ' + filename }); } catch { /* user closed sheet */ }
  return true;
}

export function setStatusBar(color, dark) {
  const SB = P('StatusBar');
  if (!isNative() || !SB) return;
  SB.setBackgroundColor({ color }).catch(() => {});
  SB.setStyle({ style: dark ? 'DARK' : 'LIGHT' }).catch(() => {});
}

/** Android hardware back: go back inside the app, exit from home. */
export function installBackButton() {
  const App = P('App');
  if (!isNative() || !App) return;
  App.addListener('backButton', () => {
    const sheet = document.querySelector('.sheet:not([hidden])');
    if (sheet) { sheet.dispatchEvent(new Event('close')); return; }
    if (location.hash && location.hash !== '#/' && location.hash !== '#') history.back();
    else App.exitApp();
  });
}

export function keepAwake(on) {
  // Web Wake Lock works inside the Android WebView too
  if (on) return navigator.wakeLock?.request('screen').catch(() => null);
  return null;
}
