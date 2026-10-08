// Własne dodatki użytkownika do planu, przechowywane na koncie (Firestore: users/{uid}/...).
import { msg, tk } from './i18n'
import {
  optDate,
  optStr,
  optTime,
  str,
  type CustomMeeting,
  type MeetingEdit,
  type Raw,
  type SeriesEdit,
} from './planEdits'
import type { OptimizerSettings } from './optimizer'
import type { Prefs } from './prefs'
import type { CourseScores, Grade } from './scoring'
import type { TypeColors } from './typeColors'

export type DeadlineKind = 'kolokwium' | 'egzamin' | 'projekt' | 'inne'

export const DEADLINE_KINDS: { id: DeadlineKind; label: string }[] = [
  { id: 'kolokwium', label: msg('Kolokwium') },
  { id: 'egzamin', label: msg('Egzamin') },
  { id: 'projekt', label: msg('Projekt') },
  { id: 'inne', label: msg('Inne') },
]

export function deadlineKindLabel(kind: DeadlineKind): string {
  return tk(DEADLINE_KINDS.find((k) => k.id === kind)?.label ?? 'Inne')
}

export interface Deadline {
  id: string
  courseName: string | null
  kind: DeadlineKind
  title: string
  date: string // "YYYY-MM-DD"
  time: string | null // "HH:MM"
  note: string
  done: boolean
  checklist?: ChecklistItem[] // "do przygotowania" (np. rozdziały na kolokwium)
}

export interface ChecklistItem {
  text: string
  done: boolean
}

export const CHECKLIST_MAX = 30

function parseChecklist(raw: unknown): ChecklistItem[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((i): i is { text: string; done?: unknown } => typeof i === 'object' && i !== null && typeof i.text === 'string')
    .map((i) => ({ text: i.text.slice(0, 200), done: i.done === true }))
    .filter((i) => i.text.trim())
    .slice(0, CHECKLIST_MAX)
}

export interface CourseLink {
  id: string
  title: string
  url: string
}

export interface CourseExtra {
  name: string
  note: string
  links: CourseLink[]
}

export {
  isEmptySeriesEdit,
  parseCustomMeeting,
  parseMeetingEdit,
  parsePlanEdits,
  parseSeriesEdit,
  seriesKey,
  type CustomMeeting,
  type MeetingEdit,
  type MeetingOverride,
  type PlanEdits,
  type SeriesEdit,
} from './planEdits'

export interface Extras {
  courses: Map<string, CourseExtra> // klucz: courseKey
  deadlines: Deadline[]
  meetingEdits: Map<string, MeetingEdit>
  seriesEdits: Map<string, SeriesEdit>
  customMeetings: CustomMeeting[]
  typeColors: TypeColors // własne kolory typów zajęć (puste = domyślne jak w USOS)
  prefs: Prefs | null // ustawienia zapisane na koncie; null = jeszcze nie zapisane
  optimizer: OptimizerSettings | null // ustawienia "Dobierz grupy"; null = jeszcze nie zapisane
  testerTasks: string[] // zadania dla testerów oznaczone jako zrobione (lib/testerTasks.ts)
  scores: Map<string, CourseScores> // punkty z zaliczeń; klucz: courseKey
  grades: Map<string, Grade> // oceny końcowe; klucz: nazwa przedmiotu w programie studiów
}

export const EMPTY_EXTRAS: Extras = {
  courses: new Map(),
  deadlines: [],
  meetingEdits: new Map(),
  seriesEdits: new Map(),
  customMeetings: [],
  typeColors: {},
  prefs: null,
  optimizer: null,
  testerTasks: [],
  scores: new Map(),
  grades: new Map(),
}

// Czy jest jakakolwiek notatka (przedmiotu, ogólna albo do zajęć) - wtedy notatki są włączone,
// dopóki ktoś sam ich nie wyłączy (prefs.notes), żeby nie zniknęły mu sprzed tej opcji.
export function hasNotes(extras: Pick<Extras, 'courses' | 'meetingEdits'>): boolean {
  for (const course of extras.courses.values()) if (course.note.trim()) return true
  for (const edit of extras.meetingEdits.values()) if (edit.note.trim()) return true
  return false
}

export const notesEnabled = (setting: boolean | null, extras: Pick<Extras, 'courses' | 'meetingEdits'>) =>
  setting ?? hasNotes(extras)

// Id dokumentu Firestore nie może zawierać "/", więc kodujemy nazwę.
// Notatka ogólna (niezwiązana z przedmiotem) - zapisana jak notatka "przedmiotu" o tej nazwie,
// więc synchronizacja, kopia zapasowa i usuwanie konta obejmują ją bez zmian w bazie.
export const GENERAL_NOTE = '__planer_notatki_ogolne__'

export function courseKey(courseName: string): string {
  return encodeURIComponent(courseName.trim())
}

export function isSafeUrl(url: string): boolean {
  return /^https?:\/\/\S+$/i.test(url.trim())
}

// ---------- Odczyt dokumentów z chmury (dane mogą być niekompletne) ----------

export function parseDeadline(id: string, raw: Raw): Deadline | null {
  const date = optDate(raw.date)
  if (!date) return null
  const kind = DEADLINE_KINDS.some((k) => k.id === raw.kind) ? (raw.kind as DeadlineKind) : 'inne'
  return {
    id,
    courseName: optStr(raw.courseName),
    kind,
    title: str(raw.title),
    date,
    time: optTime(raw.time),
    note: str(raw.note),
    done: raw.done === true,
    checklist: parseChecklist(raw.checklist),
  }
}

export function parseCourse(raw: Raw): CourseExtra | null {
  const name = optStr(raw.name)
  if (!name) return null
  const links = Array.isArray(raw.links) ? raw.links : []
  return {
    name,
    note: str(raw.note),
    links: links
      .filter((l): l is Raw => typeof l === 'object' && l !== null)
      .map((l) => ({ id: str(l.id), title: str(l.title), url: str(l.url) }))
      .filter((l) => l.id && isSafeUrl(l.url)),
  }
}
