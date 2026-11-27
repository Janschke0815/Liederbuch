// Harp-Hilfe: Mundharmonika-Tabs auf einer Harp in anderer Tonart spielen (core/harp-transpose.js).
// Weg A: gleiche Tabs, das Lied wird transponiert. Weg B: gleiche Tonart, die Tabs werden für die
// eigene Harp umgeschrieben – nur in der Ansicht (pro Lied auf diesem Gerät), auf Wunsch in den Text.

import { parseChordPro } from '../core/chordpro.js';
import { setMeta } from '../core/meta-edit.js';
import {
  HARP_KEYS, harpChoice, harpKeyName, parseHarpKey, rewriteHarpText, songHarp,
} from '../core/harp-transpose.js';
import { songKey } from '../render/song-view.js';
import { prefs } from '../prefs.js';
import { readOnly, state } from './app-state.js';
import { $, closeOnBackdrop, el, toast } from './dom.js';
import { editor, renderPreview, setEditorText, setViewOption } from './song.js';

const dialog = $('#harp-help-dialog');
const fromSel = $('#hh-from');
const toSel = $('#hh-to');

const playAsOf = (id) => prefs.get('harpPlayAs')[id] || '';
const myHarps = () => prefs.get('myHarps').filter((n) => parseHarpKey(n) >= 0);
const cost = (r) => (r.ok ? r.missing * 100 + r.bends * 3 + r.overs * 5 : Infinity);

/** Weg B als Kurztext: „alles ohne Bending“, „2 Bendings, 1 Ton fehlt“. */
function describe(r) {
  if (!r.ok) return 'nur für 10-Kanal-Harps';
  const parts = [];
  if (r.missing) parts.push(`${r.missing} ${r.missing === 1 ? 'Ton fehlt' : 'Töne fehlen'}`);
  if (r.bends) parts.push(`${r.bends} Bending${r.bends === 1 ? '' : 's'}`);
  if (r.overs) parts.push(`${r.overs} Overblow${r.overs === 1 ? '' : 's'}`);
  return parts.join(', ') || 'alles ohne Bending';
}

/** Eigene Harp für ein Lied merken (leer = Tabs wie geschrieben). */
function setPlayAs(id, name) {
  const map = prefs.get('harpPlayAs');
  if (name) map[id] = name;
  else delete map[id];
  prefs.set('harpPlayAs', map);
}

/** Geschätzte Harp beim ersten Anwenden als {harp:} in den Text schreiben – dann bleibt sie fest. */
function fixWrittenHarp(song) {
  const h = songHarp(song, state.current.transpose);
  if (h?.guessed && !readOnly) setEditorText(setMeta(editor.value, 'harp', harpKeyName(h.written)), false);
}

function option(title, detail, score, onclick, { current = false, good = false, disabled = false } = {}) {
  const b = el('button', { type: 'button', disabled, onclick },
    el('span', { className: 'capo-pos', textContent: title }),
    el('span', { className: 'capo-chords', textContent: detail }),
    el('span', { className: `capo-score${good ? ' hh-ok' : ''}`, textContent: score + (current ? ' · jetzt' : '') }));
  if (current) b.classList.add('current');
  return el('li', {}, b);
}

function fillOptions() {
  const cur = state.current;
  const song = parseChordPro(editor.value);
  const t = cur.transpose || 0;
  const to = Number(toSel.value);
  const c = harpChoice(song, t, to);
  const playAs = parseHarpKey(playAsOf(cur.id));
  const name = harpKeyName(to);
  const items = [];
  $('#hh-write').hidden = true;
  if (to === c.from) {
    items.push(playAs >= 0
      ? option('Original-Tabs', `Tabs wie geschrieben, für die ${name}-Harp`, 'zurück', () => {
        setPlayAs(cur.id, '');
        dialog.close();
        renderPreview();
      })
      : el('li', { className: 'hh-note', textContent: `Die Tabs passen zur ${name}-Harp – nichts zu tun.` }));
  } else {
    const keyNow = songKey(song, { transpose: t, accidentals: cur.accidentals })?.key;
    const keyThen = songKey(song, { transpose: t + c.shift, accidentals: cur.accidentals })?.key;
    const steps = Math.abs(c.shift);
    items.push(option('Gleiche Tabs',
      `Lied ${steps} Halbt${steps === 1 ? 'on' : 'öne'} ${c.shift > 0 ? 'höher' : 'tiefer'}${keyNow && keyThen ? `: ${keyNow} → ${keyThen}` : ''}. Akkorde werden angepasst.`,
      'keine Bendings dazu',
      async () => {
        dialog.close();
        fixWrittenHarp(song);
        setPlayAs(cur.id, '');
        await setViewOption({ transpose: t + c.shift });
        toast(`Lied ${c.shift > 0 ? '+' : ''}${c.shift} transponiert – Tabs passen jetzt zur ${name}-Harp`);
      }, { good: true }));
    const r = c.rewrite;
    const octave = { 12: ' – eine Oktave höher', 24: ' – zwei Oktaven höher', '-12': ' – eine Oktave tiefer', '-24': ' – zwei Oktaven tiefer' }[r.octave] || '';
    const current = playAs === to;
    items.push(option('Gleiche Tonart',
      `Tabs für die ${name}-Harp umgeschrieben${octave}${r.missing ? '. „?“ = gibt es auf dieser Harp nicht' : ''}`,
      describe(r),
      () => {
        dialog.close();
        fixWrittenHarp(song);
        setPlayAs(cur.id, name);
        renderPreview();
        toast(`Tabs für die ${name}-Harp umgeschrieben – nur in der Ansicht`);
      }, { current, good: r.ok && !r.missing && !r.bends && !r.overs, disabled: !r.ok }));
    $('#hh-write').hidden = !current || readOnly || !r.ok || r.missing > 0;
  }
  $('#hh-options').replaceChildren(...items);
}

