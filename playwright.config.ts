// Testy klikające całą aplikację (Playwright) - przed każdym wdrożeniem.
// Działają na wersji deweloperskiej z udawaną chmurą (?mock), więc nie dotykają prawdziwej bazy.
// Uruchomienie u siebie: npm run e2e (okno z przebiegiem: npx playwright test --ui).
import { defineConfig, devices } from '@playwright/test'

const PORT = 5199

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: 'pl-PL',
    timezoneId: 'Europe/Warsaw',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    // Silnik Safari - najbliżej iPhone'a, na którym Planer jest używany najczęściej.
    { name: 'iphone', use: { ...devices['iPhone 13'] } },
    { name: 'android', use: { ...devices['Pixel 7'] } },
    { name: 'komputer', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
