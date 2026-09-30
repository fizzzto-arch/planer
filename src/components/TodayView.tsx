import { t } from '../lib/i18n'
import { usePlanUi } from '../hooks/planUi'
import { addDays, daysBetween, formatDay, isSameDay, toDateKey } from '../lib/dates'
import { dayLabel, eventName } from '../lib/academicCalendar'
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
  const { prefs, calendarEvents } = usePlanUi()
  const week = prefs.showWeekNumber ? semesterWeek(now, meetings) : null
  const special = dayLabel(calendarEvents, toDateKey(now)) // święto, przerwa, sesja
  return (
    <>
      <h2 className="day-title">
        {formatDay(now)}
        {week && (
          <span className="week-number">
            {week.odd ? t('tydz. {n} · nieparzysty', { n: week.number }) : t('tydz. {n} · parzysty', { n: week.number })}
          </span>
        )}
      </h2>
      {special && <p className="calendar-note">{eventName(special)}</p>}
    </>
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
        {today.length === 0 ? t('Dziś nie masz zajęć.') : t('Na dziś to już wszystko.')}
      </div>
      {upcoming ? (
        <>
          {/* Krótki nagłówek, a kiedy - szarym tekstem pod nim (na wąskim ekranie nic się nie zawija). */}
          <h3 className="day-title secondary next-title">{isTomorrow ? t('Jutro') : t('Najbliższe zajęcia')}</h3>
          <p className="next-when">
            {formatDay(upcoming.start)}
            {!isTomorrow && t(' · za {n} dni', { n: daysBetween(now, upcoming.start) })}
          </p>
          <DayTimeline meetings={upcomingDay} now={now} />
        </>
      ) : (
        <p className="muted">{t('W planie nie ma już żadnych nadchodzących zajęć.')}</p>
      )}
    </section>
  )
}
