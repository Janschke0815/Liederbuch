import { describe, it, expect } from './runner.js';
import { cleanPrintFonts, withPrintFonts, stepSize, loadPrintFonts, savePrintFonts } from '../src/print/print-fonts.js';

const memory = () => {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
};

describe('Druck: eigene Schrift', () => {
  const settings = { lyricFont: 'Georgia', lyricSize: 12, chordFont: 'Segoe UI', chordSize: 10.5, chordColor: '#1f4e9c' };

  it('ohne eigene Werte gilt, was unter Einstellungen steht', () => {
    const s = withPrintFonts(settings, {});
    expect([s.lyricFont, s.lyricSize, s.chordFont, s.chordSize, s.chordColor]).toEqual(['Georgia', 12, 'Segoe UI', 10.5, '#1f4e9c']);
  });

  it('eigene Werte überschreiben nur die Schrift', () => {
    const s = withPrintFonts(settings, { lyricFont: 'Arial', lyricSize: 10, chordColor: '#000000' });
    expect([s.lyricFont, s.lyricSize, s.chordSize, s.chordColor]).toEqual(['Arial', 10, 10.5, '#1f4e9c']);
  });

  it('merkt sich nur Abweichungen; ungültige Werte werden korrigiert', () => {
    expect(cleanPrintFonts({ lyricFont: 'Georgia', lyricSize: 11 }, settings)).toEqual({ lyricSize: 11 });
    expect(cleanPrintFonts({ lyricFont: 'Comic Sans', lyricSize: 99 }, settings)).toEqual({ lyricSize: 28 });
  });

  it('Größe in halben Punkten, mit Grenzen', () => {
    expect(stepSize('lyricSize', 12, 1)).toBe(12.5);
    expect(stepSize('chordSize', 10.5, -1)).toBe(10);
    expect(stepSize('lyricSize', 7, -1)).toBe(7);
    expect(stepSize('chordSize', 6, -1)).toBe(6);
    expect(stepSize('chordSize', 28, 1)).toBe(28);
  });

  it('speichern: "wie Einstellungen" löscht den Eintrag', () => {
    const st = memory();
    savePrintFonts({ lyricSize: 10 }, settings, st);
    expect(loadPrintFonts(st)).toEqual({ lyricSize: 10 });
    savePrintFonts({ lyricSize: 12 }, settings, st);
    expect(st.getItem('printFonts')).toBe(null);
    st.setItem('printFonts', 'kaputt');
    expect(loadPrintFonts(st)).toEqual({});
  });
});
