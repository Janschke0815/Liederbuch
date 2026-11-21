// Abonnierte Liederbücher: per Einladungslink abonnieren, regelmäßig aktualisieren, beenden – und
// einzelne Lieder ins eigene Liederbuch kopieren. Ein Abo ist ein eigenes Liederbuch (eigene
// Datenbank), nur zum Lesen (siehe readOnly in app-state.js).

import { addAboBook, listBooks, removeBook, setActiveBook, PERSONAL } from '../books.js';
import { findDuplicates } from '../core/song-list.js';
import { parseAboLink } from '../formats/abo.js';
import { prefs } from '../prefs.js';
import { SongRepository } from '../storage/repository.js';
import { SetlistRepository } from '../storage/setlists.js';
import { openIdbStore } from '../storage/stores.js';
import { fetchAbo, LoginNeeded } from '../sync/abo-client.js';
import { book, readOnly, repo, sets, services } from './app-state.js';
import { $, toast } from './dom.js';

const CHECK_EVERY_MS = 30 * 60 * 1000; // alle 30 Minuten nachsehen, solange die App offen ist

/** Stand eines Abos in seine Datenbank schreiben. */
async function storeAbo(songRepo, setRepo, data) {
  const r = await songRepo.replaceFromAbo(data.songs);
  await setRepo.replaceFromAbo(data.setlists);
  return r;
}

// ---------- Abonnieren ----------

const dialog = $('#abo-dialog');
let pending = null; // { url, data, user, password }

function setStatus(text, warn = false) {
  $('#abo-status').textContent = text;
  $('#abo-status').classList.toggle('warn', warn);
}

/** Vorschau: laden und anzeigen, was abonniert würde. */
async function check() {
  const url = parseAboLink($('#abo-link').value);
  $('#abo-ok').disabled = true;
  $('#abo-preview').hidden = true;
  if (!url) return setStatus('Bitte den Einladungslink einfügen (beginnt mit https://).', true);
  setStatus('Wird geladen …');
  const user = $('#abo-user').value.trim();
  const password = $('#abo-pass').value;
  try {
    const { data } = await fetchAbo(url, { user, password });
    pending = { url, data, user, password };
    $('#abo-name').textContent = data.name;
    const n = data.songs.length;
    const when = data.publishedAt ? new Date(data.publishedAt).toLocaleDateString('de') : '';
    $('#abo-meta').textContent = [`${n} ${n === 1 ? 'Lied' : 'Lieder'}`, data.setlists.length && `${data.setlists.length} Setliste(n)`,
      data.publisher && `von ${data.publisher}`, when && `Stand ${when}`].filter(Boolean).join(' · ');
    $('#abo-desc').textContent = data.description || '';
    $('#abo-preview').hidden = false;
    $('#abo-ok').disabled = false;
    const known = listBooks().find((b) => b.abo?.url === url);
    setStatus(known ? `Du hast „${known.name}“ schon abonniert – „Abonnieren“ öffnet es und holt den neuesten Stand.` : '');
  } catch (err) {
    if (err instanceof LoginNeeded) {
      $('#abo-login').hidden = false;
      $('#abo-user').focus();
    }
    setStatus(err.message, true);
  }
}

/**
 * Dialog „Liederbuch abonnieren“ öffnen.
 * @param {string} [link]  Einladungslink (sonst trägt man ihn ein)
 */
export function openSubscribe(link = '') {
  pending = null;
  $('#abo-link').value = link;
  $('#abo-link-row').hidden = Boolean(link);
  $('#abo-login').hidden = true;
  $('#abo-user').value = '';
  $('#abo-pass').value = '';
  $('#abo-preview').hidden = true;
  $('#abo-ok').disabled = true;
  setStatus('');
  dialog.showModal();
  if (link) check();
  else $('#abo-link').focus();
}

$('#abo-check').onclick = check;
$('#abo-link').addEventListener('change', check);
$('#abo-ok').onclick = async () => {
  if (!pending) return;
  const { url, data, user, password } = pending;
  $('#abo-ok').disabled = true;
  try {
    const b = addAboBook({ url, name: data.name, publisher: data.publisher, user, password });
    await storeAbo(new SongRepository(await openIdbStore(b.dbName)), new SetlistRepository(await openIdbStore(b.dbName, 'setlists')), data);
    prefs.setIn('aboState', b.id, { checkedAt: new Date().toISOString(), publishedAt: data.publishedAt, count: data.songs.length });
    dialog.close('ok');
    sessionStorage.setItem('aboJustAdded', '1'); // nach dem Neuladen einmal zeigen, wie man zurückkommt
    setActiveBook(b.id);
    location.reload();
  } catch (err) {
    setStatus(err.message, true);
    $('#abo-ok').disabled = false;
  }
};
$('#btn-subscribe').onclick = () => {
  $('#sync-dialog').close();
  openSubscribe();
};

// Einladungslink geöffnet: <App>#abo=…
async function checkAboHash() {
  if (!location.hash.startsWith('#abo=')) return;
  const link = location.hash;
  history.replaceState(null, '', location.pathname + location.search);
  await services.started;
  openSubscribe(link);
}
addEventListener('hashchange', checkAboHash);

// ---------- Geöffnetes Abo: Leiste, Aktualisieren, Beenden ----------

