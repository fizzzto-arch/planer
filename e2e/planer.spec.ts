// Główne ścieżki Plannera, tak jak przejdzie je tester. Każdy test kończy się sprawdzeniem,
// że na stronie nie było żadnego błędu (fixtures.ts).
import { readFileSync } from 'node:fs'
import { expect, tab, test } from './fixtures.ts'

test.beforeEach(async ({ page, errors }) => {
  void errors // uruchamia zbieranie błędów
  await page.goto('/?mock')
  await expect(page.getByRole('heading', { name: 'Planer' })).toBeVisible()
})

test('plan: dziś, tydzień i przedmioty', async ({ page }) => {
  // Środa 9:00 - najbliższe zajęcia to ćwiczenia z analizy o 10:15.
  await expect(page.getByText('Analiza matematyczna').first()).toBeVisible()
  await expect(page.getByText('10:15').first()).toBeVisible()

  await tab(page, 'Tydzień').click()
  // Tydzień 12-18.10 to 2. tydzień semestru (parzysty): laboratorium z programowania, nie z fizyki.
  await expect(page.getByText('Programowanie').first()).toBeVisible()
  await expect(page.getByText('Fizyka')).toHaveCount(0)
  await expect(page.getByText('Grafika komputerowa').first()).toBeVisible()

  await tab(page, 'Przedmioty').click()
  for (const name of ['Analiza matematyczna', 'Fizyka', 'Programowanie', 'Grafika komputerowa']) {
    await expect(page.getByText(name, { exact: true }).first()).toBeVisible()
  }
})

