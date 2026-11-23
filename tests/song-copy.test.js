import { describe, it, expect } from './runner.js';
import { planCopy, songCount } from '../src/core/song-copy.js';

const s = (title, artist = '') => ({ title, artist });

describe('Mehrere Lieder kopieren', () => {
  it('kopiert Neues, überspringt Vorhandenes (Titel/Interpret wie beim Einfügen)', () => {
    const existing = [s('Clementine', 'Traditional'), s('Amazing Grace')];
    const r = planCopy([s('Clementine', 'Traditional'), s('Wonderwall', 'Oasis'), s('amazing grace', 'John Newton')], existing);
    expect(r.copy.map((x) => x.title)).toEqual(['Wonderwall']);
    expect(r.skip.map((x) => x.title)).toEqual(['Clementine', 'amazing grace']);
  });

  it('gleicher Titel, anderer Interpret: wird kopiert; doppelt ausgewählt: nur einmal', () => {
    const r = planCopy([s('Hallelujah', 'Cohen'), s('Hallelujah', 'Buckley'), s('Hallelujah', 'Buckley')], [s('Hallelujah', 'Cohen')]);
    expect(r.copy.map((x) => x.artist)).toEqual(['Buckley']);
    expect(r.skip.length).toBe(2);
  });

  it('Anzahl lesbar', () => {
    expect(songCount(1)).toBe('1 Lied');
    expect(songCount(3)).toBe('3 Lieder');
  });
});
