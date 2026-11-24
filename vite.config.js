// Vite: Entwicklungsserver (npm run dev) und Bauen für die Veröffentlichung (npm run build → dist/).
// Dateien in public/ (Icons, Manifest, Service Worker) werden unverändert übernommen.
import { defineConfig } from 'vite';

/**
 * Bausteine, die erst bei Bedarf geladen werden (import(): Noten mit abcjs, QR-Code), in
 * lazy-files.json auflisten. Die App meldet sie dem Service Worker, damit sie schon nach dem ersten
 * Besuch offline da sind – auch wenn sie noch nie gebraucht wurden (siehe src/pwa.js).
 */
const listLazyFiles = () => ({
  name: 'liederbuch-lazy-files',
  apply: 'build',
  generateBundle(_, bundle) {
    const files = new Set();
    const add = (name) => {
      const chunk = bundle[name];
      if (!chunk || files.has(name)) return;
      files.add(name);
      if (chunk.type === 'chunk') [...chunk.imports, ...(chunk.viteMetadata?.importedCss || [])].forEach(add);
    };
    for (const [name, chunk] of Object.entries(bundle)) if (chunk.type === 'chunk' && chunk.isDynamicEntry) add(name);
    this.emitFile({ type: 'asset', fileName: 'lazy-files.json', source: JSON.stringify([...files].sort(), null, 1) });
  },
});

export default defineConfig({
  plugins: [listLazyFiles()],
  // relative Pfade: dist/ läuft so unter jeder Adresse (GitHub Pages /Liederbuch/, NAS, eigener Server)
  base: './',
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
  // abcjs (Noten) ist gut 500 kB groß, wird aber nur bei Bedarf geladen – keine Warnung dafür
  build: { outDir: 'dist', emptyOutDir: true, chunkSizeWarningLimit: 600 },
});
