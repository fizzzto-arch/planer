import { describe, expect, it } from 'vitest'
import { dayLabel, dedupeEvents, parseUsosEvent, type CalendarEvent } from './academicCalendar'

// Wydarzenia jak z USOS dla EiTI (2026/27).
const raw = [
  { start_date: '2026-11-11 00:00:00', end_date: '2026-11-11 00:00:00', type: 'public_holidays', is_day_off: true, name: { pl: 'Narodowe Święto Niepodległości' } },
  { start_date: '2026-11-15 00:00:00', end_date: '2026-11-15 00:00:00', type: 'rector', is_day_off: false, name: { pl: 'Dzień PW' } },
  { start_date: '2026-12-24 00:00:00', end_date: '2027-01-06 00:00:00', type: 'break', is_day_off: true, name: { pl: 'Wakacje zimowe' } },
  { start_date: '2026-12-25 00:00:00', end_date: '2026-12-25 00:00:00', type: 'holidays', is_day_off: true, name: { pl: 'Boże Narodzenie, pierwszy dzień świąt' } },
  { start_date: '2027-02-01 00:00:00', end_date: '2027-02-14 00:00:00', type: 'exam_session', is_day_off: true, name: { pl: 'Zimowa sesja egzaminacyjna' } },
]

describe('kalendarz akademicki', () => {
  const events = dedupeEvents(
    [...raw, ...raw].map((r) => parseUsosEvent(r)).filter((e): e is CalendarEvent => e !== null), // dwa wydziały
  )

  it('bez powtórzeń z kilku wydziałów, posortowane', () => {
    expect(events).toHaveLength(5)
    expect(events[0]).toEqual({ start: '2026-11-11', end: '2026-11-11', type: 'public_holidays', dayOff: true, name: 'Narodowe Święto Niepodległości' })
    expect(parseUsosEvent({ start_date: 'zła data', name: { pl: 'x' } })).toBeNull()
  })

  it('jedna etykieta na dzień: święto przed wakacjami, sesja, bez wydarzeń niewolnych', () => {
    expect(dayLabel(events, '2026-11-11')?.name).toBe('Narodowe Święto Niepodległości')
    expect(dayLabel(events, '2026-11-15')).toBeNull() // Dzień PW - zajęcia normalnie
    expect(dayLabel(events, '2026-12-25')?.name).toBe('Boże Narodzenie, pierwszy dzień świąt')
    expect(dayLabel(events, '2026-12-28')?.name).toBe('Wakacje zimowe')
    expect(dayLabel(events, '2027-02-03')?.name).toBe('Zimowa sesja egzaminacyjna')
    expect(dayLabel(events, '2026-10-20')).toBeNull()
  })
})
