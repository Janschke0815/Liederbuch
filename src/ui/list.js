// Liederliste links: Suche, Tag-Filter, „Was kann ich spielen?“, Sortierung.
// Die Liste zeichnet sich selbst neu, wenn sich Lieder ändern oder ein anderes Lied geöffnet wird.

import { parseChordPro } from '../core/chordpro.js';
import { transposeChord } from '../core/chords.js';
import { parseKnown, playableCapo } from '../core/playable.js';
import { SORT_MODES, sortSongs, sortDirectionLabel, letterOf } from '../core/song-list.js';
import { usedChords } from '../render/song-view.js';
import { prefs } from '../prefs.js';
import { book, repo, state } from './app-state.js';
import { $, $$, el, isMobile } from './dom.js';
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

// ---------- „Was kann ich spielen?“ – Filter nach bekannten Griffen ----------

const cf = {
  open: prefs.get('chordFilterOpen'), // eingeschaltet: filtert, sobald Griffe eingetragen sind
  expanded: prefs.get('chordFilterExpanded'), // Eingabefeld sichtbar (eingeklappt filtert es weiter)
  chords: prefs.get('chordFilterChords'),
  capo: prefs.get('chordFilterCapo'),
};
const capoHint = new Map(); // songId -> Capo-Bund für die Anzeige in der Liste
let beforeChordFilter = 0; // Anzahl vor dem Griff-Filter – für „Gefiltert: 12 von 40“ über der Liste
let syncChordFilter = () => {};

const chordFilterActive = () => cf.open && parseKnown(cf.chords).size > 0;

/** Lieder filtern, die nur aus bekannten Griffen bestehen (mit gespeicherter Transposition). */
function applyChordFilter(songs) {
  capoHint.clear();
  if (!chordFilterActive()) return songs;
  const known = parseKnown(cf.chords);
  return songs.filter((s) => {
    const chords = usedChords(parseChordPro(s.chordpro)).map((c) => transposeChord(c, s.transpose || 0, false));
    const capo = playableCapo(chords, known, { withCapo: cf.capo });
    if (capo === null) return false;
    if (capo > 0) capoHint.set(s.id, capo);
    return true;
  });
}

{
  const panel = $('#cf-panel');
  const toggle = $('#cf-toggle');
  const save = () => {
    prefs.set('chordFilterOpen', cf.open);
    prefs.set('chordFilterExpanded', cf.expanded);
  };
  const sync = () => {
    const shown = cf.open && cf.expanded;
    panel.hidden = !shown;
    toggle.setAttribute('aria-expanded', String(shown));
    toggle.classList.toggle('active', chordFilterActive());
    toggle.classList.toggle('collapsed', cf.open && !cf.expanded);
    // Eingeklappt und aktiv: statt der Frage die eigenen Griffe zeigen – eine kurze Zeile
    toggle.querySelector('.cf-label').textContent = chordFilterActive() && !cf.expanded
      ? `🎸 ${cf.chords.trim().replace(/[\s,;]+/g, ' ')}`
      : '🎸 Was kann ich spielen?';
  };
  syncChordFilter = sync;
  $('#cf-chords').value = cf.chords;
  $('#cf-capo').checked = cf.capo;
  /** Einklappen; ohne eingetragene Griffe heißt das: Filter aus. */
  const collapse = () => {
    cf.expanded = false;
    if (!parseKnown(cf.chords).size) cf.open = false;
    save();
    sync();
    refreshList();
  };
  toggle.onclick = () => {
    if (!cf.open) {
      cf.open = true;
      cf.expanded = true;
    } else if (cf.expanded) {
      return collapse();
    } else cf.expanded = true;
    save();
    sync();
    refreshList();
    if (cf.expanded) $('#cf-chords').focus();
  };
  // Enter (bzw. „Fertig“ auf der Handy-Tastatur): einklappen, Filter bleibt
  $('#cf-chords').addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    e.target.blur();
    collapse();
  });
  let t;
  $('#cf-chords').addEventListener('input', (e) => {
    cf.chords = e.target.value;
    prefs.set('chordFilterChords', cf.chords);
    sync();
    clearTimeout(t);
    t = setTimeout(refreshList, 200);
  });
  $('#cf-capo').addEventListener('change', (e) => {
    cf.capo = e.target.checked;
    prefs.set('chordFilterCapo', cf.capo);
    refreshList();
  });
  sync();
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
  if (capoHint.has(s.id)) artist += `${s.artist ? ' · ' : ''}mit Capo ${capoHint.get(s.id)}`;
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

$('#filter-clear').onclick = () => {
  cf.open = false; // Griffe bleiben gespeichert – beim nächsten Aufklappen wieder da
  prefs.set('chordFilterOpen', false);
  syncChordFilter();
  refreshList();
};

$('#welcome').addEventListener('click', (e) => {
  const what = e.target.closest('[data-welcome]')?.dataset.welcome;
  const target = { new: '#btn-new', import: '#btn-import', open: '#btn-open', cloud: '#btn-cloud' }[what];
  if (target) $(target).click();
  else if (what === 'hide') {
    prefs.set('welcomeHidden', true);
    $('#welcome').hidden = true;
  }
});

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

// ---------- Mehrfachauswahl (Leiste und Aktionen: ui/selection.js) ----------

/** Ausgewählte Lieder. Ereignis „selectionchange“ auf window bei jeder Änderung. */
export const selection = { active: false, ids: new Set(), last: null };

function selectionChanged() {
  selection.active = selection.active || selection.ids.size > 0;
  for (const b of $$('.song-item', listEl)) {
    if (selection.active) b.setAttribute('aria-pressed', String(selection.ids.has(b.dataset.id)));
    else b.removeAttribute('aria-pressed');
  }
  listEl.classList.toggle('selecting', selection.active);
  dispatchEvent(new Event('selectionchange'));
}

/** Auswahlmodus starten (optional gleich mit einem Lied). */
export function startSelection(id = null) {
  selection.active = true;
  if (id) {
    selection.ids.add(id);
    selection.last = id;
  }
  selectionChanged();
}

/** Lied an-/abwählen. */
export function toggleSelected(id) {
  if (selection.ids.has(id)) selection.ids.delete(id);
  else selection.ids.add(id);
  selection.last = id;
  selection.active = true;
  selectionChanged();
}

/** Alle Lieder zwischen zwei (in der Reihenfolge der Liste) auswählen. */
function selectRange(fromId, toId) {
  const ids = $$('.song-item', listEl).map((b) => b.dataset.id);
  const [a, b] = [ids.indexOf(fromId), ids.indexOf(toId)].sort((x, y) => x - y);
  if (a < 0) return toggleSelected(toId);
  for (const id of ids.slice(a, b + 1)) selection.ids.add(id);
  selection.last = toId;
  selectionChanged();
}

/** Alle sichtbaren Lieder auswählen bzw. – sind schon alle gewählt – keines. */
export function selectAllVisible() {
  const ids = $$('.song-item', listEl).map((b) => b.dataset.id);
  const all = ids.every((id) => selection.ids.has(id));
  for (const id of ids) {
    if (all) selection.ids.delete(id);
    else selection.ids.add(id);
  }
  selectionChanged();
}

/** Auswahlmodus beenden. */
export function endSelection() {
  selection.active = false;
  selection.ids.clear();
  selection.last = null;
  selectionChanged();
}

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
