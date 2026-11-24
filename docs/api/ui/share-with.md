# `src/ui/share-with.js`

[← Übersicht](../README.md)

„Mit anderen teilen“: ein Einstieg, der zuerst fragt, ob die anderen mitbearbeiten (gemeinsames Liederbuch über Google Drive) oder nur lesen sollen (Abo) – und dann in den passenden bestehenden Ablauf führt (Cloud-Dialog „Mitglieder“, „Neues Liederbuch“, „Veröffentlichen …“).

**Benutzt:** [`ui/app-state.js`](app-state.md), [`ui/dom.js`](dom.md), [`ui/publish.js`](publish.md), [`ui/share.js`](share.md)  
**Benutzt von:** [`app.js`](../app.md)

## Intern

Nicht exportiert – nur innerhalb des Moduls benutzt.

- `showStep(two)`
- `open()`
- `step2(text, actions)` – Zweiter Schritt mit Text und Knöpfen [label, Aktion].
- `shareEditable()`
