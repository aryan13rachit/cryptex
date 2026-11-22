// Run with:  node test/run-tests.js
import * as C from '../js/lib/classical.js';
import { Enigma } from '../js/lib/enigma.js';
import { textToMorse, morseToText, morseTimeline, MorseTimingDecoder, unitMs } from '../js/lib/morse.js';
import { MODES, encodeSSTV, SSTVDecoder } from '../js/lib/sstv.js';
import { resample } from '../js/lib/dsp.js';
import { soundToImage, imageToSound, toLuminance } from '../js/lib/soundpaper.js';
import * as S from '../js/lib/spycraft.js';
import { Lexicon } from '../js/lib/anagram.js';
import { K4, K4_CLUES } from '../js/lib/coldcases.js';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';

let pass = 0, fail = 0;
const eq = (name, got, want) => {
  if (got === want) { pass++; } else { fail++; console.log(`FAIL ${name}\n  got:  ${JSON.stringify(got)}\n  want: ${JSON.stringify(want)}`); }
};
const ok = (name, cond, info = '') => { if (cond) pass++; else { fail++; console.log(`FAIL ${name} ${info}`); } };

// ---- classical ----
eq('caesar', C.caesar('Hello, World!', 3), 'Khoor, Zruog!');
eq('caesar back', C.caesar('Khoor, Zruog!', -3), 'Hello, World!');
eq('rot47', C.rot47(C.rot47('Secret 123!')), 'Secret 123!');
eq('vigenere', C.vigenere('ATTACK AT DAWN', 'LEMON'), 'LXFOPV EF RNHR');
eq('vigenere dec', C.vigenere('LXFOPV EF RNHR', 'LEMON', true), 'ATTACK AT DAWN');
eq('autokey', C.vigenere(C.vigenere('Meet me at noon', 'KING', false, true), 'KING', true, true), 'Meet me at noon');
eq('atbash', C.atbash('Wizard'), 'Draziw');
eq('affine', C.affine(C.affine('Affine cipher', 5, 8), 5, 8, true), 'Affine cipher');
eq('affine known', C.affine('AFFINE CIPHER', 5, 8), 'IHHWVC SWFRCP');
eq('railfence', C.railFenceEncrypt('WEAREDISCOVEREDFLEEATONCE', 3), 'WECRLTEERDSOEEFEAOCAIVDEN');
eq('railfence dec', C.railFenceDecrypt('WECRLTEERDSOEEFEAOCAIVDEN', 3), 'WEAREDISCOVEREDFLEEATONCE');
eq('playfair', C.playfair('Hide the gold in the tree stump', 'playfair example'), 'BM OD ZB XD NA BE KU DM UI XM MO UV IF');
eq('playfair dec', C.playfair('BMODZBXDNABEKUDMUIXMMOUVIF', 'playfair example', true), 'HI DE TH EG OL DI NT HE TR EX ES TU MP');
eq('substitution', C.substitution(C.substitution('Hello there', 'ZEBRAS'), 'ZEBRAS', true), 'Hello there');
eq('polybius', C.polybiusDecode(C.polybiusEncode('HELLO')), 'HELLO');
eq('tap', C.tapDecode(C.tapEncode('WATER')), 'WATER');
eq('bacon', C.baconDecode(C.baconEncode('BACON')), 'BACON');
eq('a1z26', C.a1z26Decode(C.a1z26Encode('hello world')), 'HELLO WORLD');
eq('base64 utf8', C.fromBase64(C.toBase64('Héllo ✓')), 'Héllo ✓');
eq('hex', C.fromHex(C.toHex('Hi!')), 'Hi!');
eq('binary', C.fromBinary(C.toBinary('Hi!')), 'Hi!');
eq('binary compact', C.fromBinary('0100100001101001'), 'Hi');
eq('octal', C.fromOctal(C.toOctal('ok')), 'ok');
const plain = 'The detective examined the letter carefully and noticed that every word had been shifted by the same secret amount, which meant the culprit had used a very old trick.';
eq('caesar crack', C.caesarCrack(C.caesar(plain, 11))[0].shift, 11);
const vc = C.vigenereCrack(C.vigenere(plain + ' ' + plain.split('').reverse().join(''), 'CLUE'));
eq('vigenere crack key', vc.results[0].key, 'CLUE');

