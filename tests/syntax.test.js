// Sichert die Syntax-Übersicht im Editor ("?"): alles, was dort steht, versteht der Parser so.
import { describe, it, expect } from './runner.js';
import { parseChordPro } from '../src/core/chordpro.js';
import { renderSong } from '../src/render/song-view.js';
import { transposeChordPro } from '../src/core/export-text.js';

const SONG = `{t: Clementine}
{st: Volkslied}
{artist: Percy Montrose}
{composer: Unbekannt}
{key: C}
{capo: 2}
{time: 3/4}
{tempo: 96}
{duration: 3:20}
{tag: Lagerfeuer}
{tag: Westernlied}
{album: Liederbuch}
{year: 1884}
{copyright: gemeinfrei}
{sorttitle: Clementine}
# nur im Editor sichtbar

{sov: Strophe 1}
In a [C]cavern, [G]canyon
[Am7] [D/F#] [Csus4] [Bb]
| [C] [G] | [Am] |
[*Riff] und weiter
[4] [-4] [-3'] [6o] [4 -4 5]
Oh my darling (2×)
{start_of_repeat: 3×}
Zeile eins
{end_of_repeat}
{eov}

{soc: Refrain 2×}
Oh my [C]darling
{eoc}

{sob}
Brücke
{eob}

{start_of_part: Intro}
[C]la
{end_of_part}

{sot: Riff}
e|---0---3---|
{eot}

{start_of_grid}
| C . . . | G . . . |
{end_of_grid}

{chorus}
{chorus: 2×}
{c: leise}
{ci: kursiv}
{cb: im Rahmen}
{np}
{colb}`;

describe('Syntax-Übersicht: alle Beispiele werden verstanden', () => {
  const song = parseChordPro(SONG);
  const lines = song.blocks.flatMap((b) => b.lines);

  it('Liedkopf inkl. Kurzformen', () => {
    const m = song.meta;
    expect([m.title, m.subtitle[0], m.artist[0], m.composer[0], m.key, m.capo, m.time, m.tempo, m.duration])
      .toEqual(['Clementine', 'Volkslied', 'Percy Montrose', 'Unbekannt', 'C', '2', '3/4', '96', '3:20']);
    expect(m.tag).toEqual(['Lagerfeuer', 'Westernlied']);
    expect([m.album, m.year, m.copyright, m.sorttitle]).toEqual(['Liederbuch', '1884', 'gemeinfrei', 'Clementine']);
    expect(song.unknown).toBe(undefined); // nichts davon wird ignoriert
  });

  it('Abschnitte mit Kurzformen und eigenen Namen', () => {
    expect(song.blocks.map((b) => b.kind)).toEqual(['verse', 'chorus', 'bridge', 'part', 'tab', 'grid', null]);
    expect(song.blocks[1].label).toBe('Refrain 2×');
    expect(song.blocks[4].lines[0].text).toBe('e|---0---3---|');
  });

  it('Akkorde, Anmerkung, Mundharmonika, #-Zeile', () => {
    const segs = lines.filter((l) => l.type === 'lyrics').flatMap((l) => l.segments).filter((s) => s.chord);
    expect(segs.some((s) => s.chord === 'Riff' && s.annotation)).toBe(true);
    expect(segs.filter((s) => s.harp).map((s) => s.chord)).toEqual(['4', '-4', "-3'", '6o', '4 -4 5']);
    expect(SONG.includes('# nur im Editor')).toBe(true);
    expect(JSON.stringify(song)).notToContain('nur im Editor');
    expect(transposeChordPro('[Am7] [D/F#] [Csus4] [Bb]', 2)).toBe('[Bm7] [E/G#] [Dsus4] [C]');
  });

  it('Wiederholungen, Verweise, Hinweise, Seiten- und Spaltenumbruch', () => {
    expect(lines.filter((l) => l.type === 'repeat-start').map((l) => l.label)).toEqual(['3×']);
    expect(lines.filter((l) => l.type === 'chorus-ref').map((l) => l.label)).toEqual([null, '2×']);
    expect(lines.filter((l) => l.type === 'comment').map((l) => l.style)).toEqual(['normal', 'italic', 'box']);
    expect(lines.filter((l) => l.type === 'new-page').length).toBe(1);
    expect(lines.filter((l) => l.type === 'column-break').length).toBe(1);
    const html = renderSong(song);
    expect(html.querySelectorAll('.repeat').length >= 4).toBe(true); // Zeile, Gruppe, Abschnitt, Verweis
  });
});
