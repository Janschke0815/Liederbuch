// Einfügen von Mundharmonika-Tabs in der Schreibweise von harptabs.com
import { describe, it, expect } from './runner.js';
import { harpTokens, isHarpRow, normalizeHarpNote } from '../src/formats/harp-import.js';
import { ugToChordPro, isChordLine, isTabLine } from '../src/formats/ug-import.js';

const body = (cp) => cp.split('\n').filter((l) => l && !l.startsWith('{title')).join('\n');

describe('Harp-Zeilen in fremder Schreibweise', () => {
  it('Bending-Zeichen vereinheitlichen', () => {
    expect(normalizeHarpNote('-3"')).toBe("-3''");
    expect(normalizeHarpNote('-3’')).toBe("-3'");
    expect(normalizeHarpNote('-4')).toBe('-4');
  });
  it('Töne ohne Leerzeichen behalten ihre Spalte', () => {
    expect(harpTokens(' 4 -6-6  5')).toEqual([
      { col: 1, text: '4' }, { col: 3, text: '-6' }, { col: 5, text: '-6' }, { col: 9, text: '5' },
    ]);
  });
  it('Doppeltöne 7,8 und 4+5', () => {
    expect(harpTokens('7,8 6,7 4+5').map((t) => t.text)).toEqual(['7 8', '6 7', '4 5']);
  });
  it('Taktstriche werden übergangen', () => {
    expect(harpTokens('| 4 -4 | 5 |').map((t) => t.text)).toEqual(['4', '-4', '5']);
  });
  it('keine Harp-Zeile: Text, Akkorde, Zählzeit', () => {
    expect(isHarpRow('Ich geh hinaus')).toBe(false);
    expect(isHarpRow('Em  C  D  G')).toBe(false);
    expect(isHarpRow('1 2')).toBe(false);
    expect(isHarpRow('1, 2, 3')).toBe(false);
  });
  it('gilt als Akkord-/Tonzeile, nicht als Gitarren-Tab', () => {
    expect(isChordLine('4  -6-6  -3"  7,8')).toBe(true);
    expect(isTabLine('4  -6-6  -3"  7,8')).toBe(false);
  });
});

describe('Einfügen von harptabs.com', () => {
  it('Akkordzeile, Harp-Zeile und Text werden eine Zeile', () => {
    const cp = ugToChordPro('Em        C\n4  4   4   -6\nIch geh hinaus,', { title: 'T' });
    expect(body(cp)).toBe('[Em][4]Ich[4] geh[4] hi[C]n[-6]aus,');
  });
  it('auch mit Harp-Zeile oben und Akkorden darunter', () => {
    const cp = ugToChordPro('4  4   4   -6\nEm        C\nIch geh hinaus,', { title: 'T' });
    expect(body(cp)).toBe('[Em][4]Ich[4] geh[4] hi[C]n[-6]aus,');
  });
  it('-6-6 und -3" über dem Text', () => {
    const cp = ugToChordPro('-3"  -6-6\nSo geht es', { title: 'T' });
    expect(body(cp)).toBe("[-3'']So ge[-6]ht[-6] es");
  });
  it('Harp-Zeile ohne Text bleibt eine Tonzeile, Doppeltöne als [7 8]', () => {
    const cp = ugToChordPro(' 7,8 6,7 -4', { title: 'T' });
    expect(body(cp)).toBe('[7 8] [6 7] [-4]');
  });
  it('Intro endet an der Leerzeile, wenn danach gesungen wird', () => {
    const cp = ugToChordPro('INTRO:\n4 6 -5 5\n\nC\n4  -4\nText hier', { title: 'T' });
    expect(body(cp)).toBe('{start_of_part: INTRO}\n[4] [6] [-5] [5]\n{end_of_part}\n[C][4]Tex[-4]t hier');
  });
  it('Intro über mehrere Absätze ohne Text bleibt zusammen', () => {
    const cp = ugToChordPro('Intro:\n4 6 -5 5\n\n-4 4 3', { title: 'T' });
    expect(body(cp)).toBe('{start_of_part: Intro}\n[4] [6] [-5] [5]\n[-4] [4] [3]\n{end_of_part}');
  });
  it('Strophe endet weiterhin erst am nächsten Abschnitt', () => {
    const cp = ugToChordPro('Verse:\nC\nEins\n\nG\nZwei', { title: 'T' });
    expect(body(cp)).toBe('{start_of_verse: Verse}\n[C]Eins\n[G]Zwei\n{end_of_verse}');
  });
});
