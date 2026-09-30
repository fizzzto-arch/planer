// Główne ścieżki Planera, tak jak przejdzie je tester. Każdy test kończy się sprawdzeniem,
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

test('zadania dla testerów: odhaczanie i "Problem?" z nazwą zadania', async ({ page }) => {
  await tab(page, 'Ustawienia').click()
  await page.getByText('Zgłoszenia od testerów').click()
  const tasks = page.locator('.tester-tasks')
  await expect(tasks.getByText('0 z 10')).toBeVisible()
  // Stan wraca z zapisu na koncie (chwilę po kliknięciu) - czekamy na niego zamiast check().
  await tasks.getByRole('checkbox', { name: /Dodaj swój plan/ }).click()
  await expect(tasks.getByRole('checkbox', { name: /Dodaj swój plan/ })).toBeChecked()
  await expect(tasks.getByText('1 z 10')).toBeVisible()
  await tasks.locator('li').filter({ hasText: 'Wyeksportuj plan' }).getByRole('button', { name: 'Problem?' }).click()
  const form = page.locator('#feedback-form')
  await expect(form.getByRole('radio', { name: 'Błąd' })).toHaveAttribute('aria-checked', 'true')
  await expect(form.getByRole('textbox').first()).toHaveValue('Zadanie „Wyeksportuj plan”: ')
})

test('koperta: historia powiadomień z pełną listą zmian, potem "przeczytane"', async ({ page }) => {
  // Historia w udawanej chmurze - jak zapisałby ją serwer przypomnień.
  await page.evaluate(() => {
    const store = JSON.parse(localStorage.getItem('planer.mock-cloud') ?? '{}')
    store.notifications = {
      n1: {
        kind: 'plan',
        title: 'Zmiany w planie (4)',
        body: 'skrót',
        details: ['Fizyka (wt. 20.10): sala 418 → 120', 'Analiza (pon. 19.10) 8:15 - odwołane', 'Grafika (pt. 23.10) 12:15 - odwołane', 'Programowanie (wt. 27.10) 12:15 - dodatkowe zajęcia'],
        createdAt: Date.now(),
      },
    }
    localStorage.setItem('planer.mock-cloud', JSON.stringify(store))
  })
  await page.reload()
  await expect(page.getByRole('button', { name: 'Powiadomienia (nowe: 1)' })).toBeVisible()
  await page.getByRole('button', { name: 'Powiadomienia (nowe: 1)' }).click()
  await expect(page.getByText('Programowanie (wt. 27.10) 12:15 - dodatkowe zajęcia')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Powiadomienia', exact: true })).toBeVisible()
})

test('trójkąt na pasku otwiera zgłoszenia', async ({ page }) => {
  await page.getByRole('button', { name: /^(Zgłoś problem|Zgłoszenia)/ }).click()
  await expect(page.getByText('Zadania do przetestowania')).toBeVisible()
  await expect(page.locator('#feedback-form')).toBeVisible()
})

test('strona przedmiotu: prowadzący z tytułem i postęp spotkań', async ({ page }) => {
  // USOS: koordynatorka prowadzi też wykład; ćwiczenia prowadzi ktoś inny.
  await page.route('https://apps.usos.pw.edu.pl/services/**', (route) => {
    const url = new URL(route.request().url())
    const json = (body: unknown) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) })
    const nowak = { id: '11', first_name: 'Anna', last_name: 'Nowak' }
    const kowal = { id: '22', first_name: 'Jan', last_name: 'Kowalski' }
    if (url.pathname.endsWith('/courses/unit')) return json({ course_id: 'AN-1', term_id: '2026Z' })
    if (url.pathname.endsWith('/courses/course_edition')) return json({ coordinators: [nowak], lecturers: [nowak, kowal] })
    if (url.pathname.endsWith('/tt/classgroup_dates2')) {
      return json([{ lecturer_ids: [url.searchParams.get('unit_id') === 'U-an-w' ? '11' : '22'] }])
    }
    return json({})
  })

  await tab(page, 'Przedmioty').click()
  await page.getByText('Analiza matematyczna', { exact: true }).first().click()
  const staff = page.locator('.staff')
  await expect(staff.getByText('Koordynator przedmiotu · Wykład gr. 1')).toBeVisible()
  await expect(staff.getByText('Ćwiczenia gr. 101')).toBeVisible()
  // Tytuł doczytuje serwer (w udawanej chmurze - po chwili).
  await expect(staff.getByText('dr inż.').first()).toBeVisible()
  await expect(staff.getByRole('link', { name: /Anna Nowak/ })).toHaveAttribute('href', /os_id=11$/)

  // 14.10, 9:00: wykłady 5 i 12.10 za nami, ćwiczenia 7.10 za nami (14.10 o 10:15 jeszcze nie).
  const progress = page.locator('.course-info')
  await expect(progress.getByText('2 z 15 za Tobą')).toBeVisible()
  await expect(progress.getByText('1 z 15 za Tobą')).toBeVisible()
  await expect(progress.getByRole('link', { name: 'Przedmiot w USOSweb ↗' })).toHaveAttribute('href', /prz_kod=AN-1$/)
})

test('wspólne okienka: włączenie w ustawieniach, wybór znajomej, wynik w tygodniu', async ({ page }) => {
  // Bez udostępnienia własnych godzin - tylko zachęta (cudzych nie widać).
  await tab(page, 'Tydzień').click()
  await page.getByRole('button', { name: 'Wspólne okienka' }).click()
  await expect(page.getByRole('dialog').getByText('Pokazuj znajomym, kiedy mam zajęcia', { exact: false })).toBeVisible()
  await page.getByRole('dialog').getByRole('button', { name: 'Przejdź do ustawień' }).click()

  await page.getByRole('switch', { name: /Pokazuj znajomym/ }).check()
  await tab(page, 'Tydzień').click()
  await page.getByRole('button', { name: 'Wspólne okienka' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Ala (przykład)' }).click()
  // 14.10 (śr.): ja 10:15-12:00, Ala 8:15-10:00, 12:15-14:00, 16:15-18:00 - wspólnie wolni od 18:00.
  await expect(dialog.getByText('Wszyscy wolni od 18:00').first()).toBeVisible()
})

test('kalendarz akademicki: święto przy dniu w tygodniu', async ({ page }) => {
  await tab(page, 'Tydzień').click()
  // Tydzień 9-15.11 - 11.11 to święto (kalendarz podstawiony w fixtures.ts).
  for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'Następny tydzień' }).click()
  await expect(page.getByText('Narodowe Święto Niepodległości').first()).toBeVisible()
})
