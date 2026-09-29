// Plan jako plik kalendarza (.ics) - z ręcznymi zmianami z Planera (link z USOS ich nie zna).
import type { TimetableMeeting } from './timetable'
import { shortBuilding, typeLabel } from './usos'

// Czas w UTC: 20261005T061500Z (kalendarz sam przeliczy na strefę telefonu).
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

// Znaki specjalne formatu: \ , ; i nowa linia.
const text = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1')

// Linie dłuższe niż 75 bajtów zawijamy (wymóg formatu), nie rozcinając znaków UTF-8.
function fold(line: string): string {
  const encoder = new TextEncoder()
  const out: string[] = []
  let current = ''
  for (const ch of line) {
    if (encoder.encode(current + ch).length > (out.length ? 74 : 75)) {
      out.push(current)
      current = ch
    } else current += ch
  }
  out.push(current)
  return out.join('\r\n ')
}

export function exportIcs(meetings: TimetableMeeting[], label: (course: string) => string, calendarName: string): Blob {
  const now = stamp(new Date())
  const events = meetings
    .filter((m) => !m.cancelled)
    .map((m) => {
      const place = [m.room ? `s. ${m.room}` : '', shortBuilding(m.building) ?? m.building ?? ''].filter(Boolean).join(', ')
      return [
        'BEGIN:VEVENT',
        `UID:${text(m.id)}@planer`,
        `DTSTAMP:${now}`,
        `DTSTART:${stamp(m.start)}`,
        `DTEND:${stamp(m.end)}`,
        `SUMMARY:${text(`${label(m.courseName)} (${typeLabel(m.type)})`)}`,
        ...(place ? [`LOCATION:${text(place)}`] : []),
        ...(m.groupNumber !== null ? [`DESCRIPTION:${text(`${typeLabel(m.type)}, grupa ${m.groupNumber}`)}`] : []),
        'END:VEVENT',
      ]
    })
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Planer//PL',
    'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:${text(calendarName)}`,
    ...events.flat(),
    'END:VCALENDAR',
  ]
  return new Blob([lines.map(fold).join('\r\n') + '\r\n'], { type: 'text/calendar;charset=utf-8' })
}
