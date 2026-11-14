// Gitarrengriffe (Standardstimmung EADGBE) für Griffbilder und die Capo-Hilfe.
//
// Ein Griff: frets = 6 Werte von tiefer E- bis hoher e-Saite; -1 = nicht anschlagen, 0 = leer.
// Bekannte offene Griffe stehen in OPEN; alles andere wird aus den verschiebbaren
// Barré-Formen (E-Form: Grundton auf der 6. Saite, A-Form: auf der 5. Saite) berechnet.

import { parseChord, noteIndex } from './chords.js';

// In den Tabellen: X = nicht anschlagen; negative Zahlen = Bünde unter dem Grundton-Bund.
// Im Ergebnis steht für "nicht anschlagen" -1.
const X = 'x';
const MUTED = -1;

/** Akkordtyp vereinheitlichen; null = (noch) kein Griff bekannt. */
export function chordType(quality) {
  const q = String(quality || '').replace(/[()]/g, '');
  const map = {
    '': 'maj', M: 'maj', maj: 'maj',
    m: 'm', mi: 'm', min: 'm', '-': 'm',
    7: '7', dom7: '7',
    maj7: 'maj7', M7: 'maj7', 'Δ': 'maj7', 'Δ7': 'maj7', j7: 'maj7',
    m7: 'm7', mi7: 'm7', min7: 'm7', '-7': 'm7',
    sus4: 'sus4', sus: 'sus4',
    sus2: 'sus2',
    '7sus4': '7sus4', '7sus': '7sus4',
    dim: 'dim', '°': 'dim', o: 'dim',
    dim7: 'dim7', '°7': 'dim7', o7: 'dim7',
    m7b5: 'm7b5', 'ø': 'm7b5', 'ø7': 'm7b5', 'm7-5': 'm7b5',
    aug: 'aug', '+': 'aug',
    6: '6', m6: 'm6',
    9: '9', add9: 'add9', add2: 'add9',
    5: '5',
  };
  return map[q] ?? null;
}

// Offene Griffe, die nicht aus den Barré-Formen mit Bund 0 entstehen
const OPEN = {
  C: { maj: [X, 3, 2, 0, 1, 0], 7: [X, 3, 2, 3, 1, 0], maj7: [X, 3, 2, 0, 0, 0], add9: [X, 3, 2, 0, 3, 0], 6: [X, 3, 2, 2, 1, 0], sus2: [X, 3, 0, 0, 1, 3], sus4: [X, 3, 3, 0, 1, 1] },
  D: { maj: [X, X, 0, 2, 3, 2], m: [X, X, 0, 2, 3, 1], 7: [X, X, 0, 2, 1, 2], m7: [X, X, 0, 2, 1, 1], maj7: [X, X, 0, 2, 2, 2], sus4: [X, X, 0, 2, 3, 3], sus2: [X, X, 0, 2, 3, 0], 6: [X, X, 0, 2, 0, 2], '7sus4': [X, X, 0, 2, 1, 3] },
  G: { maj: [3, 2, 0, 0, 0, 3], 7: [3, 2, 0, 0, 0, 1], maj7: [3, 2, 0, 0, 0, 2], 6: [3, 2, 0, 0, 0, 0], sus4: [3, X, 0, 0, 1, 3], add9: [3, X, 0, 2, 0, 3] },
  F: { maj7: [X, X, 3, 2, 1, 0] },
  B: { 7: [X, 2, 1, 2, 0, 2] },
  E: { add9: [0, 2, 2, 1, 0, 2] },
  A: { add9: [X, 0, 2, 4, 2, 0], 6: [X, 0, 2, 2, 2, 2] },
};

