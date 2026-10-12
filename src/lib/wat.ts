// Plany grup Wydziału Cybernetyki WAT (planzajec.wcy.wat.edu.pl). WAT nie ma linku iCal jak USOS,
// a jego serwer nie wpuszcza zapytań z innych stron - dlatego plany pobiera serwer Planera
// (scripts/wat-plans.ts, co noc) i publikuje obok strony jako pliki .ics w dialekcie USOS.
// Dla aplikacji plan WAT to wtedy zwykły "link do planu": działa odświeżanie, synchronizacja,
// powiadomienia o zmianach i eksport. Plik bez importów spoza src/lib - czyta go też Node.

export const WAT_PLAN_URL = 'https://planzajec.wcy.wat.edu.pl/pl/rozklad'

export interface WatLesson {
  date: string // "2026-10-01"
  start: string // "11:40"
  end: string // "13:15"
  short: string // "PGI"
  courseName: string // "Podstawy grafiki inżynierskiej"
  kind: string // "Wykład", "Ćwiczenia", "Laboratorium"...
  room: string | null // "316"
  building: string | null // "S"
  teacher: string | null
}

export interface WatPlan {
  group: string
  updatedAt: string | null // "2026-09-30 00:39:49" - kiedy WAT wygenerował plany
  lessons: WatLesson[]
}

// "WCY26IY4S1 - I6Y4S1", "wcy26iy4s1", link z grupa_id=... -> "WCY26IY4S1"; null = to nie kod grupy WAT.
export function parseWatGroup(input: string): string | null {
  const m = /(?:grupa_id=|^|\s)(WCY\d{2}[A-Z0-9]{2,12})\b/i.exec(input.trim())
  return m ? m[1].toUpperCase() : null
}

// Wszystkie grupy z listy wyboru na stronie planu (jest na stronie każdej grupy).
export function parseWatGroups(html: string): string[] {
  return [...new Set([...html.matchAll(/grupa_id=(WCY[A-Z0-9]+)/g)].map((m) => m[1]))].sort()
}

const decode = (s: string) =>
  s
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .trim()

const span = (html: string, cls: string) => {
  const m = new RegExp(`<span class="${cls}">([\\s\\S]*?)</span>`).exec(html)
  return m ? decode(m[1]) : ''
}

// Skrót rodzaju w siatce, gdy opis jest pusty: "PGI\n(w)\n...".
const KIND_LETTERS: Record<string, string> = { w: 'Wykład', 'ć': 'Ćwiczenia', L: 'Laboratorium', P: 'Projekt', S: 'Seminarium' }

export function parseWatPlan(group: string, html: string): WatPlan {
  // Godziny bloków: <div class="block_nr block3">...<span class="hr1">11:40</span><span class="hr2">13:15</span>
  const blocks = new Map<string, { start: string; end: string }>()
  for (const m of html.matchAll(/class="block_nr (block\d+)">[\s\S]*?class="hr1">(\d{1,2}:\d{2})<\/span><span class="hr2">(\d{1,2}:\d{2})</g)) {
    if (!blocks.has(m[1])) blocks.set(m[1], { start: m[2].padStart(5, '0'), end: m[3].padStart(5, '0') })
  }
  // Zajęcia są na stronie dwa razy (siatka i ukryta lista) - bierzemy ukrytą listę, a bez niej całość.
  const listStart = html.indexOf('<div class="lessons hidden">')
  const source = listStart >= 0 ? html.slice(listStart) : html
  const seen = new Set<string>()
  const lessons: WatLesson[] = []
  for (const m of source.matchAll(/<div class="lesson">([\s\S]*?)<\/div>/g)) {
    const body = m[1]
    const date = span(body, 'date').replace(/_/g, '-')
    const block = blocks.get(span(body, 'block_id'))
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !block) continue
    // name: "PGI\n(w)\n316 S\n[1]", info: "Podstawy grafiki inżynierskiej - (Wykład) - Nazwisko Imię"
    const nameLines = span(body, 'name').split('\n').map((l) => l.trim())
    // Bez prowadzącego opis kończy się samym " - " (po obcięciu spacji: " -").
    const info = /^(.*?) - \(([^)]*)\)(?:\s*-\s*(.*))?$/.exec(span(body, 'info'))
    const place = /^(\S+)(?:\s+(\S+))?$/.exec(nameLines[2] ?? '')
    const letter = /^\((.+)\)$/.exec(nameLines[1] ?? '')?.[1] ?? ''
    const lesson: WatLesson = {
      date,
      start: block.start,
      end: block.end,
      short: nameLines[0] ?? '',
      courseName: (info?.[1] || nameLines[0] || '').trim(),
      kind: (info?.[2] || KIND_LETTERS[letter] || '').trim(),
      room: place?.[1] ?? null,
      building: place?.[2] ?? null,
      teacher: info?.[3]?.trim() || null,
    }
    const key = `${date}|${block.start}|${lesson.short}|${lesson.kind}`
    if (seen.has(key)) continue
    seen.add(key)
    lessons.push(lesson)
  }
  lessons.sort((a, b) => `${a.date} ${a.start}`.localeCompare(`${b.date} ${b.start}`))
  const updated = /Data aktualizacji:\s*([\d-]+ [\d:]+)/.exec(html)
  return { group, updatedAt: updated?.[1] ?? null, lessons }
}

