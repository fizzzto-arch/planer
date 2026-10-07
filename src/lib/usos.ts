import { msg, t, tk } from './i18n.ts'
import { parseIcs, type IcsEvent } from './ical.ts'

// Pojedyncze spotkanie (jeden termin zajęć).
// Para unitId + groupNumber jednoznacznie wskazuje grupę zajęciową w USOS -
// na tym oprze się później porównywanie i dobieranie grup.
export interface Meeting {
  id: string
  courseName: string
  type: string // kod USOS: WYK, CWI, LAB, PRO, SEM...
  start: Date
  end: Date
  room: string | null
  building: string | null
  address: string | null
  groupNumber: number | null
  unitId: string | null // zaj_cyk_id - identyfikator zajęć w USOS
  usosUrl: string | null
  cancelled: boolean
}

const TYPE_LABELS: Record<string, string> = {
  WYK: msg('Wykład'),
  CWI: msg('Ćwiczenia'),
  LAB: msg('Laboratorium'),
  PRO: msg('Projekt'),
  SEM: msg('Seminarium'),
  LEK: msg('Lektorat'),
  WF: msg('WF'),
}

// Pozostałe kody typów zajęć z USOS PW (courses/classtypes_index) - nazwy zamiast skrótów.
const OTHER_LABELS: Record<string, string> = {
  FIZ: msg('WF'), // wychowanie fizyczne - w USOS "FIZ"
  SED: msg('Seminarium dyplomowe'),
  ZKO: msg('Zajęcia komputerowe'),
  EGZ: msg('Egzamin'),
  KON: msg('Konsultacje'),
  PRA: msg('Praktyka'),
  DOM: msg('Praca własna'),
  PPR: msg('Praca przejściowa'),
  TST: msg('Test'),
  ZIN: msg('Zajęcia zintegrowane'),
}

// Kody, które dzielą kolor z głównym typem (WF z USOS jako "FIZ" - kolor WF, nie szary "Inne").
const COLOR_ALIASES: Record<string, string> = { FIZ: 'WF', SED: 'SEM', ZKO: 'LAB' }

// Krótko do wąskiej siatki tygodnia na telefonie: wyk, ćw, lab, wf, lek...
const TYPE_SHORT: Record<string, string> = {
  WYK: msg('wyk'),
  CWI: msg('ćw'),
  LAB: msg('lab'),
  PRO: msg('proj'),
  SEM: msg('sem'),
  SED: msg('sem'),
  LEK: msg('lek'),
  WF: msg('wf'),
  FIZ: msg('wf'),
  ZKO: msg('komp'),
}

export function typeShort(type: string): string {
  const short = TYPE_SHORT[type]
  return short ? tk(short) : typeLabel(type).slice(0, 4).toLowerCase()
}

export function typeLabel(type: string): string {
  const label = TYPE_LABELS[type] ?? OTHER_LABELS[type]
  return label ? tk(label) : type === 'INNE' ? t('Inne') : type
}

// Typy do wyboru przy dodawaniu własnych zajęć (nazwy przez typeLabel - w języku interfejsu).
export const MEETING_TYPES: string[] = [...Object.keys(TYPE_LABELS), 'INNE']

// Lektoraty są w USOS zapisane jako ćwiczenia, ale to inny rodzaj zajęć - w Planerze mają własny typ
// (i kolor). Rozpoznajemy je po nazwie: "Język angielski - poziom B2", "Język niemiecki...",
// "Polski język migowy". Nazwy języków to przymiotniki na -ski/-cki/-zki ("Języki i metody
// programowania" czy "Język C" nimi nie są).
const LANGUAGE_COURSE = /^(?:lektorat\b|(?:polski\s+)?język\s+\p{L}+(?:ski|cki|zki|owy)\b)/iu

export function classTypeOf(courseName: string, type: string): string {
  return type === 'CWI' && LANGUAGE_COURSE.test(courseName.trim()) ? 'LEK' : type
}

export function withLanguageClasses<T extends Pick<Meeting, 'courseName' | 'type'>>(meetings: T[]): T[] {
  return meetings.map((m) => {
    const type = classTypeOf(m.courseName, m.type)
    return type === m.type ? m : { ...m, type }
  })
}

