import { describe, it, expect } from './runner.js';
import { isHarpNote, isHarpTab, isHarpLine } from '../src/core/harp.js';
import { parseChordPro, parseLyricsLine } from '../src/core/chordpro.js';
import { renderSong, usedChords } from '../src/render/song-view.js';
import { ugToChordPro } from '../src/core/ug-import.js';
import { transposeChordPro } from '../src/core/export-text.js';
import { applySettings, sanitize } from '../src/settings/settings.js';

describe('Mundharmonika: Schreibweise', () => {
  it('erkennt Blas-, Zieh-, Bending- und Overblow-Töne', () => {
    for (const t of ['4', '-4', '+4', "-3'", "-3''", '-3b', '6o', '6°', '10', '-12']) expect(isHarpNote(t)).toBe(true);
    for (const t of ['C', 'Am7', '0', '17', '4x', 'x2', '--4', '']) expect(isHarpNote(t)).toBe(false);
  });

  it('mehrere Töne in einer Klammer', () => {
    expect(isHarpTab('4 -4 5')).toBe(true);
    expect(isHarpTab('4 C')).toBe(false);
  });

  it('ganze Zeilen nur mit Zieh-/Biegeton oder ab drei Tönen (nicht "1 2")', () => {
    expect(isHarpLine('  4   -4  5   -5  6')).toBe(true);
    expect(isHarpLine('-4')).toBe(true);
    expect(isHarpLine('4 4 5 | 6')).toBe(true);
    expect(isHarpLine('1 2')).toBe(false);
    expect(isHarpLine('C G Am')).toBe(false);
  });
});

describe('Mundharmonika: im Lied', () => {
  it('Parser markiert Tabs, Akkorde bleiben Akkorde', () => {
    const l = parseLyricsLine('Oh [C]Su[-4]san[5]na');
    expect(l.segments.map((s) => [s.chord, Boolean(s.harp)])).toEqual([[null, false], ['C', false], ['-4', true], ['5', true]]);
    expect(parseLyricsLine('[4] [-4] [5]').harpOnly).toBe(true);
    expect(parseLyricsLine('[C] [-4]').harpOnly).toBe(undefined);
  });

  it('Tabs zählen nicht als Akkorde und werden nicht transponiert', () => {
    const text = '{title: T}\n{key: C}\n[C]Oh [-4]Su[G]sanna\n[4] [-4] [5]';
    expect(usedChords(parseChordPro(text))).toEqual(['C', 'G']);
    const out = transposeChordPro(text, 2);
    expect(out).toContain('[D]Oh [-4]Su[A]sanna');
    expect(out).toContain('[4] [-4] [5]');
    const html = renderSong(parseChordPro(text), { transpose: 2 });
    expect([...html.querySelectorAll('.chord.harp')].map((e) => e.textContent)).toEqual(['-4', '4', '-4', '5']);
    expect(html.querySelectorAll('.line--harp-only').length).toBe(1);
  });

  it('Einfügen: Tab-Zeile über dem Text wird zu Klammern an der richtigen Silbe', () => {
    const out = ugToChordPro('4    -4   5\nOh Susanna don\'t\n\n-4 -5 -6 -4 -5 -6');
    // Spalten: 4 über "O", -4 über "s" (Spalte 5), 5 über dem Leerzeichen vor "don't"
    expect(out).toContain("[4]Oh Su[-4]sanna[5] don't");
    expect(out).toContain('[-4] [-5] [-6] [-4] [-5] [-6]');
    expect(out).notToContain('start_of_tab');
  });
});

describe('Mundharmonika/Gitarren-Tabs: Schalter', () => {
  it('Standard an, Werte werden geprüft, als data-Attribut gesetzt', () => {
    expect(sanitize({}).showHarp).toBe(true);
    expect(sanitize({}).showTabs).toBe(true);
    expect(sanitize({ showHarp: 'nein' }).showHarp).toBe(true);
    const el = document.createElement('div');
    applySettings(el, { showHarp: false, showTabs: false });
    expect([el.dataset.harp, el.dataset.tabs]).toEqual(['hide', 'hide']);
  });

  it('ausgeblendet: Tabs und reine Tab-Zeilen verschwinden, Akkorde und Text bleiben', () => {
    const root = document.createElement('div');
    root.className = 'songbook';
    root.append(renderSong(parseChordPro('[C]Oh [-4]Su[G]sanna\n[4] [-4] [5]\n\n{start_of_tab}\ne|--0--|\n{end_of_tab}\n\n{start_of_part: Solo}\n[4] [5]\n{end_of_part}')));
    document.body.append(root);
    const visible = (sel) => [...root.querySelectorAll(sel)].filter((e) => e.offsetParent !== null).length;
    try {
      applySettings(root, { showHarp: true, showTabs: true });
      expect([visible('.chord.harp'), visible('.block--tab'), visible('.block--harp-only')]).toEqual([6, 1, 1]);
      applySettings(root, { showHarp: false, showTabs: false });
      expect([visible('.chord.harp'), visible('.line--harp-only'), visible('.block--tab'), visible('.block--harp-only')]).toEqual([0, 0, 0, 0]);
      expect(visible('.chord:not(.harp)')).toBe(2);
      expect(root.textContent).toContain('sanna');
    } finally {
      root.remove();
    }
  });
});
