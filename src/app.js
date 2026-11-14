// Oberfläche: Liederliste, Editor, Vorschau. Speichert automatisch in IndexedDB.

import { parseChordPro } from './core/chordpro.js';
import { ugToChordPro } from './core/ug-import.js';
import { parseImportFile } from './core/file-import.js';
import { renderSong, songKey } from './render/song-view.js';
import { SongRepository } from './storage/repository.js';
import { openIdbStore } from './storage/stores.js';
import { SAMPLE_SONG, NEW_SONG_TEMPLATE } from './sample.js';
import { setupPrint } from './print-ui.js';
import { setupSettings } from './settings-ui.js';
import { setupSync } from './sync-ui.js';
import { bumpRepeat } from './core/repeat.js';
import { activeBook } from './books.js';
import { setupPlayMode } from './play-mode.js';
import { getAllMeta, setMeta } from './core/meta-edit.js';
import { transposeChord } from './core/chords.js';
import { applySettings, loadSettings } from './settings/settings.js';

const $ = (s) => document.querySelector(s);
const editor = $('#editor');
const preview = $('#preview');
const listEl = $('#song-list');
const search = $('#search');
const isMobile = () => matchMedia('(max-width: 760px)').matches;

const book = activeBook(); // persönliches oder gemeinsames Liederbuch
const repo = new SongRepository(await openIdbStore(book.dbName));
if (book.shared) document.title = `${book.name} – Liederbuch`;
navigator.storage?.persist?.(); // Browser bitten, die Daten nicht automatisch zu löschen

let current = null; // aktuell geöffnetes Lied (Datensatz)
let saveTimer = null;

// ---------- Hilfen ----------

let toastTimer;
/** Kurze Meldung unten; optional mit Knopf (z. B. "Rückgängig"). */
function toast(msg, { action, onAction, ms = 3500 } = {}) {
  const t = $('#toast');
  const btn = $('#toast-action');
  $('#toast-text').textContent = msg;
  btn.hidden = !action;
  btn.textContent = action || '';
  btn.onclick = async () => {
    t.hidden = true;
    await onAction?.();
  };
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), action ? Math.max(ms, 6000) : ms);
}

function setStatus(text, state = '') {
  const el = $('#save-status');
  el.textContent = text;
  el.title = text;
  el.dataset.state = state;
}

const isTyping = (el) => el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
const anyDialogOpen = () =>
  Boolean(document.querySelector('dialog[open]')) || !$('#print-view').hidden || !$('#play-view').hidden;

function setView(view) {
  $('.workspace').dataset.view = view;
  document.querySelectorAll('.mobile-tabs button').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
}

// ---------- Liste ----------

