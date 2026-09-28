import type { CSSProperties } from 'react'
import { usePlanUi } from '../hooks/planUi'
import { formatTypes, summarizeCourses } from '../lib/courses'
import { formatShortDay, formatTime } from '../lib/dates'
import { upcomingDeadlines } from '../lib/deadlines'
import type { PlanMeeting } from '../lib/edits'
import { courseKey } from '../lib/extras'
import { plural } from '../lib/plural'
import { typeSlug } from '../lib/usos'
import { DeadlineList } from './DeadlineList'

const DAYS_AHEAD = 60

interface Props {
  meetings: PlanMeeting[]
  now: Date
}

export function CoursesView({ meetings, now }: Props) {
  const { extras, openCourse, editDeadline, displayName } = usePlanUi()
  const courses = summarizeCourses(meetings, now)
  const deadlines = extras ? upcomingDeadlines(extras.extras.deadlines, now, DAYS_AHEAD) : []

  return (
    <section>
      <div className="section-head">
        <h2 className="day-title">Nadchodzące terminy</h2>
        {extras && (
          <button type="button" className="button small" onClick={() => editDeadline({})}>
            + Dodaj termin
          </button>
        )}
      </div>
      {!extras ? (
        <p className="empty-state">Zaloguj się (Ustawienia), żeby dodawać kolokwia, egzaminy i notatki.</p>
      ) : deadlines.length === 0 ? (
        <p className="empty-state">Brak terminów w najbliższych tygodniach. Dodaj kolokwium albo egzamin.</p>
      ) : (
        <DeadlineList deadlines={deadlines} now={now} showCourse />
      )}

      <h2 className="day-title secondary">Przedmioty</h2>
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
                      Następne: {formatShortDay(course.next.start)} {formatTime(course.next.start)}
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
