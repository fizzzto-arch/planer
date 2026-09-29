import { useState } from 'react'
import { addDays, formatWeekRange, startOfWeek } from '../lib/dates'
import { candidateMeetings, type FixedMeeting } from '../lib/candidatePlan'
import type { Candidate, Slot } from '../lib/optimizer'
import { Dialog } from './Dialog'
import { WeekGrid } from './WeekGrid'

interface Props {
  title: string
  candidate: Candidate
  slots: Slot[]
  fixed: FixedMeeting[]
  now: Date
  onClose: () => void
}

// Terminarz tydzień po tygodniu: jak wyglądałby plan z tymi grupami (nowe grupy wyróżnione).
export function PlanPreview({ title, candidate, slots, fixed, now, onClose }: Props) {
  const { meetings: items, changedIds } = candidateMeetings(candidate, slots, fixed)

  const weeks = [...new Set(items.map((m) => startOfWeek(m.start).getTime()))].sort((a, b) => a - b)
  const thisWeek = startOfWeek(now).getTime()
  // Startujemy od pierwszego tygodnia, w którym widać zmienione grupy (inaczej od bieżącego).
  const [weekIndex, setWeekIndex] = useState(() => {
    const firstChanged = items.find((m) => changedIds.has(m.id) && startOfWeek(m.start).getTime() >= thisWeek)
    const target = firstChanged ? startOfWeek(firstChanged.start).getTime() : thisWeek
    return Math.max(0, weeks.findIndex((w) => w >= target))
  })
  const weekStart = new Date(weeks[weekIndex] ?? thisWeek)
  const weekItems = items.filter((m) => m.start >= weekStart && m.start < addDays(weekStart, 7))
  const hasWeekend = weekItems.some((m) => m.start.getDay() === 0 || m.start.getDay() === 6)
  const days = Array.from({ length: hasWeekend ? 7 : 5 }, (_, i) => addDays(weekStart, i))

  return (
    <Dialog title={title} onClose={onClose} wide>
      <div className="week-nav preview-nav">
        <button
          type="button"
          className="icon-button"
          aria-label="Poprzedni tydzień"
          disabled={weekIndex === 0}
          onClick={() => setWeekIndex((i) => i - 1)}
        >
          ‹
        </button>
        <div className="week-label">
          <strong>{formatWeekRange(weekStart)}</strong>
          <span className="muted">
            tydzień {weekIndex + 1} z {weeks.length}
            {changedIds.size > 0 && ' · nowe grupy mają pomarańczową ramkę'}
          </span>
        </div>
        <button
          type="button"
          className="icon-button"
          aria-label="Następny tydzień"
          disabled={weekIndex >= weeks.length - 1}
          onClick={() => setWeekIndex((i) => i + 1)}
        >
          ›
        </button>
      </div>

      {weekItems.length === 0 ? (
        <p className="empty-state">W tym tygodniu nie ma zajęć.</p>
      ) : (
        <div key={weekStart.getTime()} className="preview-grid">
          <WeekGrid days={days} meetings={weekItems} now={now} readOnly highlightIds={changedIds} />
        </div>
      )}
    </Dialog>
  )
}
