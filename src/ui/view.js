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

// ---------- Spaltenbreiten (ziehbare Trenner, breiter Bildschirm) ----------
// Liste: feste Breite in px; Editor/Vorschau: Anteil am Rest. Doppelklick = Standard.

const workspace = $('.workspace');
const LIST_MIN = 180;
const PANE_MIN = 260; // Editor und Vorschau mindestens so breit
const SHARE_MIN = 0.2;

/** Gespeicherte Breiten anwenden (0 = Standard aus dem CSS). */
function applyWidths() {
  const list = prefs.get('listWidth');
  const share = prefs.get('editorShare');
  // Liste nie breiter als 40 % des Fensters, auch wenn es später kleiner wird
  if (list) workspace.style.setProperty('--list-col', `min(${list}px, 40vw)`);
  else workspace.style.removeProperty('--list-col');
  if (share) {
    workspace.style.setProperty('--editor-fr', `${share}fr`);
    workspace.style.setProperty('--preview-fr', `${1 - share}fr`);
  } else {
    workspace.style.removeProperty('--editor-fr');
    workspace.style.removeProperty('--preview-fr');
  }
}

const clampNum = (v, lo, hi) => Math.min(Math.max(v, lo), Math.max(lo, hi));

/** Neue Breite aus der Mausposition x; which: 'list' (Liste) oder 'editor' (Editor | Vorschau). */
function resizeTo(which, x) {
  const ws = workspace.getBoundingClientRect();
  const list = $('.pane-list').getBoundingClientRect();
  if (which === 'list') {
    prefs.set('listWidth', Math.round(clampNum(x - ws.left, LIST_MIN, ws.width * 0.4)));
  } else {
    const rest = ws.right - list.right; // Editor + Vorschau
    const ed = clampNum(x - list.right, PANE_MIN, rest - PANE_MIN);
    prefs.set('editorShare', Math.round(clampNum(ed / rest, SHARE_MIN, 1 - SHARE_MIN) * 1000) / 1000);
  }
  applyWidths();
}

function addSplitter(pane, which) {
  const s = document.createElement('div');
  s.className = 'splitter';
  s.tabIndex = 0;
  s.setAttribute('role', 'separator');
  s.setAttribute('aria-orientation', 'vertical');
  s.setAttribute('aria-label', which === 'list' ? 'Breite der Liederliste' : 'Breite von Editor und Vorschau');
  s.title = 'Ziehen: Breite ändern · Doppelklick: Standard';
  s.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    s.setPointerCapture(e.pointerId);
    s.classList.add('dragging');
    document.body.classList.add('resizing');
    const move = (ev) => resizeTo(which, ev.clientX);
    const up = () => {
      s.removeEventListener('pointermove', move);
      s.classList.remove('dragging');
      document.body.classList.remove('resizing');
      dispatchEvent(new Event('resize')); // z. B. Vorschau-Zoom, Spaltenmessungen
    };
    s.addEventListener('pointermove', move);
    s.addEventListener('pointerup', up, { once: true });
    s.addEventListener('pointercancel', up, { once: true });
  });
  s.addEventListener('dblclick', () => {
    prefs.set(which === 'list' ? 'listWidth' : 'editorShare', 0);
    applyWidths();
  });
  // Tastatur: ← / → verschieben um 24 px
  s.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const x = pane.getBoundingClientRect().right + (e.key === 'ArrowRight' ? 24 : -24);
    resizeTo(which, x);
  });
  pane.append(s);
}

addSplitter($('.pane-list'), 'list');
addSplitter($('.pane-editor'), 'editor');
applyWidths();

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
