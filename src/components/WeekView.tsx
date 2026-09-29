import { useState } from 'react'
import { usePlanUi } from '../hooks/planUi'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { addDays, formatDay, formatWeekRange, isSameDay, startOfWeek, toDateKey } from '../lib/dates'
import type { PlanMeeting } from '../lib/edits'
import { semesterWeek } from '../lib/semesterWeek'
import { DayTimeline } from './DayTimeline'
import { WeekGrid } from './WeekGrid'

interface Props {
  meetings: PlanMeeting[]
  now: Date
}

export function WeekView({ meetings, now }: Props) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(now))
  // Z której strony ma wjechać nowy tydzień.
  const [direction, setDirection] = useState<'next' | 'prev' | null>(null)
  const wide = useMediaQuery('(min-width: 900px)')
  const { extras, addCustomMeeting, openExport, prefs } = usePlanUi()

  function goTo(target: Date) {
    if (target.getTime() === weekStart.getTime()) return
    setDirection(target > weekStart ? 'next' : 'prev')
    setWeekStart(target)
  }

  const weekEnd = addDays(weekStart, 7)
  const weekMeetings = meetings.filter((m) => m.start >= weekStart && m.start < weekEnd)
  const hasWeekend =
    prefs.alwaysWeekend || weekMeetings.some((m) => m.start.getDay() === 0 || m.start.getDay() === 6)
  const days = Array.from({ length: hasWeekend ? 7 : 5 }, (_, i) => addDays(weekStart, i))
  const isCurrentWeek = isSameDay(weekStart, startOfWeek(now))
  const semWeek = prefs.showWeekNumber ? semesterWeek(weekStart, meetings) : null

  return (
    <section>
      <div className="week-nav">
        <button
          type="button"
          className="icon-button"
          aria-label="Poprzedni tydzień"
          onClick={() => goTo(addDays(weekStart, -7))}
        >
          ‹
        </button>
        <div className="week-label">
          <strong>{formatWeekRange(weekStart)}</strong>
          {semWeek && (
            <span className="week-number">
              tydzień {semWeek.number} · {semWeek.odd ? 'nieparzysty' : 'parzysty'}
            </span>
          )}
          {isCurrentWeek ? (
            <span className="muted">ten tydzień</span>
          ) : (
            <button type="button" className="link-button" onClick={() => goTo(startOfWeek(now))}>
              wróć do tego tygodnia
            </button>
          )}
        </div>
        <button
          type="button"
          className="icon-button"
          aria-label="Następny tydzień"
          onClick={() => goTo(addDays(weekStart, 7))}
        >
          ›
        </button>
      </div>

      <div className="week-actions">
        {extras && (
          <button
            type="button"
            className="button small secondary"
            onClick={() => addCustomMeeting({ date: toDateKey(isCurrentWeek ? now : weekStart) })}
          >
            + Dodaj zajęcia
          </button>
        )}
        {/* Eksport działa też bez konta - korzysta tylko z planu. */}
        <button type="button" className="button small secondary" onClick={() => openExport(weekStart)}>
          Eksportuj plan
        </button>
      </div>

      <div key={weekStart.getTime()} className={direction ? `week-body slide-${direction}` : 'week-body'}>
        {weekMeetings.length === 0 ? (
          <div className="empty-state">W tym tygodniu nie ma zajęć.</div>
        ) : wide ? (
          <WeekGrid days={days} meetings={weekMeetings} now={now} />
        ) : (
          days.map((day) => {
            const dayMeetings = weekMeetings.filter((m) => isSameDay(m.start, day))
            const isToday = isSameDay(day, now)
            return (
              // Wolny dzień w jednej linii - tydzień z jednym dniem zajęć nie wymaga przewijania.
              <div key={day.getTime()} className={dayMeetings.length > 0 ? 'week-day' : 'week-day is-free'}>
                <h3 className="day-title">
                  {formatDay(day)}
                  {isToday && <span className="today-pill">dziś</span>}
                  {dayMeetings.length === 0 && <span className="free-label">wolne</span>}
                </h3>
                {dayMeetings.length > 0 && <DayTimeline meetings={dayMeetings} now={now} />}
              </div>
            )
          })
        )}
      </div>
    </section>
  )
}
