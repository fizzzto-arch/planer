/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'

// Wersja widoczna w Ustawieniach: skrót i data commita - przy zgłoszeniu problemu
// od razu wiadomo, którą wersję ktoś ma (telefon z ekranu początkowego bywa nieodświeżony).
// Data commita, nie budowania: nocne wdrożenie (świeże plany WAT) to ta sama wersja aplikacji
// i nie może pokazywać wszystkim paska "nowa wersja".
function appVersion(): string {
  try {
    const cwd = fileURLToPath(new URL('.', import.meta.url))
    return execSync('git log -1 --format="%h (%cd)" --date=format:%d.%m.%Y', { cwd }).toString().trim()
  } catch {
    const date = new Date().toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' })
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

// Content-Security-Policy: przeglądarka wykona tylko nasze skrypty i połączy się tylko z miejscami
// z listy - nawet gdyby w kodzie znalazła się luka, obcy skrypt nic nie wyśle na zewnątrz.
// Tylko w zbudowanej stronie (tryb deweloperski wstrzykuje własne skrypty). Skrypt motywu
// w index.html jest dopuszczony po skrócie SHA-256 - liczonym tu, więc zmiana skryptu nic nie psuje.
const CSP_CONNECT = [
  "'self'",
  'https://*.googleapis.com', // Firebase: logowanie i baza
  'https://apps.usos.pw.edu.pl', // USOS API (grupy, przedmioty, prowadzący)
  'https://usosweb.usos.pw.edu.pl', // plan z linku iCal
  'blob:',
  'data:',
]

function contentSecurityPolicy(): Plugin {
  return {
    name: 'planer-csp',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        const hashes = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(
          (m) => `'sha256-${createHash('sha256').update(m[1]).digest('base64')}'`,
        )
        const policy = [
          "default-src 'self'",
          `script-src 'self' ${hashes.join(' ')}`,
          "style-src 'self' 'unsafe-inline'", // style={{...}} w React
          "img-src 'self' data: blob:",
          "media-src 'self' blob:",
          `connect-src ${CSP_CONNECT.join(' ')}`,
          "frame-src 'self' https://*.firebaseapp.com", // logowanie Firebase (ramka pomocnicza)
          "worker-src 'self'",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'self'",
        ].join('; ')
        return html.replace('<head>', `<head>\n    <meta http-equiv="Content-Security-Policy" content="${policy}" />`)
      },
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), versionFile(), contentSecurityPolicy()],
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
    // Testy klikające (e2e/) uruchamia Playwright, nie Vitest.
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
