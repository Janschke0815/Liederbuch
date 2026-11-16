import { describe, it, expect } from './runner.js';
import { bookmarkletHref, readUgHash, stripUgMarkup, ugDataToText } from '../src/formats/ug-bookmarklet.js';
import { pastedToSongs } from '../src/formats/paste-import.js';
import { parseChordPro } from '../src/core/chordpro.js';

// So legt Ultimate Guitar ein Lied in window.UGAPP ab (nur der Aufbau, gemeinfreies Lied)
const UG_PAGE = {
  tab: { song_name: 'Clementine', artist_name: 'Traditional', type: 'Chords', tonality_name: 'C' },
  tab_view: {
    meta: { capo: 2, tonality: 'C', tuning: { name: 'Standard', value: 'E A D G B E' } },
    strummings: [{ part: 'Whole song', denuminator: 8, bpm: 96 }],
    wiki_tab: {
      content: '[Verse 1]\r\n[tab]In a [ch]C[/ch]cavern, in a [ch]G[/ch]canyon\r\nExcavating for a [ch]C[/ch]mine[/tab]\r\n\r\n[Chorus]\r\n[tab][ch]C[/ch]                [ch]G[/ch]\r\nOh my darling, oh my darling[/tab]',
    },
  },
};

/** Lesezeichen-Code in einer nachgebauten Seite ausführen; liefert die geöffnete Adresse. */
function runBookmarklet({ page = UG_PAGE, selection = '', title = '', pres = [] } = {}) {
  const href = bookmarkletHref('https://example.org/liederbuch/');
  const code = decodeURIComponent(href.slice('javascript:'.length));
  const opened = [];
  const alerts = [];
  const win = {
    UGAPP: page ? { store: { page: { data: page } } } : undefined,
    getSelection: () => selection,
    open: (url, name) => (opened.push({ url, name }), {}),
  };
  const doc = {
    title,
    querySelector: () => null,
    querySelectorAll: () => pres.map((t) => ({ innerText: t })),
  };
  new Function('window', 'document', 'location', 'alert', code)(win, doc, {}, (m) => alerts.push(m));
  return { opened, alerts, href, code };
}

describe('Lesezeichen: Ultimate Guitar', () => {
  it('Lesezeichen ist eine einzige Zeile und öffnet die App mit #ug=', () => {
    const { href, code, opened } = runBookmarklet();
    expect(href.startsWith('javascript:')).toBe(true);
    expect(code.includes('\n')).toBe(false);
    expect(opened.length).toBe(1);
    expect(opened[0].name).toBe('liederbuch');
    expect(opened[0].url.startsWith('https://example.org/liederbuch/#ug=')).toBe(true);
  });

  it('liest Titel, Interpret, Capo, Tonart, Tempo und Text aus der Seite', () => {
    const d = readUgHash('#' + runBookmarklet().opened[0].url.split('#')[1]);
    expect([d.title, d.artist, d.capo, d.key, d.bpm, d.tuning]).toEqual(['Clementine', 'Traditional', 2, 'C', 96, 'E A D G B E']);
    expect(d.content).toContain('[ch]C[/ch]cavern');
  });

  it('ohne UG-Daten: markierter Text, sonst längster Textblock mit Titel aus dem Seitentitel', () => {
    let r = runBookmarklet({ page: null, selection: 'C   G\nOh my darling' });
    expect(readUgHash('#' + r.opened[0].url.split('#')[1]).content).toBe('C   G\nOh my darling');
    r = runBookmarklet({ page: null, title: 'CLEMENTINE CHORDS by Traditional @ Ultimate-Guitar.Com', pres: ['kurz', 'C              G\nIn a cavern, in a canyon, excavating for a mine'] });
    const d = readUgHash('#' + r.opened[0].url.split('#')[1]);
    expect([d.title, d.artist]).toEqual(['CLEMENTINE', 'Traditional']);
    expect(d.content).toContain('cavern');
  });

  it('nichts gefunden: Hinweis statt leerem Lied', () => {
    const r = runBookmarklet({ page: null });
    expect(r.opened.length).toBe(0);
    expect(r.alerts[0]).toContain('kein Lied gefunden');
  });

  it('Markierungen [ch] und [tab] werden zu "Akkorde über dem Text"', () => {
    expect(stripUgMarkup('[tab][ch]C[/ch]     [ch]G[/ch]\r\nOh my[/tab]')).toBe('C     G\nOh my');
    // Akkorde mitten im Text: eigene Akkordzeile darüber, gleiche Spalte (C über "cavern", G über "canyon")
    expect(stripUgMarkup('In a [ch]C[/ch]cavern, in a [ch]G[/ch]canyon')).toBe('     C            G\nIn a cavern, in a canyon');
    // reine Akkordzeilen mit Taktstrichen bleiben, wie sie sind
    expect(stripUgMarkup('| [ch]Am[/ch] | [ch]F[/ch] |')).toBe('| Am | F |');
  });

  it('ergibt beim Einfügen ein fertiges Lied mit Titel, Interpret, Capo, Tonart und Tempo', () => {
    const d = readUgHash('#' + runBookmarklet().opened[0].url.split('#')[1]);
    const songs = pastedToSongs(ugDataToText(d));
    expect(songs.length).toBe(1);
    const song = parseChordPro(songs[0].chordpro);
    expect([song.meta.title, song.meta.artist?.[0], song.meta.capo, song.meta.key, song.meta.tempo]).toEqual(['Clementine', 'Traditional', '2', 'C', '96']);
    expect(songs[0].chordpro).toContain('In a [C]cavern, in a [G]canyon'); // Akkorde im Text
    expect(songs[0].chordpro).toContain('[C]Oh my darling, oh[G] my darling'); // Akkordzeile darüber
    expect(songs[0].chordpro).notToContain('Tuning'); // Standardstimmung nicht extra erwähnen
  });

  it('Adresse: kaputte oder fremde Daten werden ignoriert', () => {
    expect(readUgHash('#ug=%7Bkaputt')).toBe(null);
    expect(readUgHash('#ug=' + encodeURIComponent('{"content":"  "}'))).toBe(null);
    expect(readUgHash('#anders')).toBe(null);
    const d = ugDataToText({ title: 'A\nB', capo: 'x', key: '<b>', bpm: 9999, tuning: 'D A D G B E', content: 'C\nla' });
    expect(d).toBe('Title: A B\nTuning: D A D G B E\n\nC\nla');
  });
});
