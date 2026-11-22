// Classical ciphers, encoders and cryptanalysis. Pure Dart, ported 1:1 from the JS engine.
import 'dart:convert';
import 'dart:math' as math;

const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
int _mod(int n, int m) => ((n % m) + m) % m;
bool _isUpper(int c) => c >= 65 && c <= 90;
bool _isLower(int c) => c >= 97 && c <= 122;

/// Map every letter through fn(index0to25, letterCounter), preserving case and punctuation.
String _mapLetters(String text, int Function(int i, int n) fn) {
  final out = StringBuffer();
  var k = 0;
  for (final r in text.runes) {
    if (_isUpper(r)) {
      out.write(alpha[fn(r - 65, k++)]);
    } else if (_isLower(r)) {
      out.write(alpha[fn(r - 97, k++)].toLowerCase());
    } else {
      out.writeCharCode(r);
    }
  }
  return out.toString();
}

// ---------- Caesar / ROT ----------
String caesar(String text, int shift) => _mapLetters(text, (i, _) => _mod(i + shift, 26));
String rot47(String text) => String.fromCharCodes(text.runes.map((c) => c >= 33 && c <= 126 ? 33 + _mod(c - 33 + 47, 94) : c));

// ---------- Vigenère ----------
String cleanKey(String? key) => (key ?? '').toUpperCase().replaceAll(RegExp(r'[^A-Z]'), '');
String vigenere(String text, String key, {bool decrypt = false, bool autokey = false}) {
  final k = cleanKey(key);
  if (k.isEmpty) return text;
  if (!autokey) {
    return _mapLetters(text, (i, n) => _mod(i + (decrypt ? -1 : 1) * (k.codeUnitAt(n % k.length) - 65), 26));
  }
  final stream = k.codeUnits.map((c) => c - 65).toList();
  return _mapLetters(text, (i, n) {
    final s = stream[n];
    final r = _mod(i + (decrypt ? -s : s), 26);
    stream.add(decrypt ? r : i);
    return r;
  });
}

// ---------- Atbash / Affine / Keyed substitution ----------
String atbash(String text) => _mapLetters(text, (i, _) => 25 - i);
int? _modInverse(int a, int m) {
  a = _mod(a, m);
  for (var x = 1; x < m; x++) {
    if ((a * x) % m == 1) return x;
  }
  return null;
}

const affineValidA = [1, 3, 5, 7, 9, 11, 15, 17, 19, 21, 23, 25];
String affine(String text, int a, int b, {bool decrypt = false}) {
  final inv = _modInverse(a, 26);
  if (inv == null) throw FormatException('"a" must be coprime with 26 (try ${affineValidA.join(', ')})');
  return _mapLetters(text, (i, _) => decrypt ? _mod(inv * (i - b), 26) : _mod(a * i + b, 26));
}

String keyedAlphabet(String keyword) {
  final seen = <String>{};
  final out = StringBuffer();
  for (final c in (cleanKey(keyword) + alpha).split('')) {
    if (seen.add(c)) out.write(c);
  }
  return out.toString();
}

String substitution(String text, String keyword, {bool decrypt = false}) {
  final kab = keyedAlphabet(keyword);
  return _mapLetters(text, (i, _) => decrypt ? kab.indexOf(alpha[i]) : kab.codeUnitAt(i) - 65);
}

// ---------- Rail fence ----------
List<int> _railPattern(int len, int rails) {
  if (rails < 2) return List.filled(len, 0);
  final pat = <int>[];
  var r = 0, dir = 1;
  for (var i = 0; i < len; i++) {
    pat.add(r);
    if (r == 0) {
      dir = 1;
    } else if (r == rails - 1) {
      dir = -1;
    }
    r += dir;
  }
  return pat;
}

String railFenceEncrypt(String text, int rails) {
  final chars = text.runes.toList();
  final pat = _railPattern(chars.length, rails);
  final out = <int>[];
  for (var r = 0; r < rails; r++) {
    for (var i = 0; i < chars.length; i++) {
      if (pat[i] == r) out.add(chars[i]);
    }
  }
  return String.fromCharCodes(out);
}

String railFenceDecrypt(String text, int rails) {
  final chars = text.runes.toList();
  final pat = _railPattern(chars.length, rails);
  final order = <int>[];
  for (var r = 0; r < rails; r++) {
    for (var i = 0; i < pat.length; i++) {
      if (pat[i] == r) order.add(i);
    }
  }
  final out = List<int>.filled(chars.length, 32);
  for (var k = 0; k < order.length; k++) {
    out[order[k]] = chars[k];
  }
  return String.fromCharCodes(out);
}

