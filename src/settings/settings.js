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
  lineSpacing: 'normal',
  columns: 1, // Druck
  margin: 15, // mm, Druck
  paper: 'A4', // Druck
});

const clamp = (v, min, max, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};
const oneOf = (v, allowed, fallback) => (allowed.includes(v) ? v : fallback);

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
    lineSpacing: oneOf(s.lineSpacing, Object.keys(LINE_SPACING), d.lineSpacing),
    columns: Number(s.columns) === 2 ? 2 : 1,
    margin: Math.round(clamp(s.margin, 5, 40, d.margin)),
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
  el.dataset.chorusStyle = s.chorusStyle;
  el.dataset.labels = s.showLabels ? 'show' : 'hide';
  el.dataset.diagrams = s.showDiagrams ? 'show' : 'hide';
}

// ---------- Speicher ----------
// Vorerst localStorage. Für einen späteren Sync ist das die einzige Stelle, die
// angepasst werden muss (load/save).

const KEY = 'settings';

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

export function saveSettings(settings, storage = globalThis.localStorage) {
  const s = sanitize(settings);
  storage.setItem(KEY, JSON.stringify(s));
  storage.removeItem('chorusStyle');
  globalThis.dispatchEvent?.(new CustomEvent('settingschange', { detail: s }));
  return s;
}
