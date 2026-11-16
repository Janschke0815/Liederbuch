// Griffbild als SVG: 6 Saiten, 4–5 Bünde, ○ leer, × nicht anschlagen, Barré als Balken.

import { chordShape } from '../core/chord-shapes.js';

const NS = 'http://www.w3.org/2000/svg';
const svgEl = (tag, attrs) => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
};

/** Barré: tiefster gegriffener Bund über mehrere Saiten, durchgehend greifbar. */
function findBarre(frets) {
  const fretted = frets.filter((f) => f > 0);
  if (!fretted.length) return null;
  const low = Math.min(...fretted);
  const idx = frets.map((f, i) => (f === low ? i : -1)).filter((i) => i >= 0);
  if (idx.length < 2) return null;
  const from = idx[0];
  const to = idx[idx.length - 1];
  for (let i = from; i <= to; i++) if (frets[i] < low) return null; // leer/gedämpft dazwischen
  return to - from >= 2 ? { fret: low, from, to } : null;
}

/**
 * Griffbild (SVG) für einen Akkord, oder null, wenn kein Griff bekannt ist.
 * @returns {HTMLElement | null}
 */
export function chordDiagram(name) {
  const shape = chordShape(name);
  if (!shape) return null;
  const { frets } = shape;
  const fretted = frets.filter((f) => f > 0);
  const max = fretted.length ? Math.max(...fretted) : 0;
  const min = fretted.length ? Math.min(...fretted) : 1;
  const base = max <= 4 ? 1 : min;
  const rows = Math.max(4, max - base + 1);

  const W = 50;
  const left = 9;
  const top = 12;
  const sx = 6.4; // Saitenabstand
  const fy = 9; // Bundabstand
  const H = top + rows * fy + 4;
  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, 'aria-hidden': 'true' });

  // Bundstäbchen und Saiten
  for (let j = 0; j <= rows; j++) {
    const y = top + j * fy;
    svg.append(svgEl('line', { x1: left, x2: left + 5 * sx, y1: y, y2: y, stroke: 'currentColor', 'stroke-width': j === 0 && base === 1 ? 2.4 : 0.6 }));
  }
  for (let i = 0; i < 6; i++) {
    const x = left + i * sx;
    svg.append(svgEl('line', { x1: x, x2: x, y1: top, y2: top + rows * fy, stroke: 'currentColor', 'stroke-width': 0.6 }));
  }
  if (base > 1) {
    const t = svgEl('text', { x: left - 2.5, y: top + fy * 0.5 + 2.6, 'text-anchor': 'end', 'font-size': 7, fill: 'currentColor' });
    t.textContent = String(base);
    svg.append(t);
  }

  const barre = findBarre(frets);
  if (barre) {
    const y = top + (barre.fret - base + 0.5) * fy;
    svg.append(svgEl('rect', {
      x: left + barre.from * sx - 2.6, y: y - 2.6, width: (barre.to - barre.from) * sx + 5.2, height: 5.2, rx: 2.6, class: 'cd-dot',
    }));
  }
  frets.forEach((f, i) => {
    const x = left + i * sx;
    if (f < 0) {
      const t = svgEl('text', { x, y: top - 3, 'text-anchor': 'middle', 'font-size': 7, fill: 'currentColor' });
      t.textContent = '×';
      svg.append(t);
    } else if (f === 0) {
      svg.append(svgEl('circle', { cx: x, cy: top - 5, r: 2, fill: 'none', stroke: 'currentColor', 'stroke-width': 0.7 }));
    } else if (!(barre && f === barre.fret && i >= barre.from && i <= barre.to)) {
      svg.append(svgEl('circle', { cx: x, cy: top + (f - base + 0.5) * fy, r: 2.6, class: 'cd-dot' }));
    }
  });

  const box = document.createElement('figure');
  box.className = 'chord-diagram';
  const cap = document.createElement('figcaption');
  cap.textContent = name;
  box.append(cap, svg);
  return box;
}
