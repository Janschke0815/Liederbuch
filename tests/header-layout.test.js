import { describe, it, expect } from './runner.js';
import { sanitize, applySettings } from '../src/settings/settings.js';
import { renderSong } from '../src/render/song-view.js';
import { parseChordPro } from '../src/core/chordpro.js';
import { buildSongbook } from '../src/print/songbook.js';

const SONG = '{title: Clementine}\n{artist: Percy Montrose}\n{key: C}\n[C]Oh my darling';
const long = (cols) => `{title: Lang}\n{artist: Jemand}\n${cols ? `{columns: ${cols}}\n` : ''}` +
  Array.from({ length: 60 }, (_, i) => `Zeile ${i + 1} [C]mit [G]Text`).join('\n');

describe('Liedkopf: Interpret neben dem Titel', () => {
  it('Standard: Interpret darunter; eingeschaltet: in derselben Zeile mit „– “', () => {
    expect(sanitize({}).artistInline).toBe(false);
    const root = document.createElement('div');
    root.className = 'songbook';
    root.style.width = '40em';
    root.append(renderSong(parseChordPro(SONG)));
    document.body.append(root);
    const title = root.querySelector('.song-title');
    const artist = root.querySelector('.song-artist');
    const info = root.querySelector('.song-info');
    try {
      applySettings(root, {});
      expect(artist.getBoundingClientRect().top >= title.getBoundingClientRect().bottom - 1).toBe(true);
      applySettings(root, { artistInline: true });
      const t = title.getBoundingClientRect();
      const a = artist.getBoundingClientRect();
      expect(a.left > t.right - 1).toBe(true); // rechts neben dem Titel
      expect(a.top < t.bottom && a.bottom > t.top).toBe(true); // gleiche Zeile
      expect(getComputedStyle(artist, '::before').content).toBe('"– "');
      expect(info.getBoundingClientRect().top >= t.bottom - 1).toBe(true); // Infozeile darunter
    } finally {
      root.remove();
    }
  });
});

describe('Druck: zweispaltige Lieder', () => {
  async function pagesOf(chordpro, options = {}) {
    const root = document.createElement('div');
    document.getElementById('sandbox').append(root);
    await buildSongbook(root, [{ id: 'x', title: 'Lang', chordpro }], { cover: false, toc: false, paper: 'A5', ...options });
    return { root, pages: [...root.querySelectorAll('.page:not(.page--probe)')] };
  }

  it('Liedkopf steht über beiden Spalten, die zweite Spalte beginnt darunter', async () => {
    const { root, pages } = await pagesOf(long(2));
    try {
      const first = pages[0];
      const head = first.querySelector('.page-head .song-header');
      expect(Boolean(head)).toBe(true);
      expect(head.querySelector('.song-title').textContent).toBe('Lang');
      const cols = [...first.querySelectorAll('.page-col')];
      expect(cols.length).toBe(2);
      const headBottom = head.getBoundingClientRect().bottom;
      expect(cols.every((c) => c.getBoundingClientRect().top >= headBottom - 1)).toBe(true);
      expect(cols[1].textContent.trim().length > 0).toBe(true); // zweite Spalte ist befüllt
      expect(first.querySelector('.page-col .song-header')).toBe(null); // nicht doppelt
      // Folgeseiten ohne Kopf, weiter zweispaltig
      for (const p of pages.slice(1)) {
        expect(p.querySelector('.page-head')).toBe(null);
        expect(p.querySelectorAll('.page-col').length).toBe(2);
      }
    } finally {
      root.remove();
    }
  });

  it('einspaltige Lieder bleiben wie bisher (Kopf in der Spalte)', async () => {
    const { root, pages } = await pagesOf(long(), { columns: 1 });
    try {
      expect(pages[0].querySelector('.page-head')).toBe(null);
      expect(Boolean(pages[0].querySelector('.page-col .song-header'))).toBe(true);
    } finally {
      root.remove();
    }
  });
});
