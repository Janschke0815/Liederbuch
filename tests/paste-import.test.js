import { describe, it, expect } from './runner.js';
import { detectHeader, splitPastedSongs, pastedToSongs } from '../src/core/paste-import.js';

const BODY = '[Verse 1]\nC        G\nOh my darling\n';

describe('Einfügen: Titel und Interpret erkennen', () => {
  const cases = [
    ['Clementine Chords by Traditional\n\n' + BODY, 'Clementine', 'Traditional'],
    ['CLEMENTINE CHORDS by Traditional @ Ultimate-Guitar.Com\n' + BODY, 'CLEMENTINE', 'Traditional'],
    ['Clementine Ukulele Chords by Percy Montrose\n' + BODY, 'Clementine', 'Percy Montrose'],
    ['Traditional - Clementine\n\n' + BODY, 'Clementine', 'Traditional'],
    ['Title: Clementine\nArtist: Traditional\n' + BODY, 'Clementine', 'Traditional'],
    ['Clementine\nTraditional\n\n' + BODY, 'Clementine', 'Traditional'],
    ['Clementine\n\n' + BODY, 'Clementine', ''],
  ];
  for (const [text, title, artist] of cases) {
    it(`„${text.split('\n')[0]}“`, () => {
      const h = detectHeader(text);
      expect([h.title, h.artist]).toEqual([title, artist]);
      expect(h.body.trimStart().startsWith('[Verse 1]')).toBe(true);
    });
  }

  it('Füllwerk der Webseite fällt weg, Capo/Tonart bleiben', () => {
    const h = detectHeader('Clementine Chords by Traditional\nDifficulty: novice\nTuning: E A D G B E\nCapo: 2nd fret\n\n' + BODY);
    expect(h.body.includes('Difficulty')).toBe(false);
    expect(h.body.includes('Capo: 2nd fret')).toBe(true);
  });

  it('ohne Kopf wird nichts geraten (Liedtext bleibt Liedtext)', () => {
    const h = detectHeader('In a cavern, in a canyon\nExcavating for a mine\nDwelt a miner\n');
    expect([h.title, h.artist]).toEqual(['', '']);
    const h2 = detectHeader(BODY);
    expect(h2.body).toBe(BODY);
  });
});

describe('Einfügen: mehrere Lieder', () => {
  it('trennt an Linien und an neuen "… Chords by …"-Zeilen', () => {
    const text = 'A Chords by X\n' + BODY + '\n---\nB Chords by Y\n' + BODY + '\nC Chords by Z\n' + BODY;
    expect(splitPastedSongs(text).length).toBe(3);
    const songs = pastedToSongs(text);
    expect(songs.map((s) => `${s.title}/${s.artist}`)).toEqual(['A/X', 'B/Y', 'C/Z']);
    expect(songs[0].chordpro).toContain('{title: A}');
    expect(songs[0].chordpro).toContain('[C]Oh my dar[G]ling');
  });

  it('Felder im Dialog überschreiben die Erkennung bei einem Lied', () => {
    const [s] = pastedToSongs('Clementine Chords by Traditional\n' + BODY, { title: 'Meine Clementine' });
    expect([s.title, s.artist]).toEqual(['Meine Clementine', 'Traditional']);
  });

  it('ChordPro wird erkannt und nicht umgewandelt', () => {
    const songs = pastedToSongs('{title: Eins}\n[G]la\n{new_song}\n{title: Zwei}\n[C]li');
    expect(songs.map((s) => s.title)).toEqual(['Eins', 'Zwei']);
    expect(songs[0].chordpro).toBe('{title: Eins}\n[G]la\n');
  });
});
