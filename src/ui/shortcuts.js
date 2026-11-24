// Alle Tastenkürzel an einer Stelle: Daraus entstehen die Tasten-Abfrage (app-keys.js,
// play-mode.js) und die Übersicht im Dialog „Tastenkürzel“. Wer ein Kürzel ändert, ändert es nur hier
// (und im README).
//
// keys:  was gedrückt wird – 'Mod+k' (Strg bzw. ⌘), 'Alt+s', 'f', '+', 'PageDown', ' ' (Leertaste) …
//        Buchstaben ohne Rücksicht auf Groß-/Kleinschreibung.
// show:  so steht es in der Übersicht (Tasten durch Leerzeichen getrennt, '/' für „oder“)
// id:    Name der Aktion; null = wird woanders erledigt und steht nur in der Übersicht
// song:  nur wenn ein Lied geöffnet ist

export const SHORTCUTS = {
  app: [
    { id: 'search', keys: ['Mod+k'], show: 'Strg+K', label: 'Suchen' },
    { id: 'save', keys: ['Mod+s'], show: 'Strg+S', label: 'Speichern (passiert auch automatisch)' },
    { id: 'print', keys: ['Mod+p'], show: 'Strg+P', label: 'Drucken / PDF' },
    { id: 'focus', keys: ['Mod+e'], show: 'Strg+E', label: 'Editor ein-/ausblenden' },
    { id: 'listPane', keys: ['Mod+b'], show: 'Strg+B', label: 'Liederliste ein-/ausblenden' },
    { id: null, keys: [], show: 'Strg+V', label: 'Text einfügen (außerhalb des Editors)' },
    { id: null, keys: [], show: 'Enter', label: 'im Dialog: bestätigen (roter Knopf)' },
    { id: null, keys: [], show: 'Strg+Enter', label: 'im Dialog mit großem Textfeld: bestätigen' },
    { id: 'play', keys: ['f'], show: 'F', label: 'Spielmodus', song: true },
    { id: 'metronome', keys: ['m'], show: 'M', label: 'Metronom an/aus', song: true },
    { id: 'up', keys: ['+', '='], show: '+ / −', label: 'Transponieren', song: true },
    { id: 'down', keys: ['-'], show: null, label: '', song: true },
    { id: null, keys: [], show: '↑ / ↓', label: 'in der Liste: vorheriges/nächstes Lied' },
    { id: null, keys: [], show: 'Entf', label: 'in der Liste: Lied löschen' },
    { id: 'help', keys: ['?'], show: '?', label: 'diese Übersicht' },
  ],
  play: [
    { id: 'pageDown', keys: ['PageDown', 'ArrowDown'], show: 'Bild↓ / ↓', label: 'weiterblättern, am Ende nächstes Lied' },
    { id: 'pageUp', keys: ['PageUp', 'ArrowUp'], show: 'Bild↑ / ↑', label: 'zurückblättern' },
    { id: 'next', keys: ['ArrowRight'], show: '→ / ←', label: 'nächstes / vorheriges Lied – zweispaltig: blättern (wie viele Pedale)' },
    { id: 'prev', keys: ['ArrowLeft'], show: null, label: '' },
    { id: 'toggle', keys: [' ', 'Enter'], show: 'Leertaste', label: 'automatisch scrollen an/aus' },
    { id: 'slower', keys: ['<', ','], show: '< / >', label: 'langsamer / schneller' },
    { id: 'faster', keys: ['>', '.'], show: null, label: '' },
    { id: 'bigger', keys: ['+', '='], show: '+ / −', label: 'Schrift größer / kleiner' },
    { id: 'smaller', keys: ['-'], show: null, label: '' },
    { id: 'chords', keys: ['a'], show: 'A', label: 'Gitarren-Akkorde ein/aus' },
    { id: 'diagrams', keys: ['g'], show: 'G H T', label: 'Griffbilder, Harp-Tabs, Gitarren-Tabs' },
    { id: 'harp', keys: ['h'], show: null, label: '' },
    { id: 'tabs', keys: ['t'], show: null, label: '' },
    { id: 'columns', keys: ['s'], show: 'S', label: 'zweispaltig' },
    { id: 'night', keys: ['n'], show: 'N', label: 'Nachtmodus' },
    { id: 'metronome', keys: ['m'], show: 'M', label: 'Metronom' },
    { id: 'exit', keys: ['Escape'], show: 'Esc', label: 'beenden' },
  ],
  // Bausteine über dem Editor (id = data-snippet), nur wenn das Textfeld den Fokus hat
  editor: [
    { id: 'chord', keys: ['Alt+a'], show: 'Alt+A', label: 'Akkord [ ]' },
    { id: 'verse', keys: ['Alt+s'], show: 'Alt+S', label: 'Strophe' },
    { id: 'chorus', keys: ['Alt+r'], show: 'Alt+R', label: 'Refrain' },
    { id: 'bridge', keys: ['Alt+b'], show: 'Alt+B', label: 'Bridge' },
    { id: 'tab', keys: ['Alt+t'], show: 'Alt+T', label: 'Gitarren-Tab' },
    { id: 'abc', keys: ['Alt+n'], show: 'Alt+N', label: 'Noten (ABC)' },
    { id: 'repeat', keys: ['Alt+c'], show: 'Alt+C', label: 'Refrain wiederholen ({chorus})' },
    { id: 'times', keys: ['Alt+w'], show: 'Alt+W', label: 'Wiederholen (2×, nochmal = öfter)' },
    { id: 'comment', keys: ['Alt+h'], show: 'Alt+H', label: 'Hinweis' },
  ],
};

