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

  await tab(page, 'Dla testerów').click()
  await page.getByRole('button', { name: /Dobierz grupy/ }).click()
  await expect(page.getByRole('heading', { name: 'Twój obecny plan' })).toBeVisible()
  await page.getByRole('radio', { name: 'Języki (SJO)' }).click()
  await page.getByLabel('Nazwa, kod albo link przedmiotu').fill(LANG)
  await page.getByRole('button', { name: 'Szukaj', exact: true }).click()
  await expect(page.getByText(/· już masz w planie/)).toBeVisible()
  await expect(page.getByRole('checkbox', { name: /Język angielski - poziom B2/ })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Dopasuj grupy' })).toBeDisabled()
})

test('program studiów: kierunek i semestr z planu, sylabus przedmiotu', async ({ page }) => {
  // Plan studenta 3. semestru Inżynierii Biomedycznej (nazwy jak w USOS).
  await page.evaluate(() => {
    const at = (day: number, hour: number) => new Date(2026, 9, day, hour, 15).getTime()
    const names = ['Grafika komputerowa', 'Radiologia', 'Podstawy automatyki', 'Laboratorium elektrotechniki']
    const meetings = names.map((courseName, i) => ({
      id: `ib-${i}`, courseName, type: 'WYK', start: at(15 + i, 10), end: at(15 + i, 12), room: '1', building: null,
      address: null, groupNumber: 1, unitId: null, usosUrl: null, cancelled: false,
    }))
    localStorage.setItem('planer.plan.v1', JSON.stringify({ source: { kind: 'file', name: 'ib.ics' }, updatedAt: Date.now(), meetings }))
  })
  await page.reload()
  await tab(page, 'Dla testerów').click()
  await page.getByRole('button', { name: /Program studiów/ }).click()
  await expect(page.getByText('Semestr 3 z 7')).toBeVisible()
  // Postęp w godzinach: semestry 1-2 (780 h) z całego programu (1740 h); zajęcia z planu jeszcze przed nami.
  const steps = page.locator('.program-step-bar > span')
  await expect(steps.nth(0)).toHaveAttribute('style', /width: 100%/)
  await expect(steps.nth(2)).toHaveAttribute('style', /width: 0%/)
  const third = page.locator('#program-semester-3')
  await expect(third.locator('.program-semester-load')).toHaveText('7 przedmiotów · 4 egzaminy')

  // Bieżący semestr otwarty, przedmiot z planu oznaczony; po stuknięciu - sylabus.
  const radiology = page.locator('.program-course', { has: page.locator('.program-course-name', { hasText: /^Radiologia/ }) })
  await expect(radiology.getByText('w planie')).toBeVisible()
  await expect(radiology.locator('.program-course-hours')).toHaveText('wyk. 30 h · lab. 15 h · egzamin')
  await radiology.locator('summary').first().click()
  await expect(radiology.getByText(/wykład - zaliczenie na podstawie egzaminu/)).toBeVisible()
  // Zamiast ściany tekstu z sylabusa - krótki opis i tematy.
  await expect(radiology.getByText(/Promieniowanie X i γ w diagnostyce/)).toBeVisible()
  await expect(radiology.getByText('Dozymetria i ochrona radiologiczna')).toBeVisible()
  await expect(radiology.getByText(/Zakres wykładu obejmuje/)).toHaveCount(0)
  await expect(radiology.getByRole('link', { name: 'Pełny sylabus' })).toHaveAttribute('href', /idPrzedmiot\/900264$/)

  // Inny semestr zwinięty - rozwija się po stuknięciu.
  const fourth = page.locator('.program-semester', { has: page.locator('.program-semester-title', { hasText: 'Semestr 4' }) })
  await expect(fourth).not.toHaveAttribute('open')
  await fourth.locator('summary').first().click()
  await expect(fourth.locator('.program-course-name', { hasText: 'Metody numeryczne' })).toBeVisible()

  // Pasek semestrów przenosi do semestru.
  await page.getByRole('button', { name: 'Semestr 6', exact: true }).click()
  await expect(page.locator('#program-semester-6')).toHaveAttribute('open')

  // "Przyda się w" - przedmiot obieralny z 5. semestru rozwija się razem z listą obieralnych.
  await radiology.getByRole('button', { name: /Kontrola Jakości Radiologicznych Urządzeń Diagnostycznych/ }).click()
  const quality = page.locator('.program-course', { has: page.locator('.program-course-name', { hasText: /^Kontrola Jakości/ }) })
  await expect(quality).toHaveAttribute('open')
  await expect(quality.getByText(/Testy jakości aparatów RTG/)).toBeVisible()

  await radiology.getByRole('button', { name: 'Przedmiot w Planerze' }).click()
  await expect(page.getByRole('heading', { name: 'Radiologia' })).toBeVisible()
  await page.goBack()
  await expect(page.getByText('Semestr 3 z 7')).toBeVisible()
})

