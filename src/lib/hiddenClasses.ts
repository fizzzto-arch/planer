// Zajęcia usunięte z planu przez użytkownika - USOS czasem pokazuje coś, czego w rzeczywistości nie ma.
// Cały przedmiot albo jeden rodzaj zajęć (np. sam wykład). Zapisane w ustawieniach (prefs.hiddenClasses),
// więc nie wracają po odświeżeniu planu; czyta je też serwer powiadomień (scripts/send-reminders.ts).
import { classTypeOf } from './usos.ts'

export interface HiddenClass {
  course: string // nazwa przedmiotu jak w planie
  type: string | null // rodzaj zajęć jak w Planerze (WYK, CWI, LEK...); null - cały przedmiot
}

export const HIDDEN_MAX = 100

export function parseHiddenClasses(raw: unknown): HiddenClass[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((h): h is Record<string, unknown> => typeof h === 'object' && h !== null && typeof h.course === 'string' && h.course !== '')
    .map((h) => ({ course: h.course as string, type: typeof h.type === 'string' && h.type ? h.type : null }))
    .slice(0, HIDDEN_MAX)
}

export function isHiddenClass(hidden: HiddenClass[], course: string, type: string): boolean {
  return hidden.some((h) => h.course === course && (h.type === null || h.type === type))
}

// Zajęcia prosto z USOS (serwer, optymalizator): lektorat to tam ćwiczenia - typ jak w Planerze.
export function isHiddenUsosClass(hidden: HiddenClass[], course: string, usosType: string): boolean {
  return isHiddenClass(hidden, course, classTypeOf(course, usosType))
}

// Dopisuje do listy. Cały przedmiot zastępuje jego pojedyncze rodzaje; rodzaj ukrytego już przedmiotu - bez zmian.
export function withHidden(hidden: HiddenClass[], entry: HiddenClass): HiddenClass[] {
  if (hidden.some((h) => h.course === entry.course && (h.type === null || h.type === entry.type))) return hidden
  const rest = entry.type === null ? hidden.filter((h) => h.course !== entry.course) : hidden
  return [...rest, entry].slice(-HIDDEN_MAX)
}

export function withoutHidden(hidden: HiddenClass[], entry: HiddenClass): HiddenClass[] {
  return hidden.filter((h) => !(h.course === entry.course && h.type === entry.type))
}
