import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

import tailwind from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwind()],
  resolve: {
    alias: {
      'react': path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
    },
  },
  server: {
    watch: {
      usePolling: true, // Força o Vite a verificar mudanças (útil em Windows/WSL)
    },
    hmr: true, // Garante que o Hot Module Replacement está ligado
    host: true,
    headers: {
      // Disable CSP in development for React Flow compatibility
      'Content-Security-Policy': ''
    }
  }
})