import { usePlanUi } from '../hooks/planUi'
import { formatTypes, summarizeCourses } from '../lib/courses'
import { daysBetween, formatDay, formatTime, isSameDay, parseDateKey } from '../lib/dates'
import { sortDeadlines } from '../lib/deadlines'
import type { PlanMeeting } from '../lib/edits'
import { courseKey } from '../lib/extras'
import { typeSlug } from '../lib/usos'
import { DeadlineList } from './DeadlineList'
import { MaterialsSection } from './MaterialsSection'
import { MeetingCard } from './MeetingCard'
import { NoteField } from './NoteField'
import { StaffSection } from './StaffSection'
import { CourseInfoSection } from './CourseInfoSection'

interface Props {
  courseName: string
  meetings: PlanMeeting[]
  now: Date
  onBack: () => void
}

const UPCOMING_LIMIT = 8

// Zajęcia pogrupowane po dniach, z nagłówkiem daty.
function MeetingsByDay({ meetings, now }: { meetings: PlanMeeting[]; now: Date }) {
  return (
    <ol className="timeline course-meetings">
      {meetings.map((m, i) => {
        const newDay = i === 0 || !isSameDay(meetings[i - 1].start, m.start)
        return (
          <li key={m.id}>
            {newDay && <div className="course-day">{formatDay(m.start)}</div>}
            <MeetingCard meeting={m} now={now} showCourseLink={false} />
          </li>
        )
      })}
    </ol>
  )
}

export function CourseView({ courseName, meetings, now, onBack }: Props) {
  const { extras, editDeadline, addCustomMeeting, displayName } = usePlanUi()
  const courseMeetings = meetings.filter((m) => m.courseName === courseName)
  const summary = summarizeCourses(courseMeetings, now)[0]
  const upcoming = courseMeetings.filter((m) => m.end > now)
  const past = courseMeetings.filter((m) => m.end <= now).reverse()

  const deadlines = extras ? sortDeadlines(extras.extras.deadlines.filter((d) => d.courseName === courseName)) : []
  const isOpen = (date: string) => {
    const day = parseDateKey(date)
    return day !== null && daysBetween(now, day) >= 0
  }
  const activeDeadlines = deadlines.filter((d) => !d.done && isOpen(d.date))
  const closedDeadlines = deadlines.filter((d) => d.done || !isOpen(d.date))
  const note = extras?.extras.courses.get(courseKey(courseName))?.note ?? ''

  return (
    <section className={`course-page type-${typeSlug(summary?.mainType ?? 'INNE')}`}>
      <button type="button" className="back-button" onClick={onBack}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m15 6-6 6 6 6" />
        </svg>
        Wróć
      </button>

      <header className="course-header">
        <h2>{displayName(courseName)}</h2>
        {displayName(courseName) !== courseName && <p className="course-fullname">{courseName}</p>}
        {summary && <p className="muted">{formatTypes(summary.types)}</p>}
        {summary?.next && (
          <p className="course-next">
            Następne zajęcia: {formatDay(summary.next.start)}, {formatTime(summary.next.start)}
            {summary.next.room && ` · s. ${summary.next.room}`}
          </p>
        )}
      </header>

      {/* Na komputerze dwie kolumny: terminy, materiały i notatka | zajęcia. Na telefonie jedna pod drugą. */}
      <div className="course-columns">
        <div className="course-main">
          {!extras && (
            <p className="empty-state">Zaloguj się (Ustawienia), żeby dodawać notatki i terminy do przedmiotu.</p>
          )}

          {extras && (
            <div className="panel">
              <div className="section-head">
                <h3 className="panel-title">Terminy</h3>
                <button type="button" className="button small" onClick={() => editDeadline({ courseName })}>
                  + Dodaj
                </button>
              </div>
              {activeDeadlines.length === 0 ? (
                <p className="muted">Brak nadchodzących kolokwiów i terminów.</p>
              ) : (
                <DeadlineList deadlines={activeDeadlines} now={now} />
              )}
              {closedDeadlines.length > 0 && (
                <details className="collapsible">
                  <summary>Minione i zrobione ({closedDeadlines.length})</summary>
                  <DeadlineList deadlines={closedDeadlines} now={now} />
                </details>
              )}
            </div>
          )}

          <CourseInfoSection meetings={courseMeetings} now={now} />

          <StaffSection meetings={courseMeetings} />

          <MaterialsSection courseName={courseName} />

          {extras && (
            <div className="panel">
              <h3 className="panel-title">Notatka do przedmiotu</h3>
              <NoteField
                id={`course-note-${courseKey(courseName)}`}
                value={note}
                rows={5}
                placeholder="np. zasady zaliczenia, kontakt do prowadzącego, próg na ocenę"
                onSave={(text) => extras.saveCourseNote(courseName, text)}
              />
            </div>
          )}
        </div>

        <div className="course-side">
          <div className="section-head">
            <h3 className="section-title">Zajęcia</h3>
            {extras && (
              <button type="button" className="button small secondary" onClick={() => addCustomMeeting({ courseName })}>
                + Dodaj zajęcia
              </button>
            )}
          </div>
          {upcoming.length === 0 ? (
            <p className="muted">Brak nadchodzących zajęć.</p>
          ) : (
            <MeetingsByDay meetings={upcoming.slice(0, UPCOMING_LIMIT)} now={now} />
          )}
          {upcoming.length > UPCOMING_LIMIT && (
            <details className="collapsible">
              <summary>Pozostałe nadchodzące ({upcoming.length - UPCOMING_LIMIT})</summary>
              <MeetingsByDay meetings={upcoming.slice(UPCOMING_LIMIT)} now={now} />
            </details>
          )}
          {past.length > 0 && (
            <details className="collapsible">
              <summary>Minione ({past.length})</summary>
              <MeetingsByDay meetings={past} now={now} />
            </details>
          )}
        </div>
      </div>
    </section>
  )
}
