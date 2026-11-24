// Noten als ABC-Notation im ChordPro-Text ({start_of_abc} … {end_of_abc}, Kurzform {soa}/{eoa}).
// Reine Textlogik ohne Bildschirm: fehlende Kopfzeilen ergänzen, Akkorde finden. Gezeichnet und
// abgespielt wird in render/abc-view.js (abcjs, nur bei Bedarf geladen).

/** Kopfzeile wie „K:G“ oder „M:3/4“ (ein Buchstabe, Doppelpunkt). „w:“/„W:“ sind Liedtext, keine Kopfzeilen. */
const HEADER = /^([A-Za-z]):/;
const isHeader = (line) => HEADER.test(line) && !/^[wW]:/.test(line);

/**
 * ChordPro-Tonart („F#m“, „Bb“, „C“) als ABC-Tonart. Unbekanntes ergibt „C“.
 * @param {string} [key]
 * @returns {string}
 */
export function abcKey(key) {
  const m = /^\s*([A-Ga-g])([#b♯♭]?)(m(?!aj)|min|moll)?/.exec(key || '');
  if (!m) return 'C';
  const acc = { '#': '#', '♯': '#', b: 'b', '♭': 'b' }[m[2]] || '';
  return `${m[1].toUpperCase()}${acc}${m[3] ? 'm' : ''}`;
}

/**
 * ABC-Text eines Abschnitts vollständig machen, damit er sich immer zeichnen lässt:
 * X: fehlt → „X:1“ an den Anfang; K: fehlt → Tonart aus {key} (sonst C) als letzte Kopfzeile;
 * M: (aus {time}) und L:1/8 nur, wenn K: ergänzt werden muss. Vorhandenes bleibt unverändert.
 * @param {string} text  Inhalt zwischen {start_of_abc} und {end_of_abc}
 * @param {{key?: string, time?: string}} [meta]  Liedinfo
 * @returns {string}
 */
export function completeAbc(text, meta = {}) {
  const lines = String(text).replace(/\r\n?/g, '\n').split('\n');
  while (lines.length && !lines[0].trim()) lines.shift();
  // Kopf: alle Kopfzeilen (und Kommentare %) vor der ersten Notenzeile
  let headEnd = 0;
  while (headEnd < lines.length && (isHeader(lines[headEnd]) || /^%/.test(lines[headEnd]))) headEnd++;
  const head = lines.slice(0, headEnd);
  const body = lines.slice(headEnd);
  const has = (letter) => head.some((l) => l.startsWith(`${letter}:`));
  if (!has('X')) head.unshift('X:1');
  if (!has('K')) {
    if (!has('M') && /^\d+\/\d+$/.test(String(meta.time || '').trim())) head.push(`M:${meta.time.trim()}`);
    if (!has('L')) head.push('L:1/8');
    head.push(`K:${abcKey(meta.key)}`);
  } else {
    // K: muss die letzte Kopfzeile sein – sonst gelten die folgenden nicht
    const k = head.findIndex((l) => l.startsWith('K:'));
    head.push(...head.splice(k, 1));
  }
  return [...head, ...body].join('\n');
}

/**
 * Akkorde über den Noten („G“, "Am7") in Reihenfolge des Auftretens. Anmerkungen ("^Text", "_Text",
 * "<…", ">…", "@…") zählen nicht; Kommentare (%) und Liedtextzeilen (w:) werden übersprungen.
 * @param {string} text
 * @returns {string[]}
 */
export function abcChords(text) {
  const out = [];
  for (const line of String(text).split(/\r?\n/)) {
    if (isHeader(line) || /^[wW]:/.test(line) || /^%/.test(line)) continue;
    for (const m of line.replace(/%.*/, '').matchAll(/"([^"]*)"/g)) {
      if (m[1] && !/^[\^_<>@]/.test(m[1])) out.push(m[1]);
    }
  }
  return out;
}

/** Tempo aus der Liedinfo ({tempo: 96} oder „♩ = 96“), sonst 100 Schläge pro Minute. */
export function abcTempo(meta = {}) {
  const n = Number(/\d+/.exec(String(meta.tempo || ''))?.[0]);
  return n >= 20 && n <= 400 ? n : 100;
}

/** Gerüst für den Baustein „Noten“ im Editor. */
export function abcSkeleton(meta = {}) {
  const time = /^\d+\/\d+$/.test(String(meta.time || '').trim()) ? meta.time.trim() : '4/4';
  return [
    '{start_of_abc: label="Melodie"}',
    'X:1',
    `M:${time}`,
    'L:1/8',
    `K:${abcKey(meta.key)}`,
    '"G"G2 AB c2 BA | "D"d4 z4 |',
    'w: Hier steht der Lied-text',
    '{end_of_abc}',
  ].join('\n');
}