// ---- enigma ----
const e1 = new Enigma({ model: 'I', rotors: ['I', 'II', 'III'], reflector: 'B', rings: [0, 0, 0], positions: [0, 0, 0] });
eq('enigma AAAAA', e1.encode('AAAAA'), 'BDZGO');
// Double-step: positions ADU -> ADV -> AEW -> BFX
const e2 = new Enigma({ model: 'I', rotors: ['I', 'II', 'III'], reflector: 'B', positions: [0, 3, 20] });
e2.press('A'); e2.press('A'); e2.press('A');
eq('enigma double step', e2.positions().map(p => String.fromCharCode(65 + p)).join(''), 'BFX');
// Reciprocity with plugboard and rings
const cfg = { model: 'I', rotors: ['IV', 'II', 'V'], reflector: 'B', rings: [1, 20, 11], positions: [6, 11, 17], plugboard: 'PO ML IU KJ NH YT GB VF RE DC' };
const ct = new Enigma(cfg).encode('THEQUICKBROWNFOXJUMPSOVERTHELAZYDOG');
eq('enigma reciprocal', new Enigma(cfg).encode(ct), 'THEQUICKBROWNFOXJUMPSOVERTHELAZYDOG');
// Known M4 vector: Beta II IV I, UKW B-thin, rings AAAV, start VJNA -> "NCZW VUSX" decrypts to "VONV ONJL"
const m4 = new Enigma({ model: 'M4', greek: 'Beta', rotors: ['II', 'IV', 'I'], reflector: 'B-thin', rings: [0, 0, 0, 21], positions: [21, 9, 13, 0], plugboard: 'AT BL DF GJ HM NW OP QY RZ VX' });
eq('enigma M4 U534', m4.encode('NCZWVUSXPNYMINHZXMQXSFWXWLKJAHSHNMCOCCAKUQPMKCSMHKSEINJUSBLKIOSXCKUBHMLLXCSJUSRRDVKOHULXWCCBGVLIYXEOAHXRHKKFVDREWEZLXOBAFGYUJQUKGRTVUKAMEURBVEKSUHHVOYHABCJWMAKLFKLMYFVNRIZRVVRTKOFDANJMOLBGFFLEOPRGTFLVRHOWOPBEKVWMUQFMPWPARMFHAGKXIIBG'), 'VONVONJLOOKSJHFFTTTEINSEINSDREIZWOYYQNNSNEUNINHALTXXBEIANGRIFFUNTERWASSERGEDRUECKTYWABOSXLETZTERGEGNERSTANDNULACHTDREINULUHRMARQUANTONJOTANEUNACHTSEYHSDREIYZWOZWONULGRADYACHTSMYSTOSSENACHXEKNSVIERMBFAELLTYNNNNNNOOOVIERYSICHTEINSNULL');

// ---- morse ----
eq('morse enc', textToMorse('SOS help'), '... --- ... / .... . .-.. .--.');
eq('morse dec', morseToText('... --- ... / .... . .-.. .--.'), 'SOS HELP');
{
  // simulate a received signal with jitter
  let text = '';
  const dec = new MorseTimingDecoder({ onText: t => { text = t; } });
  const u = unitMs(12);
  let t = 0;
  dec.update(false, 0);
  for (const seg of morseTimeline(textToMorse('CQ DE TEST 73'))) {
    const end = t + seg.units * u * (1 + (Math.random() - 0.5) * 0.25);
    for (; t < end; t += 5) { dec.update(seg.on, t); dec.tick(t); }
  }
  for (const end = t + 20 * u; t < end; t += 5) { dec.update(false, t); dec.tick(t); }
  eq('morse timing decoder', text.trim(), 'CQ DE TEST 73');
}

// ---- SSTV round trip ----
function testImage(w, h) {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    d[i] = x * 255 / w; d[i + 1] = y * 255 / h; d[i + 2] = ((x >> 5) + (y >> 5)) % 2 ? 230 : 30; d[i + 3] = 255;
  }
  return d;
}
function psnr(a, b, n) {
  let se = 0, c = 0;
  for (let i = 0; i < n * 4; i++) if (i % 4 !== 3) { se += (a[i] - b[i]) ** 2; c++; }
  return 10 * Math.log10(255 * 255 / (se / c));
}
for (const [name, opts] of [['Martin M1', {}], ['Scottie S1', { clock: 1.0015 }], ['Robot 36', { noise: 0.15 }], ['PD 120', { rate: 44100 }], ['Robot 72', {}], ['Martin M2', { dropout: 0.043 }], ['Robot 36', { dropout: 0.12, clock: 1.0008 }],['PD 90', { clock: 0.999 }]]) {
  const m = MODES[name];
  const img = testImage(m.w, m.h);
  const fs = opts.rate || 48000;
  let audio = encodeSSTV(name, img, fs);
  if (opts.clock) audio = resample(audio, fs, fs * opts.clock); // simulate sound-card clock mismatch → slant
  if (opts.dropout) { // lose a chunk of audio mid-picture, as a busy phone might
    const at = Math.floor(audio.length * 0.6), n = Math.floor(fs * opts.dropout);
    audio = Float32Array.from([...audio.subarray(0, at), ...audio.subarray(at + n)]);
  }
  if (opts.noise) { audio = Float32Array.from(audio, v => v + (Math.random() * 2 - 1) * opts.noise); }
  // leading noise so VIS must be found
  const pre = Float32Array.from({ length: fs }, () => (Math.random() * 2 - 1) * 0.05);
  const all = new Float32Array(pre.length + audio.length + fs);
  all.set(pre); all.set(audio, pre.length);
  let got = null, startMode = null;
  const t0 = Date.now();
  const dec = new SSTVDecoder(fs, { onStart: md => { startMode = md.name; }, onDone: (im, md) => { got ??= { im: im.slice(), md }; } });
  for (let i = 0; i < all.length; i += 4096) dec.push(all.subarray(i, i + 4096));
  const ms = Date.now() - t0;
  eq(`sstv ${name} VIS`, startMode, name);
  const q = got ? psnr(img, got.im, m.w * m.h) : 0;
  ok(`sstv ${name} quality`, q > (opts.noise ? 18 : opts.dropout ? 20 : 22), `PSNR=${q.toFixed(1)}dB`);
  console.log(`  sstv ${name.padEnd(10)} ${JSON.stringify(opts).padEnd(18)} PSNR ${q.toFixed(1)} dB  decode ${ms} ms for ${(all.length / fs).toFixed(0)} s audio`);
}

