// Layout-Einstellungen: Standardwerte, Prüfung, Speichern, Anwenden.
// Angewendet wird ausschließlich über CSS-Variablen und data-Attribute auf einem
// .songbook-Element – Vorschau, Einstellungs-Muster und Druck nutzen dasselbe CSS.

export const FONTS = {
  'Georgia': "Georgia, 'Times New Roman', serif",
  'Times New Roman': "'Times New Roman', Times, serif",
  'Palatino': "'Palatino Linotype', Palatino, 'Book Antiqua', serif",
  'Garamond': "Garamond, 'EB Garamond', Georgia, serif",
  'Cambria': "Cambria, Georgia, serif",
  'Segoe UI': "'Segoe UI', system-ui, sans-serif",
  'Arial': "Arial, Helvetica, sans-serif",
  'Verdana': "Verdana, Geneva, sans-serif",
  'Calibri': "Calibri, Carlito, 'Segoe UI', sans-serif",
  'Trebuchet MS': "'Trebuchet MS', sans-serif",
  'Systemschrift': "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  'Courier New': "'Courier New', Courier, monospace",
  'Consolas': "Consolas, 'Courier New', monospace",
};

export const CHORUS_STYLES = {
  bar: 'Balken links',
  indent: 'eingerückt',
  bold: 'fett',
  box: 'Rahmen',
  plain: 'wie Strophe',
};

export const LINE_SPACING = { compact: 1.1, normal: 1.25, wide: 1.45 };
export const PAPERS = ['A4', 'A5', 'Letter'];

export const DEFAULT_SETTINGS = Object.freeze({
  lyricFont: 'Georgia',
  lyricSize: 12, // pt
  chordFont: 'Segoe UI',
  chordSize: 10.5, // pt
  chordColor: '#b3261e',
  chordBold: true,
  chorusStyle: 'bar',
  showLabels: true,
  showDiagrams: true, // Griffbilder im Liedkopf
  showHarp: true, // Mundharmonika-Tabs wie [-4]
  harpLayout: 'inline', // Akkorde und Harp-Tabs: 'inline' = eine Zeile, 'split' = zwei Zeilen
  showTabs: true, // Gitarren-Tabs ({start_of_tab})
  lineSpacing: 'normal',
  // Liedkopf: Titel und Interpret
  titleFont: '', // '' = wie Liedtext
  titleSize: 19, // pt
  titleBold: true,
  titleUppercase: false,
  titleColor: '#111111',
  headerAlign: 'left', // 'left' | 'center' – Titel, Interpret, Infozeile, Griffbilder
  showArtist: true,
  artistInline: false, // Interpret in derselben Zeile wie der Titel („Titel – Interpret“)
  artistSize: 12, // pt
  artistItalic: true,
  artistColor: '#111111',
  columns: 1, // Druck
  margin: 15, // mm, Druck
  pageNumbers: true, // Seitenzahlen unten auf jeder Druckseite
  paper: 'A4', // Druck
});

