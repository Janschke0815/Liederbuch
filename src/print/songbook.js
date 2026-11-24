// Druckfertiges Liederbuch: Deckblatt, Inhaltsverzeichnis, ein Lied pro neuer Seite.

import { parseChordPro } from '../core/chordpro.js';
import { renderSong } from '../render/song-view.js';
import { renderScores } from '../render/abc-view.js';
import { Paginator } from './paginate.js';

export const PAPER = {
  A4: { width: 210, height: 297 },
  A5: { width: 148, height: 210 },
  Letter: { width: 215.9, height: 279.4 },
};

export const DEFAULT_PRINT_OPTIONS = {
  title: 'Liederbuch',
  subtitle: '',
  cover: true,
  toc: true,
  useSavedTranspose: true,
  paper: 'A4',
  columns: 1,
  margin: 15, // mm
};

function el(tag, className, text) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
}

function buildCover(opts, count) {
  const cover = el('div', 'cover');
  cover.append(el('h1', 'cover-title', opts.title || 'Liederbuch'));
  if (opts.subtitle) cover.append(el('p', 'cover-subtitle', opts.subtitle));
  cover.append(el('p', 'cover-info', `${count} ${count === 1 ? 'Lied' : 'Lieder'}`));
  return cover;
}

function buildToc(songs) {
  const toc = el('div', 'toc');
  toc.append(el('h2', 'toc-heading keep-with-next', 'Inhalt'));
  for (const s of songs) {
    const a = el('a', 'toc-entry');
    a.href = `#song-${s.id}`;
    a.dataset.song = s.id;
    const title = el('span', 'toc-title', s.title || 'Ohne Titel');
    if (s.artist) title.append(el('span', 'toc-artist', ` – ${s.artist}`));
    a.append(title, el('span', 'toc-dots'), el('span', 'toc-page', '000'));
    toc.append(a);
  }
  return toc;
}

/** Bereitet ein gerendertes Lied für den Umbruch vor. */
function prepareSong(article, id) {
  article.id = `song-${id}`;
  article.querySelector('.song-header')?.classList.add('keep-with-next');
  // Abschnittsname in den ersten Absatz ziehen, damit er nie allein unten steht
  for (const block of article.querySelectorAll('.block')) {
    const label = block.querySelector(':scope > .block-label');
    const first = label?.nextElementSibling;
    if (label && first?.classList.contains('para')) {
      label.classList.add('keep-with-next');
      first.prepend(label);
    } else if (label) {
      label.classList.add('keep-with-next');
    }
  }
  return article;
}

/**
 * Baut das Liederbuch in root auf.
 * @param {HTMLElement} root
 * @param {Array<{id, title, artist, chordpro, transpose, accidentals}>} songs  bereits sortiert
 * @param {typeof DEFAULT_PRINT_OPTIONS} options
 * @returns {Promise<{pages: number, songPages: Map<string, number>, overflows: number}>}
 */
export async function buildSongbook(root, songs, options = {}) {
  const opts = { ...DEFAULT_PRINT_OPTIONS, ...options };
  const paper = PAPER[opts.paper] || PAPER.A4;
  const m = Number(opts.margin) || 0;
  const spec = {
    ...paper,
    margin: { top: m, right: m, bottom: Math.max(m, 12), left: m },
    columns: Number(opts.columns) === 2 ? 2 : 1,
    columnGap: 8,
  };

  root.replaceChildren();
  root.classList.add('songbook', 'print-root');
  root.dataset.paper = opts.paper;
  if (document.fonts?.ready) await document.fonts.ready;

  const pag = new Paginator(root, spec);
  let frontPages = 0;

  if (opts.cover) {
    pag.newPage({ columns: 1, className: 'page--cover' });
    pag.flow(buildCover(opts, songs.length));
    frontPages = 1;
  }

  let tocEl = null;
  if (opts.toc && songs.length) {
    pag.newPage({ columns: 1, className: 'page--toc' });
    pag.flow(buildToc(songs));
  }

  const firstSongPage = new Map();
  for (const s of songs) {
    const song = parseChordPro(s.chordpro);
    const view = opts.useSavedTranspose
      ? { transpose: s.transpose || 0, accidentals: s.accidentals || 'auto' }
      : {};
    const article = prepareSong(renderSong(song, view), s.id);
    // {columns: 1|2} im Lied geht vor der allgemeinen Einstellung
    const own = Number(song.meta.columns);
    const columns = own === 1 || own === 2 ? own : spec.columns;
    // Zweispaltig: Liedkopf (Titel, Interpret, Infozeile, Griffbilder) über beide Spalten,
    // die zweite Spalte beginnt erst darunter
    let head = null;
    const header = columns > 1 ? article.querySelector('.song-header') : null;
    if (header) {
      header.remove();
      head = article.cloneNode(false); // gleiche Klassen wie das Lied (Schriften usw.)
      head.removeAttribute('id');
      head.classList.add('song-head');
      head.append(header);
    }
    pag.newPage({ className: 'page--song', columns, head });
    // Noten in der Spaltenbreite zeichnen, bevor gemessen wird; jede Notenzeile bleibt ganz
    if (article.querySelector('.abc-score')) {
      pag.col.append(article);
      await renderScores(article, { follow: false });
      article.remove();
    }
    const from = pag.pages.length - 1;
    firstSongPage.set(s.id, pag.pages.length);
    pag.flow(article);
    // Jede Seite weiß, zu welchem Lied sie gehört (Rechtsklick in der Druck-Vorschau: Spalten dieses Liedes)
    for (const p of pag.pages.slice(from)) p.el.dataset.song = s.id;
  }

  const pages = pag.finish({ numberFrom: 1, skipNumbers: frontPages });

  // Seitenzahlen ins Inhaltsverzeichnis eintragen
  tocEl = root.querySelectorAll('.toc-entry');
  for (const entry of tocEl) entry.querySelector('.toc-page').textContent = String(firstSongPage.get(entry.dataset.song));

  return { pages: pages.length, songPages: firstSongPage, overflows: pag.overflows };
}
