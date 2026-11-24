// Dialog „Noten einfügen“ (Baustein „Noten“ über dem Editor): MusicXML-Datei oder ABC aus dem Internet
// als Notenabschnitt ins Lied holen (core/abc-import.js, core/musicxml.js), mit Vorschau. Fehlen im Lied
// Titel, Tonart, Takt oder Tempo, werden sie auf Wunsch aus den Noten übernommen.
// Fügt man ein ganzes Notenstück direkt in den Editor ein, öffnet sich der Dialog ebenfalls.

import { abcSection, looksLikeNotes, placeNotes, readNotes } from '../core/abc-import.js';
import { parseChordPro } from '../core/chordpro.js';
import { readMxl } from '../core/musicxml.js';
import { renderScores } from '../render/abc-view.js';
import { renderSong } from '../render/song-view.js';
import { applySettings, loadSettings } from '../settings/settings.js';
import { state } from './app-state.js';
import { $, closeOnBackdrop, toast } from './dom.js';
import { insertAbcSkeleton, insertText } from './snippets.js';
import { editor } from './song.js';

const dlg = $('#notes-dialog');
let source = ''; // eingefügter oder geladener Text
let result = null; // readNotes(source)
let selection = [0, 0]; // Cursor im Editor beim Öffnen

/** Gewähltes Stück (bei ABC mit mehreren Stücken) */
const tune = () => result?.tunes[result.kind === 'abc' ? Number($('#notes-pick').value) || 0 : 0] || null;

/** Was aus den Noten ins Lied übernommen würde (nur, was dort noch fehlt). */
function missingMeta(t) {
  const meta = parseChordPro(editor.value).meta;
  const out = [];
  if (t.title && !meta.title) out.push(['title', t.title, 'Titel']);
  if (t.composer && !meta.composer && !meta.artist) out.push(['composer', t.composer, 'Komponist']);
  if (t.key && !meta.key) out.push(['key', t.key, 'Tonart']);
  if (t.time && !meta.time) out.push(['time', t.time, 'Takt']);
  if (t.tempo && !meta.tempo) out.push(['tempo', String(t.tempo), 'Tempo']);
  return out;
}

async function update({ part } = {}) {
  result = null;
  $('#notes-ok').disabled = true;
  $('#notes-preview').hidden = true;
  $('#notes-meta-row').hidden = true;
  $('#notes-pick-row').hidden = true;
  $('#notes-info').textContent = '';
  if (!source.trim()) return;
  try {
    result = readNotes(source, part === undefined ? {} : { part });
  } catch (err) {
    $('#notes-info').textContent = err.message;
    return;
  }
  // Auswahl: mehrere ABC-Stücke oder mehrere Spuren einer Partitur
  const choices = result.kind === 'abc' ? result.tunes.map((t, i) => t.title || `Stück ${i + 1}`) : result.parts;
  if (choices.length > 1) {
    $('#notes-pick-label').textContent = result.kind === 'abc' ? 'Stück' : 'Spur';
    $('#notes-pick').replaceChildren(...choices.map((c, i) => new Option(c, String(i))));
    $('#notes-pick').value = String(result.kind === 'abc' ? 0 : result.part);
    $('#notes-pick-row').hidden = false;
  }
  showTune();
}

async function showTune() {
  const t = tune();
  if (!t) return;
  $('#notes-info').textContent = result.kind === 'musicxml'
    ? `MusicXML: ${t.measures} ${t.measures === 1 ? 'Takt' : 'Takte'}${t.title ? ` · „${t.title}“` : ''} · Tonart ${t.key}${t.time ? ` · ${t.time}` : ''}`
    : `ABC${t.title ? `: „${t.title}“` : ''}${t.key ? ` · Tonart ${t.key}` : ''}`;
  const miss = missingMeta(t);
  $('#notes-meta-row').hidden = !miss.length;
  $('#notes-meta-text').textContent = `Ins Lied übernehmen: ${miss.map(([, v, l]) => `${l} ${v}`).join(', ')}`;
  $('#notes-ok').disabled = false;
  const box = $('#notes-preview');
  applySettings(box, { ...loadSettings(), showAbc: true });
  box.replaceChildren(renderSong(parseChordPro(abcSection(t.abc))).querySelector('.song-body'));
  box.hidden = false;
  await renderScores(box, { follow: false }).catch((err) => console.warn('Noten-Vorschau:', err));
}

