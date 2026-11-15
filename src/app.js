// Oberfläche: Liederliste, Editor, Vorschau. Speichert automatisch in IndexedDB.

import { parseChordPro } from './core/chordpro.js';
import { parseImportFile } from './core/file-import.js';
import { renderSong, songKey, usedChords } from './render/song-view.js';
import { capoOptions } from './core/capo.js';
import { parseKnown, playableCapo } from './core/playable.js';
import { pastedToSongs } from './core/paste-import.js';
import { attachContextMenu } from './context-menu.js';
import { saveSettings } from './settings/settings.js';
import { metronome, beatsPerBar } from './metronome.js';
import { transposeChordPro, chordproToText } from './core/export-text.js';
import { SongRepository } from './storage/repository.js';
import { openIdbStore } from './storage/stores.js';
import { SAMPLE_SONG, NEW_SONG_TEMPLATE } from './sample.js';
import { setupPrint } from './print-ui.js';
import { setupSettings } from './settings-ui.js';
import { setupSync } from './sync-ui.js';
import { bumpRepeat } from './core/repeat.js';
import { activeBook } from './books.js';
import { setupPlayMode } from './play-mode.js';
import { SetlistRepository, slimSetlist } from './storage/setlists.js';
import { setupSetlists } from './setlist-ui.js';
import { getAllMeta, setMeta, getTags, setTags } from './core/meta-edit.js';
import { transposeChord } from './core/chords.js';
import { applySettings, loadSettings } from './settings/settings.js';
import { bookmarkletHref, readUgHash, ugDataToText } from './core/ug-bookmarklet.js';

const $ = (s) => document.querySelector(s);
const editor = $('#editor');
const preview = $('#preview');
const listEl = $('#song-list');
const search = $('#search');
const isMobile = () => matchMedia('(max-width: 760px)').matches;

const book = activeBook(); // persönliches oder gemeinsames Liederbuch
const repo = new SongRepository(await openIdbStore(book.dbName));
const sets = new SetlistRepository(await openIdbStore(book.dbName, 'setlists'));
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

let activeTag = localStorage.getItem('activeTag') || '';

/** Tag-Filter über der Liste (nur sichtbar, wenn es Tags gibt). */
async function renderTagFilter() {
  const tags = await repo.tags();
  if (activeTag && !tags.some((t) => t.tag === activeTag)) activeTag = '';
  const box = $('#tag-filter');
  box.hidden = !tags.length;
  box.replaceChildren(...tags.map(({ tag, count }) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tag-chip';
    b.setAttribute('aria-pressed', String(tag === activeTag));
    b.append(tag, Object.assign(document.createElement('small'), { textContent: count }));
    b.onclick = () => {
      activeTag = activeTag === tag ? '' : tag;
      localStorage.setItem('activeTag', activeTag);
      refreshList();
    };
    return b;
  }));
  $('#dl-tags').replaceChildren(...tags.map((t) => new Option(t.tag)));
}

// "Was kann ich spielen?" – Filter nach bekannten Griffen
const cf = {
  open: localStorage.getItem('cfOpen') === '1',
  chords: localStorage.getItem('cfChords') || '',
  capo: localStorage.getItem('cfCapo') === '1',
};
const capoHint = new Map(); // songId -> Capo-Bund für die Anzeige in der Liste

function chordFilterActive() {
  return cf.open && parseKnown(cf.chords).size > 0;
}

/** Lieder filtern, die nur aus bekannten Griffen bestehen (mit gespeicherter Transposition). */
function applyChordFilter(songs) {
  capoHint.clear();
  if (!chordFilterActive()) return songs;
  const known = parseKnown(cf.chords);
  return songs.filter((s) => {
    const chords = usedChords(parseChordPro(s.chordpro)).map((c) => transposeChord(c, s.transpose || 0, false));
    const capo = playableCapo(chords, known, { withCapo: cf.capo });
    if (capo === null) return false;
    if (capo > 0) capoHint.set(s.id, capo);
    return true;
  });
}

