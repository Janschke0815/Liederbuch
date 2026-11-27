import { describe, it, expect } from './runner.js';
import { harpTabMidi } from '../src/core/harp-melody.js';
import {
  harpShift, harpView, parseHarpKey, rewriteHarpTabs, rewriteHarpText, songHarp, songHarpTabs, writtenHarp,
} from '../src/core/harp-transpose.js';
import { parseChordPro } from '../src/core/chordpro.js';
import { setMeta } from '../src/core/meta-edit.js';

describe('Harp-Hilfe: Töne und Tonarten', () => {
  it('Tab -> Ton, auch +4, -3b, andere Harps', () => {
    expect(harpTabMidi('4', 0)).toBe(72);
    expect(harpTabMidi('+4', 0)).toBe(72);
    expect(harpTabMidi('-3b', 0)).toBe(70);
    expect(harpTabMidi("-3'", 0)).toBe(70);
    expect(harpTabMidi('4', 7)).toBe(67); // G-Harp liegt eine Quarte unter der C-Harp
    expect(harpTabMidi("5'", 0)).toBe(null); // Blas-Bending gibt es erst ab Kanal 7
  });

  it('Harp-Tonart aus Text, kürzester Weg zwischen zwei Harps', () => {
    expect([parseHarpKey('C'), parseHarpKey('Bb'), parseHarpKey('f#'), parseHarpKey('H'), parseHarpKey('X')]).toEqual([0, 10, 6, 11, -1]);
    expect([harpShift(0, 2), harpShift(0, 10), harpShift(7, 9), harpShift(0, 6)]).toEqual([2, -2, 2, -6]);
  });
});

describe('Harp-Hilfe: Für welche Harp sind die Tabs?', () => {
  it('{harp:} im Lied gilt, wird mit dem Lied transponiert', () => {
    const song = parseChordPro('{harp: G}\n[4]la [-4]la');
    expect(writtenHarp(song)).toEqual({ key: 7, guessed: false });
    expect(songHarp(song, 2)).toEqual({ key: 9, written: 7, guessed: false });
    expect(writtenHarp(parseChordPro('[G]ohne Tabs'))).toBe(null);
  });

  it('geschätzt: 2. Lage (G-Lied auf C-Harp) und 1. Lage', () => {
    expect(writtenHarp(parseChordPro('{key: G}\n[G][-2]Oh [-3]my [-4]dar[4]ling [-3]oh [-2]my'))).toEqual({ key: 0, guessed: true });
    expect(writtenHarp(parseChordPro('{key: G}\n[4]Al[-4]le [5]mei[4]ne'))).toEqual({ key: 7, guessed: true });
    expect(writtenHarp(parseChordPro('[4]nur [-4]Tabs')).key).toBe(0);
  });

  it('Capo zählt zur klingenden Tonart', () => {
    // Griffe in E, Capo 3 -> klingt in G, Tabs in 1. Lage auf der G-Harp
    expect(writtenHarp(parseChordPro('{key: E}\n{capo: 3}\n[4]Al[-4]le [5]mei[4]ne')).key).toBe(7);
  });

  it('{harp:} steht im Kopf hinter dem Capo', () => {
    expect(setMeta('{title: A}\n{capo: 2}\n{time: 4/4}\n\nx', 'harp', 'C')).toBe('{title: A}\n{capo: 2}\n{harp: C}\n{time: 4/4}\n\nx');
  });
});

describe('Harp-Hilfe: Tabs umschreiben (gleicher Klang)', () => {
  it('C- auf G-Harp ohne Bending, C- auf D-Harp mit einem Bending', () => {
    const g = rewriteHarpTabs(['4', '-4', '5', '4'], 0, 7);
    expect([...g.map]).toEqual([['4', '-5'], ['-4', '6'], ['5', '-6']]);
    expect([g.bends, g.missing, g.octave]).toEqual([0, 0, 0]);
    const d = rewriteHarpTabs(['4', '-4', '5', '4'], 0, 2);
    expect(d.map.get('4')).toBe("-3'");
    expect([d.bends, d.missing]).toEqual([2, 0]); // „4“ kommt zweimal vor
  });

  it('zu hoch: ganze Melodie eine Oktave tiefer', () => {
    const r = rewriteHarpTabs(['9', '-9', '10'], 0, 7);
    expect(r.octave < 0).toBe(true);
    expect(r.missing).toBe(0);
  });

  it('chromatische Tabs (Kanal über 10) gehen nicht', () => {
    expect(rewriteHarpTabs(['12', '-4'], 0, 7).ok).toBe(false);
  });

  it('Anzeige und Text: umgeschriebene Tabs, Doppeltöne, Noten bleiben', () => {
    const text = '{harp: C}\n[G]Text [-4]la [7 8]x\n{start_of_abc}\n[4]\n{end_of_abc}';
    const song = parseChordPro(text);
    expect(songHarpTabs(song)).toEqual(['-4', '7', '8']);
    const v = harpView(song, 0, 'G');
    expect(v.harp).toBe('G');
    expect(harpView(song, 0, 'C')).toEqual({ harp: 'C', map: null });
    expect(harpView(song, 0, '')).toEqual({ harp: 'C', map: null });
    expect(rewriteHarpText(text, v.map)).toBe('{harp: C}\n[G]Text [6]la [(-9 -10)]x\n{start_of_abc}\n[4]\n{end_of_abc}');
    expect(rewriteHarpText('[4]', new Map([['4', null]]))).toBe('[*?]');
  });
});
