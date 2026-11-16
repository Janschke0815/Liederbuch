// Druckdialog (Auswahl + Optionen) und Druckvorschau.
//
// Alle Optionen stehen im Dialog „Optionen …“. Mit 📌 lässt sich jede davon als Schnellwahl in
// die Leiste über der Vorschau heften (siehe print/print-quick.js); Änderungen dort setzen die
// Vorschau sofort neu.

import { buildSongbook, DEFAULT_PRINT_OPTIONS, PAPER } from './print/songbook.js';
import { normalize } from './storage/repository.js';
import { loadSettings, saveSettings, applySettings, FONTS } from './settings/settings.js';
import { withPrintFonts, loadPrintFonts, savePrintFonts } from './print/print-fonts.js';
import { QUICK_OPTIONS, loadPins, togglePin, formatValue } from './print/print-quick.js';
import { $ } from './ui/dom.js';

const OWN_KEY = 'printOptions';

function loadOwn() {
  try {
    const v = JSON.parse(localStorage.getItem(OWN_KEY) || '{}');
    return v && typeof v === 'object' ? v : {};
  } catch {
    return {};
  }
}

// Papier, Spalten und Rand kommen aus den gemeinsamen Einstellungen,
// der Rest (Titel, Deckblatt …) ist druckspezifisch.
function loadOptions() {
  const { paper, columns, margin } = loadSettings();
  return { ...DEFAULT_PRINT_OPTIONS, ...loadOwn(), paper, columns, margin };
}

/** Einstellungen für den Druck: gemeinsame Einstellungen + eigene Druckschrift. */
const printSettings = () => withPrintFonts(loadSettings(), loadPrintFonts());