function setupChordFilter() {
  const panel = $('#cf-panel');
  const toggle = $('#cf-toggle');
  const sync = () => {
    panel.hidden = !cf.open;
    toggle.setAttribute('aria-expanded', String(cf.open));
    toggle.classList.toggle('active', chordFilterActive());
  };
  $('#cf-chords').value = cf.chords;
  $('#cf-capo').checked = cf.capo;
  toggle.onclick = () => {
    cf.open = !cf.open;
    localStorage.setItem('cfOpen', cf.open ? '1' : '');
    sync();
    refreshList();
    if (cf.open) $('#cf-chords').focus();
  };
  let t;
  $('#cf-chords').addEventListener('input', (e) => {
    cf.chords = e.target.value;
    localStorage.setItem('cfChords', cf.chords);
    sync();
    clearTimeout(t);
    t = setTimeout(refreshList, 200);
  });
  $('#cf-capo').addEventListener('change', (e) => {
    cf.capo = e.target.checked;
    localStorage.setItem('cfCapo', cf.capo ? '1' : '');
    refreshList();
  });
  sync();
}
setupChordFilter();

async function refreshList() {
  await renderTagFilter();
  const songs = applyChordFilter(await repo.list({ query: search.value, tag: activeTag }));
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
      if (capoHint.has(s.id)) artist.textContent += `${s.artist ? ' · ' : ''}mit Capo ${capoHint.get(s.id)}`;
      btn.append(title, artist);
      li.append(btn);
      return li;
    }),
  );
  if (!songs.length) {
    listEl.append(Object.assign(document.createElement('li'), {
      className: 'list-empty',
      textContent: chordFilterActive() ? 'Kein Lied nur mit diesen Griffen – „auch mit Capo“ probieren oder Griffe ergänzen.' : search.value ? 'Nichts gefunden.' : book.shared ? 'Noch keine Lieder – sie erscheinen nach dem Abgleich oder mit „Neues Lied“.' : 'Noch keine Lieder.',
    }));
  }
  const total = search.value || activeTag || chordFilterActive() ? `${songs.length} Treffer` : `${songs.length} ${songs.length === 1 ? 'Lied' : 'Lieder'}`;
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
  if (current.note) preview.prepend(Object.assign(document.createElement('div'), { className: 'song-note', textContent: current.note }));
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
  dispatchEvent(new CustomEvent('songopened', { detail: current?.id || null }));
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
  const tagsInput = $('#meta-tags');
  const noteInput = $('#meta-note');
  tagsInput.disabled = noteInput.disabled = !current;
  if (tagsInput !== document.activeElement) tagsInput.value = getTags(editor.value).join(', ');
  if (noteInput !== document.activeElement) noteInput.value = current?.note || '';
  const capo = Number(m.capo) || 0;
  $('#meta-summary').textContent = [
    m.key && `Tonart ${m.key}`, capo > 0 && `Capo ${capo}`, m.time && `${m.time}-Takt`, m.tempo && `${m.tempo} bpm`,
  ].filter(Boolean).join(' · ');
  const capoChip = $('#capo-chip');
  capoChip.hidden = !(capo > 0);
  capoChip.textContent = `Capo ${m.capo}`;
  capoChip.title = `Kapodaster im ${m.capo}. Bund`;
  const timeChip = $('#time-chip');
  timeChip.dataset.tempo = m.tempo || '';
  timeChip.dataset.time = m.time || '';
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

// Tags: beim Verlassen des Feldes bzw. Enter übernehmen (Komma ist Trennzeichen)
$('#meta-tags').addEventListener('change', (e) => {
  if (!current) return;
  editor.value = setTags(editor.value, e.target.value.split(','));
  editor.dispatchEvent(new Event('input'));
});
$('#meta-tags').addEventListener('keydown', (e) => e.key === 'Enter' && e.target.blur());

// Notiz: eigenes Feld am Lied (wird mit synchronisiert, aber nicht gedruckt)
let noteTimer;
$('#meta-note').addEventListener('input', (e) => {
  if (!current) return;
  const id = current.id;
  const note = e.target.value;
  setStatus('Ungespeichert …', 'dirty');
  clearTimeout(noteTimer);
  noteTimer = setTimeout(async () => {
    const rec = await repo.update(id, { note });
    if (current?.id === id) {
      current = { ...current, note: rec.note, updatedAt: rec.updatedAt };
      renderPreview();
    }
    setStatus('Gespeichert', 'saved');
  }, 500);
});

// ---------- Papierkorb ----------

