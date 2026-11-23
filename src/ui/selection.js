// Mehrfachauswahl in der Liederliste: Leiste unten (Anzahl, Alle, Aktionen, Löschen) und die Aktionen
// für alle ausgewählten Lieder – löschen (mit Rückgängig), in ein anderes Liederbuch kopieren, zu einer
// Setliste hinzufügen. Auswahl selbst (Klick, Strg/Umschalt) steht in list.js.

import { showMenu } from '../context-menu.js';
import { listBooks, setActiveBook } from '../books.js';
import { planCopy, songCount } from '../core/song-copy.js';
import { SongRepository } from '../storage/repository.js';
import { openIdbStore } from '../storage/stores.js';
import { book, readOnly, repo, sets, services, state } from './app-state.js';
import { $, isMobile, toast } from './dom.js';
import { endSelection, listEl, listedSongs, selectAllVisible, selection, startSelection } from './list.js';
import { flushSave, openSong } from './song.js';
import { setView } from './view.js';

const bar = $('#select-bar');

/** Ausgewählte Lieder in der Reihenfolge der Liste. */
async function chosen() {
  return (await listedSongs()).filter((s) => selection.ids.has(s.id));
}

function render() {
  bar.hidden = !selection.active;
  $('#song-count').hidden = selection.active;
  const n = selection.ids.size;
  $('#sel-count').textContent = String(n); // „ausgewählt“ steht daneben (am schmalen Handy ausgeblendet)
  $('#sel-actions').disabled = n === 0;
  $('#sel-delete').disabled = n === 0 || readOnly;
  $('#sel-delete').hidden = readOnly;
}
addEventListener('selectionchange', render);

$('#sel-start').onclick = () => (selection.active ? endSelection() : startSelection());
$('#sel-cancel').onclick = endSelection;
$('#sel-all').onclick = selectAllVisible;
addEventListener('keydown', (e) => {
  if (!selection.active) return;
  if (e.key === 'Escape' && !document.querySelector('dialog[open], .ctx-menu')) {
    e.preventDefault();
    endSelection();
  } else if ((e.key === 'Delete' || e.key === 'Backspace') && listEl.contains(document.activeElement) && selection.ids.size) {
    e.preventDefault();
    e.stopImmediatePropagation(); // nicht zusätzlich das einzelne Lied löschen (context-menus.js)
    deleteSelected();
  }
}, true);

// ---------- Aktionen ----------

async function deleteSelected() {
  if (readOnly) return;
  await flushSave();
  const songs = await chosen();
  if (!songs.length) return;
  if (songs.length > 1 && !confirm(`${songCount(songs.length)} löschen? Sie kommen in den Papierkorb.`)) return;
  for (const s of songs) await repo.remove(s.id);
  endSelection();
  if (songs.some((s) => s.id === state.current?.id)) await openSong((await repo.list())[0]?.id);
  toast(`${songCount(songs.length)} gelöscht`, {
    action: 'Rückgängig',
    onAction: async () => {
      for (const s of songs) await repo.restore(s.id);
    },
  });
}
$('#sel-delete').onclick = deleteSelected;

/** In ein anderes Liederbuch kopieren; was es dort schon gibt, wird übersprungen. */
async function copyTo(target) {
  await flushSave();
  const songs = await chosen();
  const dest = new SongRepository(await openIdbStore(target.dbName));
  const { copy, skip } = planCopy(songs, await dest.list());
  for (const s of copy) await dest.create(s.chordpro, { transpose: s.transpose || 0, accidentals: s.accidentals || 'auto', note: s.note || '' });
  endSelection();
  const msg = [copy.length && `${songCount(copy.length)} nach „${target.name}“ kopiert`, skip.length && `${skip.length} gab es dort schon`]
    .filter(Boolean).join(' · ') || 'Nichts kopiert';
  toast(msg, copy.length ? {
    action: 'Öffnen',
    onAction: async () => {
      await flushSave();
      setActiveBook(target.id);
      location.reload();
    },
  } : {});
}

async function addToSetlist(setId) {
  const songs = await chosen();
  const set = await sets.get(setId);
  if (!set) return;
  await sets.update(setId, { items: [...set.items, ...songs.map((s) => ({ songId: s.id, transpose: null, note: '' }))] });
  endSelection();
  toast(`${songCount(songs.length)} zu „${set.name}“ hinzugefügt`, { action: 'Anzeigen', onAction: () => services.setlists.open(setId) });
}

async function newSetlist() {
  const songs = await chosen();
  const set = await sets.create(`Setliste ${new Date().toLocaleDateString('de')}`, songs.map((s) => ({ songId: s.id })));
  endSelection();
  await services.setlists.open(set.id);
  if (isMobile()) setView('list');
  toast(`Neue Setliste angelegt (${songCount(songs.length)}) – Namen oben eintragen`);
}

$('#sel-actions').onclick = async () => {
  const targets = listBooks().filter((b) => b.id !== book.id && !b.abo && !b.readOnly);
  const allSets = readOnly ? [] : await sets.list();
  const r = $('#sel-actions').getBoundingClientRect();
  showMenu([
    {
      label: 'In anderes Liederbuch kopieren', icon: 'paste', disabled: !targets.length,
      items: targets.map((b) => ({ label: b.name, action: () => copyTo(b) })),
    },
    !readOnly && {
      label: 'Zur Setliste hinzufügen', icon: 'list',
      items: [
        ...allSets.map((s) => ({ label: s.name || 'Ohne Namen', hint: String(s.items.length), action: () => addToSetlist(s.id) })),
        allSets.length ? '-' : null,
        { label: 'Neue Setliste …', icon: 'plus', action: newSetlist },
      ],
    },
    '-',
    !readOnly && { label: 'Löschen', icon: 'trash', danger: true, hint: 'Entf', action: deleteSelected },
  ], { x: r.left, y: r.top - 8, title: `${selection.ids.size} ausgewählt` }).focusFirst();
};

render();
