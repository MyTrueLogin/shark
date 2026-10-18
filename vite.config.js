import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

const pages = ['index', 'all-locations', 'single-location', 'metrics', 'onboarding']

export default defineConfig({
  // relative base: the build works from a domain root and from a sub-path (GitHub Pages)
  base: './',
  plugins: [tailwindcss()],
  build: {
    rollupOptions: {
      input: Object.fromEntries(pages.map((p) => [p, resolve(import.meta.dirname, `${p}.html`)])),
    },
  },
})
