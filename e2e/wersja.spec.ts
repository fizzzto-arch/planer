// Wersja 1.0: karta "Co nowego" raz po aktualizacji, lista zmian w Ustawieniach, kontakt w Pomocy.
import { expect, tab, test } from './fixtures.ts'

test.describe('po aktualizacji', () => {
  test.use({ seenRelease: false })

  test('karta „Co nowego” raz po aktualizacji, potem lista w Ustawieniach', async ({ page, errors }) => {
    void errors
    await page.goto('/?mock')
    const card = page.locator('.whats-new')
    await expect(card.getByRole('heading', { name: 'Nowość: Planer 1.0' })).toBeVisible()
    await expect(card.locator('li')).toHaveCount(3)
    await card.getByRole('button', { name: 'OK' }).click()
    await expect(card).toHaveCount(0)

    // Drugi raz już się nie pokazuje.
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Planer' })).toBeVisible()
    await expect(page.locator('.whats-new')).toHaveCount(0)

    await tab(page, 'Ustawienia').click()
    await expect(page.getByText(/Planer 1\.0 · wersja/)).toBeVisible()
    await page.getByRole('button', { name: /^Co nowego/ }).click()
    const dialog = page.getByRole('dialog', { name: 'Co nowego w Planerze' })
    await expect(dialog.getByRole('heading', { name: /Wersja 1\.0/ })).toBeVisible()
    await expect(dialog.locator('li')).toHaveCount(8)
    await dialog.locator('.dialog-actions').getByRole('button', { name: 'Zamknij' }).click()
    await expect(dialog).toBeHidden()
  })
})

test.describe('nowa osoba', () => {
  test.use({ seenRelease: false, seedPlan: false })

  test('bez planu - zaczyna od przewodnika, bez karty „Co nowego”', async ({ page, errors }) => {
    void errors
    await page.goto('/?mock')
    await expect(page.getByText('Dodaj swój plan')).toBeVisible()
    await expect(page.locator('.whats-new')).toHaveCount(0)
  })
})

test('pomoc: adres kontaktowy', async ({ page, errors }) => {
  void errors
  await page.goto('/?mock')
  await tab(page, 'Ustawienia').click()
  await page.getByText('Pomoc i prywatność').click()
  const contact = page.locator('.panel', { has: page.getByRole('heading', { name: 'Kontakt' }) })
  await expect(contact.getByRole('link', { name: 'fizzz.to@gmail.com' })).toHaveAttribute('href', 'mailto:fizzz.to@gmail.com')
})
