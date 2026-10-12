// Skróty przedmiotów z kodów USOS: PW kończy kod przedmiotu jego skrótem, np. 103B-IBxxx-ISP-LAEL -> LAEL,
// 103A-IBxxx-ISP-PELEL -> PELEL. Kod pobieramy raz na przedmiot (publiczne API USOS, bez logowania)
// i pamiętamy w przeglądarce - zajęciom się nie zmienia.
import { USOS_API, getJson, runLimited } from './usosGroups'

const KEY = 'planer.courseCodes.v1'

// "103B-IBxxx-ISP-LAEL" -> "LAEL"; null - kod bez skrótu na końcu (np. "...-B2").
export function codeShort(courseId: string): string | null {
  const last = courseId.split('-').pop()?.trim().toUpperCase() ?? ''
  return /^[A-Z][A-Z0-9]{2,7}$/.test(last) ? last : null
}

// Zapamiętane kody: id zajęć (unit_id) -> kod przedmiotu.
export function loadCourseCodes(): Record<string, string> {
  try {
    const stored = JSON.parse(localStorage.getItem(KEY) ?? '{}') as unknown
    return stored && typeof stored === 'object' ? (stored as Record<string, string>) : {}
  } catch {
    return {}
  }
}

export function saveCourseCodes(codes: Record<string, string>): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(codes))
  } catch {
    // brak miejsca - kody pobiorą się przy następnym otwarciu
  }
}

// Kody przedmiotów dla zajęć; zajęcia bez odpowiedzi (np. brak internetu) po prostu pomijamy.
export async function fetchCourseCodes(unitIds: string[]): Promise<Record<string, string>> {
  const found: Record<string, string> = {}
  await runLimited(
    unitIds.map((unitId) => async () => {
      try {
        const info = await getJson<{ course_id?: unknown }>(`${USOS_API}/courses/unit?unit_id=${encodeURIComponent(unitId)}&fields=course_id`)
        if (typeof info.course_id === 'string' && info.course_id) found[unitId] = info.course_id
      } catch {
        // spróbujemy przy następnym otwarciu
      }
    }),
    () => {},
  )
  return found
}
