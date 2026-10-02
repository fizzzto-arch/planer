import { afterEach, describe, expect, it, vi } from 'vitest'
import { matchesAllWords, parseCourseRef, rankExtraGroups, searchCourses, type ExtraGroup } from './extraCourses'
import { DEFAULT_OPTIMIZER_SETTINGS } from './optimizer'
import type { TimetableEntry } from './timetable'

const h = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))
const entry = (weekday: number, from: string, to: string, over: Partial<TimetableEntry> = {}): TimetableEntry => ({
  id: `${weekday}-${from}`,
  weekday,
  start: h(from),
  end: h(to),
  courseName: 'Analiza',
  type: 'WYK',
  groupNumber: 1,
  room: null,
  building: null,
  recurrence: 'weekly',
  range: null,
  only: null,
  date: null,
  ...over,
})
const group = (n: number, weekday: number, from: string, to: string, parity: ExtraGroup['parity'] = 'weekly'): ExtraGroup => ({
  id: `wf-${n}`,
  courseId: 'WF',
  courseName: 'Wychowanie fizyczne - Siatkówka',
  classType: 'FIZ',
  groupNumber: n,
  meetings: [{ weekday, start: h(from), end: h(to) }],
  parity,
  place: 'Riwiera',
})

describe('dobór grupy spoza planu (np. WF)', () => {
  // Poniedziałek 8:15-12:00, wtorek 10:15-14:00 w tygodnie nieparzyste; środa wolna.
  const plan = [entry(1, '08:15', '10:00'), entry(1, '10:15', '12:00'), entry(2, '10:15', '14:00', { recurrence: 'odd' })]
  const settings = { ...DEFAULT_OPTIMIZER_SETTINGS, weights: { gaps: 3, days: 2, early: 0, late: 0, finish: 0 } }

  it('najlepsza grupa dokleja się do zajęć bez okienka i bez nowego dnia', () => {
    const { fits } = rankExtraGroups(
      [group(1, 3, '10:00', '11:30'), group(2, 1, '12:15', '13:45'), group(3, 1, '16:00', '17:30')],
      plan,
      settings,
      30,
    )
    // Przy wagach okienka 3 / dni 2 cztery godziny okienka są gorsze niż dodatkowy dzień.
    expect(fits.map((f) => f.group.groupNumber)).toEqual([2, 1, 3])
    expect(fits[0]).toMatchObject({ newDay: false, gapMinutes: 0, dayEnd: h('13:45') })
    expect(fits[1].newDay).toBe(true)
    expect(fits[2].gapMinutes).toBe(240) // 12:00-16:00
  })

  it('odrzuca grupy kolidujące z planem, z uwzględnieniem parzystości', () => {
    const r = rankExtraGroups(
      [group(1, 1, '09:00', '10:30'), group(2, 2, '11:00', '12:30', 'odd'), group(3, 2, '11:00', '12:30', 'even')],
      plan,
      settings,
      30,
    )
    expect(r.conflicts).toBe(2) // poniedziałek w trakcie wykładu; wtorek nieparzysty
    expect(r.fits.map((f) => f.group.groupNumber)).toEqual([3]) // wtorek parzysty jest wolny
  })
})