// Verschiebbare Formen relativ zum Grundton-Bund r (null = gibt es in dieser Form nicht)
const E_SHAPE = {
  maj: [0, 2, 2, 1, 0, 0], m: [0, 2, 2, 0, 0, 0], 7: [0, 2, 0, 1, 0, 0], m7: [0, 2, 0, 0, 0, 0],
  maj7: [0, X, 1, 1, 0, X], sus4: [0, 2, 2, 2, 0, 0], '7sus4': [0, 2, 0, 2, 0, 0], 5: [0, 2, 2, X, X, X],
  m6: [0, X, -1, 0, 0, X], 9: null, add9: null, sus2: null, dim: null, dim7: [0, X, -1, 0, -1, X], m7b5: [0, X, 0, 0, -1, X], aug: null, 6: [0, X, -1, 1, 0, X],
};
const A_SHAPE = {
  maj: [X, 0, 2, 2, 2, 0], m: [X, 0, 2, 2, 1, 0], 7: [X, 0, 2, 0, 2, 0], m7: [X, 0, 2, 0, 1, 0],
  maj7: [X, 0, 2, 1, 2, 0], sus4: [X, 0, 2, 2, 3, 0], sus2: [X, 0, 2, 2, 0, 0], '7sus4': [X, 0, 2, 0, 3, 0],
  dim: [X, 0, 1, 2, 1, X], dim7: [X, 0, 1, -1, 1, X], m7b5: [X, 0, 1, 0, 1, X], aug: [X, 0, 3, 2, 2, X],
  6: [X, 0, 2, 2, 2, 2], m6: [X, 0, 2, -1, 1, 0], 9: [X, 0, -1, 0, 0, 0], add9: [X, 0, 2, 4, 2, 0], 5: [X, 0, 2, 2, X, X],
};

const E_ROOT = 4; // E
const A_ROOT = 9; // A

function place(shape, r) {
  if (!shape) return null;
  // relative Werte können negativ sein (Bund unter dem Grundton) – darf nicht unter 0 fallen
  if (shape.some((f) => f !== X && f + r < 0)) return null;
  return shape.map((f) => (f === X ? MUTED : f + r));
}

/** Spannweite eines Griffs in Bünden (gegriffene Saiten). */
function span(frets) {
  const fretted = frets.filter((f) => f > 0);
  return fretted.length ? Math.max(...fretted) - Math.min(...fretted) : 0;
}

/**
 * Griff zu einem Akkordnamen (Bass bei Slash-Akkorden wird ignoriert).
 * @returns {{frets: number[], open: boolean} | null}
 */
export function chordShape(name) {
  const c = parseChord(String(name || '').trim());
  if (!c) return null;
  const type = chordType(c.quality);
  const root = noteIndex(c.root);
  if (type === null || root === undefined) return null;

  // offener Griff aus der Liste (über alle Schreibweisen des Grundtons)
  for (const [n, shapes] of Object.entries(OPEN)) {
    if (noteIndex(n) === root && shapes[type]) return { frets: shapes[type].map((f) => (f === X ? MUTED : f)), open: true };
  }
  const candidates = [];
  const rE = (root - E_ROOT + 12) % 12;
  const rA = (root - A_ROOT + 12) % 12;
  for (const [shape, r] of [[E_SHAPE[type], rE], [A_SHAPE[type], rA], [E_SHAPE[type], rE + 12], [A_SHAPE[type], rA + 12]]) {
    const frets = place(shape, r);
    if (frets && Math.max(...frets) <= 15) candidates.push({ frets, r });
  }
  if (!candidates.length) return null;
  candidates.sort((a, b) => a.r - b.r || span(a.frets) - span(b.frets));
  const best = candidates[0].frets;
  return { frets: best, open: best.every((f) => f <= 3) && best.includes(0) };
}

// Griffe, die Anfänger ohne Barré greifen können
const EASY = new Set([
  'C', 'D', 'E', 'G', 'A', 'Am', 'Dm', 'Em',
  'C7', 'D7', 'E7', 'G7', 'A7', 'B7', 'Am7', 'Dm7', 'Em7',
  'Cmaj7', 'Dmaj7', 'Emaj7', 'Fmaj7', 'Gmaj7', 'Amaj7',
  'Dsus4', 'Dsus2', 'Asus4', 'Asus2', 'Esus4', 'Cadd9', 'G6', 'D6', 'A6',
]);

/** Ist der Griff ohne Barré zu spielen? (Slash-Bass zählt nicht) */
export function isEasyChord(name) {
  const c = parseChord(String(name || '').trim());
  if (!c) return false;
  const type = chordType(c.quality);
  if (type === null) return false;
  const suffix = { maj: '', m: 'm' }[type] ?? type;
  const roots = ['C', 'D', 'E', 'F', 'G', 'A', 'B'].filter((n) => noteIndex(n) === noteIndex(c.root));
  return roots.some((r) => EASY.has(r + suffix));
}
