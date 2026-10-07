// Z czego składa się wyszukiwanie: przedmioty (z prowadzącymi, zasadami zaliczenia, notatką i tematami),
// terminy, sale, notatki, materiały, program studiów oraz ustawienia i funkcje Planera.
import type { CourseAssessment } from './assessment'
import type { AssessmentLookup } from './courseAssessment'
import { formatTypes, summarizeCourses } from './courses'
import { formatShortDay, formatTime, parseDateKey } from './dates'
import type { PlanMeeting } from './edits'
import { deadlineKindLabel, type CourseExtra, type Deadline } from './extras'
import { msg, t, tk } from './i18n'
import type { SearchField, SearchItem } from './search'
import type { CourseStaff } from './staff'
import type { CourseSummary as ProgramSummary, StudyProgram } from './studyProgram'
import { shortBuilding } from './usos'

// Co zrobić po wybraniu wyniku.
export type SearchAction =
  | { type: 'course'; name: string }
  | { type: 'deadline'; deadline: Deadline }
  | { type: 'settings'; anchor: string }
  | { type: 'program'; course?: string }
  | { type: 'view'; view: 'today' | 'week' | 'courses' | 'notifications' }
  | { type: 'export' }
  | { type: 'optimizer' }
  | { type: 'help' }
  | { type: 'feedback' }
  | { type: 'addDeadline' }
  | { type: 'addMeeting' }

export interface SearchSources {
  now: Date
  meetings: PlanMeeting[] // plan z dodatkami
  displayName: (courseName: string) => string // skrót nazwy, jeśli ustawiony
  deadlines: Deadline[]
  courseExtras: CourseExtra[] // notatki i linki przedmiotów
  generalNote: string
  materials: { courseName: string; name: string }[] // wspólne pliki przedmiotów
  staff: Map<string, CourseStaff> // przedmiot -> prowadzący (z pamięci; dociągani przy otwarciu wyszukiwania)
  assessment: AssessmentLookup | null
  program: { program: StudyProgram; summaries: Record<string, ProgramSummary>; assessments: Record<string, CourseAssessment> } | null
  features: { signedIn: boolean; canOptimize: boolean; hasProgram: boolean }
}

type Item = SearchItem<SearchAction>

const assessmentText = (a: CourseAssessment) =>
  [a.summary, ...a.rows.map((r) => r.text), a.grading, ...(a.notes ?? [])].filter(Boolean).join(' · ')

function courseItems(src: SearchSources): Item[] {
  const notes = new Map(src.courseExtras.map((c) => [c.name, c.note]))
  return summarizeCourses(src.meetings, src.now).map((course) => {
    const display = src.displayName(course.name)
    const staff = src.staff.get(course.name)
    const assessment = src.assessment?.(course.name) ?? null
    const fields: SearchField[] = [{ label: null, value: course.name }]
    if (staff) {
      const teachers = [...new Set(staff.groups.flatMap((g) => g.lecturers.map((p) => p.name)))]
      if (teachers.length > 0) fields.push({ label: t('Prowadzący'), value: teachers.join(', ') })
      if (staff.coordinators.length > 0) fields.push({ label: t('Koordynator'), value: staff.coordinators.map((p) => p.name).join(', ') })
    }
    if (assessment) fields.push({ label: t('Zaliczenie'), value: assessmentText(assessment) })
    const note = notes.get(course.name)
    if (note) fields.push({ label: t('Notatka'), value: note })
    return {
      id: `course:${course.name}`,
      group: 'courses',
      title: display,
      detail: formatTypes(course.types),
      fields,
      action: { type: 'course', name: course.name },
    }
  })
}

function deadlineItems(src: SearchSources): Item[] {
  return src.deadlines.map((d) => {
    const date = parseDateKey(d.date)
    const when = date ? `${formatShortDay(date)}${d.time ? ` ${d.time}` : ''}` : d.date
    const course = d.courseName ? src.displayName(d.courseName) : null
    const fields: SearchField[] = [{ label: null, value: deadlineKindLabel(d.kind), hidden: true }]
    if (d.courseName) fields.push({ label: null, value: `${d.courseName} ${course}`, hidden: true })
    if (d.note) fields.push({ label: t('Notatka'), value: d.note })
    if (d.checklist?.length) fields.push({ label: t('Do przygotowania'), value: d.checklist.map((c) => c.text).join(', ') })
    return {
      id: `deadline:${d.id}`,
      group: 'deadlines',
      title: d.title || deadlineKindLabel(d.kind),
      detail: [when, course].filter(Boolean).join(' · '),
      fields,
      action: { type: 'deadline', deadline: d },
      // Najpierw nadchodzące (według daty), zrobione i minione na końcu.
      order: (date?.getTime() ?? 0) + (d.done || (date && date.getTime() < src.now.getTime() - 86_400_000) ? 1e15 : 0),
    }
  })
}

