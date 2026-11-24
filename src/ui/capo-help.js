// Capo-Hilfe: schlägt Capo-Lagen vor, in denen das Lied mit möglichst einfachen Griffen klingt wie
// bisher. Wählt man eine, ändern sich {capo} im Text und die Transposition – der Klang bleibt.

import { parseChordPro } from '../core/chordpro.js';
import { transposeChord } from '../core/chords.js';
import { capoOptions } from '../core/capo.js';
import { setMeta } from '../core/meta-edit.js';
import { usedChords } from '../render/song-view.js';
import { state } from './app-state.js';
import { $, el, closeOnBackdrop, toast } from './dom.js';
import { editor, setEditorText, setViewOption } from './song.js';

const dialog = $('#capo-dialog');

function optionButton(o, capoOld) {
  const b = el('button', { type: 'button' },
    el('span', { className: 'capo-pos', textContent: o.capo ? `Capo ${o.capo}` : 'ohne Capo' }),
    el('span', { className: 'capo-chords', textContent: o.chords.join('  ') }),
    el('span', {
      className: 'capo-score',
      textContent: (o.easy === o.total ? 'alle einfach' : `${o.easy} von ${o.total} einfach`) + (o.capo === capoOld ? ' · jetzt' : ''),
    }));
  if (o.capo === capoOld) b.classList.add('current');
  if (o.easy === o.total) b.classList.add('easy-all');
  b.onclick = async () => {
    dialog.close();
    if (o.capo === capoOld) return;
    const transpose = state.current.transpose + capoOld - o.capo;
    setEditorText(setMeta(editor.value, 'capo', o.capo ? String(o.capo) : ''), false);
    await setViewOption({ transpose });
    toast(o.capo ? `Capo in den ${o.capo}. Bund – Griffe angepasst, Klang bleibt gleich` : 'Ohne Capo – Griffe angepasst');
  };
  return b;
}

/** Capo-Hilfe für das geöffnete Lied. */
export function openCapoHelp() {
  if (!state.current) return;
  const song = parseChordPro(editor.value);
  const capoOld = Number(song.meta.capo) || 0;
  // klingende Akkorde = angezeigte (transponierte) Griffe + bisheriger Capo
  const sounding = usedChords(song).map((c) => transposeChord(c, state.current.transpose + capoOld, false));
  if (!sounding.length) return toast('Im Lied stehen noch keine Akkorde');
  const all = capoOptions(sounding);
  const shown = all.slice(0, 4);
  const now = all.find((o) => o.capo === capoOld);
  if (now && !shown.includes(now)) shown.push(now);
  $('#capo-options').replaceChildren(...shown.map((o) => el('li', {}, optionButton(o, capoOld))));
  dialog.showModal();
}
$('#btn-capo-help').onclick = openCapoHelp;
closeOnBackdrop(dialog);
