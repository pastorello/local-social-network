import { fileURLToPath, URL } from 'node:url'

import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'

// The English of the first paint is a chunk of its own, which only an English
// reader loads (src/lib/i18n/index.ts, review PR-19a). Found by the bundle
// alone, the entry has to run before it asks for it — entry, then the
// language, then the chunk, then the page — and on Lighthouse's phone that
// cost English 300 ms of LCP over Italian. So index.html decides the
// language itself, the first thing in its head, with the same rules as
// `firstLocale` (the address, then this browser's choice, then a browser that
// asks for English), and only for English adds a modulepreload of that chunk,
// which then travels beside the entry. An Italian reader runs a few lines of
// script and fetches nothing more. The chunk's name is hashed, so it is
// written in at build time; in development every module loads on demand.
const preloadEnglish = (): Plugin => {
  let base = '/'
  return {
    name: 'preload-english',
    apply: 'build',
    configResolved(config) {
      base = config.base
    },
    transformIndexHtml: {
      order: 'post',
      handler(_html, context) {
        const chunk = Object.values(context.bundle ?? {}).find(
          (output) => output.type === 'chunk' && output.name === 'english',
        )
        if (!chunk) return []
        const href = JSON.stringify(base + chunk.fileName)
        return [
          {
            tag: 'script',
            injectTo: 'head',
            children: `(function(){try{var a=new URLSearchParams(location.search).get('lang'),s=null;try{s=localStorage.getItem('lang')}catch(e){}var l=a==='it'||a==='en'?a:s==='it'||s==='en'?s:/^en/i.test(navigator.language||'')?'en':'it';if(l!=='en')return;var k=document.createElement('link');k.rel='modulepreload';k.crossOrigin='';k.href=${href};document.head.appendChild(k)}catch(e){}})()`,
          },
        ]
      },
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), vueDevTools(), tailwindcss(), preloadEnglish()],
  // axios in a chunk of its own, as the bundler had put it until a store
  // gained one more import (review PR-19a) and it went into the entry: one
  // file of 69 kB instead of two downloading side by side cost every page of
  // the gate 150 ms of LCP on Lighthouse's phone. Named, so it stays put.
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [{ name: 'axios', test: /node_modules[\\/]axios[\\/]/ }],
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
