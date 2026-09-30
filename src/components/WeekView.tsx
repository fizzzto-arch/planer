import { t } from '../lib/i18n'
import { useEffect, useRef, useState } from 'react'
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
  // Wybrany tydzień trzyma App - zostaje po wejściu w przedmiot i powrocie (null = bieżący).
  selectedWeek: Date | null
  onSelectWeek: (weekStart: Date | null) => void
}

export function WeekView({ meetings, now, selectedWeek, onSelectWeek }: Props) {
  const weekStart = selectedWeek ?? startOfWeek(now)
  const rootRef = useRef<HTMLElement>(null)
  // Z której strony ma wjechać nowy tydzień.
  const [direction, setDirection] = useState<'next' | 'prev' | null>(null)
  const wide = useMediaQuery('(min-width: 900px)')
  const { extras, addCustomMeeting, openExport, prefs, calendarEvents } = usePlanUi()
  const [freeOpen, setFreeOpen] = useState(false) // wspólne okienka ze znajomymi

  function goTo(target: Date) {
    if (target.getTime() === weekStart.getTime()) return
    setDirection(target > weekStart ? 'next' : 'prev')
    onSelectWeek(isSameDay(target, startOfWeek(now)) ? null : target)
  }

  // Na komputerze strzałki ← → zmieniają tydzień (poza polami tekstowymi i oknami).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return
      if (e.target instanceof Element && e.target.closest('input, textarea, select, [contenteditable]')) return
      if (document.querySelector('dialog[open]')) return
      // Kopia planu pod podstroną (do gestu "wstecz") nie reaguje na klawisze.
      if (rootRef.current?.closest('.swipe-under')) return
      e.preventDefault()
      const target = addDays(weekStart, e.key === 'ArrowRight' ? 7 : -7)
      setDirection(e.key === 'ArrowRight' ? 'next' : 'prev')
      onSelectWeek(isSameDay(target, startOfWeek(now)) ? null : target)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [weekStart, now, onSelectWeek])

  const weekEnd = addDays(weekStart, 7)
  const weekMeetings = meetings.filter((m) => m.start >= weekStart && m.start < weekEnd)
  const hasWeekend =
    prefs.alwaysWeekend || weekMeetings.some((m) => m.start.getDay() === 0 || m.start.getDay() === 6)
  const days = Array.from({ length: hasWeekend ? 7 : 5 }, (_, i) => addDays(weekStart, i))
  const isCurrentWeek = isSameDay(weekStart, startOfWeek(now))
  const semWeek = prefs.showWeekNumber ? semesterWeek(weekStart, meetings) : null

  return (
    <section ref={rootRef}>
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
            aria-label={t('+ Dodaj zajęcia')}
            onClick={() => addCustomMeeting({ date: toDateKey(isCurrentWeek ? now : weekStart) })}
          >
            <span className="label-long">{t('+ Dodaj zajęcia')}</span>
            <span className="label-short">{t('+ Zajęcia')}</span>
          </button>
        )}
        {/* Eksport działa też bez konta - korzysta tylko z planu. */}
        <button
          type="button"
          className="button small secondary"
          aria-label={t('Eksportuj plan')}
          onClick={() => openExport(weekStart)}
        >
          <span className="label-long">{t('Eksportuj plan')}</span>
          <span className="label-short">{t('Eksportuj')}</span>
        </button>
        {extras && (
          <button
            type="button"
            className="button small secondary"
            aria-label={t('Wspólne okienka')}
            onClick={() => setFreeOpen(true)}
          >
            <span className="label-long">{t('Wspólne okienka')}</span>
            <span className="label-short">{t('Okienka')}</span>
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
