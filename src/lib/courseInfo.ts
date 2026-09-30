// Postęp przedmiotu (ile spotkań za Tobą) i link do strony przedmiotu w USOSweb - tam jest
// reszta (literatura, treść, zasady zaliczenia), więc jej nie przepisujemy.
import { getJson, USOS_API } from './usosGroups'

export const USOSWEB_COURSE_URL = 'https://usosweb.usos.pw.edu.pl/kontroler.php?_action=katalog2/przedmioty/pokazPrzedmiot&prz_kod='

// Kod przedmiotu w USOS (np. "103A-IBxxx-ISP-PELEL") z numeru zajęć z planu.
export async function fetchCourseId(unitId: string): Promise<string> {
  const unit = await getJson<{ course_id: string }>(`${USOS_API}/courses/unit?unit_id=${encodeURIComponent(unitId)}&fields=course_id`)
  return unit.course_id
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

// Pamięć w przeglądarce: numer zajęć -> kod przedmiotu (nie zmienia się).
const CACHE_KEY = 'planer.course-ids.v1'

export function loadCachedCourseId(unitId: string): string | null {
  try {
    return (JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}') as Record<string, string>)[unitId] ?? null
  } catch {
    return null
  }
}

export function saveCachedCourseId(unitId: string, courseId: string): void {
  try {
    const all = JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}') as Record<string, string>
    all[unitId] = courseId
    localStorage.setItem(CACHE_KEY, JSON.stringify(all))
  } catch {
    // bez pamięci - pobierze się ponownie
  }
}
