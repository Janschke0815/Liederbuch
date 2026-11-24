// Bausteine über dem Editor: Akkord, Strophe, Refrain, Bridge, Tab, Noten, Wiederholung, Hinweis –
// und die Übersicht der ChordPro-Syntax („?“).

import { abcSkeleton } from '../core/abc.js';
import { parseChordPro } from '../core/chordpro.js';
import { bumpRepeat } from '../core/repeat.js';
import { state } from './app-state.js';
import { $, closeOnBackdrop, toast } from './dom.js';
import { SHORTCUTS, findShortcut, shortcutLabel, shortcutTable } from './shortcuts.js';
import { editor } from './song.js';

/**
 * Text an der Cursorstelle des Editors einfügen (mit Rückgängig); danach optional einen Teil markieren.
 * @param {string} text
 * @param {number} [selectFrom]  Markierung ab hier (relativ zum eingefügten Text)
 * @param {number} [selectTo]
 */
export function insertText(text, selectFrom, selectTo) {
  editor.focus();
  const start = editor.selectionStart;
  // execCommand erhält den Rückgängig-Verlauf des Browsers
  if (!document.execCommand?.('insertText', false, text)) {
    editor.setRangeText(text, editor.selectionStart, editor.selectionEnd, 'end');
    editor.dispatchEvent(new Event('input'));
  }
  if (selectFrom !== undefined) editor.setSelectionRange(start + selectFrom, start + (selectTo ?? selectFrom));
}


/** Zeilenumbruch, falls der Cursor nicht am Zeilenanfang steht. */
const lineStart = () => (editor.selectionStart === 0 || editor.value[editor.selectionStart - 1] === '\n' ? '' : '\n');

/** Leeres Notengerüst mit Takt und Tonart des Liedes; die Beispielzeilen sind markiert zum Überschreiben. */
export function insertAbcSkeleton() {
  const nl = lineStart();
  const lines = abcSkeleton(parseChordPro(editor.value).meta).split('\n');
  const head = `${nl}${lines.slice(0, 5).join('\n')}\n`;
  const body = lines.slice(5, -1).join('\n');
  insertText(`${head}${body}\n${lines.at(-1)}\n`, head.length, head.length + body.length);
}

/** Wiederholung: Zeile mit dem Cursor, markierte Zeilen oder – auf der Abschnittszeile – der Abschnitt. */
function insertRepeat() {
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

function insertSnippet(kind) {
  const sel = editor.value.slice(editor.selectionStart, editor.selectionEnd);
  if (kind === 'chord') {
    const name = sel.trim();
    return insertText(`[${name}]`, 1, 1 + name.length);
  }
  if (kind === 'comment') {
    const t = sel.trim() || 'Hinweis';
    return insertText(`{comment: ${t}}`, 10, 10 + t.length);
  }
  if (kind === 'times') return insertRepeat();
  const atLineStart = editor.selectionStart === 0 || editor.value[editor.selectionStart - 1] === '\n';
  const nl = atLineStart ? '' : '\n';
  if (kind === 'repeat') return insertText(`${nl}{chorus}\n`);
  if (kind === 'tab') {
    // Gitarren-Tab: markierter Text wird eingerahmt, sonst ein leeres Griffbrett (markiert,
    // damit ein kopierter Tab es mit Strg+V direkt ersetzt)
    const empty = ['e', 'B', 'G', 'D', 'A', 'E'].map((s) => `${s}|${'-'.repeat(16)}|`).join('\n');
    const body = sel.replace(/\n$/, '') || empty;
    const head = `${nl}{start_of_tab: Tab}\n`;
    return insertText(`${head}${body}\n{end_of_tab}\n`, head.length, head.length + body.length);
  }
  // Noten: Dialog „Noten einfügen“ (Datei, ABC aus dem Internet oder leeres Gerüst)
  if (kind === 'abc') return import('./notes-import.js').then((m) => m.openNotesImport());
  // Abschnitte: markierter Text kommt hinein
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

$('.snippets').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-snippet]');
  if (b && state.current) insertSnippet(b.dataset.snippet);
});

// Tastenkürzel (SHORTCUTS.editor) – nur wenn das Textfeld den Fokus hat
editor.addEventListener('keydown', (e) => {
  const s = findShortcut(e, SHORTCUTS.editor);
  if (!s || !state.current || editor.readOnly) return;
  e.preventDefault();
  insertSnippet(s.id);
});

// Kürzel im Tooltip der Knöpfe
for (const b of document.querySelectorAll('.snippets button[data-snippet]')) {
  const k = shortcutLabel(SHORTCUTS.editor, b.dataset.snippet);
  if (k) b.title = `${b.title} (${k})`;
}

// Übersicht der ChordPro-Syntax
$('#btn-syntax').onclick = () => {
  $('#syntax-keys').replaceChildren(shortcutTable(SHORTCUTS.editor));
  $('#syntax-dialog').showModal();
};
closeOnBackdrop('#syntax-dialog');
