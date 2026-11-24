// Was man mit ganzen Liedern tun kann: anlegen, löschen, duplizieren, zu einer Setliste hinzufügen,
// in ein anderes Liederbuch kopieren. Wird von Knöpfen, Kontextmenüs und der Mehrfachauswahl benutzt.

import { setActiveBook } from '../books.js';
import { setMeta } from '../core/meta-edit.js';
import { planCopy, songCount } from '../core/song-copy.js';
import { NEW_SONG_TEMPLATE } from '../sample.js';
import { SongRepository } from '../storage/repository.js';
import { openIdbStore } from '../storage/stores.js';
import { readOnly, repo, sets, state, services } from './app-state.js';
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

/** Neues Lied aus der Vorlage anlegen und den Titel zum Überschreiben markieren. */
export async function newSong() {
  if (readOnly) return;
  await createAndOpen(NEW_SONG_TEMPLATE);
  setView('editor');
  editor.focus();
  editor.setSelectionRange(8, 18); // "Neues Lied" markieren
}
$('#btn-new').onclick = newSong;

/** Lied im Spielmodus zeigen (ohne id: das geöffnete). */
export async function playSong(id = state.current?.id) {
  if (!id) return;
  await flushSave();
  if (id !== state.current?.id) await openSong(id);
  services.play.open(id);
}

/** Lied löschen (in den Papierkorb), mit "Rückgängig". */
export async function deleteSong(id) {
  if (readOnly) return;
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

/** „Titel“ bei einem Lied, sonst „3 Lieder“ – für Rückmeldungen. */
const songsLabel = (songs) => (songs.length === 1 ? `„${songs[0].title || 'Ohne Titel'}“` : songCount(songs.length));

/** Lieder hinten an eine Setliste anhängen. */
export async function addToSetlist(setId, songs) {
  const set = await sets.get(setId);
  if (!set || !songs.length) return;
  await sets.update(setId, { items: [...set.items, ...songs.map((s) => ({ songId: s.id, transpose: null, note: '' }))] });
  toast(`${songsLabel(songs)} zu „${set.name}“ hinzugefügt`, {
    action: 'Anzeigen',
    onAction: () => services.setlists.open(setId),
  });
}

/** Neue Setliste mit diesen Liedern anlegen und öffnen. */
export async function newSetlistWith(songs) {
  const set = await sets.create(`Setliste ${new Date().toLocaleDateString('de')}`, songs.map((s) => ({ songId: s.id })));
  await services.setlists.open(set.id);
  if (isMobile()) setView('list');
  toast(`Neue Setliste angelegt${songs.length > 1 ? ` (${songCount(songs.length)})` : ''} – Namen oben eintragen`);
}

/**
 * Untermenü „Zur Setliste hinzufügen“ (Kontextmenü eines Liedes, Mehrfachauswahl).
 * @param {() => Promise<object[]>} getSongs  liefert die Lieder erst beim Klicken
 * @param {() => void} [done]                 danach aufrufen (z. B. Auswahl beenden)
 */
export async function setlistMenu(getSongs, done = () => {}) {
  const allSets = await sets.list();
  const run = (fn) => async () => {
    const songs = await getSongs();
    if (!songs.length) return;
    done();
    await fn(songs);
  };
  return {
    label: 'Zur Setliste hinzufügen', icon: 'list',
    items: [
      ...allSets.map((s) => ({ label: s.name || 'Ohne Namen', hint: String(s.items.length), action: run((songs) => addToSetlist(s.id, songs)) })),
      allSets.length ? '-' : null,
      { label: 'Neue Setliste …', icon: 'plus', action: run(newSetlistWith) },
    ],
  };
}

/**
 * Lieder in ein anderes Liederbuch kopieren; was es dort schon gibt (gleicher Titel und Interpret),
 * wird übersprungen. Die Rückmeldung bietet an, das Ziel zu öffnen.
 * @param {object[]} songs  Datensätze (Reihenfolge bleibt)
 * @param {{id: string, name: string, dbName: string}} target  Ziel-Liederbuch (aus listBooks())
 */
export async function copySongsTo(songs, target) {
  await flushSave();
  const dest = new SongRepository(await openIdbStore(target.dbName));
  const { copy, skip } = planCopy(songs, await dest.list());
  for (const s of copy) await dest.create(s.chordpro, { transpose: s.transpose || 0, accidentals: s.accidentals || 'auto', note: s.note || '' });
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
