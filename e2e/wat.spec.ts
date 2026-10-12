// Nowa osoba z WAT: zamiast linku z USOS wpisuje kod grupy, a plan przychodzi z pliku
// publikowanego co noc obok Planera (scripts/wat-plans.ts). Plik podstawiony w teście.
import { watToIcs, type WatLesson } from '../src/lib/wat.ts'
import { expect, tab, test } from './fixtures.ts'

test.use({ seedPlan: false })

const lesson = (date: string, start: string, end: string, courseName: string, kind: string): WatLesson => ({
  date,
  start,
  end,
  short: courseName.slice(0, 3),
  courseName,
  kind,
  room: '316',
  building: 'S',
  teacher: null,
})

// Tydzień 12-18.10.2026 (w teście jest środa 14.10, 9:00).
const ICS = watToIcs({
  group: 'WCY26IY4S1',
  updatedAt: '2026-10-14 00:39:49',
  lessons: [
    lesson('2026-10-14', '11:40', '13:15', 'Matematyka dyskretna I', 'Wykład'),
    lesson('2026-10-15', '08:00', '09:35', 'Wprowadzenie do informatyki', 'Laboratorium'),
  ],
})

test.beforeEach(async ({ page, errors }) => {
  void errors // uruchamia zbieranie błędów
  await page.route('**/wat/*.ics', (route) =>
    route.request().url().endsWith('/wat/WCY26IY4S1.ics')
      ? route.fulfill({ contentType: 'text/calendar', body: ICS })
      : route.fulfill({ status: 404, body: '' }),
  )
  await page.goto('/?mock')
  await expect(page.getByRole('heading', { name: 'Dodaj swój plan' })).toBeVisible()
})

test('WAT: kod grupy zamiast linku wczytuje plan', async ({ page }) => {
  await page.getByLabel('Odnośnik do planu (albo kod grupy WAT)').fill('WCY26IY4S1 - I6Y4S1')
  await page.getByRole('button', { name: 'Wczytaj plan' }).click()
  // Dziś (środa) - wykład o 11:40.
  await expect(page.getByText('Matematyka dyskretna I').first()).toBeVisible()
  await tab(page, 'Tydzień').click()
  await expect(page.getByText('Wprowadzenie do informatyki').first()).toBeVisible()
  await tab(page, 'Ustawienia').click()
  await expect(page.getByText('Plan grupy WCY26IY4S1 (WAT)')).toBeVisible()
})

test('WAT: nieznany kod grupy - czytelny komunikat', async ({ page }) => {
  // 404 z serwera to oczekiwana odpowiedź - nie liczymy jej jako błędu strony.
  page.removeAllListeners('console')
  await page.getByLabel('Odnośnik do planu (albo kod grupy WAT)').fill('WCY26XX9S9')
  await page.getByRole('button', { name: 'Wczytaj plan' }).click()
  await expect(page.getByRole('alert')).toContainText('Nie mam planu grupy WCY26XX9S9')
})

// Strona planu grupy zapisana przez studenta (ta sama budowa co planzajec.wcy.wat.edu.pl, wymyślone zajęcia).
const lessonDiv = (date: string, block: string, name: string, info: string) =>
  `<div class="lesson"><span class="date">${date}</span><span class="block_id">${block}</span><span class="name">${name}</span><span class="info">${info}</span></div>`
const SAVED_PAGE = `<!DOCTYPE html><html><body><h1>Rozkład zajęć grupy: WCY26IY4S1</h1>
<span class="head_info">Data aktualizacji:2026-10-14 00:39:49</span>
<div class="block_nr block3"><span class="nr">3</span><div class="h"><span class="hr1">11:40</span><span class="hr2">13:15</span></div></div>
<div class="lessons hidden">${lessonDiv('2026_10_14', 'block3', 'SK<br>(L)<br>224 S<br>', 'Sieci komputerowe - (Laboratorium) - ')}</div>
</body></html>`

// Nasz serwer ma plan z 5.10 (WAT blokuje automatyczne pobieranie).
const OLD_ICS = watToIcs({
  group: 'WCY26IY4S1',
  updatedAt: '2026-10-05 00:40:17',
  lessons: [lesson('2026-10-14', '11:40', '13:15', 'Matematyka dyskretna I', 'Wykład')],
})

test('WAT: plan sprzed kilku dni - ostrzeżenie; wgrana strona z WAT go zastępuje i zostaje po odświeżeniu', async ({ page }) => {
  await page.route('**/wat/WCY26IY4S1.ics', (route) => route.fulfill({ contentType: 'text/calendar', body: OLD_ICS }))
  await page.getByLabel('Odnośnik do planu (albo kod grupy WAT)').fill('WCY26IY4S1')
  await page.getByRole('button', { name: 'Wczytaj plan' }).click()
  await expect(page.getByText('Plan grupy WCY26IY4S1 z WAT z 5 października.')).toBeVisible()
  const warning = page.locator('.wat-stale')
  await expect(warning).toContainText('może być nieaktualny')
  await expect(warning.getByRole('link', { name: 'Plan na stronie WAT' })).toHaveAttribute('href', /grupa_id=WCY26IY4S1/)

  // Zapisana strona z dzisiejszej nocy: zamiast wykładu laboratorium.
  await warning.locator('input[type=file]').setInputFiles({ name: 'rozklad.html', mimeType: 'text/html', buffer: Buffer.from(SAVED_PAGE) })
  await expect(page.getByText('Plan grupy WCY26IY4S1 z WAT z 14 października.')).toBeVisible()
  await expect(warning).toHaveCount(0)
  await expect(page.getByText('Sieci komputerowe').first()).toBeVisible()
  await expect(page.getByText('Matematyka dyskretna I')).toHaveCount(0)

  // Odświeżenie (nasz serwer dalej ma plan z 5.10) nie cofa wgranego planu.
  await page.reload()
  await expect(page.getByText('Plan grupy WCY26IY4S1 z WAT z 14 października.')).toBeVisible()
  await expect(page.getByText('Sieci komputerowe').first()).toBeVisible()
})

test('WAT: inny plik zamiast strony planu - komunikat, plan zostaje', async ({ page }) => {
  await page.route('**/wat/WCY26IY4S1.ics', (route) => route.fulfill({ contentType: 'text/calendar', body: OLD_ICS }))
  await page.getByLabel('Odnośnik do planu (albo kod grupy WAT)').fill('WCY26IY4S1')
  await page.getByRole('button', { name: 'Wczytaj plan' }).click()
  await page
    .locator('.wat-stale input[type=file]')
    .setInputFiles({ name: 'notatki.html', mimeType: 'text/html', buffer: Buffer.from('<html><body>Logowanie</body></html>') })
  await expect(page.getByText('To nie jest zapisana strona planu grupy z planzajec.wcy.wat.edu.pl.')).toBeVisible()
  await expect(page.getByText('Matematyka dyskretna I').first()).toBeVisible()
})