const trashDlg = $('#trash-dialog');
async function renderTrash() {
  const items = await repo.trash();
  const fmt = (iso) => new Date(iso).toLocaleDateString('de', { day: 'numeric', month: 'short', year: 'numeric' });
  $('#trash-list').replaceChildren(...items.map((s) => {
    const li = document.createElement('li');
    const name = Object.assign(document.createElement('span'), { className: 'book-name', textContent: s.title || 'Ohne Titel' });
    name.append(Object.assign(document.createElement('small'), { textContent: `gelöscht am ${fmt(s.deletedAt)}${s.artist ? ' · ' + s.artist : ''}` }));
    const restore = Object.assign(document.createElement('button'), { type: 'button', textContent: 'Wiederherstellen' });
    restore.onclick = async () => {
      await repo.restore(s.id);
      await openSong(s.id);
      toast(`„${s.title || 'Ohne Titel'}“ wiederhergestellt`);
      renderTrash();
    };
    const del = Object.assign(document.createElement('button'), { type: 'button', textContent: 'Endgültig', className: 'danger' });
    del.onclick = async () => {
      if (!confirm(`„${s.title || 'Ohne Titel'}“ endgültig löschen? Das lässt sich nicht rückgängig machen.`)) return;
      await repo.purge(s.id);
      renderTrash();
    };
    li.append(name, restore, del);
    return li;
  }));
  if (!items.length) $('#trash-list').append(Object.assign(document.createElement('li'), { className: 'list-empty', textContent: 'Der Papierkorb ist leer.' }));
  $('#trash-empty').hidden = !items.length;
}
$('#btn-trash').onclick = async () => {
  await flushSave();
  await renderTrash();
  trashDlg.showModal();
};
$('#trash-empty').onclick = async () => {
  const items = await repo.trash();
  if (!confirm(`${items.length} ${items.length === 1 ? 'Lied' : 'Lieder'} endgültig löschen? Das lässt sich nicht rückgängig machen.`)) return;
  for (const s of items) await repo.purge(s.id);
  renderTrash();
  toast('Papierkorb geleert');
};
trashDlg.addEventListener('click', (e) => e.target === trashDlg && trashDlg.close());

// ---------- Zoom der Vorschau ----------

let viewZoom = Number(localStorage.getItem('viewZoom')) || 1;
function setViewZoom(z) {
  viewZoom = Math.min(2.5, Math.max(0.6, Math.round(z * 10) / 10));
  localStorage.setItem('viewZoom', String(viewZoom));
  preview.style.setProperty('--view-zoom', String(viewZoom));
  $('#zoom-reset').textContent = `${Math.round(viewZoom * 100)} %`;
}
$('#zoom-in').onclick = () => setViewZoom(viewZoom + 0.1);
$('#zoom-out').onclick = () => setViewZoom(viewZoom - 0.1);
$('#zoom-reset').onclick = () => setViewZoom(1);
setViewZoom(viewZoom);

// ---------- Metronom (Klick auf Takt/Tempo über der Vorschau) ----------

function toggleMetronome() {
  const chip = $('#time-chip');
  const on = metronome.toggle(Number(chip.dataset.tempo) || 100, beatsPerBar(chip.dataset.time));
  chip.setAttribute('aria-pressed', String(on));
  if (on && !chip.dataset.tempo) toast('Kein Tempo angegeben – Metronom läuft mit 100 bpm (unter „Liedinfo“ einstellbar)');
}
$('#time-chip').onclick = toggleMetronome;
addEventListener('metronome-beat', (e) => {
  for (const el of document.querySelectorAll('#time-chip[aria-pressed="true"], #pl-metro[aria-pressed="true"]')) {
    el.classList.remove('beat', 'beat-1');
    void el.offsetWidth; // Animation neu starten
    el.classList.add(e.detail === 0 ? 'beat-1' : 'beat');
  }
});
metronome.onBeat = (b) => dispatchEvent(new CustomEvent('metronome-beat', { detail: b }));

// ---------- Lied teilen ----------

