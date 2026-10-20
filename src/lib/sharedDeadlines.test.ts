import { describe, expect, it } from 'vitest'
import { courseKey, type Deadline } from './extras'
import {
  parseSharedDeadline,
  sharedByOther,
  sharedFromDeadline,
  sharedSuggestions,
  withDismissed,
  type SharedDeadline,
} from './sharedDeadlines'

const shared = (id: string, over: Partial<SharedDeadline> = {}): SharedDeadline => ({
  id,
  courseKey: courseKey('Analiza matematyczna'),
  courseName: 'Analiza matematyczna',
  kind: 'kolokwium',
  title: 'Kolokwium 1',
  date: '2026-10-28',
  time: '10:15',
  sharedBy: 'ala',
  sharedByName: 'ala',
  ...over,
})

const own = (over: Partial<Deadline> = {}): Deadline => ({
  id: 'mine',
  courseName: 'Analiza matematyczna',
  kind: 'kolokwium',
  title: '',
  date: '2026-10-28',
  time: '10:15',
  note: '',
  done: false,
  ...over,
})

const opts = (over: Partial<Parameters<typeof sharedSuggestions>[1]> = {}) => ({
  courseKeys: new Set([courseKey('Analiza matematyczna'), courseKey('Fizyka')]),
  own: [] as Deadline[],
  uid: 'me',
  dismissed: [] as string[],
  today: '2026-10-20',
  ...over,
})

describe('wspólne terminy', () => {
  it('propozycja: termin z mojego przedmiotu, którego jeszcze nie mam', () => {
    const list = [shared('s1'), shared('s2', { courseKey: courseKey('Chemia'), courseName: 'Chemia' })]
    expect(sharedSuggestions(list, opts()).map((s) => [s.kind, s.shared.id])).toEqual([['new', 's1']])
  })

  it('bez propozycji: mam już ten termin, sam go pokazałem, ukryłem albo już minął', () => {
    expect(sharedSuggestions([shared('s1')], opts({ own: [own()] }))).toEqual([])
    expect(sharedSuggestions([shared('s1', { sharedBy: 'me' })], opts())).toEqual([])
    expect(sharedSuggestions([shared('s1')], opts({ dismissed: ['s1'] }))).toEqual([])
    expect(sharedSuggestions([shared('s1', { date: '2026-10-19' })], opts())).toEqual([])
  })

  it('ten sam termin od kilku osób - jedna propozycja', () => {
    const list = [shared('s1'), shared('s2', { sharedBy: 'ola', sharedByName: 'ola' }), shared('s3', { time: '12:15' })]
    const result = sharedSuggestions(list, opts())
    expect(result.map((s) => s.shared.id)).toEqual(['s1', 's3'])
    expect(result[0]).toMatchObject({ kind: 'new', others: 1 })
  })

  it('autor przesunął termin, który już mam - propozycja aktualizacji (ukrycie dotyczy tej jednej zmiany)', () => {
    const adopted = own({ fromShared: 's1', date: '2026-10-28' })
    const moved = shared('s1', { date: '2026-10-30' })
    const result = sharedSuggestions([moved], opts({ own: [adopted] }))
    expect(result).toMatchObject([{ kind: 'changed', own: { id: 'mine' }, dismissKey: 's1@2026-10-30T10:15' }])
    expect(sharedSuggestions([moved], opts({ own: [adopted], dismissed: ['s1@2026-10-30T10:15'] }))).toEqual([])
    // Bez zmiany - nic.
    expect(sharedSuggestions([shared('s1')], opts({ own: [adopted] }))).toEqual([])
  })

  it('pokazanie: bez notatki; drugi raz ten sam termin od innej osoby - nie', () => {
    const data = sharedFromDeadline({ ...own(), note: 'tajna notatka' }, 'me', 'jan')
    expect(data).toEqual({
      courseKey: courseKey('Analiza matematyczna'),
      courseName: 'Analiza matematyczna',
      kind: 'kolokwium',
      title: '',
      date: '2026-10-28',
      time: '10:15',
      sharedBy: 'me',
      sharedByName: 'jan',
    })
    expect(sharedFromDeadline({ ...own(), courseName: null }, 'me', 'jan')).toBeNull()
    expect(sharedByOther([shared('s1')], own(), 'me')?.id).toBe('s1')
    expect(sharedByOther([shared('s1', { sharedBy: 'me' })], own(), 'me')).toBeNull()
  })

  it('odczyt pomija złe dane; lista ukrytych nie rośnie bez końca', () => {
    expect(parseSharedDeadline('x', { courseName: 'Fizyka', date: 'jutro', sharedBy: 'a' })).toBeNull()
    expect(parseSharedDeadline('x', { courseName: 'Fizyka', date: '2026-11-02', time: '25:99:00', sharedBy: 'a', kind: 'zły' })).toMatchObject({
      kind: 'inne',
      time: null,
    })
    const many = Array.from({ length: 250 }, (_, i) => `k${i}`).reduce(withDismissed, [] as string[])
    expect(many).toHaveLength(200)
    expect(many.at(-1)).toBe('k249')
  })
})
