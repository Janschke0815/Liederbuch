// Werkzeuge an der Vorschau: Vergrößern/Verkleinern und Metronom (Klick auf Takt/Tempo).

import { metronome, beatsPerBar } from '../metronome.js';
import { prefs } from '../prefs.js';
import { $, $$, toast } from './dom.js';
import { preview } from './song.js';

// ---------- Zoom der Vorschau ----------

let viewZoom = prefs.get('viewZoom');
/** Aktuelle Vergrößerung der Vorschau (1 = 100 %). */
export const getViewZoom = () => viewZoom;

/** Vorschau vergrößern/verkleinern (60–250 %), wird gemerkt. */
export function setViewZoom(z) {
  viewZoom = Math.min(2.5, Math.max(0.6, Math.round(z * 10) / 10));
  prefs.set('viewZoom', viewZoom);
  preview.style.setProperty('--view-zoom', String(viewZoom));
  $('#zoom-reset').textContent = `${Math.round(viewZoom * 100)} %`;
}
$('#zoom-in').onclick = () => setViewZoom(viewZoom + 0.1);
$('#zoom-out').onclick = () => setViewZoom(viewZoom - 0.1);
$('#zoom-reset').onclick = () => setViewZoom(1);
setViewZoom(viewZoom);

// ---------- Metronom ----------

/** Metronom im Tempo des Liedes an/aus (ohne Tempo: 100 bpm). */
export function toggleMetronome() {
  const chip = $('#time-chip');
  const on = metronome.toggle(Number(chip.dataset.tempo) || 100, beatsPerBar(chip.dataset.time));
  chip.setAttribute('aria-pressed', String(on));
  if (on && !chip.dataset.tempo) toast('Kein Tempo angegeben – Metronom läuft mit 100 bpm (unter „Liedinfo“ einstellbar)');
}
$('#time-chip').onclick = toggleMetronome;

// Schlag sichtbar machen (auch am Knopf im Spielmodus)
addEventListener('metronome-beat', (e) => {
  for (const node of $$('#time-chip[aria-pressed="true"], #pl-metro[aria-pressed="true"]')) {
    node.classList.remove('beat', 'beat-1');
    void node.offsetWidth; // Animation neu starten
    node.classList.add(e.detail === 0 ? 'beat-1' : 'beat');
  }
});
metronome.onBeat = (b) => dispatchEvent(new CustomEvent('metronome-beat', { detail: b }));
