// Seitenumbruch selbst gemacht: Inhalte werden Element für Element in Seiten mit fester
// Größe (in mm) gegossen und dabei im echten Layout gemessen. So stimmen die Seitenzahlen
// im Inhaltsverzeichnis genau, und es funktioniert offline ohne Fremdbibliothek.
//
// Regeln:
// - "Atomare" Elemente (eine Akkord/Text-Zeile, Überschrift, Tab-Block …) werden nie geteilt.
// - Container (Lied, Abschnitt, Absatz) bleiben zusammen, wenn sie in eine leere Spalte
//   passen; sonst werden sie an ihren Kindern geteilt. Die Hülle (z. B. der Refrain-Balken)
//   wird in der neuen Spalte fortgesetzt.
// - Elemente mit Klasse "keep-with-next" (z. B. Abschnittsname) wandern mit dem nächsten
//   Element mit, statt allein unten auf der Seite zu stehen.

const ATOMIC = '.line, .block-label, .song-header, pre, p, h1, h2, h3, .toc-entry, .cover, .atomic';
const CONTENT = ATOMIC;

function isAtomic(node) {
  return node.nodeType !== 1 || node.matches(ATOMIC) || node.children.length === 0;
}

function el(tag, className) {
  const e = document.createElement(tag);
  e.className = className;
  return e;
}

/**
 * @typedef {{width: number, height: number, margin: {top: number, right: number, bottom: number, left: number},
 *            columns: number, columnGap: number}} PageSpec  – alle Maße in mm
 */
export class Paginator {
  /** @param {HTMLElement} root  @param {PageSpec} spec */
  constructor(root, spec) {
    this.root = root;
    this.spec = spec;
    this.pages = [];
    this.stack = []; // offene Container: { orig, clone }
    this.col = null;
    this.colIndex = 0;
    this.overflows = 0; // Elemente, die selbst in eine leere Spalte nicht passen

    const s = root.style;
    s.setProperty('--page-w', spec.width + 'mm');
    s.setProperty('--page-h', spec.height + 'mm');
    s.setProperty('--m-top', spec.margin.top + 'mm');
    s.setProperty('--m-right', spec.margin.right + 'mm');
    s.setProperty('--m-bottom', spec.margin.bottom + 'mm');
    s.setProperty('--m-left', spec.margin.left + 'mm');
    s.setProperty('--col-gap', spec.columnGap + 'mm');

    // Unsichtbare Messseite, um zu prüfen, ob etwas in eine leere Spalte passt
    this.probePage = this.#makePageElement(1);
    this.probePage.classList.add('page--probe');
    this.probeCol = this.probePage.querySelector('.page-col');
    root.append(this.probePage);
  }

