// Metronom mit Web Audio: genaue Zeitplanung (vorausplanen statt setInterval-Klicks),
// betonte Eins je nach Taktart.

/** "3/4" -> 3, "6/8" -> 2 (punktierte Viertel), sonst 4 */
export function beatsPerBar(time) {
  const m = /^(\d{1,2})\s*\/\s*(\d{1,2})$/.exec(String(time || '').trim());
  if (!m) return 4;
  const [n, d] = [Number(m[1]), Number(m[2])];
  if (d === 8 && n % 3 === 0 && n > 3) return n / 3; // 6/8, 9/8, 12/8 in Gruppen
  return n || 4;
}

/** Ein Metronom für die ganze App (Vorschau und Spielmodus teilen es). */
export class Metronome {
  constructor() {
    this.ctx = null;
    this.running = false;
    this.bpm = 100;
    this.beats = 4;
    this.onBeat = null; // (beatIndex) => void, für die Anzeige
  }

  start(bpm = 100, beats = 4) {
    this.bpm = Math.min(300, Math.max(20, Number(bpm) || 100));
    this.beats = beats;
    this.ctx ||= new (window.AudioContext || window.webkitAudioContext)();
    this.ctx.resume?.();
    this.running = true;
    this.beat = 0;
    this.next = this.ctx.currentTime + 0.05;
    clearInterval(this.timer);
    this.timer = setInterval(() => this.#schedule(), 25);
    this.#schedule();
  }

  stop() {
    this.running = false;
    clearInterval(this.timer);
  }

  toggle(bpm, beats) {
    if (this.running) this.stop();
    else this.start(bpm, beats);
    return this.running;
  }

  #schedule() {
    while (this.next < this.ctx.currentTime + 0.12) {
      this.#click(this.next, this.beat % this.beats === 0);
      const b = this.beat % this.beats;
      const delay = Math.max(0, (this.next - this.ctx.currentTime) * 1000);
      setTimeout(() => this.running && this.onBeat?.(b), delay);
      this.next += 60 / this.bpm;
      this.beat++;
    }
  }

  #click(at, accent) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.value = accent ? 1600 : 1000;
    gain.gain.setValueAtTime(accent ? 0.5 : 0.3, at);
    gain.gain.exponentialRampToValueAtTime(0.001, at + 0.05);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(at);
    osc.stop(at + 0.06);
  }
}

export const metronome = new Metronome();
