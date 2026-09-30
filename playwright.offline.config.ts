// Testy na zbudowanej wersji (start bez internetu, Content-Security-Policy) (jak na stronie) - wersja deweloperska ładuje
// setki modułów przez serwer Vite i nie odpowiada temu, co dostaje telefon.
// Uruchomienie: npm run e2e (po zwykłych testach klikających).
import { defineConfig, devices } from '@playwright/test'
import base from './playwright.config.ts'

const PORT = 5197

export default defineConfig({
  ...base,
  testMatch: ['offline.spec.ts', 'csp.spec.ts'],
  testIgnore: [],
  use: { ...base.use, baseURL: `http://localhost:${PORT}`, serviceWorkers: 'allow' },
  // Tylko Chromium: WebKit Playwrighta na Windowsie nie przeładowuje strony offline przy service
  // workerze ("internal error") - iPhone sprawdzamy ręcznie.
  projects: [
    { name: 'android', use: { ...devices['Pixel 7'] } },
    { name: 'komputer', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