async function refreshList() {
  const songs = await repo.list({ query: search.value });
  const items = [];
  let letter = null;
  for (const s of songs) {
    if (!search.value) {
      const first = (s.sortTitle || s.title || '#').trim().charAt(0).toLocaleUpperCase('de');
      const l = /[A-ZÄÖÜ]/.test(first) ? first.normalize('NFD').charAt(0) : '#';
      if (l !== letter) {
        letter = l;
        items.push(Object.assign(document.createElement('li'), { className: 'song-letter', textContent: l }));
      }
    }
    items.push(s);
  }
  listEl.replaceChildren(
    ...items.map((s) => {
      if (s instanceof HTMLElement) return s;
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
  if (!songs.length) {
    listEl.append(Object.assign(document.createElement('li'), {
      className: 'list-empty',
      textContent: search.value ? 'Nichts gefunden.' : book.shared ? 'Noch keine Lieder – sie erscheinen nach dem Abgleich oder mit „Neues Lied“.' : 'Noch keine Lieder.',
    }));
  }
  const total = search.value ? `${songs.length} Treffer` : `${songs.length} ${songs.length === 1 ? 'Lied' : 'Lieder'}`;
  $('#song-count').textContent = total;
}

listEl.addEventListener('click', async (e) => {
  const btn = e.target.closest('.song-item');
  if (!btn) return;
  await openSong(btn.dataset.id);
  if (isMobile()) setView('preview');
});

// Pfeiltasten in der Liste
listEl.addEventListener('keydown', (e) => {
  if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
  const btns = [...listEl.querySelectorAll('.song-item')];
  const i = btns.indexOf(document.activeElement);
  const next = btns[i + (e.key === 'ArrowDown' ? 1 : -1)];
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
    listEl.querySelector('.song-item')?.focus();
  } else if (e.key === 'Enter') {
    listEl.querySelector('.song-item')?.click();
  } else if (e.key === 'Escape' && search.value) {
    search.value = '';
    refreshList();
  }
});

// ---------- Lied öffnen / speichern ----------

function renderPreview() {
  if (!current) {
    preview.replaceChildren(Object.assign(document.createElement('p'), { className: 'empty', textContent: 'Kein Lied ausgewählt.' }));
    fillMeta();
    return;
  }
  const song = parseChordPro(editor.value);
  const opts = { transpose: current.transpose, accidentals: current.accidentals };
  preview.replaceChildren(renderSong(song, opts));
  const k = songKey(song, opts);
  fillMeta(song);
  const keyEl = $('#key-value');
  keyEl.textContent = k ? k.key : '–';
  keyEl.classList.toggle('guessed', Boolean(k?.guessed));
  const capo = Number(song.meta.capo) || 0;
  keyEl.parentElement.title = (k?.guessed
    ? 'Tonart geschätzt aus dem ersten Akkord – unter „Liedinfo“ festlegen'
    : 'Tonart (Transposition wird mit dem Lied gespeichert)') +
    (k && capo > 0 ? `
Griffe in ${k.key}, klingt mit Capo ${capo} in ${transposeChord(k.key, capo)}` : '');
}

function updateControls() {
  const has = Boolean(current);
  editor.disabled = !has;
  for (const b of document.querySelectorAll('#tr-up, #tr-down, #accidentals button, #btn-delete, #btn-play, .snippets button')) b.disabled = !has;
  const t = current?.transpose || 0;
  const out = $('#tr-value');
  out.textContent = (t > 0 ? '+' : '') + t;
  out.classList.toggle('changed', t !== 0);
  $('#tr-reset').hidden = t === 0;
  const acc = current?.accidentals || 'auto';
  for (const b of document.querySelectorAll('#accidentals button')) b.setAttribute('aria-checked', String(b.dataset.value === acc));
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
    setStatus('Gespeichert', 'saved');
    await refreshList();
  } catch (err) {
    setStatus('Fehler beim Speichern!', 'error');
    console.error(err);
  }
}

editor.addEventListener('input', () => {
  renderPreview();
  setStatus('Ungespeichert …', 'dirty');
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
$('#tr-reset').onclick = () => setViewOption({ transpose: 0 });
$('#accidentals').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-value]');
  if (b) setViewOption({ accidentals: b.dataset.value });
});

// Editor ausblenden (nur Liste + Vorschau), z. B. zum Spielen
function setFocusMode(on) {
  $('.workspace').classList.toggle('focus', on);
  $('#btn-focus').setAttribute('aria-pressed', String(on));
  localStorage.setItem('focusMode', on ? '1' : '');
}
$('#btn-focus').onclick = () => setFocusMode(!$('.workspace').classList.contains('focus'));
setFocusMode(Boolean(localStorage.getItem('focusMode')));

// Layout-Einstellungen wirken live auf Vorschau und Import-Vorschau
setupSettings({ targets: () => [preview, $('#imp-preview')] });

// ---------- Liedinfo (Titel, Capo, Takt …) ----------

const metaBox = $('#song-meta');
const metaInputs = [...metaBox.querySelectorAll('[data-meta]')];
metaBox.open = localStorage.getItem('songMetaOpen') !== '0';
metaBox.addEventListener('toggle', () => localStorage.setItem('songMetaOpen', metaBox.open ? '1' : '0'));