/** „Ich spiele auf“: eigene Harps zuerst, die passende ist markiert. */
function fillTo(from, selected) {
  const mine = myHarps().map(parseHarpKey);
  const opt = (k) => new Option(`${harpKeyName(k)}-Harp${k === from ? ' (passt)' : ''}`, String(k));
  const groups = [];
  if (mine.length) {
    const g = el('optgroup', { label: 'Meine Harps' });
    g.append(...mine.sort((a, b) => a - b).map(opt));
    groups.push(g);
  }
  const rest = HARP_KEYS.map((_, k) => k).filter((k) => !mine.includes(k));
  if (rest.length) {
    const g = el('optgroup', { label: mine.length ? 'Andere' : 'Harp' });
    g.append(...rest.map(opt));
    groups.push(g);
  }
  toSel.replaceChildren(...groups);
  toSel.value = String(selected);
}

/** Vorauswahl: gewählte Harp, sonst passende eigene, sonst die mit den wenigsten Bendings. */
function defaultTo(song, t, from) {
  const playAs = parseHarpKey(playAsOf(state.current.id));
  if (playAs >= 0) return playAs;
  const mine = myHarps().map(parseHarpKey);
  if (!mine.length || mine.includes(from)) return from;
  return mine
    .map((k) => ({ k, c: harpChoice(song, t, k) }))
    .sort((a, b) => cost(a.c.rewrite) - cost(b.c.rewrite) || Math.abs(a.c.shift) - Math.abs(b.c.shift))[0].k;
}

function fillMine() {
  const mine = myHarps();
  $('#hh-mine').replaceChildren(...HARP_KEYS.map((name) => {
    const b = el('button', { type: 'button', textContent: name, title: `${name}-Harp habe ich` });
    b.setAttribute('aria-pressed', String(mine.includes(name)));
    b.onclick = () => {
      const now = myHarps();
      prefs.set('myHarps', now.includes(name) ? now.filter((n) => n !== name) : [...now, name]);
      fillMine();
      const song = parseChordPro(editor.value);
      const t = state.current.transpose || 0;
      const from = songHarp(song, t).key;
      fillTo(from, defaultTo(song, t, from)); // neue eigene Harp gleich vorschlagen
      fillOptions();
    };
    return b;
  }));
}

function fill() {
  const song = parseChordPro(editor.value);
  const t = state.current.transpose || 0;
  const h = songHarp(song, t);
  fromSel.replaceChildren(...HARP_KEYS.map((name, k) => new Option(`${name}-Harp`, String(k))));
  fromSel.value = String(h.key);
  fromSel.disabled = readOnly;
  $('#hh-guess').hidden = !h.guessed;
  fillMine();
  fillTo(h.key, defaultTo(song, t, h.key));
  fillOptions();
}

/** Harp-Hilfe für das geöffnete Lied (nur mit Mundharmonika-Tabs). */
export function openHarpHelp() {
  if (!state.current) return;
  if (!songHarp(parseChordPro(editor.value), 0)) return toast('Im Lied stehen keine Mundharmonika-Tabs');
  fill();
  dialog.showModal();
}

// „Tabs sind für“ korrigiert die geschätzte bzw. angegebene Harp: als {harp:} in den Text
fromSel.onchange = () => {
  const t = state.current.transpose || 0;
  setEditorText(setMeta(editor.value, 'harp', harpKeyName(Number(fromSel.value) - t)), false);
  fill();
};
toSel.onchange = fillOptions;

$('#hh-write').onclick = () => {
  const cur = state.current;
  const song = parseChordPro(editor.value);
  const t = cur.transpose || 0;
  const to = parseHarpKey(playAsOf(cur.id));
  const c = harpChoice(song, t, to);
  if (!c?.rewrite.ok) return;
  const before = editor.value;
  const id = cur.id;
  const name = harpKeyName(to);
  setPlayAs(id, '');
  setEditorText(setMeta(rewriteHarpText(before, c.rewrite.map), 'harp', harpKeyName(to - t)), false);
  dialog.close();
  toast(`Tabs für die ${name}-Harp in den Liedtext geschrieben`, {
    action: 'Rückgängig',
    ms: 8000,
    onAction: () => {
      if (state.current?.id !== id) return;
      setEditorText(before, false);
      setPlayAs(id, name);
      renderPreview();
    },
  });
};

$('#btn-harp-help').onclick = openHarpHelp;
$('#harp-chip').onclick = openHarpHelp;
closeOnBackdrop(dialog);
