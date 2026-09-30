// Kalendarz akademicki PW (dni wolne, przerwy, sesja) z USOS API jako calendar.json obok strony.
// Uruchamia go wdrożenie (także co noc). API wymaga klucza aplikacji (sekrety repozytorium
// USOS_CONSUMER_KEY i USOS_CONSUMER_SECRET) - podpis OAuth 1.0a bez użytkownika, tylko tutaj,
// nigdy w kodzie strony. Bez klucza albo przy awarii USOS zostaje poprzednio opublikowana wersja.
//
// Użycie: node scripts/usos-calendar.ts dist/calendar.json
import { createHmac, randomBytes } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { dedupeEvents, parseUsosEvent, type AcademicCalendar, type CalendarEvent } from '../src/lib/academicCalendar.ts'

const OUT = process.argv[2] ?? 'dist/calendar.json'
const PUBLISHED = 'https://fizzzto-arch.github.io/planer/calendar.json'
const FACULTIES = ['103000', '114000'] // EiTI i Mechatronika (Inżynieria Biomedyczna jest na obu)
const MONTHS = 8 // od poprzedniego miesiąca: cały bieżący rok akademicki z zapasem

const key = process.env.USOS_CONSUMER_KEY?.trim()
const secret = process.env.USOS_CONSUMER_SECRET?.trim()

const enc = (s: string) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)

async function signedGet(method: string, params: Record<string, string>): Promise<unknown> {
  const url = `https://apps.usos.pw.edu.pl/services/${method}`
  const all: Record<string, string> = {
    ...params,
    oauth_consumer_key: key!,
    oauth_nonce: randomBytes(8).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_version: '1.0',
  }
  const query = Object.keys(all)
    .sort()
    .map((k) => `${enc(k)}=${enc(all[k])}`)
    .join('&')
  const signature = createHmac('sha1', `${enc(secret!)}&`).update(`GET&${enc(url)}&${enc(query)}`).digest('base64')
  const response = await fetch(`${url}?${query}&oauth_signature=${enc(signature)}`, { signal: AbortSignal.timeout(20_000) })
  if (!response.ok) throw new Error(`USOS ${response.status}: ${(await response.text()).slice(0, 200)}`)
  return response.json()
}

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

async function fetchCalendar(): Promise<CalendarEvent[]> {
  const now = new Date()
  const events: CalendarEvent[] = []
  // USOS pozwala na zakres najwyżej miesiąca - pytamy miesiąc po miesiącu.
  for (let i = -1; i < MONTHS - 1; i++) {
    const from = new Date(now.getFullYear(), now.getMonth() + i, 1)
    const to = new Date(now.getFullYear(), now.getMonth() + i + 1, 0)
    for (const faculty of FACULTIES) {
      const list = (await signedGet('calendar/search', {
        faculty_id: faculty,
        start_date: iso(from),
        end_date: iso(to),
        fields: 'name|start_date|end_date|type|is_day_off',
      })) as Record<string, unknown>[]
      events.push(...list.flatMap((raw) => parseUsosEvent(raw) ?? []))
    }
  }
  return dedupeEvents(events)
}

let calendar: AcademicCalendar | null = null
if (key && secret) {
  try {
    calendar = { fetchedAt: new Date().toISOString(), events: await fetchCalendar() }
  } catch (e) {
    console.log(`::warning::Nie udało się pobrać kalendarza akademickiego: ${(e as Error).message}`)
  }
} else {
  console.log('::warning::Brak sekretów USOS_CONSUMER_KEY / USOS_CONSUMER_SECRET - kalendarz akademicki z poprzedniej wersji.')
}

if (!calendar) {
  try {
    const response = await fetch(PUBLISHED, { signal: AbortSignal.timeout(15_000) })
    if (response.ok) calendar = (await response.json()) as AcademicCalendar
  } catch {
    // pierwsze wdrożenie albo strona niedostępna - bez kalendarza
  }
}

if (calendar) {
  writeFileSync(OUT, JSON.stringify(calendar))
  console.log(`Kalendarz akademicki: ${calendar.events.length} wydarzeń (pobrany ${calendar.fetchedAt}).`)
}