const shareDlg = $('#share-dialog');
function currentExport() {
  const t = current.transpose || 0;
  const acc = current.accidentals || 'auto';
  const name = (current.title || 'Lied').replace(/[\/:*?"<>|]+/g, '').trim() || 'Lied';
  return { name, chordpro: transposeChordPro(editor.value, t, acc), text: chordproToText(editor.value, t, acc, { harpLayout: loadSettings().harpLayout }) };
}
$('#btn-share').onclick = async () => {
  if (!current) return toast('Kein Lied geöffnet');
  await flushSave();
  $('#share-title').textContent = current.title || 'Ohne Titel';
  const { name, chordpro } = currentExport();
  const file = new File([chordpro], `${name}.cho`, { type: 'text/plain' });
  $('#share-native').hidden = !navigator.canShare?.({ files: [file] }) && !navigator.share;
  shareDlg.showModal();
};
$('#share-native').onclick = async () => {
  const { name, chordpro, text } = currentExport();
  const file = new File([chordpro], `${name}.cho`, { type: 'text/plain' });
  try {
    if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: name, text: name });
    else await navigator.share({ title: name, text });
    shareDlg.close();
  } catch (err) {
    if (err.name !== 'AbortError') toast(`Teilen nicht möglich: ${err.message}`);
  }
};
$('#share-file').onclick = () => {
  const { name, chordpro } = currentExport();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([chordpro], { type: 'text/plain' }));
  a.download = `${name}.cho`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  shareDlg.close();
};
$('#share-text').onclick = async () => {
  try {
    await navigator.clipboard.writeText(currentExport().text);
    toast('Text kopiert – zum Einfügen eine Schrift mit fester Breite verwenden, damit die Akkorde passen');
  } catch {
    toast('Kopieren nicht erlaubt – bitte die ChordPro-Datei nehmen');
  }
  shareDlg.close();
};
$('#share-pdf').onclick = async () => {
  shareDlg.close();
  await printer.printSongs([{ ...current, chordpro: editor.value }], { cover: false, toc: false, useSavedTranspose: true });
};
shareDlg.addEventListener('click', (e) => e.target === shareDlg && shareDlg.close());

// ---------- Capo-Hilfe ----------

const capoDlg = $('#capo-dialog');
$('#btn-capo-help').onclick = () => {
  if (!current) return;
  const song = parseChordPro(editor.value);
  const capoOld = Number(song.meta.capo) || 0;
  // klingende Akkorde = angezeigte (transponierte) Griffe + bisheriger Capo
  const sounding = usedChords(song).map((c) => transposeChord(c, current.transpose + capoOld, false));
  if (!sounding.length) return toast('Im Lied stehen noch keine Akkorde');
  const all = capoOptions(sounding);
  const shown = all.slice(0, 4);
  const now = all.find((o) => o.capo === capoOld);
  if (now && !shown.includes(now)) shown.push(now);
  $('#capo-options').replaceChildren(...shown.map((o) => {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    if (o.capo === capoOld) b.classList.add('current');
    if (o.easy === o.total) b.classList.add('easy-all');
    const pos = Object.assign(document.createElement('span'), { className: 'capo-pos', textContent: o.capo ? `Capo ${o.capo}` : 'ohne Capo' });
    const chords = Object.assign(document.createElement('span'), { className: 'capo-chords', textContent: o.chords.join('  ') });
    const score = Object.assign(document.createElement('span'), {
      className: 'capo-score',
      textContent: (o.easy === o.total ? 'alle einfach' : `${o.easy} von ${o.total} einfach`) + (o.capo === capoOld ? ' · jetzt' : ''),
    });
    b.append(pos, chords, score);
    b.onclick = async () => {
      capoDlg.close();
      if (o.capo === capoOld) return;
      editor.value = setMeta(editor.value, 'capo', o.capo ? String(o.capo) : '');
      editor.dispatchEvent(new Event('input'));
      await setViewOption({ transpose: current.transpose + capoOld - o.capo });
      toast(o.capo ? `Capo in den ${o.capo}. Bund – Griffe angepasst, Klang bleibt gleich` : 'Ohne Capo – Griffe angepasst');
    };
    li.append(b);
    return li;
  }));
  capoDlg.showModal();
};
capoDlg.addEventListener('click', (e) => e.target === capoDlg && capoDlg.close());

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

/** Lied löschen (in den Papierkorb), mit "Rückgängig". */
async function deleteSong(id) {
  await flushSave();
  const song = await repo.get(id);
  if (!song) return;
  const title = song.title;
  await repo.remove(id);
  if (current?.id === id) await openSong((await repo.list())[0]?.id);
  else await refreshList();
  toast(`„${title || 'Ohne Titel'}“ gelöscht`, {
    action: 'Rückgängig',
    onAction: async () => {
      await repo.restore(id);
      await openSong(id);
    },
  });
}
$('#btn-delete').onclick = () => current && deleteSong(current.id);

