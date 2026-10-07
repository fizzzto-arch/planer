import { describe, expect, it } from 'vitest'
import { isHiddenClass, isHiddenUsosClass, parseHiddenClasses, withHidden, withoutHidden } from './hiddenClasses'
import { parsePrefs } from './prefs'

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
