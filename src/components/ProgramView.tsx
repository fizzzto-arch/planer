import { msg, t, tk } from '../lib/i18n'
import { useMemo, type CSSProperties } from 'react'
import { usePlanUi } from '../hooks/planUi'
import type { PlanMeeting } from '../lib/edits'
import { plural } from '../lib/plural'
import { PROGRAM } from '../lib/programs/ib'
import { SUMMARIES } from '../lib/programs/ibSummaries'
import {
  SYLLABUS_URL,
  currentCourseNames,
  dependents,
  hoursProgress,
  isElective,
  meetingsDone,
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

const HOURS: [string, string][] = [
  ['W', msg('wyk.')],
  ['C', msg('ćw.')],
  ['L', msg('lab.')],
  ['P', msg('proj.')],
  ['K', msg('lek. komp.')],
]

const hoursText = (course: ProgramCourse) =>
  HOURS.filter(([key]) => course.hours?.[key])
    .map(([key, label]) => `${tk(label)} ${course.hours![key]} h`)
    .join(' · ')

// "2021/2022" -> "2021/22"
const shortYear = (year: string) => year.replace(/^(\d{4})\/\d{2}(\d{2})$/, '$1/$2')

const DEGREES: Record<string, string> = { inż: msg('studia inżynierskie'), mgr: msg('studia magisterskie') }

const semesterId = (n: number) => `program-semester-${n}`
const courseId = (name: string) => `program-course-${normalizeCourseName(name).replace(/ /g, '-')}`
const percent = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0)

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

// Cały program kierunku: semestry z przedmiotami, punktami i sylabusami (z Katalogu ECTS PW).
export function ProgramView({ meetings, now, onBack }: Props) {
  const { openCourse } = usePlanUi()
  const program: StudyProgram = PROGRAM
  const position = useMemo(() => programPosition(program, currentCourseNames(meetings, now)), [program, meetings, now])
  const usedIn = useMemo(() => dependents(program, SUMMARIES), [program])
  const total = program.semesters.at(-1)?.number ?? 0
  const year = shortYear(program.year)
  const current = position.semester

  // Godziny zajęć za Tobą: wcześniejsze semestry w całości, obecny - z odbytych zajęć w planie
  // (rośnie z każdymi zajęciami, także w trakcie).
  const hours = useMemo(
    () =>
      hoursProgress(program, current, (name) => {
        const planName = position.inPlan.get(name)
        return planName ? meetingsDone(meetings.filter((m) => m.courseName === planName), now) : 0
      }),
    [program, current, position, meetings, now],
  )

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

      {/* Postęp studiów w godzinach zajęć: odcinek na semestr (długość według godzin); stuknięcie przenosi do semestru. */}
      <nav className="program-steps" aria-label={t('Semestry')}>
        {hours.semesters.map((s) => (
          <button
            key={s.number}
            type="button"
            className={`program-step${s.number === current ? ' is-now' : ''}`}
            style={{ '--hours': Math.max(s.hours, 1) } as CSSProperties}
            aria-label={t('Semestr {n}', { n: s.number })}
            aria-current={s.number === current ? 'step' : undefined}
            onClick={() => reveal(semesterId(s.number))}
          >
            <span className="program-step-bar">
              <span style={{ width: `${percent(s.done, s.hours)}%` }} />
            </span>
            <span className="program-step-number">{s.number}</span>
          </button>
        ))}
      </nav>
      {current !== null && (
        <p className="program-position">
          <strong>{t('Semestr {n} z {total}', { n: current, total })}</strong>
        </p>
      )}

      <details className="program-source">
        <summary>
          {t('Katalog ECTS PW {year}', { year })} · <span className="program-source-more">{t('co to znaczy?')}</span>
        </summary>
        <p>
          {t('Program z Katalogu ECTS PW dla rocznika {year} - nowszego wydania nie ma. Przedmioty i punkty zgadzają się z obecnym planem, ale prowadzący, literatura i zasady zaliczenia mogły się zmienić.', { year })}{' '}
          {t('Godziny bez przedmiotów obieralnych.')}{' '}
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
  usedIn: Map<string, { name: string; semester: number }[]>
  year: string
  onOpenCourse: (name: string) => void
}

function SemesterPanel({ number, courses, current, inPlan, usedIn, year, onOpenCourse }: SemesterProps) {
  const state = current === null ? null : number < current ? 'past' : number === current ? 'now' : 'future'
  const regular = courses.filter((c) => !isElective(c))
  const electives = courses.filter(isElective)
  const ects = semesterEcts(courses)
  const load = semesterLoad(courses)
  const item = (course: ProgramCourse) => (
    <CourseItem
      key={course.name}
      course={course}
      planName={inPlan.get(course.name) ?? null}
      usedIn={usedIn.get(course.name) ?? []}
      year={year}
      onOpenCourse={onOpenCourse}
    />
  )

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
  usedIn: { name: string; semester: number }[]
  year: string
  onOpenCourse: (name: string) => void
}

function CourseItem({ course, planName, usedIn, year, onOpenCourse }: CourseProps) {
  const meta = [
    hoursText(course),
    course.exam && t('egzamin'),
    course.group === 'Specjalnościowe' && t('specjalność: {name}', { name: course.block }),
  ].filter(Boolean)
  // Cel i treści z sylabusa to ściana tekstu - pokazujemy zredagowany opis; zasady zaliczenia 1:1.
  const summary = SUMMARIES[course.name]
  const literature = course.literature?.replace(/^literatura:?\s*/i, '').trim()
  const described = Boolean(summary || course.assessment || course.coordinator || literature)

  return (
    <li>
      <details id={courseId(course.name)} className={`program-course${planName ? ' is-in-plan' : ''}`}>
        <summary>
          <span className="program-course-name">{course.name}</span>
          <span className="program-course-ects">{course.ects} ECTS</span>
          {/* "w planie" na początku drugiej linijki - przy długiej nazwie nie spada samotnie do nowego wiersza. */}
          {(planName || meta.length > 0) && (
            <span className="program-course-meta">
              {planName && <span className="badge program-in-plan">{t('w planie')}</span>}
              {meta.length > 0 && <span className="program-course-hours">{meta.join(' · ')}</span>}
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