// ---- Sound paper round trip ----
{
  const fs = 22050, dur = 2;
  const s = new Float32Array(fs * dur);
  for (let i = 0; i < s.length; i++) { const t = i / fs; s[i] = 0.5 * Math.sin(2 * Math.PI * (t < 1 ? 440 : 880) * t); }
  const im = soundToImage(s, fs);
  const lum = toLuminance(im.data, im.width, im.height);
  const back = imageToSound(lum, im.width, im.height, fs);
  ok('soundpaper duration', Math.abs(back.seconds - dur) < 0.15, `got ${back.seconds}`);
  // dominant frequency in first half ~440, second ~880 (zero-crossing estimate)
  const zc = (a, b) => { let c = 0; for (let i = a + 1; i < b; i++) if ((back.samples[i - 1] < 0) !== (back.samples[i] < 0)) c++; return c / 2 / ((b - a) / fs); };
  const f1 = zc(Math.floor(back.samples.length * 0.1), Math.floor(back.samples.length * 0.4));
  const f2 = zc(Math.floor(back.samples.length * 0.6), Math.floor(back.samples.length * 0.9));
  ok('soundpaper pitch 1', Math.abs(f1 - 440) < 40, `got ${f1.toFixed(0)}`);
  ok('soundpaper pitch 2', Math.abs(f2 - 880) < 70, `got ${f2.toFixed(0)}`);
}

// ---- chaocipher (test vector from Moshe Rubin, "Chaocipher Revealed: The Algorithm", 2010) ----
eq('chaocipher', S.chaocipher('WELLDONEISBETTERTHANWELLSAID'), 'OAHQHCNYNXTSZJRRHJBYHQKSOUJY');
eq('chaocipher dec', S.chaocipher('OAHQHCNYNXTSZJRRHJBYHQKSOUJY', true), 'WELLDONEISBETTERTHANWELLSAID');
// ---- jefferson wheel ----
ok('jefferson disks are alphabets', S.DISKS.length === 36 && S.DISKS.every(d => [...d].sort().join('') === C.ALPHA));
{
  const order = S.parseOrder('7 2 19 4 33 12');
  const ct = S.jefferson('Meet at the old mill', order, 5);
  eq('jefferson round trip', S.jefferson(ct, order, 5, true), 'MEETATTHEOLDMILL');
  ok('jefferson changes text', ct !== 'MEETATTHEOLDMILL');
  ok('jefferson cylinder row', S.cylinderRows('MEETAT', order)[5] === ct.slice(0, 6));
}
ok('jefferson order rejects repeats', (() => { try { S.parseOrder('1 2 2'); return false; } catch { return true; } })());
// ---- numbers station ----
eq('checkerboard', S.checkerDecode(S.checkerEncode('Meet at dawn 0400')), 'MEET AT DAWN 0400');
{
  const d = S.padToGroups(S.checkerEncode('ABORT MISSION'));
  const pad = S.makePad(d.length);
  ok('groups of five', d.length % 5 === 0);
  eq('one-time pad round trip', S.checkerDecode(S.padCombine(S.padCombine(d, pad), pad, true)), 'ABORT MISSION');
}
// ---- anagrams (full dictionary) ----
{
  const words = gunzipSync(readFileSync(new URL('../assets/dict/words.txt.gz', import.meta.url))).toString().split('\n').filter(Boolean);
  const L = new Lexicon(words);
  ok('dictionary size', words.length > 170000, words.length);
  ok('anagram listen', L.anagrams('listen').includes('silent'));
  ok('anagram blank', L.anagrams('c?t').includes('cat'));
  ok('subwords', L.subwords('cryptex').includes('try'));
  ok('pattern', L.pattern('cr?pt').includes('crypt'));
  const ph = L.phrases('dormitory');
  ok('phrase anagram', ph.includes('dirty room'), JSON.stringify(ph.slice(0, 8)));
}
// ---- Kryptos K4: 97 letters, and the clue positions hold the right ciphertext ----
eq('K4 length', K4.length, 97);
eq('K4 clue EASTNORTHEAST', K4.slice(21, 34), 'FLRVQQPRNGKSS');
eq('K4 clue BERLINCLOCK', K4.slice(63, 74), 'NYPVTTMZFPK');
ok('K4 clue lengths', K4_CLUES.every(([p, t]) => p - 1 + t.length <= 97));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