// Sale z nadchodzących zajęć: kiedy następne zajęcia w tej sali.
function roomItems(src: SearchSources): Item[] {
  const next = new Map<string, PlanMeeting>()
  for (const m of src.meetings) {
    if (!m.room || m.cancelled || m.end <= src.now) continue
    const key = `${m.room}|${m.building ?? ''}`
    const known = next.get(key)
    if (!known || m.start < known.start) next.set(key, m)
  }
  return [...next.values()].map((m) => {
    const building = m.building ? shortBuilding(m.building) : null
    return {
      id: `room:${m.room}|${m.building ?? ''}`,
      group: 'rooms',
      title: t('Sala {room}', { room: m.room! }) + (building ? ` · ${building}` : ''),
      detail: t('Następne: {when} – {course}', {
        when: `${formatShortDay(m.start)} ${formatTime(m.start)}`,
        course: src.displayName(m.courseName),
      }),
      fields: [{ label: null, value: `s. ${m.room} ${m.building ?? ''} ${m.address ?? ''}`, hidden: true }],
      action: { type: 'course', name: m.courseName },
      order: m.start.getTime(),
    }
  })
}

function noteItems(src: SearchSources): Item[] {
  const items: Item[] = src.meetings
    .filter((m) => m.note.trim())
    .map((m) => ({
      id: `note:${m.id}`,
      group: 'notes',
      title: `${src.displayName(m.courseName)} – ${formatShortDay(m.start)}`,
      fields: [{ label: t('Notatka'), value: m.note }],
      action: { type: 'course', name: m.courseName },
      order: -m.start.getTime(),
    }))
  if (src.generalNote.trim()) {
    items.push({
      id: 'note:general',
      group: 'notes',
      title: t('Notatki'),
      detail: t('Notatka ogólna w zakładce Przedmioty'),
      fields: [{ label: t('Notatka'), value: src.generalNote }],
      action: { type: 'view', view: 'courses' },
    })
  }
  return items
}

function materialItems(src: SearchSources): Item[] {
  const links: Item[] = src.courseExtras.flatMap((c) =>
    c.links.map((link) => ({
      id: `link:${link.id}`,
      group: 'materials' as const,
      title: link.title || link.url,
      detail: `${t('Link')} · ${src.displayName(c.name)}`,
      fields: [
        { label: t('Link'), value: link.url },
        { label: null, value: c.name, hidden: true },
      ],
      action: { type: 'course' as const, name: c.name },
    })),
  )
  const files: Item[] = src.materials.map((file, i) => ({
    id: `file:${i}:${file.name}`,
    group: 'materials',
    title: file.name,
    detail: `${t('Plik')} · ${src.displayName(file.courseName)}`,
    fields: [{ label: null, value: file.courseName, hidden: true }],
    action: { type: 'course', name: file.courseName },
  }))
  return [...links, ...files]
}

function programItems(src: SearchSources): Item[] {
  if (!src.program) return []
  const { program, summaries, assessments } = src.program
  return program.semesters.flatMap((s) =>
    s.courses.map((c) => {
      const summary = summaries[c.name]
      const fields: SearchField[] = []
      if (summary) {
        fields.push({ label: null, value: summary.about })
        if (summary.topics) fields.push({ label: t('Tematy'), value: summary.topics.join(', ') })
      }
      const assessment = assessments[c.name]
      if (assessment) fields.push({ label: t('Zaliczenie'), value: assessmentText(assessment) })
      return {
        id: `program:${c.name}`,
        group: 'program' as const,
        title: c.name,
        detail: t('Program studiów · sem. {n} · {ects} ECTS', { n: s.number, ects: c.ects }),
        fields,
        action: { type: 'program' as const, course: c.name },
        order: s.number,
      }
    }),
  )
}

// Ustawienia i funkcje - z hasłami, którymi ktoś mógłby ich szukać (także po angielsku).
interface Entry {
  title: string
  keywords: string
  action: SearchAction
  when?: (f: SearchSources['features']) => boolean
}