// ---------- Text einfügen (Akkorde über Text) ----------

const dlg = $('#import-dialog');
const impPreview = $('#imp-preview');
/** Eingefügter Text -> Lieder (Titel/Interpret aus den Feldern gelten nur bei einem Lied). */
function importSongs() {
  return pastedToSongs($('#imp-text').value, { title: $('#imp-title').value.trim(), artist: $('#imp-artist').value.trim() });
}
function renderImportPreview() {
  const songs = importSongs();
  const n = songs.length;
  $('#imp-ok').disabled = !n;
  $('#imp-ok').textContent = n > 1 ? `${n} Lieder anlegen` : 'Als neues Lied anlegen';
  // Erkanntes als Platzhalter zeigen; bei mehreren Liedern gelten die Felder nicht
  const auto = n === 1 ? pastedToSongs($('#imp-text').value)[0] : null;
  for (const [id, key] of [['#imp-title', 'title'], ['#imp-artist', 'artist']]) {
    $(id).disabled = n > 1;
    $(id).placeholder = n > 1 ? 'aus dem Text' : auto?.[key] ? `erkannt: ${auto[key]}` : '';
  }
  $('#imp-info').textContent = !n
    ? ''
    : n === 1
      ? `1 Lied${songs[0].title ? `: ${songs[0].title}${songs[0].artist ? ' – ' + songs[0].artist : ''}` : ' (Titel unten eintragen oder im Editor ergänzen)'}`
      : `${n} Lieder erkannt: ${songs.map((s) => s.title || 'Ohne Titel').join(', ')}`;
  if (!n) {
    impPreview.replaceChildren(Object.assign(document.createElement('p'), {
      className: 'empty', textContent: 'Links Text einfügen – hier erscheint das Ergebnis.',
    }));
    return;
  }
  const nodes = [];
  songs.forEach((s, i) => {
    if (i) nodes.push(document.createElement('hr'));
    nodes.push(renderSong(parseChordPro(s.chordpro)));
  });
  impPreview.replaceChildren(...nodes);
}
let impTimer;
dlg.addEventListener('input', () => {
  clearTimeout(impTimer);
  impTimer = setTimeout(renderImportPreview, 120);
});
function openImport(text = '') {
  $('#imp-title').value = '';
  $('#imp-artist').value = '';
  $('#imp-text').value = text;
  applySettings(impPreview, loadSettings());
  renderImportPreview();
  dlg.showModal();
  $('#imp-text').focus();
  if (text) $('#imp-ok').focus();
}
$('#btn-import').onclick = () => openImport();

// Strg+V irgendwo in der App (außerhalb von Eingabefeldern): Einfügen-Dialog mit dem Text
document.addEventListener('paste', (e) => {
  if (isTyping(document.activeElement) || anyDialogOpen()) return;
  const text = e.clipboardData?.getData('text/plain') || '';
  if (!text.trim()) return;
  e.preventDefault();
  openImport(text);
});
dlg.addEventListener('close', async () => {
  if (dlg.returnValue !== 'ok') return;
  const songs = importSongs();
  if (!songs.length) return;
  if (songs.length === 1) {
    await createAndOpen(songs[0].chordpro);
    setView('editor');
    toast('Umgewandelt – bitte im Editor prüfen');
    return;
  }
  await flushSave();
  let first = null;
  for (const s of songs) {
    const rec = await repo.create(s.chordpro);
    first ||= rec;
  }
  search.value = '';
  await openSong(first.id);
  toast(`${songs.length} Lieder angelegt`);
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
  else if (e.key === 'm' || e.key === 'M') toggleMetronome();
  else if (e.key === '+' || e.key === '=') $('#tr-up').click();
  else if (e.key === '-') $('#tr-down').click();
});

// ---------- Spielmodus ----------

const play = setupPlayMode({
  repo,
  // Blättern in der Reihenfolge der (ggf. gefilterten) Liste
  getSongIds: async () => applyChordFilter(await repo.list({ query: search.value, tag: activeTag })).map((s) => s.id),
  onClose: (id) => {
    if (id && id !== current?.id) openSong(id);
  },
});
$('#btn-play').onclick = async () => {
  if (!current) return;
  await flushSave();
  play.open(current.id);
};

