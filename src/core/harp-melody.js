// Melodie (ABC-Notation) → Mundharmonika-Tabs für eine diatonische 10-Kanal-Harp (Richter-Stimmung).
// Reine Funktionen, kein DOM: Töne und Silben aus dem ABC-Text lesen, jedem Ton einen Kanal geben
// (blasen/ziehen zuerst, dann Bending, dann Overblow), die passende Harp-Tonart vorschlagen und
// das Ergebnis als ChordPro-Zeilen mit Tabs über den Silben schreiben (Schreibweise wie in harp.js).

const LETTER = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const FIFTHS = { F: -1, C: 0, G: 1, D: 2, A: 3, E: 4, B: 5 };
const MODES = { maj: 0, ion: 0, min: -3, m: -3, aeo: -3, dor: -2, phr: -4, lyd: 1, mix: -1, loc: -5 };
const SHARP_ORDER = 'FCGDAEB';
const FLAT_ORDER = 'BEADGCF';

/** Harp-Tonarten in der üblichen Schreibweise, Index = Tonklasse (0 = C). */
export const HARP_KEYS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

/**
 * Vorzeichen einer ABC-Tonart („G“, „F#m“, „Bb“, „Ddor“, „Amix“).
 * @param {string} key  Wert hinter K:
 * @returns {{tonic: number, minor: boolean, acc: Record<string, number>}}  Tonklasse, Moll?, Vorzeichen je Buchstabe
 */
export function abcKeySignature(key) {
  const m = /^\s*([A-Ga-g])([#b]?)\s*([A-Za-z]*)/.exec(key || '');
  if (!m || /^(none|hp)$/i.test(String(key).trim())) return { tonic: 0, minor: false, acc: {} };
  const letter = m[1].toUpperCase();
  const accSign = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
  const modeName = m[3].toLowerCase();
  const mode = modeName === 'm' ? 'm' : modeName.slice(0, 3) || 'maj';
  const fifths = FIFTHS[letter] + 7 * accSign + (MODES[mode] ?? 0);
  const acc = {};
  if (fifths > 0) for (const l of SHARP_ORDER.slice(0, Math.min(7, fifths))) acc[l] = 1;
  if (fifths < 0) for (const l of FLAT_ORDER.slice(0, Math.min(7, -fifths))) acc[l] = -1;
  const tonic = (((LETTER[letter] + accSign) % 12) + 12) % 12;
  return { tonic, minor: ['m', 'min', 'aeo', 'dor', 'phr'].includes(mode), acc };
}

/**
 * Silben einer w:-Zeile. „-“ trennt Silben eines Wortes, „_“ hält die vorige Silbe über eine
 * weitere Note, „*“ lässt eine Note ohne Silbe, „~“ verbindet Wörter unter einer Note.
 * @returns {{text: string, joined: boolean, hold?: boolean}[]}  joined: Wort geht mit der nächsten Silbe weiter
 */
export function abcSyllables(line) {
  const out = [];
  let cur = '';
  const flush = (joined) => {
    if (cur) out.push({ text: cur.replace(/~/g, ' '), joined });
    cur = '';
  };
  const s = String(line).replace(/^w:\s*/, '');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '\\' && s[i + 1] === '-') {
      cur += '-';
      i++;
    } else if (c === '-') {
      if (cur) flush(true);
      else if (out.length) out.push({ text: '', joined: true }); // „--“: Note ohne neue Silbe
    } else if (c === ' ' || c === '\t' || c === '|') flush(false);
    else if (c === '_') {
      flush(false);
      out.push({ text: '', joined: false, hold: true });
    } else if (c === '*') {
      flush(false);
      out.push({ text: '', joined: false });
    } else cur += c;
  }
  flush(false);
  return out;
}

/**
 * Notenzeilen eines ABC-Textes mit Tonhöhen (MIDI) und der ersten Liedtextzeile darunter.
 * Pausen, Vorschlagsnoten, Akkordsymbole und Verzierungen zählen nicht; übergebundene Noten
 * (Bindebogen „-“) nur einmal; bei Akkorden aus Noten ([CEG]) zählt die erste.
 * @param {string} abc
 * @returns {{notes: number[], lyrics: string|null}[]}
 */
export function abcMelody(abc) {
  let sig = abcKeySignature('C');
  const lines = [];
  for (const raw of String(abc).replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.replace(/%.*$/, '');
    if (/^w:/.test(line)) {
      const last = lines.at(-1);
      if (last && last.lyrics === null) last.lyrics = line; // weitere Strophen (w: darunter) bleiben weg
      continue;
    }
    const field = /^([A-Za-z]):(.*)$/.exec(line);
    if (field) {
      if (field[1] === 'K') sig = abcKeySignature(field[2]);
      continue;
    }
    if (!line.trim()) continue;
    const parsed = parseMusicLine(line, sig);
    sig = parsed.sig;
    if (parsed.notes.length) lines.push({ notes: parsed.notes, lyrics: null });
  }
  return lines;
}

