import { describe, it, expect } from './runner.js';
import {
  abcKeySignature, abcMelody, abcSyllables, harpHoleFor, harpTabsFromAbc, rankHarpKeys,
} from '../src/core/harp-melody.js';
import { parseChordPro } from '../src/core/chordpro.js';

const ENTCHEN = `X:1
M:4/4
L:1/4
K:C
"C"C D E F | "G"G2 G2 | "F"A A A A | "C"G4 |
w: Al-le mei-ne Ent-chen schwim-men auf dem See,`;

describe('Harp aus Noten: ABC lesen', () => {
  it('Vorzeichen der Tonart, auch Moll und Kirchentonarten', () => {
    expect(abcKeySignature('G').acc).toEqual({ F: 1 });
    expect(abcKeySignature('Bb').acc).toEqual({ B: -1, E: -1 });
    expect(abcKeySignature('Am')).toEqual({ tonic: 9, minor: true, acc: {} });
    expect(abcKeySignature('Ddor').acc).toEqual({});
    expect(abcKeySignature('Amix').acc).toEqual({ F: 1, C: 1 });
    expect(abcKeySignature('F#m').acc).toEqual({ F: 1, C: 1, G: 1 });
  });

  it('Tonhöhen: Oktaven, Vorzeichen der Tonart, Versetzungszeichen bis zum Taktstrich', () => {
    expect(abcMelody('K:C\nC c c\' C, |').map((l) => l.notes)).toEqual([[60, 72, 84, 48]]);
    expect(abcMelody('K:G\nF ^c c =F | c').map((l) => l.notes)).toEqual([[66, 73, 73, 65, 72]]);
  });

  it('Pausen, Akkordsymbole, Verzierungen, Vorschläge zählen nicht; Bindebogen nur einmal', () => {
    expect(abcMelody('K:C\n"G"G2- G2 z2 {A}B !trill!c [CEG]2 |1 d :|2 e |]').map((l) => l.notes))
      .toEqual([[67, 71, 72, 60, 74, 76]]);
  });

  it('Liedtext: erste w:-Zeile je Notenzeile, Silben mit - _ * ~', () => {
    const lines = abcMelody(`${ENTCHEN}\nw: zwei-te Stro-phe`);
    expect(lines[0].lyrics).toBe('w: Al-le mei-ne Ent-chen schwim-men auf dem See,');
    expect(abcSyllables('w: Al-le _ * a~b').map((s) => [s.text, s.joined, Boolean(s.hold)]))
      .toEqual([['Al', true, false], ['le', false, false], ['', false, true], ['', false, false], ['a b', false, false]]);
  });
});

describe('Harp aus Noten: Kanäle', () => {
  it('C-Harp: blasen, ziehen, Bending, Overblow; G auf -2 statt 3', () => {
    expect(harpHoleFor(72, 0)).toEqual({ tab: '4', kind: 'plain' });
    expect(harpHoleFor(74, 0)).toEqual({ tab: '-4', kind: 'plain' });
    expect(harpHoleFor(67, 0).tab).toBe('-2');
    expect(harpHoleFor(69, 0)).toEqual({ tab: "-3''", kind: 'bend' });
    expect(harpHoleFor(75, 0)).toEqual({ tab: '4o', kind: 'over' });
    expect(harpHoleFor(40, 0)).toBe(null);
  });

  it('andere Harps: G-Harp tiefer, D-Harp höher', () => {
    expect(harpHoleFor(55, 7).tab).toBe('1'); // G-Harp, Kanal 1 = G3
    expect(harpHoleFor(62, 2).tab).toBe('1'); // D-Harp, Kanal 1 = D4
  });

  it('„Alle meine Entchen“ auf der C-Harp: eine Oktave höher, ohne Bending, Tabs über den Silben', () => {
    const r = harpTabsFromAbc(ENTCHEN, 0);
    expect([r.octave, r.bends, r.missing, r.count]).toEqual([12, 0, 0, 11]);
    expect(r.text).toBe('[4]Al[-4]le [5]mei[-5]ne [6]Ent[6]chen [-6]schwim[-6]men [-6]auf [-6]dem [6]See,');
  });

  it('transponiert angezeigt: gleiche Tabs auf der Harp in der neuen Tonart', () => {
    expect(harpTabsFromAbc(ENTCHEN, 2, 2).text).toBe(harpTabsFromAbc(ENTCHEN, 0).text);
  });

  it('ohne Liedtext: eine Tab-Zeile je Notenzeile; fehlende Töne als [*?]', () => {
    const r = harpTabsFromAbc('K:C\nc d e f |\nC,, D,, |', 0);
    expect(r.text.split('\n')[0]).toBe('[4] [-4] [5] [-5]');
    expect(r.text.split('\n')[1]).toBe('[*?] [*?]');
    expect(r.missing).toBe(2);
  });

  it('Ergebnis liest der Parser als Harp-Tabs', () => {
    const song = parseChordPro(harpTabsFromAbc(ENTCHEN, 0).text);
    const segs = song.blocks[0].lines[0].segments.filter((s) => s.chord);
    expect(segs.every((s) => s.harp)).toBe(true);
    const tabsOnly = parseChordPro(harpTabsFromAbc('K:C\nc d e f |', 0).text).blocks[0].lines[0];
    expect(Boolean(tabsOnly.harpOnly)).toBe(true);
  });

  it('Empfehlung: C-Dur-Lied → C-Harp; a-Moll-Lied ohne Bending → G-Harp (3. Lage) vorn', () => {
    expect(rankHarpKeys(ENTCHEN)[0].name).toBe('C');
    expect(rankHarpKeys(ENTCHEN, 2)[0].name).toBe('D');
    const minor = 'K:Am\nA B c d | e2 e2 | d c B A |';
    const best = rankHarpKeys(minor)[0];
    expect(best.missing + best.bends).toBe(0);
  });
});
