// Mehrfachauswahl in der Liederliste: Leiste unten (Anzahl, Alle, Aktionen, Löschen) und die Aktionen
// für alle ausgewählten Lieder – löschen (mit Rückgängig), in ein anderes Liederbuch kopieren, zu einer
// Setliste hinzufügen (song-actions.js). Welche Lieder markiert sind, steht in list-select.js.

import { showMenu } from '../context-menu.js';
import { listBooks } from '../books.js';
import { songCount } from '../core/song-copy.js';
import { book, readOnly, repo, state } from './app-state.js';
import { $, toast } from './dom.js';
import { listEl, listedSongs } from './list.js';
import { endSelection, selectAllVisible, selection, startSelection } from './list-select.js';
import { flushSave, openSong } from './song.js';
import { copySongsTo, setlistMenu } from './song-actions.js';

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

$('#sel-actions').onclick = async () => {
  const targets = listBooks().filter((b) => b.id !== book.id && !b.abo && !b.readOnly);
  const r = $('#sel-actions').getBoundingClientRect();
  showMenu([
    {
      label: 'In anderes Liederbuch kopieren', icon: 'paste', disabled: !targets.length,
      items: targets.map((b) => ({
        label: b.name,
        action: async () => {
          const songs = await chosen();
          endSelection();
          await copySongsTo(songs, b);
        },
      })),
    },
    !readOnly && await setlistMenu(chosen, endSelection),
    '-',
    !readOnly && { label: 'Löschen', icon: 'trash', danger: true, hint: 'Entf', action: deleteSelected },
  ], { x: r.left, y: r.top - 8, title: `${selection.ids.size} ausgewählt` }).focusFirst();
};

render();
