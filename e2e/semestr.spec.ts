// Przejście na semestr letni (luty 2027): sesja, tydzień rejestracji, pierwszy tydzień semestru.
// Plan z dwóch semestrów, jak w USOS po ogłoszeniu planu letniego.
import { expect, tab, test } from './fixtures.ts'

test.use({ seedPlan: false })

// Zimowy 5.10.2026-29.01.2027 (17 tygodni), egzamin w sesji 3.02, letni od 22.02.2027 (15 tygodni).
// WF w obu semestrach, w innych grupach.
const PLAN = `(() => {
  const out = []
  const add = (id, course, type, first, weeks, weekday, from, to, group, every) => {
    for (let w = 0; w < weeks; w++) {
      if (every === 'odd' && w % 2 === 1) continue
      const d = new Date(first[0], first[1], first[2] + w * 7 + weekday)
      const at = (hm) => { const [h, m] = hm.split(':').map(Number); return new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m).getTime() }
      out.push({ id: id + '-' + w, courseName: course, type, start: at(from), end: at(to), room: '100', building: 'EiTI', address: null, groupNumber: group, unitId: 'U-' + id, usosUrl: null, cancelled: false })
    }
  }
  const zima = [2026, 9, 5], lato = [2027, 1, 22]
  add('an1', 'Analiza matematyczna 1', 'WYK', zima, 17, 0, '08:15', '10:00', 1)
  add('fiz1', 'Fizyka 1', 'LAB', zima, 17, 1, '12:15', '15:00', 102, 'odd')
  add('wf-z', 'Wychowanie fizyczne', 'CWI', zima, 17, 3, '10:15', '12:00', 5)
  add('egz', 'Analiza matematyczna 1', 'EGZ', [2027, 1, 1], 1, 2, '09:00', '11:00', 1)
  add('an2', 'Analiza matematyczna 2', 'WYK', lato, 15, 0, '08:15', '10:00', 1)
  add('fiz2', 'Fizyka 2', 'LAB', lato, 15, 1, '12:15', '15:00', 104, 'odd')
  add('wf-l', 'Wychowanie fizyczne', 'CWI', lato, 15, 3, '10:15', '12:00', 7)
  return { source: { kind: 'file', name: 'plan.ics' }, updatedAt: Date.now(), meetings: out }
})()`

async function openAt(page: import('@playwright/test').Page, when: string) {
  await page.clock.setFixedTime(new Date(when))
  await page.goto('/?mock')
  await page.evaluate(`localStorage.setItem('planer.plan.v1', JSON.stringify(${PLAN}))`)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Planer' })).toBeVisible()
}

test('sesja: egzamin w planie dnia, bez numeru tygodnia; skończone przedmioty jako poprzednie', async ({ page, errors }) => {
  void errors
  await openAt(page, '2027-02-03T08:00:00+01:00')
  await expect(page.getByText('Egzamin').first()).toBeVisible()
  await expect(page.getByText(/tydzień \d/)).toHaveCount(0)
  await tab(page, 'Przedmioty').click()
  // Fizyka 1 skończona; Analiza 1 ma jeszcze egzamin - zostaje na liście.
  const current = page.locator('.course-row')
  await expect(current.filter({ hasText: 'Analiza matematyczna 1' })).toBeVisible()
  await expect(current.filter({ hasText: 'Fizyka 1' })).toBeHidden()
  await expect(page.getByText('Z poprzedniego semestru (1)')).toBeVisible()
})

test('tydzień rejestracji: zimowe przedmioty jako poprzednie, WF z nową grupą', async ({ page, errors }) => {
  void errors
  await openAt(page, '2027-02-17T10:00:00+01:00')
  await expect(page.getByText('Najbliższe zajęcia')).toBeVisible()
  await tab(page, 'Przedmioty').click()
  await expect(page.getByText('Z poprzedniego semestru (2)')).toBeVisible()
  const wf = page.locator('.course-row', { hasText: 'Wychowanie fizyczne' })
  await expect(wf).toContainText('Ćwiczenia gr. 7')
  await expect(wf).not.toContainText('gr. 5')
})

test('pierwszy tydzień semestru letniego: tydzień 1, nieparzysty', async ({ page, errors }) => {
  void errors
  await openAt(page, '2027-02-24T09:00:00+01:00')
  await expect(page.getByText('tydzień 1 · nieparzysty')).toBeVisible()
  await tab(page, 'Przedmioty').click()
  await expect(page.locator('.course-row', { hasText: 'Analiza matematyczna 2' })).toBeVisible()
  await expect(page.getByText('Z poprzedniego semestru (2)')).toBeVisible()
})
