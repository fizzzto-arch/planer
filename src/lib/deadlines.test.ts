import { describe, expect, it } from 'vitest'
import { countdownLabel, upcomingDeadlines, urgency } from './deadlines'
import { parseDeadline, type Deadline } from './extras'

const d = (id: string, date: string, extra: Partial<Deadline> = {}): Deadline => ({
  id,
  courseName: null,
  kind: 'kolokwium',
  title: id,
  date,
  time: null,
  note: '',
  done: false,
  ...extra,
})

const now = new Date(2026, 9, 7, 12, 0) // środa 7.10

describe('terminy', () => {
  it('wybiera niezrobione terminy z najbliższych dni, posortowane po dacie i godzinie', () => {
    const list = [
      d('pozniej', '2026-10-30'),
      d('jutro-popoludnie', '2026-10-08', { time: '14:00' }),
      d('jutro-rano', '2026-10-08', { time: '08:15' }),
      d('zrobione', '2026-10-09', { done: true }),
      d('minione', '2026-10-06'),
      d('dzis', '2026-10-07'),
    ]
    expect(upcomingDeadlines(list, now, 14).map((x) => x.id)).toEqual(['dzis', 'jutro-rano', 'jutro-popoludnie'])
  })

  it('opisuje odliczanie po ludzku', () => {
    expect(countdownLabel(d('a', '2026-10-07'), now)).toBe('dziś')
    expect(countdownLabel(d('a', '2026-10-07', { time: '16:15' }), now)).toBe('dziś o 16:15')
    expect(countdownLabel(d('a', '2026-10-08'), now)).toBe('jutro')
    expect(countdownLabel(d('a', '2026-10-10'), now)).toBe('za 3 dni')
    expect(countdownLabel(d('a', '2026-10-01'), now)).toBe('minął')
  })

  it('ocenia pilność', () => {
    expect(urgency(d('a', '2026-10-08'), now)).toBe('urgent')
    expect(urgency(d('a', '2026-10-12'), now)).toBe('soon')
    expect(urgency(d('a', '2026-11-12'), now)).toBe('later')
    expect(urgency(d('a', '2026-10-01'), now)).toBe('past')
  })

  it('odrzuca uszkodzone dane z chmury i uzupełnia braki', () => {
    expect(parseDeadline('x', { title: 'bez daty' })).toBeNull()
    expect(parseDeadline('x', { date: '2026-10-08', kind: 'coś', time: '25:99' })).toEqual({
      id: 'x',
      courseName: null,
      kind: 'inne',
      title: '',
      date: '2026-10-08',
      time: null,
      note: '',
      done: false,
    })
  })
})
