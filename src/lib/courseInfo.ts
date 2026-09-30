// "O przedmiocie": kod, ECTS, jednostka, opis, literatura i kryteria oceny z publicznego API USOS PW.
// Opisy w USOS to HTML wpisany przez prowadzących - zamieniamy go na zwykły tekst (nigdy nie
// wstawiamy go do strony jako kodu). Formy zaliczenia API nie podaje - jest link do USOSweb.
import { getJson, USOS_API } from './usosGroups'

export interface CourseInfo {
  courseId: string
  code: string | null // kod wydziałowy, np. "PELEL"
  ects: number | null
  unit: string | null // jednostka realizująca, np. "Instytut Mikroelektroniki i Optoelektroniki"
  profileUrl: string // strona przedmiotu w USOSweb (regulamin, zaliczenie)
  description: string // opis treści (tekst)
  bibliography: string
  assessment: string // kryteria oceny - często puste
}

const ENTITIES: Record<string, string> = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ', oacute: 'ó', Oacute: 'Ó' }

// HTML z USOS -> tekst: akapity i punkty list zostają jako nowe linie, reszta znaczników znika.
export function usosHtmlToText(html: string | null | undefined): string {
  if (!html) return ''
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n• ')
    .replace(/<\/(p|div|li|ol|ul|h\d|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&([a-zA-Z]+);/g, (m, name) => ENTITIES[name] ?? m)
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{2,}•/g, '\n•') // punkty listy jeden pod drugim
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

interface Attribute {
  name?: { pl?: string }
  values?: ({ pl?: string } | { label?: { pl?: string } })[]
}

function attribute(list: Attribute[] | undefined, name: string): string | null {
  const found = list?.find((a) => a.name?.pl === name)
  const value = found?.values?.[0]
  const text = value && ('pl' in value ? value.pl : 'label' in value ? value.label?.pl : undefined)
  return text?.trim() || null
}

type Localized = { pl?: string } | undefined

export async function fetchCourseInfo(unitId: string): Promise<CourseInfo> {
  const unit = await getJson<{ course_id: string; term_id: string }>(
    `${USOS_API}/courses/unit?unit_id=${encodeURIComponent(unitId)}&fields=course_id|term_id`,
  )
  const id = encodeURIComponent(unit.course_id)
  const [course, edition] = await Promise.all([
    getJson<{
      ects_credits_simplified?: number | null
      description?: Localized
      bibliography?: Localized
      assessment_criteria?: Localized
      attributes?: Attribute[]
    }>(`${USOS_API}/courses/course?course_id=${id}&fields=ects_credits_simplified|description|bibliography|assessment_criteria|attributes`),
    getJson<{ profile_url?: string; attributes?: Attribute[] }>(
      `${USOS_API}/courses/course_edition?course_id=${id}&term_id=${encodeURIComponent(unit.term_id)}&fields=profile_url|attributes`,
    ),
  ])
  // "103500 - Instytut Mikroelektroniki i Optoelektroniki" -> sama nazwa.
  const unitName = attribute(edition.attributes, 'Jednostka realizująca')?.replace(/^\d+\s*-\s*/, '') ?? null
  return {
    courseId: unit.course_id,
    code: attribute(course.attributes, 'Kod wydziałowy'),
    ects: typeof course.ects_credits_simplified === 'number' ? course.ects_credits_simplified : null,
    unit: unitName,
    profileUrl:
      edition.profile_url ||
      `https://usosweb.usos.pw.edu.pl/kontroler.php?_action=katalog2/przedmioty/pokazPrzedmiot&prz_kod=${id}`,
    description: usosHtmlToText(course.description?.pl),
    bibliography: usosHtmlToText(course.bibliography?.pl),
    assessment: usosHtmlToText(course.assessment_criteria?.pl),
  }
}

// Ile spotkań każdego typu w semestrze i ile już za Tobą (z planu, bez odwołanych).
export function meetingCounts(
  meetings: { type: string; end: Date; cancelled: boolean }[],
  now: Date,
): { type: string; done: number; total: number }[] {
  const counts = new Map<string, { done: number; total: number }>()
  for (const m of meetings) {
    if (m.cancelled) continue
    const c = counts.get(m.type) ?? { done: 0, total: 0 }
    c.total++
    if (m.end <= now) c.done++
    counts.set(m.type, c)
  }
  const order = ['WYK', 'CWI', 'LAB', 'PRO', 'SEM', 'LEK', 'WF']
  const rank = (t: string) => (order.includes(t) ? order.indexOf(t) : order.length)
  return [...counts.entries()].map(([type, c]) => ({ type, ...c })).sort((a, b) => rank(a.type) - rank(b.type))
}

// Pamięć w przeglądarce - opis przedmiotu zmienia się rzadko.
const CACHE_KEY = 'planer.course-info.v1'
const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

export function loadCachedCourseInfo(unitId: string, now = Date.now()): CourseInfo | null {
  try {
    const all = JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}') as Record<string, { at: number; info: CourseInfo }>
    const hit = all[unitId]
    return hit && now - hit.at < CACHE_MAX_AGE_MS ? hit.info : null
  } catch {
    return null
  }
}

export function saveCachedCourseInfo(unitId: string, info: CourseInfo, now = Date.now()): void {
  try {
    const all = JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}') as Record<string, { at: number; info: CourseInfo }>
    all[unitId] = { at: now, info }
    localStorage.setItem(CACHE_KEY, JSON.stringify(all))
  } catch {
    // bez pamięci - pobierze się ponownie przy następnym otwarciu
  }
}