function fillMeta(song) {
  const m = getAllMeta(editor.value);
  for (const el of metaInputs) {
    el.disabled = !current;
    if (el === document.activeElement) continue;
    const v = m[el.dataset.meta];
    if (el.tagName === 'SELECT' && v && ![...el.options].some((o) => o.value === v)) el.add(new Option(v, v));
    el.value = v;
  }
  const capo = Number(m.capo) || 0;
  $('#meta-summary').textContent = [
    m.key && `Tonart ${m.key}`, capo > 0 && `Capo ${capo}`, m.time && `${m.time}-Takt`, m.tempo && `${m.tempo} bpm`,
  ].filter(Boolean).join(' · ');
  const capoChip = $('#capo-chip');
  capoChip.hidden = !(capo > 0);
  capoChip.textContent = `Capo ${m.capo}`;
  capoChip.title = `Kapodaster im ${m.capo}. Bund`;
  const timeChip = $('#time-chip');
  const timeText = [m.time, m.tempo && `♩ ${m.tempo}`].filter(Boolean).join(' · ');
  timeChip.hidden = !timeText;
  timeChip.textContent = timeText;
  timeChip.title = [m.time && `${m.time}-Takt`, m.tempo && `Tempo ${m.tempo} Schläge/Minute`].filter(Boolean).join(', ');
}

for (const el of metaInputs) {
  el.addEventListener('input', () => {
    if (!current) return;
    const { selectionStart: a, selectionEnd: b, value: before } = editor;
    editor.value = setMeta(editor.value, el.dataset.meta, el.value);
    // Cursor im Editor ungefähr halten
    const shift = editor.value.length - before.length;
    editor.setSelectionRange(Math.max(0, a + shift), Math.max(0, b + shift));
    editor.dispatchEvent(new Event('input'));
  });
}

// ---------- Editor: Bausteine einfügen ----------

function insertText(text, selectFrom, selectTo) {
  editor.focus();
  const start = editor.selectionStart;
  // execCommand erhält den Rückgängig-Verlauf des Browsers
  if (!document.execCommand?.('insertText', false, text)) {
    editor.setRangeText(text, editor.selectionStart, editor.selectionEnd, 'end');
    editor.dispatchEvent(new Event('input'));
  }
  if (selectFrom !== undefined) editor.setSelectionRange(start + selectFrom, start + (selectTo ?? selectFrom));
}

function insertSnippet(kind) {
  const sel = editor.value.slice(editor.selectionStart, editor.selectionEnd);
  if (kind === 'chord') {
    const name = sel.trim() || '';
    return insertText(`[${name}]`, 1, 1 + name.length);
  }
  if (kind === 'comment') {
    const t = sel.trim() || 'Hinweis';
    return insertText(`{comment: ${t}}`, 10, 10 + t.length);
  }
  if (kind === 'times') {
    // Zeile mit dem Cursor bekommt die Wiederholung (Abschnittsanfang: in den Namen,
    // mehrere markierte Zeilen: Gruppe mit Klammer)
    const v = editor.value;
    const lineAt = (p) => [v.lastIndexOf('\n', p - 1) + 1, v.indexOf('\n', p) < 0 ? v.length : v.indexOf('\n', p)];
    let [a, b] = lineAt(editor.selectionStart);
    // Mehrere Zeilen markiert: als Gruppe einklammern
    const [, selEnd] = lineAt(Math.max(editor.selectionStart, editor.selectionEnd - 1));
    if (selEnd > b) {
      editor.focus();
      editor.setSelectionRange(a, selEnd);
      const head = '{start_of_repeat: 2×}\n';
      return insertText(`${head}${v.slice(a, selEnd)}\n{end_of_repeat}`, head.length - 1);
    }
    if (!v.slice(a, b).trim()) return toast('Cursor in eine Zeile oder einen Abschnittsanfang setzen');
    if (/^\s*\{\s*(end_of_\w+|eo[cvbt])\s*\}\s*$/i.test(v.slice(a, b))) {
      // auf "{end_of_…}": Wiederholung gehört zum Abschnittsanfang
      const start = v.slice(0, a).search(/\{\s*(start_of_\w+|so[cvbt])\b[^}]*\}[^{]*$/i);
      if (start >= 0) [a, b] = lineAt(start);
    }
    editor.focus();
    editor.setSelectionRange(a, b);
    const next = bumpRepeat(v.slice(a, b));
    return insertText(next, next.length);
  }
  const atLineStart = editor.selectionStart === 0 || editor.value[editor.selectionStart - 1] === '\n';
  const nl = atLineStart ? '' : '\n';
  if (kind === 'repeat') return insertText(`${nl}{chorus}\n`);
  const verses = (editor.value.match(/\{(start_of_verse|sov)\b/g) || []).length;
  const [env, label] = {
    verse: ['verse', `Strophe ${verses + 1}`],
    chorus: ['chorus', 'Refrain'],
    bridge: ['bridge', 'Bridge'],
  }[kind];
  const body = sel.replace(/\n$/, '');
  const head = `${nl}{start_of_${env}: ${label}}\n`;
  insertText(`${head}${body}\n{end_of_${env}}\n`, head.length, head.length + body.length);
}

document.querySelector('.snippets').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-snippet]');
  if (b && current) insertSnippet(b.dataset.snippet);
});

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
  await flushSave();
  const { id, title } = current;
  await repo.remove(id);
  const next = (await repo.list())[0];
  await openSong(next?.id);
  toast(`„${title || 'Ohne Titel'}“ gelöscht`, {
    action: 'Rückgängig',
    onAction: async () => {
      await repo.restore(id);
      await openSong(id);
    },
  });
};

