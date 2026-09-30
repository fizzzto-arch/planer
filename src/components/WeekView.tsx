import { t } from '../lib/i18n'
import { useEffect, useState } from 'react'
import { usePlanUi } from '../hooks/planUi'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { addDays, formatDay, formatWeekRange, isSameDay, startOfWeek, toDateKey } from '../lib/dates'
import type { PlanMeeting } from '../lib/edits'
import { semesterWeek } from '../lib/semesterWeek'
import { dayLabel, eventName } from '../lib/academicCalendar'
import { DayTimeline } from './DayTimeline'
import { FreeWindowsDialog } from './FreeWindowsDialog'
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
  const { extras, addCustomMeeting, openExport, prefs, calendarEvents } = usePlanUi()
  const [freeOpen, setFreeOpen] = useState(false) // wspólne okienka ze znajomymi

  function goTo(target: Date) {
    if (target.getTime() === weekStart.getTime()) return
    setDirection(target > weekStart ? 'next' : 'prev')
    setWeekStart(target)
  }

  // Na komputerze strzałki ← → zmieniają tydzień (poza polami tekstowymi i oknami).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return
      if (e.target instanceof Element && e.target.closest('input, textarea, select, [contenteditable]')) return
      if (document.querySelector('dialog[open]')) return
      e.preventDefault()
      setDirection(e.key === 'ArrowRight' ? 'next' : 'prev')
      setWeekStart((w) => addDays(w, e.key === 'ArrowRight' ? 7 : -7))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

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
          aria-label={t('Poprzedni tydzień')}
          onClick={() => goTo(addDays(weekStart, -7))}
        >
          ‹
        </button>
        <div className="week-label">
          <strong>{formatWeekRange(weekStart)}</strong>
          {semWeek && (
            <span className="week-number">
              {semWeek.odd
                ? t('tydzień {n} · nieparzysty', { n: semWeek.number })
                : t('tydzień {n} · parzysty', { n: semWeek.number })}
            </span>
          )}
          {isCurrentWeek ? (
            <span className="muted">{t('ten tydzień')}</span>
          ) : (
            <button type="button" className="link-button" onClick={() => goTo(startOfWeek(now))}>
              {t('wróć do tego tygodnia')}
            </button>
          )}
        </div>
        <button
          type="button"
          className="icon-button"
          aria-label={t('Następny tydzień')}
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
            {t('+ Dodaj zajęcia')}
          </button>
        )}
        {/* Eksport działa też bez konta - korzysta tylko z planu. */}
        <button type="button" className="button small secondary" onClick={() => openExport(weekStart)}>
          {t('Eksportuj plan')}
        </button>
        {extras && (
          <button type="button" className="button small secondary" onClick={() => setFreeOpen(true)}>
            {t('Wspólne okienka')}
          </button>
        )}
      </div>
      {freeOpen && <FreeWindowsDialog weekStart={weekStart} now={now} onClose={() => setFreeOpen(false)} />}

      <div key={weekStart.getTime()} className={direction ? `week-body slide-${direction}` : 'week-body'}>
        {weekMeetings.length === 0 ? (
          <div className="empty-state">{t('W tym tygodniu nie ma zajęć.')}</div>
        ) : wide ? (
          <WeekGrid days={days} meetings={weekMeetings} now={now} />
        ) : (
          days.map((day) => {
            const dayMeetings = weekMeetings.filter((m) => isSameDay(m.start, day))
            const isToday = isSameDay(day, now)
            const special = dayLabel(calendarEvents, toDateKey(day)) // święto, przerwa, sesja
            return (
              // Wolny dzień w jednej linii - tydzień z jednym dniem zajęć nie wymaga przewijania.
              <div key={day.getTime()} className={dayMeetings.length > 0 ? 'week-day' : 'week-day is-free'}>
                <h3 className="day-title">
                  {formatDay(day)}
                  {isToday && <span className="today-pill">{t('dziś')}</span>}
                  {!special && dayMeetings.length === 0 && <span className="free-label">{t('wolne')}</span>}
                </h3>
                {/* Święto, przerwa, sesja - pod datą, żeby długa nazwa nie łamała nagłówka. */}
                {special && <p className="day-calendar-note">{eventName(special)}</p>}
                {dayMeetings.length > 0 && <DayTimeline meetings={dayMeetings} now={now} />}
              </div>
            )
          })
        )}
      </div>
    </section>
  )
}
