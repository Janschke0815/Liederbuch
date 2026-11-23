import { describe, it, expect } from './runner.js';
import { cleanPins, togglePin, movePin } from '../src/core/toolbar-pins.js';

const ALL = ['btn-import', 'btn-open', 'btn-print', 'btn-live', 'btn-settings'];

describe('Kopfleiste: angeheftete Aktionen', () => {
  it('säubert gespeicherte Werte', () => {
    expect(cleanPins(['btn-print', 'btn-weg', 'btn-print', 'btn-import'], ALL)).toEqual(['btn-print', 'btn-import']);
    expect(cleanPins('kaputt', ALL)).toEqual([]);
    expect(cleanPins(null, ALL)).toEqual([]);
  });

  it('anheften hängt hinten an, lösen entfernt', () => {
    expect(togglePin(['btn-import'], 'btn-settings')).toEqual(['btn-import', 'btn-settings']);
    expect(togglePin(['btn-import', 'btn-settings'], 'btn-import')).toEqual(['btn-settings']);
  });

  it('verschieben, am Rand bleibt alles', () => {
    const p = ['btn-import', 'btn-print', 'btn-live'];
    expect(movePin(p, 'btn-live', -1)).toEqual(['btn-import', 'btn-live', 'btn-print']);
    expect(movePin(p, 'btn-import', 1)).toEqual(['btn-print', 'btn-import', 'btn-live']);
    expect(movePin(p, 'btn-import', -1)).toEqual(p);
    expect(movePin(p, 'btn-live', 1)).toEqual(p);
    expect(movePin(p, 'btn-open', 1)).toEqual(p); // nicht angeheftet
  });
});
