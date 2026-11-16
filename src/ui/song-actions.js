// Was man mit einem ganzen Lied tun kann: anlegen, löschen, duplizieren, zu einer Setliste
// hinzufügen. Wird von Knöpfen und Kontextmenüs benutzt.

import { setMeta } from '../core/meta-edit.js';
import { NEW_SONG_TEMPLATE } from '../sample.js';
import { repo, sets, state, services } from './app-state.js';
import { $, isMobile, toast } from './dom.js';
import { clearSearch } from './list.js';
import { editor, flushSave, openSong } from './song.js';
import { setView, setFocusMode, isFocusMode } from './view.js';

/** Neues Lied aus ChordPro-Text anlegen und öffnen. */
export async function createAndOpen(chordpro) {
  await flushSave();
  const rec = await repo.create(chordpro);
  clearSearch();
  await openSong(rec.id);
  return rec;
}

$('#btn-new').onclick = async () => {
  await createAndOpen(NEW_SONG_TEMPLATE);
  setView('editor');
  editor.focus();
  editor.setSelectionRange(8, 18); // "Neues Lied" markieren
};

/** Lied löschen (in den Papierkorb), mit "Rückgängig". */
export async function deleteSong(id) {
  await flushSave();
  const song = await repo.get(id);
  if (!song) return;
  await repo.remove(id);
  if (state.current?.id === id) await openSong((await repo.list())[0]?.id);
  toast(`„${song.title || 'Ohne Titel'}“ gelöscht`, {
    action: 'Rückgängig',
    onAction: async () => {
      await repo.restore(id);
      await openSong(id);
    },
  });
}
$('#btn-delete').onclick = () => state.current && deleteSong(state.current.id);

/** Lied als Kopie anlegen und öffnen. */
export async function duplicateSong(id) {
  await flushSave();
  const s = await repo.get(id);
  if (!s) return;
  const text = setMeta(s.chordpro, 'title', `${s.title || 'Ohne Titel'} (Kopie)`);
  const rec = await repo.create(text, { transpose: s.transpose, accidentals: s.accidentals, note: s.note || '' });
  await openSong(rec.id);
  toast('Kopie angelegt');
}

/** Editor zeigen und hineinspringen. */
export function editSong() {
  if (isFocusMode()) setFocusMode(false);
  setView('editor');
  editor.focus();
}

/** Lied aus der Liste bzw. dem geöffneten Lied drucken. */
export function printSong(song) {
  return services.printer.printSongs([song], { cover: false, toc: false, useSavedTranspose: true });
}

async function addToSetlist(setId, songId) {
  const set = await sets.get(setId);
  const song = await repo.get(songId);
  if (!set || !song) return;
  await sets.update(setId, { items: [...set.items, { songId, transpose: null, note: '' }] });
  toast(`„${song.title || 'Ohne Titel'}“ zu „${set.name}“ hinzugefügt`, {
    action: 'Anzeigen',
    onAction: () => services.setlists.open(setId),
  });
}

async function newSetlistWith(songId) {
  const set = await sets.create(`Setliste ${new Date().toLocaleDateString('de')}`, [{ songId }]);
  await services.setlists.open(set.id);
  if (isMobile()) setView('list');
  toast('Neue Setliste angelegt – Namen oben eintragen');
}

/** Untermenü "Zur Setliste hinzufügen" für ein Lied (Kontextmenü). */
export async function setlistMenu(songId) {
  const allSets = await sets.list();
  return {
    label: 'Zur Setliste hinzufügen', icon: 'list',
    items: [
      ...allSets.map((s) => ({ label: s.name || 'Ohne Namen', hint: String(s.items.length), action: () => addToSetlist(s.id, songId) })),
      allSets.length ? '-' : null,
      { label: 'Neue Setliste …', icon: 'plus', action: () => newSetlistWith(songId) },
    ],
  };
}
