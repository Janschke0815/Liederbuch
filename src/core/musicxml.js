// MusicXML → ABC: Noten aus MuseScore, Sibelius, Finale, Notenscan-Apps oder Downloads (musescore.com,
// IMSLP …) als Notenabschnitt ins Lied holen. Gedacht für Liederbuch-Melodien: eine Stimme (die erste
// Stimme der gewählten Spur), Akkordsymbole, Liedtext der ersten Strophe, Wiederholungen und Klammern.
// Mehrstimmiges (weitere Stimmen, Akkorde aus Noten) fällt weg – es bleibt die Melodie.
// Komprimiertes MusicXML (.mxl) ist eine ZIP-Datei: readMxl packt es im Browser aus.

const STEPS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const SHARP_ORDER = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
const MAJOR = ['Cb', 'Gb', 'Db', 'Ab', 'Eb', 'Bb', 'F', 'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#'];
const MINOR = ['Abm', 'Ebm', 'Bbm', 'Fm', 'Cm', 'Gm', 'Dm', 'Am', 'Em', 'Bm', 'F#m', 'C#m', 'G#m', 'D#m', 'A#m'];

const KINDS = {
  major: '', minor: 'm', augmented: 'aug', diminished: 'dim', dominant: '7', 'major-seventh': 'maj7',
  'minor-seventh': 'm7', 'diminished-seventh': 'dim7', 'augmented-seventh': 'aug7', 'half-diminished': 'm7b5',
  'major-minor': 'm(maj7)', 'major-sixth': '6', 'minor-sixth': 'm6', 'dominant-ninth': '9', 'major-ninth': 'maj9',
  'minor-ninth': 'm9', 'dominant-11th': '11', 'major-11th': 'maj11', 'minor-11th': 'm11', 'dominant-13th': '13',
  'major-13th': 'maj13', 'minor-13th': 'm13', 'suspended-second': 'sus2', 'suspended-fourth': 'sus4', power: '5',
};

const child = (node, name) => node?.getElementsByTagName(name)[0] || null;
const text = (node, name) => child(node, name)?.textContent.trim() ?? '';
const num = (node, name, fallback = 0) => {
  const v = Number(text(node, name));
  return text(node, name) !== '' && Number.isFinite(v) ? v : fallback;
};
const kids = (node, name) => [...node.children].filter((c) => !name || c.localName === name);

/**
 * Tonart aus den Vorzeichen (fifths: -7…7) und dem Tongeschlecht als ABC-Tonart („G“, „Em“, „Bb“).
 * @param {number} fifths
 * @param {string} [mode]  'minor' für Moll
 * @returns {string}
 */
export function keyFromFifths(fifths, mode = 'major') {
  const i = Math.max(-7, Math.min(7, Math.round(fifths))) + 7;
  return (mode === 'minor' ? MINOR : MAJOR)[i];
}

/** Vorzeichen je Stammton bei fifths Kreuzen/Bes: { F: 1, C: 1 } */
function signature(fifths) {
  const acc = {};
  for (let i = 0; i < Math.abs(fifths); i++) {
    const step = fifths > 0 ? SHARP_ORDER[i] : SHARP_ORDER[6 - i];
    acc[step] = Math.sign(fifths);
  }
  return acc;
}

/** Bruch kürzen */
function frac(n, d) {
  const g = (a, b) => (b ? g(b, a % b) : a);
  const k = g(Math.abs(n), Math.abs(d)) || 1;
  return [n / k, d / k];
}

/** ABC-Längenangabe relativ zu L:1/8 für eine Dauer in Ganzen (z. B. 1/4 → „2“). */
function lengthCode(n, d) {
  const [a, b] = frac(n * 8, d);
  if (a === b) return '';
  if (b === 1) return String(a);
  if (a === 1) return b === 2 ? '/' : `/${b}`;
  return `${a}/${b}`;
}

