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
