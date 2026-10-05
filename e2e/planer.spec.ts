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

test('tydzień: wybrany tydzień zostaje po wejściu w przedmiot, a wraca do bieżącego po zmianie zakładki', async ({ page }) => {
  await tab(page, 'Tydzień').click()
  await page.getByRole('button', { name: 'Następny tydzień' }).click()
  await page.getByRole('button', { name: 'Następny tydzień' }).click()
  await expect(page.getByText('26 października – 1 listopada')).toBeVisible()

  // Wejście w przedmiot: na komputerze kafelek w siatce, na telefonie karta → „Przedmiot →”.
  await page.getByText('Grafika komputerowa').first().click()
  const courseLink = page.getByRole('button', { name: 'Przedmiot →' })
  if (await courseLink.isVisible()) await courseLink.click()
  await page.getByRole('button', { name: 'Wróć' }).click()
  await expect(page.getByText('26 października – 1 listopada')).toBeVisible()

  await tab(page, 'Dziś').click()
  await tab(page, 'Tydzień').click()
  await expect(page.getByText('12 – 18 października')).toBeVisible()
  await expect(page.getByText('ten tydzień')).toBeVisible()
})

test('zmiana sali i „Przywróć z USOS” prosto z karty zajęć', async ({ page }) => {
  const card = page.locator('.card', { hasText: 'Analiza matematyczna' }).first()
  await card.click()
  await card.getByRole('button', { name: 'Zmień', exact: true }).click()
  await page.getByLabel('Sala').fill('999')
  await page.getByRole('button', { name: 'Zapisz' }).click()
  await expect(card.getByText('zmienione')).toBeVisible()
  await expect(card.getByText('s. 999')).toBeVisible()

  await card.getByRole('button', { name: 'Przywróć z USOS' }).click()
  await expect(card.getByText('zmienione')).toHaveCount(0)
  await expect(card.getByText('s. 121')).toBeVisible()
})

test('konto: „Zmień hasło” wysyła link na e-mail konta', async ({ page }) => {
  await tab(page, 'Ustawienia').click()
  await page.getByRole('button', { name: 'Zmień hasło' }).click()
  await expect(page.getByText(/Wysłaliśmy na test@planer.local link do ustawienia nowego hasła/)).toBeVisible()
})

test('ustawienia: „Przywróć cały plan z USOS” cofa wszystkie ręczne zmiany', async ({ page }) => {
  const card = page.locator('.card', { hasText: 'Analiza matematyczna' }).first()
  await card.click()
  await card.getByRole('button', { name: 'Zmień', exact: true }).click()
  await page.getByLabel('Sala').fill('999')
  await page.getByRole('button', { name: 'Zapisz' }).click()
  await expect(card.getByText('zmienione')).toBeVisible()

  await tab(page, 'Ustawienia').click()
  page.once('dialog', (d) => void d.accept())
  await page.getByRole('button', { name: 'Przywróć cały plan z USOS' }).click()
  await expect(page.getByRole('button', { name: 'Przywróć cały plan z USOS' })).toHaveCount(0)
  await tab(page, 'Dziś').click()
  await expect(page.locator('.card', { hasText: 'Analiza matematyczna' }).first().getByText('zmienione')).toHaveCount(0)
})

test('udostępnianie: wysyła sam adres Planera, bez parametrów i danych', async ({ page }) => {
  await page.evaluate('navigator.share = async (data) => { window.sharedData = data }')
  await page.getByRole('button', { name: 'Udostępnij Planera' }).click()
  const shared = (await page.evaluate('window.sharedData')) as { url: string; title: string }
  expect(shared.title).toBe('Planer')
  expect(new URL(shared.url).search).toBe('') // bez ?mock ani innych parametrów
  expect(new URL(shared.url).hash).toBe('')
})

