// Neue Lieder anlegen – mit Nachfrage, wenn es Titel und Interpret schon gibt
// (eingefügter Text, Lesezeichen von Ultimate Guitar, ChordPro-/Textdateien).

import { findDuplicates } from '../core/song-list.js';
import { deriveSummary } from '../storage/repository.js';
import { repo } from './app-state.js';
import { $, el, ask } from './dom.js';
import { clearSearch } from './list.js';
import { flushSave, openSong } from './song.js';

const label = (s) => `${s.title || 'Ohne Titel'}${s.artist ? ' – ' + s.artist : ''}`;

/**
 * Fragt nach, was mit Liedern geschehen soll, die es schon gibt.
 * @param dups [{ title, artist }]
 * @returns {Promise<'copy'|'replace'|'skip'|'cancel'>}
 */
function askDuplicates(dups) {
  const one = dups.length === 1;
  $('#dup-text').textContent = one
    ? 'Dieses Lied gibt es schon im Liederbuch:'
    : `${dups.length} dieser Lieder gibt es schon im Liederbuch:`;
  $('#dup-list').replaceChildren(...dups.map((x) => el('li', { textContent: label(x) })));
  $('#dup-skip').textContent = one ? 'Nicht anlegen' : 'Diese überspringen';
  $('#dup-replace').textContent = one ? 'Vorhandenes ersetzen' : 'Vorhandene ersetzen';
  return ask('#dup-dialog');
}

/**
 * Lieder anlegen – vorher prüfen, ob es sie schon gibt (gleicher Titel und Interpret).
 * Das erste angelegte bzw. ersetzte Lied wird geöffnet.
 * @param items [{ chordpro, transpose?, accidentals?, note? }]
 * @returns {Promise<null | {firstId, created, replaced, skipped, message}>} null = abgebrochen
 */
export async function addSongs(items) {
  await flushSave();
  const existing = await repo.list();
  // nur gegen das vorhandene Liederbuch prüfen, nicht innerhalb des Imports
  const plan = items.map((it) => {
    const sum = deriveSummary(it.chordpro);
    return { it, sum, dup: findDuplicates(existing, sum)[0] || null };
  });
  const dups = plan.filter((p) => p.dup);
  let choice = 'copy';
  if (dups.length) {
    choice = await askDuplicates(dups.map((p) => p.sum));
    if (choice === 'cancel') return null;
  }
  let firstId = null;
  let created = 0;
  let replaced = 0;
  let skipped = 0;
  for (const { it, dup } of plan) {
    const extra = {};
    if (it.transpose) extra.transpose = it.transpose;
    if (it.accidentals && it.accidentals !== 'auto') extra.accidentals = it.accidentals;
    if (it.note) extra.note = it.note;
    if (dup && choice === 'skip') {
      skipped++;
    } else if (dup && choice === 'replace') {
      await repo.update(dup.id, { chordpro: it.chordpro, ...extra });
      firstId ||= dup.id;
      replaced++;
    } else {
      const rec = await repo.create(it.chordpro, extra);
      firstId ||= rec.id;
      created++;
    }
  }
  if (firstId) {
    clearSearch();
    await openSong(firstId);
  }
  const parts = [];
  if (created) parts.push(`${created} ${created === 1 ? 'Lied' : 'Lieder'} angelegt`);
  if (replaced) parts.push(`${replaced} ersetzt`);
  if (skipped) parts.push(`${skipped} übersprungen (gab es schon)`);
  return { firstId, created, replaced, skipped, message: parts.join(', ') };
}

/** Hinweis im Einfügen-Dialog: wie viele der erkannten Lieder es schon gibt. */
export function countDuplicates(existing, songs) {
  return songs.filter((s) => findDuplicates(existing, s).length).length;
}
