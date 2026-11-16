import { describe, it, expect } from './runner.js';
import { splitRepeat, bumpRepeat } from '../src/core/repeat.js';
import { parseChordPro } from '../src/core/chordpro.js';
import { renderSong } from '../src/render/song-view.js';
import { ugToChordPro } from '../src/formats/ug-import.js';

const render = (src) => {
  const host = document.createElement('div');
  host.className = 'songbook';
  host.append(renderSong(parseChordPro(src)));
  return host;
};

describe('Wiederholungen: erkennen', () => {
  it('verschiedene Schreibweisen', () => {
    for (const s of ['Refrain x2', 'Refrain 2x', 'Refrain (2×)', 'Refrain ×2', 'Refrain 2 mal', 'Refrain (x2)']) {
      expect(splitRepeat(s)).toEqual({ text: 'Refrain', times: 2 });
    }
    expect(splitRepeat('x4')).toEqual({ text: '', times: 4 });
  });
  it('kein Treffer mitten im Wort oder ohne Zahl', () => {
    expect(splitRepeat('Max2').times).toBe(null);
    expect(splitRepeat('Strophe 2').times).toBe(null);
    expect(splitRepeat('Box').times).toBe(null);
  });
});

describe('Wiederholungen: Editor-Knopf', () => {
  it('setzt und zählt hoch', () => {
    expect(bumpRepeat('[C]la la')).toBe('[C]la la (2×)');
    expect(bumpRepeat('[C]la la (2×)')).toBe('[C]la la (3×)');
    expect(bumpRepeat('{start_of_chorus: Refrain}')).toBe('{start_of_chorus: Refrain 2×}');
    expect(bumpRepeat('{start_of_chorus: Refrain 2×}')).toBe('{start_of_chorus: Refrain 3×}');
    expect(bumpRepeat('{soc}')).toBe('{soc: 2×}');
    expect(bumpRepeat('{chorus}')).toBe('{chorus: 2×}');
    expect(bumpRepeat('{start_of_repeat: 2×}')).toBe('{start_of_repeat: 3×}');
  });
});

describe('Wiederholungen: Darstellung (Klammer zeigt den Umfang)', () => {
  const scopes = (h) => [...h.querySelectorAll('.repeat-scope')].map((s) => [
    [...s.classList].find((c) => c.startsWith('repeat-scope--')).slice(14),
    s.querySelector(':scope > .repeat').textContent,
    s.querySelectorAll('.line').length,
  ]);

  it('Abschnitt: Klammer um den ganzen Abschnitt, Name ohne Angabe', () => {
    const h = render('{start_of_chorus: Refrain x2}\n[C]la\nli\n{end_of_chorus}');
    expect(scopes(h)).toEqual([['block', '2×', 2]]);
    expect(h.querySelector('.block').classList.contains('repeat-scope')).toBe(true);
    expect(h.querySelector('.block-label').textContent).toBe('Refrain');
  });
  it('ohne Namen: Standardname, Klammer am Abschnitt', () => {
    const h = render('{soc: 3x}\n[C]la\n{eoc}');
    expect(h.querySelector('.block-label').textContent).toBe('Refrain');
    expect(scopes(h)).toEqual([['block', '3×', 1]]);
  });
  it('Zeile: Klammer nur um diese Zeile, auch bei reinen Akkordzeilen', () => {
    const h = render('erste Zeile\n[Am]Oh oh oh x2\n| [C] | [G] | x4');
    expect(scopes(h)).toEqual([['line', '2×', 1], ['line', '4×', 1]]);
    expect(h.textContent.includes('x2')).toBe(false);
  });
  it('mehrere Zeilen: Klammer um genau die Gruppe', () => {
    const h = render('{sov: Strophe}\nvorher\n{start_of_repeat: 2×}\n[C]eins\n[G]zwei\n{end_of_repeat}\nnachher\n{eov}');
    expect(scopes(h)).toEqual([['group', '2×', 2]]);
    const lines = [...h.querySelectorAll('.line')].map((l) => l.textContent.replace('​', ''));
    expect(lines).toEqual(['vorher', 'Ceins', 'Gzwei', 'nachher']);
  });
  it('Gruppe ohne Anzahl bedeutet 2×', () => {
    expect(scopes(render('{start_of_repeat}\nla\n{end_of_repeat}'))).toEqual([['group', '2×', 1]]);
  });
  it('beim Refrain-Verweis', () => {
    const h = render('{chorus: 2x}');
    expect(h.querySelector('.chorus-ref').textContent).toBe('Refrain 2×');
  });
  it('die Klammer liegt rechts neben dem Text, nicht am Seitenrand', () => {
    const h = render('{soc: Refrain 2x}\n[C]kurz\n{eoc}');
    h.style.width = '600px';
    document.getElementById('sandbox').append(h);
    const block = h.querySelector('.block').getBoundingClientRect();
    expect(block.width < 300).toBe(true);
    h.remove();
  });
});

describe('Wiederholungen: Import', () => {
  it('Abschnitt mit Wiederholung und x2 hinter dem Text', () => {
    const cp = ugToChordPro('[Chorus x2]\nC        G\nOh my darling   x2\n\nVerse 1 (2x):\nAm\nLight she was');
    expect(cp).toContain('{start_of_chorus: Chorus x2}');
    expect(cp).toContain('[G]ling   x2');
    expect(cp).toContain('{start_of_verse: Verse 1 (2x)}');
  });
  it('x2 in der Akkordzeile hinter dem Textende', () => {
    const cp = ugToChordPro('C        G        x2\nOh my darling');
    expect(cp).toContain('[G]ling (2×)');
  });
});