test('lektorat, który już jest w planie, nie da się wybrać drugi raz', async ({ page }) => {
  const LANG = '6420-EEH60-0SA-0008'
  // Ćwiczenia z planu to w USOS właśnie ten lektorat (zapisany) - z dwiema grupami do wyboru.
  await page.route('https://apps.usos.pw.edu.pl/services/**', async (route) => {
    const url = new URL(route.request().url())
    const q = url.searchParams
    const json = (body: unknown) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) })
    if (url.pathname.endsWith('/courses/unit')) {
      const unit = q.get('unit_id') ?? ''
      return json({ course_id: unit === 'U-an-c' ? LANG : unit, term_id: '2026Z', classtype_id: 'CWI' })
    }
    if (url.pathname.endsWith('/courses/course')) return json({ name: { pl: 'Język angielski - poziom B2' }, terms: [{ id: '2026Z' }] })
    if (url.pathname.endsWith('/tt/course_edition') && q.get('course_id') === LANG) {
      const start = q.get('start') ?? ''
      const at = (plus: number, time: string) => {
        const [y, m, d] = start.split('-').map(Number)
        return `${new Date(Date.UTC(y, m - 1, d + plus)).toISOString().slice(0, 10)} ${time}:00`
      }
      const act = (plus: number, group: number) => ({ start_time: at(plus, '10:15'), end_time: at(plus, '12:00'), classtype_id: 'CWI', group_number: group, unit_id: 'U-an-c' })
      return json([act(2, 101), act(3, 102)])
    }
    return json(url.pathname.endsWith('/courses/search') ? { items: [], next_page: false } : [])
  })

  await tab(page, 'Przedmioty').click()
  await page.getByRole('button', { name: /Dobierz grupy/ }).click()
  await expect(page.getByRole('heading', { name: 'Twój obecny plan' })).toBeVisible()
  await page.getByRole('radio', { name: 'Języki (SJO)' }).click()
  await page.getByLabel('Nazwa, kod albo link przedmiotu').fill(LANG)
  await page.getByRole('button', { name: 'Szukaj' }).click()
  await expect(page.getByText(/· już masz w planie/)).toBeVisible()
  await expect(page.getByRole('checkbox', { name: /Język angielski - poziom B2/ })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Dopasuj grupy' })).toBeDisabled()
})

test('plany grup pobierają się raz - potem tylko po "Odśwież"', async ({ page }) => {
  let requests = 0
  await page.route('https://apps.usos.pw.edu.pl/services/**', async (route) => {
    requests++
    const url = new URL(route.request().url())
    const q = url.searchParams
    const json = (body: unknown) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) })
    if (url.pathname.endsWith('/courses/unit')) {
      const unit = q.get('unit_id') ?? ''
      return json({ course_id: unit === 'U-an-c' ? 'AN' : unit, term_id: '2026Z', classtype_id: 'CWI' })
    }
    if (url.pathname.endsWith('/tt/course_edition') && q.get('course_id') === 'AN') {
      const [y, m, d] = (q.get('start') ?? '').split('-').map(Number)
      const at = (plus: number, time: string) => `${new Date(Date.UTC(y, m - 1, d + plus)).toISOString().slice(0, 10)} ${time}:00`
      const act = (plus: number, group: number) => ({ start_time: at(plus, '10:15'), end_time: at(plus, '12:00'), classtype_id: 'CWI', group_number: group, unit_id: 'U-an-c' })
      return json([act(2, 101), act(3, 102)])
    }
    return json([])
  })
  const open = async () => {
    await tab(page, 'Przedmioty').click()
    await page.getByRole('button', { name: /Dobierz grupy/ }).click()
    await expect(page.getByRole('heading', { name: 'Twój obecny plan' })).toBeVisible()
    await expect(page.getByText(/Plany grup z USOS:/)).toBeVisible()
  }

  await open()
  const first = requests
  expect(first).toBeGreaterThan(0)

  // Ponowne wejście i nowe uruchomienie aplikacji: dane z pamięci, bez pytania USOS.
  await page.getByRole('button', { name: 'Wróć' }).click()
  await open()
  // Dwa dni później (początek semestru - dane mogą być nieaktualne, ale pobiera się dopiero na żądanie).
  await page.clock.setFixedTime(new Date('2026-10-16T09:00:00+02:00'))
  await page.reload()
  await open()
  await expect(page.getByText('(mogą być nieaktualne)')).toBeVisible()
  expect(requests).toBe(first)

  await page.getByRole('button', { name: 'Odśwież', exact: true }).click()
  await expect.poll(() => requests).toBeGreaterThan(first)
  await expect(page.getByText(/Plany grup z USOS:/)).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Twój obecny plan' })).toBeVisible()
})

test('stała zmiana grupy: ćwiczenia ze środy na czwartek co tydzień', async ({ page }) => {
  const card = page.locator('.card', { hasText: 'Analiza matematyczna' }).first()
  await card.click()
  await card.getByRole('button', { name: 'Zmień', exact: true }).click()
  await page.getByRole('radio', { name: 'Cała grupa' }).click()
  await page.getByLabel('Dzień tygodnia').selectOption({ label: 'Czwartek' })
  await page.getByRole('dialog').getByLabel('Od', { exact: true }).fill('11:15')
  await page.getByRole('dialog').getByLabel('Do', { exact: true }).fill('13:00')
  await page.getByRole('button', { name: 'Zapisz' }).click()

  await tab(page, 'Przedmioty').click()
  await page.getByText('Analiza matematyczna', { exact: true }).first().click()
  // Następne zajęcia to już czwartek 11:15 (przeniesione ze środy 10:15).
  await expect(page.getByText(/Następne zajęcia: Czwartek, 15 października, 11:15/)).toBeVisible()
  await expect(page.getByText('Czwartek, 22 października').first()).toBeVisible()
  // Dzień jako nagłówek zajęć już nie występuje (oryginał z USOS zostaje tylko w opisie zmiany).
  await expect(page.getByText('Środa, 21 października', { exact: true })).toHaveCount(0)
})

