// Dateien öffnen (Sicherung als ZIP oder JSON, ChordPro- und Textdateien) und Sichern als ZIP.
// Dateien kommen aus dem Dateidialog, per Ziehen & Ablegen oder per „Öffnen mit Liederbuch“.

import { backupFiles, backupJson, applyZipEdits } from '../formats/backup.js';
import { fileToSong } from '../formats/chordpro-files.js';
import { parseImportFile } from '../formats/file-import.js';
import { createZip, readZip, isZip } from '../formats/zip.js';
import { EXPORT_FORMAT, EXPORT_VERSION, deriveSummary } from '../storage/repository.js';
import { slimSetlist } from '../storage/setlists.js';
import { repo, sets, state, services } from './app-state.js';
import { $, el, download, toast } from './dom.js';
import { addSongs } from './add-songs.js';
import { flushSave, openSong } from './song.js';

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/** Sicherung (JSON) übernehmen: Lieder, Papierkorb, Setlisten. */
async function importBackup(name, data) {
  const r = await repo.importData(data);
  const nSets = await sets.importRecords(data.setlists);
  const parts = [`${r.added} neu`, `${r.updated} aktualisiert`, `${r.skipped} übersprungen`];
  if (r.trash) parts.push(`${r.trash} im Papierkorb`);
  if (nSets) parts.push(plural(nSets, 'Setliste', 'Setlisten'));
  return `${name}: ${parts.join(', ')}`;
}

/** Aktueller Stand des Liederbuchs wie in der Sicherung (Lieder + Setlisten). */
async function bookData() {
  const data = await repo.exportData();
  data.setlists = (await sets.allRecords()).filter((s) => !s.deletedAt).map(slimSetlist);
  return data;
}

/**
 * ZIP öffnen: erst die JSON-Sicherung (falls vorhanden), dann die .cho-/.txt-Dateien abgleichen –
 * mit der JSON bzw. ohne sie mit dem aktuellen Liederbuch. Von Hand geänderte Dateien gewinnen,
 * neue werden angelegt, nichts wird gelöscht.
 * @returns {{message: string, report: {edited: string[], added: string[], setlists: string[]}}}
 */
async function importZip(name, entries) {
  const json = backupJson(entries);
  const parts = [];
  if (json) parts.push(await importBackup(name, json));
  const now = await bookData(); // nach dem Übernehmen der JSON
  const edits = applyZipEdits(entries, json || now, new Date().toISOString(), now);
  // für den Bericht: welche Lieder und Setlisten geändert bzw. neu sind
  const known = new Set(now.songs.map((x) => x.id));
  const label = (cp) => {
    const sum = deriveSummary(cp);
    return `${sum.title || 'Ohne Titel'}${sum.artist ? ' – ' + sum.artist : ''}`;
  };
  const report = {
    edited: edits.songs.filter((x) => known.has(x.id)).map((x) => label(x.chordpro)),
    added: edits.songs.filter((x) => !known.has(x.id)).map((x) => label(x.chordpro)),
    setlists: edits.setlists.map((x) => x.name || 'Setliste'),
  };
  if (edits.songs.length) await repo.importData({ format: EXPORT_FORMAT, version: EXPORT_VERSION, songs: edits.songs });
  if (edits.setlists.length) await sets.importRecords(edits.setlists);
  const what = [];
  if (edits.edited) what.push(`${plural(edits.edited, 'Lied', 'Lieder')} aus geänderten .cho-Dateien`);
  if (edits.added) what.push(`${edits.added} neue${edits.added === 1 ? 's Lied' : ' Lieder'} aus .cho-Dateien`);
  if (edits.setlistsChanged) what.push(`${plural(edits.setlistsChanged, 'Setliste', 'Setlisten')} aus .txt-Dateien`);
  if (what.length) parts.push(json ? `außerdem ${what.join(', ')}` : `${name}: ${what.join(', ')}`);
  else if (!json) parts.push(`${name}: keine Änderungen`);
  return { message: parts.join(' · '), report };
}

const emptyReport = () => ({ edited: [], added: [], setlists: [] });
const reportSize = (r) => r.edited.length + r.added.length + r.setlists.length;

