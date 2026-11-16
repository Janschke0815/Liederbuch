// Kleine Hilfen für die Oberfläche – von allen ui-Modulen gemeinsam genutzt.

/** Erstes passendes Element (CSS-Selektor). */
export const $ = (sel, root = document) => root.querySelector(sel);
/** Alle passenden Elemente als Array. */
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** Element mit Eigenschaften anlegen: el('li', { className: 'x', textContent: 'y' }, kind1, kind2) */
export function el(tag, props = {}, ...children) {
  const node = Object.assign(document.createElement(tag), props);
  if (children.length) node.append(...children);
  return node;
}

/** Schmale Ansicht (Handy): dieselbe Grenze wie in den CSS-Dateien. */
export const isMobile = () => matchMedia('(max-width: 760px)').matches;

/** Steht der Cursor in einem Eingabefeld? (Dann keine Ein-Tasten-Kürzel.) */
export const isTyping = (node) => Boolean(node) && (node.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(node.tagName));

/** Liegt etwas über der Hauptansicht (Dialog, Druckvorschau, Spielmodus)? */
export const anyDialogOpen = () =>
  Boolean($('dialog[open]')) || !$('#print-view').hidden || !$('#play-view').hidden;

let toastTimer;
/** Kurze Meldung unten; optional mit Knopf (z. B. "Rückgängig"). */
export function toast(msg, { action, onAction, ms = 3500 } = {}) {
  const box = $('#toast');
  const btn = $('#toast-action');
  $('#toast-text').textContent = msg;
  btn.hidden = !action;
  btn.textContent = action || '';
  btn.onclick = async () => {
    box.hidden = true;
    await onAction?.();
  };
  box.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (box.hidden = true), action ? Math.max(ms, 6000) : ms);
}

/**
 * Dialog öffnen und auf die Antwort warten: den `value` des gedrückten Knopfes
 * (<button value="…"> in <form method="dialog">), bei Esc/Abbruch 'cancel'.
 *   const wahl = await ask('#dup-dialog');
 */
export function ask(dialog) {
  const d = typeof dialog === 'string' ? $(dialog) : dialog;
  d.returnValue = '';
  d.showModal();
  return new Promise((resolve) => d.addEventListener('close', () => resolve(d.returnValue || 'cancel'), { once: true }));
}

/** Klick auf den abgedunkelten Rand neben dem Dialog schließt ihn. */
export function closeOnBackdrop(...dialogs) {
  for (const d of dialogs.map((x) => (typeof x === 'string' ? $(x) : x))) {
    d.addEventListener('click', (e) => e.target === d && d.close('cancel'));
  }
}

/** Datei herunterladen (Text oder Blob). */
export function download(name, data, type = 'text/plain') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(data instanceof Blob ? data : new Blob([data], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
