import { describe, it, expect } from './runner.js';
import { Paginator } from '../src/print/paginate.js';
import { buildSongbook } from '../src/print/songbook.js';

// Kleine Testseite: 100 x 60 mm, Rand 5 mm -> Inhalt 90 x 50 mm
const SPEC = { width: 100, height: 60, margin: { top: 5, right: 5, bottom: 5, left: 5 }, columns: 1, columnGap: 4 };

function makeRoot() {
  const root = document.createElement('div');
  root.className = 'songbook print-root';
  document.getElementById('sandbox').append(root);
  return root;
}

function line(text, mm = 10) {
  const d = document.createElement('div');
  d.className = 'line';
  d.style.cssText = `height:${mm}mm;margin:0`;
  d.textContent = text;
  return d;
}

function container(cls, children) {
  const d = document.createElement('div');
  d.className = cls;
  d.append(...children);
  return d;
}

const pageTexts = (pages) => pages.map((p) => [...p.el.querySelectorAll('.line')].map((l) => l.textContent).join(','));

/** Keine Zeile darf über den Rand ihrer Spalte hinausragen. */
function assertNoCutLines(root) {
  for (const l of root.querySelectorAll('.page:not(.page--probe) .line')) {
    const col = l.closest('.page-col').getBoundingClientRect();
    const r = l.getBoundingClientRect();
    if (r.top < col.top - 1 || r.bottom > col.bottom + 1) throw new Error(`Zeile "${l.textContent.slice(0, 30)}" angeschnitten`);
  }
}

describe('Seitenumbruch', () => {
  it('verteilt Zeilen auf Seiten, ohne eine Zeile zu teilen', () => {
    const root = makeRoot();
    const p = new Paginator(root, SPEC);
    p.newPage();
    p.flow(container('song', Array.from({ length: 12 }, (_, i) => line(String(i + 1)))));
    const pages = p.finish();
    expect(pageTexts(pages)).toEqual(['1,2,3,4,5', '6,7,8,9,10', '11,12']);
    expect(root.querySelectorAll('.page--probe').length).toBe(0);
    assertNoCutLines(root);
    root.remove();
  });

  it('hält Absätze zusammen, wenn sie auf eine Seite passen', () => {
    const root = makeRoot();
    const p = new Paginator(root, SPEC);
    p.newPage();
    p.flow(container('song', [
      container('para', [line('a1'), line('a2'), line('a3')]),
      container('para', [line('b1'), line('b2'), line('b3')]),
    ]));
    expect(pageTexts(p.finish())).toEqual(['a1,a2,a3', 'b1,b2,b3']);
    root.remove();
  });

  it('teilt zu lange Absätze und setzt die Hülle (z. B. Refrain-Balken) fort', () => {
    const root = makeRoot();
    const p = new Paginator(root, SPEC);
    p.newPage();
    p.flow(container('block block--chorus', [container('para', Array.from({ length: 7 }, (_, i) => line('r' + i)))]));
    const pages = p.finish();
    expect(pageTexts(pages)).toEqual(['r0,r1,r2,r3,r4', 'r5,r6']);
    const cont = pages[1].el.querySelector('.block--chorus');
    expect(cont.classList.contains('cont')).toBe(true);
    root.remove();
  });

  it('Abschnittsname bleibt nicht allein unten auf der Seite', () => {
    const root = makeRoot();
    const p = new Paginator(root, SPEC);
    p.newPage();
    const label = line('LABEL', 8);
    label.className = 'block-label keep-with-next';
    p.flow(container('song', [
      container('para', [line('x1'), line('x2'), line('x3'), line('x4')]),
      container('para', [label, line('y1'), line('y2'), line('y3'), line('y4'), line('y5')]),
    ]));
    const pages = p.finish();
    expect(pages[0].el.querySelector('.block-label')).toBe(null);
    expect(pages[1].el.querySelector('.page-col').textContent.startsWith('LABEL')).toBe(true);
    assertNoCutLines(root);
    root.remove();
  });

  it('nutzt zwei Spalten, bevor eine neue Seite beginnt', () => {
    const root = makeRoot();
    const p = new Paginator(root, { ...SPEC, columns: 2 });
    p.newPage();
    p.flow(container('song', Array.from({ length: 12 }, (_, i) => line(String(i + 1)))));
    const pages = p.finish();
    expect(pages.length).toBe(2);
    expect(pages[0].cols.map((c) => c.textContent)).toEqual(['12345', '678910']);
    root.remove();
  });

  it('beachtet {new_page} und {column_break}', () => {
    const root = makeRoot();
    const p = new Paginator(root, { ...SPEC, columns: 2 });
    p.newPage();
    const np = document.createElement('div');
    np.className = 'new-page';
    const cb = document.createElement('div');
    cb.className = 'column-break';
    p.flow(container('song', [line('a'), cb, line('b'), np, line('c')]));
    const pages = p.finish();
    expect(pages.map((pg) => pg.cols.map((c) => c.textContent))).toEqual([['a', 'b'], ['c', '']]);
    root.remove();
  });
});