$('#notes-pick').onchange = () => (result?.kind === 'musicxml' ? update({ part: Number($('#notes-pick').value) }) : showTune());

let typing;
$('#notes-paste').oninput = () => {
  clearTimeout(typing);
  typing = setTimeout(() => {
    source = $('#notes-paste').value;
    update();
  }, 300);
};

/** Datei lesen: .mxl ist gepackt, alles andere Text. */
async function loadFile(file) {
  try {
    source = /\.mxl$/i.test(file.name) ? await readMxl(await file.arrayBuffer()) : await file.text();
  } catch (err) {
    $('#notes-info').textContent = err.message;
    return;
  }
  $('#notes-paste').value = /^\s*</.test(source) ? `(${file.name})` : source;
  update();
}

$('#notes-file-btn').onclick = () => $('#notes-file').click();
$('#notes-file').onchange = () => {
  const f = $('#notes-file').files[0];
  if (f) loadFile(f);
  $('#notes-file').value = '';
};
dlg.addEventListener('dragover', (e) => {
  e.preventDefault();
  dlg.classList.add('dragover');
});
dlg.addEventListener('dragleave', () => dlg.classList.remove('dragover'));
dlg.addEventListener('drop', (e) => {
  e.preventDefault();
  dlg.classList.remove('dragover');
  const f = e.dataTransfer.files[0];
  if (f) loadFile(f);
});

/** Zurück in den Editor an die gemerkte Stelle */
function restoreCursor() {
  editor.focus();
  editor.setSelectionRange(...selection);
}

$('#notes-empty').onclick = () => {
  dlg.close();
  restoreCursor();
  insertAbcSkeleton();
};

$('#notes-ok').onclick = (e) => {
  e.preventDefault();
  const t = tune();
  if (!t) return;
  const meta = $('#notes-meta').checked ? missingMeta(t) : [];
  dlg.close();
  const r = placeNotes(editor.value, selection[0], abcSection(t.abc), meta.map(([k, v]) => [k, v]));
  // ganzer Text in einem Schritt ersetzt – Strg+Z nimmt alles zurück
  editor.focus();
  editor.setSelectionRange(0, editor.value.length);
  insertText(r.text);
  editor.setSelectionRange(r.cursor, r.cursor);
  toast(`Noten eingefügt${meta.length ? ` – ${meta.map(([, , l]) => l).join(', ')} übernommen` : ''}`);
};
closeOnBackdrop(dlg);

/**
 * Dialog „Noten einfügen“ öffnen (Baustein „Noten“, Alt+N).
 * @param {{text?: string}} [opts]  text: schon eingefügter Notentext (z. B. aus der Zwischenablage)
 */
export function openNotesImport({ text = '' } = {}) {
  if (!state.current) return;
  // Cursor im Editor merken; stand er nicht im Editor, kommen die Noten ans Ende
  const fromEditor = document.activeElement === editor || document.activeElement?.closest?.('.snippets');
  selection = fromEditor ? [editor.selectionStart, editor.selectionEnd] : [editor.value.length, editor.value.length];
  source = text;
  $('#notes-paste').value = text;
  update();
  dlg.showModal();
  if (!text) $('#notes-paste').focus();
}

/** Steht der Cursor in einem Notenabschnitt? Dann wird Eingefügtes nicht umgeleitet. */
function insideAbc() {
  const before = editor.value.slice(0, editor.selectionStart);
  const last = (re) => Math.max(-1, ...[...before.matchAll(re)].map((m) => m.index));
  return last(/\{\s*(start_of_abc|soa)\b/gi) > last(/\{\s*(end_of_abc|eoa)\s*\}/gi);
}

// Ganzes Notenstück (ABC mit Kopf oder MusicXML) in den Editor eingefügt → Dialog mit Vorschau
editor.addEventListener('paste', (e) => {
  const text = e.clipboardData?.getData('text/plain') || '';
  if (!looksLikeNotes(text) || insideAbc()) return;
  e.preventDefault();
  openNotesImport({ text });
});
