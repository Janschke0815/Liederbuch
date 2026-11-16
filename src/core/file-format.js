// Dateien, die Menschen zu sehen bekommen (NAS, Drive, Sicherung, geteilte Lieder), so schreiben,
// dass sie auch in Windows-Programmen wie dem Editor sauber aussehen: eingerückt und mit
// Windows-Zeilenumbrüchen (CR LF). Lesen geht weiterhin mit beiden Zeilenenden.

export const CRLF = '\r\n';

/** Text mit Windows-Zeilenumbrüchen (vorhandene \r\n bleiben, einzelne \n und \r werden zu \r\n). */
export function toWindowsText(text) {
  return String(text ?? '').replace(/\r\n|\r|\n/g, CRLF);
}

/**
 * JSON für Dateien: zwei Leerzeichen eingerückt, CR LF, Zeilenumbruch am Ende.
 * Zeilenumbrüche *in* Texten (z. B. im Liedtext) stehen in JSON als \n-Zeichenfolge und bleiben
 * davon unberührt – nur die Zeilen der Datei selbst bekommen CR LF.
 */
export function toFileJson(data) {
  return JSON.stringify(data, null, 2).replace(/\n/g, CRLF) + CRLF;
}
