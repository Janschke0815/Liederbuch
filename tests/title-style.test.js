import { describe, it, expect } from './runner.js';
import { sanitize, applySettings, DEFAULT_SETTINGS } from '../src/settings/settings.js';
import { renderSong } from '../src/render/song-view.js';
import { parseChordPro } from '../src/core/chordpro.js';

describe('Einstellungen: Titel & Interpret', () => {
  it('Standardwerte entsprechen dem bisherigen Aussehen; ungültige Werte werden korrigiert', () => {
    const d = sanitize({});
    expect([d.titleFont, d.titleSize, d.titleBold, d.titleUppercase, d.headerAlign, d.showArtist, d.artistItalic])
      .toEqual(['', 19, true, false, 'left', true, true]);
    const bad = sanitize({ titleFont: 'Comic Sans', titleSize: 99, titleColor: 'rot', headerAlign: 'rechts', artistSize: 1 });
    expect([bad.titleFont, bad.titleSize, bad.titleColor, bad.headerAlign, bad.artistSize]).toEqual(['', 40, DEFAULT_SETTINGS.titleColor, 'left', 7]);
  });

  it('wirkt im Liedkopf: Größe, Schrift, Fett, Großbuchstaben, Farbe, Ausrichtung, Interpret', () => {
    const root = document.createElement('div');
    root.className = 'songbook';
    root.append(renderSong(parseChordPro('{title: Clementine}\n{artist: Percy Montrose}\n[C]Oh my darling')));
    document.body.append(root);
    const title = root.querySelector('.song-title');
    const artist = root.querySelector('.song-artist');
    try {
      applySettings(root, {});
      expect(getComputedStyle(title).fontFamily).toBe(getComputedStyle(root.querySelector('.song')).fontFamily); // wie Liedtext
      applySettings(root, {
        titleFont: 'Arial', titleSize: 24, titleBold: false, titleUppercase: true, titleColor: '#1f4e9c',
        headerAlign: 'center', artistSize: 9, artistItalic: false, artistColor: '#666666',
      });
      const t = getComputedStyle(title);
      expect([t.fontSize, t.fontWeight, t.textTransform, t.color, t.textAlign]).toEqual(['32px', '400', 'uppercase', 'rgb(31, 78, 156)', 'center']);
      expect(t.fontFamily.includes('Arial')).toBe(true);
      const a = getComputedStyle(artist);
      expect([a.fontSize, a.fontStyle, a.color]).toEqual(['12px', 'normal', 'rgb(102, 102, 102)']);
      applySettings(root, { showArtist: false });
      expect(getComputedStyle(artist).display).toBe('none');
    } finally {
      root.remove();
    }
  });
});