// ---------- Kontextmenüs (Rechtsklick / langes Drücken) ----------

/** Lied als Kopie anlegen und öffnen. */
async function duplicateSong(id) {
  await flushSave();
  const s = await repo.get(id);
  if (!s) return;
  const text = setMeta(s.chordpro, 'title', `${s.title || 'Ohne Titel'} (Kopie)`);
  const rec = await repo.create(text, { transpose: s.transpose, accidentals: s.accidentals, note: s.note || '' });
  await openSong(rec.id);
  toast('Kopie angelegt');
}

async function addToSetlist(setId, songId) {
  const set = await sets.get(setId);
  const song = await repo.get(songId);
  if (!set || !song) return;
  await sets.update(setId, { items: [...set.items, { songId, transpose: null, note: '' }] });
  toast(`„${song.title || 'Ohne Titel'}“ zu „${set.name}“ hinzugefügt`, {
    action: 'Anzeigen',
    onAction: () => setlists.open(setId),
  });
}

async function newSetlistWith(songId) {
  const set = await sets.create(`Setliste ${new Date().toLocaleDateString('de')}`, [{ songId }]);
  await setlists.open(set.id);
  if (isMobile()) setView('list');
  toast('Neue Setliste angelegt – Namen oben eintragen');
}

function editSong() {
  if ($('.workspace').classList.contains('focus')) setFocusMode(false);
  setView('editor');
  editor.focus();
}