const KIND_CODES: Record<string, string> = {
  wykład: 'WYK',
  ćwiczenia: 'CWI',
  laboratorium: 'LAB',
  projekt: 'PRO',
  seminarium: 'SEM',
  lektorat: 'LEK',
}

const icsText = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1')
const icsTime = (date: string, time: string) => `${date.replace(/-/g, '')}T${time.replace(':', '')}00`

// Kalendarz w dialekcie linku z USOS (src/lib/usos.ts): SUMMARY "WYK - Nazwa", DESCRIPTION "Sala: 316\nBudynek S".
// Czas lokalny bez strefy - jak w USOS, Planer czyta go jako czas polski.
export function watToIcs(plan: WatPlan): string {
  const events = plan.lessons.flatMap((l) => {
    const code = KIND_CODES[l.kind.toLowerCase()] ?? 'INNE'
    // Zaliczenie, spotkanie organizacyjne... - rodzaj w nazwie, bo typ to "Inne".
    const name = code === 'INNE' && l.kind ? `${l.courseName} (${l.kind})` : l.courseName
    const description = [l.room ? `Sala: ${l.room}` : '', l.building ? `Budynek ${l.building}` : ''].filter(Boolean).join('\n')
    return [
      'BEGIN:VEVENT',
      `UID:wat-${plan.group}-${l.date}-${l.start.replace(':', '')}-${icsText(l.short)}`,
      `DTSTART:${icsTime(l.date, l.start)}`,
      `DTEND:${icsTime(l.date, l.end)}`,
      `SUMMARY:${icsText(`${code} - ${name}`)}`,
      ...(description ? [`DESCRIPTION:${icsText(description)}`] : []),
      'END:VEVENT',
    ]
  })
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Planer//WAT//PL',
    `X-WR-CALNAME:${icsText(`WAT ${plan.group}`)}`,
    ...(plan.updatedAt ? [`X-PLANER-WAT-UPDATED:${plan.updatedAt}`] : []),
    ...events,
    'END:VCALENDAR',
  ].join('\r\n') + '\r\n'
}

// Adres pliku z planem grupy obok strony Planera (np. .../planer/wat/WCY26IY4S1.ics).
export function watPlanUrl(group: string, base: string): string {
  return new URL(`wat/${group}.ics`, base).href
}

// Grupa z adresu pliku planu (null = to nie plan WAT, np. link z USOS).
export function watGroupFromUrl(url: string): string | null {
  return /\/wat\/(WCY[A-Z0-9]+)\.ics(?:$|\?)/.exec(url)?.[1] ?? null
}

// Z kiedy jest plan w kalendarzu Planera (X-PLANER-WAT-UPDATED, czas wygenerowania planów przez WAT).
export function watUpdatedFromIcs(ics: string): string | null {
  return /^X-PLANER-WAT-UPDATED:(.+?)\r?$/m.exec(ics)?.[1].trim() ?? null
}

