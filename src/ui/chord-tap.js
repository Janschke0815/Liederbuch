// Akkorde per Antippen. Am Handy: Bearbeiten → „Text | Akkorde“ – unter „Akkorde“ steht das Lied wie in
// der Vorschau, Antippen setzt Akkorde. Am PC: Knopf „Akkorde“ in der Leiste über der Vorschau.
// Ein Tipp öffnet eine Auswahl mit den Akkorden des Liedes, „anderer Akkord …“ und „entfernen“; der
// Akkord landet im ChordPro-Text (Logik ohne Bildschirm: core/chord-place.js).
//
// Welche Textzeile: data-src an jeder .line (Renderer). Welche Spalte: sichtbare Liedtext-Zeichen der
// Zeile vor der getippten Stelle zählen (Akkord-Spans und unsichtbare Leerzeichen zählen nicht), dann
// am Wort- bzw. Silbenanfang einrasten (snapColumn). Ein Tipp auf einen Akkord wählt genau diesen.

import { parseChordPro } from '../core/chordpro.js';
import { isChord } from '../core/chords.js';
import { chordAt, removeChordAt, setChordAt, snapColumn, songChords, visibleColumns } from '../core/chord-place.js';
import { prefs } from '../prefs.js';
import { chordNamer, chordWriter } from '../render/song-view.js';
import { readOnly, state } from './app-state.js';
import { $, $$, isMobile, toast } from './dom.js';
import { editor, preview, setEditorText } from './song.js';

const toggle = $('#btn-chordtap'); // PC
const pane = $('.pane-editor');
const chordView = $('#chord-view');
const chordSheet = $('#chord-view-sheet');
let previewOn = false; // PC: Antippen in der Vorschau an
let pick = null; // offene Auswahl: { src, col, el, lineEl, scroller }

const visibleLen = (s) => s.replace(/​/g, '').length;
const isChordText = (n) => n.parentElement?.closest('.chord, .chord-top');
const lyricNodes = (lineEl) => {
  const out = [];
  const walker = document.createTreeWalker(lineEl, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) if (!isChordText(n)) out.push(n);
  return out;
};

/** Sichtbare Spalte in einer gerenderten Zeile – an Textstelle (node, offset) oder vor einem Akkord-Element. */
function columnIn(lineEl, { node, offset = 0, before = null }) {
  const walker = document.createTreeWalker(lineEl, NodeFilter.SHOW_TEXT);
  let col = 0;
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (before && (before.contains(n) || before.compareDocumentPosition(n) & Node.DOCUMENT_POSITION_FOLLOWING)) return col;
    if (n === node) return col + visibleLen(n.data.slice(0, offset));
    if (!isChordText(n)) col += visibleLen(n.data);
  }
  return col;
}

/** Textstelle unter dem Finger/Mauszeiger. */
function caretAt(x, y) {
  const p = document.caretPositionFromPoint?.(x, y);
  if (p) return { node: p.offsetNode, offset: p.offset };
  const r = document.caretRangeFromPoint?.(x, y);
  return r ? { node: r.startContainer, offset: r.startOffset } : null;
}

// ---------- Wo Antippen gilt ----------

/** Handy: Bearbeiten-Ansicht „Text“ oder „Akkorde“ (gemerkt). */
function setEditMode(mode) {
  const m = mode === 'chords' && !readOnly ? 'chords' : 'text';
  pane.dataset.edit = m;
  for (const b of $$('.edit-mode button')) b.setAttribute('aria-checked', String(b.dataset.edit === m));
  prefs.set('editMode', m);
  if (m === 'chords') syncChordView();
  else closePick();
}
for (const b of $$('.edit-mode button')) b.onclick = () => setEditMode(b.dataset.edit);

/** Akkord-Ansicht am Handy: dieselbe Darstellung wie die Vorschau. */
function syncChordView() {
  if (pane.dataset.edit !== 'chords') return;
  chordSheet.replaceChildren(...[...preview.childNodes].map((n) => n.cloneNode(true)));
  chordSheet.querySelector('.chord-caret')?.remove();
}
addEventListener('previewrendered', () => {
  syncChordView();
  if (pick && !pick.lineEl.isConnected) closePick(); // neu gezeichnet (z. B. Abgleich) – Auswahl passt nicht mehr
});

