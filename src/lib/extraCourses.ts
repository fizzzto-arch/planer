// Zajęcia spoza planu (np. WF, lektorat): wyszukiwanie w USOS i dobór grupy, która najlepiej
// pasuje do obecnego planu - bez kolizji, z najmniejszą "karą" według kryteriów optymalizatora.
import { addDays } from './dates'
import { msg, t } from './i18n'
import { evaluate, type OptimizerSettings, type OptMeeting } from './optimizer'
import { weekIndex, type Semester } from './semesterWeek'
import type { TimetableEntry } from './timetable'
import { USOS_API, UsosError, getJson, parseUsosTime, runLimited, shortBuildingId, type GroupsProgress } from './usosGroups'

// Gdzie szukać: WF prowadzi Studium Wychowania Fizycznego i Sportu, lektoraty - Studium Języków Obcych.
export const EXTRA_SOURCES = [
  { id: 'wf', label: msg('WF (SWFiS)'), facId: '643000' },
  { id: 'lang', label: msg('Języki (SJO)'), facId: '642000' },
  { id: 'all', label: msg('Wszędzie'), facId: null },
] as const
export type ExtraSource = (typeof EXTRA_SOURCES)[number]['id']

export interface ExtraCourse {
  courseId: string
  name: string
}

export interface ExtraMeeting {
  weekday: number // 1 = poniedziałek
  start: number // minuty od północy
  end: number
}

export interface ExtraGroup {
  id: string
  courseId: string
  courseName: string
  classType: string
  groupNumber: number
  meetings: ExtraMeeting[] // stały tygodniowy rozkład grupy
  parity: 'weekly' | 'odd' | 'even'
  place: string // "Riwiera Duża · SWFiS"
}

export interface ExtraFit {
  group: ExtraGroup
  score: number // o ile pogarsza plan (mniej = lepiej, według wag optymalizatora)
  newDay: boolean // dochodzi dzień na uczelni
  gapMinutes: number // o ile zmieniają się okienka w tygodniu (średnio)
  dayEnd: number // o której kończy się dzień z tymi zajęciami
}

export interface ExtraRanking {
  fits: ExtraFit[]
  conflicts: number // grup, które kolidują z planem
}

// ---------- Przedmioty, które już są w planie ----------

// Zapisany już lektorat (albo WF) nie ma sensu drugi raz - ani w tej samej, ani w innej grupie.
// Ten sam przedmiot to ten sam kod z USOS albo ta sama nazwa (np. "Język angielski - poziom B2"
// bywa kilkoma kodami - to dalej ten sam lektorat).
export interface PlanCourses {
  ids: ReadonlySet<string>
  names: ReadonlySet<string>
}

const normalizeName = (name: string) => name.trim().toLowerCase().replace(/\s+/g, ' ')

export function planCourses(courseIds: Iterable<string>, courseNames: Iterable<string>): PlanCourses {
  return { ids: new Set(courseIds), names: new Set([...courseNames].map(normalizeName)) }
}

export function isInPlan(course: { courseId: string; name: string }, plan: PlanCourses): boolean {
  return plan.ids.has(course.courseId) || plan.names.has(normalizeName(course.name))
}

// ---------- Ocena (bez sieci) ----------

// Dwa tygodnie wzorcowe: nieparzysty i parzysty (dowolne daty, liczy się dzień tygodnia i godzina).
const refDate = (week: 0 | 1, weekday: number, minutes: number) =>
  new Date(2001, 0, 1 + week * 7 + (weekday - 1), Math.floor(minutes / 60), minutes % 60)

function inWeek(parity: 'weekly' | 'odd' | 'even', week: 0 | 1): boolean {
  return parity === 'weekly' || (parity === 'odd' ? week === 0 : week === 1)
}

const toOpt = (week: 0 | 1, m: ExtraMeeting): OptMeeting => ({
  start: refDate(week, m.weekday, m.start),
  end: refDate(week, m.weekday, m.end),
  room: null,
  building: null,
})

