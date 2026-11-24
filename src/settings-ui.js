// Einstellungsdialog mit Live-Muster. Änderungen wirken sofort auf Muster und Vorschau;
// "Abbrechen" stellt den vorherigen Stand wieder her, "Speichern" übernimmt ihn dauerhaft.

import {
  FONTS, CHORUS_STYLES, DEFAULT_SETTINGS, sanitize, applySettings, loadSettings, saveSettings,
} from './settings/settings.js';
import { parseChordPro } from './core/chordpro.js';
import { renderSong } from './render/song-view.js';
import { renderScores } from './render/abc-view.js';
import { $ } from './ui/dom.js';
import { prefs } from './prefs.js';

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
Oh my [C][6]darling, [6]oh my [-6]darling,
Oh my [C]darling, Clemen[G]tine,
You are [G]lost and gone for[C]ever,
Dreadful [G]sorry, Clemen[C]tine
{end_of_chorus}

{start_of_part: Zwischenspiel}
| [C] | [G] | [C] |
[4] [4] [4] [3] [-4] [5] [5] [5] [4]
{end_of_part}

{start_of_tab: Riff}
e|-----0---3---0-----|
B|---1-------------1-|
{end_of_tab}

{start_of_abc: label="Melodie"}
M:3/4
L:1/4
"C"C/C/ C G, | E/E/ E C | C/E/ G G | "G"F/E/ D2 |
w: In a cav-ern, in a can-yon, ex-ca-vat-ing for a mine,
{end_of_abc}

