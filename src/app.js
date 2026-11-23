// Einstieg der App: steckt die Teile der Oberfläche zusammen und öffnet das erste Lied.
//
// Wo was steht:
//   ui/app-state.js     Liederbuch, Datenbanken, geöffnetes Lied
//   ui/dom.js           kleine Hilfen ($, toast, ask …)
//   ui/song.js          Lied öffnen/speichern, Vorschau, Transponieren, Liedinfo
//   ui/list.js          Liederliste mit Suche, Filtern, Sortierung
//   ui/view.js          Handy-Reiter, Editor ausblenden, Menü
//   ui/song-actions.js  Anlegen, Löschen, Duplizieren, Setliste
//   ui/snippets.js      Bausteine über dem Editor, Syntax-Hilfe
//   ui/preview-tools.js Zoom, Metronom
//   ui/paste.js         Text einfügen, Lesezeichen „Ins Liederbuch“
//   ui/add-songs.js     Anlegen mit Nachfrage bei doppelten Liedern
//   ui/files.js         Dateien öffnen, ZIP-Sicherung
//   ui/abo.js, ui/publish.js   Liederbuch abonnieren bzw. für eine Gruppe veröffentlichen
//   ui/trash.js, share.js, capo-help.js, context-menus.js
//   ui/app-keys.js, ui/shortcuts.js   Tastenkürzel
//   play-mode.js, print-ui.js, setlist-ui.js, settings-ui.js, sync-ui.js   größere Bereiche

import { bookKey, PERSONAL } from './books.js';
import { prefs } from './prefs.js';
import { SAMPLE_SONG } from './sample.js';
import { slimSetlist } from './storage/setlists.js';
import { versionLabel } from './version.js';
import { setupPlayMode } from './play-mode.js';
import { setupPrint } from './print-ui.js';
import { setupSetlists } from './setlist-ui.js';
import { setupSettings } from './settings-ui.js';
import { setupSync } from './sync-ui.js';
import { setupLive } from './live-ui.js';
import { book, repo, sets, state, services } from './ui/app-state.js';
import { $, closeOnBackdrop, isMobile, toast } from './ui/dom.js';
import { flushSave, openSong, preview } from './ui/song.js';
import { listedSongs, refreshList } from './ui/list.js';
import { setView } from './ui/view.js';
import { checkBookmarkHash } from './ui/paste.js';
import { leaveAbo, refreshAbo, startAbo } from './ui/abo.js';
import './ui/publish.js';
import './ui/song-actions.js';
import './ui/snippets.js';
import './ui/preview-tools.js';
import './ui/add-songs.js';
import './ui/files.js';
import './ui/trash.js';
import './ui/share.js';
import './ui/capo-help.js';
import './ui/context-menus.js';
import './ui/app-keys.js';
import './ui/toolbar.js';
import './ui/chord-tap.js';
import './ui/share-with.js';

if (book.shared) document.title = `${book.name} – Liederbuch`;
navigator.storage?.persist?.(); // Browser bitten, die Daten nicht automatisch zu löschen

// Version der App: in den Einstellungen und als Hinweis am App-Namen
$('#app-version').textContent = versionLabel();
$('#app-name').title = `Liederbuch ${versionLabel()}`;

// Einstellungen wirken live auf Vorschau und Import-Vorschau
setupSettings({ targets: () => [preview, $('#imp-preview')] });
closeOnBackdrop('#print-dialog', '#settings-dialog');

// ---------- Größere Bereiche ----------

services.printer = setupPrint({ repo, beforeOpen: flushSave });

services.play = setupPlayMode({
  repo,
  // Blättern in der Reihenfolge der (ggf. gefilterten und sortierten) Liste
  getSongIds: async () => (await listedSongs()).map((s) => s.id),
  onClose: (id) => {
    if (id && id !== state.current?.id) openSong(id);
    else refreshList(); // „zuletzt gespielt“ hat sich geändert
  },
});
$('#btn-play').onclick = async () => {
  if (!state.current) return;
  await flushSave();
  services.play.open(state.current.id);
};

setupLive();

services.setlists = setupSetlists({
  repo,
  sets,
  toast,
  play: services.play,
  getCurrentId: () => state.current?.id || null,
  openSong: async (id) => {
    await openSong(id);
    if (isMobile()) setView('preview');
  },
  printSongs: (list, opts) => services.printer.printSongs(list, opts),
});

services.sync = setupSync({
  repo,
  extra: [{ key: 'setlists', repo: sets, slim: slimSetlist }],
  book,
  toast,
  beforeSync: flushSave,
  beforeSwitch: flushSave,
  leaveAbo,
  refreshAbo,
  // Neues Gerät: das unveränderte Beispiellied nicht in das gemeinsame Liederbuch tragen
  beforeConnect: async () => {
    const all = await repo.list();
    if (all.length && all.every((s) => s.chordpro === SAMPLE_SONG && s.createdAt === s.updatedAt)) {
      for (const s of all) await repo.remove(s.id);
    }
  },
});

// ---------- Start ----------

async function start() {
  let songs = await repo.list();
  // Beispiellied nur im persönlichen Liederbuch beim allerersten Start – weitere Bücher bleiben leer
  if (!songs.length && book.id === PERSONAL.id && !localStorage.getItem(bookKey(book, 'sync.provider'))) {
    // Entwurf aus der allerersten Version (localStorage) übernehmen, sonst Beispiel anlegen
    const draft = prefs.get('draft');
    await repo.create(draft.trim() ? draft : SAMPLE_SONG);
    prefs.remove('draft');
    songs = await repo.list();
  }
  const last = prefs.get('lastSong');
  await openSong(songs.some((s) => s.id === last) ? last : songs[0]?.id);
}

services.started = start();
checkBookmarkHash();
startAbo();