export function rankExtraGroups(
  groups: ExtraGroup[],
  plan: TimetableEntry[],
  settings: OptimizerSettings,
  gapThreshold: number,
): ExtraRanking {
  // Plan w dwóch tygodniach wzorcowych (zajęcia "tylko 13.11" pomijamy - to nie stały plan).
  const regular = plan.filter((e) => !e.only)
  const base = ([0, 1] as const).map((week) =>
    regular
      .filter((e) => inWeek(e.recurrence, week))
      .map((e) => ({ ...toOpt(week, e), weekday: e.weekday, startMin: e.start, endMin: e.end })),
  )
  const baseScore = ([0, 1] as const).map((w) => evaluate(base[w], settings, gapThreshold, 1))

  const fits: ExtraFit[] = []
  let conflicts = 0
  for (const group of groups) {
    const weeks = ([0, 1] as const).filter((w) => inWeek(group.parity, w))
    const clash = weeks.some((w) =>
      group.meetings.some((m) => base[w].some((b) => b.weekday === m.weekday && m.start < b.endMin && b.startMin < m.end)),
    )
    if (clash) {
      conflicts++
      continue
    }
    let score = 0
    let gaps = 0
    let newDay = false
    let dayEnd = 0
    for (const w of [0, 1] as const) {
      const added = inWeek(group.parity, w) ? group.meetings.map((m) => toOpt(w, m)) : []
      const after = evaluate([...base[w], ...added], settings, gapThreshold, 1)
      score += after.score - baseScore[w].score
      gaps += after.gapMinutes - baseScore[w].gapMinutes
      if (added.length === 0) continue
      for (const m of group.meetings) {
        const sameDay = base[w].filter((b) => b.weekday === m.weekday)
        if (sameDay.length === 0) newDay = true
        dayEnd = Math.max(dayEnd, m.end, ...sameDay.map((b) => b.endMin))
      }
    }
    fits.push({ group, score: score / 2, newDay, gapMinutes: gaps / 2, dayEnd })
  }
  fits.sort((a, b) => a.score - b.score || a.dayEnd - b.dayEnd)
  return { fits, conflicts }
}

// ---------- USOS ----------

interface SearchResult {
  items: { course_id: string; match: string }[]
  next_page: boolean
}

// USOS oddaje najwyżej 100 wyników (5 stron po 20). Słowa łączy przez "lub" i sortuje
// alfabetycznie - w SJO samych "angielski" jest ponad setka, więc "poziom B2" nie mieści się
// w wynikach. Dlatego filtrujemy sami (wszystkie słowa) i pozwalamy wkleić kod albo link.
const SEARCH_PAGES = 5

export interface CourseSearch {
  courses: ExtraCourse[]
  truncated: boolean // USOS uciął wyniki - szukanego przedmiotu może w nich nie być
}

