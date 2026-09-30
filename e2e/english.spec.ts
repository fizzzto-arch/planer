// Wersja angielska: przeglądarka po angielsku dostaje angielski interfejs, nazwy przedmiotów
// zostają jak w USOS, a język można zmienić w ustawieniach (i wrócić do polskiego).
import { expect, tab, test } from './fixtures.ts'

test.use({ locale: 'en-GB' })

test.beforeEach(async ({ page, errors }) => {
  void errors // uruchamia zbieranie błędów
  await page.goto('/?mock')
  await expect(page.getByRole('heading', { name: 'Planer' })).toBeVisible()
})

test('angielski: interfejs po angielsku, nazwy przedmiotów bez zmian, powrót do polskiego', async ({ page }) => {
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  // Środa 9:00 - najbliższe ćwiczenia z analizy (nazwa z USOS, typ po angielsku).
  await expect(page.getByText('Analiza matematyczna').first()).toBeVisible()
  await expect(page.getByText('Tutorial').first()).toBeVisible()

  await tab(page, 'Week').click()
  await expect(page.getByText(/week 2 · even/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Export timetable' })).toBeVisible()
  // Nazwa święta z kalendarza PW - nasze tłumaczenie (USOS nie ma angielskich nazw).
  for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'Next week' }).click()
  await expect(page.getByText('Independence Day').or(page.getByTitle('Independence Day')).first()).toBeVisible()

  await tab(page, 'Courses').click()
  await expect(page.getByRole('heading', { name: 'Upcoming deadlines' })).toBeVisible()
  await expect(page.getByText('Grafika komputerowa', { exact: true }).first()).toBeVisible()

  await tab(page, 'Settings').click()
  await expect(page.getByRole('heading', { name: 'Access to Planer' })).toBeVisible() // panel administratora
  // Przełącznik PL | EN na głównym pasku (jest też w ustawieniach).
  await page.locator('.lang-toggle').getByRole('radio', { name: 'Polski' }).click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'pl')
  await expect(tab(page, 'Dziś')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Wygląd' })).toBeVisible()

  // Wybór zostaje po przeładowaniu, mimo angielskiej przeglądarki.
  await page.reload()
  await expect(tab(page, 'Tydzień')).toBeVisible()
})
