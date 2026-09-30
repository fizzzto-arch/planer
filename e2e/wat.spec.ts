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
  await expect(page.getByText('Plan grupy WCY26IY4S1 (WAT, odświeżany co noc)')).toBeVisible()
})

test('WAT: nieznany kod grupy - czytelny komunikat', async ({ page }) => {
  // 404 z serwera to oczekiwana odpowiedź - nie liczymy jej jako błędu strony.
  page.removeAllListeners('console')
  await page.getByLabel('Odnośnik do planu (albo kod grupy WAT)').fill('WCY26XX9S9')
  await page.getByRole('button', { name: 'Wczytaj plan' }).click()
  await expect(page.getByRole('alert')).toContainText('Nie mam planu grupy WCY26XX9S9')
})
