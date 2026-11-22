// Offline cache for Cryptex. Bump VERSION when files change.
const VERSION = 'cryptex-v30';
const FILES = [
  './', 'index.html', 'manifest.webmanifest', 'css/about.css', 'css/app-shell.css', 'css/app.css', 'css/enhance.css', 'css/materials.css',
  'css/polish.css', 'css/realism.css', 'css/reference.css', 'css/theme-detective.css', 'css/theme-radio.css', 'css/tools-extra.css', 'js/app.js',
  'js/ui.js', 'js/lib/anagram.js', 'js/lib/audio.js', 'js/lib/camera.js', 'js/lib/classical.js', 'js/lib/coldcases.js', 'js/lib/dsp.js',
  'js/lib/enigma.js', 'js/lib/morse.js', 'js/lib/native.js', 'js/lib/sfx.js', 'js/lib/soundpaper.js', 'js/lib/spycraft.js', 'js/lib/sstv.js',
  'js/tools/about.js', 'js/tools/anagram.js', 'js/tools/caesar.js', 'js/tools/ciphers.js', 'js/tools/codebreaker.js', 'js/tools/coldcases.js',
  'js/tools/encoders.js', 'js/tools/enigma.js', 'js/tools/jefferson.js', 'js/tools/lightbeam.js', 'js/tools/morse.js', 'js/tools/numbers.js',
  'js/tools/soundpaper.js', 'js/tools/sstv.js', 'js/tools/vault.js', 'js/tools/vigenere.js', 'js/worklets/processors.js', 'assets/dev-anon.jpg',
  'assets/dev-soft.jpg', 'assets/icon-192.png', 'assets/icon-512.png', 'assets/icon.svg', 'assets/dict/words.txt.gz',
  'assets/fonts/CourierPrime-Bold.ttf', 'assets/fonts/CourierPrime-Regular.ttf', 'assets/fonts/ShareTechMono-Regular.ttf',
  'assets/fonts/SpecialElite-Regular.ttf', 'assets/fonts/VT323-Regular.ttf', 'assets/hw/reel.svg', 'assets/hw/screw-brass.svg',
  'assets/hw/screw-steel.svg', 'assets/tex/brushed-dark.jpg', 'assets/tex/brushed-light.jpg', 'assets/tex/cork.jpg', 'assets/tex/crinkle.jpg',
  'assets/tex/manila.jpg', 'assets/tex/noise-1.png', 'assets/tex/noise-2.png', 'assets/tex/noise-3.png', 'assets/tex/noise-4.png',
  'assets/tex/paper.jpg', 'assets/tex/plastic.jpg', 'assets/tex/walnut.jpg',
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
