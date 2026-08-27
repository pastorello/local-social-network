import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), vueDevTools(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // TD-02: @vue-leaflet dynamically imports 'leaflet/dist/leaflet-src.esm'
      // (only when use-global-leaflet is false — which is never, here), so the
      // build shipped a second ~43 kB gzip copy of Leaflet that no code path
      // ever loaded. Aliasing it onto the package entry every component
      // already imports collapses both into one chunk, and it also disarms the
      // footgun: a component that forgets use-global-leaflet now gets the
      // instance leaflet.markercluster augmented, not a fresh unaugmented one.
      'leaflet/dist/leaflet-src.esm': 'leaflet',
    },
  },
})