test('termin: dodanie kolokwium widać na liście', async ({ page }) => {
  await tab(page, 'Przedmioty').click()
  await page.getByRole('button', { name: '+ Dodaj termin' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('radio', { name: 'Kolokwium' }).click()
  await dialog.getByLabel('Tytuł').fill('Kolokwium 1')
  await dialog.getByLabel('Przedmiot').selectOption('Fizyka')
  await dialog.getByLabel('Data').fill('2026-10-20')
  await dialog.getByLabel('Godzina').fill('12:15')
  await dialog.getByRole('button', { name: 'Zapisz' }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByText('Kolokwium 1').first()).toBeVisible()
  await expect(page.getByText('za 6 dni').first()).toBeVisible()
})

test('eksport: Excel i kalendarz się pobierają i mają poprawny format', async ({ page }) => {
  await tab(page, 'Tydzień').click()
  await page.getByRole('button', { name: 'Eksportuj plan' }).click()
  await expect(page.getByRole('img', { name: 'Podgląd eksportowanego planu' })).toBeVisible()

  const excel = page.waitForEvent('download')
  await page.getByRole('button', { name: /^Excel/ }).click()
  const xlsx = await excel
  expect(xlsx.suggestedFilename()).toMatch(/\.xlsx$/)
  const bytes = readFileSync(await xlsx.path())
  expect(bytes.subarray(0, 2).toString()).toBe('PK') // archiwum ZIP
  expect(bytes.toString('latin1')).toContain('xl/worksheets/sheet1.xml')

  const calendar = page.waitForEvent('download')
  await page.getByRole('button', { name: /^Kalendarz/ }).click()
  const ics = readFileSync(await (await calendar).path(), 'utf8')
  expect(ics.startsWith('BEGIN:VCALENDAR')).toBe(true)
  expect(ics).toContain('SUMMARY:Grafika komputerowa (Wykład)')
})

test('zgłoszenie ze zdjęciem trafia do skrzynki administratora', async ({ page }) => {
  await tab(page, 'Ustawienia').click()
  await page.getByText('Zgłoszenia od testerów').click()
  await expect(page.getByRole('heading', { name: 'Zgłoszenia' })).toBeVisible()

  await page.getByLabel('Co działa źle albo przeszkadza (−)').fill('Za mały tekst w siatce')
  // Obrazek 1×1 PNG - wystarczy, żeby przejść przez zmniejszanie i wysyłanie.
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  )
  await page.locator('.feedback input[type=file]').setInputFiles({ name: 'zrzut.png', mimeType: 'image/png', buffer: png })
  await expect(page.locator('.feedback-thumbs li')).toHaveCount(1)
  await page.getByRole('button', { name: 'Wyślij' }).click()
  await expect(page.getByText('Dzięki! Zgłoszenie wysłane.')).toBeVisible()

  // Skrzynka: rozwinięcie oznacza jako przeczytane, załącznik da się obejrzeć i pobrać.
  const item = page.locator('.feedback-item').filter({ hasText: 'test@planer.local' }).first()
  await item.locator('.feedback-toggle').click()
  await item.getByRole('button', { name: 'Pokaż' }).click()
  await expect(item.locator('img.feedback-media')).toBeVisible()
  await expect(item.getByRole('link', { name: /Pobierz plik/ })).toBeVisible()
  // "Załatwione" przenosi zgłoszenie z "Do zrobienia" do zakładki "Załatwione".
  await item.getByRole('button', { name: 'Załatwione' }).click()
  const inbox = page.locator('.panel').filter({ has: page.getByRole('heading', { name: /^Skrzynka/ }) })
  await expect(inbox.getByText('Nic nie czeka.')).toBeVisible()
  await inbox.getByRole('radio', { name: 'Załatwione' }).click()
  await expect(inbox.locator('.feedback-item')).toHaveCount(1)
})

test('widok zwykłego użytkownika i powrót do administratora', async ({ page }) => {
  await tab(page, 'Ustawienia').click()
  await page.getByRole('button', { name: 'Zobacz Planera jako zwykły użytkownik' }).click()
  await expect(page.getByText('Widok zwykłego użytkownika')).toBeVisible()
  await tab(page, 'Ustawienia').click()
  await expect(page.getByText('Dostęp do Planera')).toHaveCount(0)
  await expect(page.getByText('Zgłoś uwagę lub pomysł')).toBeVisible()

  await page.getByRole('button', { name: 'Wróć do administratora' }).click()
  await expect(page.getByText('Widok zwykłego użytkownika')).toHaveCount(0)
  await tab(page, 'Ustawienia').click()
  await expect(page.getByText('Dostęp do Planera')).toBeVisible()
})

test('pomoc: otwiera się i wraca gestem wstecz przeglądarki', async ({ page }) => {
  await tab(page, 'Ustawienia').click()
  await page.getByText('Pomoc i prywatność').click()
  await expect(page.getByRole('heading', { name: 'Pomoc i prywatność' })).toBeVisible()
  await expect(page.getByText('Jak usunąć konto i dane?')).toBeVisible()
  await page.goBack()
  await expect(page.getByRole('heading', { name: 'Pomoc i prywatność' })).toHaveCount(0)
})

test('lektorat: wklejony link z USOSweb znajduje przedmiot', async ({ page }) => {
  // USOS podstawiony - test nie zależy od serwera uczelni.
  await page.route('https://apps.usos.pw.edu.pl/services/**', async (route) => {
    const url = new URL(route.request().url())
    const json = (body: unknown) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) })
    if (url.pathname.endsWith('/courses/unit')) return json({ course_id: 'AN', term_id: '2026Z', classtype_id: 'WYK' })
    if (url.pathname.endsWith('/courses/course')) {
      return json({ name: { pl: 'Język angielski - poziom B2' }, terms: [{ id: '2026Z' }] })
    }
    return json(url.pathname.endsWith('/courses/search') ? { items: [], next_page: false } : [])
  })

  await tab(page, 'Przedmioty').click()
  await page.getByRole('button', { name: /Dobierz grupy/ }).click()
  await page.getByRole('radio', { name: 'Języki (SJO)' }).click()
  await page
    .getByLabel('Nazwa, kod albo link przedmiotu')
    .fill('https://usosweb.usos.pw.edu.pl/kontroler.php?_action=katalog2/przedmioty/pokazPrzedmiot&prz_kod=6420-EEH60-0SA-0008')
  await page.getByRole('button', { name: 'Szukaj' }).click()
  await expect(page.getByText('Język angielski - poziom B2')).toBeVisible()
  await expect(page.getByText('6420-EEH60-0SA-0008')).toBeVisible()
  // Jeden wynik jest od razu zaznaczony - można dopasowywać grupy.
  await expect(page.getByRole('button', { name: 'Dopasuj grupy' })).toBeEnabled()
})
