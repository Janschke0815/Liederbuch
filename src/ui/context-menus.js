// Kontextmenüs (Rechtsklick / langes Drücken) für Lieder in der Liste und für die Vorschau,
// außerdem Doppelklick (spielen) und Entf (löschen) in der Liste.

import { attachContextMenu } from '../context-menu.js';
import { loadSettings, saveSettings } from '../settings/settings.js';
import { myBook } from '../books.js';
import { readOnly, repo, state } from './app-state.js';
import { $, isMobile } from './dom.js';
import { listEl } from './list.js';
import { selection, startSelection } from './list-select.js';
import { getViewZoom, setViewZoom } from './preview-tools.js';
import { editor, openSong, setViewOption, songHasHarp } from './song.js';
import { copySongsTo, deleteSong, duplicateSong, editSong, playSong, printSong, setlistMenu } from './song-actions.js';
import { openCapoHelp } from './capo-help.js';
import { openHarpHelp } from './harp-help.js';
import { shareSong } from './share.js';
import { setView } from './view.js';

/** Abo: „In ‚Mein Liederbuch' kopieren“. */
const copyMineItem = (song) => ({
  label: `In „${myBook().name}“ kopieren`, icon: 'paste', action: () => copySongsTo([song], myBook()),
});
/** Lieder für das Setlisten-Menü: frisch aus der Datenbank, falls inzwischen geändert. */
const songsById = (id) => async () => [await repo.get(id)].filter(Boolean);

attachContextMenu(listEl, '.song-item', async (btn) => {
  const id = btn.dataset.id;
  const song = await repo.get(id);
  if (!song) return null;
  if (readOnly) {
    return [
      { label: 'Öffnen', icon: 'eye', action: async () => { await openSong(id); if (isMobile()) setView('preview'); } },
      { label: 'Spielen', icon: 'stage', hint: 'Doppelklick', action: () => playSong(id) },
      { label: 'Auswählen', icon: 'select', hint: 'Strg+Klick', action: () => startSelection(id) },
      '-',
      copyMineItem(song),
      { label: 'Drucken / PDF', icon: 'print', action: () => printSong(song) },
    ];
  }
  return [
    { label: 'Öffnen', icon: 'eye', action: async () => { await openSong(id); if (isMobile()) setView('preview'); } },
    { label: 'Bearbeiten', icon: 'edit', action: async () => { await openSong(id); editSong(); } },
    { label: 'Spielen', icon: 'stage', hint: 'Doppelklick', action: () => playSong(id) },
    { label: 'Auswählen', icon: 'select', hint: 'Strg+Klick', action: () => startSelection(id) },
    '-',
    await setlistMenu(songsById(id)),
    { label: 'Duplizieren', icon: 'paste', action: () => duplicateSong(id) },
    { label: 'Teilen …', icon: 'share', action: async () => { await openSong(id); shareSong(); } },
    { label: 'Drucken / PDF', icon: 'print', action: () => printSong(song) },
    '-',
    { label: 'Löschen', icon: 'trash', danger: true, hint: 'Entf', action: () => deleteSong(id) },
  ];
}, { title: (btn) => btn.querySelector('.song-item-title').textContent });

// Doppelklick spielt, Entf löscht (mit Rückgängig)
listEl.addEventListener('dblclick', async (e) => {
  const btn = e.target.closest('.song-item');
  if (!btn || selection.active) return; // im Auswahlmodus nur markieren
  if (e.ctrlKey || e.metaKey || e.shiftKey) return;
  playSong(btn.dataset.id);
});
listEl.addEventListener('keydown', (e) => {
  const btn = e.target.closest('.song-item');
  if (btn && (e.key === 'Delete' || e.key === 'Backspace')) {
    e.preventDefault();
    deleteSong(btn.dataset.id);
  }
});

/** Ein-/Ausschalter einer Anzeige-Einstellung als Menüpunkt. */
const toggleItem = (s, label, key, extra = {}) => ({
  label, checked: s[key], action: () => saveSettings({ ...s, [key]: !s[key] }), ...extra,
});

attachContextMenu($('.preview-scroll'), '#preview', async () => {
  const { current } = state;
  if (!current) return null;
  const t = current.transpose || 0;
  const acc = current.accidentals || 'auto';
  const s = loadSettings();
  const zoom = getViewZoom();
  return [
    { label: 'Halbton höher', icon: 'plus', hint: '+', action: () => setViewOption({ transpose: t + 1 }) },
    { label: 'Halbton tiefer', hint: '−', action: () => setViewOption({ transpose: t - 1 }) },
    { label: 'Originaltonart', disabled: t === 0, action: () => setViewOption({ transpose: 0 }) },
    {
      label: 'Schreibweise',
      items: [['auto', 'automatisch'], ['sharp', 'mit ♯'], ['flat', 'mit ♭']].map(([v, l]) => ({
        label: l, checked: acc === v, action: () => setViewOption({ accidentals: v }),
      })),
    },
    { label: 'Capo-Hilfe …', action: openCapoHelp },
    ...(songHasHarp() ? [{ label: 'Harp-Hilfe …', action: openHarpHelp }] : []),
    '-',
    { label: 'Spielen', icon: 'stage', hint: 'F', action: () => playSong() },
    ...(readOnly ? [] : [{ label: 'Bearbeiten', icon: 'edit', action: editSong }]),
    {
      label: 'Anzeigen',
      items: [
        toggleItem(s, 'Gitarren-Akkorde', 'showChords'),
        toggleItem(s, 'Griffbilder', 'showDiagrams', { disabled: !s.showChords }),
        toggleItem(s, 'Mundharmonika-Tabs', 'showHarp'),
        {
          label: 'Harp-Tabs in eigener Zeile',
          checked: s.harpLayout === 'split',
          disabled: !s.showHarp,
          action: () => saveSettings({ ...s, harpLayout: s.harpLayout === 'split' ? 'inline' : 'split' }),
        },
        toggleItem(s, 'Gitarren-Tabs', 'showTabs'),
        toggleItem(s, 'Noten', 'showAbc'),
      ],
    },
    {
      label: 'Größe',
      items: [
        { label: 'Größer', icon: 'plus', action: () => setViewZoom(zoom + 0.1) },
        { label: 'Kleiner', action: () => setViewZoom(zoom - 0.1) },
        { label: 'Originalgröße', disabled: zoom === 1, action: () => setViewZoom(1) },
      ],
    },
    '-',
    await setlistMenu(songsById(current.id)),
    readOnly && copyMineItem(current),
    { label: 'Teilen …', icon: 'share', action: shareSong },
    { label: 'Drucken / PDF', icon: 'print', action: () => printSong({ ...current, chordpro: editor.value }) },
  ];
}, { title: () => state.current?.title || '' });
