import { describe, it, expect } from './runner.js';
import { transposeChordPro, chordproToText } from '../src/formats/export-text.js';
import { ugToChordPro } from '../src/formats/ug-import.js';

describe('Lied teilen: Text', () => {
  it('transponiert Akkorde und Tonart im ChordPro-Text, Anmerkungen bleiben', () => {
    const src = '{title: X}\n{key: G}\n[G]la [C]li [*leise]lo';
    expect(transposeChordPro(src, 2)).toBe('{title: X}\n{key: A}\n[A]la [D]li [*leise]lo');
    expect(transposeChordPro(src, 0)).toBe(src);
  });

  it('Akkorde über dem Text an der richtigen Spalte', () => {
    const txt = chordproToText('{title: Clementine}\n{start_of_chorus}\nOh my [C]darling, oh my [G]darling\n{end_of_chorus}');
    expect(txt).toBe('Clementine\n\n[Refrain]\n      C              G\nOh my darling, oh my darling\n');
  });

  it('überlappende Akkorde schieben den Text, Rundreise mit dem Import', () => {
    const txt = chordproToText('[Am][G]Hey [C]du');
    expect(txt).toBe('Am G   C\n   Hey du\n');
    const back = ugToChordPro(chordproToText('Oh my [C]darling, oh my [G]darling'));
    expect(back.trim()).toBe('Oh my [C]darling, oh my [G]darling');
  });
});
