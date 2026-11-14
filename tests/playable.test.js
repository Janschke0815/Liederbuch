import { describe, it, expect } from './runner.js';
import { parseKnown, playableCapo, chordKey } from '../src/core/playable.js';

describe('Was kann ich spielen?', () => {
  const known = parseKnown('G, C D em am');

  it('erkennt bekannte Griffe (auch klein geschrieben, H = B)', () => {
    expect(known.size).toBe(5);
    expect(chordKey('H7')).toBe(chordKey('B7'));
    expect(chordKey('Bb')).toBe(chordKey('A#'));
  });

  it('nur Lieder aus bekannten Griffen, Slash-Bass zählt nicht', () => {
    expect(playableCapo(['G', 'C', 'D', 'G/B'], known)).toBe(0);
    expect(playableCapo(['G', 'C', 'F'], known)).toBe(null);
  });

  it('mit Capo: kleinster passender Bund', () => {
    // A-Dur-Lied = G-Griffe mit Capo 2
    expect(playableCapo(['A', 'D', 'E', 'F#m'], known, { withCapo: true })).toBe(2);
    expect(playableCapo(['A', 'D', 'E', 'F#m'], known)).toBe(null);
  });

  it('ohne Angaben kein Filter-Treffer', () => {
    expect(playableCapo(['G'], new Set())).toBe(null);
    expect(playableCapo([], known)).toBe(null);
  });
});