/** PC: Antippen in der Vorschau an/aus. */
function setPreviewOn(value) {
  previewOn = value && !readOnly && Boolean(state.current);
  toggle.setAttribute('aria-pressed', String(previewOn));
  preview.classList.toggle('chordtap-on', previewOn);
  $('#chord-hint-preview').hidden = !previewOn;
  if (!previewOn) closePick();
}
toggle.onclick = () => setPreviewOn(!previewOn);
$('#chordtap-done').onclick = () => setPreviewOn(false);

addEventListener('songopened', () => {
  toggle.hidden = readOnly || !state.current;
  $('.edit-mode').hidden = readOnly;
  setPreviewOn(false);
  closePick();
});
setEditMode(prefs.get('editMode'));

/** Ist Antippen an diesem Ort gerade an? */
const active = (host) => (host === preview ? previewOn && !isMobile() : pane.dataset.edit === 'chords' && isMobile());

function onTap(host) {
  return (e) => {
    if (!active(host)) return;
    const lineEl = e.target.closest('.line[data-src]');
    if (!lineEl || !state.current) return;
    e.preventDefault();
    e.stopPropagation();
    const src = Number(lineEl.dataset.src);
    const chordEl = e.target.closest('.chord:not(.annotation):not(.harp), .chord-top');
    let col;
    if (chordEl) {
      col = columnIn(lineEl, { before: chordEl.closest('.seg') || chordEl }); // genau dieser Akkord
    } else {
      const c = caretAt(e.clientX, e.clientY);
      if (c && lineEl.contains(c.node) && !isChordText(c.node)) col = columnIn(lineEl, c);
      else {
        const r = lineEl.getBoundingClientRect(); // neben dem Text: Anfang bzw. Ende der Zeile
        col = e.clientX > r.left + r.width / 2 ? Infinity : 0;
      }
      col = snapColumn(editor.value, src, col);
    }
    openPick({ src, col, lineEl, scroller: host === preview ? host.closest('.preview-scroll') : chordView }, e.clientX, e.clientY);
  };
}
preview.addEventListener('click', onTap(preview), true);
chordView.addEventListener('click', onTap(chordView), true);

// ---------- Einfügestrich ----------

/** Senkrechten Strich an Spalte col in die gerenderte Zeile setzen. */
function placeCaret(lineEl, col) {
  lineEl.querySelector('.chord-caret')?.remove();
  const mark = Object.assign(document.createElement('span'), { className: 'chord-caret' });
  mark.setAttribute('aria-hidden', 'true');
  let left = col;
  for (const n of lyricNodes(lineEl)) {
    const len = visibleLen(n.data);
    if (left <= len && len > 0) {
      // Offset im Knoten: unsichtbare Leerzeichen überspringen
      let off = 0;
      for (let seen = 0; off < n.data.length && seen < left; off++) if (n.data[off] !== '​') seen++;
      if (off === 0) n.parentNode.insertBefore(mark, n);
      else if (off >= n.data.length) n.parentNode.insertBefore(mark, n.nextSibling);
      else n.parentNode.insertBefore(mark, n.splitText(off));
      return;
    }
    left -= len;
  }
  lineEl.append(mark); // Zeilenende
}

function removeCaret() {
  for (const m of $$('.chord-caret')) {
    const parent = m.parentNode;
    m.remove();
    parent?.normalize();
  }
}

// ---------- Auswahl ----------

function lineText(src) {
  return visibleColumns(editor.value.replace(/\r\n?/g, '\n').split('\n')[src] ?? '').text;
}

function closePick() {
  pick?.el.remove();
  pick = null;
  removeCaret();
  removeEventListener('pointerdown', onOutside, true);
  removeEventListener('keydown', onKey, true);
}
function onOutside(e) {
  if (pick && !pick.el.contains(e.target) && !e.target.closest('.line[data-src], .ctx-menu')) closePick();
}
function onKey(e) {
  if (e.key === 'Escape' && pick) {
    e.stopPropagation();
    closePick();
  }
}

/** Ansicht wie in der Vorschau (transponiert) und zurück in den Text. */
function names() {
  const song = parseChordPro(editor.value);
  const opts = { transpose: state.current?.transpose || 0, accidentals: state.current?.accidentals || 'auto' };
  return { show: chordNamer(song, opts), write: chordWriter(song, opts) };
}

function apply(newText, msg) {
  const before = editor.value;
  closePick();
  if (newText === before) return;
  setEditorText(newText, true);
  toast(msg, { action: 'Rückgängig', onAction: () => setEditorText(before, true) });
}

