// Oberfläche: Liederliste, Editor, Vorschau. Speichert automatisch in IndexedDB.

import { parseChordPro } from './core/chordpro.js';
import { ugToChordPro } from './core/ug-import.js';
import { parseImportFile } from './core/file-import.js';
import { renderSong } from './render/song-view.js';
import { SongRepository } from './storage/repository.js';
import { openIdbStore } from './storage/stores.js';
import { SAMPLE_SONG, NEW_SONG_TEMPLATE } from './sample.js';
import { setupPrint } from './print-ui.js';
import { setupSettings } from './settings-ui.js';

const $ = (s) => document.querySelector(s);
const editor = $('#editor');
const preview = $('#preview');
const listEl = $('#song-list');
const search = $('#search');
const isMobile = () => matchMedia('(max-width: 760px)').matches;

const repo = new SongRepository(await openIdbStore());
navigator.storage?.persist?.(); // Browser bitten, die Daten nicht automatisch zu löschen

let current = null; // aktuell geöffnetes Lied (Datensatz)
let saveTimer = null;

// ---------- Hilfen ----------

let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), 3500);
}

function setStatus(text) {
  $('#save-status').textContent = text;
}

function setView(view) {
  $('.workspace').dataset.view = view;
  document.querySelectorAll('.mobile-tabs button').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
}

// ---------- Liste ----------

async function refreshList() {
  const songs = await repo.list({ query: search.value });
  listEl.replaceChildren(
    ...songs.map((s) => {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'song-item' + (current && s.id === current.id ? ' active' : '');
      btn.dataset.id = s.id;
      const title = document.createElement('span');
      title.className = 'song-item-title';
      title.textContent = s.title || 'Ohne Titel';
      const artist = document.createElement('span');
      artist.className = 'song-item-artist';
      artist.textContent = s.artist;
      btn.append(title, artist);
      li.append(btn);
      return li;
    }),
  );
  const total = search.value ? `${songs.length} Treffer` : `${songs.length} ${songs.length === 1 ? 'Lied' : 'Lieder'}`;
  $('#song-count').textContent = total;
}

listEl.addEventListener('click', async (e) => {
  const btn = e.target.closest('.song-item');
  if (!btn) return;
  await openSong(btn.dataset.id);
  if (isMobile()) setView('preview');
});

let searchTimer;
search.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(refreshList, 150);
});

// ---------- Lied öffnen / speichern ----------

function renderPreview() {
  if (!current) {
    preview.replaceChildren(Object.assign(document.createElement('p'), { className: 'empty', textContent: 'Kein Lied ausgewählt.' }));
    return;
  }
  const song = parseChordPro(editor.value);
  preview.replaceChildren(renderSong(song, { transpose: current.transpose, accidentals: current.accidentals }));
}

function updateControls() {
  const has = Boolean(current);
  editor.disabled = !has;
  for (const id of ['#tr-up', '#tr-down', '#accidentals', '#btn-delete']) $(id).disabled = !has;
  const t = current?.transpose || 0;
  $('#tr-value').textContent = (t > 0 ? '+' : '') + t;
  $('#accidentals').value = current?.accidentals || 'auto';
}

async function openSong(id) {
  await flushSave();
  current = id ? await repo.get(id) : null;
  editor.value = current?.chordpro ?? '';
  if (current) localStorage.setItem('lastSong', current.id);
  setStatus('');
  updateControls();
  renderPreview();
  await refreshList();
}

async function flushSave() {
  if (!saveTimer) return;
  clearTimeout(saveTimer);
  saveTimer = null;
  if (!current) return;
  try {
    current = await repo.update(current.id, { chordpro: editor.value });
    setStatus('Gespeichert');
    await refreshList();
  } catch (err) {
    setStatus('Fehler beim Speichern!');
    console.error(err);
  }
}

editor.addEventListener('input', () => {
  renderPreview();
  setStatus('Ungespeichert …');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flushSave, 500);
});
editor.addEventListener('blur', flushSave);
addEventListener('pagehide', flushSave);
document.addEventListener('visibilitychange', () => document.hidden && flushSave());

async function setViewOption(changes) {
  if (!current) return;
  await flushSave();
  current = await repo.update(current.id, changes);
  updateControls();
  renderPreview();
}

$('#tr-up').onclick = () => setViewOption({ transpose: current.transpose + 1 });
$('#tr-down').onclick = () => setViewOption({ transpose: current.transpose - 1 });
$('#accidentals').onchange = (e) => setViewOption({ accidentals: e.target.value });

