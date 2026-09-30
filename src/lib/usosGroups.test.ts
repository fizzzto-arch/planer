import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Meeting } from './usos'
import { CACHE_MAX_AGE_MS, fetchSlots, groupsCacheMaxAge, parseUsosTime, shortBuildingId } from './usosGroups'

const meeting = (id: string, start: Date, over: Partial<Meeting> = {}): Meeting => ({
  id,
  courseName: 'Radiologia',
  type: 'LAB',
  start,
  end: new Date(start.getTime() + 2.75 * 3600_000),
  room: '042',
  building: 'Mechatronika',
  address: null,
  groupNumber: 201,
  unitId: 'U1',
  usosUrl: null,
  cancelled: false,
  ...over,
})

// Laboratorium co tydzień w poniedziałki od 5.10 do 23.11.2026.
const plan = Array.from({ length: 8 }, (_, i) => meeting(`m${i}`, new Date(2026, 9, 5 + i * 7, 15, 15)))

describe('pamięć planów grup', () => {
  it('na początku semestru dane ważne dobę, potem tydzień', () => {
    const DAY = 24 * 3600_000
    expect(groupsCacheMaxAge(plan, new Date(2026, 8, 20))).toBe(DAY) // 2 tygodnie przed startem
    expect(groupsCacheMaxAge(plan, new Date(2026, 9, 7))).toBe(DAY) // 1. tydzień
    expect(groupsCacheMaxAge(plan, new Date(2026, 9, 21))).toBe(DAY) // 3. tydzień
    expect(groupsCacheMaxAge(plan, new Date(2026, 9, 28))).toBe(CACHE_MAX_AGE_MS) // 4. tydzień
    expect(groupsCacheMaxAge(plan, new Date(2026, 7, 1))).toBe(CACHE_MAX_AGE_MS) // wakacje
    expect(groupsCacheMaxAge([], new Date(2026, 9, 7))).toBe(CACHE_MAX_AGE_MS)
  })
})

describe('odpowiedzi USOS', () => {
  it('czas warszawski i skróty budynków', () => {
    expect(parseUsosTime('2026-10-26 08:15:00')).toEqual(new Date(2026, 9, 26, 8, 15))
    expect(shortBuildingId('1030-ETI')).toBe('EiTI')
    expect(shortBuildingId('1040-MCH')).toBe('Mechatronika')
    expect(shortBuildingId(null)).toBeNull()
  })
})

describe('plany grup z USOS', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('grupy przedmiotu z kolejnych tygodni: bez duplikatów, obecna grupa zaznaczona', async () => {
    // Grupa 201 (obecna) w poniedziałki, 202 we wtorki. Ten sam termin może przyjść dwa razy -
    // w Planerze ma być raz.
    const activity = (group: number, day: number, month = 9) => ({
      start_time: `2026-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')} 15:15:00`,
      end_time: `2026-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')} 18:00:00`,
      classtype_id: 'LAB',
      group_number: group,
      unit_id: 'U1',
      room_number: '042',
      building_id: '1040-MCH',
    })
    const fetchMock = vi.fn(async (url: string) => {
      const body = url.includes('/courses/unit')
        ? { course_id: 'RAD', term_id: '2026Z', classtype_id: 'LAB' }
        : url.includes('start=2026-10-05')
          ? [activity(201, 5), activity(202, 6), activity(201, 5)] // duplikat w jednej odpowiedzi
          : url.includes('start=2026-10-12')
            ? [activity(201, 12), activity(202, 13)]
            : []
      return new Response(JSON.stringify(body), { status: 200 })
    })
    vi.stubGlobal('fetch', fetchMock)

    const slots = await fetchSlots(plan, () => {})
    expect(slots).toHaveLength(1)
    const [slot] = slots
    expect(slot).toMatchObject({ id: 'RAD|LAB', courseName: 'Radiologia', classType: 'LAB' })
    expect(slot.options.map((o) => o.groupNumber)).toEqual([201, 202])
    expect(slot.options[slot.currentIndex!].groupNumber).toBe(201)
    expect(slot.options[0].meetings.map((m) => m.start.getDate())).toEqual([5, 12]) // bez duplikatu
    expect(slot.options[0].meetings[0]).toMatchObject({ room: '042', building: 'Mechatronika' })
    // Plany grup: jedno zapytanie na każdy tydzień planu (8 tygodni).
    expect(fetchMock.mock.calls.filter(([u]) => String(u).includes('tt/course_edition'))).toHaveLength(8)
  })

  it('USOS niedostępny - czytelny komunikat', async () => {
    vi.stubGlobal('fetch', async () => new Response('', { status: 503 }))
    await expect(fetchSlots(plan, () => {})).rejects.toThrow('USOS odpowiedział błędem 503.')
    vi.stubGlobal('fetch', async () => {
      throw new TypeError('Failed to fetch')
    })
    await expect(fetchSlots(plan, () => {})).rejects.toThrow('Brak połączenia z USOS')
  })
})
