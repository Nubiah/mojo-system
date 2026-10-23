import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Mojo System PWA — config de base
// - base: '/' en local, '/<repo>/' sur GitHub Pages (VITE_BASE_PATH fourni par le workflow)
// - publicDir: 'public' (manifest + sw.js copiés tels quels dans dist/)
const base = process.env.VITE_BASE_PATH || '/'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base,
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
