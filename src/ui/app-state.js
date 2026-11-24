// Gemeinsamer Zustand der Oberfläche: welches Liederbuch, seine Datenbanken und das gerade
// geöffnete Lied. Alle ui-Module holen sich das hier, statt es herumzureichen.
//
// Ereignisse, auf die sich Module anmelden können (auf window, wenn nicht anders angegeben):
//   songopened        ein anderes Lied ist geöffnet (detail: id oder null)            ui/song.js
//   previewrendered   die Vorschau ist neu gezeichnet                                 ui/song.js
//   settingschange    Anzeige-Einstellungen geändert (detail: Einstellungen)          settings/settings.js
//   selectionchange   Mehrfachauswahl in der Liste geändert                           ui/list-select.js
//   playsong          Spielmodus zeigt ein Lied (detail: {chordpro, transpose, accidentals})  play-mode.js
//   metronome-beat    Schlag des Metronoms (detail: Nummer im Takt)                   ui/preview-tools.js
//   repo/sets 'change'         Lieder bzw. Setlisten geändert (eigene oder vom Abgleich)  storage/*.js
//   repo/sets 'remote-change'  nur Änderungen vom Abgleich (detail: IDs)                  storage/*.js
//   'remote-name' (BookNameStore)  Buch auf einem anderen Gerät umbenannt                 sync/book-name.js

import { activeBook } from '../books.js';
import { SongRepository } from '../storage/repository.js';
import { SetlistRepository } from '../storage/setlists.js';
import { openIdbStore } from '../storage/stores.js';

/** Persönliches oder gemeinsames Liederbuch. */
export const book = activeBook();
export const repo = new SongRepository(await openIdbStore(book.dbName));
export const sets = new SetlistRepository(await openIdbStore(book.dbName, 'setlists'));

/**
 * Nur lesen (Text ändern, anlegen, löschen gesperrt): abonniertes Liederbuch oder ein in Google Drive
 * geteiltes Liederbuch, für das man nur Leserechte hat.
 */
export const readOnly = Boolean(book.abo || book.readOnly);

/** Veränderlicher Zustand. current: das geöffnete Lied (Datensatz aus repo) oder null. */
export const state = { current: null };

/**
 * Teile, die app.js beim Start einrichtet und die mehrere Module brauchen:
 *   printer   setupPrint()     – printSongs(list, opts)
 *   play      setupPlayMode()  – open(id, list?)
 *   setlists  setupSetlists()  – open(id)
 *   sync      setupSync()      – shareState(), openCloud({provider, members}), openNewBook({where, copy})
 *   live      setupLive()      – open()
 *   started   Promise, erfüllt sobald das erste Lied geöffnet ist
 */
export const services = { printer: null, play: null, setlists: null, sync: null, live: null, started: null };
