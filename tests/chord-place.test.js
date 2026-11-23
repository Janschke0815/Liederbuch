import { describe, it, expect } from './runner.js';
import { visibleColumns, chordAt, setChordAt, removeChordAt, snapColumn, songChords } from '../src/core/chord-place.js';

const SONG = '{title: Clementine}\n\n{start_of_verse}\nOh my [C]darling, oh my [G]darling\n{end_of_verse}';
const L = 3; // Liedzeile

describe('Akkorde per Antippen: Spalten', () => {
  it('sichtbarer Text ohne Klammern und Abbildung auf den Rohtext', () => {
    const { text, toRaw } = visibleColumns('Oh [C]my');
    expect(text).toBe('Oh my');
    expect(toRaw).toEqual([0, 1, 2, 6, 7, 8]);
  });
});

describe('Akkorde per Antippen: setzen, ändern, entfernen', () => {
  it('setzt einen Akkord mitten ins Wort', () => {
    // „Oh my darling“: Spalte 3 = „m“
    const t = setChordAt(SONG, L, 3, 'Am');
    expect(t.split('\n')[L]).toBe('Oh [Am]my [C]darling, oh my [G]darling');
  });

  it('ersetzt einen vorhandenen Akkord an derselben Stelle', () => {
    // „darling“ beginnt bei Spalte 6
    expect(chordAt(SONG, L, 6)).toBe('C');
    const t = setChordAt(SONG, L, 6, 'F');
    expect(t.split('\n')[L]).toBe('Oh my [F]darling, oh my [G]darling');
  });

  it('entfernt nur den Akkord an der Stelle', () => {
    const t = removeChordAt(SONG, L, 6);
    expect(t.split('\n')[L]).toBe('Oh my darling, oh my [G]darling');
    expect(removeChordAt(SONG, L, 0)).toBe(SONG); // dort steht keiner
  });

  it('Zeilenanfang und -ende', () => {
    expect(setChordAt('la la', 0, 0, 'G')).toBe('[G]la la');
    expect(setChordAt('la la', 0, 5, 'D')).toBe('la la[D]');
    expect(setChordAt('la la', 0, 99, 'D')).toBe('la la[D]'); // hinter dem Ende: ans Ende
  });

  it('Anmerkungen und Mundharmonika-Tabs bleiben, Akkord kommt davor', () => {
    expect(chordAt('[*x2]la', 0, 0)).toBe(null);
    expect(setChordAt('[4]la', 0, 0, 'C')).toBe('[C][4]la');
    expect(setChordAt('[C][4]la', 0, 0, 'G')).toBe('[G][4]la');
    expect(removeChordAt('[C][4]la', 0, 0)).toBe('[4]la');
  });

  it('andere Zeilen und Windows-Zeilenenden', () => {
    const t = setChordAt('a\r\nb', 1, 0, 'E');
    expect(t).toBe('a\n[E]b');
    expect(setChordAt('a', 5, 0, 'E')).toBe('a'); // Zeile gibt es nicht
  });

  it('Parser kennt die Quellzeile (für das Antippen in der Vorschau)', async () => {
    const { parseChordPro } = await import('../src/core/chordpro.js');
    const line = parseChordPro(SONG).blocks[0].lines[0];
    expect(line.src).toBe(L);
  });
});

describe('Akkorde per Antippen: Einrasten', () => {
  const line = (raw) => [raw, 0];
  it('Tipp ins Wort → vor das Wort', () => {
    // „Amazing grace, how sweet“: Spalte 21 = „e“ in „sweet“, Wort beginnt bei 19
    expect(snapColumn(...line('Amazing grace, how sweet'), 21)).toBe(19);
    expect(snapColumn(...line('Amazing grace, how sweet'), 19)).toBe(19);
  });

  it('Bindestrich-Wörter: vor die getippte Silbe', () => {
    // „Gas-o-line“: G0 a1 s2 -3 o4 -5 l6 i7 n8 e9
    expect(snapColumn(...line('Gas-o-line'), 8)).toBe(6);
    expect(snapColumn(...line('Gas-o-line'), 4)).toBe(4);
    expect(snapColumn(...line('Gas-o-line'), 1)).toBe(0);
    expect(snapColumn(...line('Gas-o-line'), 3)).toBe(4); // auf den Bindestrich: nächste Silbe
  });

  it('vorhandener Akkord im Wort wird getroffen statt daneben', () => {
    // „A[G]mazing“: Akkord an Spalte 1
    expect(snapColumn(...line('A[G]mazing grace'), 4)).toBe(1);
    expect(snapColumn(...line('A[G]mazing grace'), 0)).toBe(0); // vor dem Akkord: Wortanfang
    expect(snapColumn(...line('A[*x2]mazing'), 4)).toBe(0); // Anmerkung zählt nicht
  });

  it('Leerzeichen und Zeilenende', () => {
    expect(snapColumn(...line('la  la'), 2)).toBe(4); // Leerzeichen → nächstes Wort
    expect(snapColumn(...line('la la'), 5)).toBe(5); // Ende bleibt Ende
    expect(snapColumn(...line('la '), 2)).toBe(3); // Leerzeichen am Ende → Ende
    expect(snapColumn(...line('la'), 99)).toBe(2);
  });

  it('andere Zeilen des Textes', () => {
    expect(snapColumn('{title: X}\nOh my darling', 1, 9)).toBe(6);
  });
});

describe('Akkorde per Antippen: Akkorde des Liedes', () => {
  it('jeder einmal, in Reihenfolge, ohne Anmerkungen und Harp-Tabs', () => {
    expect(songChords('[G]a [C]b [G]c [*x2] [4]d\n{sot}\n[Am]tab\n{eot}\n[D7]e')).toEqual(['G', 'C', 'D7']);
  });
});
