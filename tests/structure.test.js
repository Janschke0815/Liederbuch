// Tests für die Bausteine aus dem Umbau 1.23: gespeicherte Einstellungen, Textfunktionen,
// Rechnungen des Spielmodus, Tastenkürzel.
import { describe, it, expect } from './runner.js';
import { createPrefs, PREFS } from '../src/prefs.js';
import { collator, foldText, normalizeText } from '../src/core/text.js';
import { normalize } from '../src/storage/repository.js';
import {
  durationSeconds, pixelsPerSecond, pageCount, pageIndex, pagePos, snapPos, secondsPerPage,
} from '../src/core/play-scroll.js';
import { SHORTCUTS, keyMatches, findShortcut } from '../src/ui/shortcuts.js';

/** Speicher wie localStorage, nur im Arbeitsspeicher. */
function memoryStorage(initial = {}) {
  const m = new Map(Object.entries(initial));
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    raw: m,
  };
}

describe('Gespeicherte Einstellungen (prefs)', () => {
  it('liefert Standardwerte, solange nichts gespeichert ist', () => {
    const p = createPrefs(memoryStorage());
    expect(p.get('listSort')).toBe('title');
    expect(p.get('focusMode')).toBe(false);
    expect(p.get('viewZoom')).toBe(1);
    expect(p.get('playSpeed')).toEqual({});
  });
  it('liest und schreibt im bisherigen Format', () => {
    const store = memoryStorage({ cfOpen: '1', viewZoom: '1.3', playSpeed: '{"a":1.5}', playColumns: '2' });
    const p = createPrefs(store);
    expect(p.get('chordFilterOpen')).toBe(true);
    expect(p.get('viewZoom')).toBe(1.3);
    expect(p.get('playSpeed')).toEqual({ a: 1.5 });
    expect(p.get('playColumns')).toBe('2');
    p.set('chordFilterOpen', false);
    expect(store.raw.get('cfOpen')).toBe('');
    p.setIn('playSpeed', 'b', 2);
    expect(JSON.parse(store.raw.get('playSpeed'))).toEqual({ a: 1.5, b: 2 });
  });
  it('kaputte Werte ergeben den Standard', () => {
    const p = createPrefs(memoryStorage({ playSpeed: '{kaputt', viewZoom: 'abc' }));
    expect(p.get('playSpeed')).toEqual({});
    expect(p.get('viewZoom')).toBe(1);
  });
  it('Standardwerte werden nicht versehentlich geteilt', () => {
    const p = createPrefs(memoryStorage());
    p.get('playSpeed').x = 1;
    expect(p.get('playSpeed')).toEqual({});
  });
  it('unbekannte Namen fallen sofort auf', () => {
    const p = createPrefs(memoryStorage());
    let msg = '';
    try {
      p.get('gibtsNicht');
    } catch (e) {
      msg = e.message;
    }
    expect(msg.includes('src/prefs.js')).toBe(true);
  });
  it('jeder Schlüssel kommt nur einmal vor', () => {
    const keys = Object.values(PREFS).map((e) => e.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('Textfunktionen', () => {
  it('für die Suche vereinfachen', () => {
    expect(foldText('Ärger Straße Café')).toBe('arger strasse cafe');
    expect(normalize('Über')).toBe('uber'); // alter Name in repository.js
  });
  it('deutsch sortieren, Zahlen der Größe nach', () => {
    expect(['Lied 10', 'lied 2', 'Äpfel', 'Zebra'].sort(collator.compare)).toEqual(['Äpfel', 'lied 2', 'Lied 10', 'Zebra']);
  });
  it('Zeilenenden vereinheitlichen', () => expect(normalizeText('a\r\nb\rc\n')).toBe('a\nb\nc\n'));
});

describe('Spielmodus: Rechnungen', () => {
  it('Liedlänge', () => {
    expect(durationSeconds('3:20')).toBe(200);
    expect(durationSeconds('x')).toBe(null);
  });
  it('Tempo: Text läuft in der Liedlänge durch (Standard 3 min)', () => {
    expect(pixelsPerSecond(1800, '3:00')).toBe(10);
    expect(pixelsPerSecond(1800, '')).toBe(10);
    expect(pixelsPerSecond(50, '1:40')).toBe(2); // mindestens 200 px Strecke
  });
  it('Doppelseiten', () => {
    // 2,5 Doppelseiten Inhalt: Seiten bei 0, 1000, 1500 (die letzte endet am Ende)
    expect(pageCount(1500, 1000)).toBe(3);
    expect(pageCount(0, 1000)).toBe(1);
    expect(pagePos(1, 1500, 1000)).toBe(1000);
    expect(pagePos(2, 1500, 1000)).toBe(1500);
    expect(pagePos(9, 1500, 1000)).toBe(1500);
    expect(pageIndex(1499, 1500, 1000)).toBe(2);
    expect(pageIndex(980, 1500, 1000)).toBe(1);
    expect(snapPos(620, 1500, 1000)).toBe(1000);
    expect(secondsPerPage('3:00', 3, 1)).toBe(60);
    expect(secondsPerPage('3:00', 3, 2)).toBe(30);
  });
});

describe('Tastenkürzel', () => {
  const key = (k, mods = {}) => ({ key: k, ctrlKey: false, metaKey: false, altKey: false, ...mods });
  it('Strg/⌘ und einfache Tasten', () => {
    expect(keyMatches(key('k', { ctrlKey: true }), 'Mod+k')).toBe(true);
    expect(keyMatches(key('K', { metaKey: true }), 'Mod+k')).toBe(true);
    expect(keyMatches(key('k'), 'Mod+k')).toBe(false);
    expect(keyMatches(key('F'), 'f')).toBe(true);
    expect(keyMatches(key('f', { ctrlKey: true }), 'f')).toBe(false);
    expect(keyMatches(key('PageDown'), 'PageDown')).toBe(true);
  });
  it('findet die Aktion, nicht reine Hinweise', () => {
    expect(findShortcut(key('='), SHORTCUTS.app).id).toBe('up');
    expect(findShortcut(key(' '), SHORTCUTS.play).id).toBe('toggle');
    expect(findShortcut(key('x'), SHORTCUTS.app)).toBe(null);
  });
  it('keine Taste doppelt belegt', () => {
    for (const list of Object.values(SHORTCUTS)) {
      const all = list.flatMap((s) => s.keys.map((k) => k.toLowerCase()));
      expect(new Set(all).size).toBe(all.length);
    }
  });
});
