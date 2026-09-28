import { parseIcs, type IcsEvent } from './ical'

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
  WYK: 'Wykład',
  CWI: 'Ćwiczenia',
  LAB: 'Laboratorium',
  PRO: 'Projekt',
  SEM: 'Seminarium',
  LEK: 'Lektorat',
  WF: 'WF',
}

export function typeLabel(type: string): string {
  return TYPE_LABELS[type] ?? (type === 'INNE' ? 'Inne' : type)
}

// Typy do wyboru przy dodawaniu własnych zajęć.
export const MEETING_TYPES: { id: string; label: string }[] = [
  ...Object.entries(TYPE_LABELS).map(([id, label]) => ({ id, label })),
  { id: 'INNE', label: 'Inne' },
]

// Klasa CSS koloru; nieznane typy dostają kolor neutralny.
export function typeSlug(type: string): string {
  return type in TYPE_LABELS ? type.toLowerCase() : 'inne'
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
    throw new Error('To nie jest plik kalendarza (.ics).')
  }
  return parseIcs(text)
    .map(toMeeting)
    .sort((a, b) => a.start.getTime() - b.start.getTime())
}

// Link iCal z USOS zwraca tylko NADCHODZĄCE zajęcia. Żeby nie tracić tych,
// które już się odbyły (np. poniedziałku, gdy jest środa), zostawiamy z
// poprzedniej wersji wszystko, co zaczęło się przed chwilą pobrania.
const HISTORY_DAYS = 180

export function mergeWithHistory(previous: Meeting[], fresh: Meeting[], now: Date): Meeting[] {
  const cutoff = now.getTime()
  const oldest = cutoff - HISTORY_DAYS * 24 * 60 * 60 * 1000
  const freshIds = new Set(fresh.map((m) => m.id))
  const kept = previous.filter((m) => {
    const t = m.start.getTime()
    return t < cutoff && t >= oldest && !freshIds.has(m.id)
  })
  return [...kept, ...fresh].sort((a, b) => a.start.getTime() - b.start.getTime())
}
