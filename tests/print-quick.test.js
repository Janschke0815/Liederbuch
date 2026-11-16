import { describe, it, expect } from './runner.js';
import { QUICK_OPTIONS, DEFAULT_PINS, loadPins, togglePin, formatValue } from '../src/print/print-quick.js';

const memory = () => {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
};

describe('Druck: Schnellwahl (📌)', () => {
  it('alle Optionen sind anheftbar, jede genau einmal', () => {
    const keys = QUICK_OPTIONS.map((o) => o.key);
    expect(keys).toEqual(['paper', 'columns', 'margin', 'pageNumbers', 'cover', 'toc', 'useSavedTranspose', 'lyricFont', 'lyricSize', 'chordFont', 'chordSize']);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('Standard: Seitenzahlen, Text- und Akkordgröße', () => {
    expect(loadPins(memory())).toEqual(DEFAULT_PINS);
  });

  it('an- und abheften, Reihenfolge wie in der Liste, Unbekanntes wird ignoriert', () => {
    const st = memory();
    expect(togglePin('paper', st)).toEqual(['paper', 'pageNumbers', 'lyricSize', 'chordSize']);
    expect(togglePin('lyricSize', st)).toEqual(['paper', 'pageNumbers', 'chordSize']);
    togglePin('gibtsnicht', st);
    expect(loadPins(st)).toEqual(['paper', 'pageNumbers', 'chordSize']);
    st.setItem('printPins', '[]');
    expect(loadPins(st)).toEqual([]); // alles abgeheftet bleibt leer
    st.setItem('printPins', 'kaputt');
    expect(loadPins(st)).toEqual(DEFAULT_PINS);
  });

  it('Werte in der Leiste und Schritte mit Grenzen', () => {
    const size = QUICK_OPTIONS.find((o) => o.key === 'lyricSize');
    const margin = QUICK_OPTIONS.find((o) => o.key === 'margin');
    expect(formatValue(size, 12.5)).toBe('12,5 pt');
    expect(formatValue(margin, 15)).toBe('15 mm');
    expect([size.step(12, 1), size.step(7, -1), margin.step(5, -1), margin.step(40, 1)]).toEqual([12.5, 7, 5, 40]);
  });
});
