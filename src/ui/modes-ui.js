// Bedienung des Funktionsumfangs (src/modes.js): Schalter unter Einstellungen → App, Hinweise in
// „So geht's los“, ⋯ → „Mehr Funktionen …“. Die Schalter wirken sofort (nicht erst mit „Speichern“).

import { harpToolsOn, isExpert, setModes } from '../modes.js';
import { $, toast } from './dom.js';

const expertSwitch = $('#st-mode-expert');
const harpSwitch = $('#st-mode-harp');

/** Schalter in den Einstellungen an den gespeicherten Stand angleichen. */
function syncSwitches() {
  expertSwitch.checked = isExpert();
  harpSwitch.checked = harpToolsOn();
}

/** Expertenmodus ein- oder ausschalten, mit kurzer Bestätigung. */
export function setExpert(on) {
  setModes({ expert: on });
  toast(on
    ? 'Expertenmodus an – alle Funktionen sind sichtbar. Ausschalten: Einstellungen → App.'
    : 'Einfache Ansicht – nur das Wichtigste. Mehr Funktionen: Einstellungen → App → Expertenmodus.', { ms: 6000 });
}

/** Mundharmonika-Werkzeuge ein- oder ausschalten, mit kurzer Bestätigung. */
export function setHarpTools(on) {
  setModes({ harp: on });
  toast(on
    ? 'Mundharmonika an – Harp-Tabs werden angezeigt, Harp-Hilfe und Harp-Einstellungen sind da.'
    : 'Mundharmonika aus – Harp-Tabs und Harp-Werkzeuge sind ausgeblendet.', { ms: 5000 });
}

/** Einstellungen öffnen und zum Bereich „App“ springen (dort stehen die Schalter). */
export function openModeSettings() {
  $('#btn-settings').click();
  $('.st-nav a[href="#st-sec-app"]')?.click();
}

expertSwitch.addEventListener('change', (e) => {
  e.stopPropagation(); // kein Teil der Darstellungs-Einstellungen
  setExpert(expertSwitch.checked);
});
harpSwitch.addEventListener('change', (e) => {
  e.stopPropagation();
  setHarpTools(harpSwitch.checked);
});
$('#btn-settings').addEventListener('click', syncSwitches);

$('#btn-more-features').onclick = openModeSettings;

// „So geht's los“: Knöpfe in den Hinweisen
$('#welcome').addEventListener('click', (e) => {
  const what = e.target.closest('[data-welcome]')?.dataset.welcome;
  if (what === 'expert') setExpert(true);
  else if (what === 'harp') setHarpTools(true);
});

/** Was sich nicht allein per CSS (data-expert, data-harp-tool) umschalten lässt. */
function onModesChange() {
  syncSwitches();
  // Auswahllisten-Einträge lassen sich nicht zuverlässig per CSS verstecken (Handy-Auswahl)
  const webdavOption = $('#book-new-kind option[value="webdav"]');
  if (webdavOption) webdavOption.hidden = !isExpert();
  // Offene Einstellungen: „Mundharmonika-Tabs“ mitziehen, sonst überschriebe „Speichern“ die neue Anzeige
  const harpShow = $('#st-showHarp');
  if ($('#settings-dialog').open && harpShow.checked !== harpToolsOn()) {
    harpShow.checked = harpToolsOn();
    $('#settings-dialog').dispatchEvent(new Event('input'));
  }
  // Einfache Ansicht hat keinen Reiter „Setlisten“ – sonst säße man dort ohne Weg zurück
  if (!isExpert() && $('.list-tabs [data-tab="sets"]')?.getAttribute('aria-selected') === 'true') {
    $('.list-tabs [data-tab="songs"]')?.click();
  }
}
addEventListener('modeschange', onModesChange);
onModesChange();
