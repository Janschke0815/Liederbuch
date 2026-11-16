// Hilfen für „eine Datei pro Lied“ auf einem WebDAV-Server: Dateinamen aus Titel und Interpret,
// Prüfsummen zum Erkennen von Änderungen, Ordnerliste (PROPFIND) lesen. Reine Funktionen.

import { normalizeText } from '../core/text.js';

export const SONG_DIR = 'Lieder/';
export const SONG_EXT = '.cho';
/** Dateien, die beim Abgleich als Lied gelten (auch von Hand auf den Server gelegte). */
export const SONG_FILE = /\.(cho|chordpro|chopro|crd|pro)$/i;

const WINDOWS_RESERVED = /^(con|prn|aux|nul|com\d|lpt\d)$/i;

const metaValue = (chordpro, names) => {
  const re = new RegExp(String.raw`^\s*\{\s*(?:${names})\s*:\s*([^}]*)\}`, 'mi');
  return (re.exec(String(chordpro || ''))?.[1] || '').trim();
};

/** Dateiname ohne Endung, sicher für Windows, Mac und Linux. */
export function cleanFileName(name) {
  let s = String(name || '')
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100)
    .replace(/[\s.]+$/, ''); // Windows mag keine Punkte/Leerzeichen am Ende
  if (!s) s = 'Ohne Titel';
  if (WINDOWS_RESERVED.test(s)) s += '_';
  return s;
}

/** "Titel - Interpret" aus dem Liedtext. */
export function songBaseName(chordpro) {
  const title = metaValue(chordpro, 'title|t');
  const artist = metaValue(chordpro, 'artist');
  return cleanFileName(artist ? `${title || 'Ohne Titel'} - ${artist}` : title);
}

/** Passt ein vorhandener Dateiname noch zum Titel? ("Titel.cho" oder "Titel (2).cho") */
export function nameFits(name, base) {
  const n = String(name).toLowerCase();
  const b = base.toLowerCase();
  if (n === b + SONG_EXT) return true;
  return n.startsWith(b + ' (') && /^ \(\d+\)\.cho$/i.test(n.slice(b.length));
}

/** Freier Name: "Titel.cho", sonst "Titel (2).cho" … (taken: Kleinbuchstaben-Namen). */
export function uniqueName(base, taken) {
  for (let i = 1; ; i++) {
    const name = i === 1 ? base + SONG_EXT : `${base} (${i})${SONG_EXT}`;
    if (!taken.has(name.toLowerCase())) return name;
  }
}

/** Zeilenenden vereinheitlichen (Dateien auf dem Server haben CR LF, die App LF). */
// Zeilenenden vereinheitlichen – steht in core/text.js, hier für bestehende Aufrufer weitergereicht
export { normalizeText };

/** Kurze Prüfsumme eines Liedtexts (Zeilenenden egal). */
export async function hashText(text) {
  const bytes = new TextEncoder().encode(normalizeText(text));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest).slice(0, 8)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Eindeutige, auf allen Geräten gleiche ID für eine Datei, die dieses Gerät noch nicht kennt. */
export function idForFile(name, prefix = 'datei-') {
  // FNV-1a, zweimal mit verschiedenem Startwert -> 16 Hex-Zeichen
  const s = String(name).toLowerCase();
  const fnv = (seed) => {
    let h = seed >>> 0;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h.toString(16).padStart(8, '0');
  };
  return prefix + fnv(0x811c9dc5) + fnv(0x01000193);
}

/** Dateiname als Titel, wenn eine Datei kein {title:} enthält. */
export function withTitle(text, fileName) {
  if (metaValue(text, 'title|t')) return text;
  const title = String(fileName).replace(SONG_FILE, '').trim() || 'Ohne Titel';
  return `{title: ${title}}\n${text}`;
}

/**
 * Antwort auf PROPFIND (Depth: 1) -> Map Dateiname -> {etag, modified (ms)}.
 * Nur Dateien direkt im Ordner, keine Unterordner.
 */
export function parsePropfind(xml, folderUrl) {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const folderPath = decodeURIComponent(new URL(folderUrl).pathname).replace(/\/*$/, '/');
  const out = new Map();
  for (const r of doc.getElementsByTagNameNS('DAV:', 'response')) {
    const href = r.getElementsByTagNameNS('DAV:', 'href')[0]?.textContent?.trim();
    if (!href) continue;
    if (r.getElementsByTagNameNS('DAV:', 'collection').length) continue; // Ordner
    let path;
    try {
      path = decodeURIComponent(new URL(href, folderUrl).pathname);
    } catch {
      continue;
    }
    if (!path.startsWith(folderPath)) continue;
    const name = path.slice(folderPath.length);
    if (!name || name.includes('/')) continue;
    const etag = r.getElementsByTagNameNS('DAV:', 'getetag')[0]?.textContent?.trim() || null;
    const mod = Date.parse(r.getElementsByTagNameNS('DAV:', 'getlastmodified')[0]?.textContent || '');
    out.set(name, { etag, modified: Number.isFinite(mod) ? mod : 0 });
  }
  return out;
}

/** Fingerabdruck einer Ordnerliste (null = Liste nicht verfügbar). */
export function listingSignature(listing) {
  if (!listing) return 'x';
  return [...listing].map(([n, f]) => `${n}:${f.etag ?? f.modified}`).sort().join('|');
}

export const PROPFIND_BODY =
  '<?xml version="1.0" encoding="utf-8"?>' +
  '<d:propfind xmlns:d="DAV:"><d:prop><d:getetag/><d:getlastmodified/><d:resourcetype/></d:prop></d:propfind>';
