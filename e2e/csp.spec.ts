// Content-Security-Policy działa tylko w zbudowanej stronie (playwright.offline.config.ts).
// Przejście po głównych ekranach: żadne połączenie ani skrypt nie może zostać zablokowany -
// inaczej nowa funkcja po cichu przestałaby działać dopiero na prawdziwej stronie.
import { expect, tab, test } from './fixtures.ts'

test('CSP: główne ekrany bez zablokowanych połączeń i skryptów', async ({ page, errors }) => {
  void errors // plan testowy i zbieranie błędów (naruszenia CSP trafiają do konsoli jako błędy)
  await page.addInitScript({
    content:
      'window.cspViolations = []; document.addEventListener("securitypolicyviolation", (e) => window.cspViolations.push(e.violatedDirective + " " + e.blockedURI))',
  })
  await page.goto('./')
  await expect(page.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveCount(1)
  await expect(page.getByText('Analiza matematyczna').first()).toBeVisible()

  await tab(page, 'Tydzień').click()
  await page.getByRole('button', { name: 'Eksportuj plan' }).click()
  await expect(page.getByRole('img', { name: 'Podgląd eksportowanego planu' })).toBeVisible()
  await page.getByRole('button', { name: 'Wróć' }).click()
  await tab(page, 'Przedmioty').click()
  await page.getByText('Analiza matematyczna', { exact: true }).first().click()
  await expect(page.getByRole('heading', { name: 'Analiza matematyczna' })).toBeVisible()
  await tab(page, 'Ustawienia').click()
  // Ustawienia ładują Firebase (logowanie) - łączy się z serwerami Google.
  await expect(page.getByRole('heading', { name: 'Konto i synchronizacja' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Zaloguj się' })).toBeVisible({ timeout: 15_000 })

  expect(await page.evaluate('window.cspViolations')).toEqual([])
})
