import 'package:flutter_test/flutter_test.dart';
import 'package:cryptex/core/classical.dart';
import 'package:cryptex/core/enigma.dart';
import 'package:cryptex/core/morse.dart';

void main() {
  group('classical', () {
    test('caesar', () { expect(caesar('Hello, World!', 3), 'Khoor, Zruog!'); expect(caesar('Khoor, Zruog!', -3), 'Hello, World!'); });
    test('rot47', () => expect(rot47(rot47('Secret 123!')), 'Secret 123!'));
    test('vigenere', () {
      expect(vigenere('ATTACK AT DAWN', 'LEMON'), 'LXFOPV EF RNHR');
      expect(vigenere('LXFOPV EF RNHR', 'LEMON', decrypt: true), 'ATTACK AT DAWN');
      expect(vigenere(vigenere('Meet me at noon', 'KING', autokey: true), 'KING', decrypt: true, autokey: true), 'Meet me at noon');
    });
    test('atbash/affine/substitution', () {
      expect(atbash('Wizard'), 'Draziw');
      expect(affine('AFFINE CIPHER', 5, 8), 'IHHWVC SWFRCP');
      expect(affine(affine('Affine cipher', 5, 8), 5, 8, decrypt: true), 'Affine cipher');
      expect(substitution(substitution('Hello there', 'ZEBRAS'), 'ZEBRAS', decrypt: true), 'Hello there');
    });
    test('rail fence', () {
      expect(railFenceEncrypt('WEAREDISCOVEREDFLEEATONCE', 3), 'WECRLTEERDSOEEFEAOCAIVDEN');
      expect(railFenceDecrypt('WECRLTEERDSOEEFEAOCAIVDEN', 3), 'WEAREDISCOVEREDFLEEATONCE');
    });
    test('playfair', () {
      expect(playfair('Hide the gold in the tree stump', 'playfair example'), 'BM OD ZB XD NA BE KU DM UI XM MO UV IF');
      expect(playfair('BMODZBXDNABEKUDMUIXMMOUVIF', 'playfair example', decrypt: true), 'HI DE TH EG OL DI NT HE TR EX ES TU MP');
    });
    test('codes', () {
      expect(polybiusDecode(polybiusEncode('HELLO')), 'HELLO');
      expect(tapDecode(tapEncode('WATER')), 'WATER');
      expect(baconDecode(baconEncode('BACON')), 'BACON');
      expect(a1z26Decode(a1z26Encode('hello world')), 'HELLO WORLD');
    });
    test('encoders', () {
      expect(fromBase64(toBase64('Héllo ✓')), 'Héllo ✓');
      expect(fromHex(toHex('Hi!')), 'Hi!');
      expect(fromBinary('0100100001101001'), 'Hi');
      expect(fromOctal(toOctal('ok')), 'ok');
      expect(fromDecimal(toDecimal('ok')), 'ok');
    });
    test('crack', () {
      const plain = 'The detective examined the letter carefully and noticed that every word had been shifted by the same secret amount, which meant the culprit had used a very old trick.';
      expect(caesarCrack(caesar(plain, 11)).first.shift, 11);
      final rev = plain.split('').reversed.join();
      expect(vigenereCrack(vigenere('$plain $rev', 'CLUE')).first.key, 'CLUE');
    });
  });

  group('enigma', () {
    test('AAAAA', () => expect(Enigma(EnigmaConfig()).encode('AAAAA'), 'BDZGO'));
    test('double step', () {
      final e = Enigma(EnigmaConfig(positions: [0, 3, 20]));
      e.press('A'); e.press('A'); e.press('A');
      expect(e.positions.map((p) => String.fromCharCode(65 + p)).join(), 'BFX');
    });
    test('M4 U-534 message', () {
      final e = Enigma(EnigmaConfig(model: 'M4', greek: 'Beta', rotors: ['II', 'IV', 'I'], reflector: 'B-thin', rings: [0, 0, 0, 21], positions: [21, 9, 13, 0], plugboard: 'AT BL DF GJ HM NW OP QY RZ VX'));
      expect(e.encode('NCZWVUSXPNYMINHZXMQXSFWXWLKJAHSHNMCOCCAKUQPMKCSMHKSEINJUSBLKIOSXCKUBHMLLXCSJUSRRDVKOHULXWCCBGVLIYXEOAHXRHKKFVDREWEZLXOBAFGYUJQUKGRTVUKAMEURBVEKSUHHVOYHABCJWMAKLFKLMYFVNRIZRVVRTKOFDANJMOLBGFFLEOPRGTFLVRHOWOPBEKVWMUQFMPWPARMFHAGKXIIBG').substring(0, 32), 'VONVONJLOOKSJHFFTTTEINSEINSDREIZ');
    });
  });

  group('morse', () {
    test('roundtrip', () {
      expect(textToMorse('SOS help'), '... --- ... / .... . .-.. .--.');
      expect(morseToText('... --- ... / .... . .-.. .--.'), 'SOS HELP');
    });
  });
}
