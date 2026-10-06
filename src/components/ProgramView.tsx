import { msg, t, tk } from '../lib/i18n'
import { useMemo, type CSSProperties } from 'react'
import { usePlanUi } from '../hooks/planUi'
import { formatShortDay, formatTime } from '../lib/dates'
import type { PlanMeeting } from '../lib/edits'
import { plural } from '../lib/plural'
import { PROGRAM } from '../lib/programs/ib'
import { SUMMARIES } from '../lib/programs/ibSummaries'
import {
  SYLLABUS_URL,
  currentCourseNames,
  dependents,
  ectsBefore,
  isElective,
  normalizeCourseName,
  programPosition,
  semesterEcts,
  semesterLoad,
  type ProgramCourse,
  type StudyProgram,
} from '../lib/studyProgram'

interface Props {
  meetings: PlanMeeting[]
  now: Date
  onBack: () => void
}

// Formy zajęć: skrót na znaczku, pełna nazwa w podpowiedzi, kolor jak w planie.
const FORMS: { key: string; short: string; full: string; color: string }[] = [
  { key: 'W', short: msg('W'), full: msg('wykład'), color: 'var(--c-wyk)' },
  { key: 'C', short: msg('Ć'), full: msg('ćwiczenia'), color: 'var(--c-cwi)' },
  { key: 'L', short: msg('L'), full: msg('laboratorium'), color: 'var(--c-lab)' },
  { key: 'P', short: msg('P'), full: msg('projekt'), color: 'var(--c-pro)' },
  { key: 'K', short: msg('K'), full: msg('lekcje komputerowe'), color: 'var(--c-lab)' },
]

// "2021/2022" -> "2021/22"
const shortYear = (year: string) => year.replace(/^(\d{4})\/\d{2}(\d{2})$/, '$1/$2')

const DEGREES: Record<string, string> = { inż: msg('studia inżynierskie'), mgr: msg('studia magisterskie') }

const semesterId = (n: number) => `program-semester-${n}`
const courseId = (name: string) => `program-course-${normalizeCourseName(name).replace(/ /g, '-')}`

// Przejście do semestru albo przedmiotu: rozwija go (i wszystko, w czym leży) i przewija do niego.
function reveal(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  for (let node: HTMLElement | null = el; node; node = node.parentElement) {
    if (node instanceof HTMLDetailsElement) node.open = true
  }
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  el.classList.remove('is-flash')
  void el.offsetWidth // ponowne odpalenie animacji przy kolejnym przejściu
  el.classList.add('is-flash')
}

interface Progress {
  done: number
  total: number
  next: Date | null
}

