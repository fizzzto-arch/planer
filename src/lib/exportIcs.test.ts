import { describe, expect, it } from 'vitest'
import { exportIcs } from './exportIcs'
import type { TimetableMeeting } from './timetable'
import { crc32 } from './xlsx'

const meeting = (over: Partial<TimetableMeeting> = {}): TimetableMeeting => ({
  id: 'u1',
  courseName: 'Wspomagane komputerowo projektowanie inżynierskie; część 1, grupa ą',
  type: 'LAB',
  start: new Date(2026, 9, 26, 8, 15), // pierwszy poniedziałek czasu zimowego
  end: new Date(2026, 9, 26, 10, 0),
  room: '605',
  building: 'Mechatronika',
  groupNumber: 102,
  cancelled: false,
  ...over,
})

describe('plik kalendarza (.ics)', async () => {
  const text = await exportIcs(
    [meeting(), meeting({ id: 'u2', start: new Date(2026, 9, 19, 8, 15), end: new Date(2026, 9, 19, 10, 0) }), meeting({ id: 'x', cancelled: true })],
    (c) => c,
    'Plan, zimowy',
  ).text()
  const lines = text.split('\r\n')

  it('format: CRLF, linie do 75 bajtów, znaki specjalne ucieczką', () => {
    expect(text.endsWith('\r\n')).toBe(true)
    expect(text).not.toMatch(/[^\r]\n/) // każdy koniec linii to CRLF
    for (const line of lines) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75)
    const unfolded = text.replace(/\r\n /g, '')
    expect(unfolded).toContain('X-WR-CALNAME:Plan\\, zimowy')
    expect(unfolded).toContain('SUMMARY:Wspomagane komputerowo projektowanie inżynierskie\\; część 1\\, grupa ą (Laboratorium)')
  })

  it('odwołane zajęcia pomijamy, godziny w UTC niezależnie od zmiany czasu', () => {
    expect(text.match(/BEGIN:VEVENT/g)).toHaveLength(2)
    expect(text).not.toContain('UID:x@planer')
    expect(text).toContain('DTSTART:20261026T071500Z') // 8:15 czasu zimowego
    expect(text).toContain('DTSTART:20261019T061500Z') // 8:15 czasu letniego
  })
})

describe('archiwum ZIP (Excel)', () => {
  it('suma kontrolna CRC-32 jak w standardzie', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926)
    expect(crc32(new Uint8Array(0))).toBe(0)
  })
})
