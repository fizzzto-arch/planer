import { addDays, formatDay, isSameDay } from '../lib/dates'
import type { Meeting } from '../lib/usos'
import { DayTimeline } from './DayTimeline'

interface Props {
  meetings: Meeting[]
  now: Date
}

export function TodayView({ meetings, now }: Props) {
  const today = meetings.filter((m) => isSameDay(m.start, now))
  const hasRemaining = today.some((m) => m.end > now)

  if (hasRemaining) {
    return (
      <section>
        <h2 className="day-title">{formatDay(now)}</h2>
        <DayTimeline meetings={today} now={now} />
      </section>
    )
  }

  const upcoming = meetings.find((m) => m.start > now && !isSameDay(m.start, now))
  const upcomingDay = upcoming ? meetings.filter((m) => isSameDay(m.start, upcoming.start)) : []
  const isTomorrow = upcoming ? isSameDay(upcoming.start, addDays(now, 1)) : false

  return (
    <section>
      <h2 className="day-title">{formatDay(now)}</h2>
      <div className="empty-state">
        {today.length === 0 ? 'Dziś nie masz zajęć.' : 'Na dziś to już wszystko.'}
      </div>
      {upcoming ? (
        <>
          <h3 className="day-title secondary">
            {isTomorrow ? 'Jutro' : 'Najbliższe zajęcia'}: {formatDay(upcoming.start)}
          </h3>
          <DayTimeline meetings={upcomingDay} now={now} />
        </>
      ) : (
        <p className="muted">W planie nie ma już żadnych nadchodzących zajęć.</p>
      )}
    </section>
  )
}
