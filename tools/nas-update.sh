#!/bin/sh
# Holt die neueste Liederbuch-Fassung von GitHub (Release „latest“, liederbuch.zip) und entpackt sie
# in den Web-Ordner der NAS. Läuft nur etwas, wenn sich die ZIP geändert hat.
#
#   sh nas-update.sh /share/Web/liederbuch
#
# Regelmäßig per Cron, z. B. alle 15 Minuten (QNAP: siehe docs/webdav-qnap.md).
# Andere ZIP-Adresse: LIEDERBUCH_URL=… sh nas-update.sh <Ordner>
#
# Es werden nur App-Dateien überschrieben. Andere Dateien im Ordner (z. B. ein WebDAV-Ordner mit
# Liedern) bleiben unberührt; aus assets/ werden alte, nicht mehr gebrauchte Dateien entfernt.

set -eu

ZIEL="${1:?Ziel-Ordner angeben, z. B. /share/Web/liederbuch}"
URL="${LIEDERBUCH_URL:-https://github.com/Janschke0815/Liederbuch/releases/latest/download/liederbuch.zip}"
STAND="$ZIEL/.liederbuch-stand.zip"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

curl -fsSL -o "$TMP/neu.zip" "$URL"

# unverändert? dann nichts tun
if [ -f "$STAND" ] && cmp -s "$TMP/neu.zip" "$STAND"; then
  exit 0
fi

mkdir -p "$TMP/neu"
unzip -q "$TMP/neu.zip" -d "$TMP/neu"
if [ ! -f "$TMP/neu/index.html" ]; then
  echo "liederbuch.zip enthält keine index.html – nichts geändert" >&2
  exit 1
fi

# Erst alles außer index.html kopieren, dann index.html: wer gerade lädt, bekommt nie eine Seite,
# deren Dateien noch fehlen
mkdir -p "$ZIEL"
mv "$TMP/neu/index.html" "$TMP/index.html"
cp -R "$TMP/neu/." "$ZIEL/"
cp "$TMP/index.html" "$ZIEL/index.html"

# alte gebaute Dateien aufräumen (tragen eine Prüfsumme im Namen, z. B. assets/index-ab12.js)
if [ -d "$ZIEL/assets" ]; then
  for f in "$ZIEL"/assets/*; do
    [ -e "$f" ] || continue
    [ -e "$TMP/neu/assets/$(basename "$f")" ] || rm -f "$f"
  done
fi

cp "$TMP/neu.zip" "$STAND"
echo "Liederbuch aktualisiert ($(date '+%d.%m.%Y %H:%M'))"
