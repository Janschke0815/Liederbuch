// Gemeinsamer Zustand der Oberfläche: welches Liederbuch, seine Datenbanken und das gerade
// geöffnete Lied. Alle ui-Module holen sich das hier, statt es herumzureichen.
//
// Ereignisse (auf window), auf die sich Module anmelden können:
//   songopened   ein anderes Lied ist geöffnet (detail: id oder null)
//   repo 'change'  Lieder wurden geändert (eigene oder vom Abgleich)

import { activeBook } from '../books.js';
import { SongRepository } from '../storage/repository.js';
import { SetlistRepository } from '../storage/setlists.js';
import { openIdbStore } from '../storage/stores.js';

/** Persönliches oder gemeinsames Liederbuch. */
export const book = activeBook();
export const repo = new SongRepository(await openIdbStore(book.dbName));
export const sets = new SetlistRepository(await openIdbStore(book.dbName, 'setlists'));

/** Abonniertes Liederbuch: nur lesen (Text ändern, anlegen, löschen gesperrt). */
export const readOnly = Boolean(book.abo);

/** Veränderlicher Zustand. current: das geöffnete Lied (Datensatz aus repo) oder null. */
export const state = { current: null };

/**
 * Teile, die app.js beim Start einrichtet und die mehrere Module brauchen:
 *   printer   setupPrint()     – printSongs(list, opts)
 *   play      setupPlayMode()  – open(id, list?)
 *   setlists  setupSetlists()  – open(id)
 *   started   Promise, erfüllt sobald das erste Lied geöffnet ist
 */
export const services = { printer: null, play: null, setlists: null, started: null };