const clamp = (v, min, max, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};
const oneOf = (v, allowed, fallback) => (allowed.includes(v) ? v : fallback);
const bool = (v, fallback) => (typeof v === 'boolean' ? v : fallback);
const color = (v, fallback) => (/^#[0-9a-f]{6}$/i.test(v) ? v.toLowerCase() : fallback);

/** Macht aus beliebigen (z. B. alten oder kaputten) Werten gültige Einstellungen. */
export function sanitize(input = {}) {
  const d = DEFAULT_SETTINGS;
  const s = input && typeof input === 'object' ? input : {};
  return {
    lyricFont: oneOf(s.lyricFont, Object.keys(FONTS), d.lyricFont),
    lyricSize: clamp(s.lyricSize, 7, 28, d.lyricSize),
    chordFont: oneOf(s.chordFont, Object.keys(FONTS), d.chordFont),
    chordSize: clamp(s.chordSize, 6, 28, d.chordSize),
    chordColor: /^#[0-9a-f]{6}$/i.test(s.chordColor) ? s.chordColor.toLowerCase() : d.chordColor,
    chordBold: typeof s.chordBold === 'boolean' ? s.chordBold : d.chordBold,
    chorusStyle: oneOf(s.chorusStyle, Object.keys(CHORUS_STYLES), d.chorusStyle),
    showLabels: typeof s.showLabels === 'boolean' ? s.showLabels : d.showLabels,
    showDiagrams: typeof s.showDiagrams === 'boolean' ? s.showDiagrams : d.showDiagrams,
    showHarp: typeof s.showHarp === 'boolean' ? s.showHarp : d.showHarp,
    harpLayout: oneOf(s.harpLayout, ['inline', 'split'], d.harpLayout),
    showTabs: typeof s.showTabs === 'boolean' ? s.showTabs : d.showTabs,
    lineSpacing: oneOf(s.lineSpacing, Object.keys(LINE_SPACING), d.lineSpacing),
    titleFont: oneOf(s.titleFont, ['', ...Object.keys(FONTS)], d.titleFont),
    titleSize: clamp(s.titleSize, 10, 40, d.titleSize),
    titleBold: bool(s.titleBold, d.titleBold),
    titleUppercase: bool(s.titleUppercase, d.titleUppercase),
    titleColor: color(s.titleColor, d.titleColor),
    headerAlign: oneOf(s.headerAlign, ['left', 'center'], d.headerAlign),
    showArtist: bool(s.showArtist, d.showArtist),
    artistInline: bool(s.artistInline, d.artistInline),
    artistSize: clamp(s.artistSize, 7, 24, d.artistSize),
    artistItalic: bool(s.artistItalic, d.artistItalic),
    artistColor: color(s.artistColor, d.artistColor),
    columns: Number(s.columns) === 2 ? 2 : 1,
    margin: Math.round(clamp(s.margin, 5, 40, d.margin)),
    pageNumbers: typeof s.pageNumbers === 'boolean' ? s.pageNumbers : d.pageNumbers,
    paper: oneOf(s.paper, PAPERS, d.paper),
  };
}

/** Setzt die Einstellungen auf ein .songbook-Element. */
export function applySettings(el, settings) {
  const s = sanitize(settings);
  const st = el.style;
  st.setProperty('--lyric-font', FONTS[s.lyricFont]);
  st.setProperty('--lyric-size', s.lyricSize + 'pt');
  st.setProperty('--chord-font', FONTS[s.chordFont]);
  st.setProperty('--chord-size', s.chordSize + 'pt');
  st.setProperty('--chord-color', s.chordColor);
  st.setProperty('--chord-bar-color', s.chordColor + '40');
  st.setProperty('--chord-weight', s.chordBold ? '700' : '400');
  st.setProperty('--line-height', String(LINE_SPACING[s.lineSpacing]));
  st.setProperty('--title-font', s.titleFont ? FONTS[s.titleFont] : 'var(--lyric-font)');
  st.setProperty('--title-size', s.titleSize + 'pt');
  st.setProperty('--title-weight', s.titleBold ? '700' : '400');
  st.setProperty('--title-transform', s.titleUppercase ? 'uppercase' : 'none');
  st.setProperty('--title-color', s.titleColor);
  st.setProperty('--artist-size', s.artistSize + 'pt');
  st.setProperty('--artist-style', s.artistItalic ? 'italic' : 'normal');
  st.setProperty('--artist-color', s.artistColor);
  el.dataset.headerAlign = s.headerAlign;
  el.dataset.artist = s.showArtist ? 'show' : 'hide';
  el.dataset.artistLayout = s.artistInline ? 'inline' : 'below';
  el.dataset.chorusStyle = s.chorusStyle;
  el.dataset.labels = s.showLabels ? 'show' : 'hide';
  el.dataset.diagrams = s.showDiagrams ? 'show' : 'hide';
  el.dataset.harp = s.showHarp ? 'show' : 'hide';
  el.dataset.harpLayout = s.harpLayout;
  el.dataset.tabs = s.showTabs ? 'show' : 'hide';
  el.dataset.pageNumbers = s.pageNumbers ? 'show' : 'hide';
}

// ---------- Speicher ----------
// Vorerst localStorage. Für einen späteren Sync ist das die einzige Stelle, die
// angepasst werden muss (load/save).

const KEY = 'settings';

/**
 * Gespeicherte Einstellungen lesen (fehlende Werte = Standard, ältere Speicherformate werden übernommen).
 * @returns {object}
 */
export function loadSettings(storage = globalThis.localStorage) {
  let raw = {};
  try {
    raw = JSON.parse(storage.getItem(KEY) || 'null');
  } catch {
    raw = null;
  }
  if (!raw) {
    // Übernahme älterer Einzelwerte (vor der Einstellungsseite)
    raw = {};
    const chorus = storage.getItem('chorusStyle');
    if (chorus) raw.chorusStyle = chorus;
    try {
      const p = JSON.parse(storage.getItem('printOptions') || '{}');
      Object.assign(raw, { columns: p.columns, margin: p.margin, paper: p.paper });
    } catch {
      /* ignorieren */
    }
  }
  return sanitize(raw);
}

/**
 * Einstellungen prüfen, speichern und überall anwenden (Ereignis „settingschange“).
 * @returns {object} die gespeicherten (geprüften) Einstellungen
 */
export function saveSettings(settings, storage = globalThis.localStorage) {
  const s = sanitize(settings);
  storage.setItem(KEY, JSON.stringify(s));
  storage.removeItem('chorusStyle');
  globalThis.dispatchEvent?.(new CustomEvent('settingschange', { detail: s }));
  return s;
}
