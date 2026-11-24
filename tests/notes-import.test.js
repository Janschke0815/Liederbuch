import { describe, it, expect } from './runner.js';
import { keyFromFifths, musicXmlToAbc, readMxl } from '../src/core/musicxml.js';
import { abcForSong, abcSection, looksLikeNotes, placeNotes, readNotes, splitAbcTunes } from '../src/core/abc-import.js';
import { abcMelody } from '../src/core/harp-melody.js';
import { parseChordPro } from '../src/core/chordpro.js';

/** Kleine Partitur wie aus MuseScore: G-Dur, 3/4, Auftakt, Akkorde, Liedtext, Bindebogen, Triole, Wiederholung. */
const note = (step, oct, dur, { type = 'quarter', alter, lyric, syl = 'single', tie, beam, voice = 1, chord, rest } = {}) => `
  <note>${chord ? '<chord/>' : ''}${rest ? '<rest/>' : `<pitch><step>${step}</step>${alter !== undefined ? `<alter>${alter}</alter>` : ''}<octave>${oct}</octave></pitch>`}
    <duration>${dur}</duration>${tie ? `<tie type="${tie}"/>` : ''}<voice>${voice}</voice><type>${type}</type>
    ${beam ? `<beam number="1">${beam}</beam>` : ''}
    ${lyric ? `<lyric number="1"><syllabic>${syl}</syllabic><text>${lyric}</text></lyric>` : ''}
  </note>`;
const harmony = (root, kind, alter) => `<harmony><root><root-step>${root}</root-step>${alter ? `<root-alter>${alter}</root-alter>` : ''}</root><kind>${kind}</kind></harmony>`;

const XML = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  <work><work-title>Testlied</work-title></work>
  <identification><creator type="composer">Volksweise</creator></identification>
  <part-list><score-part id="P1"><part-name>Gesang</part-name></score-part><score-part id="P2"><part-name>Klavier</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>2</divisions><key><fifths>1</fifths><mode>major</mode></key><time><beats>3</beats><beat-type>4</beat-type></time></attributes>
      <direction><sound tempo="96"/></direction>
      <barline location="left"><repeat direction="forward"/></barline>
      ${harmony('G', 'major')}
      ${note('G', 4, 2, { lyric: 'Al', syl: 'begin' })}
      ${note('A', 4, 1, { type: 'eighth', lyric: 'le', syl: 'end', beam: 'begin' })}
      ${note('B', 4, 1, { type: 'eighth', lyric: 'mei', syl: 'begin', beam: 'end' })}
      ${note('F', 5, 2, { lyric: 'ne' , syl: 'end' })}
      ${note('D', 5, 2, { chord: true })}
      ${note('C', 3, 6, { voice: 2 })}
    </measure>
    <measure number="2">
      ${harmony('D', 'dominant')}
      ${note('F', 5, 2, { alter: 0, lyric: 'Ent', syl: 'begin', tie: 'start' })}
      ${note('F', 5, 2, { alter: 0, tie: 'stop' })}
      ${note('B', 4, 2, { alter: -1, lyric: 'chen', syl: 'end' })}
      <barline location="right"><bar-style>light-heavy</bar-style><repeat direction="backward"/></barline>
    </measure>
    <measure number="3">
      <attributes><divisions>6</divisions></attributes>
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>2</duration><voice>1</voice><type>eighth</type><time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification></note>
      <note><pitch><step>D</step><octave>5</octave></pitch><duration>2</duration><voice>1</voice><type>eighth</type><time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification></note>
      <note><pitch><step>E</step><octave>5</octave></pitch><duration>2</duration><voice>1</voice><type>eighth</type><time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification></note>
      ${note('', 0, 12, { rest: true })}
      <barline location="right"><bar-style>light-heavy</bar-style></barline>
    </measure>
  </part>
  <part id="P2"><measure number="1">${note('C', 3, 6)}</measure></part>
</score-partwise>`;

describe('Noten holen: MusicXML → ABC', () => {
  it('Tonart aus den Vorzeichen', () => {
    expect([keyFromFifths(0), keyFromFifths(1), keyFromFifths(-2), keyFromFifths(0, 'minor'), keyFromFifths(3, 'minor')])
      .toEqual(['C', 'G', 'Bb', 'Am', 'F#m']);
  });

  it('Liedinfo und Spur mit Liedtext', () => {
    const r = musicXmlToAbc(XML);
    expect([r.title, r.composer, r.key, r.time, r.tempo, r.part, r.measures]).toEqual(['Testlied', 'Volksweise', 'G', '3/4', 96, 0, 3]);
    expect(r.parts).toEqual(['Gesang', 'Klavier']);
  });

  it('Noten, Akkorde, Balken, Vorzeichen, Bindebogen, Triole, Wiederholung, Schluss', () => {
    const lines = musicXmlToAbc(XML).abc.split('\n');
    expect(lines.slice(0, 4)).toEqual(['M:3/4', 'L:1/8', 'Q:1/4=96', 'K:G']);
    expect(lines[4]).toBe('|: "G"G2 AB =f2 | "D7"=f2- f2 _B2 :| (3c d e z4 |]');
  });

  it('Liedtext: Silben mit Bindestrich, gebundene Folgenote ohne Silbe, Noten ohne Text mit *', () => {
    const lines = musicXmlToAbc(XML).abc.split('\n');
    expect(lines[5]).toBe('w: Al-le mei-ne Ent-chen * * *');
  });

  it('das Ergebnis lässt sich lesen: gleiche Töne wie in der Partitur', () => {
    const notes = abcMelody(musicXmlToAbc(XML).abc)[0].notes;
    expect(notes).toEqual([67, 69, 71, 77, 77, 70, 72, 74, 76]);
  });

  it('andere Spur wählbar; kein MusicXML → verständlicher Fehler', () => {
    expect(musicXmlToAbc(XML, { part: 1 }).abc.split('\n').at(-1)).toBe('C,12 |');
    let err = null;
    try {
      musicXmlToAbc('<html></html>');
    } catch (e) {
      err = e;
    }
    expect(err.message).toBe('Die Datei ist kein MusicXML');
  });

  it('.mxl (ZIP, gepackt) wird ausgepackt', async () => {
    const buf = await zip([
      ['META-INF/container.xml', '<container><rootfiles><rootfile full-path="score.xml"/></rootfiles></container>'],
      ['score.xml', XML],
    ]);
    expect(musicXmlToAbc(await readMxl(buf)).title).toBe('Testlied');
  });
});

describe('Noten holen: ABC aus dem Internet', () => {
  const PAGE = `Ein paar Lieder:

