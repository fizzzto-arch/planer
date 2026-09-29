import { describe, expect, it } from 'vitest'
import {
  dueReminders,
  parseReminderDeadline,
  parseReminderKinds,
  reminderText,
  reminderTime,
  type ReminderDeadline,
} from './reminders'

const deadline = (over: Partial<ReminderDeadline> = {}): ReminderDeadline => ({
  id: 'd1',
  courseName: 'Grafika komputerowa',
  kind: 'kolokwium',
  title: '',
  date: '2026-10-16', // piątek
  time: '10:15',
  done: false,
  ...over,
})

const HOUR = 60 * 60 * 1000
const at = (s: string) => new Date(s) // czas lokalny

describe('czas przypomnienia', () => {
  it('tydzień i dzień wcześniej o 18:00, rano o 7:30, godzinę przed', () => {
    const d = deadline()
    expect(reminderTime(d, 'week')).toEqual(at('2026-10-09T18:00'))
    expect(reminderTime(d, 'day')).toEqual(at('2026-10-15T18:00'))
    expect(reminderTime(d, 'morning')).toEqual(at('2026-10-16T07:30'))
    expect(reminderTime(d, 'hour')).toEqual(at('2026-10-16T09:15'))
  })

  it('"godzinę przed" tylko dla terminów z godziną', () => {
    expect(reminderTime(deadline({ time: null }), 'hour')).toBeNull()
  })
})

describe('przypomnienia do wysłania', () => {
  const kinds = ['week', 'day'] as const

  it('wysyła, gdy czas minął w ostatnim oknie', () => {
    const due = dueReminders([{ deadline: deadline(), updatedAt: null }], [...kinds], at('2026-10-15T18:10'), 6 * HOUR)
    expect(due.map((r) => r.kind)).toEqual(['day'])
  })

  it('opóźniony skrypt i tak wysyła, ale nie po upływie okna', () => {
    const list = [{ deadline: deadline(), updatedAt: null }]
    expect(dueReminders(list, [...kinds], at('2026-10-15T23:00'), 6 * HOUR)).toHaveLength(1)
    expect(dueReminders(list, [...kinds], at('2026-10-16T00:30'), 6 * HOUR)).toHaveLength(0)
  })

  it('pomija zrobione, minione i dodane po czasie przypomnienia', () => {
    const now = at('2026-10-15T18:10')
    expect(dueReminders([{ deadline: deadline({ done: true }), updatedAt: null }], [...kinds], now, 6 * HOUR)).toEqual([])
    // Kolokwium dziś o 8:00 i "rano" o 7:30 - o 8:10 już po terminie.
    const past = deadline({ date: '2026-10-15', time: '08:00' })
    expect(dueReminders([{ deadline: past, updatedAt: null }], ['morning'], at('2026-10-15T08:10'), 6 * HOUR)).toEqual([])
    // Dodane o 20:00 dzień wcześniej - bez "jutro kolokwium" z 18:00.
    const added = { deadline: deadline(), updatedAt: at('2026-10-15T20:00') }
    expect(dueReminders([added], [...kinds], at('2026-10-15T20:10'), 6 * HOUR)).toEqual([])
  })

  it('termin bez godziny trwa do końca dnia', () => {
    const d = deadline({ time: null })
    expect(dueReminders([{ deadline: d, updatedAt: null }], ['morning'], at('2026-10-16T07:40'), 6 * HOUR)).toHaveLength(1)
  })
})

describe('treść powiadomienia', () => {
  const label = (name: string) => (name === 'Grafika komputerowa' ? 'GRK' : name)

  it('rodzaj albo tytuł, przedmiot (ze skrótem) i kiedy', () => {
    expect(reminderText({ deadline: deadline(), kind: 'day' }, label)).toEqual({
      title: 'Kolokwium · GRK',
      body: 'Jutro o 10:15',
    })
    expect(reminderText({ deadline: deadline({ title: 'Projekt 2', time: null }), kind: 'week' }, label)).toEqual({
      title: 'Projekt 2 · GRK',
      body: 'Za tydzień, piątek 16.10',
    })
    expect(reminderText({ deadline: deadline({ courseName: null, time: '08:15' }), kind: 'morning' }, label).body).toBe(
      'Dziś o 8:15',
    )
  })
})

describe('dane z konta', () => {
  it('odrzuca terminy bez poprawnej daty, rodzaje przypomnień filtruje', () => {
    expect(parseReminderDeadline('x', { date: 'jutro' })).toBeNull()
    expect(parseReminderDeadline('x', { date: '2026-10-16', time: '25', done: 'tak' })).toMatchObject({
      time: null,
      done: false,
    })
    expect(parseReminderKinds(['day', 'zawsze', 'hour'])).toEqual(['day', 'hour'])
    expect(parseReminderKinds(undefined)).toEqual(['week', 'day'])
  })
})