// Cały program kierunku: semestry z przedmiotami, punktami i sylabusami (z Katalogu ECTS PW).
export function ProgramView({ meetings, now, onBack }: Props) {
  const { openCourse } = usePlanUi()
  const program: StudyProgram = PROGRAM
  const position = useMemo(() => programPosition(program, currentCourseNames(meetings, now)), [program, meetings, now])
  const usedIn = useMemo(() => dependents(program, SUMMARIES), [program])
  const total = program.semesters.at(-1)?.number ?? 0
  const year = shortYear(program.year)
  const current = position.semester
  const before = current !== null ? ectsBefore(program, current) : null

  // Postęp przedmiotów z planu: ile zajęć za Tobą i kiedy następne.
  const progress = useMemo(() => {
    const result = new Map<string, Progress>()
    for (const planName of position.inPlan.values()) {
      const own = meetings.filter((m) => m.courseName === planName && !m.cancelled)
      const upcoming = own.filter((m) => m.start > now).sort((a, b) => a.start.getTime() - b.start.getTime())
      result.set(planName, { done: own.filter((m) => m.end <= now).length, total: own.length, next: upcoming[0]?.start ?? null })
    }
    return result
  }, [position, meetings, now])

  return (
    <section className="program">
      <button type="button" className="back-button" onClick={onBack}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m15 6-6 6 6 6" />
        </svg>
        {t('Wróć')}
      </button>

      <header className="course-header program-header">
        <h2>
          {t('Program studiów')} <span className="alpha-badge">alpha</span>
        </h2>
        <p className="muted">
          {program.name} · {DEGREES[program.degree] ? tk(DEGREES[program.degree]) : program.degree} ·{' '}
          {program.mode.toLocaleLowerCase('pl') === 'stacjonarne' ? t('stacjonarne') : program.mode}
        </p>
      </header>

      {/* Pasek studiów: semestry za Tobą, obecny i te przed Tobą; stuknięcie przenosi do semestru. */}
      <nav className="program-steps" aria-label={t('Semestry')} style={{ '--count': program.semesters.length } as CSSProperties}>
        {program.semesters.map((s) => {
          const state = current === null ? '' : s.number < current ? ' is-done' : s.number === current ? ' is-now' : ''
          return (
            <button
              key={s.number}
              type="button"
              className={`program-step${state}`}
              aria-label={t('Semestr {n}', { n: s.number })}
              aria-current={s.number === current ? 'step' : undefined}
              onClick={() => reveal(semesterId(s.number))}
            >
              <span className="program-step-bar" />
              <span className="program-step-number">{s.number}</span>
            </button>
          )
        })}
      </nav>
      {current !== null && before && (
        <p className="program-position">
          <strong>{t('Semestr {n} z {total}', { n: current, total })}</strong>
          {before.ects > 0 && (
            <span className="muted">
              {before.electives
                ? t('{n} ECTS za Tobą + obieralne', { n: before.ects })
                : t('{n} ECTS za Tobą', { n: before.ects })}
            </span>
          )}
        </p>
      )}

      <details className="program-source">
        <summary>
          {t('Katalog ECTS PW {year}', { year })} · <span className="program-source-more">{t('co to znaczy?')}</span>
        </summary>
        <p>
          {t('Program z Katalogu ECTS PW dla rocznika {year} - nowszego wydania nie ma. Przedmioty i punkty zgadzają się z obecnym planem, ale prowadzący, literatura i zasady zaliczenia mogły się zmienić.', { year })}{' '}
          <a href={program.url} target="_blank" rel="noreferrer">
            {t('Katalog ECTS')}
          </a>
        </p>
      </details>

      {program.semesters.map((semester) => (
        <SemesterPanel
          key={semester.number}
          number={semester.number}
          courses={semester.courses}
          current={current}
          inPlan={position.inPlan}
          progress={progress}
          usedIn={usedIn}
          year={year}
          onOpenCourse={openCourse}
        />
      ))}
    </section>
  )
}

interface SemesterProps {
  number: number
  courses: ProgramCourse[]
  current: number | null
  inPlan: Map<string, string>
  progress: Map<string, Progress>
  usedIn: Map<string, { name: string; semester: number }[]>
  year: string
  onOpenCourse: (name: string) => void
}

function SemesterPanel({ number, courses, current, inPlan, progress, usedIn, year, onOpenCourse }: SemesterProps) {
  const state = current === null ? null : number < current ? 'past' : number === current ? 'now' : 'future'
  const regular = courses.filter((c) => !isElective(c))
  const electives = courses.filter(isElective)
  const ects = semesterEcts(courses)
  const load = semesterLoad(courses)
  const item = (course: ProgramCourse) => {
    const planName = inPlan.get(course.name) ?? null
    return (
      <CourseItem
        key={course.name}
        course={course}
        planName={planName}
        progress={planName ? (progress.get(planName) ?? null) : null}
        usedIn={usedIn.get(course.name) ?? []}
        year={year}
        onOpenCourse={onOpenCourse}
      />
    )
  }

  return (
    // Otwarty bieżący semestr; pozostałe po stuknięciu.
    <details
      id={semesterId(number)}
      className={`panel program-semester${state === 'now' ? ' is-current' : ''}${state === 'past' ? ' is-past' : ''}`}
      open={state === 'now'}
    >
      <summary>
        <span className="program-semester-head">
          <span className="program-semester-title">{t('Semestr {n}', { n: number })}</span>
          {state === 'now' && <span className="badge program-now">{t('teraz')}</span>}
          {state === 'past' && <span className="badge">{t('za Tobą')}</span>}
          <span className="program-ects">
            {electives.length > 0 ? t('{n} ECTS + obieralne', { n: ects }) : t('{n} ECTS', { n: ects })}
          </span>
        </span>
        <span className="program-semester-load">
          {load.courses} {plural(load.courses, 'przedmiot', 'przedmioty', 'przedmiotów')}
          {' · '}
          {load.exams > 0
            ? `${load.exams} ${plural(load.exams, 'egzamin', 'egzaminy', 'egzaminów')}`
            : t('bez egzaminów')}
        </span>
      </summary>
      <ul className="program-courses">{regular.map(item)}</ul>
      {electives.length > 0 && (
        <details className="collapsible program-electives">
          <summary>{t('Przedmioty obieralne do wyboru ({n})', { n: electives.length })}</summary>
          <ul className="program-courses">{electives.map(item)}</ul>
        </details>
      )}
    </details>
  )
}

