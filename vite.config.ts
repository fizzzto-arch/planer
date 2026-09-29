import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

// Wersja widoczna w Ustawieniach: skrót commita i data budowania - przy zgłoszeniu problemu
// od razu wiadomo, którą wersję ktoś ma (telefon z ekranu początkowego bywa nieodświeżony).
function appVersion(): string {
  const date = new Date().toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' })
  try {
    return `${execSync('git rev-parse --short HEAD', { cwd: fileURLToPath(new URL('.', import.meta.url)) }).toString().trim()} (${date})`
  } catch {
    return `dev (${date})`
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Względne ścieżki: strona działa pod dowolnym adresem (np. nick.github.io/planer/)
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(appVersion()),
  },
  build: {
    // Firebase (~180 kB po kompresji, z pamięcią offline) ładuje się osobno, w tle, po wyświetleniu planu.
    chunkSizeWarningLimit: 700,
  },
})