export function setupPrint({ repo, beforeOpen }) {
  const dlg = $('#print-dialog');
  const view = $('#print-view');
  const root = $('#print-root');
  let songs = [];
  let selected = new Set();
  let overrides = {}; // Vorgaben eines Aufrufs (einzelnes Lied, Setliste) – gelten nur für diese Vorschau
  let options = loadOptions();

  // ---------- Werte lesen und ändern (für Dialog und Schnellwahl) ----------

  function valueOf(key) {
    const opt = QUICK_OPTIONS.find((o) => o.key === key);
    if (opt.store === 'settings') return loadSettings()[key];
    if (opt.store === 'fonts') return printSettings()[key];
    return { ...loadOptions(), ...overrides }[key];
  }

  function setValue(key, value) {
    const opt = QUICK_OPTIONS.find((o) => o.key === key);
    if (opt.store === 'settings') saveSettings({ ...loadSettings(), [key]: value });
    else if (opt.store === 'fonts') savePrintFonts({ ...loadPrintFonts(), [key]: value }, loadSettings());
    else if (key in overrides) overrides[key] = value; // nur für diese Vorschau
    else localStorage.setItem(OWN_KEY, JSON.stringify({ ...loadOwn(), [key]: value }));
    options = { ...loadOptions(), ...overrides };
    renderQuick();
    relayoutSoon();
  }

  // ---------- Schnellwahl in der Leiste ----------

  const el = (tag, props = {}, ...children) => {
    const e = Object.assign(document.createElement(tag), props);
    e.append(...children);
    return e;
  };

  function fontOptions(select) {
    select.replaceChildren(...Object.keys(FONTS).map((f) => {
      const o = new Option(f, f);
      o.style.fontFamily = FONTS[f];
      return o;
    }));
  }

  function quickControl(opt) {
    const value = valueOf(opt.key);
    const title = opt.title || opt.label;
    if (opt.kind === 'toggle') {
      return el('button', {
        type: 'button', className: 'q-toggle', textContent: opt.label, title: `${title}: ${value ? 'an' : 'aus'}`,
        onclick: () => setValue(opt.key, !valueOf(opt.key)),
      });
    }
    if (opt.kind === 'select' || opt.kind === 'font') {
      const select = el('select', { title });
      if (opt.kind === 'font') fontOptions(select);
      else select.replaceChildren(...opt.choices.map(([v, l]) => new Option(l, v)));
      select.value = String(value);
      select.onchange = () => setValue(opt.key, opt.number ? Number(select.value) : select.value);
      return el('label', { className: 'q' }, opt.kind === 'font' ? `${opt.label} ` : '', select);
    }
    // Stepper: − Wert +
    const step = (dir) => () => setValue(opt.key, opt.step(Number(valueOf(opt.key)), dir));
    return el('span', { className: 'q', title },
      el('span', { textContent: opt.label }),
      el('span', { className: 'stepper' },
        el('button', { type: 'button', textContent: '−', title: `${title} kleiner`, onclick: step(-1) }),
        el('output', { textContent: formatValue(opt, value) }),
        el('button', { type: 'button', textContent: '+', title: `${title} größer`, onclick: step(1) })));
  }

  function renderQuick() {
    const pins = loadPins();
    $('#pv-quick').replaceChildren(...QUICK_OPTIONS.filter((o) => pins.includes(o.key)).map((o) => {
      const c = quickControl(o);
      if (o.kind === 'toggle') c.setAttribute('aria-pressed', String(Boolean(valueOf(o.key))));
      return c;
    }));
  }

  // ---------- Dialog ----------

  function renderList() {
    const q = normalize($('#pr-search').value.trim());
    const visible = songs.filter((s) => !q || normalize(`${s.title} ${s.artist}`).includes(q));
    $('#pr-list').replaceChildren(
      ...visible.map((s) => {
        const li = document.createElement('li');
        const label = document.createElement('label');
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = selected.has(s.id);
        cb.onchange = () => {
          cb.checked ? selected.add(s.id) : selected.delete(s.id);
          updateCount();
        };
        const small = document.createElement('small');
        small.textContent = s.artist;
        label.append(cb, s.title || 'Ohne Titel', small);
        li.append(label);
        return li;
      }),
    );
    updateCount();
  }

  function updateCount() {
    $('#pr-count').textContent = `${selected.size} von ${songs.length} ausgewählt`;
    $('#pr-ok').disabled = $('#pr-print').disabled = selected.size === 0;
  }

  fontOptions($('#pr-lyricFont'));
  fontOptions($('#pr-chordFont'));

  function fillFonts(s) {
    $('#pr-lyricFont').value = s.lyricFont;
    $('#pr-lyricSize').value = s.lyricSize;
    $('#pr-chordFont').value = s.chordFont;
    $('#pr-chordSize').value = s.chordSize;
  }

  function syncPins() {
    const pins = loadPins();
    for (const b of dlg.querySelectorAll('.pin')) b.setAttribute('aria-pressed', String(pins.includes(b.dataset.pin)));
  }

  function fillForm() {
    $('#pr-title').value = options.title;
    $('#pr-subtitle').value = options.subtitle;
    $('#pr-cover').checked = options.cover;
    $('#pr-toc').checked = options.toc;
    $('#pr-transpose').checked = options.useSavedTranspose;
    $('#pr-paper').value = options.paper;
    $('#pr-columns').value = String(options.columns);
    $('#pr-margin').value = options.margin;
    $('#pr-pageNumbers').checked = loadSettings().pageNumbers;
    fillFonts(printSettings());
    syncPins();
  }

  function readForm() {
    const own = {
      title: $('#pr-title').value.trim(),
      subtitle: $('#pr-subtitle').value.trim(),
      cover: $('#pr-cover').checked,
      toc: $('#pr-toc').checked,
      useSavedTranspose: $('#pr-transpose').checked,
    };
    localStorage.setItem(OWN_KEY, JSON.stringify(own));
    saveSettings({
      ...loadSettings(),
      paper: $('#pr-paper').value,
      columns: Number($('#pr-columns').value),
      margin: Math.min(40, Math.max(5, Number($('#pr-margin').value) || 15)),
      pageNumbers: $('#pr-pageNumbers').checked,
    });
    savePrintFonts({
      lyricFont: $('#pr-lyricFont').value,
      lyricSize: Number($('#pr-lyricSize').value),
      chordFont: $('#pr-chordFont').value,
      chordSize: Number($('#pr-chordSize').value),
    }, loadSettings());
    overrides = {}; // im Dialog Gewähltes gilt
    options = loadOptions();
  }

  async function openDialog({ keepSelection = false } = {}) {
    await beforeOpen?.();
    options = { ...loadOptions(), ...overrides };
    if (!keepSelection) {
      overrides = {};
      options = loadOptions();
      songs = await repo.list();
    }
    const ids = new Set(songs.map((s) => s.id));
    if (!keepSelection) selected = new Set(ids);
    else selected = new Set([...selected].filter((id) => ids.has(id)));
    $('#pr-search').value = '';
    fillForm();
    renderList();
    dlg.showModal();
  }

  $('#pr-search').addEventListener('input', renderList);
  $('#pr-all').onclick = () => {
    for (const li of $('#pr-list').querySelectorAll('input')) li.checked = true;
    const q = normalize($('#pr-search').value.trim());
    songs.filter((s) => !q || normalize(`${s.title} ${s.artist}`).includes(q)).forEach((s) => selected.add(s.id));
    updateCount();
  };
  $('#pr-none').onclick = () => {
    selected.clear();
    renderList();
  };
  $('#pr-font-reset').onclick = () => fillFonts(loadSettings());
  dlg.addEventListener('click', (e) => {
    const b = e.target.closest('.pin');
    if (!b) return;
    togglePin(b.dataset.pin);
    syncPins();
    if (!view.hidden) renderQuick();
  });

  dlg.addEventListener('close', async () => {
    if (dlg.returnValue !== 'ok' && dlg.returnValue !== 'print') return;
    readForm();
    await showPreview();
    // „Drucken / PDF“: Seiten setzen und gleich den Druckdialog öffnen (Vorschau bleibt dahinter)
    if (dlg.returnValue === 'print') $('#pv-print').click();
  });

  // ---------- Vorschau ----------

  function fitZoom() {
    const page = root.querySelector('.page');
    if (!page) return;
    const avail = root.parentElement.clientWidth - 24;
    const zoom = Math.min(1, avail / page.offsetWidth);
    root.style.setProperty('--preview-zoom', zoom.toFixed(3));
  }

  // Schnell mehrmals tippen: erst danach neu setzen
  let relayoutTimer = 0;
  function relayoutSoon() {
    clearTimeout(relayoutTimer);
    relayoutTimer = setTimeout(() => showPreview({ keepPlace: true }), 250);
  }

  /** Seite oben im Fenster (für "an derselben Stelle weiter" nach dem Neusetzen). */
  function currentPage() {
    const sc = root.parentElement;
    const top = sc.getBoundingClientRect().top;
    const pages = [...root.querySelectorAll('.page')];
    const i = pages.findIndex((p) => p.getBoundingClientRect().bottom > top + 40);
    return Math.max(0, i);
  }

  let building = null;
  async function showPreview({ keepPlace = false } = {}) {
    if (building) await building; // nie zwei Umbrüche gleichzeitig
    const page = keepPlace ? currentPage() : 0;
    building = layoutPreview(page);
    try {
      await building;
    } finally {
      building = null;
    }
  }

  async function layoutPreview(page) {
    view.hidden = false;
    root.style.setProperty('--preview-zoom', '1'); // Messen nur in Originalgröße
    applySettings(root, printSettings());
    renderQuick();
    $('#pv-info').textContent = 'Seiten werden gesetzt …';
    const chosen = songs.filter((s) => selected.has(s.id)); // bereits alphabetisch
    const result = await buildSongbook(root, chosen, options);
    fitZoom();
    const warn = result.overflows ? ` · ${result.overflows}× zu groß für eine Seite (abgeschnitten)` : '';
    $('#pv-info').textContent = `${chosen.length} ${chosen.length === 1 ? 'Lied' : 'Lieder'}, ${result.pages} Seiten (${options.paper})${warn}`;
    setPageSize();
    const target = root.querySelectorAll('.page')[Math.min(page, result.pages - 1)];
    if (page && target) target.scrollIntoView({ block: 'start' });
    else root.parentElement.scrollTop = 0;
  }

  function setPageSize() {
    const p = PAPER[options.paper] || PAPER.A4;
    let style = document.getElementById('page-size');
    if (!style) {
      style = document.createElement('style');
      style.id = 'page-size';
      document.head.append(style);
    }
    style.textContent = `@page { size: ${p.width}mm ${p.height}mm; margin: 0; }`;
  }

  addEventListener('resize', () => !view.hidden && fitZoom());
  $('#pv-back').onclick = () => {
    view.hidden = true;
    root.replaceChildren();
  };
  $('#pv-settings').onclick = () => openDialog({ keepSelection: true });
  $('#pv-print').onclick = () => {
    document.body.classList.add('printing');
    window.print();
  };
  addEventListener('afterprint', () => document.body.classList.remove('printing'));

  $('#btn-print').onclick = () => openDialog();

  /** Feste Auswahl in fester Reihenfolge drucken (z. B. Setliste) – direkt zur Vorschau. */
  async function printSongs(list, opts = {}) {
    await beforeOpen?.();
    overrides = { ...opts };
    options = { ...loadOptions(), ...overrides };
    songs = list;
    selected = new Set(list.map((s) => s.id));
    await showPreview();
  }
  return { printSongs };
}
