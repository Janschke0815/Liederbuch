import { describe, it, expect } from './runner.js';
import { ugToChordPro, mergeChordLine, isChordLine, isTabLine } from '../src/formats/ug-import.js';

// Baut eine Akkordzeile, deren Akkorde genau über dem angegebenen Wortanfang stehen.
// place('There is a house', [['Am', 'is'], ['C', 'house']])
function place(lyric, pairs) {
  let line = '';
  for (const [chord, at] of pairs) {
    const col = typeof at === 'number' ? at : lyric.indexOf(at);
    if (col < 0) throw new Error(`"${at}" nicht in "${lyric}"`);
    line = line.padEnd(col, ' ') + chord;
  }
  return line;
}

const lines = (s) => s.trimEnd().split('\n');

describe('UG-Import: Zeilenerkennung', () => {
  it('erkennt Akkordzeilen', () => {
    expect(isChordLine('Am   C   D   F')).toBe(true);
    expect(isChordLine('  G/B  Cmaj7  D7sus4  Em7b5')).toBe(true);
    expect(isChordLine('| Am  | G  | x2')).toBe(true);
    expect(isChordLine('N.C.   (Am)   F#m')).toBe(true);
    expect(isChordLine('Hm   Fis')).toBe(false); // "Fis" ist kein unterstützter Akkordname
    expect(isChordLine('Hm   H7')).toBe(true);
    expect(isChordLine('Am*   C   G*   F')).toBe(true); // Stern = Griff-Variante
  });

  it('verwechselt Textzeilen nicht mit Akkordzeilen', () => {
    expect(isChordLine('A man walks down the street')).toBe(false);
    expect(isChordLine('I Am what I am')).toBe(false);
    expect(isChordLine('Do you believe')).toBe(false);
    expect(isChordLine('')).toBe(false);
  });

  it('erkennt Tab-Zeilen', () => {
    expect(isTabLine('e|-------0-----|')).toBe(true);
    expect(isTabLine('B|---1-----3h5--|')).toBe(true);
    expect(isTabLine('|--0--2--3--2--|')).toBe(true);
    expect(isTabLine('Am   C   D')).toBe(false);
    expect(isTabLine('There is a house - in New Orleans')).toBe(false);
  });
});

describe('UG-Import: Akkorde in Textzeile einfügen', () => {
  const lyric = 'There is a house in New Orleans';

  it('setzt Akkorde nach Spaltenposition', () => {
    const chords = place(lyric, [['Am', 'is'], ['C', 'house'], ['D', 'New'], ['F', 'Orleans']]);
    expect(mergeChordLine(chords, lyric)).toBe('There [Am]is a [C]house in [D]New [F]Orleans');
  });

  it('setzt Akkorde auch mitten ins Wort', () => {
    const chords = place(lyric, [['C', 'ouse']]);
    expect(mergeChordLine(chords, lyric)).toBe('There is a h[C]ouse in New Orleans');
  });

  it('hängt Akkorde hinter dem Zeilenende an', () => {
    const chords = place(lyric, [['Am', 0], ['E', lyric.length + 3], ['E7', lyric.length + 8]]);
    expect(mergeChordLine(chords, lyric)).toBe('[Am]There is a house in New Orleans [E] [E7]');
  });

  it('entfernt Einrückung der Textzeile, Akkorde davor bleiben vorne', () => {
    const chords = place('    Hello world', [['G', 0], ['C', 4], ['D', 10]]);
    expect(mergeChordLine(chords, '    Hello world')).toBe('[G] [C]Hello [D]world');
  });

  it('übernimmt Füllzeichen als Annotation, Taktstriche entfallen', () => {
    const chords = place('Sing it again', [['G', 0], ['|', 'it'], ['(x2)', 'again']]);
    expect(mergeChordLine(chords, 'Sing it again')).toBe('[G]Sing it [*(x2)]again');
  });

  it('löst Akkorde in Klammern auf', () => {
    const chords = place('Hold on', [['(Am)', 'on']]);
    expect(mergeChordLine(chords, 'Hold on')).toBe('Hold [Am]on');
  });
});