// ---------- Playfair (I/J merged) ----------
String playfairSquare(String key) => keyedAlphabet(cleanKey(key).replaceAll('J', 'I')).replaceFirst('J', '');
String playfair(String text, String key, {bool decrypt = false}) {
  final sq = playfairSquare(key);
  List<int> pos(String c) {
    final i = sq.indexOf(c);
    return [i ~/ 5, i % 5];
  }

  var letters = cleanKey(text).replaceAll('J', 'I');
  final pairs = <List<String>>[];
  if (!decrypt) {
    var i = 0;
    while (i < letters.length) {
      final a = letters[i];
      final b = i + 1 < letters.length ? letters[i + 1] : null;
      if (b == null || a == b) {
        pairs.add([a, a == 'X' ? 'Q' : 'X']);
        i++;
      } else {
        pairs.add([a, b]);
        i += 2;
      }
    }
  } else {
    if (letters.length.isOdd) letters += 'X';
    for (var i = 0; i < letters.length; i += 2) {
      pairs.add([letters[i], letters[i + 1]]);
    }
  }
  final d = decrypt ? 4 : 1;
  return pairs.map((p) {
    final pa = pos(p[0]), pb = pos(p[1]);
    if (pa[0] == pb[0]) return sq[pa[0] * 5 + (pa[1] + d) % 5] + sq[pb[0] * 5 + (pb[1] + d) % 5];
    if (pa[1] == pb[1]) return sq[((pa[0] + d) % 5) * 5 + pa[1]] + sq[((pb[0] + d) % 5) * 5 + pb[1]];
    return sq[pa[0] * 5 + pb[1]] + sq[pb[0] * 5 + pa[1]];
  }).join(' ');
}

// ---------- Polybius / Tap code / Bacon / A1Z26 ----------
const _poly = 'ABCDEFGHIKLMNOPQRSTUVWXYZ';
String polybiusEncode(String text) => cleanKey(text).replaceAll('J', 'I').split('').map((c) {
      final i = _poly.indexOf(c);
      return '${i ~/ 5 + 1}${i % 5 + 1}';
    }).join(' ');
String polybiusDecode(String text) {
  final d = text.replaceAll(RegExp(r'[^1-5]'), '');
  final out = StringBuffer();
  for (var i = 0; i + 1 < d.length; i += 2) {
    out.write(_poly[(int.parse(d[i]) - 1) * 5 + int.parse(d[i + 1]) - 1]);
  }
  return out.toString();
}

const _tap = 'ABCDEFGHIJLMNOPQRSTUVWXYZ';
String tapEncode(String text) => cleanKey(text).replaceAll('K', 'C').split('').map((c) {
      final i = _tap.indexOf(c);
      return '${'.' * (i ~/ 5 + 1)} ${'.' * (i % 5 + 1)}';
    }).join('  /  ');
String tapDecode(String text) => text.split('/').map((g) => g.trim()).where((g) => g.isNotEmpty).map((g) {
      final parts = g.split(RegExp(r'\s+')).map((s) => s.length).toList();
      if (parts.length < 2) return '?';
      final a = parts[0], b = parts[1];
      return a >= 1 && b >= 1 && a <= 5 && b <= 5 ? _tap[(a - 1) * 5 + b - 1] : '?';
    }).join();
String baconEncode(String text) => cleanKey(text).split('').map((c) => (c.codeUnitAt(0) - 65).toRadixString(2).padLeft(5, '0').replaceAll('0', 'A').replaceAll('1', 'B')).join(' ');
String baconDecode(String text) {
  final s = text.toUpperCase().replaceAll(RegExp(r'[^AB]'), '');
  final out = StringBuffer();
  for (var i = 0; i + 4 < s.length; i += 5) {
    final v = int.parse(s.substring(i, i + 5).replaceAll('A', '0').replaceAll('B', '1'), radix: 2);
    out.write(v < 26 ? alpha[v] : '?');
  }
  return out.toString();
}

String a1z26Encode(String text) => text.toUpperCase().split(RegExp(r'\s+')).where((w) => w.isNotEmpty)
    .map((w) => w.replaceAll(RegExp(r'[^A-Z]'), '').codeUnits.map((c) => c - 64).join('-'))
    .where((w) => w.isNotEmpty).join(' ');
String a1z26Decode(String text) => text.trim().split(RegExp(r'\s+|/+')).map((w) => w.split(RegExp(r'[^0-9]+')).where((n) => n.isNotEmpty).map((n) {
      final v = int.parse(n);
      return v >= 1 && v <= 26 ? alpha[v - 1] : '?';
    }).join()).join(' ');

// ---------- Byte encoders ----------
String toBase64(String t) => base64.encode(utf8.encode(t));
String fromBase64(String t) {
  var s = t.replaceAll(RegExp(r'\s+'), '').replaceAll('-', '+').replaceAll('_', '/');
  while (s.length % 4 != 0) {
    s += '=';
  }
  return utf8.decode(base64.decode(s));
}