describe('Liederbuch drucken', () => {
  const long = Array.from({ length: 70 }, (_, i) => `Zeile [G]Nummer [C]${i + 1} mit etwas [D]Text`).join('\n');
  const songs = [
    { id: 'a', title: 'Amazing Grace', artist: 'John Newton', chordpro: '{title: Amazing Grace}\n{key: G}\n{soc}\nA[G]mazing [C]grace\n{eoc}', transpose: 2, accidentals: 'auto' },
    { id: 'b', title: 'Langes Lied', artist: '', chordpro: `{title: Langes Lied}\n{sov: Strophe}\n${long}\n{eov}` },
    { id: 'c', title: 'Zum Schluss', artist: 'Volkslied', chordpro: '{title: Zum Schluss}\n[E]Ende' },
  ];

  it('Deckblatt, Inhaltsverzeichnis mit richtigen Seitenzahlen, jedes Lied auf neuer Seite', async () => {
    const root = makeRoot();
    const r = await buildSongbook(root, songs, { paper: 'A5', margin: 12, title: 'Test' });
    const pages = [...root.querySelectorAll('.page')];
    expect(pages.length).toBe(r.pages);
    expect(pages[0].classList.contains('page--cover')).toBe(true);
    expect(pages[0].querySelector('.page-footer').textContent).toBe(''); // keine Zahl auf dem Deckblatt
    expect(pages[1].querySelector('.toc-heading').textContent).toBe('Inhalt');

    // Seitenzahl im Verzeichnis = Seite, auf der das Lied tatsächlich beginnt
    for (const entry of root.querySelectorAll('.toc-entry')) {
      const id = entry.dataset.song;
      const page = root.querySelector(`#song-${id}`).closest('.page');
      expect(entry.querySelector('.toc-page').textContent).toBe(page.dataset.page);
      expect(page.querySelector('.page-footer').textContent).toBe(page.dataset.page);
      // Lied beginnt oben auf seiner Seite
      expect(page.querySelector('.page-col').firstElementChild.id).toBe(`song-${id}`);
    }
    expect(r.songPages.get('b') < r.songPages.get('c') - 1).toBe(true); // langes Lied über mehrere Seiten
    expect(r.overflows).toBe(0);
    assertNoCutLines(root);
    root.remove();
  });

  it('verwendet die gespeicherte Transposition (abschaltbar)', async () => {
    const root = makeRoot();
    await buildSongbook(root, [songs[0]], { cover: false, toc: false });
    expect([...root.querySelectorAll('.chord')].map((c) => c.textContent)).toEqual(['A', 'D']);
    await buildSongbook(root, [songs[0]], { cover: false, toc: false, useSavedTranspose: false });
    expect([...root.querySelectorAll('.chord')].map((c) => c.textContent)).toEqual(['G', 'C']);
    root.remove();
  });

  it('zweispaltig ohne Deckblatt und Verzeichnis', async () => {
    const root = makeRoot();
    const r = await buildSongbook(root, [songs[1]], { cover: false, toc: false, columns: 2, paper: 'A5' });
    const first = root.querySelector('.page');
    expect(first.querySelectorAll('.page-col').length).toBe(2);
    expect(first.querySelectorAll('.page-col')[1].querySelector('.line') !== null).toBe(true);
    expect(first.querySelector('.page-footer').textContent).toBe('1');
    expect(r.pages >= 1).toBe(true);
    assertNoCutLines(root);
    root.remove();
  });
});
