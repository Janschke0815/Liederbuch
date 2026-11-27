// Das geöffnete Lied: öffnen, automatisch speichern, Vorschau, Transponieren und die Liedinfo
// (Titel, Capo, Takt … über dem Editor).

import { parseChordPro } from '../core/chordpro.js';
import { transposeChord } from '../core/chords.js';
import { getAllMeta, setMeta, getTags, setTags } from '../core/meta-edit.js';
import { harpView, songHarpTabs } from '../core/harp-transpose.js';
import { renderSong, songKey } from '../render/song-view.js';
import { renderScores, stopAbc } from '../render/abc-view.js';
import { prefs } from '../prefs.js';
import { readOnly, repo, state } from './app-state.js';
import { $, $$, isMobile, toast } from './dom.js';

/** Schreibweise kurz (Knopf über der Vorschau). */
const ACC_SHORT = { auto: '♯/♭', sharp: '♯', flat: '♭' };
const ACC_NEXT = { auto: 'sharp', sharp: 'flat', flat: 'auto' };
const ACC_TITLE = { auto: 'automatisch mit ♯ oder ♭', sharp: 'immer mit ♯', flat: 'immer mit ♭' };

export const editor = $('#editor');
export const preview = $('#preview');

let saveTimer = null;

/** Anzeige rechts über dem Editor (Punkt an der Diskette): „Ungespeichert …“, „Gespeichert“, Fehler. */
export function setStatus(text, kind = '') {
  const box = $('#save-status');
  box.textContent = text;
  box.dataset.state = kind;
  $('#btn-save').title = `${text ? `${text} – ` : ''}Speichern (Strg+S)`;
}

/** Sofort speichern (Diskette, Strg+S); ist schon alles gespeichert, wird das kurz bestätigt. */
export async function saveNow() {
  if (!state.current) return;
  if (!saveTimer) setStatus('Gespeichert', 'saved');
  await flushSave();
}
$('#btn-save').onclick = () => saveNow();

/** Gibt es Tipp-Änderungen, die noch nicht gespeichert sind? */
export const isDirty = () => Boolean(saveTimer);

// ---------- Vorschau und Bedienelemente ----------

/** Vorschau, Tonart-Anzeige und Liedinfo aus dem Editor-Text neu zeichnen. */
export function renderPreview() {
  const current = state.current;
  if (!current) {
    preview.replaceChildren(Object.assign(document.createElement('p'), { className: 'empty', textContent: 'Kein Lied ausgewählt.' }));
    fillMeta();
    return;
  }
  const song = parseChordPro(editor.value);
  const harp = harpView(song, current.transpose, prefs.get('harpPlayAs')[current.id]);
  const opts = { transpose: current.transpose, accidentals: current.accidentals, harp, expandChorus: true };
  preview.replaceChildren(renderSong(song, opts));
  showHarpChip(harp);
  renderScores(preview); // Noten ({start_of_abc}) – lädt abcjs nur, wenn es welche gibt
  if (current.note) preview.prepend(Object.assign(document.createElement('div'), { className: 'song-note', textContent: current.note }));
  const k = songKey(song, opts);
  dispatchEvent(new Event('previewrendered')); // z. B. Akkord-Ansicht am Handy (chord-tap.js) zieht nach
  fillMeta();
  const keyEl = $('#key-value');
  keyEl.textContent = k ? k.key : '–';
  keyEl.classList.toggle('guessed', Boolean(k?.guessed));
  const capo = Number(song.meta.capo) || 0;
  keyEl.parentElement.title = (k?.guessed
    ? 'Tonart geschätzt aus dem ersten Akkord – unter „Liedinfo“ festlegen'
    : 'Tonart (Transposition wird mit dem Lied gespeichert)') +
    (k && capo > 0 ? `\nGriffe in ${k.key}, klingt mit Capo ${capo} in ${transposeChord(k.key, capo)}` : '');
}

/** „Harp C“ in der Leiste über der Vorschau (öffnet die Harp-Hilfe, ui/harp-help.js) – nur bei Liedern mit Tabs. */
function showHarpChip(harp) {
  const chip = $('#harp-chip');
  chip.hidden = !harp;
  $('#btn-harp-help').hidden = !harp;
  if (!harp) return;
  chip.textContent = `Harp ${harp.harp}`;
  chip.classList.toggle('changed', Boolean(harp.map));
  chip.title = harp.map
    ? `Tabs umgeschrieben für die ${harp.harp}-Harp – Harp-Hilfe`
    : `Die Tabs passen zur ${harp.harp}-Harp – andere Harp? Harp-Hilfe`;
}