// Layout-Einstellungen wirken live auf die Vorschau
setupSettings({ targets: () => [preview] });

// ---------- Anlegen / Löschen ----------

async function createAndOpen(chordpro) {
  await flushSave();
  const rec = await repo.create(chordpro);
  search.value = '';
  await openSong(rec.id);
  return rec;
}

$('#btn-new').onclick = async () => {
  await createAndOpen(NEW_SONG_TEMPLATE);
  setView('editor');
  editor.focus();
  editor.setSelectionRange(8, 18); // "Neues Lied" markieren
};

$('#btn-delete').onclick = async () => {
  if (!current) return;
  if (!confirm(`„${current.title || 'Ohne Titel'}“ wirklich löschen?`)) return;
  clearTimeout(saveTimer);
  saveTimer = null;
  await repo.remove(current.id);
  const next = (await repo.list())[0];
  await openSong(next?.id);
  toast('Lied gelöscht');
};

// ---------- Text einfügen (Akkorde über Text) ----------

const dlg = $('#import-dialog');
$('#btn-import').onclick = () => {
  $('#imp-title').value = '';
  $('#imp-artist').value = '';
  $('#imp-text').value = '';
  dlg.showModal();
};
dlg.addEventListener('close', async () => {
  if (dlg.returnValue !== 'ok') return;
  const text = $('#imp-text').value;
  if (!text.trim()) return;
  await createAndOpen(ugToChordPro(text, { title: $('#imp-title').value.trim(), artist: $('#imp-artist').value.trim() }));
  setView('editor');
  toast('Umgewandelt – bitte im Editor prüfen');
});

// ---------- Datei öffnen / Sichern ----------

$('#btn-open').onclick = () => $('#file-input').click();
$('#file-input').onchange = async (e) => {
  const files = [...e.target.files];
  e.target.value = '';
  await importFiles(files);
};

/** Importiert Dateien (Sicherung, ChordPro, Text) – aus dem Dateidialog oder per "Öffnen mit". */
async function importFiles(files) {
  await flushSave();
  let created = 0;
  let firstId = null;
  const messages = [];
  for (const file of files) {
    try {
      const parsed = parseImportFile(file.name, await file.text());
      if (parsed.kind === 'backup') {
        const r = await repo.importData(parsed.data);
        messages.push(`${file.name}: ${r.added} neu, ${r.updated} aktualisiert, ${r.skipped} übersprungen`);
      } else {
        for (const cp of parsed.songs) {
          const rec = await repo.create(cp);
          firstId ||= rec.id;
          created++;
        }
      }
    } catch (err) {
      messages.push(`${file.name}: ${err.message}`);
    }
  }
  if (created) messages.unshift(`${created} ${created === 1 ? 'Lied' : 'Lieder'} importiert`);
  if (firstId) await openSong(firstId);
  else if (!current) await openSong((await repo.list())[0]?.id);
  else await refreshList();
  toast(messages.join(' · ') || 'Nichts importiert');
}

// Installierte App: Dateien per "Öffnen mit Liederbuch" (Desktop-Chrome/Edge)
if ('launchQueue' in window) {
  window.launchQueue.setConsumer(async (params) => {
    if (!params.files?.length) return;
    await started;
    await importFiles(await Promise.all(params.files.map((h) => h.getFile())));
  });
}

$('#btn-export').onclick = async () => {
  await flushSave();
  const data = await repo.exportData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `liederbuch-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast(`${data.songs.length} Lieder gesichert`);
};

// ---------- Mobile Ansicht ----------

document.querySelectorAll('.mobile-tabs button').forEach((b) => {
  b.onclick = async () => {
    if (b.dataset.view !== 'editor') await flushSave();
    setView(b.dataset.view);
  };
});

// ---------- Drucken ----------

setupPrint({ repo, beforeOpen: flushSave });

// ---------- Start ----------

async function start() {
  let songs = await repo.list();
  if (!songs.length) {
    // Entwurf aus Schritt 1 (localStorage) übernehmen, sonst Beispiel anlegen
    const draft = localStorage.getItem('draft');
    await repo.create(draft?.trim() ? draft : SAMPLE_SONG);
    localStorage.removeItem('draft');
    songs = await repo.list();
  }
  const last = localStorage.getItem('lastSong');
  await openSong(songs.some((s) => s.id === last) ? last : songs[0].id);
}

const started = start();
