// Pierwsze wejście nowej osoby z PW: link z USOS, plan od razu, "Pierwsze kroki" z kontem na mail uczelniany.
// Link z USOS podaje tylko nadchodzące zajęcia - osoba dołącza w 2. tygodniu semestru.
import { expect, tab, test } from './fixtures.ts'

test.use({ seedPlan: false })

const LINK = 'https://apps.usos.pw.edu.pl/services/tt/upcoming_ical?lang=pl&user_id=123456&key=abcdef123456'

const event = (uid: string, start: string, end: string, summary: string, room: string, group: number, unit: number) =>
  [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:Sala: ${room}\\nGmach Główny\\n\\nhttps://usosweb.usos.pw.edu.pl/kontroler.php?_action=katalog2/przedmioty/pokazZajecia&zaj_cyk_id=${unit}&gr_nr=${group}`,
    'LOCATION:Plac Politechniki 1',
    'END:VEVENT',
  ].join('\r\n')

// Od środy 14.10.2026 (2. tydzień semestru) - wcześniejszych zajęć USOS już nie podaje.
const ICS = [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  event('a1', '20261014T101500', '20261014T120000', 'CWI - Analiza matematyczna', '121', 101, 100),
  event('a2', '20261015T081500', '20261015T100000', 'WYK - Fizyka', '118', 1, 200),
  event('a3', '20261016T121500', '20261016T150000', 'LAB - Programowanie', '605', 103, 300),
  event('a4', '20261019T081500', '20261019T100000', 'WYK - Analiza matematyczna', '118', 1, 101),
  event('a5', '20261021T101500', '20261021T120000', 'CWI - Analiza matematyczna', '121', 101, 100),
  'END:VCALENDAR',
].join('\r\n')

test('nowa osoba: wkleja link z USOS, widzi plan i dostaje podpowiedź o koncie', async ({ page, errors }) => {
  void errors
  await page.route('https://apps.usos.pw.edu.pl/services/tt/upcoming_ical**', (route) =>
    route.fulfill({ contentType: 'text/calendar', body: ICS }),
  )
  await page.goto('/?mock=nowy')

  // Najpierw plan, konto niżej.
  const headings = page.locator('main .panel > h2')
  await expect(headings.first()).toHaveText('Dodaj swój plan')
  await expect(headings.nth(1)).toHaveText('Masz już konto?')

  await page.getByLabel('Odnośnik do planu (albo kod grupy WAT)').fill(LINK)
  await page.getByRole('button', { name: 'Wczytaj plan' }).click()
  await expect(page.getByText('Analiza matematyczna').first()).toBeVisible()
  // Prawdziwy tydzień semestru, choć plan zaczyna się od dziś.
  await expect(page.getByText('tydzień 2 · parzysty')).toBeVisible()

  // "Pierwsze kroki" także bez konta: na telefonie najpierw ekran początkowy, potem konto.
  const steps = page.locator('.first-steps')
  await expect(steps.getByRole('heading', { name: /Pierwsze kroki/ })).toBeVisible()
  if (await steps.getByText('Planer na ekranie telefonu').isVisible()) await steps.getByRole('button', { name: 'Dalej' }).click()
  await expect(steps.getByText('Konto na mail uczelniany')).toBeVisible()
  await steps.getByRole('button', { name: 'Załóż konto' }).click()
  await expect(page.locator('#settings-account')).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Nowe konto' })).toHaveAttribute('aria-selected', 'true')
  await page.getByLabel('E-mail').fill('jan.kowalski.stud@pw.edu.pl')
  await expect(page.getByText('Mail uczelniany - po potwierdzeniu go linkiem masz dostęp od razu.')).toBeVisible()

  // Powrót do Dziś: krok konta dalej czeka (konta jeszcze nie ma).
  await tab(page, 'Dziś').click()
  await expect(page.locator('.first-steps').getByText('Konto na mail uczelniany')).toBeVisible()
})
