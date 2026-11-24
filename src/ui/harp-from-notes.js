// „Harp“ am Notenabschnitt der Vorschau: Melodie in Mundharmonika-Tabs umwandeln (core/harp-melody.js).
// Der Dialog schlägt die passende Harp vor, zeigt das Ergebnis und fügt es als eigenen Abschnitt
// hinter die Noten in den Liedtext ein (mit Rückgängig im Editor).

import { harpTabsFromAbc, rankHarpKeys } from '../core/harp-melody.js';
import { parseChordPro } from '../core/chordpro.js';
import { renderSong } from '../render/song-view.js';
import { applySettings, loadSettings } from '../settings/settings.js';
import { readOnly, state } from './app-state.js';
import { $, closeOnBackdrop, el, toast } from './dom.js';
import { insertText } from './snippets.js';
import { editor, preview } from './song.js';
import { editSong } from './song-actions.js';

const dlg = $('#harp-dialog');
let current = null; // { abc, index, transpose }

/** Kurzbeschreibung einer Harp für die Auswahl: „alles ohne Bending“, „3 Bendings“, „2 Töne fehlen“. */
function describe(r) {
  const parts = [];
  if (r.missing) parts.push(`${r.missing} ${r.missing === 1 ? 'Ton fehlt' : 'Töne fehlen'}`);
  if (r.bends) parts.push(`${r.bends} Bending${r.bends === 1 ? '' : 's'}`);
  if (r.overs) parts.push(`${r.overs} Overblow${r.overs === 1 ? '' : 's'}`);
  return parts.join(', ') || 'alles ohne Bending';
}

function result() {
  return harpTabsFromAbc(current.abc, Number($('#harp-key').value), current.transpose);
}

function showResult() {
  const r = result();
  const name = $('#harp-key').selectedOptions[0]?.dataset.name;
  const octave = { 12: ' · eine Oktave höher als notiert', 24: ' · zwei Oktaven höher als notiert', '-12': ' · eine Oktave tiefer als notiert', '-24': ' · zwei Oktaven tiefer als notiert' }[r.octave] || '';
  $('#harp-info').textContent = `${r.count} Töne auf der ${name}-Harp${octave}.${r.missing ? ' „?“ = gibt es auf dieser Harp nicht.' : ''}`;
  const box = $('#harp-preview');
  applySettings(box, { ...loadSettings(), showHarp: true });
  box.replaceChildren(renderSong(parseChordPro(r.text || ' ')).querySelector('.song-body'));
}

/** Dialog für den index-ten Notenabschnitt des geöffneten Liedes. */
function open(abc, index) {
  current = { abc, index, transpose: state.current?.transpose || 0 };
  const ranked = rankHarpKeys(abc, current.transpose);
  $('#harp-key').replaceChildren(...ranked.map((r, i) => {
    const o = new Option(`${r.name}-Harp – ${describe(r)}${i === 0 ? ' (empfohlen)' : ''}`, String(r.key));
    o.dataset.name = r.name;
    return o;
  }));
  showResult();
  dlg.showModal();
}
$('#harp-key').onchange = showResult;

/** Ende des index-ten Notenabschnitts im Liedtext (Position hinter der Zeile {end_of_abc}). */
function afterAbcBlock(text, index) {
  const re = /^[ \t]*\{\s*(end_of_abc|eoa)\s*\}[^\n]*$/gim;
  let m;
  let n = 0;
  while ((m = re.exec(text))) {
    if (n++ === index) return m.index + m[0].length;
  }
  return text.length;
}

$('#harp-ok').onclick = (e) => {
  e.preventDefault();
  const r = result();
  const name = $('#harp-key').selectedOptions[0]?.dataset.name;
  dlg.close();
  editSong(); // Editor zeigen, damit Einfügen und Rückgängig dort passieren
  const at = afterAbcBlock(editor.value, current.index);
  editor.setSelectionRange(at, at);
  const block = `\n\n{start_of_part: Melodie (${name}-Harp)}\n${r.text}\n{end_of_part}`;
  insertText(block, 2, block.length);
  toast(`Harp-Tabs für die ${name}-Harp eingefügt${r.missing ? ` – ${r.missing} Töne gibt es darauf nicht („?“)` : ''}`);
};
closeOnBackdrop(dlg);

// Knopf „Harp“ neben ▶ an jedem Notenabschnitt der Vorschau (nicht in Abos, Druck, Spielmodus)
addEventListener('previewrendered', () => {
  if (readOnly) return;
  preview.querySelectorAll('.block--abc').forEach((section, index) => {
    const label = section.querySelector('.block-label');
    const score = section.querySelector('.abc-score');
    if (!label || !score || label.querySelector('.abc-harp')) return;
    const btn = el('button', { type: 'button', className: 'abc-harp', textContent: 'Harp', title: 'Melodie als Mundharmonika-Tabs in den Liedtext einfügen' });
    btn.onclick = (e) => {
      e.stopPropagation();
      if (!score.dataset.abc) return toast('Keine Noten gefunden');
      open(score.dataset.abc, index);
    };
    label.append(btn);
  });
});