/** Akkordsymbol aus <harmony> („F#m7/C#“) oder '' */
function harmonyName(h) {
  const root = child(h, 'root');
  if (!root) return '';
  const alter = num(root, 'root-alter');
  const kindEl = child(h, 'kind');
  const kind = kindEl?.textContent.trim() || 'major';
  let name = `${text(root, 'root-step')}${alter > 0 ? '#' : alter < 0 ? 'b' : ''}`;
  name += kind in KINDS ? KINDS[kind] : (kindEl?.getAttribute('text') || '');
  const bass = child(h, 'bass');
  if (bass) {
    const ba = num(bass, 'bass-alter');
    name += `/${text(bass, 'bass-step')}${ba > 0 ? '#' : ba < 0 ? 'b' : ''}`;
  }
  return name.replace(/"/g, '');
}

/** Ton als ABC (ohne Vorzeichen): Oktave 4 = C…B, 5 = c…b, darüber ', darunter , */
function pitchCode(step, octave) {
  if (octave >= 5) return step.toLowerCase() + "'".repeat(octave - 5);
  return step + ','.repeat(Math.max(0, 4 - octave));
}

/** Silbe für w: (Leerzeichen und ABC-Sonderzeichen in der Silbe geschützt) */
const syllable = (s) => s.replace(/\s+/g, '~').replace(/([-_*|])/g, '\\$1');

/**
 * Welche Spur (part) die Melodie trägt: die erste mit Liedtext, sonst die erste mit Noten.
 * @returns {{id: string, name: string, notes: number, lyrics: boolean}[]}  alle Spuren, beste zuerst markiert
 */
function partsOf(doc) {
  const names = Object.fromEntries([...doc.getElementsByTagName('score-part')].map((p) => [p.getAttribute('id'), text(p, 'part-name')]));
  return [...doc.getElementsByTagName('part')].map((p) => ({
    el: p,
    id: p.getAttribute('id'),
    name: names[p.getAttribute('id')] || '',
    notes: [...p.getElementsByTagName('pitch')].length,
    lyrics: p.getElementsByTagName('lyric').length > 0,
  }));
}

/**
 * MusicXML-Text (score-partwise) in ABC umwandeln – eine Melodiestimme mit Akkorden und Liedtext.
 * @param {string} xml
 * @param {{part?: number}} [opts]  part: Nummer der Spur (sonst automatisch: die mit Liedtext)
 * @returns {{abc: string, title: string, composer: string, key: string, time: string, tempo: number|null,
 *            parts: string[], part: number, measures: number}}
 *   abc: Kopf (M:, L:, Q:, K:) und Notenzeilen mit w:-Zeilen; key/time: für die Liedinfo
 * @throws {Error} wenn es kein lesbares MusicXML ist
 */
export function musicXmlToAbc(xml, { part } = {}) {
  const doc = new DOMParser().parseFromString(String(xml).replace(/^﻿/, ''), 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) throw new Error('Die Datei ist kein lesbares MusicXML');
  if (doc.documentElement.localName === 'score-timewise') {
    throw new Error('MusicXML „timewise“ wird nicht unterstützt – bitte als normales MusicXML speichern');
  }
  if (doc.documentElement.localName !== 'score-partwise') throw new Error('Die Datei ist kein MusicXML');
  const parts = partsOf(doc);
  if (!parts.length) throw new Error('Keine Noten in der Datei');
  const withLyrics = parts.findIndex((p) => p.lyrics && p.notes);
  const withNotes = parts.findIndex((p) => p.notes);
  const pi = part !== undefined && parts[part] ? part : withLyrics >= 0 ? withLyrics : Math.max(0, withNotes);
  const title = text(doc.documentElement, 'work-title') || text(doc.documentElement, 'movement-title');
  const composer = [...doc.getElementsByTagName('creator')].find((c) => c.getAttribute('type') === 'composer')?.textContent.trim() || '';

  let divisions = 1;
  let fifths = 0;
  let keyName = 'C';
  let time = '';
  let tempo = null;
  let sig = {};
  const lines = []; // { music: string, words: string[] }
  let music = '';
  let words = [];
  let hasWords = false;
  let measuresInLine = 0;
  let pendingChord = '';
  let measureCount = 0;
  const header = { key: null, time: null };

  const flushLine = () => {
    if (!music.trim()) return;
    lines.push({ music: music.trim(), words: hasWords ? words : [] });
    music = '';
    words = [];
    hasWords = false;
    measuresInLine = 0;
  };

  for (const measure of kids(parts[pi].el, 'measure')) {
    measureCount++;
    if (kids(measure, 'print').some((p) => p.getAttribute('new-system') === 'yes' || p.getAttribute('new-page') === 'yes')) flushLine();
    const bar = {}; // Versetzungszeichen in diesem Takt: 'C5' → alter
    let voice = null; // Stimme der Melodie: die der ersten Note im Takt
    let tuplet = 0; // verbleibende Noten der laufenden Triole o. ä.
    let endBar = '|';
    for (const el of measure.children) {
      const tag = el.localName;
      if (tag === 'attributes') {
        divisions = num(el, 'divisions', divisions) || divisions;
        const key = child(el, 'key');
        if (key && child(key, 'fifths')) {
          fifths = num(key, 'fifths');
          keyName = keyFromFifths(fifths, text(key, 'mode'));
          sig = signature(fifths);
          if (header.key === null) header.key = keyName;
          else music += `[K:${keyName}] `;
        }
        const t = child(el, 'time');
        if (t && child(t, 'beats')) {
          const ts = `${text(t, 'beats')}/${text(t, 'beat-type')}`;
          if (header.time === null) header.time = ts;
          else if (ts !== time) music += `[M:${ts}] `;
          time = ts;
        }
      } else if (tag === 'direction' || tag === 'sound') {
        const s = tag === 'sound' ? el : child(el, 'sound');
        const q = Number(s?.getAttribute('tempo'));
        if (q > 0 && tempo === null) tempo = Math.round(q);
      } else if (tag === 'harmony') {
        if (!child(el, 'staff') || text(el, 'staff') === '1') pendingChord = harmonyName(el) || pendingChord;
      } else if (tag === 'barline') {
        const loc = el.getAttribute('location') || 'right';
        const rep = child(el, 'repeat')?.getAttribute('direction');
        const ending = child(el, 'ending');
        const style = text(el, 'bar-style');
        if (loc === 'left') {
          if (rep === 'forward') music += '|: ';
          if (ending && /start/.test(ending.getAttribute('type'))) music += `[${(ending.getAttribute('number') || '1').split(/[,\s]+/)[0]} `;
        } else {
          if (rep === 'backward') endBar = ':|';
          else if (style === 'light-heavy') endBar = '|]';
          else if (style === 'light-light') endBar = '||';
        }
      } else if (tag === 'note') {
        if (child(el, 'grace') || child(el, 'cue')) continue;
        const v = text(el, 'voice') || '1';
        voice ??= v;
        if (v !== voice) continue;
        if (child(el, 'staff') && text(el, 'staff') !== '1') continue;
        if (child(el, 'chord')) continue; // weitere Töne eines Notenakkords: nur der erste zählt
        const dur = num(el, 'duration');
        // Dauer in Ganzen; bei Triolen die geschriebene (nicht die gespielte) Länge
        const tm = child(el, 'time-modification');
        const actual = tm ? num(tm, 'actual-notes', 1) : 1;
        const normal = tm ? num(tm, 'normal-notes', 1) : 1;
        if (tm && tuplet <= 0) {
          music += `(${actual}`;
          tuplet = actual;
        }
        const len = lengthCode(dur * actual, divisions * 4 * normal);
        if (tuplet > 0) tuplet--;
        const chord = pendingChord ? `"${pendingChord}"` : '';
        pendingChord = '';
        const rest = child(el, 'rest');
        const ties = [...el.getElementsByTagName('tie')].map((t) => t.getAttribute('type'));
        const tiedOn = ties.includes('stop');
        if (rest) {
          music += `${chord}z${len} `;
          continue;
        }
        const pitch = child(el, 'pitch');
        if (!pitch) continue; // Schlagzeug o. ä.
        const step = text(pitch, 'step');
        const octave = num(pitch, 'octave', 4);
        const alter = Math.round(num(pitch, 'alter'));
        const where = `${step}${octave}`;
        const current = where in bar ? bar[where] : (sig[step] || 0);
        let acc = '';
        if (alter !== current) {
          acc = { '-2': '__', '-1': '_', 0: '=', 1: '^', 2: '^^' }[alter] ?? '';
          bar[where] = alter;
        }
        // Balken: innerhalb eines Balkens ohne Leerzeichen (sonst zeichnet ABC einzelne Fähnchen)
        const beam = [...el.getElementsByTagName('beam')].find((b) => (b.getAttribute('number') || '1') === '1')?.textContent.trim();
        const gap = beam === 'begin' || beam === 'continue' ? '' : ' ';
        music += `${chord}${acc}${pitchCode(step, octave)}${len}${ties.includes('start') ? '-' : ''}${gap}`;
        // Liedtext: erste Strophe; gebundene Folgenoten bekommen keine Silbe
        if (tiedOn) continue;
        const lyric = [...el.getElementsByTagName('lyric')].find((l) => (l.getAttribute('number') || '1') === '1')
          || el.getElementsByTagName('lyric')[0];
        const t = lyric ? [...lyric.getElementsByTagName('text')].map((x) => x.textContent).join('') : '';
        if (lyric && t.trim()) {
          const syl = text(lyric, 'syllabic');
          words.push(syllable(t.trim()) + (syl === 'begin' || syl === 'middle' ? '-' : ''));
          hasWords = true;
        } else if (lyric && child(lyric, 'extend')) {
          words.push('_');
        } else {
          words.push('*');
        }
      }
    }
    music = `${music.trimEnd()} ${endBar} `;
    if (++measuresInLine >= 4 && !hasPrintBreaks(parts[pi].el)) flushLine();
  }
  flushLine();

  const head = [];
  if (header.time) head.push(`M:${header.time}`);
  head.push('L:1/8');
  if (tempo) head.push(`Q:1/4=${tempo}`);
  head.push(`K:${header.key || keyName}`);
  const body = lines.flatMap((l) => [l.music.replace(/\s+\|/g, ' |').replace(/\s{2,}/g, ' '),
    ...(l.words.length ? [`w: ${l.words.join(' ').replace(/- /g, '-')}`] : [])]);
  return {
    abc: [...head, ...body].join('\n'),
    title,
    composer,
    key: header.key || keyName,
    time: header.time || '',
    tempo,
    parts: parts.map((p, i) => p.name || `Spur ${i + 1}`),
    part: pi,
    measures: measureCount,
  };
}

/** Setzt die Datei selbst Zeilenumbrüche (print new-system)? Dann gelten nur diese. */
const breakCache = new WeakMap();
function hasPrintBreaks(partEl) {
  if (!breakCache.has(partEl)) {
    breakCache.set(partEl, [...partEl.getElementsByTagName('print')].some((p) => p.getAttribute('new-system') === 'yes'));
  }
  return breakCache.get(partEl);
}

/**
 * Komprimiertes MusicXML (.mxl, eine ZIP-Datei) auspacken: liefert den Text der Partitur.
 * @param {ArrayBuffer} buffer
 * @returns {Promise<string>}
 */
export async function readMxl(buffer) {
  const entries = zipEntries(buffer);
  const read = async (name) => {
    const e = entries.find((x) => x.name === name);
    return e ? new TextDecoder().decode(await unzipEntry(buffer, e)) : null;
  };
  const container = await read('META-INF/container.xml');
  const root = container ? /full-path="([^"]+)"/.exec(container)?.[1] : null;
  const name = root || entries.find((e) => !e.name.startsWith('META-INF/') && /\.(xml|musicxml)$/i.test(e.name))?.name;
  const xml = name ? await read(name) : null;
  if (!xml) throw new Error('In der .mxl-Datei steckt keine Partitur');
  return xml;
}

