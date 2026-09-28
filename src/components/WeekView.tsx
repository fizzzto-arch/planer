import { useState } from 'react'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { addDays, formatDay, formatWeekRange, isSameDay, startOfWeek } from '../lib/dates'
import type { Meeting } from '../lib/usos'
import { DayTimeline } from './DayTimeline'
import { WeekGrid } from './WeekGrid'

interface Props {
  meetings: Meeting[]
  now: Date
}

export function WeekView({ meetings, now }: Props) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(now))
  const wide = useMediaQuery('(min-width: 900px)')

  const weekEnd = addDays(weekStart, 7)
  const weekMeetings = meetings.filter((m) => m.start >= weekStart && m.start < weekEnd)
  const hasWeekend = weekMeetings.some((m) => m.start.getDay() === 0 || m.start.getDay() === 6)
  const days = Array.from({ length: hasWeekend ? 7 : 5 }, (_, i) => addDays(weekStart, i))
  const isCurrentWeek = isSameDay(weekStart, startOfWeek(now))

  return (
    <section>
      <div className="week-nav">
        <button
          type="button"
          className="icon-button"
          aria-label="Poprzedni tydzień"
          onClick={() => setWeekStart(addDays(weekStart, -7))}
        >
          ‹
        </button>
        <div className="week-label">
          <strong>{formatWeekRange(weekStart)}</strong>
          {isCurrentWeek ? (
            <span className="muted">ten tydzień</span>
          ) : (
            <button type="button" className="link-button" onClick={() => setWeekStart(startOfWeek(now))}>
              wróć do tego tygodnia
            </button>
          )}
        </div>
        <button
          type="button"
          className="icon-button"
          aria-label="Następny tydzień"
          onClick={() => setWeekStart(addDays(weekStart, 7))}
        >
          ›
        </button>
      </div>

      {weekMeetings.length === 0 ? (
        <div className="empty-state">W tym tygodniu nie ma zajęć.</div>
      ) : wide ? (
        <WeekGrid days={days} meetings={weekMeetings} now={now} />
      ) : (
        days.map((day) => {
          const dayMeetings = weekMeetings.filter((m) => isSameDay(m.start, day))
          const isToday = isSameDay(day, now)
          return (
            <div key={day.getTime()} className="week-day">
              <h3 className="day-title">
                {formatDay(day)}
                {isToday && <span className="today-pill">dziś</span>}
              </h3>
              {dayMeetings.length > 0 ? (
                <DayTimeline meetings={dayMeetings} now={now} />
              ) : (
                <p className="muted">Wolne</p>
              )}
            </div>
          )
        })
      )}
    </section>
  )
}