test('zaliczenie: rozpiska na liście i na stronie przedmiotu, data kolokwium jednym stuknięciem', async ({ page }) => {
  await page.evaluate(() => {
    const at = (day: number, hour: number) => new Date(2026, 9, day, hour, 15).getTime()
    const names = ['Grafika komputerowa', 'Radiologia', 'Rachunek prawdopodobieństwa i statystyka', 'Laboratorium elektrotechniki']
    const meetings = names.map((courseName, i) => ({
      id: `ib-${i}`, courseName, type: i === 2 ? 'CWI' : 'WYK', start: at(15 + i, 10), end: at(15 + i, 12), room: '1', building: null,
      address: null, groupNumber: 1, unitId: null, usosUrl: null, cancelled: false,
    }))
    localStorage.setItem('planer.plan.v1', JSON.stringify({ source: { kind: 'file', name: 'ib.ics' }, updatedAt: Date.now(), meetings }))
  })
  await page.reload()
  await tab(page, 'Przedmioty').click()
  // Na liście: skrót z regulaminu; przedmiot bez regulaminu - z sylabusa.
  await expect(page.locator('.course-row', { hasText: 'Laboratorium elektrotechniki' }).getByText('Zaliczenie: 5 ćwiczeń laboratoryjnych')).toBeVisible()
  const row = page.locator('.course-row', { hasText: 'Rachunek prawdopodobieństwa' })
  await expect(row.getByText('Zaliczenie: 2 kolokwia · egzamin / zwolnienie')).toBeVisible()
  await row.click()

  // Zwinięty panel: tytuł i krótko zasady; szczegóły po stuknięciu.
  const box = page.locator('.assessment-panel')
  await expect(box.getByRole('heading', { name: 'Zaliczenie' })).toBeVisible()
  await expect(box.locator('.assessment-panel-summary')).toHaveText('2 kolokwia · egzamin / zwolnienie')
  await expect(box.locator('.assessment')).toBeHidden()
  await box.locator('summary').click()
  const panel = box.locator('.assessment')
  await expect(panel.locator('.assessment-form')).toHaveText(['Ćwiczenia', 'Ćwiczenia', 'Całość'])
  await expect(panel.getByText(/Bez egzaminu: min\. 12 pkt/)).toBeVisible()
  await expect(panel.getByRole('heading', { name: 'Warto wiedzieć' })).toBeVisible()
  await expect(panel.getByText('Na podstawie regulaminu przedmiotu 2026/27.')).toBeVisible()

  // "+ Dodaj datę" przy kolokwiach - edytor z rodzajem i tytułem, zostaje tylko wpisać datę.
  const colloquia = panel.locator('li', { hasText: '2 kolokwia po 16 pkt' })
  await colloquia.getByRole('button', { name: '+ Dodaj datę' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByLabel('Tytuł')).toHaveValue('Kolokwium 1')
  await expect(dialog.getByRole('radio', { name: 'Kolokwium' })).toBeChecked()
  await dialog.getByLabel('Data').fill('2026-10-28')
  await dialog.getByLabel('Godzina').fill('10:15')
  await dialog.getByRole('button', { name: 'Zapisz' }).click()
  await expect(dialog).toBeHidden()
  await expect(colloquia.getByText('w terminach: 1 z 2')).toBeVisible()
  // Egzamin jest jeden - po dodaniu przycisk znika.
  const exam = panel.locator('li', { hasText: 'egzamin pisemny' })
  await exam.getByRole('button', { name: '+ Dodaj datę' }).click()
  await expect(dialog.getByLabel('Tytuł')).toHaveValue('Egzamin')
  await dialog.getByLabel('Data').fill('2027-02-03')
  await dialog.getByLabel('Godzina').fill('09:00')
  await dialog.getByRole('button', { name: 'Zapisz' }).click()
  await expect(exam.getByText('w terminach: 1 z 1')).toBeVisible()
  await expect(exam.getByRole('button', { name: '+ Dodaj datę' })).toHaveCount(0)
})

// Plan 3. semestru Inżynierii Biomedycznej (nazwy jak w USOS) - z programem studiów i zasadami zaliczeń.
async function seedIbPlan(page: import('@playwright/test').Page) {
  await page.evaluate(() => {
    const at = (day: number, hour: number) => new Date(2026, 9, day, hour, 15).getTime()
    const names = ['Grafika komputerowa', 'Radiologia', 'Rachunek prawdopodobieństwa i statystyka', 'Laboratorium elektrotechniki']
    const meetings = names.map((courseName, i) => ({
      id: `ib-${i}`, courseName, type: 'WYK', start: at(15 + i, 10), end: at(15 + i, 12), room: '1', building: null,
      address: null, groupNumber: 1, unitId: null, usosUrl: null, cancelled: false,
    }))
    localStorage.setItem('planer.plan.v1', JSON.stringify({ source: { kind: 'file', name: 'ib.ics' }, updatedAt: Date.now(), meetings }))
  })
  await page.reload()
}

test('punkty: kalkulator według regulaminu - ile brakuje i jaka ocena', async ({ page }) => {
  await seedIbPlan(page)
  await tab(page, 'Przedmioty').click()
  await page.locator('.course-row', { hasText: 'Radiologia' }).click()
  await page.locator('.assessment-panel > summary').click()
  const panel = page.locator('.score')
  await expect(panel.getByRole('heading', { name: 'Twoje punkty' })).toBeVisible()
  await expect(panel.getByText('zalicza od 16 pkt')).toBeVisible()

  // Trzy laboratoria: prognoza z dotychczasowego wyniku, do zaliczenia laboratorium brakuje.
  await panel.getByRole('textbox', { name: 'Laboratorium 1' }).fill('7')
  await panel.getByRole('textbox', { name: 'Laboratorium 2' }).fill('6,5')
  await panel.getByRole('textbox', { name: 'Laboratorium 3' }).fill('5')
  await expect(panel.getByText('do zaliczenia brakuje 2,5 pkt')).toBeVisible()
  await expect(panel.getByText(/^Prognoza: 4/)).toBeVisible()

  // Za dużo punktów - pole na czerwono, nie liczy się.
  await panel.getByRole('textbox', { name: 'Laboratorium 4' }).fill('9')
  await expect(panel.getByRole('textbox', { name: 'Laboratorium 4' })).toHaveAttribute('aria-invalid', 'true')

  // Wszystko wpisane: ocena (średnia ważona egzaminu i laboratorium po 50%).
  await panel.getByRole('textbox', { name: 'Laboratorium 4' }).fill('6')
  await panel.getByRole('textbox', { name: 'Laboratorium 5' }).fill('7,5')
  await panel.getByRole('textbox', { name: 'Egzamin' }).fill('24')
  await expect(panel.getByText('Masz 80% z 100%')).toBeVisible()
  await expect(panel.getByText('Ocena: 4', { exact: true })).toBeVisible()
  await expect(panel.getByText('Do 4,5 zabrakło 1%')).toBeVisible()

  // Punkty zapisują się na koncie - po powrocie na stronę przedmiotu są na miejscu.
  await panel.getByRole('textbox', { name: 'Egzamin' }).blur()
  await page.goBack()
  await page.locator('.course-row', { hasText: 'Radiologia' }).click()
  // Zwinięty panel pokazuje wynik w skrócie.
  await expect(page.locator('.assessment-panel-summary')).toContainText('masz 80% · ocena 4')
  await page.locator('.assessment-panel > summary').click()
  await expect(page.locator('.score').getByRole('textbox', { name: 'Egzamin' })).toHaveValue('24')
  await expect(page.locator('.score').getByRole('textbox', { name: 'Laboratorium 2' })).toHaveValue('6,5')
})

test('punkty: zwolnienie z egzaminu (RPiS)', async ({ page }) => {
  await seedIbPlan(page)
  await tab(page, 'Przedmioty').click()
  await page.locator('.course-row', { hasText: 'Rachunek prawdopodobieństwa' }).click()
  await page.locator('.assessment-panel > summary').click()
  const panel = page.locator('.score')
  await panel.getByRole('textbox', { name: 'Kolokwium 1' }).fill('13')
  await expect(panel.getByText('Do zwolnienia z egzaminu brakuje 19,5 pkt')).toBeVisible()
  await panel.getByRole('textbox', { name: 'Kolokwium 2' }).fill('14')
  await panel.getByRole('textbox', { name: 'Aktywność' }).fill('7')
  await expect(panel.getByText('Zwolnienie z egzaminu – ocena 4,5')).toBeVisible()
  await expect(panel.getByText('zwolnienie ✓')).toBeVisible()
})

test('punkty: własna rozpiska dla przedmiotu bez zasad', async ({ page }) => {
  await tab(page, 'Przedmioty').click()
  await page.locator('.course-row', { hasText: 'Fizyka' }).click()
  await expect(page.locator('.assessment-panel-summary')).toHaveText('Wpisuj punkty, a Planer policzy ocenę')
  await page.locator('.assessment-panel > summary').click()
  const panel = page.locator('.score')
  await panel.getByRole('button', { name: 'Ułóż rozpiskę' }).click()
  const dialog = page.getByRole('dialog', { name: 'Rozpiska zaliczenia' })
  await dialog.getByRole('textbox', { name: 'Nazwa pozycji 2' }).fill('Laboratorium')
  await dialog.getByRole('textbox', { name: 'Maksimum punktów, pozycja 1' }).fill('20')
  await dialog.getByRole('button', { name: 'Zapisz' }).click()
  await expect(dialog.getByRole('alert')).toHaveText('Każda pozycja potrzebuje nazwy i maksymalnej liczby punktów.')
  await dialog.getByRole('textbox', { name: 'Maksimum punktów, pozycja 2' }).fill('30')
  await dialog.getByRole('button', { name: 'Zapisz' }).click()
  await expect(dialog).toBeHidden()

  // Domyślna skala PW: 3 od 51% z 50 pkt = 25,5 pkt.
  await panel.getByRole('textbox', { name: 'Kolokwium 1' }).fill('12')
  await panel.getByRole('textbox', { name: 'Laboratorium' }).fill('14')
  await expect(panel.getByText('Masz 26 z 50 pkt')).toBeVisible()
  await expect(panel.getByText('Ocena: 3', { exact: true })).toBeVisible()
  await expect(panel.getByText('Do 3,5 zabrakło 4,5 pkt')).toBeVisible()

  // Rozpiskę można zmienić albo usunąć razem z punktami.
  await panel.getByRole('button', { name: 'Zmień rozpiskę' }).click()
  page.once('dialog', (d) => d.accept())
  await page.getByRole('dialog', { name: 'Zmień rozpiskę' }).getByRole('button', { name: 'Usuń', exact: true }).click()
  await expect(panel.getByRole('button', { name: 'Ułóż rozpiskę' })).toBeVisible()
})

test('oceny: średnia w programie studiów', async ({ page }) => {
  await seedIbPlan(page)
  await tab(page, 'Dla testerów').click()
  await page.getByRole('button', { name: /Program studiów/ }).click()
  await expect(page.getByText(/Wpisz oceny przy przedmiotach/)).toBeVisible()

  const first = page.locator('#program-semester-1')
  await first.locator('summary').first().click()
  const course = (name: string) => first.locator('.program-course', { has: page.locator('.program-course-name', { hasText: name }) })
  await course('Fizyka 1').locator('summary').first().click()
  await course('Fizyka 1').getByRole('radio', { name: '4,5' }).click()
  await course('Metrologia').locator('summary').first().click()
  await course('Metrologia').getByRole('radio', { name: '3', exact: true }).click()

  // Ważona punktami ECTS: (4,5 × 6 + 3 × 5) / 11 = 3,82; zwykła 3,75.
  await expect(page.locator('.program-average')).toContainText('Średnia ze studiów: 3,82')
  await expect(page.locator('.program-average')).toContainText('zwykła 3,75 · 2 oceny')
  await expect(first.locator('.program-semester-load')).toContainText('średnia 3,82')
  await expect(course('Fizyka 1').locator('.program-grade')).toHaveText('ocena 4,5')

  // Ponowne stuknięcie usuwa ocenę; przyszłe semestry bez ocen.
  await course('Metrologia').getByRole('radio', { name: '3', exact: true }).click()
  await expect(page.locator('.program-average')).toContainText('Średnia ze studiów: 4,5')
  const fourth = page.locator('#program-semester-4')
  await fourth.locator('summary').first().click()
  await expect(fourth.getByRole('radiogroup')).toHaveCount(0)
})

test('usuwanie z planu: jeden rodzaj zajęć albo cały przedmiot, przywracanie', async ({ page }) => {
  await tab(page, 'Przedmioty').click()
  const row = (name: string) => page.locator('.course-row', { hasText: name })

  // Sam wykład z Analizy - ćwiczenia zostają.
  await row('Analiza matematyczna').click()
  await page.getByRole('button', { name: 'Usuń z planu…' }).click()
  const dialog = page.getByRole('dialog', { name: 'Usuń z planu' })
  await dialog.getByRole('radio', { name: 'Tylko: Wykład' }).check()
  await dialog.getByRole('button', { name: 'Usuń', exact: true }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByRole('heading', { name: 'Analiza matematyczna' })).toBeVisible()
  await expect(page.locator('.course-header')).not.toContainText('Wykład')

  // Fizyka ma jeden rodzaj zajęć - bez wyboru, znika cały przedmiot i wracamy do listy.
  await page.goBack()
  await row('Fizyka').click()
  await page.getByRole('button', { name: 'Usuń z planu…' }).click()
  await expect(dialog.getByRole('radio')).toHaveCount(0)
  await dialog.getByRole('button', { name: 'Usuń', exact: true }).click()
  await expect(row('Programowanie')).toBeVisible()
  await expect(row('Fizyka')).toHaveCount(0)

  // Po przeładowaniu dalej usunięte; przywrócenie z listy na dole.
  await page.reload()
  await tab(page, 'Przedmioty').click()
  await expect(row('Fizyka')).toHaveCount(0)
  const removed = page.locator('.hidden-classes')
  await removed.getByText('Usunięte z planu (2)').click()
  await expect(removed.getByText('Analiza matematyczna')).toBeVisible()
  await removed.locator('li', { hasText: 'Fizyka' }).getByRole('button', { name: 'Przywróć' }).click()
  await expect(row('Fizyka')).toBeVisible()
  await expect(removed.getByText('Usunięte z planu (1)')).toBeVisible()
})

test('daty zajęć: grupa z USOS tylko w nieparzyste tygodnie z zakresu, potem przywrócenie', async ({ page }) => {
  await tab(page, 'Przedmioty').click()
  await page.locator('.course-row', { hasText: 'Grafika komputerowa' }).click()
  // Wykład w piątki co tydzień; najbliższy 16.10 (tydzień 2).
  await expect(page.getByText(/Następne zajęcia: Piątek, 16 października/)).toBeVisible()
  await page.locator('.course-meetings .card').first().locator('summary').click()
  await page.getByRole('button', { name: 'Zmień', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Zmień zajęcia' })
  await dialog.getByRole('radio', { name: 'Cała grupa' }).click()
  await dialog.getByRole('radio', { name: 'Co tydzień od–do' }).click()
  await dialog.getByLabel('Od dnia').fill('2026-10-19')
  await dialog.getByLabel('Do dnia (włącznie)').fill('2026-11-15')
  await dialog.getByRole('checkbox', { name: 'Tygodnie parzyste' }).uncheck()
  await dialog.getByRole('button', { name: 'Zapisz' }).click()
  await expect(dialog).toBeHidden()
  // Zostają 23.10 (tydzień 3) i 6.11 (tydzień 5).
  await expect(page.getByText(/Następne zajęcia: Piątek, 23 października/)).toBeVisible()
  await expect(page.locator('.course-meetings .card')).toHaveCount(2)

  await page.locator('.course-meetings .card').first().locator('summary').click()
  await page.getByRole('button', { name: 'Zmień', exact: true }).click()
  await dialog.getByRole('radio', { name: 'Cała grupa' }).click()
  await expect(dialog.getByRole('radio', { name: 'Co tydzień od–do' })).toHaveAttribute('aria-checked', 'true')
  await dialog.getByRole('button', { name: 'Przywróć grupę z USOS' }).click()
  await expect(page.getByText(/Następne zajęcia: Piątek, 16 października/)).toBeVisible()
})

test('daty zajęć: grupa z USOS od teraz na 3 zajęcia - także w tygodnie, w których USOS ich nie ma', async ({ page }) => {
  await tab(page, 'Przedmioty').click()
  await page.locator('.course-row', { hasText: 'Fizyka' }).click()
  // Laboratorium we wtorki co dwa tygodnie (w USOS: 20.10, 3.11, 17.11...).
  await page.locator('.course-meetings .card').first().locator('summary').click()
  await page.getByRole('button', { name: 'Zmień', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Zmień zajęcia' })
  await dialog.getByRole('radio', { name: 'Cała grupa' }).click()
  await dialog.getByRole('radio', { name: 'Co tydzień od–do' }).click()
  await dialog.getByLabel('Od dnia').fill('2026-10-14')
  // Liczone od najbliższego wtorku: 20.10, 27.10, 3.11.
  await dialog.getByLabel(/^Liczba zajęć/).fill('3')
  await expect(dialog.getByLabel('Do dnia (włącznie)')).toHaveValue('2026-11-03')
  await dialog.getByRole('button', { name: 'Zapisz' }).click()
  await expect(dialog).toBeHidden()
  for (const day of ['Wtorek, 20 października', 'Wtorek, 27 października', 'Wtorek, 3 listopada']) {
    await expect(page.locator('.course-meetings').getByText(day)).toBeVisible()
  }
  await expect(page.locator('.course-meetings .card')).toHaveCount(3)
})

test('daty zajęć: własne zajęcia w wybrane dni', async ({ page }) => {
  await tab(page, 'Przedmioty').click()
  await page.locator('.course-row', { hasText: 'Fizyka' }).click()
  await page.getByRole('button', { name: '+ Dodaj zajęcia' }).click()
  const dialog = page.getByRole('dialog', { name: 'Dodaj własne zajęcia' })
  await dialog.getByRole('radio', { name: 'Wybrane dni' }).click()
  await dialog.getByLabel('Od', { exact: true }).fill('16:15')
  await dialog.getByLabel('Do', { exact: true }).fill('18:00')
  await dialog.getByRole('button', { name: 'Zapisz' }).click()
  await expect(dialog.getByRole('alert')).toHaveText('Wybierz co najmniej jeden dzień.')
  for (const day of ['2026-10-21', '2026-11-04']) {
    await dialog.getByLabel('Dzień zajęć').fill(day)
    await dialog.getByRole('button', { name: 'Dodaj dzień' }).click()
  }
  await expect(dialog.locator('.class-dates-chips li')).toHaveCount(2)
  await dialog.getByRole('button', { name: 'Zapisz' }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByText('Środa, 21 października')).toBeVisible()
  await expect(page.getByText('Środa, 4 listopada')).toBeVisible()
  await expect(page.getByText('Środa, 28 października')).toHaveCount(0)
})

test('daty zajęć: liczba zajęć sama liczy datę końca (też tylko w parzyste tygodnie)', async ({ page }) => {
  await tab(page, 'Przedmioty').click()
  await page.locator('.course-row', { hasText: 'Fizyka' }).click()
  await page.getByRole('button', { name: '+ Dodaj zajęcia' }).click()
  const dialog = page.getByRole('dialog', { name: 'Dodaj własne zajęcia' })
  await dialog.getByRole('radio', { name: 'Co tydzień od–do' }).click()
  await dialog.getByLabel('Od dnia').fill('2026-10-21')
  await dialog.getByLabel(/^Liczba zajęć/).fill('3')
  await expect(dialog.getByLabel('Do dnia (włącznie)')).toHaveValue('2026-11-04')
  // Tylko parzyste tygodnie: 28.10, 11.11 i 25.11 - koniec przelicza się sam.
  await dialog.getByRole('checkbox', { name: 'Tygodnie nieparzyste' }).uncheck()
  await expect(dialog.getByLabel('Do dnia (włącznie)')).toHaveValue('2026-11-25')
  await dialog.getByLabel('Od', { exact: true }).fill('16:15')
  await dialog.getByLabel('Do', { exact: true }).fill('18:00')
  await dialog.getByRole('button', { name: 'Zapisz' }).click()
  await expect(dialog).toBeHidden()
  for (const day of ['Środa, 28 października', 'Środa, 11 listopada', 'Środa, 25 listopada']) {
    await expect(page.getByText(day)).toBeVisible()
  }
  await expect(page.getByText('Środa, 4 listopada')).toHaveCount(0)
})

test('zajęcia online: zamiast sali "online"', async ({ page }) => {
  await tab(page, 'Przedmioty').click()
  await page.locator('.course-row', { hasText: 'Grafika komputerowa' }).click()
  const card = page.locator('.course-meetings .card').first()
  await expect(card.locator('.card-meta')).toContainText('s. 170')
  await card.locator('summary').click()
  await page.getByRole('button', { name: 'Zmień', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Zmień zajęcia' })
  await dialog.getByRole('checkbox', { name: 'Zajęcia online' }).check()
  await expect(dialog.getByLabel('Sala')).toHaveCount(0)
  await dialog.getByRole('button', { name: 'Zapisz' }).click()
  await expect(dialog).toBeHidden()
  await expect(card.locator('.card-meta')).toContainText('online')
  await expect(card.locator('.card-meta')).not.toContainText('s. 170')
})

test('strona przedmiotu: strzałki do sąsiednich przedmiotów, "wstecz" wraca do listy', async ({ page }) => {
  await tab(page, 'Przedmioty').click()
  await page.locator('.course-row', { hasText: 'Fizyka' }).click()
  const title = page.locator('.course-header h2')
  await expect(title).toHaveText('Fizyka')
  await expect(page.locator('.course-switch-count')).toHaveText('2 z 4')
  await page.getByRole('button', { name: 'Następny przedmiot' }).click()
  await expect(title).toHaveText('Grafika komputerowa')
  await page.getByRole('button', { name: 'Poprzedni przedmiot' }).click()
  await page.getByRole('button', { name: 'Poprzedni przedmiot' }).click()
  await expect(title).toHaveText('Analiza matematyczna')
  // Po pierwszym - ostatni.
  await page.getByRole('button', { name: 'Poprzedni przedmiot' }).click()
  await expect(title).toHaveText('Programowanie')
  await expect(page.locator('.course-switch-count')).toHaveText('4 z 4')
  await page.goBack()
  await expect(page.locator('.course-row', { hasText: 'Fizyka' })).toBeVisible()
})

test('pierwsze kroki: jeden krok naraz, sam się odhacza, Pomiń i Ukryj', async ({ page }, info) => {
  const card = page.locator('.first-steps')
  await expect(card.getByRole('heading', { name: /Pierwsze kroki/ })).toBeVisible()
  // Telefon: najpierw Planer na ekranie początkowym (bez przycisku - "Dalej").
  if (info.project.name !== 'komputer') {
    await expect(card.getByText('Planer na ekranie telefonu')).toBeVisible()
    await card.getByRole('button', { name: 'Dalej' }).click()
  }
  // Otwarcie przedmiotu odhacza krok - po powrocie jest już następny.
  await expect(card.getByText('Zajrzyj do przedmiotu')).toBeVisible()
  await card.getByRole('button', { name: 'Otwórz' }).click()
  await expect(page.locator('.course-header')).toBeVisible()
  await page.goBack()
  await expect(card.getByText('Wyszukiwanie')).toBeVisible()
  await card.getByRole('button', { name: 'Pomiń' }).click()
  await expect(card.getByText('Przypomnienia o terminach')).toBeVisible()
  // Ukryj - zapamiętane (także po przeładowaniu).
  await card.getByRole('button', { name: 'Ukryj' }).click()
  await expect(card).toHaveCount(0)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Planer' })).toBeVisible()
  await expect(page.locator('.first-steps')).toHaveCount(0)
})

test('program studiów: plan innego kierunku - bez przycisku', async ({ page }) => {
  await tab(page, 'Przedmioty').click()
  await expect(page.getByText('Nadchodzące terminy')).toBeVisible()
  await expect(page.getByRole('button', { name: /Program studiów/ })).toHaveCount(0)
  await expect(page.getByText(/^Zaliczenie:/)).toHaveCount(0)
  await tab(page, 'Dla testerów').click()
  await expect(page.getByRole('heading', { name: 'Dla testerów' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Program studiów/ })).toHaveCount(0)
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
    await tab(page, 'Dla testerów').click()
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

test('notatki: domyślnie wyłączone, po włączeniu notatka ogólna zapisuje się i zostaje', async ({ page }) => {
  await tab(page, 'Przedmioty').click()
  await expect(page.locator('#general-note')).toHaveCount(0)
  await page.locator('.course-row', { hasText: 'Fizyka' }).click()
  await expect(page.getByRole('heading', { name: 'Notatka do przedmiotu' })).toHaveCount(0)

  await tab(page, 'Ustawienia').click()
  await page.getByRole('switch', { name: /^Notatki/ }).check()
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

  await page.locator('#feedback-form').getByRole('button', { name: 'Napisz' }).click()
  // Opinia jest pierwsza i zaznaczona.
  await expect(page.locator('#feedback-form').getByRole('radio')).toHaveText(['Opinia lub pomysł', 'Błąd'])
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

  await tab(page, 'Dla testerów').click()
  await page.getByRole('button', { name: /Dobierz grupy/ }).click()
  await page.getByRole('radio', { name: 'Języki (SJO)' }).click()
  await page
    .getByLabel('Nazwa, kod albo link przedmiotu')
    .fill('https://usosweb.usos.pw.edu.pl/kontroler.php?_action=katalog2/przedmioty/pokazPrzedmiot&prz_kod=6420-EEH60-0SA-0008')
  await page.getByRole('button', { name: 'Szukaj', exact: true }).click()
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

  await tab(page, 'Dla testerów').click()
  await page.getByRole('button', { name: /Dobierz grupy/ }).click()
  await expect(page.getByRole('heading', { name: 'Twój obecny plan' })).toBeVisible()
  await page.getByRole('radio', { name: 'Języki (SJO)' }).click()
  await page.getByLabel('Nazwa, kod albo link przedmiotu').fill(LANG)
  await page.getByRole('button', { name: 'Szukaj', exact: true }).click()
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

test('powiadomienia: Wyczyść przenosi do archiwum', async ({ page }) => {
  await page.evaluate(() => {
    const store = JSON.parse(localStorage.getItem('planer.mock-cloud') ?? '{}')
    store.notifications = {
      n1: { kind: 'deadline', title: 'Kolokwium z Fizyki za tydzień', body: 'Fizyka · wt. 20.10', details: [], createdAt: Date.now() - 3_600_000 },
    }
    localStorage.setItem('planer.mock-cloud', JSON.stringify(store))
  })
  await page.reload()
  await page.getByRole('button', { name: /^Powiadomienia/ }).click()
  await expect(page.getByText('Kolokwium z Fizyki za tydzień')).toBeVisible()
  await page.getByRole('button', { name: 'Wyczyść' }).click()
  await expect(page.getByText('Kolokwium z Fizyki za tydzień')).toBeHidden()
  await expect(page.getByText(/Wszystko przeczytane i wyczyszczone/)).toBeVisible()
  // Archiwum: wyczyszczone zostają (do 60 dni).
  await page.locator('.notification-archive summary').click()
  await expect(page.locator('.notification-archive').getByText('Kolokwium z Fizyki za tydzień')).toBeVisible()
})

test('skróty nazw: wszędzie pełna nazwa, skrót tylko w siatce tygodnia', async ({ page }, info) => {
  await tab(page, 'Ustawienia').click()
  await page.locator('#settings-aliases').getByLabel('Grafika komputerowa').fill('GK')
  if (info.project.name !== 'komputer') {
    // Telefon: siatka do włączenia w ustawieniach (domyślnie lista).
    await page.getByRole('radiogroup', { name: 'Tydzień na telefonie' }).getByRole('radio', { name: 'Siatka' }).click()
  }
  await tab(page, 'Przedmioty').click()
  await expect(page.locator('.course-row-name', { hasText: 'Grafika komputerowa' })).toBeVisible()
  await expect(page.locator('.course-row-name', { hasText: /^GK$/ })).toHaveCount(0)
  await tab(page, 'Tydzień').click()
  const titles = page.locator('.week-grid .grid-event-title')
  await expect(titles.filter({ hasText: /^GK$/ }).first()).toBeVisible()
  if (info.project.name === 'komputer') {
    // Komputer: bez wpisanego skrótu - pełna nazwa.
    await expect(titles.filter({ hasText: 'Analiza matematyczna' }).first()).toBeVisible()
  } else {
    // Telefon: wąskie kolumny - bez wpisanego skrótu automatyczny ("AM"), krótkie nagłówki dni.
    await expect(page.locator('.week-grid')).toHaveClass(/is-compact/)
    await expect(titles.filter({ hasText: /^AM$/ }).first()).toBeVisible()
    // Rodzaj i godziny w jednej linii, napisy na środku okienek; dni dokładnie pośrodku ekranu (równy odstęp z lewej i prawej).
    await expect(page.locator('.grid-event', { hasText: 'AM' }).first().locator('.grid-event-meta')).toHaveText('wyk')
    // (Po animacji wejścia widoku - w trakcie jest przesunięty w bok.)
    const layout = () =>
      page.evaluate(`(() => {
        const cols = [...document.querySelectorAll('.week-grid .grid-col')].map((c) => c.getBoundingClientRect())
        const times = [...document.querySelectorAll('.grid-event-time')]
        return {
          symmetric: Math.abs(cols[0].left - (innerWidth - cols[cols.length - 1].right)) < 1,
          oneLine: times.every((t) => t.getBoundingClientRect().height < 1.6 * parseFloat(getComputedStyle(t).fontSize)),
          fits: times.every((t) => t.scrollWidth <= t.clientWidth),
          pageScroll: document.documentElement.scrollWidth > innerWidth,
          centered: [...document.querySelectorAll('.grid-event')].every((e) => {
            const box = e.getBoundingClientRect(), body = e.querySelector('.grid-event-body').getBoundingClientRect()
            return Math.abs((body.top - box.top) - (box.bottom - body.bottom)) < 1
          }),
        }
      })()`)
    await expect.poll(layout).toEqual({ symmetric: true, oneLine: true, fits: true, pageScroll: false, centered: true })
  }
})

test('zakładka Dla testerów: wersje testowe, zadania i zgłoszenie po kliknięciu', async ({ page }) => {
  await tab(page, 'Dla testerów').click()
  await expect(page.getByRole('heading', { name: 'Dla testerów' })).toBeVisible()
  await expect(page.getByText('Zadania do przetestowania')).toBeVisible()
  // Formularz dopiero po "Napisz".
  const form = page.locator('#feedback-form')
  await expect(form.getByRole('radio')).toHaveCount(0)
  await form.getByRole('button', { name: 'Napisz' }).click()
  await expect(form.getByRole('radio', { name: 'Opinia lub pomysł' })).toHaveAttribute('aria-checked', 'true')
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

test('wyszukiwanie: lupa (Android, komputer) - przedmiot, sala, ustawienie', async ({ page }, info) => {
  test.skip(info.project.name === 'iphone', 'na iPhonie wyszukiwanie otwiera pociągnięcie w dół')
  const bar = page.getByRole('search', { name: 'Wyszukiwanie' })
  const open = async () => {
    await page.getByRole('button', { name: 'Szukaj w Planerze' }).click()
    await expect(bar).toBeVisible()
  }
  const search = page.getByRole('searchbox', { name: 'Szukaj' })

  // Pasek na górze, pod nim zwykły plan (bez osobnego okna); po wpisaniu - wyniki zamiast planu.
  await open()
  await expect(search).toBeFocused()
  await expect(tab(page, 'Dziś')).toBeVisible()
  await expect(page.locator('.search-results')).toHaveCount(0)

  // Przedmiot - bez polskich znaków i od środka nazwy; Enter otwiera pierwszy wynik.
  await search.fill('analiza mat')
  await expect(page.locator('.search-hit').first()).toContainText('Analiza matematyczna')
  await expect(tab(page, 'Dziś')).toBeHidden()
  await search.press('Enter')
  await expect(page.getByRole('heading', { name: 'Analiza matematyczna' })).toBeVisible()
  await expect(bar).toBeHidden()

  // Sala: kiedy najbliższe zajęcia. Escape chowa pasek, plan wraca.
  await open()
  await search.fill('418')
  await expect(page.locator('.search-group', { hasText: 'Sale' }).getByText(/Sala 418/)).toBeVisible()
  await search.press('Escape')
  await expect(bar).toBeHidden()
  await expect(page.getByRole('heading', { name: 'Analiza matematyczna' })).toBeVisible()

  // Ustawienie: przejście prosto do sekcji.
  await open()
  await search.fill('kolory')
  await page.locator('.search-hit', { hasText: 'Kolory zajęć' }).click()
  await expect(page.locator('#settings-colors')).toBeInViewport()

  // Nic nie pasuje.
  await open()
  await search.fill('xyzqw')
  await expect(page.getByText('Nic nie znaleziono dla „xyzqw”.')).toBeVisible()

  // Wyczyść - puste pole, dalej można pisać.
  await page.getByRole('button', { name: 'Wyczyść' }).click()
  await expect(search).toHaveValue('')
  await expect(search).toBeFocused()
  await expect(page.getByRole('button', { name: 'Wyczyść' })).toHaveCount(0)
})

test('wyszukiwanie: Ctrl+K na komputerze', async ({ page }, info) => {
  test.skip(info.project.name !== 'komputer', 'skrót klawiszowy - komputer')
  await page.keyboard.press('Control+k')
  await expect(page.getByRole('searchbox', { name: 'Szukaj' })).toBeFocused()
})

test('wyszukiwanie: na iPhonie bez lupy', async ({ page }, info) => {
  test.skip(info.project.name !== 'iphone', 'tylko iPhone')
  await expect(page.getByRole('heading', { name: 'Planer' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Szukaj w Planerze' })).toHaveCount(0)

  // Pole bez wbudowanego wyglądu Safari - inaczej obok naszej lupy pojawia się druga.
  await page.keyboard.press('Control+k')
  const search = page.getByRole('searchbox', { name: 'Szukaj' })
  await expect(search).toBeVisible()
  await expect(search).toHaveCSS('-webkit-appearance', 'none')
})

test.describe('wyszukiwanie: pociągnięcie w dół (jak na iPhonie)', () => {
  // Syntetyczny dotyk działa w Chromium - telefon z Androidem udaje iPhone'a.
  test.use({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' })

  test('pociągnięcie otwiera wyszukiwanie, krótkie - nie', async ({ page }, info) => {
    test.skip(info.project.name !== 'android', 'syntetyczny dotyk - tylko Chromium z ekranem dotykowym')
    await expect(page.getByRole('button', { name: 'Szukaj w Planerze' })).toHaveCount(0)
    const pullDown = (to: number) =>
      page.evaluate(`(async () => {
        const el = document.querySelector('.topbar')
        const touch = (y) => new Touch({ identifier: 1, target: el, clientX: 180, clientY: y })
        const fire = (type, y) => {
          const t = touch(y)
          el.dispatchEvent(new TouchEvent(type, { touches: type === 'touchend' ? [] : [t], changedTouches: [t], bubbles: true, cancelable: true }))
        }
        fire('touchstart', 150)
        for (let y = 150; y <= ${to}; y += 30) {
          await new Promise((r) => setTimeout(r, 16))
          fire('touchmove', y)
        }
        fire('touchend', ${to})
      })()`)
    await pullDown(210) // za mało
    await expect(page.getByRole('search', { name: 'Wyszukiwanie' })).toBeHidden()
    await pullDown(390)
    // Pasek nad planem, od razu z kursorem (klawiatura) - plan dalej widać, dopóki nic nie wpisano.
    const search = page.getByRole('searchbox', { name: 'Szukaj' })
    await expect(search).toBeVisible()
    await expect(search).toBeFocused()
    await expect(tab(page, 'Dziś')).toBeVisible()
    await page.getByRole('button', { name: 'Anuluj' }).click()
    await expect(search).toBeHidden()
  })
})
