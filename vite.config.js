// Vite: Entwicklungsserver (npm run dev) und Bauen für die Veröffentlichung (npm run build → dist/).
// Dateien in public/ (Icons, Manifest, Service Worker) werden unverändert übernommen.
import { defineConfig } from 'vite';

export default defineConfig({
  // relative Pfade: dist/ läuft so unter jeder Adresse (GitHub Pages /Liederbuch/, NAS, eigener Server)
  base: './',
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
  build: { outDir: 'dist', emptyOutDir: true },
});
