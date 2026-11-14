// Druckdialog (Auswahl + Optionen) und Druckvorschau.

import { buildSongbook, DEFAULT_PRINT_OPTIONS, PAPER } from './print/songbook.js';
import { normalize } from './storage/repository.js';
import { loadSettings, saveSettings, applySettings } from './settings/settings.js';

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

  async function showPreview() {
    view.hidden = false;
    root.style.setProperty('--preview-zoom', '1'); // Messen nur in Originalgröße
    applySettings(root, loadSettings());
    $('#pv-info').textContent = 'Seiten werden gesetzt …';
    const chosen = songs.filter((s) => selected.has(s.id)); // bereits alphabetisch
    const result = await buildSongbook(root, chosen, options);
    fitZoom();
    const warn = result.overflows ? ` · ${result.overflows}× zu groß für eine Seite (abgeschnitten)` : '';
    $('#pv-info').textContent = `${chosen.length} ${chosen.length === 1 ? 'Lied' : 'Lieder'}, ${result.pages} Seiten (${options.paper})${warn}`;
    setPageSize();
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
}