X:1
T:Kuckuck
C:trad.
O:Deutschland
M:3/4
L:1/4
Q:1/4=110
K:F
c A z | c A z |
w: Kuk-kuck, kuk-kuck
W: Zweite Strophe

X:2
T:Zweites
K:D
DEF |`;

  it('mehrere Stücke werden getrennt, mit Titel', () => {
    expect(splitAbcTunes(PAGE).map((t) => t.title)).toEqual(['Kuckuck', 'Zweites']);
  });

  it('Kopf aufgeräumt, Liedinfo gemerkt', () => {
    const r = abcForSong(splitAbcTunes(PAGE)[0].text);
    expect(r.abc).toBe('M:3/4\nL:1/4\nQ:1/4=110\nK:F\nc A z | c A z |\nw: Kuk-kuck, kuk-kuck');
    expect([r.title, r.composer, r.key, r.time, r.tempo]).toEqual(['Kuckuck', 'trad.', 'F', '3/4', 110]);
  });

  it('ohne Kopf: einfach die Noten', () => {
    expect(readNotes('C D E F | G2 G2 |').tunes[0].abc).toBe('C D E F | G2 G2 |');
  });

  it('erkennt ganze Stücke und MusicXML beim Einfügen; Abschnitt liest der Parser als Noten', () => {
    expect([looksLikeNotes(PAGE), looksLikeNotes(XML), looksLikeNotes('[G]Alle meine Entchen')]).toEqual([true, true, false]);
    expect(readNotes(XML).kind).toBe('musicxml');
    const song = parseChordPro(abcSection(readNotes(PAGE).tunes[0].abc));
    expect(song.blocks[0].kind).toBe('abc');
    expect(song.blocks[0].label).toBe('Melodie');
  });

  it('kein Notentext → Fehler', () => {
    let err = null;
    try {
      readNotes('X:1\nT:nur Kopf');
    } catch (e) {
      err = e;
    }
    expect(err !== null).toBe(true);
  });
});

describe('Noten holen: ins Lied setzen', () => {
  const SEC = '{soa}\nC |\n{eoa}';
  it('an der Cursorstelle, auf eigener Zeile', () => {
    const r = placeNotes('Zeile 1\nZeile 2', 7, SEC);
    expect(r.text).toBe('Zeile 1\n{soa}\nC |\n{eoa}\nZeile 2');
    expect(r.cursor).toBe(8 + SEC.length);
  });

  it('Cursor in „{title: …}“ → hinter die Zeile; leere Liedinfo wird gefüllt, fehlende oben ergänzt', () => {
    const r = placeNotes('{title: X}\n{key: }\nText', 3, SEC, [['key', 'F'], ['time', '3/4']]);
    expect(r.text).toBe('{time: 3/4}\n{title: X}\n{soa}\nC |\n{eoa}\n{key: F}\nText');
    expect(r.text.slice(0, r.cursor).endsWith('{eoa}')).toBe(true);
  });
});

/** Minimale ZIP-Datei (deflate) für den Test bauen. */
async function zip(files) {
  const enc = new TextEncoder();
  const parts = [];
  const central = [];
  let offset = 0;
  for (const [name, content] of files) {
    const nameBytes = enc.encode(name);
    const raw = enc.encode(content);
    const packed = new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer());
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(8, 8, true);
    local.setUint32(18, packed.length, true);
    local.setUint32(22, raw.length, true);
    local.setUint16(26, nameBytes.length, true);
    parts.push(new Uint8Array(local.buffer), nameBytes, packed);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true);
    c.setUint16(10, 8, true);
    c.setUint32(20, packed.length, true);
    c.setUint32(24, raw.length, true);
    c.setUint16(28, nameBytes.length, true);
    c.setUint32(42, offset, true);
    central.push(new Uint8Array(c.buffer), nameBytes);
    offset += 30 + nameBytes.length + packed.length;
  }
  const size = central.reduce((n, p) => n + p.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, size, true);
  end.setUint32(16, offset, true);
  return new Blob([...parts, ...central, new Uint8Array(end.buffer)]).arrayBuffer();
}
