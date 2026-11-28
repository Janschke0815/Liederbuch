// Funktionsumfang: einfache Ansicht oder Expertenmodus, Mundharmonika-Werkzeuge an oder aus.
// Versteckt werden nur Werkzeuge, nie Inhalte – Noten oder Tags in einem Lied bleiben sichtbar. Einzige
// Ausnahme: Harp-Tabs werden mit dem Schalter „Mundharmonika“ ein- bzw. ausgeblendet (setModes).
//
//   data-expert                 im HTML: nur im Expertenmodus zu sehen
//   data-harp-tool              im HTML: nur mit Mundharmonika zu sehen
//   data-simple-only            im HTML: nur in der einfachen Ansicht zu sehen (Hinweise zum Einschalten)
//   { expert: true, harp: true } an Menüeinträgen (context-menu.js filtert sie)
//
// Die Schalter hängen als Attribute an <html> (data-mode-simple, data-mode-noharp); das CSS dazu steht in
// styles/base.css. Bei jeder Änderung gibt es das Ereignis „modeschange“ auf window.

import { prefs } from './prefs.js';
import { loadSettings, saveSettings } from './settings/settings.js';

/** Expertenmodus an? (Solange noch nichts festgelegt ist: ja – so verschwindet beim Start nichts.) */
export const isExpert = () => prefs.get('uiLevel') !== 'simple';

/** Mundharmonika-Werkzeuge an? (Solange noch nichts festgelegt ist: ja.) */
export const harpToolsOn = () => prefs.get('harpTools') !== 'off';

/** Ist schon festgelegt, welcher Funktionsumfang gilt? */
export const modesChosen = () => Boolean(prefs.get('uiLevel') && prefs.get('harpTools'));

/** Gespeicherten Funktionsumfang auf die Seite anwenden. */
export function applyModes() {
  const root = document.documentElement;
  root.toggleAttribute('data-mode-simple', !isExpert());
  root.toggleAttribute('data-mode-noharp', !harpToolsOn());
  dispatchEvent(new Event('modeschange'));
}

/**
 * Funktionsumfang ändern und anwenden; nicht genannte Schalter bleiben, wie sie sind.
 * Mundharmonika an/aus schaltet auch die Anzeige der Harp-Tabs mit (Einstellung showHarp) – danach
 * lässt sie sich wie gewohnt einzeln ändern.
 * @param {{expert?: boolean, harp?: boolean}} modes
 */
export function setModes({ expert, harp } = {}) {
  if (expert !== undefined) prefs.set('uiLevel', expert ? 'expert' : 'simple');
  if (harp !== undefined) {
    prefs.set('harpTools', harp ? 'on' : 'off');
    const s = loadSettings();
    if (s.showHarp !== harp) saveSettings({ ...s, showHarp: harp });
  }
  applyModes();
}

/** Darf ein Menüeintrag im aktuellen Funktionsumfang erscheinen? (Trennlinien und Lücken immer.) */
export function allowedInMode(item) {
  if (!item || item === '-') return true;
  return (!item.expert || isExpert()) && (!item.harp || harpToolsOn());
}

/** Menüeintrag nur im Expertenmodus zeigen (leere Einträge bleiben leer). */
export const asExpert = (item) => item && { ...item, expert: true };

applyModes();
