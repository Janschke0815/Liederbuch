import { describe, it, expect } from './runner.js';
import { chordShape, chordType, isEasyChord } from '../src/core/chord-shapes.js';
import { capoOptions } from '../src/core/capo.js';
import { parseChord, noteIndex } from '../src/core/chords.js';
import { chordDiagram } from '../src/render/chord-diagram.js';
import { parseChordPro } from '../src/core/chordpro.js';
import { renderSong } from '../src/render/song-view.js';

const TUNING = [4, 9, 2, 7, 11, 4]; // E A D G B E
const TONES = {
  maj: [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10], maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10],
  sus4: [0, 5, 7], sus2: [0, 2, 7], '7sus4': [0, 5, 7, 10], dim: [0, 3, 6], dim7: [0, 3, 6, 9],
  m7b5: [0, 3, 6, 10], aug: [0, 4, 8], 6: [0, 4, 7, 9], m6: [0, 3, 7, 9], 9: [0, 4, 7, 10, 2],
  add9: [0, 4, 7, 2], 5: [0, 7],
};
const SUFFIX = { maj: '', m: 'm' };
const ROOTS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

describe('Griffe: jeder Griff enthält genau die richtigen Töne', () => {
  it('alle Grundtöne × alle Akkordtypen', () => {
    const wrong = [];
    for (const root of ROOTS) {
      for (const [type, tones] of Object.entries(TONES)) {
        const name = root + (SUFFIX[type] ?? type);
        const shape = chordShape(name);
        if (!shape) {
          wrong.push(`${name}: kein Griff`);
          continue;
        }
        const r = noteIndex(root);
        const want = new Set(tones.map((t) => (r + t) % 12));
        const played = shape.frets.map((f, i) => (f < 0 ? null : (TUNING[i] + f) % 12)).filter((n) => n !== null);
        const extra = played.filter((n) => !want.has(n));
        // Pflicht: Grundton und alle Töne außer der Quinte (die darf fehlen)
        const required = tones.filter((t) => t !== 7).map((t) => (r + t) % 12);
        const missing = required.filter((n) => !played.includes(n));
        if (extra.length || missing.length || played.length < 3 && type !== '5') {
          wrong.push(`${name}: ${shape.frets.join(' ')}`);
        }
        if (Math.max(...shape.frets) > 15) wrong.push(`${name}: zu hoch`);
      }
    }
    expect(wrong).toEqual([]);
  });

  it('bekannte offene Griffe', () => {
    const f = (n) => chordShape(n).frets.map((x) => (x < 0 ? 'x' : x)).join('');
    expect([f('C'), f('G'), f('D'), f('Am'), f('Em'), f('E7'), f('F'), f('Bm'), f('H7')])
      .toEqual(['x32010', '320003', 'xx0232', 'x02210', '022000', '020100', '133211', 'x24432', 'x21202']);
  });

  it('Slash-Akkorde nehmen den Grundgriff, Unbekanntes ergibt keinen Griff', () => {
    expect(chordShape('G/B').frets).toEqual(chordShape('G').frets);
    expect(chordShape('C13#11')).toBe(null);
    expect(chordType('maj7')).toBe('maj7');
    expect(parseChord('Hm') && chordShape('Hm').frets).toEqual(chordShape('Bm').frets);
  });
});

describe('Griffbilder', () => {
  it('zeichnet Name, Saiten und Punkte, Barré als Balken', () => {
    const d = chordDiagram('F');
    expect(d.querySelector('figcaption').textContent).toBe('F');
    expect(d.querySelectorAll('svg line').length).toBe(5 + 6);
    expect(d.querySelectorAll('rect.cd-dot').length).toBe(1); // Barré
    expect(chordDiagram('Xyz')).toBe(null);
  });
  it('erscheinen im Liedkopf in transponierter Form, ohne Doppelte', () => {
    const el = renderSong(parseChordPro('{title: X}\n[G]la [C]li [G]lo [D/F#]lu'), { transpose: 2 });
    expect([...el.querySelectorAll('.chord-diagram figcaption')].map((c) => c.textContent)).toEqual(['A', 'D', 'E/G#']);
  });
});

describe('Capo-Hilfe', () => {
  it('Bb-Dur-Lied: Capo 3 mit G-Griffen', () => {
    const best = capoOptions(['Bb', 'Eb', 'F', 'Gm'])[0];
    expect(best.capo).toBe(3);
    expect(best.chords).toEqual(['G', 'C', 'D', 'Em']);
    expect(best.easy).toBe(4);
  });
  it('einfaches Lied bleibt ohne Capo', () => {
    expect(capoOptions(['G', 'C', 'D'])[0].capo).toBe(0);
    expect(isEasyChord('F')).toBe(false);
    expect(isEasyChord('Am7')).toBe(true);
  });
});