{chorus}
`;

const FIELDS = ['lyricFont', 'lyricSize', 'lineSpacing',
  'headerAlign', 'titleFont', 'titleSize', 'titleBold', 'titleUppercase', 'titleColor',
  'showArtist', 'artistInline', 'artistSize', 'artistItalic', 'artistColor',
  'chordFont', 'chordSize', 'chordColor',
  'chordBold', 'harpColor', 'showChords', 'showDiagrams', 'showHarp', 'harpLayout', 'showTabs', 'showAbc', 'abcSize', 'abcLyrics', 'abcChords', 'abcTempo', 'chorusStyle', 'showLabels', 'paper', 'columns', 'margin', 'pageNumbers'];

function fillSelect(sel, entries) {
  sel.replaceChildren(...entries.map(([value, label]) => new Option(label, value)));
}

/**
 * Einstellungsdialog mit Live-Muster einrichten.
 * @param {{ targets: () => HTMLElement[] }} opts  Elemente, auf die Einstellungen live wirken
 */
export function setupSettings({ targets }) {
  const dlg = $('#settings-dialog');
  const sample = $('#st-sample');
  let saved = loadSettings();
  let draft = { ...saved };

  // Schriftauswahl: jede Option in ihrer eigenen Schrift
  for (const id of ['#st-lyricFont', '#st-chordFont', '#st-titleFont']) {
    const entries = Object.keys(FONTS).map((f) => [f, f]);
    if (id === '#st-titleFont') entries.unshift(['', 'wie Liedtext']);
    fillSelect($(id), entries);
    [...$(id).options].forEach((o) => o.value && (o.style.fontFamily = FONTS[o.value]));
  }
  fillSelect($('#st-chorusStyle'), Object.entries(CHORUS_STYLES));
  sample.replaceChildren(renderSong(parseChordPro(SAMPLE)));
  let sampleDrawn = false; // Noten im Muster erst zeichnen, wenn der Dialog offen ist (abcjs nur bei Bedarf)

  // Auswahllisten mit wenigen Werten als Knopfgruppe (die Liste bleibt versteckt die Quelle)
  for (const sel of dlg.querySelectorAll('select[data-segmented]')) {
    const group = document.createElement('div');
    group.className = 'seg-group';
    group.setAttribute('role', 'radiogroup');
    for (const o of sel.options) {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('role', 'radio');
      b.dataset.value = o.value;
      b.textContent = o.textContent;
      b.onclick = () => {
        sel.value = o.value;
        dlg.dispatchEvent(new Event('input'));
      };
      group.append(b);
    }
    sel.hidden = true;
    sel.after(group);
  }

  /** Knopfgruppen, Zahlenanzeigen der Schieber und gewählte Farbe angleichen. */
  function syncControls() {
    for (const sel of dlg.querySelectorAll('select[data-segmented]')) {
      for (const b of sel.nextElementSibling.children) b.setAttribute('aria-checked', String(b.dataset.value === sel.value));
    }
    for (const out of dlg.querySelectorAll('output.range-val')) {
      const v = Number($(`#${out.dataset.for}`).value);
      out.textContent = `${String(v).replace('.', ',')} ${out.dataset.unit}`;
    }
    // Farbfelder: jede Reihe gehört zu einem Farbwert (data-for)
    for (const row of dlg.querySelectorAll('.color-row[data-for]')) {
      const color = input(row.dataset.for).value.toLowerCase();
      for (const sw of row.querySelectorAll('.swatch')) sw.setAttribute('aria-pressed', String(sw.dataset.color === color));
    }
    // Abhängige Zeilen ausgrauen, solange ein nötiger Schalter aus ist (data-needs="showChords …")
    for (const row of dlg.querySelectorAll('.st-row[data-needs]')) {
      const off = row.dataset.needs.split(/\s+/).some((key) => !input(key).checked);
      row.classList.toggle('st-off', off);
      for (const c of row.querySelectorAll('input, select, button')) c.disabled = off;
      row.title = off ? 'Wirkt erst, wenn die übergeordnete Anzeige eingeschaltet ist' : '';
    }
  }

  // Bereiche einklappbar: Klick auf die Überschrift; der Zustand bleibt gespeichert
  const collapsed = new Set(prefs.get('settingsCollapsed'));
  function setCollapsed(card, value) {
    card.classList.toggle('collapsed', value);
    card.querySelector('.st-card-toggle').setAttribute('aria-expanded', String(!value));
    if (value) collapsed.add(card.id);
    else collapsed.delete(card.id);
    prefs.set('settingsCollapsed', [...collapsed]);
  }
  for (const card of dlg.querySelectorAll('.st-card')) {
    const h3 = card.querySelector(':scope > h3');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'st-card-toggle';
    btn.title = 'Bereich ein-/ausklappen';
    const chevron = document.createElement('span');
    chevron.className = 'st-chevron';
    chevron.setAttribute('aria-hidden', 'true');
    // dasselbe Symbol wie in der Navigation links
    const navIcon = dlg.querySelector(`.st-nav a[href="#${card.id}"] span`);
    if (navIcon) btn.append(Object.assign(document.createElement('span'), { className: 'st-card-icon', innerHTML: navIcon.innerHTML }));
    btn.append(...h3.childNodes, chevron);
    h3.replaceChildren(btn);
    btn.onclick = () => setCollapsed(card, !card.classList.contains('collapsed'));
    setCollapsed(card, collapsed.has(card.id));
  }

  // Muster einklappbar (am Handy nimmt es sonst viel Platz über den Reglern weg)
  const sampleBox = $('.settings-sample');
  const sampleToggle = $('#st-sample-toggle');
  function setSampleHidden(hidden) {
    sampleBox.classList.toggle('collapsed', hidden);
    sampleToggle.setAttribute('aria-expanded', String(!hidden));
    prefs.set('settingsSampleHidden', hidden);
  }
  sampleToggle.onclick = () => setSampleHidden(!sampleBox.classList.contains('collapsed'));
  setSampleHidden(prefs.get('settingsSampleHidden'));

  // Bereichs-Navigation: springen und beim Scrollen mitführen
  const fields = $('#st-fields');
  const navLinks = [...dlg.querySelectorAll('.st-nav a')];
  // Am Handy: Bereiche als Knöpfe oben, immer nur einer sichtbar (CSS: .st-card.current)
  const phone = matchMedia('(max-width: 760px)');
  let section = navLinks[0].getAttribute('href');
  function showSection(href) {
    section = href;
    for (const card of dlg.querySelectorAll('.st-card')) card.classList.toggle('current', `#${card.id}` === href);
    for (const a of navLinks) a.classList.toggle('active', a.getAttribute('href') === href);
    if (phone.matches) fields.scrollTop = 0;
  }
  for (const a of navLinks) {
    a.onclick = (e) => {
      e.preventDefault();
      showSection(a.getAttribute('href'));
      if (phone.matches) return;
      const target = $(a.getAttribute('href'));
      setCollapsed(target, false); // eingeklappten Bereich beim Anspringen öffnen
      fields.scrollTo({ top: target.offsetTop - fields.offsetTop - 8, behavior: 'smooth' });
      setTimeout(() => fields.scrollTop !== target.offsetTop - fields.offsetTop - 8 && (fields.scrollTop = target.offsetTop - fields.offsetTop - 8), 400);
    };
  }
  fields.addEventListener('scroll', () => {
    if (phone.matches) return; // dort zeigt der Knopf den gewählten Bereich
    const y = fields.scrollTop + fields.offsetTop + 40;
    let current = navLinks[0];
    for (const a of navLinks) if ($(a.getAttribute('href')).offsetTop <= y) current = a;
    if (fields.scrollTop + fields.clientHeight >= fields.scrollHeight - 4) current = navLinks.at(-1);
    for (const a of navLinks) a.classList.toggle('active', a === current);
  }, { passive: true });

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
    syncControls();
  }

  function readForm() {
    const raw = {};
    for (const key of FIELDS) {
      const el = input(key);
      raw[key] = el.type === 'checkbox' ? el.checked : el.type === 'number' || el.type === 'range' ? Number(el.value) : el.value;
    }
    return sanitize(raw);
  }

  dlg.addEventListener('input', () => {
    draft = readForm();
    applyAll(draft);
    syncControls();
  });

  for (const sw of dlg.querySelectorAll('.color-row[data-for] .swatch')) {
    sw.onclick = () => {
      input(sw.closest('.color-row').dataset.for).value = sw.dataset.color;
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
    if (!sampleDrawn) renderScores(sample).then(() => (sampleDrawn = true));
    showSection(section); // am Handy: zuletzt gewählter Bereich
    fields.scrollTop = 0;
    fields.dispatchEvent(new Event('scroll'));
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