// Typ, którego kolor ma dostać dany kod (FIZ -> WF); nieznane - "INNE".
export function colorType(type: string): string {
  const main = COLOR_ALIASES[type] ?? type
  return main in TYPE_LABELS ? main : 'INNE'
}

// Klasa CSS koloru; nieznane typy dostają kolor neutralny.
export function typeSlug(type: string): string {
  return colorType(type).toLowerCase()
}

const BUILDING_SHORT: [RegExp, string][] = [
  [/Elektroniki i Technik Informacyjnych/i, 'EiTI'],
  [/Mechatroniki/i, 'Mechatronika'],
]

export function shortBuilding(building: string | null): string | null {
  if (!building) return null
  for (const [pattern, short] of BUILDING_SHORT) {
    if (pattern.test(building)) return short
  }
  return building.replace(/^Budynek\s+/i, '')
}

function toMeeting(event: IcsEvent): Meeting {
  // SUMMARY: "WYK - Grafika komputerowa"
  const summary = /^(\S{2,5}) - (.+)$/.exec(event.summary)
  const type = summary ? summary[1].toUpperCase() : 'INNE'
  const courseName = summary ? summary[2].trim() : event.summary.trim()

  // DESCRIPTION: "Sala: 170\nBudynek Wydziału ...\n\nhttps://usosweb...&gr_nr=1&zaj_cyk_id=543977"
  const lines = event.description
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  const roomLine = lines.find((l) => /^Sala:/i.test(l))
  const urlLine = lines.find((l) => /^https?:\/\//i.test(l))
  const buildingLine = lines.find((l) => l !== roomLine && l !== urlLine)

  let groupNumber: number | null = null
  let unitId: string | null = null
  if (urlLine) {
    try {
      const params = new URL(urlLine).searchParams
      const gr = params.get('gr_nr')
      groupNumber = gr && /^\d+$/.test(gr) ? Number(gr) : null
      unitId = params.get('zaj_cyk_id')
    } catch {
      // uszkodzony link - pomijamy numer grupy
    }
  }

  return {
    id: event.uid,
    courseName,
    type,
    start: event.start,
    end: event.end,
    room: roomLine ? roomLine.replace(/^Sala:\s*/i, '') || null : null,
    building: buildingLine ?? null,
    address: event.location.trim() || null,
    groupNumber,
    unitId,
    usosUrl: urlLine ?? null,
    cancelled: event.status === 'CANCELLED',
  }
}

export function parseUsosCalendar(text: string): Meeting[] {
  if (!/BEGIN:VCALENDAR/i.test(text)) {
    throw new Error(t('To nie jest plik kalendarza (.ics).'))
  }
  return parseIcs(text)
    .map(toMeeting)
    .sort((a, b) => a.start.getTime() - b.start.getTime())
}

// Link iCal z USOS zwraca tylko NADCHODZĄCE zajęcia. Żeby nie tracić tych,
// które już się odbyły (np. poniedziałku, gdy jest środa), zostawiamy z
// poprzedniej wersji wszystko, co zaczęło się przed chwilą pobrania.
const HISTORY_DAYS = 180

//
// Te same zajęcia rozpoznajemy też po terminie, nie tylko po identyfikatorze: USOS potrafi nadać
// zajęciom nowy identyfikator, a trwające zajęcia są jeszcze w świeżych danych - stara kopia
// z historii i nowa pokazywałyby się obok siebie.
const sameClass = (m: Meeting) => `${m.courseName}|${m.type}|${m.start.getTime()}|${m.end.getTime()}`

export function mergeWithHistory(previous: Meeting[], fresh: Meeting[], now: Date): Meeting[] {
  const cutoff = now.getTime()
  const oldest = cutoff - HISTORY_DAYS * 24 * 60 * 60 * 1000
  const freshIds = new Set(fresh.map((m) => m.id))
  const taken = new Set(fresh.map(sameClass))
  const kept: Meeting[] = []
  // Od końca: z dwóch kopii w historii zostaje nowsza (z późniejszego pobrania).
  for (let i = previous.length - 1; i >= 0; i--) {
    const m = previous[i]
    const item = m.start.getTime()
    const key = sameClass(m)
    if (item >= cutoff || item < oldest || freshIds.has(m.id) || taken.has(key)) continue
    taken.add(key)
    kept.push(m)
  }
  return [...kept, ...fresh].sort((a, b) => a.start.getTime() - b.start.getTime())
}