String toHex(String t) => utf8.encode(t).map((b) => b.toRadixString(16).padLeft(2, '0')).join(' ');
String toBinary(String t) => utf8.encode(t).map((b) => b.toRadixString(2).padLeft(8, '0')).join(' ');
String toOctal(String t) => utf8.encode(t).map((b) => b.toRadixString(8).padLeft(3, '0')).join(' ');
String toDecimal(String t) => utf8.encode(t).join(' ');
String _fromRadix(String text, int radix, int width) {
  var tokens = text.trim().split(RegExp(r'[\s,]+')).where((s) => s.isNotEmpty).toList();
  if (tokens.length == 1 && width > 0 && tokens[0].length > width) {
    final t = tokens[0];
    tokens = [for (var i = 0; i < t.length; i += width) t.substring(i, math.min(t.length, i + width))];
  }
  final bytes = tokens.map((t) => int.tryParse(t.replaceFirst(RegExp(r'^0x', caseSensitive: false), ''), radix: radix)).toList();
  if (bytes.any((b) => b == null || b < 0 || b > 255)) throw const FormatException('Invalid input for this format');
  return utf8.decode(bytes.cast<int>());
}

String fromHex(String t) => _fromRadix(t, 16, 2);
String fromBinary(String t) => _fromRadix(t, 2, 8);
String fromOctal(String t) => _fromRadix(t, 8, 3);
String fromDecimal(String t) => _fromRadix(t, 10, 0);

// ---------- Cryptanalysis ----------
const englishFreq = [8.167, 1.492, 2.782, 4.253, 12.702, 2.228, 2.015, 6.094, 6.966, 0.153, 0.772, 4.025, 2.406,
  6.749, 7.507, 1.929, 0.095, 5.987, 6.327, 9.056, 2.758, 0.978, 2.360, 0.150, 1.974, 0.074];

List<int> letterCounts(String text) {
  final c = List.filled(26, 0);
  for (final r in text.toUpperCase().runes) {
    if (_isUpper(r)) c[r - 65]++;
  }
  return c;
}

double chiSquared(List<int> counts) {
  var n = counts.fold(0, (a, b) => a + b);
  if (n == 0) n = 1;
  var chi = 0.0;
  for (var i = 0; i < 26; i++) {
    final e = englishFreq[i] / 100 * n;
    chi += math.pow(counts[i] - e, 2) / e;
  }
  return chi;
}

double indexOfCoincidence(String text) {
  final c = letterCounts(text);
  final n = c.fold(0, (a, b) => a + b);
  if (n < 2) return 0;
  return c.fold(0, (s, f) => s + f * (f - 1)) / (n * (n - 1));
}

class ShiftResult {
  final int shift;
  final String text;
  final double score;
  const ShiftResult(this.shift, this.text, this.score);
}

List<ShiftResult> caesarCrack(String text) {
  final r = List.generate(26, (s) {
    final t = caesar(text, -s);
    return ShiftResult(s, t, chiSquared(letterCounts(t)));
  });
  r.sort((a, b) => a.score.compareTo(b.score));
  return r;
}

class KeyResult {
  final String key;
  final int length;
  final double ioc;
  final String text;
  final double score;
  const KeyResult(this.key, this.length, this.ioc, this.text, this.score);
}

List<KeyResult> vigenereCrack(String text, {int maxLen = 16}) {
  final letters = cleanKey(text);
  if (letters.length < 20) throw const FormatException('Need at least ~20 letters of ciphertext to crack');
  final cands = <(int, double)>[];
  for (var len = 1; len <= math.min(maxLen, letters.length ~/ 3); len++) {
    var ioc = 0.0;
    for (var c = 0; c < len; c++) {
      final col = StringBuffer();
      for (var i = c; i < letters.length; i += len) {
        col.write(letters[i]);
      }
      ioc += indexOfCoincidence(col.toString());
    }
    cands.add((len, ioc / len));
  }
  final best = cands.map((c) => c.$2).reduce(math.max);
  final chosen = cands.firstWhere((c) => c.$2 >= best * 0.9, orElse: () => cands.first);
  final rest = cands.where((c) => c != chosen).toList()..sort((a, b) => b.$2.compareTo(a.$2));
  final results = <KeyResult>[];
  for (final cand in [chosen, ...rest.take(3)]) {
    final key = StringBuffer();
    for (var c = 0; c < cand.$1; c++) {
      final col = StringBuffer();
      for (var i = c; i < letters.length; i += cand.$1) {
        col.write(letters[i]);
      }
      key.write(alpha[caesarCrack(col.toString()).first.shift]);
    }
    final plain = vigenere(text, key.toString(), decrypt: true);
    results.add(KeyResult(key.toString(), cand.$1, cand.$2, plain, chiSquared(letterCounts(plain))));
  }
  return results;
}