const SETTINGS: Entry[] = [
  { title: msg('Konto i synchronizacja'), keywords: 'konto logowanie zaloguj wyloguj email synchronizacja urządzenia account login sign in sync', action: { type: 'settings', anchor: 'settings-account' } },
  { title: msg('Zmień hasło'), keywords: 'hasło nowe hasło reset password', action: { type: 'settings', anchor: 'settings-account' }, when: (f) => f.signedIn },
  { title: msg('Usuń konto'), keywords: 'usuń konto dane rodo delete account', action: { type: 'settings', anchor: 'settings-account' }, when: (f) => f.signedIn },
  { title: msg('Przypomnienia o terminach'), keywords: 'powiadomienia przypomnienia push plan dnia rano zmiany w planie przed zajęciami notifications reminders', action: { type: 'settings', anchor: 'settings-reminders' } },
  { title: msg('Wspólne okienka'), keywords: 'znajomi okienka wspólne udostępnij plan znajomym friends free time', action: { type: 'settings', anchor: 'settings-sharing' }, when: (f) => f.signedIn },
  { title: msg('Wygląd'), keywords: 'motyw ciemny jasny tryb nocny animacje rozmiar tekstu czcionka widok kompaktowy widok na start dark mode theme font size', action: { type: 'settings', anchor: 'settings-appearance' } },
  { title: msg('Język'), keywords: 'język angielski polski english language', action: { type: 'settings', anchor: 'settings-appearance' } },
  { title: msg('Plan i terminy'), keywords: 'numer tygodnia parzysty nieparzysty okienko przerwa weekend sobota niedziela nadchodzące terminy week number', action: { type: 'settings', anchor: 'settings-plan' } },
  { title: msg('Kolory zajęć'), keywords: 'kolory kolor wykład ćwiczenia laboratorium colors', action: { type: 'settings', anchor: 'settings-colors' } },
  { title: msg('Skróty nazw przedmiotów'), keywords: 'skróty skrót nazwy aliasy krótka nazwa aliases short names', action: { type: 'settings', anchor: 'settings-aliases' } },
  { title: msg('Źródło planu'), keywords: 'link ical usos źródło zmień plan odśwież aktualizacja przywróć plan z usos ręczne zmiany wat source', action: { type: 'settings', anchor: 'settings-source' } },
  { title: msg('Kopia zapasowa'), keywords: 'kopia zapasowa backup eksport danych wczytaj kopię przywróć dane', action: { type: 'settings', anchor: 'settings-backup' }, when: (f) => f.signedIn },
  { title: msg('Eksportuj plan'), keywords: 'eksport zdjęcie obraz pdf excel kalendarz google apple ics wydruk drukuj export print', action: { type: 'export' } },
  { title: msg('Dodaj termin'), keywords: 'dodaj termin kolokwium egzamin projekt deadline', action: { type: 'addDeadline' }, when: (f) => f.signedIn },
  { title: msg('Dodaj zajęcia'), keywords: 'dodaj własne zajęcia korepetycje add class', action: { type: 'addMeeting' }, when: (f) => f.signedIn },
  { title: msg('Dobierz grupy'), keywords: 'optymalizator zmiana grupy grupy okienka optimizer', action: { type: 'optimizer' }, when: (f) => f.canOptimize },
  { title: msg('Program studiów'), keywords: 'program studiów semestry sylabus ects przedmioty programme syllabus', action: { type: 'program' }, when: (f) => f.hasProgram },
  { title: msg('Oceny i średnia'), keywords: 'oceny ocena średnia ważona ects stypendium wpisz ocenę grades average gpa', action: { type: 'program' }, when: (f) => f.hasProgram && f.signedIn },
  { title: msg('Powiadomienia'), keywords: 'powiadomienia skrzynka wiadomości notifications inbox', action: { type: 'view', view: 'notifications' } },
  { title: msg('Pomoc i prywatność'), keywords: 'pomoc prywatność jak to działa instrukcja help privacy faq', action: { type: 'help' } },
  { title: msg('Zgłoś problem'), keywords: 'zgłoś problem błąd uwaga pomysł feedback bug report', action: { type: 'feedback' }, when: (f) => f.signedIn },
]

function settingsItems(src: SearchSources): Item[] {
  return SETTINGS.filter((e) => !e.when || e.when(src.features)).map((e) => ({
    id: `settings:${e.title}`,
    group: 'settings',
    title: tk(e.title),
    fields: [
      { label: null, value: e.title, hidden: true }, // polska nazwa - znajdzie się też w wersji angielskiej
      { label: null, value: e.keywords, hidden: true },
    ],
    action: e.action,
  }))
}

export function buildSearchIndex(src: SearchSources): Item[] {
  return [
    ...courseItems(src),
    ...deadlineItems(src),
    ...roomItems(src),
    ...noteItems(src),
    ...materialItems(src),
    ...programItems(src),
    ...settingsItems(src),
  ]
}
