import { locale, t } from '../lib/i18n'
import { usePlanUi } from '../hooks/planUi'
import { formatTypes, siblingCourses, summarizeCourses } from '../lib/courses'
import { daysBetween, formatDay, formatTime, isSameDay, parseDateKey } from '../lib/dates'
import { sortDeadlines } from '../lib/deadlines'
import type { PlanMeeting } from '../lib/edits'
import { courseKey } from '../lib/extras'
import { placeLabel, typeLabel, typeSlug } from '../lib/usos'
import { DeadlineList } from './DeadlineList'
import { MaterialsSection } from './MaterialsSection'
import { MeetingCard } from './MeetingCard'
import { NoteField } from './NoteField'
import { StaffSection } from './StaffSection'
import { CourseInfoSection } from './CourseInfoSection'
import { AssessmentSection } from './AssessmentSection'
import { ScoreSection } from './ScoreSection'
import { scoreSummary } from '../lib/scoring'
import { assessmentLine } from '../lib/assessment'
import { programAssessments } from '../lib/courseAssessment'
import { useMemo, useState } from 'react'
import { HideCourseDialog } from './HideCourseDialog'

interface Props {
  courseName: string
  meetings: PlanMeeting[]
  now: Date
  onBack: () => void
  onSwitch?: (courseName: string, step: 1 | -1) => void // poprzedni/następny przedmiot (strzałki)
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

export function CourseView({ courseName, meetings, now, onBack, onSwitch }: Props) {
  const { extras, editDeadline, addCustomMeeting, displayName, notesOn } = usePlanUi()
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
  const saved = extras?.extras.scores.get(courseKey(courseName)) ?? null
  // Zaliczenie z programu studiów (na razie Inżynieria Biomedyczna) - gdy plan do niego pasuje.
  const assessment = useMemo(() => programAssessments(meetings, now)?.(courseName) ?? null, [meetings, now, courseName])
  const types = [...new Set(courseMeetings.map((m) => m.type))].sort((a, b) => typeLabel(a).localeCompare(typeLabel(b), locale()))
  const [hiding, setHiding] = useState(false)
  // Sąsiednie przedmioty z listy - po ostatnim znowu pierwszy.
  const siblings = useMemo(() => siblingCourses(meetings, now, courseName), [meetings, now, courseName])
  const position = siblings.indexOf(courseName)
  const switchBy = (step: 1 | -1) => onSwitch?.(siblings[(position + step + siblings.length) % siblings.length], step)

  return (
    <section className={`course-page type-${typeSlug(summary?.mainType ?? 'INNE')}`}>
      <div className="course-topbar">
        <button type="button" className="back-button" onClick={onBack}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m15 6-6 6 6 6" />
          </svg>
          {t('Wróć')}
        </button>
        {onSwitch && position >= 0 && siblings.length > 1 && (
          <div className="course-switch">
            <button type="button" className="icon-button" aria-label={t('Poprzedni przedmiot')} onClick={() => switchBy(-1)}>
              ‹
            </button>
            <span className="course-switch-count">{t('{done} z {total}', { done: position + 1, total: siblings.length })}</span>
            <button type="button" className="icon-button" aria-label={t('Następny przedmiot')} onClick={() => switchBy(1)}>
              ›
            </button>
          </div>
        )}
      </div>

      <header className="course-header">
        <h2>{displayName(courseName)}</h2>
        {displayName(courseName) !== courseName && <p className="course-fullname">{courseName}</p>}
        {summary && <p className="muted">{formatTypes(summary.types)}</p>}
        {summary?.next && (
          <p className="course-next">
            {t('Następne zajęcia:')} {formatDay(summary.next.start)}, {formatTime(summary.next.start)}
            {placeLabel(summary.next) && ' · ' + placeLabel(summary.next)}
          </p>
        )}
      </header>

      {/* Na komputerze dwie kolumny: terminy, materiały i notatka | zajęcia. Na telefonie jedna pod drugą. */}
      <div className="course-columns">
        <div className="course-main">
          {!extras && (
            <p className="empty-state">{t('Zaloguj się (Ustawienia), żeby dodawać terminy i liczyć punkty.')}</p>
          )}

          {extras && (
            <div className="panel">
              <div className="section-head">
                <h3 className="panel-title">{t('Terminy')}</h3>
                <button type="button" className="button small" onClick={() => editDeadline({ courseName })}>
                  {t('+ Dodaj')}
                </button>
              </div>
              {activeDeadlines.length === 0 ? (
                <p className="muted">{t('Brak nadchodzących kolokwiów i terminów.')}</p>
              ) : (
                <DeadlineList deadlines={activeDeadlines} now={now} />
              )}
              {closedDeadlines.length > 0 && (
                <details className="collapsible">
                  <summary>{t('Minione i zrobione ({n})', { n: closedDeadlines.length })}</summary>
                  <DeadlineList deadlines={closedDeadlines} now={now} />
                </details>
              )}
            </div>
          )}

          {/* Zaliczenie i punkty: zwinięte, z krótkim podsumowaniem - szczegóły po stuknięciu. */}
          {(assessment || extras) && (
            <details className="panel assessment-panel">
              <summary>
                <span className="assessment-panel-head">
                  <h3 className="panel-title">{t('Zaliczenie')}</h3>
                  <span className="assessment-panel-summary">
                    {[assessment && assessmentLine(assessment), scoreSummary(saved, assessment?.scoring ?? null)]
                      .filter(Boolean)
                      .join(' · ') || t('Wpisuj punkty, a Planer policzy ocenę')}
                  </span>
                </span>
                <svg className="assessment-panel-chevron" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </summary>
              {assessment && (
                <AssessmentSection
                  courseName={courseName}
                  assessment={assessment}
                  unitId={courseMeetings.find((m) => m.unitId)?.unitId ?? null}
                />
              )}
              <ScoreSection key={courseName} courseName={courseName} scoring={assessment?.scoring ?? null} />
            </details>
          )}

          {/* Prowadzący bieżących zajęć - przedmiot o tej samej nazwie z poprzedniego semestru ma inne grupy. */}
          <StaffSection meetings={upcoming.some((m) => m.unitId) ? upcoming : courseMeetings} />

          <MaterialsSection courseName={courseName} />

          <CourseInfoSection meetings={courseMeetings} now={now} />
        </div>

        <div className="course-side">
          <div className="section-head">
            <h3 className="section-title">{t('Zajęcia')}</h3>
            {extras && (
              <button type="button" className="button small secondary" onClick={() => addCustomMeeting({ courseName })}>
                {t('+ Dodaj zajęcia')}
              </button>
            )}
          </div>
          {upcoming.length === 0 ? (
            <p className="muted">{t('Brak nadchodzących zajęć.')}</p>
          ) : (
            <MeetingsByDay meetings={upcoming.slice(0, UPCOMING_LIMIT)} now={now} />
          )}
          {upcoming.length > UPCOMING_LIMIT && (
            <details className="collapsible">
              <summary>{t('Pozostałe nadchodzące ({n})', { n: upcoming.length - UPCOMING_LIMIT })}</summary>
              <MeetingsByDay meetings={upcoming.slice(UPCOMING_LIMIT)} now={now} />
            </details>
          )}
          {past.length > 0 && (
            <details className="collapsible">
              <summary>{t('Minione ({n})', { n: past.length })}</summary>
              <MeetingsByDay meetings={past} now={now} />
            </details>
          )}
        </div>
      </div>

      {/* Na samym dole (także na telefonie - pod zajęciami): notatka, gdy notatki włączone w ustawieniach. */}
      {extras && notesOn && (
        <div className="panel course-note">
          <h3 className="panel-title">{t('Notatka do przedmiotu')}</h3>
          <NoteField
            id={`course-note-${courseKey(courseName)}`}
            value={note}
            rows={5}
            placeholder={t('np. kontakt do prowadzącego, co przynieść na zajęcia')}
            onSave={(text) => extras.saveCourseNote(courseName, text)}
          />
        </div>
      )}

      {/* USOS czasem pokazuje zajęcia, których nie ma - można je usunąć (i przywrócić w zakładce Przedmioty). */}
      {types.length > 0 && (
        <button type="button" className="link-button course-remove" onClick={() => setHiding(true)}>
          {t('Usuń z planu…')}
        </button>
      )}
      {hiding && (
        <HideCourseDialog
          courseName={courseName}
          types={types}
          onClose={() => setHiding(false)}
          onHidden={(whole) => {
            if (whole) onBack()
          }}
        />
      )}
    </section>
  )
}