function openPick(target, x, y) {
  closePick();
  const el = document.createElement('div');
  el.className = 'chord-pick';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', 'Akkord setzen');
  document.body.append(el);
  pick = { ...target, col: Math.min(target.col, lineText(target.src).length), el };
  render();
  // PC: an der getippten Stelle; Handy (schmal): unten als Leiste (CSS)
  const r = el.getBoundingClientRect();
  el.style.left = `${Math.max(8, Math.min(x - 20, innerWidth - r.width - 8))}px`;
  el.style.top = `${y + 18 + r.height > innerHeight - 8 ? Math.max(8, y - r.height - 18) : y + 18}px`;
  addEventListener('pointerdown', onOutside, true);
  addEventListener('keydown', onKey, true);
  // Handy: Auswahl liegt unten – die angetippte Zeile darüber sichtbar halten
  const top = el.getBoundingClientRect().top;
  const lineBottom = pick.lineEl.getBoundingClientRect().bottom;
  if (lineBottom > top - 8) pick.scroller?.scrollBy({ top: lineBottom - top + 40 }); // sofort, nicht weich – sonst kurz verdeckt
  el.querySelector('.cp-chords button')?.focus({ preventScroll: true });
}

function render() {
  const { src, el } = pick;
  const text = lineText(src);
  const col = Math.max(0, Math.min(pick.col, text.length));
  pick.col = col;
  placeCaret(pick.lineEl, col);
  const { show, write } = names();
  const current = chordAt(editor.value, src, col);

  // Wort mit Markierung, wo der Akkord landet: „|sweet“, „dar|ling“
  const left = text.lastIndexOf(' ', col - 1) + 1;
  let right = text.indexOf(' ', col);
  if (right < 0) right = text.length;
  const word = `${text.slice(left, col)}|${text.slice(col, right)}`.trim() || '|';

  const btn = (label, cls, onclick, title = '') => Object.assign(document.createElement('button'), { type: 'button', className: cls, textContent: label, title, onclick });
  const head = document.createElement('div');
  head.className = 'cp-head';
  const where = document.createElement('span');
  where.className = 'cp-where';
  where.append('Akkord vor „', Object.assign(document.createElement('strong'), { textContent: word }), '“');
  const prev = btn('◀', 'icon-btn', () => { pick.col--; render(); }, 'Einen Buchstaben nach links');
  const next = btn('▶', 'icon-btn', () => { pick.col++; render(); }, 'Einen Buchstaben nach rechts');
  prev.disabled = col === 0;
  next.disabled = col >= text.length;
  head.append(where, prev, next, btn('✕', 'icon-btn', closePick, 'Schließen (Esc)'));

  const chords = document.createElement('div');
  chords.className = 'cp-chords';
  for (const c of songChords(editor.value)) {
    const b = btn(show(c), 'cp-chord', () => apply(setChordAt(editor.value, src, col, c), `Akkord ${show(c)} gesetzt`));
    if (current === c) b.setAttribute('aria-pressed', 'true');
    chords.append(b);
  }
  if (!chords.children.length) chords.append(Object.assign(document.createElement('span'), { className: 'hint', textContent: 'Noch keine Akkorde im Lied – „anderer Akkord …“' }));

  const foot = document.createElement('div');
  foot.className = 'cp-foot';
  const form = document.createElement('form');
  form.className = 'cp-custom';
  form.hidden = true;
  const input = Object.assign(document.createElement('input'), {
    placeholder: 'z. B. Em7 oder D/F#', autocomplete: 'off', spellcheck: false, autocapitalize: 'off',
  });
  input.setAttribute('aria-label', 'Akkord');
  const ok = btn('Setzen', 'primary', null);
  ok.type = 'submit';
  form.append(input, ok);
  form.onsubmit = (e) => {
    e.preventDefault();
    const name = input.value.trim();
    if (!isChord(name)) {
      toast(`„${name}“ ist kein Akkord, den die App kennt (z. B. G, Am7, D/F#)`);
      input.focus();
      return;
    }
    apply(setChordAt(editor.value, src, col, write(name)), `Akkord ${name} gesetzt`);
  };
  foot.append(btn('anderer Akkord …', 'link-btn', () => {
    form.hidden = false;
    input.focus();
  }));
  if (current) foot.append(btn('entfernen', 'link-btn danger', () => apply(removeChordAt(editor.value, src, col), `Akkord ${show(current)} entfernt`)));
  el.replaceChildren(head, chords, foot, form);
}