test('notatka ogólna w zakładce Przedmioty zapisuje się i zostaje', async ({ page }) => {
  await tab(page, 'Przedmioty').click()
  const note = page.locator('#general-note')
  await note.fill('Przenieść się z ćwiczeń z analizy do gr. 102')
  await expect(page.getByText('Zapisano ✓')).toBeVisible()
  await tab(page, 'Dziś').click()
  await tab(page, 'Przedmioty').click()
  await expect(page.locator('#general-note')).toHaveValue('Przenieść się z ćwiczeń z analizy do gr. 102')
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

test('lektorat w propozycjach: grupa kolidująca z planem mieści się po zmianie innej grupy', async ({ page }) => {
  const LANG = '6420-EEH60-0SA-0008'
  // "2026-10-12" + dni -> "2026-10-14 10:15:00" (czas lokalny jak w USOS).
  const day = (start: string, plus: number, time: string) => {
    const [y, m, d] = start.split('-').map(Number)
    return `${new Date(Date.UTC(y, m - 1, d + plus)).toISOString().slice(0, 10)} ${time}:00`
  }
  await page.route('https://apps.usos.pw.edu.pl/services/**', async (route) => {
    const url = new URL(route.request().url())
    const q = url.searchParams
    const json = (body: unknown) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) })
    if (url.pathname.endsWith('/courses/unit')) {
      // Grupy do wyboru ma tylko ćwiczenie z analizy; reszta planu - przedmioty bez innych grup.
      const unit = q.get('unit_id') ?? ''
      return json({ course_id: unit === 'U-an-c' ? 'AN' : unit, term_id: '2026Z', classtype_id: 'CWI' })
    }
    if (url.pathname.endsWith('/courses/course')) return json({ name: { pl: 'Język angielski - poziom B2' }, terms: [{ id: '2026Z' }] })
    if (url.pathname.endsWith('/tt/course_edition')) {
      const start = q.get('start') ?? ''
      const act = (plus: number, from: string, to: string, classtype_id: string, group_number: number) => ({
        start_time: day(start, plus, from),
        end_time: day(start, plus, to),
        classtype_id,
        group_number,
        unit_id: 'U-an-c',
      })
      // Analiza: obecna gr. 101 w środę 10:15 albo gr. 102 w czwartek. Lektorat tylko w środę 10:15.
      if (q.get('course_id') === 'AN') return json([act(2, '10:15', '12:00', 'CWI', 101), act(3, '10:15', '12:00', 'CWI', 102)])
      if (q.get('course_id') === LANG) return json([act(2, '10:15', '12:00', 'LEK', 5)])
      return json([])
    }
    return json(url.pathname.endsWith('/courses/search') ? { items: [], next_page: false } : [])
  })

  await tab(page, 'Przedmioty').click()
  await page.getByRole('button', { name: /Dobierz grupy/ }).click()
  await expect(page.getByRole('heading', { name: 'Twój obecny plan' })).toBeVisible()
  await page.getByRole('radio', { name: 'Języki (SJO)' }).click()
  await page.getByLabel('Nazwa, kod albo link przedmiotu').fill(LANG)
  await page.getByRole('button', { name: 'Szukaj' }).click()
  await page.getByRole('button', { name: 'Dopasuj grupy' }).click()
  await expect(page.getByText('Każda grupa koliduje z Twoim planem.')).toBeVisible()

  await page.getByRole('button', { name: 'Uwzględnij w propozycjach' }).click()
  await expect(page.getByRole('button', { name: /Uwzględnione w propozycjach/ })).toBeDisabled()
  await expect(page.getByRole('heading', { name: 'Dobieram też grupę' })).toBeVisible()
  await expect(page.getByText(/nie mieści się w obecnym planie bez kolizji/)).toBeVisible()
  await expect(page.getByText(/Z najlepiej pasującą grupą/)).toHaveCount(0)
  const best = page.locator('.candidate', { has: page.getByRole('heading', { name: 'Najlepsza propozycja' }) })
  await expect(best.getByText(/gr. 101/)).toBeVisible()
  await expect(best.getByText('gr. 102', { exact: true })).toBeVisible()
  await expect(best.getByText('gr. 5', { exact: true })).toBeVisible()

  // Usunięcie - propozycje wracają do samego planu.
  await page.locator('.extra-included').getByRole('button', { name: 'Usuń' }).click()
  await expect(page.getByRole('heading', { name: 'Dobieram też grupę' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Uwzględnij w propozycjach' })).toBeEnabled()
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
  // Telefon (lista): pełna nazwa pod datą. Komputer (siatka): krótko "Święto", pełna nazwa w podpowiedzi.
  await expect(
    page.getByText('Narodowe Święto Niepodległości').or(page.getByTitle('Narodowe Święto Niepodległości')).first(),
  ).toBeVisible()
})
