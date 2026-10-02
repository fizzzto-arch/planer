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

test('angielski: mail z prośbą o zmianę grupy zostaje po polsku (idzie do prowadzących)', async ({ page }) => {
  // Analiza: obecna gr. 101 w środę, gr. 102 w czwartek - optymalizator proponuje zmianę.
  await page.route('https://apps.usos.pw.edu.pl/services/**', async (route) => {
    const url = new URL(route.request().url())
    const q = url.searchParams
    const json = (body: unknown) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) })
    if (url.pathname.endsWith('/courses/unit')) {
      const unit = q.get('unit_id') ?? ''
      return json({ course_id: unit === 'U-an-c' ? 'AN' : unit, term_id: '2026Z', classtype_id: 'CWI' })
    }
    if (url.pathname.endsWith('/tt/course_edition') && q.get('course_id') === 'AN') {
      const start = q.get('start') ?? ''
      const at = (plus: number, time: string) => {
        const [y, m, d] = start.split('-').map(Number)
        return `${new Date(Date.UTC(y, m - 1, d + plus)).toISOString().slice(0, 10)} ${time}:00`
      }
      const act = (plus: number, from: string, to: string, group: number) => ({
        start_time: at(plus, from),
        end_time: at(plus, to),
        classtype_id: 'CWI',
        group_number: group,
        unit_id: 'U-an-c',
      })
      return json([act(2, '10:15', '12:00', 101), act(0, '10:15', '12:00', 102)])
    }
    return json(url.pathname.endsWith('/courses/search') ? { items: [], next_page: false } : [])
  })

  await tab(page, 'Courses').click()
  await page.getByRole('button', { name: /Find groups/ }).click()
  await page.getByRole('button', { name: 'Request a change' }).first().click()
  const mail = page.locator('.mail-body').first()
  await expect(mail).toContainText('ćwiczenia')
  await expect(mail).toContainText('śr.')
  await expect(mail).not.toContainText('Tutorial')
  await expect(mail).not.toContainText('Wed')
  await expect(page.locator('.mail-subject').first()).toContainText('Prośba o zmianę grupy')
})

test('zmiana języka nie odpina przesuwania palcem między zakładkami', async ({ page }, info) => {
  test.skip(info.project.name !== 'android', 'syntetyczny dotyk - tylko Chromium z ekranem dotykowym')
  // Przesunięcie palcem w lewo po widoku (jak na telefonie): następna zakładka.
  const swipeLeft = () =>
    page.evaluate(`(async () => {
      const el = document.querySelector('[class^="view-enter"]').parentElement
      const touch = (x) => new Touch({ identifier: 1, target: el, clientX: x, clientY: 400 })
      const fire = (type, x) => {
        const t = touch(x)
        el.dispatchEvent(new TouchEvent(type, { touches: type === 'touchend' ? [] : [t], changedTouches: [t], bubbles: true, cancelable: true }))
      }
      fire('touchstart', 300)
      for (const x of [270, 220, 160, 100, 60]) {
        await new Promise((r) => setTimeout(r, 16))
        fire('touchmove', x)
      }
      fire('touchend', 60)
    })()`)

  await page.locator('.lang-toggle').getByRole('radio', { name: 'Polski' }).click()
  await expect(tab(page, 'Dziś')).toBeVisible()
  await swipeLeft()
  await expect(page.getByText('ten tydzień')).toBeVisible()
})