// ---------- Text einfügen (Akkorde über Text) ----------

const dlg = $('#import-dialog');
const impPreview = $('#imp-preview');
function importChordPro() {
  return ugToChordPro($('#imp-text').value, { title: $('#imp-title').value.trim(), artist: $('#imp-artist').value.trim() });
}
function renderImportPreview() {
  const has = Boolean($('#imp-text').value.trim());
  $('#imp-ok').disabled = !has;
  if (!has) {
    impPreview.replaceChildren(Object.assign(document.createElement('p'), {
      className: 'empty', textContent: 'Links Text einfügen – hier erscheint das Ergebnis.',
    }));
    return;
  }
  impPreview.replaceChildren(renderSong(parseChordPro(importChordPro())));
}
let impTimer;
dlg.addEventListener('input', () => {
  clearTimeout(impTimer);
  impTimer = setTimeout(renderImportPreview, 120);
});
$('#btn-import').onclick = () => {
  $('#imp-title').value = '';
  $('#imp-artist').value = '';
  $('#imp-text').value = '';
  applySettings(impPreview, loadSettings());
  renderImportPreview();
  dlg.showModal();
  $('#imp-text').focus();
};
dlg.addEventListener('close', async () => {
  if (dlg.returnValue !== 'ok') return;
  const text = $('#imp-text').value;
  if (!text.trim()) return;
  await createAndOpen(importChordPro());
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

// ---------- Menü (Handy) ----------

const menu = $('#actions');
const menuBtn = $('#btn-menu');
function setMenu(open) {
  menu.classList.toggle('open', open);
  menuBtn.setAttribute('aria-expanded', String(open));
}
menuBtn.onclick = (e) => {
  e.stopPropagation();
  setMenu(!menu.classList.contains('open'));
};
menu.addEventListener('click', () => setMenu(false));
document.addEventListener('click', (e) => !menu.contains(e.target) && setMenu(false));

// ---------- Dateien per Ziehen & Ablegen ----------

const drop = $('#drop-zone');
let dragDepth = 0;
const hasFiles = (e) => [...(e.dataTransfer?.types || [])].includes('Files');
addEventListener('dragenter', (e) => {
  if (!hasFiles(e)) return;
  dragDepth++;
  drop.hidden = false;
});
addEventListener('dragleave', (e) => {
  if (!hasFiles(e)) return;
  if (--dragDepth <= 0) {
    dragDepth = 0;
    drop.hidden = true;
  }
});
addEventListener('dragover', (e) => hasFiles(e) && e.preventDefault());
addEventListener('drop', async (e) => {
  if (!hasFiles(e)) return;
  e.preventDefault();
  dragDepth = 0;
  drop.hidden = true;
  await importFiles([...e.dataTransfer.files]);
});

// Klick neben Druck- und Einstellungsdialog schließt ihn
for (const d of document.querySelectorAll('#print-dialog, #settings-dialog')) {
  d.addEventListener('click', (e) => e.target === d && d.close('cancel'));
}

// ---------- Tastenkürzel ----------

addEventListener('keydown', (e) => {
  const mod = e.ctrlKey || e.metaKey;
  const key = e.key.toLowerCase();
  if (e.key === 'Escape') setMenu(false);
  if (mod && key === 's') {
    e.preventDefault();
    if (!saveTimer && current) setStatus('Gespeichert', 'saved');
    flushSave();
    return;
  }
  if (mod && key === 'p') {
    e.preventDefault();
    if (!$('#print-view').hidden) $('#pv-print').click();
    else if (!document.querySelector('dialog[open]')) $('#btn-print').click();
    return;
  }
  if (anyDialogOpen()) return;
  if (mod && key === 'k') {
    e.preventDefault();
    if (isMobile()) setView('list');
    search.focus();
    search.select();
    return;
  }
  if (mod && key === 'e') {
    e.preventDefault();
    $('#btn-focus').click();
    return;
  }
  if (mod || e.altKey || isTyping(document.activeElement) || !current) return;
  if (e.key === 'f' || e.key === 'F') $('#btn-play').click();
  else if (e.key === '+' || e.key === '=') $('#tr-up').click();
  else if (e.key === '-') $('#tr-down').click();
});

// ---------- Spielmodus ----------

const play = setupPlayMode({
  repo,
  // Blättern in der Reihenfolge der (ggf. gefilterten) Liste
  getSongIds: async () => (await repo.list({ query: search.value })).map((s) => s.id),
  onClose: (id) => {
    if (id && id !== current?.id) openSong(id);
  },
});
$('#btn-play').onclick = async () => {
  if (!current) return;
  await flushSave();
  play.open(current.id);
};

// ---------- Drucken ----------

setupPrint({ repo, beforeOpen: flushSave });

// ---------- Cloud-Sync ----------

setupSync({
  repo,
  book,
  toast,
  beforeSync: flushSave,
  beforeSwitch: flushSave,
  // Neues Gerät: das unveränderte Beispiellied nicht in das gemeinsame Liederbuch tragen
  beforeConnect: async () => {
    const all = await repo.list();
    if (all.length && all.every((s) => s.chordpro === SAMPLE_SONG && s.createdAt === s.updatedAt)) {
      for (const s of all) await repo.remove(s.id);
    }
  },
});

// Änderungen von anderen Geräten
repo.addEventListener('remote-change', async (e) => {
  const ids = e.detail;
  if (!current) return openSong((await repo.list())[0]?.id);
  if (!ids.includes(current.id)) return refreshList();
  if (saveTimer) return refreshList(); // hier wird gerade getippt – die eigene Fassung ist neuer
  const fresh = await repo.get(current.id);
  if (!fresh) {
    toast(`„${current.title || 'Ohne Titel'}“ wurde auf einem anderen Gerät gelöscht`);
    return openSong((await repo.list())[0]?.id);
  }
  current = fresh;
  if (editor.value !== fresh.chordpro) {
    const { selectionStart: a, selectionEnd: b } = editor;
    editor.value = fresh.chordpro;
    editor.setSelectionRange(a, b);
  }
  updateControls();
  renderPreview();
  await refreshList();
});

// ---------- Start ----------

async function start() {
  let songs = await repo.list();
  if (!songs.length && !book.shared && !localStorage.getItem('sync.provider')) {
    // Entwurf aus Schritt 1 (localStorage) übernehmen, sonst Beispiel anlegen
    const draft = localStorage.getItem('draft');
    await repo.create(draft?.trim() ? draft : SAMPLE_SONG);
    localStorage.removeItem('draft');
    songs = await repo.list();
  }
  const last = localStorage.getItem('lastSong');
  await openSong(songs.some((s) => s.id === last) ? last : songs[0]?.id);
}

const started = start();
