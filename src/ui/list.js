// Liederliste links: Suche, Tag-Filter, Sortierung, Einträge, Kopf weggleiten lassen.
// Die Liste zeichnet sich selbst neu, wenn sich Lieder ändern oder ein anderes Lied geöffnet wird.
// „Was kann ich spielen?“ steht in chord-filter.js, die Mehrfachauswahl in list-select.js (Zustand)
// und selection.js (Leiste, Aktionen).

import { SORT_MODES, sortSongs, sortDirectionLabel, letterOf } from '../core/song-list.js';
import { prefs } from '../prefs.js';
import { book, repo, state } from './app-state.js';
import { applyChordFilter, capoFor, chordFilterActive, onChordFilterChange } from './chord-filter.js';
import { $, $$, el, isMobile } from './dom.js';
import { selection, selectRange, toggleSelected } from './list-select.js';
import { openSong } from './song.js';
import { setView } from './view.js';

export const listEl = $('#song-list');
const search = $('#search');

// ---------- Tag-Filter ----------

let activeTag = prefs.get('activeTag');

/** Tag-Filter über der Liste (nur sichtbar, wenn es Tags gibt). */
async function renderTagFilter() {
  const tags = await repo.tags();
  if (activeTag && !tags.some((t) => t.tag === activeTag)) activeTag = '';
  const box = $('#tag-filter');
  box.hidden = !tags.length;
  box.replaceChildren(...tags.map(({ tag, count }) => {
    const b = el('button', { type: 'button', className: 'tag-chip' }, tag, el('small', { textContent: count }));
    b.setAttribute('aria-pressed', String(tag === activeTag));
    b.onclick = () => {
      activeTag = activeTag === tag ? '' : tag;
      prefs.set('activeTag', activeTag);
      refreshList();
    };
    return b;
  }));
  $('#dl-tags').replaceChildren(...tags.map((t) => new Option(t.tag)));
}

// ---------- Sortierung (gilt ohne Suchbegriff; Suchtreffer bleiben nach Relevanz) ----------

const sortSelect = $('#sort-select');
const sortDir = $('#sort-dir');
sortSelect.replaceChildren(...Object.entries(SORT_MODES).map(([v, l]) => new Option(l, v)));
sortSelect.value = SORT_MODES[prefs.get('listSort')] ? prefs.get('listSort') : 'title';
/** Knopf für die Richtung: zeigt die aktuelle („A–Z“, „neueste zuerst“), Klick kehrt sie um. */
function syncSortDir() {
  const reverse = prefs.get('listSortReverse');
  const now = sortDirectionLabel(sortSelect.value, reverse);
  sortDir.textContent = now;
  sortDir.setAttribute('aria-label', `Reihenfolge: ${now} – umkehren zu ${sortDirectionLabel(sortSelect.value, !reverse)}`);
  sortDir.title = `Umkehren: ${sortDirectionLabel(sortSelect.value, !reverse)}`;
}
sortSelect.onchange = () => {
  prefs.set('listSort', sortSelect.value);
  syncSortDir();
  refreshList();
};
sortDir.onclick = () => {
  prefs.set('listSortReverse', !prefs.get('listSortReverse'));
  syncSortDir();
  refreshList();
};
syncSortDir();

// ---------- Liste ----------

let beforeChordFilter = 0; // Anzahl vor dem Griff-Filter – für „Gefiltert: 12 von 40“ über der Liste

/** Lieder in der Reihenfolge der Liste (Suche, Tag, Griff-Filter, Sortierung) – auch fürs Blättern im Spielmodus. */
export async function listedSongs() {
  const all = await repo.list({ query: search.value, tag: activeTag });
  const songs = applyChordFilter(all);
  beforeChordFilter = all.length;
  return search.value ? songs : sortSongs(songs, sortSelect.value, prefs.get('playedAt'), prefs.get('listSortReverse'));
}

function songButton(s) {
  const btn = el('button', { type: 'button', className: 'song-item' + (s.id === state.current?.id ? ' active' : '') });
  btn.dataset.id = s.id;
  if (selection.active) btn.setAttribute('aria-pressed', String(selection.ids.has(s.id)));
  let artist = s.artist;
  if (capoFor(s.id)) artist += `${s.artist ? ' · ' : ''}mit Capo ${capoFor(s.id)}`;
  btn.append(
    el('span', { className: 'song-item-title', textContent: s.title || 'Ohne Titel' }),
    el('span', { className: 'song-item-artist', textContent: artist }),
  );
  return el('li', {}, btn);
}

function emptyText() {
  if (chordFilterActive()) return 'Kein Lied nur mit diesen Griffen – „auch mit Capo“ probieren oder Griffe ergänzen.';
  if (search.value) return 'Nichts gefunden.';
  return book.shared ? 'Noch keine Lieder – sie erscheinen nach dem Abgleich oder mit „Neues Lied“.' : 'Noch keine Lieder.';
}

