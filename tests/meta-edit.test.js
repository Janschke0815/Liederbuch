import { describe, it, expect } from './runner.js';
import { getMeta, getAllMeta, setMeta } from '../src/core/meta-edit.js';
import { parseChordPro } from '../src/core/chordpro.js';

const SONG = '{title: Clementine}\n{artist: Traditional}\n{key: C}\n\n{start_of_verse}\n[C]In a cavern\n{end_of_verse}';

describe('Liedinfo: lesen', () => {
  it('liest Kopfangaben inkl. Kurzform {t:}', () => {
    expect(getAllMeta('{t: Hallo}\n{capo: 2}\n{time: 3/4}')).toEqual({
      title: 'Hallo', artist: '', key: '', capo: '2', time: '3/4', tempo: '', columns: '',
    });
  });
});

describe('Liedinfo: setzen', () => {
  it('fügt Capo und Takt im Kopf an passender Stelle ein', () => {
    let t = setMeta(SONG, 'time', '3/4');
    t = setMeta(t, 'capo', '2');
    expect(t.split('\n').slice(0, 6)).toEqual([
      '{title: Clementine}', '{artist: Traditional}', '{key: C}', '{capo: 2}', '{time: 3/4}', '',
    ]);
    const meta = parseChordPro(t).meta;
    expect([meta.capo, meta.time]).toEqual(['2', '3/4']);
  });

  it('ersetzt vorhandene Angaben und entfernt sie bei leerem Wert', () => {
    let t = setMeta(SONG, 'key', 'G');
    expect(getMeta(t, 'key')).toBe('G');
    t = setMeta(t, 'key', '');
    expect(t.includes('{key')).toBe(false);
    expect(setMeta(SONG, 'capo', '')).toBe(SONG);
  });

  it('Lied ohne Kopf: Angabe oben, Leerzeile davor', () => {
    expect(setMeta('[C]la la', 'capo', '3')).toBe('{capo: 3}\n\n[C]la la');
    expect(setMeta('', 'title', 'Neu')).toBe('{title: Neu}\n');
  });

  it('geschweifte Klammern im Wert werden entfernt', () => {
    expect(getMeta(setMeta('', 'title', 'A{b}c'), 'title')).toBe('Abc');
  });
});

import { ugToChordPro } from '../src/core/ug-import.js';
import { renderSong } from '../src/render/song-view.js';

describe('Capo und Takt: Anzeige und Import', () => {
  it('Liedkopf zeigt Capo, Takt und Tempo', () => {
    const el = renderSong(parseChordPro('{title: X}\n{key: G}\n{capo: 2}\n{time: 3/4}\n{tempo: 96}\n[G]la'));
    expect(el.querySelector('.song-info').textContent).toBe('Tonart: G · Capo 2. Bund · 3/4-Takt · ♩ = 96');
  });
  it('Import erkennt Takt und Tempo', () => {
    const cp = ugToChordPro('Capo: 3rd fret\nTime: 6/8\nTempo: 120 bpm\n\nC\nla', { title: 'X' });
    expect(cp.split('\n').slice(0, 4)).toEqual(['{title: X}', '{capo: 3}', '{time: 6/8}', '{tempo: 120}']);
  });
});
