// Mehrfachauswahl in der Liederliste: welche Lieder markiert sind und wie sich das ändert (Klick im
// Auswahlmodus, Strg/⌘+Klick, Umschalt+Klick für einen Bereich, „Alle“). Ereignis „selectionchange“
// auf window bei jeder Änderung. Leiste und Aktionen dazu: selection.js.

import { $, $$ } from './dom.js';

const listEl = $('#song-list');

/** Ausgewählte Lieder: active = Auswahlmodus an, ids = markierte Lieder, last = zuletzt angeklickt. */
export const selection = { active: false, ids: new Set(), last: null };

function selectionChanged() {
  selection.active = selection.active || selection.ids.size > 0;
  for (const b of $$('.song-item', listEl)) {
    if (selection.active) b.setAttribute('aria-pressed', String(selection.ids.has(b.dataset.id)));
    else b.removeAttribute('aria-pressed');
  }
  listEl.classList.toggle('selecting', selection.active);
  dispatchEvent(new Event('selectionchange'));
}

/** Auswahlmodus starten (optional gleich mit einem Lied). */
export function startSelection(id = null) {
  selection.active = true;
  if (id) {
    selection.ids.add(id);
    selection.last = id;
  }
  selectionChanged();
}

/** Lied an-/abwählen. */
export function toggleSelected(id) {
  if (selection.ids.has(id)) selection.ids.delete(id);
  else selection.ids.add(id);
  selection.last = id;
  selection.active = true;
  selectionChanged();
}

/** Alle Lieder zwischen zwei (in der Reihenfolge der Liste) auswählen. */
export function selectRange(fromId, toId) {
  const ids = $$('.song-item', listEl).map((b) => b.dataset.id);
  const [a, b] = [ids.indexOf(fromId), ids.indexOf(toId)].sort((x, y) => x - y);
  if (a < 0) return toggleSelected(toId);
  for (const id of ids.slice(a, b + 1)) selection.ids.add(id);
  selection.last = toId;
  selectionChanged();
}

/** Alle sichtbaren Lieder auswählen bzw. – sind schon alle gewählt – keines. */
export function selectAllVisible() {
  const ids = $$('.song-item', listEl).map((b) => b.dataset.id);
  const all = ids.every((id) => selection.ids.has(id));
  for (const id of ids) {
    if (all) selection.ids.delete(id);
    else selection.ids.add(id);
  }
  selectionChanged();
}

/** Auswahlmodus beenden. */
export function endSelection() {
  selection.active = false;
  selection.ids.clear();
  selection.last = null;
  selectionChanged();
}
