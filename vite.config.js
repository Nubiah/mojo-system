import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Mojo System PWA — config de base
// - base: '/' pour que start_url + scope du manifest/SW soient stables
// - publicDir: 'public' (manifest + sw.js copiés tels quels dans dist/)
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/',
  publicDir: 'public',
  server: {
    port: 5173,
    host: true
  },
  preview: {
    port: 4173
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  }
})