/** Nach dem Öffnen einer ZIP: was aus den Dateien übernommen wurde. */
function showImportReport(summary, report) {
  $('#report-summary').textContent = summary;
  const body = $('#report-body');
  body.replaceChildren();
  const groups = [['Geändert (von Hand bearbeitete .cho-Dateien)', report.edited], ['Neu angelegt', report.added], ['Setlisten', report.setlists]];
  for (const [title, items] of groups) {
    if (!items.length) continue;
    body.append(
      el('h3', { textContent: `${title}: ${items.length}` }),
      el('ul', { className: 'report-list' }, ...items.map((t) => el('li', { textContent: t }))),
    );
  }
  $('#report-dialog').showModal();
}

/** Importiert Dateien (Sicherung, ZIP, ChordPro, Text). */
export async function importFiles(files) {
  await flushSave();
  const songFiles = []; // einzelne Lieder aus ChordPro-/Textdateien – zusammen auf Doppel prüfen
  const messages = [];
  const report = emptyReport();
  for (const file of files) {
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (isZip(bytes)) {
        const r = await importZip(file.name, await readZip(bytes));
        messages.push(r.message);
        for (const k of Object.keys(report)) report[k].push(...r.report[k]);
        continue;
      }
      const parsed = parseImportFile(file.name, new TextDecoder().decode(bytes));
      if (parsed.kind === 'backup') messages.push(await importBackup(file.name, parsed.data));
      // {transpose}, {x_notiz} … werden zu Einstellungen des Liedes
      else for (const cp of parsed.songs) songFiles.push(fileToSong(cp));
    } catch (err) {
      messages.push(`${file.name}: ${err.message}`);
    }
  }
  const added = songFiles.length ? await addSongs(songFiles) : null; // öffnet das erste neue Lied
  if (added?.message) messages.unshift(added.message);
  if (!added?.firstId) {
    // geöffnetes Lied neu laden – es kann durch die Sicherung geändert oder gelöscht worden sein
    const id = state.current && (await repo.get(state.current.id)) ? state.current.id : (await repo.list())[0]?.id;
    await openSong(id);
  }
  if (reportSize(report)) showImportReport(messages.join(' · '), report);
  else toast(messages.join(' · ') || 'Nichts importiert');
}

// Dateidialog
$('#btn-open').onclick = () => $('#file-input').click();
$('#file-input').onchange = async (e) => {
  const files = [...e.target.files];
  e.target.value = '';
  await importFiles(files);
};

// Ziehen & Ablegen
const drop = $('#drop-zone');
let dragDepth = 0;
const hasFiles = (e) => [...(e.dataTransfer?.types || [])].includes('Files');
addEventListener('dragenter', (e) => {
  if (!hasFiles(e)) return;
  dragDepth++;
  drop.hidden = false;
});
addEventListener('dragleave', (e) => {
  if (!hasFiles(e)) return;
  if (--dragDepth <= 0) {
    dragDepth = 0;
    drop.hidden = true;
  }
});
addEventListener('dragover', (e) => hasFiles(e) && e.preventDefault());
addEventListener('drop', async (e) => {
  if (!hasFiles(e)) return;
  e.preventDefault();
  dragDepth = 0;
  drop.hidden = true;
  await importFiles([...e.dataTransfer.files]);
});

// Installierte App: Dateien per "Öffnen mit Liederbuch" (Desktop-Chrome/Edge)
if ('launchQueue' in window) {
  window.launchQueue.setConsumer(async (params) => {
    if (!params.files?.length) return;
    await services.started;
    await importFiles(await Promise.all(params.files.map((h) => h.getFile())));
  });
}

// Sichern: eine ZIP-Datei mit lesbaren ChordPro-Dateien, Setlisten und vollständiger JSON
$('#btn-export').onclick = async () => {
  await flushSave();
  const data = await bookData();
  download(`Liederbuch-${new Date().toISOString().slice(0, 10)}.zip`, new Blob([createZip(backupFiles(data))], { type: 'application/zip' }));
  const n = data.setlists.length;
  toast(`${plural(data.songs.length, 'Lied', 'Lieder')}${n ? ` und ${plural(n, 'Setliste', 'Setlisten')}` : ''} gesichert`);
};
