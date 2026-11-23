import { describe, it, expect } from './runner.js';
import { visibleColumns, chordAt, setChordAt, removeChordAt, songChords } from '../src/core/chord-place.js';

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

describe('Akkorde per Antippen: Akkorde des Liedes', () => {
  it('jeder einmal, in Reihenfolge, ohne Anmerkungen und Harp-Tabs', () => {
    expect(songChords('[G]a [C]b [G]c [*x2] [4]d\n{sot}\n[Am]tab\n{eot}\n[D7]e')).toEqual(['G', 'C', 'D7']);
  });
});