describe('szukanie przedmiotu spoza planu', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('kod albo link z USOSweb zamiast nazwy', () => {
    expect(parseCourseRef('6420-EEH60-0SA-0008')).toBe('6420-EEH60-0SA-0008')
    expect(parseCourseRef(' 6420-eeh60-0sa-0008 ')).toBe('6420-EEH60-0SA-0008')
    expect(parseCourseRef('1160-TR000-IZP-2JA')).toBe('1160-TR000-IZP-2JA')
    expect(
      parseCourseRef(
        'https://usosweb.usos.pw.edu.pl/kontroler.php?_action=katalog2/przedmioty/pokazPlanZajecPrzedmiotu&prz_kod=6420-EEH60-0SA-0008&cdyd_kod=2026Z',
      ),
    ).toBe('6420-EEH60-0SA-0008')
    expect(parseCourseRef('angielski B2')).toBeNull()
    expect(parseCourseRef('siatkówka')).toBeNull()
  })

  it('wszystkie słowa muszą pasować - bez polskich znaków i wielkości liter', () => {
    expect(matchesAllWords('angielski B2', 'Język <b>angielski</b> - egzamin: poziom <b>B2</b>')).toBe(true)
    expect(matchesAllWords('angielski B2', 'Język <b>angielski</b> - Cuda Inżynierii - poziom C1')).toBe(false)
    expect(matchesAllWords('jezyk niemiecki', 'Język niemiecki - poziom A1')).toBe(true)
    expect(matchesAllWords('siatkowka', 'Wychowanie fizyczne - Siatkówka')).toBe(true)
    expect(matchesAllWords('EEH60', 'Język angielski - poziom B2', '6420-EEH60-0SA-0008')).toBe(true)
  })

  it('wyniki USOS: filtr słów, tylko ten semestr, znacznik obcięcia na 100 wynikach', async () => {
    const items = (page: number) =>
      Array.from({ length: 20 }, (_, i) => ({
        course_id: `6420-P${page}-0SA-${i}`,
        match: i === 0 ? 'Język <b>angielski</b> - poziom <b>B2</b>' : 'Język <b>angielski</b> - poziom C1',
      }))
    vi.stubGlobal('fetch', async (url: string) => {
      const u = new URL(url)
      if (u.pathname.endsWith('/courses/search')) {
        const page = Number(u.searchParams.get('start')) / 20
        // Jak USOS: przy setnym wyniku next_page = false, choć wyników jest więcej.
        return Response.json({ items: items(page), next_page: page < 4 })
      }
      const id = u.searchParams.get('course_id')!
      return Response.json({ name: { pl: 'Język angielski - poziom B2 ' }, terms: [{ id: id.includes('P1') ? '2025Z' : '2026Z' }] })
    })
    const r = await searchCourses('angielski B2', 'lang', '2026Z')
    // 5 stron, na każdej 1 pasujący; ze strony 1 przedmiot bez zajęć w 2026Z.
    expect(r.courses.map((c) => c.courseId)).toEqual(['6420-P0-0SA-0', '6420-P2-0SA-0', '6420-P3-0SA-0', '6420-P4-0SA-0'])
    expect(r.courses[0].name).toBe('Język angielski - poziom B2')
    expect(r.truncated).toBe(true)
  })

  it('po kodzie: jedno zapytanie, czytelne błędy', async () => {
    vi.stubGlobal('fetch', async (url: string) =>
      url.includes('XXXXX')
        ? new Response('{}', { status: 400 })
        : Response.json({ name: { pl: 'Język angielski - poziom B2' }, terms: [{ id: '2025L' }] }),
    )
    await expect(searchCourses('6420-XXXXX-0SA-0000', 'lang', '2026Z')).rejects.toThrow('Nie ma w USOS przedmiotu o kodzie')
    await expect(searchCourses('6420-EEH60-0SA-0008', 'lang', '2026Z')).rejects.toThrow(
      '„Język angielski - poziom B2” nie ma zajęć w semestrze 2026Z.',
    )
  })
})

describe('przedmioty, które już są w planie', () => {
  it('ten sam kod albo ta sama nazwa (bez względu na wielkość liter i spacje) - już w planie', async () => {
    const { isInPlan, planCourses } = await import('./extraCourses')
    const plan = planCourses(['6420-EEH60-0SA-0008'], ['Język angielski - poziom B2', 'Analiza matematyczna'])
    expect(isInPlan({ courseId: '6420-EEH60-0SA-0008', name: 'cokolwiek' }, plan)).toBe(true)
    expect(isInPlan({ courseId: '6420-INNY-KOD', name: '  język angielski -  poziom B2 ' }, plan)).toBe(true)
    expect(isInPlan({ courseId: '6420-NIEM-A1', name: 'Język niemiecki - poziom A1' }, plan)).toBe(false)
  })
})
