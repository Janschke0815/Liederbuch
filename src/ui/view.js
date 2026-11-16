// Aufteilung des Bildschirms: Handy-Reiter (Lieder / Bearbeiten / Ansehen), Editor ausblenden,
// Menü „⋯“ am Handy.

import { prefs } from '../prefs.js';
import { $, $$ } from './dom.js';
import { flushSave } from './song.js';

/** Handy: welcher Bereich sichtbar ist ('list' | 'editor' | 'preview'). */
export function setView(view) {
  $('.workspace').dataset.view = view;
  for (const b of $$('.mobile-tabs button')) b.classList.toggle('active', b.dataset.view === view);
}

for (const b of $$('.mobile-tabs button')) {
  b.onclick = async () => {
    if (b.dataset.view !== 'editor') await flushSave();
    setView(b.dataset.view);
  };
}

// Editor ausblenden (nur Liste + Vorschau), z. B. zum Spielen
export function setFocusMode(on) {
  $('.workspace').classList.toggle('focus', on);
  $('#btn-focus').setAttribute('aria-pressed', String(on));
  prefs.set('focusMode', on);
}
/** Ist der Editor gerade ausgeblendet? */
export const isFocusMode = () => $('.workspace').classList.contains('focus');
$('#btn-focus').onclick = () => setFocusMode(!isFocusMode());
setFocusMode(prefs.get('focusMode'));

// Menü „⋯“ (am Handy stehen die Aktionen der Kopfleiste darin)
const menu = $('#actions');
const menuBtn = $('#btn-menu');
/** Menü „⋯“ öffnen oder schließen. */
export function setMenu(open) {
  menu.classList.toggle('open', open);
  menuBtn.setAttribute('aria-expanded', String(open));
}
menuBtn.onclick = (e) => {
  e.stopPropagation();
  setMenu(!menu.classList.contains('open'));
};
menu.addEventListener('click', () => setMenu(false));
document.addEventListener('click', (e) => !menu.contains(e.target) && setMenu(false));
addEventListener('keydown', (e) => e.key === 'Escape' && setMenu(false));
