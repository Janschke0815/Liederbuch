import { describe, it, expect } from './runner.js';
import { abcChords, abcKey, abcSkeleton, abcTempo, completeAbc } from '../src/core/abc.js';
import { parseChordPro } from '../src/core/chordpro.js';
import { renderSong } from '../src/render/song-view.js';
import { renderScores } from '../src/render/abc-view.js';
import { chordproToText, transposeChordPro } from '../src/formats/export-text.js';

const SONG = `{title: Entchen}
{key: G}
{time: 3/4}
{tempo: 90}
[G]Alle meine [D]Entchen

{start_of_abc: label="Melodie"}
L:1/4
"G"G A B | "D"d2 z |
w: Al-le mei-ne Ent-chen
{end_of_abc}`;

describe('Noten (ABC): Kopfzeilen ergänzen', () => {
  it('ChordPro-Tonart wird ABC-Tonart', () => {
    expect([abcKey('G'), abcKey('F#m'), abcKey('Bb'), abcKey('E♭'), abcKey('am'), abcKey('Cmaj7'), abcKey(''), abcKey('xyz')])
      .toEqual(['G', 'F#m', 'Bb', 'Eb', 'Am', 'C', 'C', 'C']);
  });

  it('fehlende X: und K: werden ergänzt – Takt aus {time}, Tonart aus {key}', () => {
    expect(completeAbc('"G"G A B |', { key: 'G', time: '3/4' })).toBe('X:1\nM:3/4\nL:1/8\nK:G\n"G"G A B |');
  });

  it('ohne Liedinfo: C-Dur; vorhandene Kopfzeilen bleiben (L: wird nicht doppelt)', () => {
    expect(completeAbc('L:1/4\nC D E F |', {})).toBe('X:1\nL:1/4\nK:C\nC D E F |');
  });

  it('vollständiger Kopf bleibt unverändert; K: rückt ans Ende des Kopfs', () => {
    const full = 'X:3\nT:Lied\nM:6/8\nL:1/8\nK:D\nDEF |';
    expect(completeAbc(full, { key: 'G' })).toBe(full);
    expect(completeAbc('X:1\nK:D\nM:2/4\nDE |')).toBe('X:1\nM:2/4\nK:D\nDE |');
  });

  it('w:-Zeilen sind Liedtext, keine Kopfzeilen', () => {
    expect(completeAbc('w: la la', {})).toBe('X:1\nL:1/8\nK:C\nw: la la');
  });
});

describe('Noten (ABC): Akkorde, Tempo, Gerüst', () => {
  it('Akkorde über den Noten in Reihenfolge – ohne Anmerkungen, Kommentare und Liedtext', () => {
    expect(abcChords('K:G\n"G"G "^leise"A "Am7"B | "D/F#"d % "C"\nw: "x" y')).toEqual(['G', 'Am7', 'D/F#']);
  });

  it('Tempo aus der Liedinfo, sonst 100', () => {
    expect([abcTempo({ tempo: '96' }), abcTempo({ tempo: '♩ = 72' }), abcTempo({}), abcTempo({ tempo: '5' })]).toEqual([96, 72, 100, 100]);
  });

  it('Gerüst „Noten“ nimmt Takt und Tonart des Liedes', () => {
    const s = abcSkeleton({ key: 'Am', time: '3/4' });
    expect(s).toContain('{start_of_abc: label="Melodie"}');
    expect(s).toContain('M:3/4');
    expect(s).toContain('K:Am');
    expect(s.endsWith('{end_of_abc}')).toBe(true);
  });
});

