import { describe, it, expect } from './runner.js';
import { toFileJson, toWindowsText } from '../src/core/file-format.js';
import { WebDavProvider } from '../src/sync/webdav.js';
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

  it('WebDAV schreibt die Datei mit CR LF und liest sie wieder', async () => {
    let stored = null;
    const fetch = async (url, { method, body }) => {
      if (method === 'PUT') {
        stored = body;
        return new Response(null, { status: 201, headers: { ETag: '"1"' } });
      }
      if (method === 'GET') return stored ? new Response(stored, { status: 200, headers: { ETag: '"1"' } }) : new Response('', { status: 404 });
      return new Response('', { status: 405 });
    };
    const p = new WebDavProvider({ url: 'https://nas.example/Liederbuch/', user: 'u', password: 'p', fetch });
    await p.read(null);
    await p.write({ format: 'liederbuch-sync', version: 2, songs: [{ id: 'a', chordpro: 'x' }] }, null);
    expect(stored.includes('\r\n')).toBe(true);
    expect(/[^\r]\n/.test(stored)).toBe(false);
    expect((await p.read(null)).data.songs[0].id).toBe('a');
  });
});
