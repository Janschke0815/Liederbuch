// „Was kann ich spielen?“ über der Liederliste: Filter nach Griffen, die man kann (optional mit Capo).
// Eingeklappt filtert er weiter und zeigt die eigenen Griffe; der Hinweis „Gefiltert: …“ über der Liste
// hat „Aus“. Die Liste (list.js) fragt hier nach, was sie zeigen soll.

import { parseChordPro } from '../core/chordpro.js';
import { transposeChord } from '../core/chords.js';
import { parseKnown, playableCapo } from '../core/playable.js';
import { usedChords } from '../render/song-view.js';
import { prefs } from '../prefs.js';
import { $ } from './dom.js';

const cf = {
  open: prefs.get('chordFilterOpen'), // eingeschaltet: filtert, sobald Griffe eingetragen sind
  expanded: prefs.get('chordFilterExpanded'), // Eingabefeld sichtbar (eingeklappt filtert es weiter)
  chords: prefs.get('chordFilterChords'),
  capo: prefs.get('chordFilterCapo'),
};
const capoHint = new Map(); // songId -> Capo-Bund für die Anzeige in der Liste
let changed = () => {};

/** Filtert der Griff-Filter gerade (eingeschaltet und Griffe eingetragen)? */
export const chordFilterActive = () => cf.open && parseKnown(cf.chords).size > 0;

/** Capo-Bund, mit dem das Lied nur mit den eigenen Griffen geht (undefined: ohne Capo). */
export const capoFor = (id) => capoHint.get(id);

/**
 * Lieder, die nur aus bekannten Griffen bestehen (mit gespeicherter Transposition).
 * @param {object[]} songs
 * @returns {object[]}  ohne aktiven Filter dieselbe Liste
 */
export function applyChordFilter(songs) {
  capoHint.clear();
  if (!chordFilterActive()) return songs;
  const known = parseKnown(cf.chords);
  return songs.filter((s) => {
    const chords = usedChords(parseChordPro(s.chordpro)).map((c) => transposeChord(c, s.transpose || 0, false));
    const capo = playableCapo(chords, known, { withCapo: cf.capo });
    if (capo === null) return false;
    if (capo > 0) capoHint.set(s.id, capo);
    return true;
  });
}

/**
 * Was bei jeder Änderung am Filter passieren soll (die Liste neu zeichnen).
 * @param {() => void} fn
 */
export function onChordFilterChange(fn) {
  changed = fn;
}

// ---------- Bedienung ----------

const panel = $('#cf-panel');
const toggle = $('#cf-toggle');
const input = $('#cf-chords');

function save() {
  prefs.set('chordFilterOpen', cf.open);
  prefs.set('chordFilterExpanded', cf.expanded);
}

function sync() {
  const shown = cf.open && cf.expanded;
  panel.hidden = !shown;
  toggle.setAttribute('aria-expanded', String(shown));
  toggle.classList.toggle('active', chordFilterActive());
  toggle.classList.toggle('collapsed', cf.open && !cf.expanded);
  // Eingeklappt und aktiv: statt der Frage die eigenen Griffe zeigen – eine kurze Zeile
  toggle.querySelector('.cf-label').textContent = chordFilterActive() && !cf.expanded
    ? `🎸 ${cf.chords.trim().replace(/[\s,;]+/g, ' ')}`
    : '🎸 Was kann ich spielen?';
}

/** Einklappen; ohne eingetragene Griffe heißt das: Filter aus. */
function collapse() {
  cf.expanded = false;
  if (!parseKnown(cf.chords).size) cf.open = false;
  save();
  sync();
  changed();
}

toggle.onclick = () => {
  if (!cf.open) {
    cf.open = true;
    cf.expanded = true;
  } else if (cf.expanded) {
    return collapse();
  } else cf.expanded = true;
  save();
  sync();
  changed();
  if (cf.expanded) input.focus();
};
// Enter (bzw. „Fertig“ auf der Handy-Tastatur): einklappen, Filter bleibt
input.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  e.preventDefault();
  input.blur();
  collapse();
});
let typing;
input.addEventListener('input', () => {
  cf.chords = input.value;
  prefs.set('chordFilterChords', cf.chords);
  sync();
  clearTimeout(typing);
  typing = setTimeout(() => changed(), 200);
});
$('#cf-capo').addEventListener('change', (e) => {
  cf.capo = e.target.checked;
  prefs.set('chordFilterCapo', cf.capo);
  changed();
});
// „Aus“ im Hinweis über der Liste: Griffe bleiben gespeichert – beim nächsten Aufklappen wieder da
$('#filter-clear').onclick = () => {
  cf.open = false;
  prefs.set('chordFilterOpen', false);
  sync();
  changed();
};

input.value = cf.chords;
$('#cf-capo').checked = cf.capo;
sync();
