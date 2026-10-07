import { describe, expect, it } from 'vitest'
import { isHiddenClass, isHiddenUsosClass, parseHiddenClasses, withHidden, withoutHidden } from './hiddenClasses'
import { parsePrefs } from './prefs'
import { notesEnabled } from './extras'

describe('notatki - dodatek do włączenia', () => {
  const extras = (courseNote: string, meetingNote: string) => ({
    courses: new Map([['a', { name: 'A', note: courseNote, links: [] }]]),
    meetingEdits: new Map([['m', { id: 'm', note: meetingNote, override: null }]]),
  })
  it('domyślnie wyłączone; kto ma już notatkę - włączone, dopóki sam nie wyłączy', () => {
    expect(parsePrefs({}).notes).toBeNull()
    expect(notesEnabled(null, extras('', ''))).toBe(false)
    expect(notesEnabled(null, extras('kontakt do prowadzącego', ''))).toBe(true)
    expect(notesEnabled(null, extras('', 'przynieść kalkulator'))).toBe(true)
    expect(notesEnabled(false, extras('kontakt', ''))).toBe(false)
    expect(notesEnabled(true, extras('', ''))).toBe(true)
  })
})

describe('zajęcia usunięte z planu', () => {
  it('cały przedmiot albo jeden rodzaj zajęć', () => {
    const hidden = [
      { course: 'Radiologia', type: null },
      { course: 'Grafika komputerowa', type: 'WYK' },
    ]
    expect(isHiddenClass(hidden, 'Radiologia', 'LAB')).toBe(true)
    expect(isHiddenClass(hidden, 'Grafika komputerowa', 'WYK')).toBe(true)
    expect(isHiddenClass(hidden, 'Grafika komputerowa', 'LAB')).toBe(false)
    expect(isHiddenClass(hidden, 'Fizyka', 'WYK')).toBe(false)
  })

  it('lektorat: w USOS ćwiczenia, w Planerze osobny rodzaj', () => {
    const hidden = [{ course: 'Język angielski - poziom B2', type: 'LEK' }]
    expect(isHiddenUsosClass(hidden, 'Język angielski - poziom B2', 'CWI')).toBe(true)
  })

  it('dopisywanie i przywracanie', () => {
    const one = withHidden([], { course: 'Grafika komputerowa', type: 'WYK' })
    expect(withHidden(one, { course: 'Grafika komputerowa', type: 'WYK' })).toBe(one) // bez duplikatu
    // Cały przedmiot zastępuje pojedyncze rodzaje.
    const whole = withHidden(one, { course: 'Grafika komputerowa', type: null })
    expect(whole).toEqual([{ course: 'Grafika komputerowa', type: null }])
    expect(withHidden(whole, { course: 'Grafika komputerowa', type: 'LAB' })).toBe(whole)
    expect(withoutHidden(whole, { course: 'Grafika komputerowa', type: null })).toEqual([])
  })

  it('odczyt z ustawień pomija błędne wpisy', () => {
    expect(parseHiddenClasses([{ course: 'A', type: 'WYK' }, { course: 'B' }, { type: 'LAB' }, 'x', null])).toEqual([
      { course: 'A', type: 'WYK' },
      { course: 'B', type: null },
    ])
    expect(parsePrefs({}).hiddenClasses).toEqual([])
  })
})
