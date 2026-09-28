import { describe, expect, it } from 'vitest'
import { DEFAULT_PREFS, displayName, parsePrefs, resolveTheme } from './prefs'
import { semesterWeek } from './semesterWeek'

describe('ustawienia', () => {
  it('uzupełnia braki domyślnymi i odrzuca złe wartości', () => {
    expect(parsePrefs({})).toEqual(DEFAULT_PREFS)
    const p = parsePrefs({ animations: 'turbo', gapMinutes: 17, theme: 'dark', courseAliases: { 'Grafika komputerowa': ' GK ', X: '' } })
    expect(p.animations).toBe('on')
    expect(p.gapMinutes).toBe(30)
    expect(p.theme).toBe('dark')
    expect(p.courseAliases).toEqual({ 'Grafika komputerowa': ' GK ' })
    expect(displayName('Grafika komputerowa', p)).toBe('GK')
  })

  it('motyw "jak w systemie" idzie za systemem', () => {
    expect(resolveTheme('system', true)).toBe('dark')
    expect(resolveTheme('system', false)).toBe('light')
    expect(resolveTheme('light', true)).toBe('light')
  })

  it('pokazuje skrót, jeśli jest', () => {
    const prefs = { courseAliases: { 'Grafika komputerowa': 'GK' }, useAliases: true }
    expect(displayName('Grafika komputerowa', prefs)).toBe('GK')
    expect(displayName('Radiologia', prefs)).toBe('Radiologia')
  })
})

describe('numer tygodnia semestru', () => {
  const at = (month: number, day: number, cancelled = false) => ({ start: new Date(2026, month, day, 10), cancelled })
  // Zajęcia: 5.10, 12.10, (przerwa 19.10), 26.10; potem nowy semestr od 22.02.
  const meetings = [at(9, 5), at(9, 7), at(9, 12), at(9, 19, true), at(9, 26), at(11, 21), at(1 + 12, 22)]

  it('liczy tylko tygodnie z zajęciami', () => {
    expect(semesterWeek(new Date(2026, 9, 6), meetings)).toEqual({ number: 1, odd: true })
    expect(semesterWeek(new Date(2026, 9, 14), meetings)).toEqual({ number: 2, odd: false })
    // tydzień 19.10 ma tylko odwołane zajęcia - bez numeru, a następny to 3
    expect(semesterWeek(new Date(2026, 9, 20), meetings)).toBeNull()
    expect(semesterWeek(new Date(2026, 9, 27), meetings)).toEqual({ number: 3, odd: true })
  })

  it('długa przerwa zaczyna numerację od nowa (nowy semestr)', () => {
    expect(semesterWeek(new Date(2027, 1, 23), meetings)).toEqual({ number: 1, odd: true })
  })
})

describe('podpowiedź skrótu', () => {
  it('bierze pierwsze litery dłuższych słów', async () => {
    const { suggestAlias } = await import('./prefs')
    expect(suggestAlias('Podstawy elementów i układów elektronicznych')).toBe('PEUE')
    expect(suggestAlias('Rachunek prawdopodobieństwa i statystyka')).toBe('RPS')
    expect(suggestAlias('Grafika komputerowa')).toBe('GK')
    expect(suggestAlias('Radiologia')).toBe('Radiologia')
  })
})

describe('rozmiar tekstu i skróty', () => {
  it('starszy wspólny rozmiar tekstu przechodzi na telefon i komputer', () => {
    const p = parsePrefs({ textSize: 'large' })
    expect(p.textSizePhone).toBe('large')
    expect(p.textSizeDesktop).toBe('large')
    const q = parsePrefs({ textSize: 'large', textSizePhone: 'small' })
    expect(q.textSizePhone).toBe('small')
    expect(q.textSizeDesktop).toBe('large')
  })

  it('wyłączone skróty = pełne nazwy, choć skróty zostają zapisane', () => {
    const prefs = { courseAliases: { 'Grafika komputerowa': 'GK' }, useAliases: false }
    expect(displayName('Grafika komputerowa', prefs)).toBe('Grafika komputerowa')
    expect(displayName('Grafika komputerowa', { ...prefs, useAliases: true })).toBe('GK')
  })
})
