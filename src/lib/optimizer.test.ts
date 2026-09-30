import { describe, expect, it } from 'vitest'
import {
  DEFAULT_OPTIMIZER_SETTINGS,
  deanFilter,
  deanGroups,
  deanGroupOf,
  evaluate,
  hitsBlocked,
  optimize,
  type GroupOption,
  type OptMeeting,
  type Slot,
} from './optimizer'

// Poniedziałek 5.10.2026 + dni; godziny jako "HH:MM"
const at = (dayOffset: number, from: string, to: string): OptMeeting => {
  const [fh, fm] = from.split(':').map(Number)
  const [th, tm] = to.split(':').map(Number)
  return {
    start: new Date(2026, 9, 5 + dayOffset, fh, fm),
    end: new Date(2026, 9, 5 + dayOffset, th, tm),
    room: null,
    building: null,
  }
}
const option = (groupNumber: number, ...meetings: OptMeeting[]): GroupOption => ({
  unitId: 'u',
  groupNumber,
  meetings,
})
const slot = (id: string, currentIndex: number, ...options: GroupOption[]): Slot => ({
  id,
  courseName: id,
  classType: 'CWI',
  options,
  currentIndex,
})

const settings = { ...DEFAULT_OPTIMIZER_SETTINGS, weights: { gaps: 3, days: 2, early: 0, late: 0, finish: 0 } }

describe('ocena planu', () => {
  it('liczy okienka od progu, dni i wczesne/późne godziny', () => {
    const m = evaluate(
      [at(0, '08:15', '10:00'), at(0, '10:15', '12:00'), at(0, '14:15', '16:00'), at(2, '16:15', '18:00')],
      { ...settings, startAfter: '10:00', endBefore: '16:00' },
      30,
      1,
    )
    expect(m.gapMinutes).toBe(135) // 12:00-14:15; przerwa 15 min to nie okienko
    expect(m.days).toBe(2)
    expect(m.earlyMinutes).toBe(105) // 8:15 zamiast 10:00
    expect(m.lateMinutes).toBe(120) // do 18:00 zamiast 16:00
    expect(m.avgEndMinutes).toBe(17 * 60) // koniec o 16:00 i 18:00
  })

  it('rozpoznaje zablokowane godziny', () => {
    const blocked = [{ id: 'b', weekday: 3, from: '15:00', to: '20:00' }] // środa
    expect(hitsBlocked(at(2, '16:15', '18:00'), blocked)).toBe(true)
    expect(hitsBlocked(at(2, '10:15', '12:00'), blocked)).toBe(false)
    expect(hitsBlocked(at(1, '16:15', '18:00'), blocked)).toBe(false) // wtorek
  })
})

