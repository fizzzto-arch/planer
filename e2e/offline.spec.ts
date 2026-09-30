// Bez internetu: Planer otwarty wcześniej musi wystartować z pamięci telefonu i pokazać plan
// (sale w piwnicach, metro). Działa na zbudowanej wersji (playwright.offline.config.ts),
// z włączonym service workerem - bez konta, z samym planem zapisanym w przeglądarce.
import { expect, tab, test } from './fixtures.ts'

test('bez internetu: start z pamięci telefonu, plan widoczny', async ({ page, context, errors }) => {
  void errors // przygotowuje plan testowy i zbiera błędy strony
  await page.goto('./')
  await expect(page.getByText('Analiza matematyczna').first()).toBeVisible()
  // Service worker przejmuje stronę i zapamiętuje pliki (część już przy instalacji).
  await page.waitForFunction('navigator.serviceWorker && navigator.serviceWorker.controller')
  await page.reload()
  await expect(page.getByText('Analiza matematyczna').first()).toBeVisible()

  // Bez sieci przeglądarka zgłasza nieudane połączenia (Firebase, odświeżanie) - to oczekiwane;
  // prawdziwe błędy skryptu (pageerror) dalej psują test.
  page.removeAllListeners('console')
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Planer' })).toBeVisible()
  await expect(page.getByText('Analiza matematyczna').first()).toBeVisible()
  await tab(page, 'Tydzień').click()
  await expect(page.getByText('Grafika komputerowa').first()).toBeVisible()
  await context.setOffline(false)
})