describe('UG-Import: ganze Lieder', () => {
  it('House of the Rising Sun – Intro, Strophe, Akkorde am Zeilenende', () => {
    const l1 = 'There is a house in New Orleans';
    const l2 = 'They call the Rising Sun';
    const l3 = "And it's been the ruin of many a poor boy";
    const input = [
      '[Intro]',
      'Am   C   D   F',
      'Am   E   Am  E',
      '',
      '[Verse 1]',
      place(l1, [['Am', 'is'], ['C', 'house'], ['D', 'New'], ['F', 'Orleans']]),
      l1,
      place(l2, [['Am', 'call'], ['C', 'Rising'], ['E', l2.length + 4]]),
      l2,
      place(l3, [['Am', 'been'], ['C', 'ruin'], ['D', 'many'], ['F', 'poor']]),
      l3,
    ].join('\n');

    expect(lines(ugToChordPro(input, { title: 'House of the Rising Sun', artist: 'Traditional' }))).toEqual([
      '{title: House of the Rising Sun}',
      '{artist: Traditional}',
      '',
      '{start_of_part: Intro}',
      '[Am] [C] [D] [F]',
      '[Am] [E] [Am] [E]',
      '{end_of_part}',
      '',
      '{start_of_verse: Verse 1}',
      'There [Am]is a [C]house in [D]New [F]Orleans',
      'They [Am]call the [C]Rising Sun [E]',
      "And it's [Am]been the [C]ruin of [D]many a [F]poor boy",
      '{end_of_verse}',
    ]);
  });

  it('Amazing Grace – Capo/Tonart, mehrere Strophen, Einrückung', () => {
    const a = 'Amazing grace, how sweet the sound';
    const b = 'That saved a wretch like me';
    const c = 'Through many dangers, toils and snares';
    const input = [
      'Capo: 2nd fret',
      'Key: G',
      '',
      '[Verse 1]',
      place('   ' + a, [['D', 0], ['G', 'Amazing'], ['G7', 'grace'], ['C', 'sweet'], ['G', 'sound']]),
      '   ' + a,
      place(b, [['G', 'saved'], ['D', 'like'], ['D7', b.length + 2]]),
      b,
      '',
      '[Verse 2]',
      place(c, [['G', 'many'], ['C', 'toils'], ['G', 'snares']]),
      c,
    ].join('\n');

    const out = lines(ugToChordPro(input));
    expect(out.slice(0, 2)).toEqual(['{capo: 2}', '{key: G}']);
    expect(out).toContain('[D] [G]Amazing [G7]grace, how [C]sweet the [G]sound');
    expect(out).toContain('That [G]saved a wretch [D]like me [D7]');
    expect(out).toContain('Through [G]many dangers, [C]toils and [G]snares');
    // Leerzeile steht zwischen den Abschnitten, nicht innerhalb
    const i = out.indexOf('{end_of_verse}');
    expect(out.slice(i, i + 3)).toEqual(['{end_of_verse}', '', '{start_of_verse: Verse 2}']);
    expect(out.at(-1)).toBe('{end_of_verse}');
  });

  it('The Wild Rover – Abschnittsmarke ohne Klammern, Refrain, Wiederholung', () => {
    const a = "And it's no, nay, never";
    const b = 'No nay never no more';
    const input = [
      'Chorus:',
      place(a, [['D', 0], ['G', 'no,']]),
      a,
      place(b, [['D', 0], ['A', 'never'], ['D', 'more'], ['(x2)', b.length + 3]]),
      b,
    ].join('\n');
    expect(lines(ugToChordPro(input))).toEqual([
      '{start_of_chorus: Chorus}',
      "[D]And it's [G]no, nay, never",
      '[D]No nay [A]never no [D]more (2×)',
      '{end_of_chorus}',
    ]);
  });

  it('Die Gedanken sind frei – deutsche Marken (Strophe/Refrain) und H-Akkorde', () => {
    const a = 'Die Gedanken sind frei';
    const input = [
      '[Strophe 1]',
      place(a, [['E', 'Gedanken'], ['H7', 'frei']]),
      a,
      '',
      '[Refrain]',
      'E   H7   E',
    ].join('\n');
    expect(lines(ugToChordPro(input))).toEqual([
      '{start_of_verse: Strophe 1}',
      'Die [E]Gedanken sind [H7]frei',
      '{end_of_verse}',
      '',
      '{start_of_chorus: Refrain}',
      '[E] [H7] [E]',
      '{end_of_chorus}',
    ]);
  });

  it('Tab-Blöcke bleiben unverändert, der Abschnittsname wird übernommen', () => {
    const tab = [
      'e|-----0-----0---|',
      'B|---1---1-----1-|',
      'G|-2-------2-----|',
      'D|---------------|',
      'A|0--------------|',
      'E|---------------|',
    ];
    const v = 'Oh Shenandoah, I long to see you';
    const input = [
      '[Intro]',
      ...tab,
      '',
      '[Verse]',
      place(v, [['C', 'Oh'], ['F', 'Shenandoah'], ['C', 'long']]),
      v,
    ].join('\n');
    expect(lines(ugToChordPro(input))).toEqual([
      '{start_of_tab: Intro}',
      ...tab,
      '{end_of_tab}',
      '',
      '{start_of_verse: Verse}',
      '[C]Oh [F]Shenandoah, I [C]long to see you',
      '{end_of_verse}',
    ]);
  });

  it('Tab mitten in einer Strophe schließt den Abschnitt', () => {
    const input = ['[Verse]', 'G', 'Oh my darling', 'e|--3--2--0--|', 'B|--0--0--1--|'].join('\n');
    expect(lines(ugToChordPro(input))).toEqual([
      '{start_of_verse: Verse}',
      '[G]Oh my darling',
      '{end_of_verse}',
      '{start_of_tab}',
      'e|--3--2--0--|',
      'B|--0--0--1--|',
      '{end_of_tab}',
    ]);
  });

  it('versteht UG-Markup [ch]…[/ch] und [tab]…[/tab]', () => {
    const input = '[Verse]\n[tab][ch]Am[/ch]      [ch]G[/ch]\nScarborough Fair[/tab]';
    expect(lines(ugToChordPro(input))).toEqual([
      '{start_of_verse: Verse}',
      '[Am]Scarboro[G]ugh Fair',
      '{end_of_verse}',
    ]);
  });

  it('reine Akkordzeilen mit Taktstrichen und Wiederholung', () => {
    expect(lines(ugToChordPro('| Am  | G  | F  | E  | x2'))).toEqual(['| [Am] | [G] | [F] | [E] | x2']);
  });

  it('Textzeilen ohne Akkorde, eckige Klammern im Text, Windows-Zeilenenden', () => {
    const input = 'Some words here\r\nand some [whispered] words\r\n';
    expect(lines(ugToChordPro(input))).toEqual(['Some words here', 'and some (whispered) words']);
  });

  it('Akkordzeile über einer Abschnittsmarke wird nicht verschmolzen', () => {
    expect(lines(ugToChordPro('Am  G\n[Chorus]\nC\nla la'))).toEqual([
      '[Am] [G]',
      '{start_of_chorus: Chorus}',
      '[C]la la',
      '{end_of_chorus}',
    ]);
  });

  it('versteht "Verse 1 -" und "chorus -" als Abschnittsmarken', () => {
    const v = 'Oh Shenandoah, I long to see you';
    const c = 'Away, you rolling river';
    const input = [
      'Verse 1 - ',
      place(v, [['C', 'Oh'], ['F', 'Shenandoah'], ['C', 'long']]),
      v,
      '',
      'chorus -',
      place(c, [['Am', 'Away'], ['G', 'rolling']]),
      c,
      '',
      'Bridge – ',
      'G   C',
      '',
      'Verse 2—',
      'la',
    ].join('\n');
    expect(lines(ugToChordPro(input))).toEqual([
      '{start_of_verse: Verse 1}',
      '[C]Oh [F]Shenandoah, I [C]long to see you',
      '{end_of_verse}',
      '',
      '{start_of_chorus: chorus}',
      '[Am]Away, you [G]rolling river',
      '{end_of_chorus}',
      '',
      '{start_of_bridge: Bridge}',
      '[G] [C]',
      '{end_of_bridge}',
      '',
      '{start_of_verse: Verse 2}',
      'la',
      '{end_of_verse}',
    ]);
  });

  it('"Verse 1 - Text" auf einer Zeile: Akkorde darüber bleiben an ihrer Silbe', () => {
    const lyric = 'Verse 1 - Oh my darling, Clementine';
    const input = [
      place(lyric, [['C', 'Oh'], ['G', 'darling'], ['C', 'Clementine']]),
      lyric,
      'Chorus: Am  G  C',
      'Intro - | Am | G |',
    ].join('\n');
    expect(lines(ugToChordPro(input))).toEqual([
      '{start_of_verse: Verse 1}',
      '[C]Oh my [G]darling, [C]Clementine',
      '{end_of_verse}',
      '{start_of_chorus: Chorus}',
      '[Am] [G] [C]',
      '{end_of_chorus}',
      '{start_of_part: Intro}',
      '| [Am] | [G] |',
      '{end_of_part}',
    ]);
  });

  it('Bindestriche im normalen Liedtext bleiben unangetastet', () => {
    expect(lines(ugToChordPro('Versed in the art - of nothing\nChorusline - dancing'))).toEqual([
      'Versed in the art - of nothing',
      'Chorusline - dancing',
    ]);
  });

  it('leerer Abschnitt wird zu einem Kommentar', () => {
    expect(lines(ugToChordPro('[Solo]\n\n[Chorus]\nC\nla'))).toEqual([
      '{comment: Solo}',
      '',
      '{start_of_chorus: Chorus}',
      '[C]la',
      '{end_of_chorus}',
    ]);
  });
});