/** Inhaltsverzeichnis einer ZIP-Datei (zentrales Verzeichnis am Ende). */
function zipEntries(buffer) {
  const v = new DataView(buffer);
  let eocd = -1;
  for (let i = buffer.byteLength - 22; i >= Math.max(0, buffer.byteLength - 65557); i--) {
    if (v.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('Die .mxl-Datei ist beschädigt (kein ZIP)');
  const count = v.getUint16(eocd + 10, true);
  let p = v.getUint32(eocd + 16, true);
  const out = [];
  for (let n = 0; n < count; n++) {
    if (v.getUint32(p, true) !== 0x02014b50) break;
    const method = v.getUint16(p + 10, true);
    const size = v.getUint32(p + 20, true);
    const nameLen = v.getUint16(p + 28, true);
    const extraLen = v.getUint16(p + 30, true);
    const commentLen = v.getUint16(p + 32, true);
    const offset = v.getUint32(p + 42, true);
    const name = new TextDecoder().decode(new Uint8Array(buffer, p + 46, nameLen));
    out.push({ name, method, size, offset });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

/** Eine Datei aus der ZIP-Datei auspacken (gespeichert oder „deflate“). */
async function unzipEntry(buffer, { method, size, offset }) {
  const v = new DataView(buffer);
  const start = offset + 30 + v.getUint16(offset + 26, true) + v.getUint16(offset + 28, true);
  const data = new Uint8Array(buffer, start, size);
  if (method === 0) return data;
  if (method !== 8) throw new Error('Die .mxl-Datei ist auf unbekannte Art gepackt');
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
