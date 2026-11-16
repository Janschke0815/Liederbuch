// Lied teilen: über das Teilen-Menü des Geräts, als ChordPro-Datei, als Text oder als PDF –
// jeweils in der aktuellen Transposition.

import { transposeChordPro, chordproToText } from '../formats/export-text.js';
import { toWindowsText } from '../formats/file-format.js';
import { loadSettings } from '../settings/settings.js';
import { state } from './app-state.js';
import { $, closeOnBackdrop, download, toast } from './dom.js';
import { editor, flushSave } from './song.js';
import { printSong } from './song-actions.js';

const dialog = $('#share-dialog');

function currentExport() {
  const { current } = state;
  const t = current.transpose || 0;
  const acc = current.accidentals || 'auto';
  const name = (current.title || 'Lied').replace(/[\/:*?"<>|]+/g, '').trim() || 'Lied';
  return {
    name,
    chordpro: transposeChordPro(editor.value, t, acc),
    text: chordproToText(editor.value, t, acc, { harpLayout: loadSettings().harpLayout }),
  };
}
const asFile = ({ name, chordpro }) => new File([chordpro], `${name}.cho`, { type: 'text/plain' });

$('#btn-share').onclick = async () => {
  if (!state.current) return toast('Kein Lied geöffnet');
  await flushSave();
  $('#share-title').textContent = state.current.title || 'Ohne Titel';
  $('#share-native').hidden = !navigator.canShare?.({ files: [asFile(currentExport())] }) && !navigator.share;
  dialog.showModal();
};
$('#share-native').onclick = async () => {
  const exp = currentExport();
  const file = asFile(exp);
  try {
    if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: exp.name, text: exp.name });
    else await navigator.share({ title: exp.name, text: exp.text });
    dialog.close();
  } catch (err) {
    if (err.name !== 'AbortError') toast(`Teilen nicht möglich: ${err.message}`);
  }
};
$('#share-file').onclick = () => {
  const { name, chordpro } = currentExport();
  download(`${name}.cho`, toWindowsText(chordpro));
  dialog.close();
};
$('#share-text').onclick = async () => {
  try {
    await navigator.clipboard.writeText(currentExport().text);
    toast('Text kopiert – zum Einfügen eine Schrift mit fester Breite verwenden, damit die Akkorde passen');
  } catch {
    toast('Kopieren nicht erlaubt – bitte die ChordPro-Datei nehmen');
  }
  dialog.close();
};
$('#share-pdf').onclick = async () => {
  dialog.close();
  await printSong({ ...state.current, chordpro: editor.value });
};
closeOnBackdrop(dialog);
