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
import { $, toast } from './ui/dom.js';
import { attachContextMenu } from './context-menu.js';
import { getMeta, setMeta } from './core/meta-edit.js';
import { readOnly } from './ui/app-state.js';
import { prefs } from './prefs.js';
import { applyOrder, arrangeSpreads, moveId, reorderSubset } from './print/spreads.js';

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

/**
 * Druckdialog und Druckvorschau einrichten.
 * @param {{repo: object, beforeOpen?: () => Promise<void>}} opts  beforeOpen: z. B. Ungespeichertes sichern
 * @returns {{printSongs: (list: object[], opts?: object) => Promise<void>}}  feste Auswahl direkt in die Vorschau
 */
export function setupPrint({ repo, beforeOpen }) {
  const dlg = $('#print-dialog');
  const view = $('#print-view');
  const root = $('#print-root');
  let songs = [];
  let selected = new Set();
  let overrides = {}; // Vorgaben eines Aufrufs (einzelnes Lied, Setliste) – gelten nur für diese Vorschau
  let options = loadOptions();
  let fixedList = false; // Setliste: eigene Reihenfolge, wird nicht gespeichert
  let last = null; // Ergebnis des letzten Setzens (Seiten je Lied, für „Lücken füllen“)

  // ---------- Reihenfolge ----------

  const byTitle = (a, b) => (a.title || '').localeCompare(b.title || '', 'de', { sensitivity: 'base' });

  /** Vorschlag für Doppelseiten: von A–Z ausgehend, mit möglichst kleinen Umstellungen (print/spreads.js). */
  function arranged(chosen, result) {
    const az = [...chosen].sort(byTitle);
    return arrangeSpreads(az.map((s) => ({ id: s.id, pages: result.pageCounts.get(s.id) })), result.firstSongPage);
  }

  /** Reihenfolge aller Lieder setzen (ids) – gespeichert, außer bei einer Setliste. */
  function setOrder(ids) {
    const rank = new Map(ids.map((id, i) => [id, i]));
    songs = [...songs].sort((a, b) => rank.get(a.id) - rank.get(b.id));
    if (!fixedList) prefs.set('printOrder', ids);
  }

  /** Ein gewähltes Lied einen Platz nach vorn/hinten (unter den gewählten). */
  function moveSong(id, dir) {
    const chosen = songs.filter((s) => selected.has(s.id)).map((s) => s.id);
    const moved = moveId(chosen, id, dir);
    if (moved === chosen) return false;
    setOrder(reorderSubset(songs.map((s) => s.id), moved));
    return true;
  }

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

  /**
   * Filter aus dem Suchfeld: Titel, Interpret oder Tag. Steht dort genau ein Tag (z. B. aus den
   * Vorschlägen gewählt), zählen nur Lieder mit diesem Tag.
   */
  function filtered() {
    const q = normalize($('#pr-search').value.trim());
    if (!q) return songs;
    const isTag = songs.some((s) => (s.tags || []).some((t) => normalize(t) === q));
    if (isTag) return songs.filter((s) => (s.tags || []).some((t) => normalize(t) === q));
    return songs.filter((s) => normalize(`${s.title} ${s.artist} ${(s.tags || []).join(' ')}`).includes(q));
  }

  /** Tags der Lieder als Vorschläge im Suchfeld (mit Anzahl). */
  function fillTags() {
    const count = new Map();
    for (const s of songs) for (const t of s.tags || []) count.set(t, (count.get(t) || 0) + 1);
    const tags = [...count].sort((a, b) => a[0].localeCompare(b[0], 'de', { sensitivity: 'base' }));
    $('#pr-tags').replaceChildren(...tags.map(([t, n]) => Object.assign(new Option(t), { label: `Tag · ${n} ${n === 1 ? 'Lied' : 'Lieder'}` })));
  }

  function renderList() {
    const q = $('#pr-search').value.trim();
    const visible = filtered();
    $('#pr-only').hidden = !q;
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
        // Reihenfolge (nicht beim Filtern – dann wären die Nachbarn unsichtbar)
        if (!q) {
          const i = songs.indexOf(s);
          const move = (text, dir, title) => el('button', {
            type: 'button', className: 'pr-move', textContent: text, title, disabled: i + dir < 0 || i + dir >= songs.length,
            onclick: () => {
              const ids = songs.map((x) => x.id);
              setOrder(moveId(ids, s.id, dir));
              renderList();
              $('#pr-list').querySelectorAll('li')[songs.indexOf(s)]?.querySelector(`.pr-move:nth-of-type(${dir < 0 ? 1 : 2})`)?.focus();
            },
          });
          li.append(move('↑', -1, 'Nach vorn'), move('↓', 1, 'Nach hinten'));
        }
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
    $('#pr-spreads').checked = options.spreads;
    $('#pr-blankPages').checked = options.blankPages;
    $('#pr-blankPages').disabled = !options.spreads;
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
      spreads: $('#pr-spreads').checked,
      blankPages: $('#pr-blankPages').checked,
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
      songs = applyOrder(await repo.list(), prefs.get('printOrder'));
      fixedList = false;
    }
    const ids = new Set(songs.map((s) => s.id));
    if (!keepSelection) selected = new Set(ids);
    else selected = new Set([...selected].filter((id) => ids.has(id)));
    $('#pr-search').value = '';
    fillTags();
    fillForm();
    renderList();
    dlg.showModal();
  }

  $('#pr-search').addEventListener('input', renderList);
  $('#pr-only').onclick = () => {
    selected = new Set(filtered().map((s) => s.id));
    renderList();
  };
  $('#pr-spreads').onchange = () => ($('#pr-blankPages').disabled = !$('#pr-spreads').checked);
  $('#pr-az').onclick = () => {
    const az = [...songs].sort(byTitle);
    setOrder(az.map((s) => s.id));
    if (!fixedList) prefs.set('printOrder', []);
    renderList();
  };
  $('#pr-all').onclick = () => {
    for (const li of $('#pr-list').querySelectorAll('input')) li.checked = true;
    filtered().forEach((s) => selected.add(s.id));
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
    const zoom = Math.min(1, avail / (page.offsetWidth * (root.classList.contains('spreads') ? 2 : 1)));
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
    const chosen = songs.filter((s) => selected.has(s.id)); // in gewählter Reihenfolge
    const result = await buildSongbook(root, chosen, options);
    last = { chosen, result };
    fitZoom();
    const warn = result.overflows ? ` · ${result.overflows}× zu groß für eine Seite (abgeschnitten)` : '';
    const blanks = result.blanks ? ` · ${result.blanks} ${result.blanks === 1 ? 'Leerseite' : 'Leerseiten'}` : '';
    const right = result.startsRight.length ? ` · ${result.startsRight.length}× beginnt rechts` : '';
    $('#pv-info').textContent = `${chosen.length} ${chosen.length === 1 ? 'Lied' : 'Lieder'}, ${result.pages} Seiten (${options.paper})${blanks}${right}${warn}`;
    // „Automatisch anordnen“ nur, wenn es eine andere Reihenfolge ergäbe
    const auto = options.spreads && arranged(chosen, result).order;
    $('#pv-fill').hidden = !auto || auto.join() === chosen.map((s) => s.id).join();
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

  // ---------- Spalten für ein einzelnes Lied (Rechtsklick bzw. lang drücken auf seine Seite) ----------
  // Dasselbe wie Liedinfo → Spalten: {columns: 1|2} im Liedtext, leer = wie eingestellt.

  async function setSongColumns(s, value) {
    const chordpro = setMeta(s.chordpro, 'columns', value);
    if (chordpro === s.chordpro) return;
    await repo.update(s.id, { chordpro });
    s.chordpro = chordpro; // Auswahl der Vorschau sofort mitziehen
    await showPreview({ keepPlace: true });
  }

  const reorder = async (id, dir) => {
    if (moveSong(id, dir)) await showPreview({ keepPlace: true });
  };

  attachContextMenu(root, '.page[data-song]', (page) => {
    const s = songs.find((x) => x.id === page.dataset.song);
    if (!s) return null;
    const chosen = songs.filter((x) => selected.has(x.id));
    const i = chosen.indexOf(s);
    const items = [
      { label: 'Lied nach vorn', disabled: i <= 0, action: () => reorder(s.id, -1) },
      { label: 'Lied nach hinten', disabled: i < 0 || i >= chosen.length - 1, action: () => reorder(s.id, 1) },
    ];
    if (readOnly) return items;
    const own = getMeta(s.chordpro, 'columns');
    const general = Number(options.columns) === 2 ? 'zweispaltig' : 'einspaltig';
    return [...items, '-', {
      label: 'Spalten',
      items: [
        ['', `wie eingestellt (${general})`], ['1', 'einspaltig'], ['2', 'zweispaltig'],
      ].map(([v, label]) => ({ label, checked: (own === '1' || own === '2' ? own : '') === v, action: () => setSongColumns(s, v) })),
    }];
  }, { title: (page) => `„${songs.find((x) => x.id === page.dataset.song)?.title || 'Lied'}“` });
  root.title = 'Rechtsklick bzw. lang drücken auf ein Lied: Reihenfolge ändern' + (readOnly ? '' : ', ein- oder zweispaltig nur für dieses Lied');

  // Automatisch anordnen: A–Z, mehrseitige Lieder links – mit möglichst kleinen Umstellungen statt Leerseiten
  $('#pv-fill').onclick = async () => {
    if (!last) return;
    const before = songs.map((s) => s.id);
    const savedBefore = prefs.get('printOrder');
    const r = arranged(last.chosen, last.result);
    setOrder(reorderSubset(before, r.order));
    await showPreview({ keepPlace: true });
    const blanks = r.blanks ? ` – ${r.blanks} ${r.blanks === 1 ? 'Leerseite bleibt' : 'Leerseiten bleiben'}` : ' – keine Leerseite nötig';
    toast(`Alphabetisch angeordnet, ${r.moved} ${r.moved === 1 ? 'Umstellung' : 'Umstellungen'}${blanks}`, {
      action: 'Rückgängig',
      onAction: async () => {
        setOrder(before);
        if (!fixedList) prefs.set('printOrder', savedBefore);
        await showPreview({ keepPlace: true });
      },
    });
  };

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
    songs = [...list];
    fixedList = true;
    selected = new Set(list.map((s) => s.id));
    await showPreview();
  }
  return { printSongs };
}
