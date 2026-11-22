import { describe, it, expect } from './runner.js';
import { parseChordPro } from '../src/core/chordpro.js';
import { renderSong, songKey } from '../src/render/song-view.js';

const render = (src, opts) => {
  const host = document.createElement('div');
  host.className = 'songbook';
  host.dataset.chorusStyle = 'bar';
  host.append(renderSong(parseChordPro(src), opts));
  document.getElementById('sandbox').append(host);
  return host;
};

const chordTexts = (host) => [...host.querySelectorAll('.chord')].map((c) => c.textContent);

describe('Vorschau', () => {
  it('stellt Akkord und folgende Silbe übereinander', () => {
    const host = render('{title: Clementine}\nOh my [C]darling, [G]Clementine');
    const segs = [...host.querySelectorAll('.seg')];
    expect(segs.map((s) => [s.children[0].textContent, s.children[1].textContent])).toEqual([
      ['C', 'darling, '],
      ['G', 'Clementine'],
    ]);
  });

  it('Akkord steht geometrisch über seiner Silbe (Proportionalschrift)', () => {
    const host = render('Oh my [C]darling, [G]Clementine');
    for (const seg of host.querySelectorAll('.seg')) {
      const [chord, lyric] = seg.children;
      const c = chord.getBoundingClientRect();
      const l = lyric.getBoundingClientRect();
      if (Math.abs(c.left - l.left) > 0.5) throw new Error(`Akkord ${chord.textContent} nicht linksbündig über Text`);
      if (!(c.bottom <= l.top + 1)) throw new Error(`Akkord ${chord.textContent} nicht über dem Text`);
    }
    // Text ohne Akkord und Text mit Akkord teilen eine Grundlinie. Gemessen wird die echte Grundlinie
    // (Markierung ohne Höhe, auf der Grundlinie ausgerichtet) – nicht die Unterkante der Kästen, deren
    // Höhe je nach Schrift schwankt (auf Linux ohne Georgia sonst ein Fehlalarm).
    const baseline = (el) => {
      const mark = Object.assign(document.createElement('span'), { style: 'display:inline-block;width:0;height:0;vertical-align:baseline' });
      el.append(mark);
      const y = mark.getBoundingClientRect().bottom;
      mark.remove();
      return y;
    };
    const plain = baseline(host.querySelector('.line > .lyric'));
    const lyr = baseline(host.querySelector('.seg > .lyric'));
    if (Math.abs(plain - lyr) > 0.5) throw new Error(`Grundlinien weichen ab (${(plain - lyr).toFixed(1)} px)`);
  });

  it('transponiert Akkorde und Tonart', () => {
    const host = render('{key: G}\n[G]Hel[D/F#]lo [Em7]you', { transpose: -2 });
    expect(chordTexts(host)).toEqual(['F', 'C/E', 'Dm7']);
    expect(host.querySelector('.song-info').textContent).toContain('Tonart: F');
  });

  it('Schreibweise # oder b wählbar', () => {
    expect(chordTexts(render('[Bb] [Eb]', { accidentals: 'sharp' }))).toEqual(['A#', 'D#']);
    expect(chordTexts(render('[A#] [D#]', { accidentals: 'flat' }))).toEqual(['Bb', 'Eb']);
    expect(chordTexts(render('[Bb] [A#]'))).toEqual(['Bb', 'A#']); // unverändert ohne Transposition
  });

  it('ohne Tonart entscheidet der erste Akkord über # oder b', () => {
    expect(chordTexts(render('[Am]la [C]la [E]la', { transpose: 3 }))).toEqual(['Cm', 'Eb', 'G']);
    expect(chordTexts(render('[E]la [A]la', { transpose: 2 }))).toEqual(['F#', 'B']);
  });

  it('Annotationen werden nicht transponiert', () => {
    expect(chordTexts(render('[C]la [*x2]', { transpose: 2 }))).toEqual(['D', 'x2']);
  });

  it('Refrain bekommt Klasse und Standard-Beschriftung, Absätze werden gebildet', () => {
    const host = render('{soc}\n[C]la\n\n[G]li\n{eoc}');
    const block = host.querySelector('.block--chorus');
    expect(block.querySelector('.block-label').textContent).toBe('Refrain');
    expect(block.querySelectorAll('.para').length).toBe(2);
  });

  it('Tabs werden als vorformatierter Text gezeigt', () => {
    const host = render('{sot}\ne|--0--|\nB|--1--|\n{eot}');
    expect(host.querySelector('pre.tab').textContent).toBe('e|--0--|\nB|--1--|\n');
  });
});

describe('Tonart-Anzeige', () => {
  it('nimmt {key:} und transponiert mit passender Schreibweise', () => {
    const s = parseChordPro('{key: F}\n[F]la [C]li');
    expect(songKey(s)).toEqual({ key: 'F', guessed: false });
    expect(songKey(s, { transpose: 2 })).toEqual({ key: 'G', guessed: false });
    expect(songKey(s, { transpose: -2 }).key).toBe('Eb');
  });
  it('schätzt die Tonart aus dem ersten Akkord', () => {
    expect(songKey(parseChordPro('[Am7]la [G]li'), { transpose: 2 })).toEqual({ key: 'Bm', guessed: true });
    expect(songKey(parseChordPro('nur Text'))).toBe(null);
  });
});
