// Historically accurate Enigma I / M3 / M4 simulator (with double-stepping).
const rotorSpecs = {
  'I': ('EKMFLGDQVZNTOWYHXUSPAIBRCJ', 'Q'),
  'II': ('AJDKSIRUXBLHWTMCQGZNPYFVOE', 'E'),
  'III': ('BDFHJLCPRTXVZNYEIWGAKMUSQO', 'V'),
  'IV': ('ESOVPZJAYQUIRHXLNFTGKDCMWB', 'J'),
  'V': ('VZBRGITYUPSDNHLXAWMJQOFECK', 'Z'),
  'VI': ('JPGVOUMFYQBENHZRDKASXLICTW', 'ZM'),
  'VII': ('NZJHGRCXMYSWBOUFAIVLPEKQDT', 'ZM'),
  'VIII': ('FKQHTLXOCBJSPDZRAMEWNIUYGV', 'ZM'),
};
const greekSpecs = {'Beta': 'LEYJVCNIXWPBQMDRTAKZGFUHOS', 'Gamma': 'FSOKANUERHMBTIYCWLQPZXVGJD'};
const reflectors = {
  'A': 'EJMZALYXVBWFCRQUONTSPIKHGD',
  'B': 'YRUHQSLDPXNGOKMIEBFZCWVJAT',
  'C': 'FVPJIAOYEDRZXWGCTKUQSBNMHL',
  'B-thin': 'ENKQAUYWJICOPBLMDXZVFTHRGS',
  'C-thin': 'RDOBJNTKVEHMLFCWZAXGYIPSUQ',
};
int _m(int n) => ((n % 26) + 26) % 26;
int _i(String c) => c.codeUnitAt(0) - 65;

class _Rotor {
  final List<int> fwd, bwd;
  final List<int> notches;
  final int ring;
  int pos;
  _Rotor(String wiring, String notch, this.ring, this.pos)
      : fwd = wiring.split('').map(_i).toList(),
        bwd = List.filled(26, 0),
        notches = notch.split('').where((s) => s.isNotEmpty).map(_i).toList() {
    for (var i = 0; i < 26; i++) {
      bwd[fwd[i]] = i;
    }
  }
  bool get atNotch => notches.contains(pos);
  void step() => pos = _m(pos + 1);
  int forward(int c) { final s = pos - ring; return _m(fwd[_m(c + s)] - s); }
  int backward(int c) { final s = pos - ring; return _m(bwd[_m(c + s)] - s); }
}

/// Parse "AB CD ..." into a swap map; ignores invalid/duplicate pairs.
({List<int> map, List<String> pairs}) parsePlugboard(String text) {
  final map = List.generate(26, (i) => i);
  final used = <String>{};
  final valid = <String>[];
  for (final p in text.toUpperCase().replaceAll(RegExp(r'[^A-Z]'), ' ').trim().split(RegExp(r'\s+'))) {
    if (p.length != 2 || p[0] == p[1] || used.contains(p[0]) || used.contains(p[1])) continue;
    used..add(p[0])..add(p[1]);
    map[_i(p[0])] = _i(p[1]);
    map[_i(p[1])] = _i(p[0]);
    valid.add(p);
  }
  return (map: map, pairs: valid);
}

class EnigmaConfig {
  String model; // 'I' | 'M3' | 'M4'
  String greek;
  List<String> rotors; // left → right
  String reflector;
  List<int> rings, positions; // M4: 4 entries [greek, L, M, R]
  String plugboard;
  EnigmaConfig({this.model = 'I', this.greek = 'Beta', List<String>? rotors, this.reflector = 'B', List<int>? rings, List<int>? positions, this.plugboard = ''})
      : rotors = rotors ?? ['I', 'II', 'III'],
        rings = rings ?? [0, 0, 0],
        positions = positions ?? [0, 0, 0];
}

class Enigma {
  late final List<_Rotor> _rotors;
  _Rotor? _greek;
  late final List<int> _refl, _plug;
  Enigma(EnigmaConfig c) {
    final m4 = c.model == 'M4';
    final off = m4 ? 1 : 0;
    int at(List<int> l, int i) => i < l.length ? l[i] : 0;
    _rotors = [
      for (var i = 0; i < 3; i++) _Rotor(rotorSpecs[c.rotors[i]]!.$1, rotorSpecs[c.rotors[i]]!.$2, at(c.rings, i + off), at(c.positions, i + off))
    ];
    if (m4) _greek = _Rotor(greekSpecs[c.greek]!, '', at(c.rings, 0), at(c.positions, 0));
    _refl = reflectors[c.reflector]!.split('').map(_i).toList();
    _plug = parsePlugboard(c.plugboard).map;
  }
  void _step() {
    final l = _rotors[0], m = _rotors[1], r = _rotors[2];
    if (m.atNotch) {
      m.step();
      l.step();
    } else if (r.atNotch) {
      m.step();
    }
    r.step();
  }

  String press(String letter) {
    _step();
    var c = _plug[_i(letter)];
    for (var i = 2; i >= 0; i--) {
      c = _rotors[i].forward(c);
    }
    if (_greek != null) c = _greek!.forward(c);
    c = _refl[c];
    if (_greek != null) c = _greek!.backward(c);
    for (var i = 0; i < 3; i++) {
      c = _rotors[i].backward(c);
    }
    c = _plug[c];
    return String.fromCharCode(65 + c);
  }

  List<int> get positions => [if (_greek != null) _greek!.pos, ..._rotors.map((r) => r.pos)];

  String encode(String text, {bool group = false}) {
    final out = StringBuffer();
    for (final ch in text.toUpperCase().split('')) {
      if (ch.codeUnitAt(0) >= 65 && ch.codeUnitAt(0) <= 90) out.write(press(ch));
    }
    final s = out.toString();
    if (!group) return s;
    return [for (var i = 0; i < s.length; i += 5) s.substring(i, i + 5 > s.length ? s.length : i + 5)].join(' ');
  }
}