/** Hat das geöffnete Lied Mundharmonika-Tabs? (für Menüs) */
export const songHasHarp = () => songHarpTabs(parseChordPro(editor.value)).length > 0;

/** Knöpfe passend zum geöffneten Lied (Transposition, Schreibweise, gesperrt ohne Lied). */
export function updateControls() {
  const current = state.current;
  editor.disabled = !current;
  editor.readOnly = readOnly; // Abo: lesen, markieren, kopieren – aber nicht ändern
  for (const b of $$('#tr-up, #tr-down, #acc-btn, #btn-play, #btn-save, .snippets button[data-snippet]')) b.disabled = !current;
  if (readOnly) for (const b of $$('.snippets button[data-snippet]')) b.disabled = true;
  const t = current?.transpose || 0;
  const out = $('#tr-value');
  out.textContent = (t > 0 ? '+' : '') + t;
  out.classList.toggle('changed', t !== 0);
  $('#tr-reset').hidden = t === 0;
  const acc = current?.accidentals || 'auto';
  // Schreibweise erst zeigen, wenn transponiert wird oder eine gewählt ist (sonst über Rechtsklick)
  $('#acc-value').textContent = ACC_SHORT[acc];
  $('#acc-btn').title = `Akkorde ${ACC_TITLE[acc]} – tippen zum Wechseln (wird mit dem Lied gespeichert)`;
  $('#acc-btn').setAttribute('aria-pressed', String(acc !== 'auto'));
  $('#acc-field').hidden = t === 0 && acc === 'auto';
  $('#acc-field').classList.toggle('acc-auto', acc === 'auto');
}

// ---------- Öffnen und Speichern ----------

/** Lied öffnen (id leer = keins). Speichert vorher Ungespeichertes. */
export async function openSong(id) {
  await flushSave();
  state.current = id ? await repo.get(id) : null;
  editor.value = state.current?.chordpro ?? '';
  if (state.current) prefs.set('lastSong', state.current.id);
  setStatus('');
  updateControls();
  renderPreview();
  stopAbc(); // Melodie des vorigen Liedes nicht weiterspielen
  dispatchEvent(new CustomEvent('songopened', { detail: state.current?.id || null }));
}