/** Anzeige des ersten Kürzels zu einer Aktion (z. B. 'Alt+S') oder ''. */
export function shortcutLabel(list, id) {
  return list.find((s) => s.id === id)?.show || '';
}

/** Passt der Tastendruck zu 'Mod+k', 'Alt+s', 'f', 'PageDown' …? */
export function keyMatches(e, spec) {
  const mod = e.ctrlKey || e.metaKey;
  const wantMod = spec.startsWith('Mod+');
  const wantAlt = spec.startsWith('Alt+');
  const key = wantMod || wantAlt ? spec.slice(4) : spec;
  if (mod !== wantMod || !!e.altKey !== wantAlt) return false;
  // Mit Alt liefert e.key auf dem Mac Sonderzeichen (Alt+S = ß): dann zählt die Taste (e.code)
  if (wantAlt && key.length === 1 && e.code === `Key${key.toUpperCase()}`) return true;
  return key.length === 1 ? e.key.toLowerCase() === key.toLowerCase() : e.key === key;
}

/** Erstes Kürzel aus der Liste, das zum Tastendruck passt (oder null). */
export function findShortcut(e, list) {
  return list.find((s) => s.id && s.keys.some((k) => keyMatches(e, k))) || null;
}

/** Tabelle für die Übersicht (nur Einträge mit show). */
export function shortcutTable(list) {
  const table = document.createElement('table');
  table.className = 'keys-table';
  for (const s of list.filter((x) => x.show)) {
    const keys = document.createElement('td');
    const kbd = (t) => Object.assign(document.createElement('kbd'), { textContent: t });
    s.show.split(' ').forEach((part, i) => {
      if (i) keys.append(' ');
      if (part === '/') keys.append('/');
      else if (part.length > 1 && part.includes('+')) {
        // Kombination: „Strg+K“ -> [Strg]+[K]
        part.split('+').forEach((p, j) => (j ? keys.append('+', kbd(p)) : keys.append(kbd(p))));
      } else keys.append(kbd(part));
    });
    const row = table.insertRow();
    row.append(keys, Object.assign(document.createElement('td'), { textContent: s.label }));
  }
  return table;
}