describe('optymalizator', () => {
  // Poniedziałek: stały wykład 8:15-10:00. Ćwiczenia: gr 101 pon 10:15 (bez okienka) albo 201 pon 14:15 (okienko).
  // Lab: gr 101 śr 8:15 (osobny dzień) albo 201 pon 12:15 (ten sam dzień, bez okienka po ćw. 101).
  const fixed = [at(0, '08:15', '10:00')]
  const cwi = slot('cwi', 1, option(101, at(0, '10:15', '12:00')), option(201, at(0, '14:15', '16:00')))
  const lab = slot('lab', 0, option(101, at(2, '08:15', '11:00')), option(201, at(0, '12:15', '14:00')))

  it('znajduje plan bez okienek w mniejszej liczbie dni', () => {
    const { candidates, current } = optimize([cwi, lab], { fixed, settings, gapThreshold: 30, limit: 3 })
    const best = candidates[0]
    expect(best.choice).toEqual([0, 1]) // ćw 101 + lab 201: wszystko w poniedziałek, bez okienek
    expect(best.metrics.days).toBe(1)
    expect(best.metrics.gapMinutes).toBe(0)
    expect(best.changes).toBe(2)
    expect(current?.metrics.days).toBe(2)
  })

  it('odrzuca kombinacje z kolizjami', () => {
    const clash = slot('x', 0, option(101, at(0, '10:30', '11:30')), option(201, at(4, '10:00', '11:00')))
    const { candidates } = optimize([cwi, clash], { fixed, settings, gapThreshold: 30, limit: 10 })
    // ćw 101 (pon 10:15-12:00) koliduje z x 101 (pon 10:30) - takiej pary nie ma
    expect(candidates.some((c) => c.choice[0] === 0 && c.choice[1] === 0)).toBe(false)
  })

  it('szanuje przypięte grupy i blokady godzin', () => {
    const pinned = optimize([cwi, lab], {
      fixed,
      settings: { ...settings, pinned: { lab: 101 } },
      gapThreshold: 30,
      limit: 5,
    })
    expect(pinned.candidates.every((c) => c.choice[1] === 0)).toBe(true)

    const blocked = optimize([cwi, lab], {
      fixed,
      settings: { ...settings, blocked: [{ id: 'b', weekday: 1, from: '12:00', to: '13:00' }] },
      gapThreshold: 30,
      limit: 5,
    })
    expect(blocked.candidates.every((c) => c.choice[1] === 0)).toBe(true) // lab 201 (pon 12:15) zablokowany
  })

  it('pusty wynik, gdy ograniczenia wykluczają wszystkie grupy zajęć', () => {
    const { candidates } = optimize([cwi], {
      fixed,
      settings: { ...settings, blocked: [{ id: 'b', weekday: 1, from: '00:00', to: '23:59' }] },
      gapThreshold: 30,
      limit: 5,
    })
    expect(candidates).toEqual([])
  })

  it('podgrupy o identycznych terminach nie tworzą osobnych propozycji', () => {
    // lab: 101 i 102 w tym samym czasie (obecna 102), 201 w innym dniu
    const twins = slot(
      'lab',
      1,
      option(101, at(4, '14:15', '17:00')),
      option(102, at(4, '14:15', '17:00')),
      option(201, at(2, '08:15', '11:00')),
    )
    const { candidates } = optimize([twins], { fixed: [], settings, gapThreshold: 30, limit: 10 })
    expect(candidates.map((c) => c.choice[0]).sort()).toEqual([1, 2]) // 101 odpada jako bliźniak obecnej 102
  })

  it('przy równym wyniku woli plan bliższy obecnemu', () => {
    const same = slot('s', 0, option(101, at(3, '10:15', '12:00')), option(102, at(3, '10:15', '12:00')))
    const { candidates } = optimize([same], { fixed: [], settings, gapThreshold: 30, limit: 2 })
    expect(candidates[0].choice).toEqual([0])
  })
})

describe('pora zajęć', () => {
  // Jedne ćwiczenia: rano (8:15-10:00) albo po południu (14:15-16:00), bez innych zajęć tego dnia.
  const cwi = slot('cwi', 1, option(101, at(1, '08:15', '10:00')), option(102, at(1, '14:15', '16:00')))

  it('domyślnie woli zajęcia po wybranej godzinie startu', () => {
    const { candidates } = optimize([cwi], { fixed: [], settings: DEFAULT_OPTIMIZER_SETTINGS, gapThreshold: 30, limit: 1 })
    expect(candidates[0].choice).toEqual([1])
  })

  it('"wcześniej zaczynam, wcześniej kończę" woli zajęcia rano', () => {
    const early = { ...DEFAULT_OPTIMIZER_SETTINGS, dayStyle: 'early' as const }
    const { candidates } = optimize([cwi], { fixed: [], settings: early, gapThreshold: 30, limit: 1 })
    expect(candidates[0].choice).toEqual([0])
  })

  it('w trybie porannym dokładanie dnia na uczelni nie poprawia wyniku', () => {
    // Wtorek zajęty 8:15-14:00. Lab: we wtorek 14:15-15:00 albo osobno w czwartek 8:15-10:00.
    // Średnia godzina końca wolałaby czwartek (12:00 zamiast 15:00), ale to dodatkowe 2 h rano.
    const fixed = [at(1, '08:15', '14:00')]
    const lab = slot('lab', 1, option(101, at(1, '14:15', '15:00')), option(102, at(3, '08:15', '10:00')))
    const weights = { ...settings.weights, days: 0, finish: 2 }
    const early = { ...DEFAULT_OPTIMIZER_SETTINGS, dayStyle: 'early' as const, weights }
    const { candidates } = optimize([lab], { fixed, settings: early, gapThreshold: 30, limit: 1 })
    expect(candidates[0].choice).toEqual([0])
  })
})