  #makePageElement(columns, head = null) {
    const page = el('div', 'page');
    const content = el('div', 'page-content');
    for (let i = 0; i < columns; i++) content.append(el('div', 'page-col'));
    if (head) {
      // Kopfbereich über die ganze Breite (z. B. Liedkopf über beiden Spalten)
      const top = el('div', 'page-head');
      top.append(head);
      page.append(top);
    }
    page.append(content, el('div', 'page-footer'));
    return page;
  }

  /**
   * Neue Seite; columns überschreibt die Spaltenzahl (z. B. 1 für Deckblatt, oder die eines
   * Liedes). Folgeseiten, die beim Umbruch entstehen, behalten diese Spaltenzahl.
   * head: Element, das über allen Spalten steht (nur auf dieser Seite).
   */
  newPage({ columns = this.currentColumns ?? this.spec.columns, className = '', head = null } = {}) {
    this.currentColumns = columns;
    const page = this.#makePageElement(columns, head);
    if (className) page.classList.add(...className.split(/\s+/));
    this.probePage.before(page);
    const cols = [...page.querySelectorAll('.page-col')];
    this.pages.push({ el: page, cols });
    this.colIndex = 0;
    this.col = cols[0];
    this.#rebuildChain();
    return page;
  }

  nextColumn() {
    const page = this.pages.at(-1);
    if (page && this.colIndex + 1 < page.cols.length) {
      this.col = page.cols[++this.colIndex];
      this.#rebuildChain();
    } else {
      this.newPage();
    }
  }

  #buildChain(target) {
    let parent = target;
    const clones = [];
    for (const frame of this.stack) {
      const shell = frame.orig.cloneNode(false);
      shell.classList.add('cont');
      shell.removeAttribute('id');
      parent.append(shell);
      clones.push(shell);
      parent = shell;
    }
    return { inner: parent, clones };
  }

  #rebuildChain() {
    const { clones } = this.#buildChain(this.col);
    clones.forEach((c, i) => (this.stack[i].clone = c));
  }

  #parent() {
    return this.stack.length ? this.stack.at(-1).clone : this.col;
  }

  /** Passt node (bereits eingefügt) noch in die Spalte? Gemessen wird die Unterkante des
   *  Elements selbst – ein Außenabstand unter dem letzten Element zählt so nicht mit. */
  #fits(node, col = this.col) {
    let rect;
    if (node.nodeType === 1) rect = node.getBoundingClientRect();
    else {
      const range = document.createRange();
      range.selectNodeContents(node);
      rect = range.getBoundingClientRect();
    }
    return rect.bottom <= col.getBoundingClientRect().bottom + 1;
  }

  #columnEmpty() {
    return !this.col.querySelector(CONTENT);
  }

  #fitsEmptyColumn(node) {
    const { inner } = this.#buildChain(this.probeCol);
    const clone = node.cloneNode(true);
    inner.append(clone);
    const ok = this.#fits(clone, this.probeCol);
    this.probeCol.replaceChildren();
    return ok;
  }

  /** Entfernt "keep-with-next"-Elemente am Ende von parent und gibt sie zurück. */
  #takeCarry(parent) {
    const carry = [];
    while (parent.lastElementChild?.classList.contains('keep-with-next')) {
      carry.unshift(parent.lastElementChild);
      parent.lastElementChild.remove();
    }
    // leer gewordene Hüllen entfernen
    let p = parent;
    while (p !== this.col && p.childNodes.length === 0) {
      const up = p.parentNode;
      p.remove();
      p = up;
    }
    return carry;
  }

  /** Setzt node (wird geklont, Original bleibt unverändert) in den Seitenfluss. */
  flow(node) {
    if (node.nodeType === 1 && node.classList.contains('new-page')) {
      if (!this.#columnEmpty() || this.colIndex > 0) this.newPage();
      return;
    }
    if (node.nodeType === 1 && node.classList.contains('column-break')) {
      if (!this.#columnEmpty()) this.nextColumn();
      return;
    }
    if (node.nodeType === 3 && !node.textContent.trim() && this.#parent() === this.col) return;

    const parent = this.#parent();
    const clone = node.cloneNode(true);
    // Container mit Umbruchmarken immer zerlegen, damit die Marken wirken
    const hasBreaks = node.nodeType === 1 && node.querySelector('.new-page, .column-break');
    if (!hasBreaks) {
      parent.append(clone);
      if (this.#fits(clone)) return;
      clone.remove();
    }

    if (isAtomic(node)) {
      if (this.#columnEmpty()) {
        parent.append(clone); // passt nirgends – lieber abschneiden als endlos neue Seiten
        this.overflows++;
        return;
      }
      const carry = this.#takeCarry(parent);
      this.nextColumn();
      this.#parent().append(...carry, clone);
      if (!this.#fits(clone)) this.overflows++;
      return;
    }

    // Container: möglichst zusammenhalten
    if (!hasBreaks && !this.#columnEmpty() && this.#fitsEmptyColumn(node)) {
      const carry = this.#takeCarry(parent);
      this.nextColumn();
      this.#parent().append(...carry, clone);
      if (this.#fits(clone)) return;
      clone.remove(); // passt nur ohne die mitgenommenen Elemente – dann hier teilen
    }

    const shell = node.cloneNode(false);
    this.#parent().append(shell);
    this.stack.push({ orig: node, clone: shell });
    for (const child of [...node.childNodes]) this.flow(child);
    this.stack.pop();
  }

  /** Aufräumen: Messseite entfernen, Seitenzahlen eintragen. */
  finish({ numberFrom = 1, skipNumbers = 0 } = {}) {
    this.probePage.remove();
    this.pages.forEach((p, i) => {
      p.number = i + numberFrom;
      p.el.dataset.page = String(p.number);
      if (i >= skipNumbers) p.el.querySelector('.page-footer').textContent = String(p.number);
    });
    return this.pages;
  }
}