function parseMusicLine(line, startSig) {
  let sig = startSig;
  let barAcc = {}; // Vorzeichen innerhalb des Takts: „C4“ -> Halbtöne
  const notes = [];
  let tieNext = false;
  let i = 0;
  const readNote = () => {
    // Vorzeichen, Buchstabe, Oktavzeichen
    const m = /^(\^\^|\^|__|_|=)?([A-Ga-g])([',]*)/.exec(line.slice(i));
    if (!m) return null;
    i += m[0].length;
    const letter = m[2].toUpperCase();
    let octave = m[2] === letter ? 4 : 5;
    for (const c of m[3]) octave += c === "'" ? 1 : -1;
    const id = `${letter}${octave}`;
    if (m[1]) barAcc[id] = { '^^': 2, '^': 1, '=': 0, _: -1, __: -2 }[m[1]];
    const acc = id in barAcc ? barAcc[id] : sig.acc[letter] || 0;
    return 12 * (octave + 1) + LETTER[letter] + acc;
  };
  const skipLength = () => {
    const m = /^[\d/]*/.exec(line.slice(i));
    i += m[0].length;
  };
  const addNote = (midi) => {
    if (tieNext && notes.length && notes.at(-1) === midi) {
      // übergebunden: derselbe Ton klingt weiter
    } else notes.push(midi);
    tieNext = false;
  };
  while (i < line.length) {
    const c = line[i];
    if (c === '"') {
      i = line.indexOf('"', i + 1) + 1 || line.length;
    } else if (c === '!' || c === '+') {
      const end = line.indexOf(c, i + 1);
      i = end < 0 ? i + 1 : end + 1;
    } else if (c === '{') {
      i = line.indexOf('}', i + 1) + 1 || line.length;
    } else if (c === '[' && /^\[[A-Za-z]:/.test(line.slice(i))) {
      const end = line.indexOf(']', i);
      const inline = line.slice(i + 1, end < 0 ? line.length : end);
      if (inline[0] === 'K') sig = abcKeySignature(inline.slice(2));
      i = end < 0 ? line.length : end + 1;
    } else if (c === '[' && /^\[\d/.test(line.slice(i))) {
      i += 2; // Wiederholungsende [1 [2
    } else if (c === '[') {
      // Akkord aus Noten: erster Ton zählt
      i++;
      let first = null;
      while (i < line.length && line[i] !== ']') {
        const midi = readNote();
        if (midi === null) i++;
        else {
          if (first === null) first = midi;
          skipLength();
        }
      }
      i++;
      skipLength();
      if (first !== null) addNote(first);
    } else if (c === '|' || c === ':') {
      barAcc = {};
      i++;
      while (/[\d,]/.test(line[i] || '') && /[|:\]]/.test(line[i - 1])) i++; // |1  :|2
    } else if (/[zxZX]/.test(c)) {
      i++;
      skipLength();
      tieNext = false;
    } else if (c === '-') {
      tieNext = true;
      i++;
    } else {
      const midi = readNote();
      if (midi === null) i++;
      else {
        skipLength();
        // gebrochener Rhythmus (A>B) und Bindebogen direkt dahinter
        const keepTie = line[i] === '-';
        addNote(midi);
        if (keepTie) {
          tieNext = true;
          i++;
        }
      }
    }
  }
  return { notes, sig };
}

// ---------- Kanäle der Richter-Harp (C-Harp; andere Tonarten verschoben) ----------

/** C-Harp: Kanal-Schreibweise -> MIDI-Ton. Reihenfolge = Vorrang bei mehreren Möglichkeiten. */
const C_HARP = [
  // ohne Bending
  ['1', 60], ['-1', 62], ['2', 64], ['-2', 67], ['3', 67], ['-3', 71], ['4', 72], ['-4', 74], ['5', 76], ['-5', 77],
  ['6', 79], ['-6', 81], ['-7', 83], ['7', 84], ['-8', 86], ['8', 88], ['-9', 89], ['9', 91], ['-10', 93], ['10', 96],
  // Bendings (ziehen tief, blasen hoch)
  ["-1'", 61], ["-2''", 65], ["-2'", 66], ["-3'''", 68], ["-3''", 69], ["-3'", 70], ["-4'", 73], ["-6'", 80],
  ["8'", 87], ["9'", 90], ["10''", 94], ["10'", 95],
  // Overblows / Overdraws
  ['1o', 63], ['4o', 75], ['5o', 78], ['6o', 82], ['7o', 85], ['9o', 92], ['10o', 97],
].map(([tab, midi], order) => ({ tab, midi, kind: tab.includes("'") ? 'bend' : tab.includes('o') ? 'over' : 'plain', order }));

/** Halbtöne, um die eine Harp in dieser Tonart gegenüber der C-Harp verschoben ist (G–B tiefer, Db–F# höher). */
const harpOffset = (pc) => (pc >= 7 ? pc - 12 : pc);

/**
 * Kanal für einen Ton auf einer Harp in einer Tonart.
 * @param {number} midi  Tonhöhe
 * @param {number} harpKey  Tonklasse der Harp (0 = C-Harp)
 * @returns {{tab: string, kind: 'plain'|'bend'|'over'} | null}  null: gibt es auf dieser Harp nicht
 */
export function harpHoleFor(midi, harpKey) {
  const rel = midi - harpOffset(harpKey);
  const hit = C_HARP.find((h) => h.midi === rel);
  return hit ? { tab: hit.tab, kind: hit.kind } : null;
}

const COST = { plain: 0, bend: 3, over: 5 };

function convertNotes(lines, harpKey, shift) {
  let bends = 0;
  let overs = 0;
  let missing = 0;
  const holes = lines.map((l) => l.notes.map((n) => {
    const h = harpHoleFor(n + shift, harpKey);
    if (!h) missing++;
    else if (h.kind === 'bend') bends++;
    else if (h.kind === 'over') overs++;
    return h;
  }));
  return { holes, bends, overs, missing, score: missing * 100 + bends * COST.bend + overs * COST.over };
}

/**
 * Melodie für eine Harp-Tonart umwandeln; liegt sie zu hoch oder zu tief, wird sie um Oktaven
 * verschoben (shift in Halbtönen).
 * @param {string} abc
 * @param {number} harpKey  Tonklasse der Harp
 * @param {number} [transpose]  Halbtöne, um die das Lied gerade transponiert angezeigt wird
 */
export function melodyForHarp(abc, harpKey, transpose = 0) {
  const lines = abcMelody(abc);
  let best = null;
  for (const octave of [0, 12, -12, 24, -24]) {
    const r = convertNotes(lines, harpKey, transpose + octave);
    if (!best || r.score < best.score) best = { ...r, octave };
  }
  const count = lines.reduce((n, l) => n + l.notes.length, 0);
  return { lines, ...best, count };
}

/**
 * Harp-Tonarten nach Eignung: wenige fehlende Töne, wenige Bendings. Bei Gleichstand gewinnt die
 * 1. Lage (Harp in der Tonart des Liedes), bei Moll die 3. Lage (Harp einen Ganzton tiefer).
 * @returns {{key: number, name: string, missing: number, bends: number, overs: number, octave: number}[]}
 */
export function rankHarpKeys(abc, transpose = 0) {
  const kLine = /^K:(.*)$/m.exec(String(abc));
  const sig = abcKeySignature(kLine ? kLine[1] : 'C');
  const home = (sig.tonic + transpose + (sig.minor ? 10 : 0) + 120) % 12;
  return HARP_KEYS.map((name, key) => {
    const r = melodyForHarp(abc, key, transpose);
    return { key, name, missing: r.missing, bends: r.bends, overs: r.overs, octave: r.octave, score: r.score + (key === home ? 0 : 0.5) };
  }).sort((a, b) => a.score - b.score);
}

/**
 * Melodie als ChordPro-Zeilen: Tabs über den Silben der w:-Zeile, ohne Liedtext eine reine Tab-Zeile
 * je Notenzeile. Töne, die es auf der Harp nicht gibt, stehen als Anmerkung [*?].
 * @param {string} abc
 * @param {number} harpKey
 * @param {number} [transpose]
 * @returns {{text: string, missing: number, bends: number, overs: number, octave: number, count: number}}
 */
export function harpTabsFromAbc(abc, harpKey, transpose = 0) {
  const r = melodyForHarp(abc, harpKey, transpose);
  const tab = (h) => (h ? `[${h.tab}]` : '[*?]');
  const out = r.lines.map((line, li) => {
    const holes = r.holes[li];
    if (!line.lyrics) return holes.map(tab).join(' ');
    const syl = abcSyllables(line.lyrics);
    let text = '';
    holes.forEach((h, i) => {
      const s = syl[i];
      text += tab(h);
      if (!s || s.hold) return;
      text += s.text + (s.joined ? '' : ' ');
    });
    // übrige Silben (mehr Text als Noten) hinten anhängen
    for (const s of syl.slice(holes.length)) if (!s.hold) text += s.text + (s.joined ? '' : ' ');
    return text.replace(/\s+$/, '');
  });
  return { text: out.join('\n'), missing: r.missing, bends: r.bends, overs: r.overs, octave: r.octave, count: r.count };
}
