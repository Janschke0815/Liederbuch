import { describe, it, expect } from './runner.js';
import { toFileJson, toWindowsText } from '../src/core/file-format.js';
import { songToFile, fileToSong } from '../src/sync/chordpro-files.js';
import { parseChordPro } from '../src/core/chordpro.js';

describe('Dateien für Windows (CR LF)', () => {
  it('JSON: eingerückt, jede Zeile mit CR LF, keine einzelnen LF', () => {
    const text = toFileJson({ songs: [{ id: 'a', chordpro: '{title: A}\n[C]la' }] });
    expect(text.includes('\r\n  "songs": [')).toBe(true);
    expect(/[^\r]\n/.test(text)).toBe(false); // kein LF ohne CR davor
    expect(text.endsWith('}\r\n')).toBe(true);
    // Liedtext bleibt unverändert: der Umbruch darin ist die Zeichenfolge \n im JSON
    expect(JSON.parse(text).songs[0].chordpro).toBe('{title: A}\n[C]la');
  });

  it('Text: LF, CR und CR LF werden einheitlich zu CR LF', () => {
    expect(toWindowsText('a\nb\r\nc\rd')).toBe('a\r\nb\r\nc\r\nd');
    expect(parseChordPro(toWindowsText('{title: T}\n[C]la')).meta.title).toBe('T');
  });

  it('Lied-Datei für WebDAV: jede Zeile mit CR LF, liest sich wieder ein', () => {
    const file = songToFile({ chordpro: '{title: A}\n\n[C]la\n[G]li', transpose: 0, accidentals: 'auto', note: '' });
    expect(file).toBe('{title: A}\r\n\r\n[C]la\r\n[G]li');
    expect(/[^\r]\n/.test(file)).toBe(false);
    expect(fileToSong(file).chordpro).toBe('{title: A}\n\n[C]la\n[G]li');
  });
});