/** Untermenü "Zur Setliste hinzufügen" für ein Lied. */
async function setlistMenu(songId) {
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

attachContextMenu(listEl, '.song-item', async (btn) => {
  const id = btn.dataset.id;
  const song = await repo.get(id);
  if (!song) return null;
  return [
    { label: 'Öffnen', icon: 'eye', action: async () => { await openSong(id); if (isMobile()) setView('preview'); } },
    { label: 'Bearbeiten', icon: 'edit', action: async () => { await openSong(id); editSong(); } },
    { label: 'Spielen', icon: 'stage', hint: 'Doppelklick', action: async () => { await openSong(id); play.open(id); } },
    '-',
    await setlistMenu(id),
    { label: 'Duplizieren', icon: 'paste', action: () => duplicateSong(id) },
    { label: 'Teilen …', icon: 'share', action: async () => { await openSong(id); $('#btn-share').click(); } },
    { label: 'Drucken / PDF', icon: 'print', action: () => printer.printSongs([song], { cover: false, toc: false, useSavedTranspose: true }) },
    '-',
    { label: 'Löschen', icon: 'trash', danger: true, hint: 'Entf', action: () => deleteSong(id) },
  ];
}, { title: (btn) => btn.querySelector('.song-item-title').textContent });

// Doppelklick spielt, Entf löscht (mit Rückgängig)
listEl.addEventListener('dblclick', async (e) => {
  const btn = e.target.closest('.song-item');
  if (!btn) return;
  await openSong(btn.dataset.id);
  play.open(btn.dataset.id);
});
listEl.addEventListener('keydown', (e) => {
  const btn = e.target.closest('.song-item');
  if (btn && (e.key === 'Delete' || e.key === 'Backspace')) {
    e.preventDefault();
    deleteSong(btn.dataset.id);
  }
});

attachContextMenu($('.preview-scroll'), '#preview', async () => {
  if (!current) return null;
  const t = current.transpose || 0;
  const acc = current.accidentals || 'auto';
  const s = loadSettings();
  return [
    { label: 'Halbton höher', icon: 'plus', hint: '+', action: () => setViewOption({ transpose: t + 1 }) },
    { label: 'Halbton tiefer', hint: '−', action: () => setViewOption({ transpose: t - 1 }) },
    { label: 'Originaltonart', disabled: t === 0, action: () => setViewOption({ transpose: 0 }) },
    {
      label: 'Schreibweise',
      items: [['auto', 'automatisch'], ['sharp', 'mit ♯'], ['flat', 'mit ♭']].map(([v, l]) => ({
        label: l, checked: acc === v, action: () => setViewOption({ accidentals: v }),
      })),
    },
    { label: 'Capo-Hilfe …', action: () => $('#btn-capo-help').click() },
    '-',
    { label: 'Spielen', icon: 'stage', hint: 'F', action: () => $('#btn-play').click() },
    { label: 'Bearbeiten', icon: 'edit', action: editSong },
    {
      label: 'Anzeigen',
      items: [
        { label: 'Griffbilder', checked: s.showDiagrams, action: () => saveSettings({ ...s, showDiagrams: !s.showDiagrams }) },
        { label: 'Mundharmonika-Tabs', checked: s.showHarp, action: () => saveSettings({ ...s, showHarp: !s.showHarp }) },
        {
          label: 'Harp-Tabs in eigener Zeile',
          checked: s.harpLayout === 'split',
          disabled: !s.showHarp,
          action: () => saveSettings({ ...s, harpLayout: s.harpLayout === 'split' ? 'inline' : 'split' }),
        },
        { label: 'Gitarren-Tabs', checked: s.showTabs, action: () => saveSettings({ ...s, showTabs: !s.showTabs }) },
      ],
    },
    {
      label: 'Größe',
      items: [
        { label: 'Größer', icon: 'plus', action: () => setViewZoom(viewZoom + 0.1) },
        { label: 'Kleiner', action: () => setViewZoom(viewZoom - 0.1) },
        { label: 'Originalgröße', disabled: viewZoom === 1, action: () => setViewZoom(1) },
      ],
    },
    '-',
    await setlistMenu(current.id),
    { label: 'Teilen …', icon: 'share', action: () => $('#btn-share').click() },
    { label: 'Drucken / PDF', icon: 'print', action: () => printer.printSongs([{ ...current, chordpro: editor.value }], { cover: false, toc: false, useSavedTranspose: true }) },
  ];
}, { title: () => current?.title || '' });

// ---------- Drucken ----------

const printer = setupPrint({ repo, beforeOpen: flushSave });

const setlists = setupSetlists({
  repo,
  sets,
  toast,
  play,
  getCurrentId: () => current?.id || null,
  openSong: async (id) => {
    await openSong(id);
    if (isMobile()) setView('preview');
  },
  printSongs: (list, opts) => printer.printSongs(list, opts),
});

// ---------- Cloud-Sync ----------

setupSync({
  repo,
  extra: [{ key: 'setlists', repo: sets, slim: slimSetlist }],
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

// ---------- Lesezeichen „Ins Liederbuch“ (Ultimate Guitar) ----------

// Das Lesezeichen öffnet die App mit #ug=… in der Adresse: Einfügen-Dialog vorausfüllen.
// Angelegt wird erst, wenn man im Dialog bestätigt.
async function takeUgFromHash() {
  const data = readUgHash(location.hash);
  if (!location.hash.startsWith('#ug=')) return;
  history.replaceState(null, '', location.pathname + location.search); // Daten nicht in der Adresse lassen
  if (!data) {
    toast('Die Daten vom Lesezeichen waren unvollständig – bitte noch einmal versuchen');
    return;
  }
  await started;
  const text = ugDataToText(data);
  for (const d of document.querySelectorAll('dialog[open]')) if (d !== dlg) d.close('cancel');
  if (dlg.open) {
    $('#imp-text').value = text;
    renderImportPreview();
  } else openImport(text);
  window.focus();
}
takeUgFromHash();
addEventListener('hashchange', takeUgFromHash);

const appUrl = () => location.origin + location.pathname.replace(/index\.html$/, '');
function openBookmarkDialog() {
  const href = bookmarkletHref(appUrl());
  $('#ugm-link').href = href;
  $('#ugm-target').textContent = appUrl();
  $('#ugm-local').hidden = !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  $('#ug-bookmark-dialog').showModal();
}
$('#imp-bookmark').onclick = () => {
  dlg.close('cancel');
  openBookmarkDialog();
};
// Ein Klick hier in der App würde nichts finden: Hinweis statt Ausführen
$('#ugm-link').addEventListener('click', (e) => {
  e.preventDefault();
  toast('In die Lesezeichenleiste ziehen – dann auf einer Ultimate-Guitar-Seite anklicken');
});
$('#ugm-copy').onclick = async () => {
  try {
    await navigator.clipboard.writeText(bookmarkletHref(appUrl()));
    toast('Code kopiert – jetzt als Adresse eines Lesezeichens einfügen');
  } catch {
    toast('Kopieren nicht möglich – bitte am PC einrichten');
  }
};
$('#ug-bookmark-dialog').addEventListener('click', (e) => e.target === e.currentTarget && e.currentTarget.close());
