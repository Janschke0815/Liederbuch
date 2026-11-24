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

// ---------- Bereiche ein-/ausblenden (breiter Bildschirm) ----------
// Liste, Editor und Vorschau lassen sich einzeln einklappen: kleine Pfeile auf den Trennlinien
// (‹ › neben dem Bereich, der zuklappt). Ein eingeklappter Bereich bleibt als schmale Leiste mit
// seinem Namen stehen – ein Klick darauf klappt ihn wieder auf. Editor und Vorschau nie beide: wer das
// eine einklappt, während das andere schon zu ist, bekommt das andere zurück.
// Klassen am Arbeitsbereich: no-list, focus (kein Editor), no-preview.

const PANES = {
  list: { cls: 'no-list', pane: '.pane-list', pref: 'listHidden', name: 'Lieder', label: 'Liederliste', key: 'Strg+B' },
  editor: { cls: 'focus', pane: '.pane-editor', pref: 'focusMode', name: 'Editor', label: 'Editor', key: 'Strg+E' },
  preview: { cls: 'no-preview', pane: '.pane-preview', pref: 'previewHidden', name: 'Vorschau', label: 'Vorschau', key: '' },
};
const keyHint = (p) => (p.key ? ` (${p.key})` : '');

/** Ist der Bereich ('list' | 'editor' | 'preview') gerade ausgeblendet? */
export const isPaneHidden = (pane) => $('.workspace').classList.contains(PANES[pane].cls);

/**
 * Bereich ein- oder ausblenden (und die Wahl merken).
 * @param {'list'|'editor'|'preview'} pane
 * @param {boolean} hidden
 */
export function setPaneHidden(pane, hidden) {
  const p = PANES[pane];
  $('.workspace').classList.toggle(p.cls, hidden);
  prefs.set(p.pref, hidden);
  // nie Editor und Vorschau zugleich weg
  const other = { editor: 'preview', preview: 'editor' }[pane];
  if (hidden && other && isPaneHidden(other)) setPaneHidden(other, false);
  applyWidths();
  dispatchEvent(new Event('resize')); // Vorschau-Zoom, Noten, Spaltenmessungen
}

// Editor ausblenden (nur Liste + Vorschau), z. B. zum Spielen
/** Editor aus- (true) oder einblenden. */
export const setFocusMode = (on) => setPaneHidden('editor', on);
/** Ist der Editor gerade ausgeblendet? */
export const isFocusMode = () => isPaneHidden('editor');

/** Bereich ein-/ausklappen (Tastenkürzel Strg+B, Strg+E). */
export const togglePane = (pane) => setPaneHidden(pane, !isPaneHidden(pane));

// Schmale Leiste je Bereich: nur sichtbar, solange er eingeklappt ist
for (const [pane, p] of Object.entries(PANES)) {
  const rail = document.createElement('button');
  rail.type = 'button';
  rail.className = 'pane-rail';
  rail.title = `${p.label} aufklappen${keyHint(p)}`;
  rail.setAttribute('aria-label', `${p.label} aufklappen`);
  rail.append(Object.assign(document.createElement('span'), { textContent: p.name }));
  rail.onclick = () => setPaneHidden(pane, false);
  $(p.pane).prepend(rail);
}

/** Kleiner Pfeil auf einer Trennlinie, der den Bereich daneben einklappt. */
function collapseButton(pane, arrow) {
  const p = PANES[pane];
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'collapse-btn';
  b.textContent = arrow;
  b.title = `${p.label} einklappen${keyHint(p)}`;
  b.setAttribute('aria-label', `${p.label} einklappen`);
  b.addEventListener('pointerdown', (e) => e.stopPropagation()); // nicht ziehen
  b.addEventListener('dblclick', (e) => e.stopPropagation());
  b.onclick = () => setPaneHidden(pane, true);
  return b;
}

// ---------- Spaltenbreiten (ziehbare Trenner, breiter Bildschirm) ----------
// Liste: feste Breite in px; Editor/Vorschau: Anteil am Rest. Doppelklick = Standard.

const workspace = $('.workspace');
const LIST_MIN = 180;
const PANE_MIN = 260; // Editor und Vorschau mindestens so breit
const SHARE_MIN = 0.2;

/** Gespeicherte Breiten und sichtbare Bereiche anwenden (0 = Standardbreite aus dem CSS). */
function applyWidths() {
  const list = prefs.get('listWidth');
  const share = prefs.get('editorShare');
  // Liste nie breiter als 40 % des Fensters, auch wenn es später kleiner wird
  if (list) workspace.style.setProperty('--list-col', `min(${list}px, 40vw)`);
  else workspace.style.removeProperty('--list-col');
  // Spalten nur für die sichtbaren Bereiche (am Handy gilt eine Spalte, siehe layout.css)
  const showList = !workspace.classList.contains('no-list');
  const showEditor = !workspace.classList.contains('focus');
  const showPreview = !workspace.classList.contains('no-preview');
  const both = showEditor && showPreview;
  // eingeklappte Bereiche: schmale Leiste (--rail)
  const cols = [
    showList ? 'var(--list-col, var(--list-default))' : 'var(--rail)',
    showEditor ? `minmax(0, ${both && share ? share : 1}fr)` : 'var(--rail)',
    showPreview ? `minmax(0, ${both && share ? 1 - share : 1}fr)` : 'var(--rail)',
  ];
  workspace.style.setProperty('--cols', cols.join(' '));
  // Trenner nur zwischen zwei sichtbaren Bereichen
  workspace.dataset.splitList = String(showList);
  workspace.dataset.splitEditor = String(both);
}

const clampNum = (v, lo, hi) => Math.min(Math.max(v, lo), Math.max(lo, hi));

/** Neue Breite aus der Mausposition x; which: 'list' (Liste) oder 'editor' (Editor | Vorschau). */
function resizeTo(which, x) {
  const ws = workspace.getBoundingClientRect();
  const listRight = $('.pane-list').getBoundingClientRect().right;
  if (which === 'list') {
    prefs.set('listWidth', Math.round(clampNum(x - ws.left, LIST_MIN, ws.width * 0.4)));
  } else {
    const rest = ws.right - listRight; // Editor + Vorschau
    const ed = clampNum(x - listRight, PANE_MIN, rest - PANE_MIN);
    prefs.set('editorShare', Math.round(clampNum(ed / rest, SHARE_MIN, 1 - SHARE_MIN) * 1000) / 1000);
  }
  applyWidths();
}

function addSplitter(pane, which, buttons = []) {
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
  if (buttons.length) {
    const box = Object.assign(document.createElement('div'), { className: 'collapse-btns' });
    box.append(...buttons);
    s.append(box);
  }
  pane.append(s);
}

addSplitter($('.pane-list'), 'list', [collapseButton('list', '‹')]);
addSplitter($('.pane-editor'), 'editor', [collapseButton('editor', '‹'), collapseButton('preview', '›')]);
// gemerkte Bereiche wiederherstellen (setzt auch die Spalten)
for (const p of Object.values(PANES)) workspace.classList.toggle(p.cls, prefs.get(p.pref));
if (isPaneHidden('editor') && isPaneHidden('preview')) setPaneHidden('preview', false);
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