// "2026-10-05 00:40:17" -> data (czas polski, jak na stronie WAT); null - nieczytelne.
export function parseWatTimestamp(value: string | null | undefined): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?: (\d{2}):(\d{2}))?/.exec(value ?? '')
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4] ?? 0), Number(m[5] ?? 0)) : null
}

// Plan WAT wgrany ze strony zapisanej przez studenta - na koncie (users/{uid}/settings/watPlan), żeby
// trafił też na inne urządzenia i do powiadomień.
export interface SharedWatPlan {
  group: string
  updatedAt: string // z kiedy jest plan (WAT), "2026-10-12 00:40:11"
  ics: string
}

export function parseSharedWatPlan(raw: Record<string, unknown> | undefined): SharedWatPlan | null {
  if (!raw || typeof raw.group !== 'string' || typeof raw.updatedAt !== 'string' || typeof raw.ics !== 'string') return null
  return { group: raw.group, updatedAt: raw.updatedAt, ics: raw.ics }
}

// ---------- Strona planu zapisana przez studenta ----------
// WAT blokuje automatyczne pobieranie, ale student widzi swój plan w przeglądarce - może zapisać stronę
// i wgrać ją do Planera: komputer - .html (Ctrl+S), Android - .mhtml ("Pobierz"), iPhone - archiwum Safari.

const utf8 = (bytes: number[]) => new TextDecoder('utf-8').decode(new Uint8Array(bytes))

function decodeQuotedPrintable(text: string): string {
  const bytes: number[] = []
  const body = text.replace(/=\r?\n/g, '') // miękkie złamania linii
  for (let i = 0; i < body.length; i++) {
    const hex = body[i] === '=' ? /^[0-9A-Fa-f]{2}/.exec(body.slice(i + 1, i + 3)) : null
    if (hex) {
      bytes.push(parseInt(hex[0], 16))
      i += 2
    } else {
      const code = body.charCodeAt(i)
      if (code < 0x80) bytes.push(code)
      else bytes.push(...new TextEncoder().encode(body[i]))
    }
  }
  return utf8(bytes)
}

// Sam HTML strony z pliku: .mhtml - część text/html (zwykle quoted-printable), inne - od <html do </html>.
export function htmlFromSavedPage(text: string): string {
  const mime = /Content-Type:\s*text\/html[^\r\n]*\r?\n((?:[^\r\n]+\r?\n)*?)\r?\n([\s\S]*?)(?:\r?\n--[^\r\n]+|$)/i.exec(text)
  if (/^MIME-Version:/im.test(text.slice(0, 2000)) && mime) {
    const headers = mime[1]
    const body = mime[2]
    if (/Content-Transfer-Encoding:\s*quoted-printable/i.test(headers)) return decodeQuotedPrintable(body)
    if (/Content-Transfer-Encoding:\s*base64/i.test(headers)) {
      return utf8([...atob(body.replace(/\s+/g, ''))].map((c) => c.charCodeAt(0)))
    }
    return body
  }
  const start = text.search(/<html/i)
  const end = text.toLowerCase().lastIndexOf('</html>')
  return start >= 0 && end > start ? text.slice(start, end + 7) : text
}

// Grupa ze strony planu: nagłówek "Rozkład zajęć grupy: WCY26IY4S1".
export function watGroupFromPage(html: string): string | null {
  return /Rozkład zajęć grupy:\s*(WCY[A-Z0-9]+)/i.exec(html)?.[1].toUpperCase() ?? null
}

// Plan grupy z zapisanej strony WAT; null - to nie strona planu grupy z planzajec.wcy.wat.edu.pl.
export function watPlanFromSavedPage(text: string): WatPlan | null {
  const html = htmlFromSavedPage(text)
  const group = watGroupFromPage(html)
  if (!group) return null
  const plan = parseWatPlan(group, html)
  return plan.lessons.length > 0 ? plan : null
}
