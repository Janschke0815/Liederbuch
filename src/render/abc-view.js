// Notenabschnitte zeichnen und abspielen (abcjs). renderSong legt nur Platzhalter an
// (<div class="abc-score" data-abc=…>); renderScores füllt sie. abcjs wird erst geladen, wenn ein
// Lied wirklich Noten hat – sonst kostet es keine Ladezeit.
//
// Jede Notenzeile ist ein eigenes Bild (oneSvgPerLine, Klasse „atomic“): So bricht der Druck
// (print/paginate.js) zwischen zwei Notenzeilen um, nie mitten durch eine.

let abcjsModule = null;
/** abcjs laden (einmal, danach aus dem Speicher). */
const loadAbcjs = async () => (abcjsModule ||= (await import('abcjs')).default);

/** Klavier-Samples liegen in der App (public/soundfont, siehe LIESMICH.md) – kein fremder Server. */
const SOUNDFONT = new URL('soundfont/', new URL(import.meta.env?.BASE_URL || './', location.href)).href;

/** Zeichenbreite: breiter als der Platz, dann verkleinert – so passen die Noten zur Textgröße. */
const SCALE = 0.66;

/** Gerade spielende Melodie: { stop() } */
let playing = null;

/** Laufende Melodie anhalten (Liedwechsel, Spielmodus verlassen). */
export function stopAbc() {
  playing?.stop();
  playing = null;
}

/** Fehlermeldung von abcjs als schlichter Text (sie kommt mit HTML-Markierungen). */
const plain = (html) => String(html).replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();

