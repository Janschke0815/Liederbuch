import { describe, it, expect } from './runner.js';
import { getAllMeta, setMeta } from '../src/core/meta-edit.js';
import { parseChordPro } from '../src/core/chordpro.js';
import { buildSongbook } from '../src/print/songbook.js';

const long = (title, cols) =>
  `{title: ${title}}\n${cols ? `{columns: ${cols}}\n` : ''}` +
  Array.from({ length: 70 }, (_, i) => `Zeile ${i + 1} mit [C]etwas [G]Text`).join('\n');

describe('Spalten pro Lied ({columns})', () => {
  it('Liedinfo liest und setzt {columns}; leer entfernt die Angabe', () => {
    let t = '{title: A}\n{tempo: 96}\n\n[C]la';
    t = setMeta(t, 'columns', '2');
    expect(t).toBe('{title: A}\n{tempo: 96}\n{columns: 2}\n\n[C]la');
    expect(getAllMeta(t).columns).toBe('2');
    expect(getAllMeta('{col: 1}').columns).toBe('1'); // Kurzform
    expect(setMeta(t, 'columns', '')).toBe('{title: A}\n{tempo: 96}\n\n[C]la');
  });

  it('Parser: {columns} und {col} landen in den Kopfangaben', () => {
    expect(parseChordPro('{columns: 2}').meta.columns).toBe('2');
    expect(parseChordPro('{col: 1}').meta.columns).toBe('1');
  });

  it('Druck: Lied-Spalten gehen vor der Einstellung, auch auf Folgeseiten', async () => {
    const root = document.createElement('div');
    document.getElementById('sandbox').append(root);
    try {
      const songs = [
        { id: 'a', title: 'Eins', chordpro: long('Eins', 2) },
        { id: 'b', title: 'Zwei', chordpro: long('Zwei') }, // wie Einstellung
        { id: 'c', title: 'Drei', chordpro: long('Drei', 1) },
      ];
      await buildSongbook(root, songs, { cover: false, toc: false, columns: 2, paper: 'A5' });
      const pages = [...root.querySelectorAll('.page:not(.page--probe)')];
      const colsOf = (title) => pages
        .filter((p) => p.querySelector('.song-title')?.textContent === title || p.dataset.song === title)
        .map((p) => p.querySelectorAll('.page-col').length);
      // Seiten je Lied finden: ein Lied beginnt immer auf einer neuen Seite
      const bySong = [];
      for (const p of pages) {
        const t = p.querySelector('.song-title')?.textContent;
        if (t) bySong.push({ title: t, pages: [] });
        bySong.at(-1).pages.push(p.querySelectorAll('.page-col').length);
      }
      expect(bySong.map((s) => s.title)).toEqual(['Eins', 'Zwei', 'Drei']);
      expect(bySong[0].pages.every((n) => n === 2)).toBe(true); // {columns: 2}
      expect(bySong[1].pages.every((n) => n === 2)).toBe(true); // Einstellung: 2
      expect(bySong[2].pages.every((n) => n === 1)).toBe(true); // {columns: 1}, auch Folgeseiten
      expect(bySong[2].pages.length > 1).toBe(true); // lang genug für eine Folgeseite
      expect(colsOf('x')).toEqual([]);
    } finally {
      root.remove();
    }
  });
});