async function render() {
  await renderTagFilter();
  const songs = await listedSongs();
  const mode = sortSelect.value;
  const items = [];
  let letter = null;
  for (const s of songs) {
    // Zwischenüberschriften A, B, C … nur bei Sortierung nach Titel oder Interpret
    if (!search.value && (mode === 'title' || mode === 'artist')) {
      const l = mode === 'artist' ? (s.artist ? letterOf(s.artist) : '–') : letterOf(s.sortTitle || s.title);
      if (l !== letter) {
        letter = l;
        items.push(el('li', { className: 'song-letter', textContent: l }));
      }
    }
    items.push(songButton(s));
  }
  if (!songs.length) items.push(el('li', { className: 'list-empty', textContent: emptyText() }));
  listEl.replaceChildren(...items);
  const filtered = search.value || activeTag || chordFilterActive();
  $('#song-count').textContent = filtered ? `${songs.length} Treffer` : `${songs.length} ${songs.length === 1 ? 'Lied' : 'Lieder'}`;
  // „Was kann ich spielen?“ aktiv: deutlich sagen, dass die Liste gefiltert ist
  const note = $('#filter-note');
  note.hidden = !chordFilterActive();
  if (!note.hidden) {
    $('#filter-note-text').textContent = `Gefiltert: ${songs.length} von ${beforeChordFilter} ${beforeChordFilter === 1 ? 'Lied' : 'Liedern'}`;
  }
  // Erste Schritte, solange das Buch fast leer ist (nur das Beispiellied) – nicht in Abos
  $('#welcome').hidden = Boolean(filtered || songs.length > 1 || document.body.dataset.readonly || prefs.get('welcomeHidden'));
}

// Erste Schritte ausblenden (die anderen Knöpfe der Karte verbindet app.js)
$('#welcome [data-welcome=hide]').onclick = () => {
  prefs.set('welcomeHidden', true);
  $('#welcome').hidden = true;
};

// Neu zeichnen: mehrere Anlässe kurz hintereinander ergeben nur einen Durchlauf
let pending = null;
/** Liste neu zeichnen (wartet, bis sie fertig ist). */
export function refreshList() {
  pending ||= Promise.resolve().then(() => {
    pending = null;
    return render();
  });
  return pending;
}
repo.addEventListener('change', () => refreshList());
onChordFilterChange(refreshList);
addEventListener('songopened', () => refreshList());

/** Suche leeren (z. B. nach dem Anlegen eines Liedes, damit es sichtbar ist). */
export function clearSearch() {
  if (!search.value) return;
  search.value = '';
  refreshList();
}

/** In die Suche springen (Strg+K). */
export function focusSearch() {
  if (isMobile()) setView('list');
  search.focus();
  search.select();
}

listEl.addEventListener('click', async (e) => {
  const btn = e.target.closest('.song-item');
  if (!btn) return;
  // Mehrfachauswahl: im Auswahlmodus markiert ein Klick; am PC auch Strg/⌘+Klick bzw. Umschalt+Klick (Bereich)
  if (selection.active || e.ctrlKey || e.metaKey || (e.shiftKey && selection.last)) {
    e.preventDefault();
    if (e.shiftKey && selection.last) selectRange(selection.last, btn.dataset.id);
    else toggleSelected(btn.dataset.id);
    return;
  }
  await openSong(btn.dataset.id);
  if (isMobile()) setView('preview');
});

// ---------- Kopf der Liste (Suche, Filter, Tags) weg- und hereingleiten lassen ----------
// Runterscrollen: Kopf gleitet nach oben weg, die Liste bekommt den Platz. Ein Stück hochscrollen: Kopf
// gleitet sofort wieder herein, an der aktuellen Stelle (kein Sprung nach oben).

{
  const scroller = $('#list-scroll');
  const head = $('#list-head');
  let last = scroller.scrollTop;
  let away = false;
  const setAway = (value) => {
    away = value;
    head.classList.toggle('away', away);
    // Buchstaben-Zeilen kleben unter dem sichtbaren Kopf bzw. ganz oben
    scroller.style.setProperty('--head-offset', `${away ? 0 : head.offsetHeight}px`);
  };
  scroller.addEventListener('scroll', () => {
    const y = scroller.scrollTop;
    const delta = y - last;
    last = y;
    if (y <= head.offsetHeight) setAway(false); // ganz oben: Kopf an seinem Platz
    else if (delta > 4 && !away && !head.contains(document.activeElement)) setAway(true);
    else if (delta < -4 && away) setAway(false);
  }, { passive: true });
  // Höhe ändert sich (Griffe-Feld auf/zu, Tags, Hinweis) – Abstand der Buchstaben-Zeilen nachziehen
  new ResizeObserver(() => setAway(away)).observe(head);
}

// Pfeiltasten in der Liste
listEl.addEventListener('keydown', (e) => {
  if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
  const btns = $$('.song-item', listEl);
  const next = btns[btns.indexOf(document.activeElement) + (e.key === 'ArrowDown' ? 1 : -1)];
  if (!next) return;
  e.preventDefault();
  next.focus();
  next.click();
});

let searchTimer;
search.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(refreshList, 150);
});
search.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    $('.song-item', listEl)?.focus();
  } else if (e.key === 'Enter') {
    $('.song-item', listEl)?.click();
  } else if (e.key === 'Escape' && search.value) {
    clearSearch();
  }
});
