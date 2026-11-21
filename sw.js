// Offline cache for Cryptex. Bump VERSION when files change.
const VERSION = 'cryptex-v12';
const FILES = [
  './', 'index.html', 'manifest.webmanifest',
  'css/app.css', 'css/theme-detective.css', 'css/theme-radio.css', 'css/enhance.css', 'css/polish.css', 'css/about.css', 'css/realism.css', 'css/materials.css', 'css/reference.css', 'assets/tex/walnut.jpg', 'assets/tex/paper.jpg', 'assets/tex/manila.jpg', 'assets/tex/cork.jpg', 'assets/tex/brushed-light.jpg', 'assets/tex/brushed-dark.jpg', 'assets/tex/crinkle.jpg', 'assets/tex/plastic.jpg', 'assets/hw/screw-steel.svg', 'assets/hw/screw-brass.svg', 'assets/hw/reel.svg',
  'js/app.js', 'js/ui.js',
  'js/lib/classical.js', 'js/lib/enigma.js', 'js/lib/morse.js', 'js/lib/dsp.js', 'js/lib/sstv.js', 'js/lib/soundpaper.js', 'js/lib/audio.js', 'js/lib/camera.js', 'js/lib/sfx.js', 'js/lib/native.js',
  'js/worklets/processors.js',
  'js/tools/caesar.js', 'js/tools/vigenere.js', 'js/tools/ciphers.js', 'js/tools/encoders.js', 'js/tools/morse.js', 'js/tools/lightbeam.js',
  'js/tools/enigma.js', 'js/tools/sstv.js', 'js/tools/soundpaper.js', 'js/tools/vault.js', 'js/tools/codebreaker.js', 'js/tools/about.js',
  'assets/icon.svg', 'assets/dev-anon.jpg', 'assets/dev-soft.jpg', 'assets/icon-192.png', 'assets/icon-512.png',
  'assets/fonts/SpecialElite-Regular.ttf', 'assets/fonts/CourierPrime-Regular.ttf', 'assets/fonts/CourierPrime-Bold.ttf',
  'assets/fonts/VT323-Regular.ttf', 'assets/fonts/ShareTechMono-Regular.ttf',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Network-first (so updates arrive when online), falling back to the cache offline.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); }
      return res;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('index.html')))
  );
});
