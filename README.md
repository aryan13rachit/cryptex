# Cryptex — vintage cipher & signals kit

An installable phone app (PWA) with two interfaces:
**The Detective's Desk** (manila case files, typewriter, rubber stamps) and
**The Radio Room** (phosphor CRTs, bakelite buttons, valve glow). Switch with the round button top-right.

## Tools
| # | Tool | What it does |
|---|------|--------------|
| 01 | Caesar Shift | Draggable cipher wheel, ROT1/3/13, brute-force crack |
| 02 | Vigenère Square | Keyword + autokey, key alignment view, automatic key recovery (IoC + χ²) |
| 03 | Enigma | Enigma I / M3 / M4, rotors I–VIII, rings, plugboard, double-stepping, lampboard. Includes the real 1945 U-boat message |
| 04 | Morse Telegraph | Two-way translator, sounder, WAV export, touch telegraph key, microphone decoder (auto-tune, auto-speed) |
| 05 | Signal Lamp | Light-beam Morse: transmit with flashlight or screen; receive with the camera |
| 06 | Slow-Scan Pictures | SSTV encoder + decoder: Martin M1/M2, Scottie S1/S2/DX, Robot 36/72, PD 90/120/180. VIS auto-detect, slant & dropout correction, mic or audio file |
| 07 | Sound Paper | PhonoPaper-style: record a sound → printable spectrogram with marker bars → scan live with the camera (or a photo) to hear it again |
| 08 | Cipher Cabinet | Atbash, Affine, Rail Fence, Playfair, keyword substitution, Polybius, tap code, Bacon, A1Z26, ROT47 |
| 09 | Telegraph Office | Base64, hex, binary, octal, decimal, URL encoding |
| 10 | Sealed Envelope | Real AES-256-GCM encryption (PBKDF2), SHA hashes, password generator |
| 11 | Codebreaker | Letter-frequency chart vs English, index of coincidence, cipher-type verdict, auto-solve |

## Running it
No build step. Serve the folder over HTTP:

```
python -m http.server 8080
```
then open http://localhost:8080 on the PC.

### On your phone
Camera, microphone, flashlight and encryption need **HTTPS** (browsers block them on plain `http://192.168…`).
Easiest options:
1. **Host it free** (GitHub Pages / Netlify / Cloudflare Pages) — just upload this folder. Open the https URL on the phone → browser menu → **Install app / Add to Home screen**. It then works fully offline.
2. **Quick test over USB (Android):** `adb reverse tcp:8080 tcp:8080`, then open `http://localhost:8080` in Chrome on the phone (localhost counts as secure).

Flashlight control works in Chrome on Android; on iPhone the Signal Lamp uses the screen instead.

## Tests
```
node test/run-tests.js
```
51 checks: cipher vectors, Enigma (incl. the M4 U-534 message), Morse timing decoder, SSTV round-trips in every mode family with clock drift / noise / audio dropouts, sound-paper round trip.

`?theme=detective` or `?theme=radio` in the URL forces a theme.
