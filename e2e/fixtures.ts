// Wspólne przygotowanie testów: wymyślony plan semestru (nie prawdziwy plan z private/),
// stała data i zegar, zbieranie błędów strony.
import { test as base, expect, type Page } from '@playwright/test'

// Środa 14.10.2026, 9:00 czasu polskiego - 2. tydzień semestru, przed ćwiczeniami o 10:15.
export const NOW = new Date('2026-10-14T09:00:00+02:00')

interface StoredMeeting {
  id: string
  courseName: string
  type: string
  start: number
  end: number
  room: string | null
  building: string | null
  address: string | null
  groupNumber: number | null
  unitId: string | null
  usosUrl: string | null
  cancelled: boolean
}

// Zajęcia co tydzień (albo co dwa) przez 15 tygodni od poniedziałku 5.10.2026.
function series(
  id: string,
  courseName: string,
  type: string,
  weekday: number, // 0 = poniedziałek
  from: string,
  to: string,
  group: number,
  room: string,
  every: 'week' | 'odd' | 'even' = 'week',
): StoredMeeting[] {
  const out: StoredMeeting[] = []
  for (let week = 0; week < 15; week++) {
    if (every === 'odd' && week % 2 === 1) continue
    if (every === 'even' && week % 2 === 0) continue
    const day = new Date(2026, 9, 5 + week * 7 + weekday)
    const at = (hm: string) => {
      const [h, m] = hm.split(':').map(Number)
      return new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m).getTime()
    }
    out.push({
      id: `${id}-${week}`,
      courseName,
      type,
      start: at(from),
      end: at(to),
      room,
      building: 'EiTI',
      address: null,
      groupNumber: group,
      unitId: `U-${id}`, // zajęcia z USOS - optymalizator pyta o nie (w testach odpowiedzi są podstawione)
      usosUrl: null,
      cancelled: false,
    })
  }
  return out
}

// Plan w formacie zapisu Planera (src/lib/storage.ts). Godziny liczy przeglądarka w strefie
// testu (Europe/Warsaw), więc funkcja jest wstrzykiwana do strony, a nie liczona w Node.
export function testPlan() {
  return {
    source: { kind: 'file', name: 'plan-testowy.ics' },
    updatedAt: Date.now(),
    meetings: [
      ...series('an-w', 'Analiza matematyczna', 'WYK', 0, '08:15', '10:00', 1, '118'),
      ...series('an-c', 'Analiza matematyczna', 'CWI', 2, '10:15', '12:00', 101, '121'),
      ...series('fiz', 'Fizyka', 'LAB', 1, '12:15', '15:00', 102, '418', 'odd'),
      ...series('prog', 'Programowanie', 'LAB', 1, '12:15', '15:00', 103, '605', 'even'),
      ...series('graf', 'Grafika komputerowa', 'WYK', 4, '12:15', '14:00', 1, '170'),
    ],
  }
}

async function prepare(page: Page, seedPlan: boolean) {
  await page.clock.setFixedTime(NOW)
  await page.addInitScript(
    ({ plan, series, seedPlan }) => {
      // Plan tylko przy pierwszym wejściu - po przeładowaniu zostaje to, co zapisała aplikacja.
      if (seedPlan && !localStorage.getItem('planer.plan.v1')) {
        const build = new Function(`${series}; return (${plan})()`) as () => unknown
        localStorage.setItem('planer.plan.v1', JSON.stringify(build()))
      }
      // Zapis pliku: bez arkusza "Udostępnij" (w teście go nie ma kto zamknąć) - zwykłe pobranie.
      Object.defineProperty(Navigator.prototype, 'canShare', { value: undefined, configurable: true })
    },
    { plan: testPlan.toString(), series: series.toString(), seedPlan },
  )
}

export const test = base.extend<{ errors: string[]; seedPlan: boolean }>({
  // false = pierwsze wejście nowej osoby, bez planu (test.use({ seedPlan: false })).
  seedPlan: [true, { option: true }],
  // "provide" to zwykle "use" z dokumentacji Playwrighta - inna nazwa, bo lint bierze "use" za hook Reacta.
  errors: async ({ page, seedPlan }, provide) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    page.on('console', (m) => {
      if (m.type() === 'error' && !/Download the React DevTools|favicon/.test(m.text())) errors.push(m.text())
    })
    await prepare(page, seedPlan)
    // Testy nie pytają prawdziwego USOS (nie zależą od serwera uczelni i go nie obciążają):
    // domyślnie pusta odpowiedź, a test może podstawić własną (page.route później ma pierwszeństwo).
    await page.route('https://apps.usos.pw.edu.pl/**', (route) =>
      route.fulfill({ contentType: 'application/json', body: route.request().url().includes('/services/tt/') ? '[]' : '{}' }),
    )
    // Kalendarz akademicki (w wersji deweloperskiej go nie ma - publikuje go wdrożenie).
    await page.route('**/calendar.json', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          fetchedAt: '2026-10-14T00:00:00Z',
          events: [{ start: '2026-11-11', end: '2026-11-11', type: 'public_holidays', dayOff: true, name: 'Narodowe Święto Niepodległości' }],
        }),
      }),
    )
    await provide(errors)
    // Każdy test na koniec: żadnego błędu na stronie.
    expect(errors, 'błędy na stronie').toEqual([])
  },
})

export { expect }

// Zakładki: na telefonie zębatka i kolba mają tylko etykietę dostępności ("Ustawienia", "Dla testerów…").
export const tab = (
  page: Page,
  name: 'Dziś' | 'Tydzień' | 'Przedmioty' | 'Dla testerów' | 'Ustawienia' | 'Today' | 'Week' | 'Courses' | 'For testers' | 'Settings',
) => page.getByRole('button', { name, exact: !['Ustawienia', 'Settings', 'Dla testerów', 'For testers'].includes(name) })
