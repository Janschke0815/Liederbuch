import { describe, it, expect } from './runner.js';
import {
  DEFAULT_SETTINGS, sanitize, applySettings, loadSettings, saveSettings,
} from '../src/settings/settings.js';
import { parseChordPro } from '../src/core/chordpro.js';
import { renderSong } from '../src/render/song-view.js';
import { buildSongbook } from '../src/print/songbook.js';

// Speicher-Attrappe statt echtem localStorage
function memoryStorage(init = {}) {
  const m = new Map(Object.entries(init));
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    dump: () => Object.fromEntries(m),
  };
}

function songbookEl(settings, src) {
  const el = document.createElement('div');
  el.className = 'songbook';
  applySettings(el, settings);
  el.append(renderSong(parseChordPro(src)));
  document.getElementById('sandbox').append(el);
  return el;
}

describe('Einstellungen: Werte', () => {
  it('liefert Standardwerte für leere oder kaputte Eingaben', () => {
    expect(sanitize()).toEqual({ ...DEFAULT_SETTINGS });
    expect(sanitize(null)).toEqual({ ...DEFAULT_SETTINGS });
    expect(sanitize('quatsch')).toEqual({ ...DEFAULT_SETTINGS });
  });

  it('begrenzt und prüft einzelne Werte', () => {
    const s = sanitize({
      lyricFont: 'Comic Sans', lyricSize: 99, chordSize: '9', chordColor: '#1F4E9C',
      chordBold: 'ja', chorusStyle: 'box', columns: '2', margin: 2.4, paper: 'A3', lineSpacing: 'wide',
    });
    expect([s.lyricFont, s.lyricSize, s.chordSize, s.chordColor, s.chordBold, s.chorusStyle, s.columns, s.margin, s.paper, s.lineSpacing])
      .toEqual(['Georgia', 28, 9, '#1f4e9c', true, 'box', 2, 5, 'A4', 'wide']);
    expect(sanitize({ chordColor: 'red' }).chordColor).toBe('#b3261e');
  });

  it('speichert, lädt und meldet Änderungen', () => {
    const st = memoryStorage();
    let event = null;
    const listener = (e) => (event = e.detail);
    addEventListener('settingschange', listener);
    saveSettings({ ...DEFAULT_SETTINGS, chordColor: '#2e7d32', columns: 2 }, st);
    removeEventListener('settingschange', listener);
    expect(loadSettings(st).chordColor).toBe('#2e7d32');
    expect(loadSettings(st).columns).toBe(2);
    expect(event.chordColor).toBe('#2e7d32');
  });

  it('übernimmt alte Einzelwerte (Refrain-Stil, Druckoptionen)', () => {
    const st = memoryStorage({ chorusStyle: 'indent', printOptions: JSON.stringify({ columns: 2, margin: 20, paper: 'A5', title: 'x' }) });
    const s = loadSettings(st);
    expect([s.chorusStyle, s.columns, s.margin, s.paper]).toEqual(['indent', 2, 20, 'A5']);
    saveSettings(s, st);
    expect(st.getItem('chorusStyle')).toBe(null);
  });
});

describe('Einstellungen: Darstellung', () => {
  it('Akkordfarbe, Schriftgröße und fett wirken auf die Akkorde', () => {
    const el = songbookEl({ chordColor: '#1f4e9c', chordSize: 15, chordBold: false, chordFont: 'Courier New' }, '[G]Hallo');
    const cs = getComputedStyle(el.querySelector('.chord'));
    expect(cs.color).toBe('rgb(31, 78, 156)');
    expect(cs.fontSize).toBe('20px'); // 15pt
    expect(cs.fontWeight).toBe('400');
    expect(cs.fontFamily).toContain('Courier New');
    el.remove();
  });

  it('Textschrift und Zeilenabstand wirken auf den Liedtext', () => {
    const el = songbookEl({ lyricFont: 'Arial', lyricSize: 9, lineSpacing: 'wide' }, 'Hallo [C]Welt');
    const cs = getComputedStyle(el.querySelector('.song'));
    expect(cs.fontSize).toBe('12px'); // 9pt
    expect(cs.fontFamily).toContain('Arial');
    expect(cs.lineHeight).toBe(`${12 * 1.45}px`);
    el.remove();
  });

  it('Refrain-Stile und ausgeblendete Abschnittsnamen', () => {
    const src = '{sov: Strophe}\n[C]la\n{eov}\n{soc}\n[G]li\n{eoc}';
    const indent = songbookEl({ chorusStyle: 'indent' }, src);
    expect(getComputedStyle(indent.querySelector('.block--chorus')).marginLeft !== '0px').toBe(true);
    expect(getComputedStyle(indent.querySelector('.block--verse')).marginLeft).toBe('0px');
    indent.remove();

    const box = songbookEl({ chorusStyle: 'box', showLabels: false }, src);
    expect(getComputedStyle(box.querySelector('.block--chorus')).borderTopStyle).toBe('solid');
    expect(getComputedStyle(box.querySelector('.block-label')).display).toBe('none');
    box.remove();

    const plain = songbookEl({ chorusStyle: 'plain' }, src);
    const c = getComputedStyle(plain.querySelector('.block--chorus'));
    expect([c.marginLeft, c.borderLeftStyle]).toEqual(['0px', 'none']);
    plain.remove();
  });

  it('größere Schrift ergibt im Druck mehr Seiten', async () => {
    const long = Array.from({ length: 40 }, (_, i) => `Zeile [G]${i + 1} mit [C]Text`).join('\n');
    const songs = [{ id: 'x', title: 'Lang', chordpro: `{title: Lang}\n${long}` }];
    const pages = async (settings) => {
      const root = document.createElement('div');
      document.getElementById('sandbox').append(root);
      applySettings(root, settings);
      const r = await buildSongbook(root, songs, { cover: false, toc: false, paper: 'A5' });
      root.remove();
      return r.pages;
    };
    const small = await pages({ lyricSize: 9, chordSize: 8 });
    const big = await pages({ lyricSize: 18, chordSize: 15 });
    expect(big > small).toBe(true);
  });
});
