import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      usePolling: true, // Força o Vite a verificar mudanças (útil em Windows/WSL)
    },
    hmr: true // Garante que o Hot Module Replacement está ligado
  }
})