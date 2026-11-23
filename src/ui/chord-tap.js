// Akkorde per Antippen: Schalter „Akkorde setzen“ unten in der Vorschau. Ist er an, öffnet ein Tippen
// ins Lied eine Auswahl mit den Akkorden des Liedes, „anderer Akkord …“ und „entfernen“.
// Der Akkord landet im ChordPro-Text (Logik ohne Bildschirm: core/chord-place.js).
//
// Welche Textzeile: data-src an jeder .line (Renderer). Welche Spalte: sichtbare Liedtext-Zeichen der
// Zeile vor der getippten Stelle zählen – Akkord-Spans und unsichtbare Leerzeichen zählen nicht.

import { parseChordPro } from '../core/chordpro.js';
import { isChord } from '../core/chords.js';
import { chordAt, removeChordAt, setChordAt, songChords, visibleColumns } from '../core/chord-place.js';
import { chordNamer, chordWriter } from '../render/song-view.js';
import { readOnly, state } from './app-state.js';
import { $, toast } from './dom.js';
import { editor, preview, setEditorText } from './song.js';

const toggle = $('#btn-chordtap');
let on = false;
let pick = null; // offene Auswahl: { src, col, el }

const visibleLen = (s) => s.replace(/​/g, '').length;
const isChordText = (n) => n.parentElement?.closest('.chord, .chord-top');

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

function setOn(value) {
  on = value && !readOnly && Boolean(state.current);
  toggle.setAttribute('aria-pressed', String(on));
  toggle.querySelector('.label').textContent = on ? 'Fertig' : 'Akkorde setzen';
  preview.classList.toggle('chordtap-on', on);
  if (!on) closePick();
}

toggle.onclick = () => {
  setOn(!on);
  if (on) toast('Tippe auf die Stelle im Liedtext, über die ein Akkord soll');
};

addEventListener('songopened', () => {
  toggle.hidden = readOnly || !state.current;
  setOn(false);
});

preview.addEventListener('click', (e) => {
  if (!on) return;
  const lineEl = e.target.closest('.line[data-src]');
  if (!lineEl) return;
  e.preventDefault();
  e.stopPropagation();
  const chordEl = e.target.closest('.chord:not(.annotation):not(.harp), .chord-top');
  let col;
  if (chordEl) col = columnIn(lineEl, { before: chordEl.closest('.seg') || chordEl });
  else {
    const c = caretAt(e.clientX, e.clientY);
    if (c && lineEl.contains(c.node) && !isChordText(c.node)) col = columnIn(lineEl, c);
    else {
      // neben dem Text getippt: Anfang bzw. Ende der Zeile
      const r = lineEl.getBoundingClientRect();
      col = e.clientX > r.left + r.width / 2 ? Infinity : 0;
    }
  }
  openPick(Number(lineEl.dataset.src), col, e.clientX, e.clientY);
}, true);

// ---------- Auswahl ----------

function lineText(src) {
  return visibleColumns(editor.value.replace(/\r\n?/g, '\n').split('\n')[src] ?? '').text;
}

function closePick() {
  pick?.el.remove();
  pick = null;
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
  if (newText === before) return;
  setEditorText(newText, true);
  toast(msg, { action: 'Rückgängig', onAction: () => setEditorText(before, true) });
}

function openPick(src, col, x, y) {
  closePick();
  const el = document.createElement('div');
  el.className = 'chord-pick';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', 'Akkord setzen');
  document.body.append(el);
  pick = { src, col: Math.min(col, lineText(src).length), el };
  render();
  // PC: an der getippten Stelle; Handy (schmal): unten als Leiste (CSS)
  const r = el.getBoundingClientRect();
  el.style.left = `${Math.max(8, Math.min(x - 20, innerWidth - r.width - 8))}px`;
  el.style.top = `${y + 18 + r.height > innerHeight - 8 ? Math.max(8, y - r.height - 18) : y + 18}px`;
  addEventListener('pointerdown', onOutside, true);
  addEventListener('keydown', onKey, true);
  // Handy: Auswahl liegt unten – die angetippte Zeile darüber sichtbar halten
  const top = el.getBoundingClientRect().top;
  if (y > top - 12) preview.closest('.preview-scroll').scrollBy({ top: y - top + 48, behavior: 'smooth' });
  el.querySelector('.cp-chords button')?.focus({ preventScroll: true });
}

function render() {
  const { src, el } = pick;
  const text = lineText(src);
  const col = Math.max(0, Math.min(pick.col, text.length));
  pick.col = col;
  const { show, write } = names();
  const current = chordAt(editor.value, src, col);

  // Wort mit Markierung, wo der Akkord landet: „dar|ling“
  const left = text.lastIndexOf(' ', col - 1) + 1;
  let right = text.indexOf(' ', col);
  if (right < 0) right = text.length;
  const word = `${text.slice(left, col)}|${text.slice(col, right)}`.trim() || '|';

  const btn = (label, cls, onclick, title = '') => {
    const b = Object.assign(document.createElement('button'), { type: 'button', className: cls, textContent: label, title, onclick });
    return b;
  };
  const head = document.createElement('div');
  head.className = 'cp-head';
  const where = document.createElement('span');
  where.className = 'cp-where';
  where.append('Akkord über „', Object.assign(document.createElement('strong'), { textContent: word }), '“');
  head.append(
    where,
    btn('◀', 'icon-btn', () => { pick.col--; render(); }, 'Einen Buchstaben nach links'),
    btn('▶', 'icon-btn', () => { pick.col++; render(); }, 'Einen Buchstaben nach rechts'),
    btn('✕', 'icon-btn', closePick, 'Schließen (Esc)'),
  );
  head.querySelectorAll('.icon-btn')[0].disabled = col === 0;
  head.querySelectorAll('.icon-btn')[1].disabled = col >= text.length;

  const chords = document.createElement('div');
  chords.className = 'cp-chords';
  for (const c of songChords(editor.value)) {
    const b = btn(show(c), 'cp-chord', () => {
      apply(setChordAt(editor.value, src, col, c), `Akkord ${show(c)} gesetzt`);
      closePick();
    });
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
  form.append(input, btn('Setzen', 'primary', null));
  form.lastChild.type = 'submit';
  form.onsubmit = (e) => {
    e.preventDefault();
    const name = input.value.trim();
    if (!isChord(name)) {
      toast(`„${name}“ ist kein Akkord, den die App kennt (z. B. G, Am7, D/F#)`);
      input.focus();
      return;
    }
    apply(setChordAt(editor.value, src, col, write(name)), `Akkord ${name} gesetzt`);
    closePick();
  };
  foot.append(btn('anderer Akkord …', 'link-btn', () => {
    form.hidden = false;
    input.focus();
  }));
  if (current) {
    foot.append(btn('entfernen', 'link-btn danger', () => {
      apply(removeChordAt(editor.value, src, col), `Akkord ${show(current)} entfernt`);
      closePick();
    }));
  }
  el.replaceChildren(head, chords, foot, form);
}
