import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Względne ścieżki: strona działa pod dowolnym adresem (np. nick.github.io/planer/)
  base: './',
})