// Kod przedmiotu z wpisanego tekstu: sam kod ("6420-EEH60-0SA-0008") albo link ze strony
// przedmiotu w USOSweb (...&prz_kod=6420-EEH60-0SA-0008&...). Null = to zwykła nazwa.
export function parseCourseRef(input: string): string | null {
  const text = input.trim()
  const fromUrl = /[?&]prz_kod=([^&#\s]+)/.exec(text)
  const code = fromUrl ? decodeURIComponent(fromUrl[1]) : text
  return /^\d{3,4}[A-Z0-9]?(-[A-Z0-9]+){2,}$/i.test(code) ? code.toUpperCase() : null
}

// Bez wielkości liter, polskich znaków i znaczników <b> z wyników USOS.
const normalize = (s: string) =>
  s
    .replace(/<\/?b>/g, '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ł/g, 'l')

// Każde wpisane słowo musi wystąpić w nazwie albo kodzie ("angielski B2" - nie pokazujemy C1).
export function matchesAllWords(query: string, ...texts: string[]): boolean {
  const hay = normalize(texts.join(' '))
  return normalize(query)
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => hay.includes(word))
}

type CourseInfo = { name: { pl: string }; terms?: { id: string }[] }

const courseUrl = (id: string) => `${USOS_API}/courses/course?course_id=${encodeURIComponent(id)}&fields=name|terms`

// Jeden przedmiot po kodzie - niezależnie od "Gdzie szukać".
async function courseByCode(code: string, termId: string): Promise<ExtraCourse> {
  let info: CourseInfo
  try {
    info = await getJson<CourseInfo>(courseUrl(code))
  } catch (e) {
    if (e instanceof UsosError && e.status >= 400 && e.status < 500) {
      throw new Error(t('Nie ma w USOS przedmiotu o kodzie {code}. Sprawdź, czy skopiował się cały.', { code }))
    }
    throw e
  }
  const name = info.name.pl.trim()
  if (!(info.terms ?? []).some((item) => item.id === termId)) {
    throw new Error(t('„{name}” nie ma zajęć w semestrze {term}.', { name, term: termId }))
  }
  return { courseId: code, name }
}

// Przedmioty pasujące do nazwy (albo kodu / linku), które mają zajęcia w danym semestrze.
export async function searchCourses(query: string, source: ExtraSource, termId: string): Promise<CourseSearch> {
  const code = parseCourseRef(query)
  if (code) return { courses: [await courseByCode(code, termId)], truncated: false }

  const facId = EXTRA_SOURCES.find((s) => s.id === source)?.facId
  const found: string[] = []
  let total = 0
  for (let page = 0; page < SEARCH_PAGES; page++) {
    const r = await getJson<SearchResult>(
      `${USOS_API}/courses/search?name=${encodeURIComponent(query)}&lang=pl&num=20&start=${page * 20}` +
        (facId ? `&fac_id=${facId}` : ''),
    )
    total += r.items.length
    found.push(...r.items.filter((i) => matchesAllWords(query, i.match, i.course_id)).map((i) => i.course_id))
    if (!r.next_page) break
  }
  // Na setnym wyniku USOS mówi "nie ma więcej", nawet gdy jest - obcięcie poznajemy po liczbie.
  const truncated = total >= SEARCH_PAGES * 20
  const details = await runLimited(
    found.map((id) => () =>
      getJson<CourseInfo>(courseUrl(id)).then((c) => ({
        courseId: id,
        name: c.name.pl.trim(),
        active: (c.terms ?? []).some((item2) => item2.id === termId),
      })),
    ),
    () => undefined,
  )
  return { courses: details.filter((d) => d.active).map(({ courseId, name }) => ({ courseId, name })), truncated }
}

// Semestr, z którego jest plan (np. "2026Z") - z pierwszych zajęć z USOS.
export async function planTermId(unitIds: string[]): Promise<string | null> {
  const unitId = unitIds[0]
  if (!unitId) return null
  const r = await getJson<{ term_id: string }>(`${USOS_API}/courses/unit?unit_id=${unitId}&fields=term_id`)
  return r.term_id ?? null
}

interface Activity {
  start_time: string
  end_time: string
  classtype_id: string
  group_number: number
  room_number?: string | null
  building_id?: string | null
}

// Tygodnie próbne: 3.-6. tydzień semestru (po pierwszym zamieszaniu, przed świętami).
export function sampleWeeks(semester: Semester): Date[] {
  return [2, 3, 4, 5].map((i) => addDays(semester.firstWeek, i * 7))
}

// Grupy wybranych przedmiotów z ich stałym rozkładem (z kilku tygodni próbnych).
export async function fetchExtraGroups(
  courses: ExtraCourse[],
  termId: string,
  semester: Semester,
  onProgress: (p: GroupsProgress) => void,
): Promise<ExtraGroup[]> {
  const weeks = sampleWeeks(semester)
  const progress = { done: 0, total: courses.length * weeks.length }
  onProgress({ ...progress })
  const tasks = courses.flatMap((course) =>
    weeks.map((week) => async () => {
      const key = `${week.getFullYear()}-${String(week.getMonth() + 1).padStart(2, '0')}-${String(week.getDate()).padStart(2, '0')}`
      const acts = await getJson<Activity[] | { message: string }>(
        `${USOS_API}/tt/course_edition?course_id=${encodeURIComponent(course.courseId)}&term_id=${termId}` +
          `&start=${key}&days=7&fields=start_time|end_time|classtype_id|group_number|room_number|building_id`,
      ).catch(() => [])
      return { course, week, acts: Array.isArray(acts) ? acts : [] }
    }),
  )
  const results = await runLimited(tasks, () => onProgress({ ...progress, done: ++progress.done }))

  const groups = new Map<string, { course: ExtraCourse; classType: string; groupNumber: number; seen: Map<string, ExtraMeeting>; weeks: Set<number>; places: string[] }>()
  for (const { course, week, acts } of results) {
    const wIdx = weekIndex(week, semester)
    for (const a of acts) {
      const id = `${course.courseId}|${a.classtype_id}|${a.group_number}`
      const g = groups.get(id) ?? { course, classType: a.classtype_id, groupNumber: a.group_number, seen: new Map<string, ExtraMeeting>(), weeks: new Set<number>(), places: [] as string[] }
      const start = parseUsosTime(a.start_time)
      const end = parseUsosTime(a.end_time)
      const m: ExtraMeeting = {
        weekday: ((start.getDay() + 6) % 7) + 1,
        start: start.getHours() * 60 + start.getMinutes(),
        end: end.getHours() * 60 + end.getMinutes(),
      }
      g.seen.set(`${m.weekday}|${m.start}|${m.end}`, m)
      g.weeks.add(wIdx)
      // Nieznany kod budynku (np. "1000-DSA") nic nie mówi - wtedy sama sala.
      const building = shortBuildingId(a.building_id)
      g.places.push([a.room_number, building !== a.building_id ? building : null].filter(Boolean).join(' · '))
      groups.set(id, g)
    }
  }

  return [...groups.entries()].map(([id, g]) => {
    const seenWeeks = [...g.weeks]
    const oddOnly = seenWeeks.every((w) => w % 2 === 1)
    const evenOnly = seenWeeks.every((w) => w % 2 === 0)
    // W 2-3 z 4 tygodni próbnych = co tydzień (jeden mógł wypaść); tylko jeden rodzaj tygodni = co 2 tygodnie.
    const parity = seenWeeks.length >= 3 || (!oddOnly && !evenOnly) ? 'weekly' : oddOnly ? 'odd' : 'even'
    const counts = new Map<string, number>()
    for (const p of g.places) counts.set(p, (counts.get(p) ?? 0) + 1)
    const place = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''
    return {
      id,
      courseId: g.course.courseId,
      courseName: g.course.name,
      classType: g.classType,
      groupNumber: g.groupNumber,
      meetings: [...g.seen.values()].sort((a, b) => a.weekday - b.weekday || a.start - b.start),
      parity,
      place,
    }
  })
}
