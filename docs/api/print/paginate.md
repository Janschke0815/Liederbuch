# `src/print/paginate.js`

[← Übersicht](../README.md)

Seitenumbruch selbst gemacht: Inhalte werden Element für Element in Seiten mit fester Größe (in mm) gegossen und dabei im echten Layout gemessen. So stimmen die Seitenzahlen im Inhaltsverzeichnis genau, und es funktioniert offline ohne Fremdbibliothek.

Regeln: - "Atomare" Elemente (eine Akkord/Text-Zeile, Überschrift, Tab-Block …) werden nie geteilt. - Container (Lied, Abschnitt, Absatz) bleiben zusammen, wenn sie in eine leere Spalte

```text
  passen; sonst werden sie an ihren Kindern geteilt. Die Hülle (z. B. der Refrain-Balken)
  wird in der neuen Spalte fortgesetzt.
```

- Elemente mit Klasse "keep-with-next" (z. B. Abschnittsname) wandern mit dem nächsten

```text
  Element mit, statt allein unten auf der Seite zu stehen.
```

**Benutzt von:** [`print/songbook.js`](songbook.md)

## Datentypen

### ``

columns: number, columnGap: number}} PageSpec  – alle Maße in mm

## Exportiert

### `class Paginator`

columns: number, columnGap: number}} PageSpec  – alle Maße in mm

#### `new Paginator(root, spec)`

| Parameter | Typ | Bedeutung |
|---|---|---|
| `root` | `HTMLElement` | @param {PageSpec} spec |

#### `newPage({ columns = this.currentColumns ?? this.spec.columns, className = '', head = null } = {})`

Neue Seite; columns überschreibt die Spaltenzahl (z. B. 1 für Deckblatt, oder die eines
Liedes). Folgeseiten, die beim Umbruch entstehen, behalten diese Spaltenzahl.
head: Element, das über allen Spalten steht (nur auf dieser Seite).

#### `nextColumn()`

In der nächsten Spalte weiterschreiben; nach der letzten Spalte auf einer neuen Seite.

#### `flow(node)`

Setzt node (wird geklont, Original bleibt unverändert) in den Seitenfluss.

#### `insertBlankBefore(index)`

Leere Seite vor die Seite mit diesem Index schieben (Doppelseiten: Lied soll links beginnen).
Sie zählt mit, trägt aber keine Seitenzahl.

#### `finish({ numberFrom = 1, skipNumbers = 0 } = {})`

Aufräumen: Messseite entfernen, Seitenzahlen eintragen.

## Intern

Nicht exportiert – nur innerhalb des Moduls benutzt.

- `isAtomic(node)`
- `el(tag, className)`
