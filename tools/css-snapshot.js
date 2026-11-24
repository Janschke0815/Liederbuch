// Werkzeug für Umbauten am CSS: hält die berechneten Stile aller Elemente in mehreren Ansichten
// fest, damit man vorher/nachher vergleichen kann. In der Browser-Konsole der App laden:
//   const { snapshot, compare } = await import('/tools/css-snapshot.js');
//   const vorher = await snapshot();   … CSS ändern, Seite neu laden …
//   compare(vorher, await snapshot()) // -> Liste der Unterschiede
//
// Wichtig: vor JEDER Aufnahme die Seite neu laden und dieselbe Fenstergröße nehmen. Zwei Aufnahmen
// ohne Neuladen unterscheiden sich in tausenden Stellen (beim ersten Öffnen erzeugte Inhalte, offene
// Zustände) – das ist dann kein CSS-Unterschied. Beides prüft das Werkzeug und warnt.

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const META = '__meta';
let taken = false; // schon eine Aufnahme seit dem Laden der Seite?

function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36);
}

/** Pfad eines Elements: ab dem nächsten Vorfahren mit id, je Stufe Tag und Position unter Geschwistern. */
function pathOf(el, cache) {
  if (el === document.body) return '';
  if (cache.has(el)) return cache.get(el);
  let p;
  if (el.id) p = `#${el.id}`;
  else {
    let i = 0;
    for (let s = el.previousElementSibling; s; s = s.previousElementSibling) if (s.tagName === el.tagName) i++;
    p = `${pathOf(el.parentElement, cache)}>${el.tagName}[${i}]`;
  }
  cache.set(el, p);
  return p;
}

/** Stile aller Elemente: Schlüssel = Pfad im Dokument, Wert = Prüfsumme der Stile. */
function capture(label, out) {
  const cache = new Map();
  for (const el of document.querySelectorAll('body *')) {
    if (el.closest('svg') && el.tagName !== 'svg') continue;
    const cs = getComputedStyle(el);
    let s = '';
    for (const p of cs) if (!p.startsWith('transition') && !p.startsWith('animation')) s += `${p}:${cs.getPropertyValue(p)};`;
    out[`${label}|${pathOf(el, cache)}`] = hash(s);
  }
}

/** Mehrere Ansichten nacheinander öffnen und festhalten. */
export async function snapshot() {
  if (taken) console.warn('css-snapshot: schon eine Aufnahme seit dem Laden – Seite neu laden, sonst ist der Vergleich verrauscht');
  taken = true;
  const out = { [META]: `${innerWidth}x${innerHeight}@${devicePixelRatio}` };
  const $ = (s) => document.querySelector(s);
  // ohne Übergänge – sonst erwischt man Farben mitten im Wechsel
  const still = document.head.appendChild(document.createElement('style'));
  still.textContent = '*, *::before, *::after { transition: none !important; animation: none !important; }';
  (document.activeElement || document.body).blur?.();
  const closeAll = () => document.querySelectorAll('dialog[open]').forEach((d) => d.close());
  for (const view of ['list', 'editor', 'preview']) {
    $(`.mobile-tabs [data-view=${view}]`).click();
    await wait(150);
    capture(`view-${view}`, out);
  }
  // Akkorde per Antippen: am Handy Bearbeiten → „Akkorde“, am PC der Knopf über der Vorschau
  const chordsBtn = $('.edit-mode [data-edit=chords]');
  $('.mobile-tabs [data-view=editor]').click();
  await wait(150);
  if (chordsBtn?.offsetParent) {
    chordsBtn.click();
    await wait(200);
    capture('edit-chords', out);
    $('.edit-mode [data-edit=text]').click();
  } else if ($('#btn-chordtap')?.offsetParent) {
    $('#btn-chordtap').click();
    await wait(200);
    capture('chordtap', out);
    $('#btn-chordtap').click();
  }
  for (const [btn, label] of [['#btn-settings', 'settings'], ['#btn-cloud', 'cloud'], ['#btn-keys', 'keys'], ['#btn-import', 'import'], ['#btn-trash', 'trash']]) {
    $(btn).click();
    await wait(400);
    capture(label, out);
    closeAll();
  }
  $('#btn-print').click();
  await wait(500);
  capture('print-dialog', out);
  closeAll();
  $('#btn-play').click();
  await wait(700);
  capture('play', out);
  $('#pl-exit').click();
  await wait(200);
  still.remove();
  return out;
}

/** Unterschiede zweier Schnappschüsse. */
export function compare(a, b) {
  if (a[META] !== b[META]) console.warn(`css-snapshot: andere Fenstergröße (${a[META]} / ${b[META]}) – Vergleich nicht aussagekräftig`);
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  keys.delete(META);
  return [...keys].filter((k) => a[k] !== b[k]);
}
