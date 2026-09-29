// Przypomnienia o terminach: kiedy je wysłać i co w nich napisać.
// Plik bez importów - używa go też skrypt wysyłający (scripts/send-reminders.ts), uruchamiany w Node.

export type ReminderKind = 'week' | 'day' | 'morning' | 'hour'

export const REMINDER_KINDS: { id: ReminderKind; label: string; hint: string }[] = [
  { id: 'week', label: 'Tydzień wcześniej', hint: 'o 18:00' },
  { id: 'day', label: 'Dzień wcześniej', hint: 'o 18:00' },
  { id: 'morning', label: 'Rano w dniu terminu', hint: 'o 7:30' },
  { id: 'hour', label: 'Godzinę przed', hint: 'tylko terminy z godziną' },
]

export const DEFAULT_REMINDERS: ReminderKind[] = ['week', 'day']

export function parseReminderKinds(raw: unknown): ReminderKind[] {
  if (!Array.isArray(raw)) return DEFAULT_REMINDERS
  return REMINDER_KINDS.map((k) => k.id).filter((id) => raw.includes(id))
}

// Tyle, ile potrzeba do przypomnienia (dane z Firestore sprawdza parseReminderDeadline).
export interface ReminderDeadline {
  id: string
  courseName: string | null
  kind: string
  title: string
  date: string // "YYYY-MM-DD"
  time: string | null // "HH:MM"
  done: boolean
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^\d{2}:\d{2}$/

export function parseReminderDeadline(id: string, raw: Record<string, unknown>): ReminderDeadline | null {
  if (typeof raw.date !== 'string' || !DATE_RE.test(raw.date)) return null
  return {
    id,
    courseName: typeof raw.courseName === 'string' && raw.courseName ? raw.courseName : null,
    kind: typeof raw.kind === 'string' ? raw.kind : 'inne',
    title: typeof raw.title === 'string' ? raw.title : '',
    date: raw.date,
    time: typeof raw.time === 'string' && TIME_RE.test(raw.time) ? raw.time : null,
    done: raw.done === true,
  }
}

// Czas lokalny (strefa procesu - skrypt działa z TZ=Europe/Warsaw).
function localDate(date: string, time: string): Date {
  const [y, m, d] = date.split('-').map(Number)
  const [h, min] = time.split(':').map(Number)
  return new Date(y, m - 1, d, h, min)
}

// Chwila terminu: z godziną - ta godzina, bez godziny - koniec dnia.
export function deadlineMoment(d: ReminderDeadline): Date {
  return d.time ? localDate(d.date, d.time) : localDate(d.date, '23:59')
}

// Kiedy wysłać przypomnienie danego rodzaju (null = nie dotyczy tego terminu).
export function reminderTime(d: ReminderDeadline, kind: ReminderKind): Date | null {
  const day = localDate(d.date, '00:00')
  const at = (daysBefore: number, time: string) => {
    const t = new Date(day)
    t.setDate(t.getDate() - daysBefore)
    const [h, m] = time.split(':').map(Number)
    t.setHours(h, m, 0, 0)
    return t
  }
  switch (kind) {
    case 'week':
      return at(7, '18:00')
    case 'day':
      return at(1, '18:00')
    case 'morning':
      return at(0, '07:30')
    case 'hour':
      return d.time ? new Date(localDate(d.date, d.time).getTime() - 60 * 60 * 1000) : null
  }
}

export interface DueReminder {
  deadline: ReminderDeadline
  kind: ReminderKind
  at: Date
}

// Przypomnienia do wysłania teraz: ich czas minął w ostatnim oknie (skrypt bywa opóźniony
// albo pominięty), a sam termin jeszcze nie. Termin dodany albo zmieniony po czasie
// przypomnienia go nie dostaje (dodajesz jutrzejsze kolokwium o 20:00 - bez "jutro kolokwium").
export function dueReminders(
  deadlines: { deadline: ReminderDeadline; updatedAt: Date | null }[],
  kinds: ReminderKind[],
  now: Date,
  lookbackMs: number,
): DueReminder[] {
  const due: DueReminder[] = []
  for (const { deadline, updatedAt } of deadlines) {
    if (deadline.done || deadlineMoment(deadline) <= now) continue
    for (const kind of kinds) {
      const at = reminderTime(deadline, kind)
      if (!at || at > now || at.getTime() <= now.getTime() - lookbackMs) continue
      if (updatedAt && updatedAt > at) continue
      due.push({ deadline, kind, at })
    }
  }
  return due
}

const KIND_LABELS: Record<string, string> = {
  kolokwium: 'Kolokwium',
  egzamin: 'Egzamin',
  projekt: 'Projekt',
  inne: 'Termin',
}

const WEEKDAYS = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota']

// Treść powiadomienia, np. "Kolokwium · Grafika" / "Jutro o 10:15 - rozdziały 1-3".
export function reminderText(
  { deadline, kind }: Pick<DueReminder, 'deadline' | 'kind'>,
  courseLabel: (name: string) => string,
): { title: string; body: string } {
  const what = deadline.title.trim() || KIND_LABELS[deadline.kind] || 'Termin'
  const title = deadline.courseName ? `${what} · ${courseLabel(deadline.courseName)}` : what
  const time = deadline.time ? ` o ${deadline.time.replace(/^0/, '')}` : ''
  const moment = deadlineMoment(deadline)
  const when =
    kind === 'week'
      ? `Za tydzień, ${WEEKDAYS[moment.getDay()]} ${moment.getDate()}.${String(moment.getMonth() + 1).padStart(2, '0')}${time}`
      : kind === 'day'
        ? `Jutro${time}`
        : kind === 'morning'
          ? `Dziś${time}`
          : `Za godzinę${time}`
  return { title, body: when }
}
