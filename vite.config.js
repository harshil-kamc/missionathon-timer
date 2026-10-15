import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Builds one self-contained index.html (code, styles and fonts inlined) plus
// the projector/ images next to it, so the site works from any static host
// or straight from a folder on disk, with no internet.
export default defineConfig({
  base: './',
  plugins: [react(), viteSingleFile()],
  build: { assetsInlineLimit: 100_000_000, modulePreload: false },
});