/** Getipptes sofort speichern (sonst geschieht das 0,5 s nach der letzten Taste). */
export async function flushSave() {
  if (!saveTimer) return;
  clearTimeout(saveTimer);
  saveTimer = null;
  if (!state.current) return;
  try {
    state.current = await repo.update(state.current.id, { chordpro: editor.value });
    setStatus('Gespeichert', 'saved');
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

/** Ansicht des Liedes ändern und speichern (transpose, accidentals). */
export async function setViewOption(changes) {
  if (!state.current) return;
  await flushSave();
  state.current = await repo.update(state.current.id, changes);
  updateControls();
  renderPreview();
}

$('#tr-up').onclick = () => setViewOption({ transpose: state.current.transpose + 1 });
$('#tr-down').onclick = () => setViewOption({ transpose: state.current.transpose - 1 });
$('#tr-reset').onclick = () => setViewOption({ transpose: 0 });
// Schreibweise: ein Knopf, jeder Tipp wechselt (automatisch → ♯ → ♭), wie im Spielmodus
$('#acc-btn').onclick = () => setViewOption({ accidentals: ACC_NEXT[state.current?.accidentals || 'auto'] });

// Änderungen von anderen Geräten (Abgleich)
repo.addEventListener('remote-change', async (e) => {
  const current = state.current;
  if (!current) return openSong((await repo.list())[0]?.id);
  if (!e.detail.includes(current.id) || saveTimer) return; // hier wird gerade getippt – die eigene Fassung ist neuer
  const fresh = await repo.get(current.id);
  if (!fresh) {
    toast(`„${current.title || 'Ohne Titel'}“ wurde auf einem anderen Gerät gelöscht`);
    return openSong((await repo.list())[0]?.id);
  }
  state.current = fresh;
  if (editor.value !== fresh.chordpro) {
    const { selectionStart: a, selectionEnd: b } = editor;
    editor.value = fresh.chordpro;
    editor.setSelectionRange(a, b);
  }
  updateControls();
  renderPreview();
});

// ---------- Liedinfo (Titel, Capo, Takt …) ----------
// Die Felder schreiben direkt in den ChordPro-Text ({title: …}, {capo: …}); Notiz ist ein eigenes Feld.

const metaBox = $('#song-meta');
const metaInputs = $$('[data-meta]', metaBox);
// Am Handy eigener, standardmäßig eingeklappter Zustand – sonst bleibt vom Editor kaum etwas
const metaPref = () => (isMobile() ? 'songMetaOpenMobile' : 'songMetaOpen');
metaBox.open = prefs.get(metaPref());
metaBox.addEventListener('toggle', () => prefs.set(metaPref(), metaBox.open));

function fillMeta() {
  const current = state.current;
  const m = getAllMeta(editor.value);
  for (const input of metaInputs) {
    input.disabled = !current || readOnly;
    if (input === document.activeElement) continue;
    const v = m[input.dataset.meta];
    if (input.tagName === 'SELECT' && v && ![...input.options].some((o) => o.value === v)) input.add(new Option(v, v));
    input.value = v;
  }
  const tagsInput = $('#meta-tags');
  const noteInput = $('#meta-note');
  tagsInput.disabled = !current || readOnly;
  noteInput.disabled = !current; // eigene Notiz geht auch im Abo (bleibt auf diesem Gerät)
  if (tagsInput !== document.activeElement) tagsInput.value = getTags(editor.value).join(', ');
  if (noteInput !== document.activeElement) noteInput.value = current?.note || '';
  const capo = Number(m.capo) || 0;
  $('#meta-summary').textContent = [
    m.key && `Tonart ${m.key}`, capo > 0 && `Capo ${capo}`, m.time && `${m.time}-Takt`, m.tempo && `${m.tempo} bpm`, m.duration && (m.duration.includes(':') ? `${m.duration} min` : `${m.duration} s`),
    m.columns === '2' && 'zweispaltig', m.columns === '1' && 'einspaltig',
  ].filter(Boolean).join(' · ');
  const capoChip = $('#capo-chip');
  capoChip.hidden = !(capo > 0);
  capoChip.textContent = `Capo ${m.capo}`;
  capoChip.title = `Kapodaster im ${m.capo}. Bund`;
  const timeChip = $('#time-chip');
  timeChip.dataset.tempo = m.tempo || '';
  timeChip.dataset.time = m.time || '';
  const timeText = [m.time, m.tempo && `♩ ${m.tempo}`].filter(Boolean).join(' · ');
  $('#time-field').hidden = !timeText;
  timeChip.textContent = timeText;
  timeChip.title = [m.time && `${m.time}-Takt`, m.tempo && `Tempo ${m.tempo} Schläge/Minute`].filter(Boolean).join(', ');
}

/** Text im Editor ersetzen, als hätte man getippt (Vorschau, Speichern). */
export function setEditorText(text, keepCursor = true) {
  const { selectionStart: a, selectionEnd: b, value: before } = editor;
  editor.value = text;
  if (keepCursor) {
    const shift = editor.value.length - before.length; // Cursor ungefähr halten
    editor.setSelectionRange(Math.max(0, a + shift), Math.max(0, b + shift));
  }
  editor.dispatchEvent(new Event('input'));
}

for (const input of metaInputs) {
  input.addEventListener('input', () => {
    if (state.current) setEditorText(setMeta(editor.value, input.dataset.meta, input.value));
  });
}

// Tags: beim Verlassen des Feldes bzw. Enter übernehmen (Komma ist Trennzeichen)
$('#meta-tags').addEventListener('change', (e) => {
  if (state.current) setEditorText(setTags(editor.value, e.target.value.split(',')), false);
});
$('#meta-tags').addEventListener('keydown', (e) => e.key === 'Enter' && e.target.blur());

// Notiz: eigenes Feld am Lied (wird mit abgeglichen, aber nicht gedruckt)
let noteTimer;
$('#meta-note').addEventListener('input', (e) => {
  if (!state.current) return;
  const id = state.current.id;
  const note = e.target.value;
  setStatus('Ungespeichert …', 'dirty');
  clearTimeout(noteTimer);
  noteTimer = setTimeout(async () => {
    const rec = await repo.update(id, { note });
    if (state.current?.id === id) {
      state.current = { ...state.current, note: rec.note, updatedAt: rec.updatedAt };
      renderPreview();
    }
    setStatus('Gespeichert', 'saved');
  }, 500);
});