describe('Noten (ABC): Parser und Darstellung', () => {
  it('eigener Abschnitt, Inhalt unverändert; Name aus label="…"', () => {
    const song = parseChordPro(SONG);
    const abc = song.blocks.find((b) => b.kind === 'abc');
    expect(abc.label).toBe('Melodie');
    expect(abc.lines.map((l) => l.type)).toEqual(['abc', 'abc', 'abc']);
    expect(abc.lines[1].text).toBe('"G"G A B | "D"d2 z |');
  });

  it('Kurzform {soa}/{eoa}; [Akkord] in Noten wird kein Liedtext', () => {
    const song = parseChordPro('{soa}\n[CEG]2 |\n{eoa}\nText');
    expect(song.blocks[0].kind).toBe('abc');
    expect(song.blocks[0].lines[0]).toEqual({ type: 'abc', text: '[CEG]2 |' });
    expect(song.blocks[1].lines[0].type).toBe('lyrics');
  });

  it('label= gilt auch für andere Abschnitte', () => {
    expect(parseChordPro('{start_of_verse: label="Vers 2"}\nx\n{end_of_verse}').blocks[0].label).toBe('Vers 2');
  });

  it('Platzhalter mit vervollständigtem ABC, transponierten Akkordnamen und Tempo', () => {
    const el = renderSong(parseChordPro(SONG), { transpose: 2 });
    const score = el.querySelector('.block--abc .abc-score');
    expect(el.querySelector('.block--abc .block-label').textContent).toBe('Melodie');
    expect(score.dataset.abc.startsWith('X:1\nL:1/4\nM:3/4\nK:G\n')).toBe(true);
    expect(JSON.parse(score.dataset.chords)).toEqual(['A', 'E']);
    expect([score.dataset.transpose, score.dataset.tempo]).toEqual(['2', '90']);
  });

  it('abcjs zeichnet die Noten: eine Grafik je Notenzeile, Akkorde wie im Liedtext', async () => {
    const box = document.createElement('div');
    box.style.width = '600px';
    document.body.append(box);
    box.append(renderSong(parseChordPro(SONG), { transpose: 2, accidentals: 'flat' }));
    await renderScores(box, { follow: false });
    const score = box.querySelector('.abc-score');
    expect(score.querySelectorAll('svg').length > 0).toBe(true);
    // jede Zeile hat eine echte Höhe (abcjs misst nur im Dokument richtig)
    expect([...score.querySelectorAll('svg')].every((s) => Number(s.getAttribute('viewBox').split(' ')[3]) > 20)).toBe(true);
    expect([...score.querySelectorAll('.abc-line')].every((l) => l.classList.contains('atomic'))).toBe(true);
    expect([...score.querySelectorAll('.abcjs-chord')].map((c) => c.textContent)).toEqual(['A', 'E']);
    expect(score.querySelector('.abc-warn')).toBe(null);
    box.remove();
  });

  it('fehlerhafter Notentext: Vorschau bleibt, Hinweis am Abschnitt', async () => {
    const box = document.createElement('div');
    box.style.width = '600px';
    document.body.append(box);
    box.append(renderSong(parseChordPro('{soa}\nC D E F | G2 (((( !!! &&&\n{eoa}')));
    await renderScores(box, { follow: false });
    expect(box.querySelector('.abc-score svg') !== null).toBe(true);
    expect(box.querySelector('.abc-warn') !== null).toBe(true);
    box.remove();
  });
});

describe('Noten (ABC): Export', () => {
  it('transponierter ChordPro-Text: Noten bleiben, bekommen aber die ursprüngliche Tonart ausdrücklich', () => {
    const out = transposeChordPro(SONG, 2);
    expect(out).toContain('{key: A}');
    expect(out).toContain('[A]Alle meine [E]Entchen');
    expect(out).toContain('X:1\nL:1/4\nM:3/4\nK:G\n"G"G A B | "D"d2 z |');
  });

  it('ohne Transposition: Notenabschnitt Wort für Wort gleich', () => {
    expect(transposeChordPro(SONG, 0)).toBe(SONG);
  });

  it('Text mit Akkorden über dem Text: Noten fallen weg', () => {
    const text = chordproToText(SONG);
    expect(text).toContain('Alle meine');
    expect(text.includes('Melodie')).toBe(false);
    expect(text.includes('"G"G')).toBe(false);
  });
});
