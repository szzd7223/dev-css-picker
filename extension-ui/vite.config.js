import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './', // Use relative paths for assets so they work in the extension
  build: {
    outDir: resolve(__dirname, '../extension/sidebar'),
    emptyOutDir: true, // Clear the directory before building
  }
})
