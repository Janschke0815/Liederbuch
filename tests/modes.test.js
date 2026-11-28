import { describe, it, expect } from './runner.js';
import { initialModes, usesHarp } from '../src/core/modes.js';
import { allowedInMode, asExpert } from '../src/modes.js';

const SAMPLE = '{title: Beispiel}\n[G]Amazing [C]grace';

describe('Funktionsumfang: Startwerte', () => {
  it('neu angefangen (nur Beispiellied): einfache Ansicht, ohne Mundharmonika', () => {
    expect(initialModes({ songs: [SAMPLE], sample: SAMPLE })).toEqual({ expert: false, harp: false });
    expect(initialModes({ songs: [], sample: SAMPLE })).toEqual({ expert: false, harp: false });
  });

  it('eigene Lieder, Setlisten, weitere Liederbücher oder Cloud: Expertenmodus bleibt', () => {
    expect(initialModes({ songs: [SAMPLE, '[C]Mein Lied'], sample: SAMPLE }).expert).toBe(true);
    expect(initialModes({ songs: [SAMPLE], sample: SAMPLE, setlists: 1 }).expert).toBe(true);
    expect(initialModes({ songs: [], books: 2 }).expert).toBe(true);
    expect(initialModes({ songs: [], synced: true }).expert).toBe(true);
  });

  it('Mundharmonika an, wenn ein eigenes Lied Harp-Tabs hat oder eigene Harps eingetragen sind', () => {
    expect(initialModes({ songs: ['[4]Oh [-4]Su[5]san[-5]na'] }).harp).toBe(true);
    expect(initialModes({ songs: [], harps: 1 }).harp).toBe(true);
    expect(initialModes({ songs: ['[G]nur [Am]Akkorde'] }).harp).toBe(false);
  });

  it('erkennt Harp-Tabs, aber keine Akkorde', () => {
    expect(usesHarp("[-3'] [6o] [(7 8)]")).toBe(true);
    expect(usesHarp('[C] [Am7] [D/F#] [*Riff]')).toBe(false);
  });
});

describe('Funktionsumfang: Menüeinträge', () => {
  it('lässt Trennlinien und normale Einträge immer durch', () => {
    expect(allowedInMode('-')).toBe(true);
    expect(allowedInMode({ label: 'Öffnen' })).toBe(true);
  });

  it('asExpert markiert Einträge und lässt leere leer', () => {
    expect(asExpert({ label: 'Setliste' })).toEqual({ label: 'Setliste', expert: true });
    expect(asExpert(null)).toBe(null);
  });
});
