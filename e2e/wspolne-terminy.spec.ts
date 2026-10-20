// Wspólne terminy: propozycja "od innych z roku" (w udawanej chmurze Ala pokazała kolokwium z analizy
// na 28.10, 10:15), dodanie u siebie, ukrycie i pokazanie własnego terminu innym.
import { expect, tab, test } from './fixtures.ts'

test.beforeEach(async ({ page, errors }) => {
  void errors
  await page.goto('/?mock')
  await expect(page.getByRole('heading', { name: 'Planer' })).toBeVisible()
})

test('propozycja od innych: widać ją w Dziś i w Przedmiotach, „Dodaj u siebie” dodaje termin', async ({ page }) => {
  // Dziś: krótko, w nadchodzących terminach.
  await expect(page.locator('.upcoming .shared-suggestions').getByText('Kolokwium 1')).toBeVisible()

  await tab(page, 'Przedmioty').click()
  const box = page.locator('.shared-suggestions')
  await expect(box.getByText('Analiza matematyczna')).toBeVisible()
  await expect(box.getByText(/od ala/)).toBeVisible()
  await box.getByRole('button', { name: 'Dodaj u siebie' }).click()
  await expect(page.locator('.shared-suggestions')).toHaveCount(0)
  await expect(page.locator('.deadline-list').getByText('Kolokwium 1')).toBeVisible()
})

test('„Ukryj” chowa propozycję - także po ponownym otwarciu', async ({ page }) => {
  await tab(page, 'Przedmioty').click()
  await page.locator('.shared-suggestions').getByRole('button', { name: 'Ukryj' }).click()
  await expect(page.locator('.shared-suggestions')).toHaveCount(0)
  await page.reload()
  await tab(page, 'Przedmioty').click()
  await expect(page.getByRole('heading', { name: 'Nadchodzące terminy' })).toBeVisible()
  await expect(page.locator('.shared-suggestions')).toHaveCount(0)
})

test('własny termin pokazany innym z przedmiotu - pole zostaje zaznaczone', async ({ page }) => {
  await tab(page, 'Przedmioty').click()
  await page.getByRole('button', { name: '+ Dodaj termin' }).click()
  const dialog = page.getByRole('dialog', { name: 'Nowy termin' })
  // Bez przedmiotu nie ma komu pokazać - pola nie ma.
  await expect(dialog.getByRole('checkbox', { name: /Pokaż innym/ })).toHaveCount(0)
  await dialog.getByLabel('Tytuł').fill('Wejściówka')
  await dialog.getByLabel('Przedmiot').selectOption('Fizyka')
  await dialog.getByLabel('Data').fill('2026-11-03')
  await dialog.getByLabel('Godzina').fill('12:15')
  await expect(dialog.getByText(/bez notatki/)).toBeVisible()
  await dialog.getByRole('checkbox', { name: /Pokaż innym z tego przedmiotu/ }).check()
  await dialog.getByRole('button', { name: 'Zapisz' }).click()
  await expect(dialog).toBeHidden()

  await page.locator('.deadline-list').getByText('Wejściówka').click()
  const edit = page.getByRole('dialog', { name: 'Edytuj termin' })
  await expect(edit.getByRole('checkbox', { name: /Pokaż innym z tego przedmiotu/ })).toBeChecked()
})

test('ten sam termin pokazała już Ala - zamiast pola informacja', async ({ page }) => {
  await tab(page, 'Przedmioty').click()
  await page.getByRole('button', { name: '+ Dodaj termin' }).click()
  const dialog = page.getByRole('dialog', { name: 'Nowy termin' })
  await dialog.getByLabel('Przedmiot').selectOption('Analiza matematyczna')
  await dialog.getByLabel('Data').fill('2026-10-28')
  await dialog.getByLabel('Godzina').fill('10:15')
  await expect(dialog.getByText('Ten termin już widzą inni z przedmiotu (od ala).')).toBeVisible()
  await expect(dialog.getByRole('checkbox', { name: /Pokaż innym/ })).toHaveCount(0)
})
