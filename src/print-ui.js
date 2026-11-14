// Druckdialog (Auswahl + Optionen) und Druckvorschau.

import { buildSongbook, DEFAULT_PRINT_OPTIONS, PAPER } from './print/songbook.js';
import { normalize } from './storage/repository.js';
import { loadSettings, saveSettings, applySettings, FONTS } from './settings/settings.js';
import { withPrintFonts, loadPrintFonts, savePrintFonts, stepSize } from './print/print-fonts.js';

const $ = (s) => document.querySelector(s);
const pickLayout = ({ paper, columns, margin }) => ({ paper, columns, margin });

// Papier, Spalten und Rand kommen aus den gemeinsamen Einstellungen,
// der Rest (Titel, Deckblatt …) ist druckspezifisch.
function loadOptions() {
  let own = {};
  try {
    own = JSON.parse(localStorage.getItem('printOptions') || '{}');
  } catch {
    /* Standardwerte */
  }
  const { paper, columns, margin } = loadSettings();
  return { ...DEFAULT_PRINT_OPTIONS, ...own, paper, columns, margin };
}

export function setupPrint({ repo, beforeOpen }) {
  const dlg = $('#print-dialog');
  const view = $('#print-view');
  const root = $('#print-root');
  let songs = [];
  let selected = new Set();
  let options = loadOptions();

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
    $('#pr-ok').disabled = selected.size === 0;
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
  }

  function readForm() {
    options = {
      title: $('#pr-title').value.trim(),
      subtitle: $('#pr-subtitle').value.trim(),
      cover: $('#pr-cover').checked,
      toc: $('#pr-toc').checked,
      useSavedTranspose: $('#pr-transpose').checked,
      paper: $('#pr-paper').value,
      columns: Number($('#pr-columns').value),
      margin: Math.min(40, Math.max(5, Number($('#pr-margin').value) || 15)),
    };
    const { paper, columns, margin, ...own } = options;
    localStorage.setItem('printOptions', JSON.stringify(own));
    options = { ...options, ...pickLayout(saveSettings({ ...loadSettings(), paper, columns, margin })) };
  }

  async function openDialog({ keepSelection = false } = {}) {
    await beforeOpen?.();
    options = loadOptions();
    songs = await repo.list();
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

  dlg.addEventListener('close', async () => {
    if (dlg.returnValue !== 'ok') return;
    readForm();
    await showPreview();
  });

  function fitZoom() {
    const page = root.querySelector('.page');
    if (!page) return;
    const avail = root.parentElement.clientWidth - 24;
    const zoom = Math.min(1, avail / page.offsetWidth);
    root.style.setProperty('--preview-zoom', zoom.toFixed(3));
  }

  // ---------- Schrift nur für den Druck ----------
  for (const id of ['#pv-lyricFont', '#pv-chordFont']) {
    $(id).replaceChildren(...Object.keys(FONTS).map((f) => {
      const o = new Option(f, f);
      o.style.fontFamily = FONTS[f];
      return o;
    }));
  }
  const fmtPt = (v) => `${String(v).replace('.', ',')} pt`;

  function printSettings() {
    return withPrintFonts(loadSettings(), loadPrintFonts());
  }

  function syncFontBar() {
    const s = printSettings();
    $('#pv-lyricFont').value = s.lyricFont;
    $('#pv-chordFont').value = s.chordFont;
    $('#pv-lyricSize').textContent = fmtPt(s.lyricSize);
    $('#pv-chordSize').textContent = fmtPt(s.chordSize);
    const custom = Object.keys(loadPrintFonts()).length > 0;
    $('#pv-font-reset').hidden = !custom;
    $('.pv-fonts').classList.toggle('custom', custom);
  }

  let relayoutTimer = 0;
  function changeFonts(patch) {
    savePrintFonts({ ...loadPrintFonts(), ...patch }, loadSettings());
    syncFontBar();
    // Schnell mehrmals tippen: erst danach neu setzen
    clearTimeout(relayoutTimer);
    relayoutTimer = setTimeout(() => showPreview({ keepPlace: true }), 250);
  }

  $('#pv-lyricFont').onchange = (e) => changeFonts({ lyricFont: e.target.value });
  $('#pv-chordFont').onchange = (e) => changeFonts({ chordFont: e.target.value });
  $('.pv-fonts').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-step]');
    if (!b) return;
    const key = b.dataset.step;
    changeFonts({ [key]: stepSize(key, printSettings()[key], Number(b.dataset.dir)) });
  });
  $('#pv-font-reset').onclick = () => {
    savePrintFonts({}, loadSettings());
    syncFontBar();
    showPreview({ keepPlace: true });
  };

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
    syncFontBar();
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
  async function printSongs(list, overrides = {}) {
    await beforeOpen?.();
    options = { ...loadOptions(), ...overrides };
    songs = list;
    selected = new Set(list.map((s) => s.id));
    await showPreview();
  }
  return { printSongs };
}
