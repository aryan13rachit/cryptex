// Morse code tables and text conversion.
const morseTable = {
  'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.', 'G': '--.', 'H': '....', 'I': '..', 'J': '.---',
  'K': '-.-', 'L': '.-..', 'M': '--', 'N': '-.', 'O': '---', 'P': '.--.', 'Q': '--.-', 'R': '.-.', 'S': '...', 'T': '-',
  'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-', 'Y': '-.--', 'Z': '--..',
  '0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-', '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.',
  '.': '.-.-.-', ',': '--..--', '?': '..--..', "'": '.----.', '!': '-.-.--', '/': '-..-.', '(': '-.--.', ')': '-.--.-',
  '&': '.-...', ':': '---...', ';': '-.-.-.', '=': '-...-', '+': '.-.-.', '-': '-....-', '_': '..--.-', '"': '.-..-.',
  r'$': '...-..-', '@': '.--.-.',
};
final Map<String, String> _reverse = {for (final e in morseTable.entries) e.value: e.key, '...---...': 'SOS'};

String textToMorse(String text) => text.toUpperCase().trim().split(RegExp(r'\s+')).where((w) => w.isNotEmpty)
    .map((w) => w.split('').where(morseTable.containsKey).map((c) => morseTable[c]).join(' '))
    .where((w) => w.isNotEmpty).join(' / ');

String morseToText(String code) => code.trim()
    .replaceAll(RegExp('[•·∙]'), '.').replaceAll(RegExp('[–—−_]'), '-')
    .split(RegExp(r'\s*[/|]\s*|\s{3,}'))
    .map((w) => w.trim().split(RegExp(r'\s+')).where((s) => s.isNotEmpty).map((s) => _reverse[s] ?? '?').join())
    .join(' ');

/// [(on, units)] timeline for a Morse string.
List<(bool, int)> morseTimeline(String code) {
  final tl = <(bool, int)>[];
  final words = code.trim().split(RegExp(r'\s*/\s*')).where((w) => w.isNotEmpty).toList();
  for (var wi = 0; wi < words.length; wi++) {
    if (wi > 0) tl.add((false, 7));
    final letters = words[wi].split(RegExp(r'\s+')).where((l) => l.isNotEmpty).toList();
    for (var li = 0; li < letters.length; li++) {
      if (li > 0) tl.add((false, 3));
      for (var si = 0; si < letters[li].length; si++) {
        if (si > 0) tl.add((false, 1));
        tl.add((true, letters[li][si] == '-' ? 3 : 1));
      }
    }
  }
  return tl;
}