interface CourseProps {
  course: ProgramCourse
  planName: string | null // nazwa w Twoim planie, jeśli masz ten przedmiot teraz
  progress: Progress | null
  usedIn: { name: string; semester: number }[]
  year: string
  onOpenCourse: (name: string) => void
}

function CourseItem({ course, planName, progress, usedIn, year, onOpenCourse }: CourseProps) {
  // Cel i treści z sylabusa to ściana tekstu - pokazujemy zredagowany opis; zasady zaliczenia 1:1.
  const summary = SUMMARIES[course.name]
  const literature = course.literature?.replace(/^literatura:?\s*/i, '').trim()
  const described = Boolean(summary || course.assessment || course.coordinator || literature)
  const forms = FORMS.filter((f) => course.hours?.[f.key])
  const specialty = course.group === 'Specjalnościowe' ? course.block : null

  return (
    <li>
      <details id={courseId(course.name)} className={`program-course${planName ? ' is-in-plan' : ''}`}>
        <summary>
          <span className="program-course-name">
            {course.name}
            {planName && <span className="badge program-in-plan">{t('w planie')}</span>}
          </span>
          <span className="program-course-ects">{course.ects} ECTS</span>
          {(forms.length > 0 || course.exam || specialty) && (
            <span className="program-course-meta">
              {forms.map((f) => (
                <span
                  key={f.key}
                  className="program-form"
                  style={{ '--c': f.color } as CSSProperties}
                  title={`${tk(f.full)}: ${course.hours![f.key]} h`}
                >
                  {tk(f.short)} {course.hours![f.key]}
                </span>
              ))}
              {course.exam && <span className="program-exam">{t('egzamin')}</span>}
              {specialty && <span className="program-specialty">{t('specjalność: {name}', { name: specialty })}</span>}
            </span>
          )}
          {progress && progress.total > 0 && (
            <span className="program-progress">
              <span className="program-progress-bar" aria-hidden="true">
                <span style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }} />
              </span>
              <span className="program-progress-text">
                {t('{done} z {total} zajęć za Tobą', { done: progress.done, total: progress.total })}
                {progress.next &&
                  ` · ${t('następne: {when}', { when: `${formatShortDay(progress.next)} ${formatTime(progress.next)}` })}`}
              </span>
            </span>
          )}
        </summary>
        <div className="program-course-body">
          {!described && <p className="muted">{t('Katalog nie ma opisu tego przedmiotu.')}</p>}
          {summary && <p className="program-about">{summary.about}</p>}
          {summary?.topics && (
            <div className="program-field">
              <h4>{t('Tematy')}</h4>
              <ul className="program-topics">
                {summary.topics.map((topic) => (
                  <li key={topic}>{topic}</li>
                ))}
              </ul>
            </div>
          )}
          <Field label={t('Zaliczenie')} value={course.assessment} />
          <Field label={t('Wymagania')} value={summary?.needs} />
          {usedIn.length > 0 && (
            <div className="program-field">
              <h4>{t('Przyda się w')}</h4>
              <div className="program-links">
                {usedIn.map((u) => (
                  <button key={u.name} type="button" className="program-link" onClick={() => reveal(courseId(u.name))}>
                    {u.name} <span>· {t('sem. {n}', { n: u.semester })}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <Field label={t('Koordynator ({year})', { year })} value={course.coordinator} />
          {literature && (
            <details className="program-literature">
              <summary>{t('Literatura')}</summary>
              <p>{literature}</p>
            </details>
          )}
          <div className="program-course-links">
            {planName && (
              <button type="button" className="button small" onClick={() => onOpenCourse(planName)}>
                {t('Przedmiot w Planerze')}
              </button>
            )}
            {course.syllabusId && (
              <a className="button small secondary" href={SYLLABUS_URL + course.syllabusId} target="_blank" rel="noreferrer">
                {t('Pełny sylabus')}
              </a>
            )}
          </div>
        </div>
      </details>
    </li>
  )
}

function Field({ label, value }: { label: string; value?: string }) {
  if (!value) return null
  return (
    <div className="program-field">
      <h4>{label}</h4>
      <p>{value}</p>
    </div>
  )
}
