import { describe, it, expect } from './runner.js';
import { splitRepeat, bumpRepeat } from '../src/core/repeat.js';
import { parseChordPro } from '../src/core/chordpro.js';
import { renderSong } from '../src/render/song-view.js';
import { ugToChordPro } from '../src/core/ug-import.js';

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
  });
});

describe('Wiederholungen: Darstellung', () => {
  it('am Abschnitt als Abzeichen neben dem Namen', () => {
    const h = render('{start_of_chorus: Refrain x2}\n[C]la\n{end_of_chorus}');
    expect(h.querySelector('.block-label .label-text').textContent).toBe('Refrain');
    expect(h.querySelector('.block-label .repeat').textContent).toBe('2×');
  });
  it('ohne Namen: Standardname plus Abzeichen', () => {
    const h = render('{soc: 3x}\n[C]la\n{eoc}');
    expect(h.querySelector('.label-text').textContent).toBe('Refrain');
    expect(h.querySelector('.repeat').textContent).toBe('3×');
  });
  it('am Zeilenende, auch bei reinen Akkordzeilen', () => {
    const h = render('[Am]Oh oh oh x2\n| [C] | [G] | x4');
    const [l1, l2] = h.querySelectorAll('.line');
    expect(l1.querySelector('.repeat').textContent).toBe('2×');
    expect(l1.textContent.includes('x2')).toBe(false);
    expect(l2.querySelector('.repeat').textContent).toBe('4×');
  });
  it('beim Refrain-Verweis', () => {
    const h = render('{chorus: 2x}');
    expect(h.querySelector('.chorus-ref').textContent).toBe('Refrain 2×');
  });
  it('bleibt sichtbar, wenn Abschnittsnamen ausgeblendet sind', () => {
    const h = render('{soc: Refrain x2}\n[C]la\n{eoc}\n{sov: Strophe}\nla\n{eov}');
    h.dataset.labels = 'hide';
    document.getElementById('sandbox').append(h);
    const labels = h.querySelectorAll('.block-label');
    expect(getComputedStyle(labels[0]).display === 'none').toBe(false);
    expect(getComputedStyle(labels[0].querySelector('.label-text')).display).toBe('none');
    expect(getComputedStyle(labels[1]).display).toBe('none');
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
