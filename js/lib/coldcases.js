// Unsolved (and famously solved) codes. Status as of November 2026.
// Ciphertexts are included only where short and verifiable; Kryptos K4 is checked against its
// published clue positions in test/run-tests.js.

export const K4 = 'OBKRUOXOGHULBSOLIFBBWFLRVQQPRNGKSSOTWTQSJQSSEKZZWATJKLUDIAWINFBNYPVTTMZFPKWGDKZXTJCDIGKUHUAUEKCAR';
/** Sanborn's published plaintext clues for K4: [1-based start, plaintext, year released] */
export const K4_CLUES = [[22, 'EASTNORTHEAST', 2020], [64, 'BERLINCLOCK', 2010]];

export const CASES = [
  {
    id: 'k4', title: 'Kryptos, Part 4', where: 'CIA headquarters, Langley, Virginia', when: '1990',
    status: 'sealed', statusText: 'Answer found, never published',
    summary: 'Jim Sanborn’s copper sculpture in the CIA courtyard carries four encrypted passages. K1–K3 were broken in the 1990s (by CIA analyst David Stein in 1998 and computer scientist Jim Gillogly in 1999). The 97-letter K4 resisted everyone for 35 years.',
    details: [
      'Sanborn released plaintext clues: BERLIN (2010), CLOCK (2014) and EASTNORTHEAST (2020), at fixed positions in K4.',
      'In 2025 journalists Jarett Kobek and Richard Byrne found K4’s plaintext in Sanborn’s papers at the Smithsonian’s Archives of American Art. They did not publish it. The archive is sealed until 2075.',
      'In November 2025 Sanborn’s Kryptos archive, including the solution and his coding charts, sold at auction for $962,500 to an anonymous buyer. The answer remains private.',
      'Sanborn has confirmed there is a fifth passage, K5, still unsolved.',
    ],
    cipher: K4, clues: true,
  },
  {
    id: 'zodiac', title: 'Zodiac Z13 & Z32', where: 'San Francisco Bay Area', when: '1970',
    status: 'open', statusText: 'Unsolved',
    summary: 'The Zodiac Killer mailed four ciphers to newspapers and police. Z408 was solved in 1969 by Donald and Bettye Harden; Z340 was solved in December 2020 by David Oranchak, Sam Blake and Jarl Van Eycke, confirmed by the FBI.',
    details: [
      'Z13 (April 1970) follows the words “My name is ___” — 13 symbols, far too short to break by statistics alone. Many names have been proposed, none proven.',
      'Z32 (June 1970) came with a map of Mount Diablo and claimed to show where a bomb was set. Also too short to solve uniquely.',
      'Recent “solutions” circulate as preprints; none has been independently verified.',
    ],
  },
  {
    id: 'voynich', title: 'The Voynich Manuscript', where: 'Beinecke Library, Yale (MS 408)', when: 'early 1400s',
    status: 'open', statusText: 'Unread',
    summary: 'About 240 vellum pages of an unknown script with drawings of unidentified plants, star charts and bathing figures. Radiocarbon dating of the vellum (2009) gives 1404–1438.',
    details: [
      'Named after book dealer Wilfrid Voynich, who bought it in 1912.',
      'The text follows word-like statistics (Zipf’s law, repeated words) yet matches no known language or cipher.',
      'Proposed decipherments appear every year — none has been accepted by specialists.',
    ],
  },
  {
    id: 'beale', title: 'The Beale Ciphers', where: 'Bedford County, Virginia', when: 'pamphlet 1885',
    status: 'partial', statusText: '1 of 3 solved',
    summary: 'Three numeric ciphertexts said to locate a buried treasure of gold and silver. Each number points to a word in a key text; the first letter of that word is the plaintext.',
    details: [
      'Cipher 2 is solved using the Declaration of Independence as the key text: it describes the treasure and the vault.',
      'Ciphers 1 (the location) and 3 (the owners) have never been solved — and many suspect the whole story is a hoax.',
    ],
  },
  {
    id: 'tamam', title: 'The Tamam Shud Code', where: 'Somerton Beach, Adelaide', when: '1948',
    status: 'open', statusText: 'Code unsolved',
    summary: 'An unidentified man was found dead on Somerton Beach on 1 December 1948. A scrap reading “Tamam Shud” (“it is ended”) led to a copy of the Rubaiyat of Omar Khayyam with five lines of capital letters pencilled inside the back cover.',
    details: [
      'In 2022 Professor Derek Abbott and genealogist Colleen Fitzpatrick identified the man through DNA as Carl “Charles” Webb, a Melbourne engineer; police have not officially confirmed it.',
      'The letters still have no accepted reading. Statistics suggest they are the first letters of words, like a memory aid.',
      'The second line was struck through in the original.',
    ],
    cipher: 'WRGOABABD\nMLIAOI\nWTBIMPANETP\nMLIABOAIAQC\nITTMTSAMSTGAB',
  },
  {
    id: 'dorabella', title: 'The Dorabella Cipher', where: 'Wolverhampton, England', when: 'July 1897',
    status: 'open', statusText: 'Unsolved',
    summary: 'Composer Edward Elgar sent a note to his young friend Dora Penny: 87 little semicircle symbols in three lines, each turned one of eight ways.',
    details: [
      'Dora never read it, and Elgar never explained it.',
      'The symbol set fits a simple substitution, yet no reading is convincing. It may be playful, phonetic or not English at all.',
    ],
  },
  {
    id: 'shugborough', title: 'The Shugborough Inscription', where: 'Shugborough Hall, Staffordshire', when: '18th century',
    status: 'open', statusText: 'Unsolved',
    summary: 'Beneath a marble relief of Poussin’s “Arcadian Shepherds” on the Shepherd’s Monument are eight letters, O U O S V A V V, with a D and an M set lower on either side.',
    details: [
      'Suggested readings include Latin initials, a love note and a Templar secret. None is provable from eight letters.',
      'Charles Darwin and Josiah Wedgwood are said to have puzzled over it.',
    ],
    cipher: 'D\nO U O S V A V V\nM',
  },
  {
    id: 'dagapeyeff', title: 'The D’Agapeyeff Cipher', where: '“Codes and Ciphers” (book)', when: '1939',
    status: 'open', statusText: 'Unsolved',
    summary: 'Cryptographer Alexander D’Agapeyeff ended his book with a challenge cipher written entirely as two-digit numbers.',
    details: ['It was left out of later editions — D’Agapeyeff reportedly admitted he had forgotten how he enciphered it.', 'It may contain an error, which would explain why the obvious attacks fail.'],
  },
  {
    id: 'mccormick', title: 'Ricky McCormick’s Notes', where: 'St. Louis, Missouri', when: '1999',
    status: 'open', statusText: 'Unsolved',
    summary: 'Two pages of letters, numbers and brackets were found in the pockets of a man found dead in a field. In 2011 the FBI’s Cryptanalysis and Racketeering Records Unit asked the public for help.',
    details: ['McCormick could reportedly barely read or write; relatives said he had written such notes since childhood.'],
  },
  {
    id: 'scripts', title: 'Lost scripts', where: 'Crete · Easter Island · Indus Valley', when: 'Bronze Age onward',
    status: 'open', statusText: 'Undeciphered',
    summary: 'Not ciphers but whole writing systems nobody can read: Linear A of Minoan Crete, the stamped Phaistos Disc, Rongorongo of Rapa Nui, and the Indus script.',
    details: [
      'Linear B was cracked in 1952 by Michael Ventris (it is early Greek); Linear A uses many of the same signs, but its language is unknown.',
      'The Phaistos Disc (found 1908) is printed with stamps, a spiral of 241 signs from 45 types — one of a kind, so too little text to decode.',
      'The Indus script’s inscriptions are very short; whether it encodes a language at all is debated.',
    ],
  },
];

export const CRACKED = [
  ['Zodiac Z340', '2020', 'Broken by Oranchak, Blake and Van Eycke after 51 years. A homophonic substitution read in diagonal chunks.'],
  ['Copiale cipher', '2011', 'A 105-page 1730s manuscript of a German secret society (the Oculists), cracked by Kevin Knight, Beáta Megyesi and Christiane Schaefer with computer analysis.'],
  ['Chaocipher', '2010', 'Byrne’s 1918 “unbreakable” device. Its method was finally donated and published — try it in the Cipher Cabinet.'],
  ['Kryptos K1–K3', '1998–99', 'Solved independently by the CIA’s David Stein and by Jim Gillogly. K3 paraphrases Howard Carter opening Tutankhamun’s tomb.'],
  ['Zodiac Z408', '1969', 'Solved within a week by schoolteacher Donald Harden and his wife Bettye.'],
  ['Beale Cipher 2', '1800s', 'Each number counts words in the Declaration of Independence.'],
];
