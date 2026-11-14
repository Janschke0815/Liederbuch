// Einstellungsdialog mit Live-Muster. Änderungen wirken sofort auf Muster und Vorschau;
// "Abbrechen" stellt den vorherigen Stand wieder her, "Speichern" übernimmt ihn dauerhaft.

import {
  FONTS, CHORUS_STYLES, DEFAULT_SETTINGS, sanitize, applySettings, loadSettings, saveSettings,
} from './settings/settings.js';
import { parseChordPro } from './core/chordpro.js';
import { renderSong } from './render/song-view.js';

const $ = (s) => document.querySelector(s);

const SAMPLE = `{title: Clementine}
{artist: Traditional}
{key: C}

{start_of_verse: Strophe 1}
In a [C]cavern, in a canyon,
Exca[G]vating for a [C]mine,
Dwelt a [C]miner, forty-[G]niner,
And his [G]daughter, Clemen[C]tine
{end_of_verse}

{start_of_chorus: Refrain}
Oh my [C]darling, oh my darling,
Oh my [C]darling, Clemen[G]tine,
You are [G]lost and gone for[C]ever,
Dreadful [G]sorry, Clemen[C]tine
{end_of_chorus}

{start_of_part: Zwischenspiel}
| [C] | [G] | [C] |
{end_of_part}

{chorus}
`;

const FIELDS = ['lyricFont', 'lyricSize', 'lineSpacing', 'chordFont', 'chordSize', 'chordColor',
  'chordBold', 'showDiagrams', 'chorusStyle', 'showLabels', 'paper', 'columns', 'margin'];

function fillSelect(sel, entries) {
  sel.replaceChildren(...entries.map(([value, label]) => new Option(label, value)));
}

/**
 * @param {{ targets: () => HTMLElement[] }} opts  Elemente, auf die Einstellungen live wirken
 */
export function setupSettings({ targets }) {
  const dlg = $('#settings-dialog');
  const sample = $('#st-sample');
  let saved = loadSettings();
  let draft = { ...saved };

  // Schriftauswahl: jede Option in ihrer eigenen Schrift
  for (const id of ['#st-lyricFont', '#st-chordFont']) {
    fillSelect($(id), Object.keys(FONTS).map((f) => [f, f]));
    [...$(id).options].forEach((o) => (o.style.fontFamily = FONTS[o.value]));
  }
  fillSelect($('#st-chorusStyle'), Object.entries(CHORUS_STYLES));
  sample.replaceChildren(renderSong(parseChordPro(SAMPLE)));

  const applyAll = (s) => {
    applySettings(sample, s);
    for (const el of targets()) applySettings(el, s);
  };

  const input = (key) => $(`#st-${key}`);

  function fillForm(s) {
    for (const key of FIELDS) {
      const el = input(key);
      if (el.type === 'checkbox') el.checked = s[key];
      else el.value = String(s[key]);
    }
  }

  function readForm() {
    const raw = {};
    for (const key of FIELDS) {
      const el = input(key);
      raw[key] = el.type === 'checkbox' ? el.checked : el.type === 'number' ? Number(el.value) : el.value;
    }
    return sanitize(raw);
  }

  dlg.addEventListener('input', () => {
    draft = readForm();
    applyAll(draft);
  });

  for (const sw of dlg.querySelectorAll('.swatch')) {
    sw.onclick = () => {
      input('chordColor').value = sw.dataset.color;
      dlg.dispatchEvent(new Event('input'));
    };
  }

  $('#st-reset').onclick = () => {
    draft = { ...DEFAULT_SETTINGS };
    fillForm(draft);
    applyAll(draft);
  };

  dlg.addEventListener('close', () => {
    if (dlg.returnValue === 'ok') {
      saved = saveSettings(readForm());
    }
    fillForm(saved);
    applyAll(saved);
  });

  $('#btn-settings').onclick = () => {
    saved = loadSettings();
    draft = { ...saved };
    fillForm(saved);
    applyAll(saved);
    dlg.returnValue = '';
    dlg.showModal();
  };

  applyAll(saved);
  // Änderungen von anderer Stelle (z. B. Schalter im Spielmodus) übernehmen
  addEventListener('settingschange', (e) => {
    if (dlg.open) return;
    saved = e.detail;
    applyAll(saved);
  });
  return { get: () => loadSettings() };
}
