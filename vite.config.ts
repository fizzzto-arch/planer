/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'

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

const VERSION = appVersion()

// version.json obok strony - otwarta aplikacja porównuje go ze swoją wersją i proponuje odświeżenie.
function versionFile(): Plugin {
  return {
    name: 'planer-version-file',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ version: VERSION }) })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), versionFile()],
  // Względne ścieżki: strona działa pod dowolnym adresem (np. nick.github.io/planer/)
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(VERSION),
  },
  build: {
    // Firebase (~180 kB po kompresji, z pamięcią offline) ładuje się osobno, w tle, po wyświetleniu planu.
    chunkSizeWarningLimit: 700,
  },
  test: {
    // Testy zawsze w polskiej strefie (z przejściem na czas zimowy) - także na serwerze GitHuba,
    // który liczy w UTC i przepuściłby błędy zmiany czasu.
    env: { TZ: 'Europe/Warsaw' },
  },
})