/** Schrift für abcjs aus dem CSS (Liedtext- bzw. Akkordschrift der Einstellungen). */
function fontOf(family, sizePx, bold = false) {
  const first = String(family).split(',')[0].trim().replace(/^["']|["']$/g, '') || 'sans-serif';
  return `"${first}" ${Math.round(sizePx)}${bold ? ' bold' : ''}`;
}

/** CSS-Größe („10.5pt“, „14px“, „1.1em“) in Pixel. */
function cssPx(value, fallback) {
  const m = /^\s*([\d.]+)\s*(pt|px|em|rem)?\s*$/.exec(value || '');
  if (!m) return fallback;
  const n = Number(m[1]);
  return { pt: (n * 4) / 3, em: n * 16, rem: n * 16 }[m[2]] ?? n;
}

// Zuletzt gezeichnete Noten: beim Tippen im Editor wird die Vorschau neu aufgebaut – unveränderte
// Notenabschnitte übernehmen ihr fertiges Bild, statt kurz leer zu sein und neu gezeichnet zu werden.
const recent = new Map(); // Schlüssel -> { nodes, tune }
/** Einstellungen aus Einstellungen → Noten (settings.js setzt sie auf das .songbook-Element). */
function viewOptions(score) {
  const book = score.closest('.songbook');
  return {
    size: parseFloat(getComputedStyle(score).getPropertyValue('--abc-size')) || 1,
    lyrics: book?.dataset.abcLyrics !== 'hide',
  };
}
const keyOf = (score, width, o) => `${width}|${o.size}|${o.lyrics}|${score.dataset.transpose}|${score.dataset.chords}|${getComputedStyle(score).font}|${score.dataset.abc}`;

function draw(abcjs, score) {
  const width = Math.max(200, Math.round(score.clientWidth || 600));
  score.dataset.width = String(width);
  const opts = viewOptions(score);
  const key = keyOf(score, width, opts);
  const hit = recent.get(key);
  if (hit && !hit.nodes.some((n) => n.isConnected)) {
    score.replaceChildren(...hit.nodes);
    score.tune = hit.tune;
    return;
  }
  const scale = SCALE * opts.size;
  const virtual = Math.round(width / scale);
  const cs = getComputedStyle(score);
  const textPx = parseFloat(cs.fontSize) || 16;
  const chordPx = cssPx(cs.getPropertyValue('--chord-size'), textPx * 0.9);
  // abcjs misst beim Zeichnen (eine Grafik je Notenzeile) – das geht nur im Dokument. Darum
  // unsichtbar außerhalb des Bildschirms zeichnen und die fertigen Zeilen dann umhängen.
  const holder = document.createElement('div');
  holder.className = 'abc-svg';
  holder.style.cssText = `position:absolute;left:-10000px;top:0;width:${width}px;visibility:hidden`;
  document.body.append(holder);
  let tune;
  try {
    // Liedtext aus: w:-Zeilen weglassen (statt nur verstecken – sonst bliebe der Platz frei)
    const text = opts.lyrics ? score.dataset.abc : score.dataset.abc.replace(/^w:.*$/gm, '%');
    [tune] = abcjs.renderAbc(holder, text, {
      responsive: 'resize',
      oneSvgPerLine: true,
      add_classes: true,
      visualTranspose: Number(score.dataset.transpose) || 0,
      foregroundColor: 'currentColor',
      staffwidth: virtual - 10,
      wrap: { minSpacing: 1.4, maxSpacing: 2.4, preferredMeasuresPerLine: Math.max(2, Math.min(4, Math.floor(virtual / 220))) },
      paddingleft: 0, paddingright: 0, paddingtop: 0, paddingbottom: 4,
      format: {
        stretchlast: 0.5, // letzte Zeile mitdehnen, wenn sie mindestens halb voll ist – sonst stehen die Silben gedrängt
        // in Zeichen-Pixeln (werden mit SCALE verkleinert) – am Ende so groß wie Liedtext und Akkorde
        vocalfont: fontOf(cs.fontFamily, (textPx * 0.8) / scale),
        gchordfont: fontOf(cs.getPropertyValue('--chord-font'), chordPx / scale, true),
        annotationfont: fontOf(cs.fontFamily, (textPx * 0.85) / scale),
      },
    });
  } finally {
    holder.remove();
  }
  // Akkorde über den Noten wie im Liedtext benennen (gleiche Transposition, ♯/♭)
  const names = JSON.parse(score.dataset.chords || '[]');
  const chordEls = holder.querySelectorAll('.abcjs-chord');
  if (chordEls.length === names.length) chordEls.forEach((c, i) => { c.textContent = names[i]; });
  // jede Notenzeile ein unteilbarer Baustein für den Seitenumbruch
  for (const line of holder.children) line.classList.add('abc-line', 'atomic');
  const nodes = [...holder.children];
  const warnings = tune?.warnings || [];
  if (warnings.length) {
    // nicht alles verstanden: Noten trotzdem zeigen, Hinweis unauffällig darunter
    const warn = document.createElement('p');
    warn.className = 'abc-warn';
    warn.textContent = `⚠ ${warnings.length === 1 ? 'Eine Stelle' : `${warnings.length} Stellen`} im Notentext nicht verstanden`;
    warn.title = warnings.map(plain).join('\n');
    nodes.push(warn);
  }
  score.replaceChildren(...nodes);
  score.tune = tune;
  recent.set(key, { nodes, tune });
  if (recent.size > 12) recent.delete(recent.keys().next().value);
}

/**
 * Alle Notenabschnitte in root zeichnen.
 * @param {ParentNode} root
 * @param {{follow?: boolean}} [opts]  follow: bei geänderter Breite neu umbrechen (Vorschau,
 *   Spielmodus) – im Druck nicht nötig
 * @returns {Promise<void>}  erfüllt, sobald alles gezeichnet ist (wichtig für den Druck)
 */
export async function renderScores(root, { follow = true } = {}) {
  const scores = [...root.querySelectorAll('.abc-score')];
  if (!scores.length) return;
  let abcjs;
  try {
    abcjs = await loadAbcjs();
  } catch (err) {
    // z. B. offline, bevor der Baustein je geladen wurde
    for (const score of scores) score.replaceChildren(Object.assign(document.createElement('p'), { className: 'abc-warn', textContent: '⚠ Noten können gerade nicht angezeigt werden (Baustein nicht geladen – einmal mit Internet öffnen)' }));
    console.warn('abcjs laden:', err);
    return;
  }
  for (const score of scores) {
    try {
      draw(abcjs, score);
    } catch (err) {
      score.replaceChildren(Object.assign(document.createElement('p'), { className: 'abc-warn', textContent: `⚠ Noten konnten nicht gezeichnet werden: ${err.message}` }));
    }
    if (!follow) continue;
    // Einstellungen → Noten geändert (Größe, Liedtext …): neu zeichnen
    const book = score.closest('.songbook');
    if (book && !book.abcListening) {
      book.abcListening = true;
      book.addEventListener('songbooksettings', () => {
        for (const s of book.querySelectorAll('.abc-score')) if (s.tune) draw(abcjs, s);
      });
    }
    if (!score.observer) {
      score.observer = new ResizeObserver(() => {
        if (!score.isConnected || !score.clientWidth) return;
        if (Math.abs(score.clientWidth - Number(score.dataset.width)) > 24) draw(abcjs, score);
      });
      score.observer.observe(score);
    }
    addPlayButton(abcjs, score);
  }
}

/** ▶ am Abschnittsnamen: Melodie abspielen, die gerade klingende Note markieren. */
function addPlayButton(abcjs, score) {
  const section = score.closest('.block--abc');
  if (!section || section.querySelector('.abc-play') || !abcjs.synth?.supportsAudio()) return;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'abc-play';
  btn.textContent = '▶';
  btn.title = 'Melodie abspielen';
  btn.setAttribute('aria-label', 'Melodie abspielen');
  btn.onclick = (e) => {
    e.stopPropagation(); // nicht als Antippen im Spielmodus (Blättern) zählen
    if (btn.classList.contains('playing')) stopAbc();
    else play(abcjs, score, btn);
  };
  const label = section.querySelector('.block-label');
  if (label) label.append(btn);
  else section.prepend(btn);
}

async function play(abcjs, score, btn) {
  stopAbc();
  const tune = score.tune;
  if (!tune) return;
  // Tempo der Liedinfo, sonst aus Einstellungen → Noten
  const qpm = Number(score.dataset.tempo) || Number(score.closest('.songbook')?.dataset.abcTempo) || 100;
  const marked = new Set();
  const unmark = () => {
    for (const e of marked) e.classList.remove('abc-now');
    marked.clear();
  };
  const synth = new abcjs.synth.CreateSynth();
  const timer = new abcjs.TimingCallbacks(tune, {
    qpm,
    eventCallback: (ev) => {
      unmark();
      if (!ev) return stop();
      for (const e of ev.elements.flat()) {
        e.classList.add('abc-now');
        marked.add(e);
      }
    },
  });
  let stopped = false;
  function stop() {
    if (stopped) return;
    stopped = true;
    timer.stop();
    synth.stop();
    unmark();
    btn.classList.remove('playing');
    btn.textContent = '▶';
    btn.title = 'Melodie abspielen';
    if (playing?.stop === stop) playing = null;
  }
  playing = { stop };
  btn.classList.add('playing');
  btn.textContent = '■';
  btn.title = 'Anhalten';
  try {
    await synth.init({
      visualObj: tune,
      options: {
        qpm,
        soundFontUrl: SOUNDFONT,
        soundFontVolumeMultiplier: 3, // so laut wie mit den Original-Samples von abcjs
        program: 0, // Klavier
        chordsOff: true, // nur die Melodie, keine Begleitung
        midiTranspose: Number(score.dataset.transpose) || 0,
      },
    });
    await synth.prime();
    if (stopped) return;
    synth.start();
    timer.start();
  } catch (err) {
    console.warn('Noten abspielen:', err);
    stop();
  }
}
