// Tastenkürzel der Hauptansicht (die des Spielmodus stehen in play-mode.js). Welche Taste was
// tut, steht in shortcuts.js – hier nur, was die Aktionen bewirken.

import { state } from './app-state.js';
import { $, anyDialogOpen, isTyping } from './dom.js';
import { focusSearch } from './list.js';
import { toggleMetronome } from './preview-tools.js';
import { SHORTCUTS, findShortcut, shortcutTable } from './shortcuts.js';
import { saveNow } from './song.js';

const ACTIONS = {
  search: focusSearch,
  save: saveNow,
  print: () => {
    if (!$('#print-view').hidden) $('#pv-print').click();
    else if (!$('dialog[open]')) $('#btn-print').click();
  },
  focus: () => $('#btn-focus').click(),
  play: () => $('#btn-play').click(),
  metronome: toggleMetronome,
  up: () => $('#tr-up').click(),
  down: () => $('#tr-down').click(),
  help: () => openShortcuts(),
};

// Diese gehen auch, während ein Dialog oder die Druckvorschau offen ist
const ALWAYS = new Set(['save', 'print']);

addEventListener('keydown', (e) => {
  const s = findShortcut(e, SHORTCUTS.app);
  if (!s) return;
  if (!ALWAYS.has(s.id) && anyDialogOpen()) return;
  // Ein-Tasten-Kürzel nicht beim Tippen; Strg-Kürzel immer
  const plain = !s.keys.some((k) => k.startsWith('Mod+'));
  if (plain && isTyping(document.activeElement)) return;
  if (s.song && !state.current) return;
  e.preventDefault();
  ACTIONS[s.id]();
});

// ---------- Übersicht ----------

/** Dialog „Tastenkürzel“ – Tabellen aus SHORTCUTS. */
export function openShortcuts() {
  $('#keys-app').replaceChildren(shortcutTable(SHORTCUTS.app));
  $('#keys-play').replaceChildren(shortcutTable(SHORTCUTS.play));
  $('#keys-editor').replaceChildren(shortcutTable(SHORTCUTS.editor));
  $('#keys-dialog').showModal();
}
$('#btn-keys').onclick = openShortcuts;