describe('grupy dziekańskie', () => {
  it('numer grupy dziekańskiej z numeru grupy zajęciowej', () => {
    expect(deanGroupOf(101)).toBe(1)
    expect(deanGroupOf(202)).toBe(2)
    expect(deanGroupOf(1)).toBeNull()
  })

  it('filtr dziekanki: jej grupy tam, gdzie istnieją, a gdzie indziej obecna grupa', () => {
    const lecture = slot('w', 0, option(1, at(0, '08:15', '10:00')))
    const cw = slot('c', 0, option(101, at(0, '10:15', '12:00')), option(201, at(1, '10:15', '12:00')))
    const onlyOnes = slot('x', 0, option(101, at(3, '10:15', '12:00')), option(102, at(4, '10:15', '12:00')))
    const onlyTwo = deanFilter(2)
    expect(onlyTwo(lecture, lecture.options[0])).toBe(true) // wykład bez grup dziekańskich zostaje
    expect(onlyTwo(cw, cw.options[0])).toBe(false)
    expect(onlyTwo(cw, cw.options[1])).toBe(true)
    // przedmiot bez grupy 2xx: przejście do dziekanki 2 go nie zmienia
    expect(onlyTwo(onlyOnes, onlyOnes.options[0])).toBe(true)
    expect(onlyTwo(onlyOnes, onlyOnes.options[1])).toBe(false)
  })

  it('grupa dziekańska tylko z jednego przedmiotu nie jest porównywana', () => {
    const a = slot('a', 0, option(101, at(0, '10:15', '12:00')), option(201, at(1, '10:15', '12:00')))
    const b = slot('b', 0, option(101, at(2, '10:15', '12:00')), option(201, at(3, '10:15', '12:00')))
    const c = slot('c', 0, option(101, at(4, '10:15', '12:00')), option(301, at(4, '12:15', '14:00')))
    expect(deanGroups([a, b, c])).toEqual([1, 2])
  })
})

describe('zajęcia spoza planu (WF, lektorat)', () => {
  const extra = (...options: GroupOption[]): Slot => ({ ...slot('lektorat', 0, ...options), currentIndex: null, extra: true })
  const plan = () => [
    slot('A', 0, option(1, at(0, '10:15', '12:00')), option(2, at(2, '10:15', '12:00'))),
    slot('B', 0, option(1, at(0, '08:15', '10:00'))),
  ]
  const base = { fixed: [], settings, gapThreshold: 30, limit: 5 }

  it('obecny plan dostaje najlepiej pasującą grupę bez kolizji, a jej wybór nie jest zmianą', () => {
    const slots = [...plan(), extra(option(7, at(0, '10:15', '12:00')), option(8, at(0, '12:15', '14:00')), option(9, at(3, '12:15', '14:00')))]
    const result = optimize(slots, base)
    expect(result.current?.choice).toEqual([0, 0, 1]) // gr. 7 koliduje z A, gr. 9 to nowy dzień
    expect(result.current?.changes).toBe(0)
    expect(result.currentExtraClash).toBe(false)
    expect(result.candidates[0].choice).toEqual([0, 0, 1])
  })

  it('grupa, która koliduje z obecnym planem, mieści się po zmianie innej grupy', () => {
    const slots = [...plan(), extra(option(7, at(0, '10:15', '12:00')))]
    const result = optimize(slots, base)
    expect(result.currentExtraClash).toBe(true)
    expect(result.current?.choice).toEqual([0, 0, -1]) // obecny plan bez lektoratu, a nie z kolizją
    expect(result.current?.metrics.days).toBe(1)
    expect(result.candidates[0].choice).toEqual([1, 0, 0])
    expect(result.candidates[0].changes).toBe(1)
  })

  it('grupy dziekańskie i filtr dziekanki pomijają zajęcia spoza planu', () => {
    const e = extra(option(101, at(3, '08:15', '10:00')), option(301, at(4, '08:15', '10:00')))
    expect(deanGroups([slot('C', 0, option(101), option(201)), e])).toEqual([1, 2])
    expect(deanFilter(2)(e, e.options[1])).toBe(true)
  })
})
