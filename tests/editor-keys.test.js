import { describe, it, expect } from './runner.js';
import { SHORTCUTS, findShortcut, keyMatches, shortcutLabel } from '../src/ui/shortcuts.js';

const key = (k, o = {}) => ({ key: k, code: '', ctrlKey: false, metaKey: false, altKey: false, ...o });

describe('Tastenkürzel für die Editor-Bausteine', () => {
  it('Alt+Taste trifft, ohne Alt oder mit Strg nicht', () => {
    expect(keyMatches(key('s', { altKey: true }), 'Alt+s')).toBe(true);
    expect(keyMatches(key('S', { altKey: true, code: 'KeyS' }), 'Alt+s')).toBe(true);
    expect(keyMatches(key('s'), 'Alt+s')).toBe(false);
    expect(keyMatches(key('s', { altKey: true, ctrlKey: true }), 'Alt+s')).toBe(false); // AltGr
    expect(keyMatches(key('s', { altKey: true }), 's')).toBe(false);
  });

  it('Mac: Alt+S liefert ß, zählt über e.code', () => {
    expect(keyMatches(key('ß', { altKey: true, code: 'KeyS' }), 'Alt+s')).toBe(true);
  });

  it('jeder Baustein hat ein eigenes Kürzel', () => {
    const ids = ['chord', 'verse', 'chorus', 'bridge', 'tab', 'abc', 'repeat', 'times', 'comment'];
    expect(SHORTCUTS.editor.map((s) => s.id)).toEqual(ids);
    const all = SHORTCUTS.editor.flatMap((s) => s.keys);
    expect(new Set(all).size).toBe(all.length);
    expect(findShortcut(key('r', { altKey: true }), SHORTCUTS.editor).id).toBe('chorus');
    expect(shortcutLabel(SHORTCUTS.editor, 'verse')).toBe('Alt+S');
    expect(shortcutLabel(SHORTCUTS.editor, 'gibtsnicht')).toBe('');
  });

  it('App-Kürzel reagieren nicht auf Alt', () => {
    expect(findShortcut(key('f', { altKey: true }), SHORTCUTS.app)).toBe(null);
  });
});
