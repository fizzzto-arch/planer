import { t } from '../lib/i18n'
import { useState, type CSSProperties } from 'react'
import { usePlanUi } from '../hooks/planUi'
import { formatTypes, summarizeCourses } from '../lib/courses'
import { daysBetween, formatShortDay, formatTime, parseDateKey } from '../lib/dates'
import { upcomingDeadlines } from '../lib/deadlines'
import type { PlanMeeting } from '../lib/edits'
import { GENERAL_NOTE, courseKey, type DeadlineKind } from '../lib/extras'
import { plural } from '../lib/plural'
import { typeSlug } from '../lib/usos'
import { DeadlineList } from './DeadlineList'
import { NoteField } from './NoteField'

const DAYS_AHEAD = 60
// Egzaminy bywają w sesji za kilka miesięcy - przy tym filtrze patrzymy na cały semestr.
const DAYS_AHEAD_EXAMS = 200

type KindFilter = 'all' | DeadlineKind

const FILTERS = (): { value: KindFilter; label: string }[] => ([
  { value: 'all', label: t('Wszystkie') },
  { value: 'kolokwium', label: t('Kolokwia') },
  { value: 'egzamin', label: t('Egzaminy') },
  { value: 'projekt', label: t('Projekty') },
])

interface Props {
  meetings: PlanMeeting[]
  now: Date
}

export function CoursesView({ meetings, now }: Props) {
  const { extras, openCourse, openOptimizer, isAdmin, canOptimize, editDeadline, displayName } = usePlanUi()
  const [filter, setFilter] = useState<KindFilter>('all')
  const courses = summarizeCourses(meetings, now)
  const all = extras ? upcomingDeadlines(extras.extras.deadlines, now, DAYS_AHEAD_EXAMS) : []
  const inHorizon = (days: number) => all.filter((d) => daysBetween(now, parseDateKey(d.date)!) <= days)
  const deadlines =
    filter === 'all'
      ? inHorizon(DAYS_AHEAD)
      : all.filter((d) => d.kind === filter && (filter === 'egzamin' || daysBetween(now, parseDateKey(d.date)!) <= DAYS_AHEAD))
  // Filtr pokazujemy dopiero, gdy jest co filtrować (terminy różnych rodzajów).
  const showFilter = new Set(all.map((d) => d.kind)).size > 1

  return (
    <section>
      {/* Optymalizator: wersja testowa - administrator i osoby, którym go przyznał. */}
      {canOptimize && (
        <button type="button" className="optimizer-entry" onClick={openOptimizer}>
          <span className="optimizer-entry-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M4 7h10M18 7h2M4 17h4M12 17h8M14 4v6M8 14v6" />
            </svg>
          </span>
          <span className="optimizer-entry-text">
            <strong>
              {t('Dobierz grupy')} <span className="alpha-badge">alpha</span>
            </strong>
            <span>
              {t('Znajdź układ grup z mniejszą liczbą okienek i dni na uczelni')}
              {isAdmin ? t(' (widoczne dla Ciebie i osób, którym dasz dostęp)') : t(' - wersja testowa, daj znać, co działa')}
            </span>
          </span>
          <svg className="course-row-chevron" viewBox="0 0 24 24" aria-hidden="true">
            <path d="m9 6 6 6-6 6" />
          </svg>
        </button>
      )}

      <div className="section-head">
        <h2 className="day-title">{t('Nadchodzące terminy')}</h2>
        {extras && (
          <button type="button" className="button small" onClick={() => editDeadline({})}>
            {t('+ Dodaj termin')}
          </button>
        )}
      </div>
      {showFilter && (
        <div className="segmented deadline-filter" role="radiogroup" aria-label={t('Rodzaj terminów')}>
          {FILTERS().map((f) => (
            <button
              key={f.value}
              type="button"
              role="radio"
              aria-checked={filter === f.value}
              className={`segment${filter === f.value ? ' is-active' : ''}`}
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}
      {!extras ? (
        <p className="empty-state">{t('Zaloguj się (Ustawienia), żeby dodawać kolokwia, egzaminy i notatki.')}</p>
      ) : deadlines.length === 0 ? (
        <p className="empty-state">
          {filter === 'all'
            ? t('Brak terminów w najbliższych tygodniach. Dodaj kolokwium albo egzamin.')
            : t('Brak takich terminów.')}
        </p>
      ) : (
        <DeadlineList deadlines={deadlines} now={now} showCourse />
      )}

      {/* Notatki niezwiązane z przedmiotem, np. "z czego przenieść się do innej grupy". */}
      {extras && (
        <>
          <h2 className="day-title secondary">{t('Notatki')}</h2>
          <div className="panel general-note">
            <NoteField
              id="general-note"
              value={extras.extras.courses.get(courseKey(GENERAL_NOTE))?.note ?? ''}
              rows={4}
              placeholder={t('Wszystko, co nie dotyczy jednego przedmiotu - np. z czego muszę się przenieść, co załatwić w dziekanacie')}
              onSave={(text) => extras.saveCourseNote(GENERAL_NOTE, text)}
            />
          </div>
        </>
      )}

      <h2 className="day-title secondary">{t('Przedmioty')}</h2>
      <ul className="course-list">
        {courses.map((course, i) => {
          const extra = extras?.extras.courses.get(courseKey(course.name))
          const count = deadlines.filter((d) => d.courseName === course.name).length
          const notePreview = extra?.note.trim().split('\n')[0]
          return (
            <li key={course.name} style={{ '--i': i } as CSSProperties}>
              <button
                type="button"
                className={`course-row type-${typeSlug(course.mainType)}`}
                onClick={() => openCourse(course.name)}
              >
                <span className="course-row-main">
                  <span className="course-row-name">{displayName(course.name)}</span>
                  {displayName(course.name) !== course.name && (
                    <span className="course-row-meta">{course.name}</span>
                  )}
                  <span className="course-row-meta">{formatTypes(course.types)}</span>
                  {course.next && (
                    <span className="course-row-meta">
                      {t('Następne:')} {formatShortDay(course.next.start)} {formatTime(course.next.start)}
                    </span>
                  )}
                  {notePreview && <span className="course-row-note">{notePreview}</span>}
                </span>
                {count > 0 && (
                  <span className="course-row-badge">
                    {count} {plural(count, 'termin', 'terminy', 'terminów')}
                  </span>
                )}
                <svg className="course-row-chevron" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m9 6 6 6-6 6" />
                </svg>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
