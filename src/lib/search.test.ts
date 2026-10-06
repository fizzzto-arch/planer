import { describe, expect, it } from 'vitest'
import { fold, highlight, searchItems, snippetAround, type SearchItem } from './search'
import { buildSearchIndex, type SearchAction, type SearchSources } from './searchIndex'
import type { PlanMeeting } from './edits'

const item = (id: string, title: string, fields: [string | null, string][] = [], group: SearchItem<null>['group'] = 'courses'): SearchItem<null> => ({
  id,
  group,
  title,
  fields: fields.map(([label, value]) => ({ label, value })),
  action: null,
})

describe('wyszukiwanie', () => {
  it('bez polskich znaków i wielkości liter, ta sama długość', () => {
    expect(fold('Łódź, Żółć ĄĘ')).toBe('lodz, zolc ae')
    expect(fold('Łódź').length).toBe('Łódź'.length)
  })

  it('każde słowo musi pasować - także w różnych polach', () => {
    const items = [
      item('rad', 'Radiologia', [['Zaliczenie', 'egzamin – test, 30 pkt']]),
      item('auto', 'Podstawy automatyki', [['Zaliczenie', 'egzamin pisemny']]),
    ]
    expect(searchItems(items, 'radiologia egzamin')[0].hits.map((h) => h.item.id)).toEqual(['rad'])
    expect(searchItems(items, 'radiologia projekt')).toEqual([])
    expect(searchItems(items, '   ')).toEqual([])
  })

  it('kolejność: początek tytułu, początek słowa w tytule, potem inne pola', () => {
    const items = [
      item('note', 'Grafika komputerowa', [['Notatka', 'zapytać o radio']]),
      item('mid', 'Podstawy radiologii'),
      item('start', 'Radiologia'),
    ]
    expect(searchItems(items, 'radio')[0].hits.map((h) => h.item.id)).toEqual(['start', 'mid', 'note'])
  })

  it('fragment pokazuje pole, które pasuje (z etykietą)', () => {
    const [group] = searchItems([item('auto', 'Podstawy automatyki', [['Koordynator', 'Alicja Siewnicka']])], 'siewnicka')
    expect(group.hits[0].snippet).toEqual({ label: 'Koordynator', text: 'Alicja Siewnicka' })
    // Dopasowanie w tytule - bez fragmentu.
    expect(searchItems([item('auto', 'Podstawy automatyki')], 'auto')[0].hits[0].snippet).toBeNull()
  })

  it('długi tekst - fragment wokół dopasowania', () => {
    const text = `${'a'.repeat(80)} szukane słowo ${'b'.repeat(80)}`
    const out = snippetAround(text, 'szukane')
    expect(out.startsWith('…')).toBe(true)
    expect(out.endsWith('…')).toBe(true)
    expect(out).toContain('szukane słowo')
  })

  it('podświetlenie w tytule bez polskich znaków w zapytaniu', () => {
    expect(highlight('Łódź Kaliska', 'lodz')).toEqual([
      ['Łódź', true],
      [' Kaliska', false],
    ])
  })
})

describe('co da się znaleźć', () => {
  const at = (day: number, hour: number) => new Date(2026, 9, day, hour, 15)
  const meeting = (id: string, courseName: string, day: number, over: Partial<PlanMeeting> = {}): PlanMeeting => ({
    id,
    courseName,
    type: 'WYK',
    start: at(day, 10),
    end: at(day, 12),
    room: '170',
    building: 'Budynek Wydziału Elektroniki i Technik Informacyjnych',
    address: null,
    groupNumber: 1,
    unitId: 'U1',
    usosUrl: null,
    cancelled: false,
    edited: false,
    custom: false,
    note: '',
    original: null,
    ...over,
  })
  const sources = (over: Partial<SearchSources> = {}): SearchSources => ({
    now: at(14, 9),
    meetings: [meeting('a', 'Radiologia', 16), meeting('b', 'Radiologia', 23, { note: 'przynieść dozymetr' }), meeting('c', 'Grafika komputerowa', 15, { room: '118' })],
    displayName: (name) => name,
    deadlines: [{ id: 'd1', courseName: 'Radiologia', kind: 'egzamin', title: 'Egzamin', date: '2027-02-03', time: '09:00', note: '', done: false }],
    courseExtras: [{ name: 'Radiologia', note: 'sala 014 na laborkach', links: [{ id: 'l1', title: 'Skrypt Golnik', url: 'https://example.pw.edu.pl/rad.pdf' }] }],
    generalNote: 'przenieść się z grupy 101',
    materials: [],
    staff: new Map([['Radiologia', { coordinators: [{ id: '1', name: 'Piotr Tulik' }], groups: [] }]]),
    assessment: null,
    program: null,
    features: { signedIn: true, canOptimize: false, hasProgram: false },
    ...over,
  })
  const find = (query: string, over?: Partial<SearchSources>) =>
    searchItems(buildSearchIndex(sources(over)), query).flatMap((g) => g.hits.map((h) => ({ group: g.group, title: h.item.title, action: h.item.action as SearchAction, snippet: h.snippet })))

  it('przedmiot po koordynatorze i notatce, z fragmentem', () => {
    expect(find('tulik')[0]).toMatchObject({ group: 'courses', title: 'Radiologia', snippet: { label: 'Koordynator', text: 'Piotr Tulik' } })
    expect(find('laborkach')[0]).toMatchObject({ group: 'courses', title: 'Radiologia', snippet: { label: 'Notatka' } })
  })

  it('sala: najbliższe zajęcia w niej', () => {
    const [room] = find('118')
    expect(room).toMatchObject({ group: 'rooms', title: 'Sala 118 · EiTI', action: { type: 'course', name: 'Grafika komputerowa' } })
  })

  it('termin, notatka do zajęć, notatka ogólna, link', () => {
    expect(find('egzamin').some((r) => r.group === 'deadlines' && r.title === 'Egzamin')).toBe(true)
    expect(find('dozymetr')[0]).toMatchObject({ group: 'notes', action: { type: 'course', name: 'Radiologia' } })
    expect(find('grupy 101')[0]).toMatchObject({ group: 'notes', action: { type: 'view', view: 'courses' } })
    expect(find('golnik')[0]).toMatchObject({ group: 'materials', title: 'Skrypt Golnik' })
  })

  it('ustawienia po hasłach (także angielskich), tylko dostępne', () => {
    expect(find('ciemny')[0]).toMatchObject({ group: 'settings', title: 'Wygląd', action: { type: 'settings', anchor: 'settings-appearance' } })
    expect(find('dark mode')[0]).toMatchObject({ title: 'Wygląd' })
    expect(find('kolory')[0]).toMatchObject({ action: { type: 'settings', anchor: 'settings-colors' } })
    // Bez konta - nie ma kopii zapasowej ani zmiany hasła; optymalizator tylko z dostępem.
    expect(find('backup', { features: { signedIn: false, canOptimize: false, hasProgram: false } })).toEqual([])
    expect(find('optymalizator')).toEqual([])
    expect(find('optymalizator', { features: { signedIn: true, canOptimize: true, hasProgram: false } })[0]).toMatchObject({ action: { type: 'optimizer' } })
  })
})

describe('wyszukiwanie: pola ukryte', () => {
  it('pasują, ale nie pokazują fragmentu (np. hasła ustawień)', () => {
    const settings: SearchItem<null> = {
      id: 's',
      group: 'settings',
      title: 'Język',
      fields: [{ label: null, value: 'język angielski english language', hidden: true }],
      action: null,
    }
    const [group] = searchItems([settings], 'english')
    expect(group.hits[0].snippet).toBeNull()
  })
})
