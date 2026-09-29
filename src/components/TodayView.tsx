import { usePlanUi } from '../hooks/planUi'
import { addDays, daysBetween, formatDay, isSameDay } from '../lib/dates'
import type { PlanMeeting } from '../lib/edits'
import { semesterWeek } from '../lib/semesterWeek'
import { DayTimeline } from './DayTimeline'
import { FirstSteps } from './FirstSteps'
import { UpcomingDeadlines } from './UpcomingDeadlines'

interface Props {
  meetings: PlanMeeting[]
  now: Date
}

// "Poniedziałek, 5 października" + numer tygodnia semestru (jeśli włączony w ustawieniach)
function TodayTitle({ meetings, now }: Props) {
  const { prefs } = usePlanUi()
  const week = prefs.showWeekNumber ? semesterWeek(now, meetings) : null
  return (
    <h2 className="day-title">
      {formatDay(now)}
      {week && (
        <span className="week-number">
          tydz. {week.number} · {week.odd ? 'nieparzysty' : 'parzysty'}
        </span>
      )}
    </h2>
  )
}

export function TodayView({ meetings, now }: Props) {
  const today = meetings.filter((m) => isSameDay(m.start, now))
  const hasRemaining = today.some((m) => m.end > now)

  if (hasRemaining) {
    return (
      <section>
        <TodayTitle meetings={meetings} now={now} />
        <FirstSteps />
        <UpcomingDeadlines now={now} />
        <DayTimeline meetings={today} now={now} />
      </section>
    )
  }

  const upcoming = meetings.find((m) => m.start > now && !isSameDay(m.start, now))
  const upcomingDay = upcoming ? meetings.filter((m) => isSameDay(m.start, upcoming.start)) : []
  const isTomorrow = upcoming ? isSameDay(upcoming.start, addDays(now, 1)) : false

  return (
    <section>
      <TodayTitle meetings={meetings} now={now} />
      <FirstSteps />
      <UpcomingDeadlines now={now} />
      <div className="empty-state">
        {today.length === 0 ? 'Dziś nie masz zajęć.' : 'Na dziś to już wszystko.'}
      </div>
      {upcoming ? (
        <>
          {/* Krótki nagłówek, a kiedy - szarym tekstem pod nim (na wąskim ekranie nic się nie zawija). */}
          <h3 className="day-title secondary next-title">{isTomorrow ? 'Jutro' : 'Najbliższe zajęcia'}</h3>
          <p className="next-when">
            {formatDay(upcoming.start)}
            {!isTomorrow && ` · za ${daysBetween(now, upcoming.start)} dni`}
          </p>
          <DayTimeline meetings={upcomingDay} now={now} />
        </>
      ) : (
        <p className="muted">W planie nie ma już żadnych nadchodzących zajęć.</p>
      )}
    </section>
  )
}
