import { describe, it, expect } from './runner.js';
import { parseChordPro, parseLyricsLine } from '../src/core/chordpro.js';
import { ugToChordPro } from '../src/core/ug-import.js';
import { isChord, transposeChord, shouldUseFlats } from '../src/core/chords.js';

describe('ChordPro-Parser', () => {
  it('liest Metadaten und Kurzformen', () => {
    const s = parseChordPro('{t: Scarborough Fair}\n{st: Traditional}\n{artist: Unbekannt}\n{key: Am}\n{capo: 3}\n{meta: arranger Ich}');
    expect(s.meta).toEqual({
      title: 'Scarborough Fair', subtitle: ['Traditional'], artist: ['Unbekannt'], key: 'Am', capo: '3', arranger: 'Ich',
    });
  });

  it('zerlegt Zeilen in Akkord/Text-Segmente', () => {
    expect(parseLyricsLine('There [Am]is a h[C]ouse').segments).toEqual([
      { chord: null, annotation: false, text: 'There ' },
      { chord: 'Am', annotation: false, text: 'is a h' },
      { chord: 'C', annotation: false, text: 'ouse' },
    ]);
  });

  it('erkennt Annotationen und reine Akkordzeilen', () => {
    const l = parseLyricsLine('| [Am] | [G] | [*x2]');
    expect(l.chordsOnly).toBe(true);
    expect(l.segments.at(-1)).toEqual({ chord: 'x2', annotation: true, text: '' });
    expect(parseLyricsLine('[G]Hello [C]world').chordsOnly).toBe(false);
  });

  it('bildet Abschnitte und freie Blöcke', () => {
    const s = parseChordPro([
      '{title: Test}', '', 'Frei [G]davor', '', '{soc: Refrain}', '[C]La la', '', '[G]Li li', '{eoc}',
      '{chorus}', '{c: Langsam}', '{ci: leise}',
    ].join('\n'));
    expect(s.blocks.map((b) => [b.kind, b.label, b.lines.map((l) => l.type)])).toEqual([
      [null, null, ['lyrics']],
      ['chorus', 'Refrain', ['lyrics', 'empty', 'lyrics']],
      [null, null, ['chorus-ref', 'comment', 'comment']],
    ]);
    expect(s.blocks[2].lines[2]).toEqual({ type: 'comment', text: 'leise', style: 'italic' });
  });

  it('übernimmt Tab-Blöcke unverändert, auch mit Klammern', () => {
    const s = parseChordPro('{sot: Riff}\ne|--[0]--3--|\n\n  {kein: direktive\n{eot}');
    expect(s.blocks[0].kind).toBe('tab');
    expect(s.blocks[0].label).toBe('Riff');
    expect(s.blocks[0].lines.map((l) => l.text)).toEqual(['e|--[0]--3--|', '', '  {kein: direktive']);
  });

  it('kennt eigene Abschnittstypen', () => {
    const s = parseChordPro('{start_of_part: Intro}\n[Am] [G]\n{end_of_part}');
    expect([s.blocks[0].kind, s.blocks[0].label, s.blocks[0].lines[0].chordsOnly]).toEqual(['part', 'Intro', true]);
  });

  it('Import -> Parser: Akkorde landen über der richtigen Silbe', () => {
    const cp = ugToChordPro('[Chorus]\n      C        G\nOh my darling, Clementine');
    const line = parseChordPro(cp).blocks[0].lines[0];
    expect(line.segments).toEqual([
      { chord: null, annotation: false, text: 'Oh my ' },
      { chord: 'C', annotation: false, text: 'darling, ' },
      { chord: 'G', annotation: false, text: 'Clementine' },
    ]);
  });
});

describe('Akkorde und Transposition', () => {
  it('erkennt gültige Akkordnamen', () => {
    for (const c of ['A', 'Am', 'C#m7', 'Bb', 'Ebmaj7', 'Dsus4', 'Gadd9', 'Am7b5', 'E7#9', 'D/F#', 'G6/9', 'Bdim', 'Caug', 'C+', 'Hm', 'F#m7/C#']) {
      if (!isChord(c)) throw new Error(`${c} sollte ein Akkord sein`);
    }
    for (const w of ['Hello', 'I', 'Do', 'Be', 'x2', 'Fis', 'Am7x', '']) {
      if (isChord(w)) throw new Error(`${w} sollte kein Akkord sein`);
    }
  });

  it('transponiert Grundton und Bass', () => {
    expect(transposeChord('Am', 3, false)).toBe('Cm');
    expect(transposeChord('D/F#', 1, true)).toBe('Eb/G');
    expect(transposeChord('D/F#', 1, false)).toBe('D#/G');
    expect(transposeChord('Bb', -2, true)).toBe('Ab');
    expect(transposeChord('G6/9', 2, false)).toBe('A6/9');
    expect(transposeChord('Cmaj7', -1, false)).toBe('Bmaj7');
    expect(transposeChord('Hm', 1, false)).toBe('Cm');
    expect(transposeChord('Em', 12, false)).toBe('Em');
    expect(transposeChord('N.C.', 4, false)).toBe('N.C.');
  });

  it('wählt # oder b anhand der Tonart', () => {
    expect(shouldUseFlats('auto', 'C', 3)).toBe(true); // Eb
    expect(shouldUseFlats('auto', 'C', 2)).toBe(false); // D
    expect(shouldUseFlats('auto', 'Am', 5)).toBe(true); // Dm
    expect(shouldUseFlats('auto', 'Am', 2)).toBe(false); // Hm
    expect(shouldUseFlats('sharp', 'F', 0)).toBe(false);
    expect(shouldUseFlats('flat', 'G', 0)).toBe(true);
  });
});