const fmtWhen = (iso) => (iso ? new Date(iso).toLocaleString('de', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' }) : '–');

function renderBar() {
  const st = prefs.get('aboState')[book.id] || {};
  const parts = [book.abo.publisher && `von ${book.abo.publisher}`, `Stand ${fmtWhen(st.publishedAt)}`];
  if (st.error) parts.push(`⚠ ${st.error}`);
  $('#abo-bar-status').textContent = parts.filter(Boolean).join(' · ');
  $('#abo-bar').classList.toggle('warn', Boolean(st.error));
}

let checking = null;
/** Neuen Stand holen (nur, wenn sich die Datei geändert hat). */
export function refreshAbo({ quiet = true } = {}) {
  if (!book.abo || checking) return checking;
  checking = (async () => {
    const st = prefs.get('aboState')[book.id] || {};
    try {
      const r = await fetchAbo(book.abo.url, { user: book.abo.user, password: book.abo.password, etag: st.etag });
      const next = { ...st, checkedAt: new Date().toISOString(), error: '' };
      if (!r.unchanged) {
        const { added, changed, removed } = await storeAbo(repo, sets, r.data);
        Object.assign(next, { etag: r.etag || '', publishedAt: r.data.publishedAt, count: r.data.songs.length });
        const what = [added && `${added} neu`, changed && `${changed} geändert`, removed && `${removed} entfernt`].filter(Boolean);
        if (what.length) toast(`Abo „${book.name}“ aktualisiert: ${what.join(', ')}`);
        else if (!quiet) toast('Das Abo ist auf dem neuesten Stand');
      } else if (!quiet) toast('Das Abo ist auf dem neuesten Stand');
      prefs.setIn('aboState', book.id, next);
    } catch (err) {
      prefs.setIn('aboState', book.id, { ...st, error: navigator.onLine === false ? 'offline' : err.message });
      if (!quiet) toast(err.message);
    } finally {
      checking = null;
      renderBar();
    }
  })();
  return checking;
}

/**
 * Abo auf diesem Gerät beenden (nach Rückfrage): Eintrag, Stand und Lieder löschen. War es geöffnet,
 * geht es zurück zu „Mein Liederbuch“.
 * @param {object} [entry]  Liederbuch-Eintrag aus books.js (sonst das geöffnete Abo)
 * @returns {boolean} beendet?
 */
export function leaveAbo(entry = book) {
  if (!entry?.abo) return false;
  if (!confirm(`Abo „${entry.name}“ auf diesem Gerät beenden? Die Lieder verschwinden hier; das Original bleibt, wo es ist.`)) return false;
  removeBook(entry.id);
  const st = prefs.get('aboState');
  delete st[entry.id];
  prefs.set('aboState', st);
  indexedDB.deleteDatabase(entry.dbName);
  if (entry.id === book.id) {
    setActiveBook(PERSONAL.id);
    location.reload();
  }
  return true;
}

if (book.abo) {
  document.body.dataset.readonly = 'abo';
  $('#abo-bar').hidden = false;
  $('#abo-refresh').onclick = () => refreshAbo({ quiet: false });
  $('#abo-leave').onclick = () => leaveAbo();
  $('#abo-home').onclick = () => {
    setActiveBook(PERSONAL.id);
    location.reload();
  };
  if (sessionStorage.getItem('aboJustAdded')) {
    sessionStorage.removeItem('aboJustAdded');
    toast(`Abo „${book.name}“ geöffnet. Deine eigenen Lieder: oben auf den Namen tippen oder „Mein Liederbuch“`, { ms: 8000 });
  }
  $('#publish-card').hidden = true; // ein Abo veröffentlicht man nicht weiter
  renderBar();
  // erstes Nachsehen startet app.js nach dem Öffnen des ersten Liedes (startAbo)
  setInterval(() => !document.hidden && refreshAbo(), CHECK_EVERY_MS);
  document.addEventListener('visibilitychange', () => {
    const st = prefs.get('aboState')[book.id] || {};
    if (!document.hidden && Date.now() - Date.parse(st.checkedAt || 0) > CHECK_EVERY_MS / 2) refreshAbo();
  });
}

/** Beim Start: Einladungslink prüfen und – in einem Abo – den neuesten Stand holen. */
export function startAbo() {
  checkAboHash();
  if (book.abo) refreshAbo();
}

// ---------- Lieder ins eigene Liederbuch kopieren ----------

/**
 * Lieder aus dem Abo nach „Mein Liederbuch“ kopieren (dort bearbeitbar). Schon vorhandene
 * (gleicher Titel und Interpret) werden übersprungen.
 * @param {object[]} songs  Datensätze aus dem Abo
 */
export async function copyToPersonal(songs) {
  const mine = new SongRepository(await openIdbStore(PERSONAL.dbName));
  const existing = await mine.list();
  let copied = 0;
  let skipped = 0;
  for (const s of songs) {
    if (findDuplicates(existing, s).length) {
      skipped++;
      continue;
    }
    existing.push(await mine.create(s.chordpro, { transpose: s.transpose || 0, accidentals: s.accidentals || 'auto' }));
    copied++;
  }
  toast([copied && `${copied} ${copied === 1 ? 'Lied' : 'Lieder'} nach „Mein Liederbuch“ kopiert`,
    skipped && `${skipped} gab es dort schon`].filter(Boolean).join(' · ') || 'Nichts kopiert');
}
