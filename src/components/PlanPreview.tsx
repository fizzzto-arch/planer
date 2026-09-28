import { useState } from 'react'
import { usePlanUi } from '../hooks/planUi'
import { addDays, formatDay, formatTime, formatWeekRange, isSameDay, startOfWeek } from '../lib/dates'
import type { Candidate, OptMeeting, Slot } from '../lib/optimizer'
import { typeLabel, typeSlug } from '../lib/usos'
import { Dialog } from './Dialog'

interface PreviewItem extends OptMeeting {
  key: string
  courseName: string
  type: string
  groupNumber: number | null
  changed: boolean
}

interface Props {
  title: string
  candidate: Candidate
  slots: Slot[]
  fixed: (OptMeeting & { courseName: string; type: string })[]
  now: Date
  onClose: () => void
}

// Tydzień po tygodniu: jak wyglądałby plan z tymi grupami.
export function PlanPreview({ title, candidate, slots, fixed, now, onClose }: Props) {
  const { displayName } = usePlanUi()

  const items: PreviewItem[] = [
    ...slots.flatMap((slot, i) => {
      const option = slot.options[candidate.choice[i]]
      const changed = slot.currentIndex !== null && candidate.choice[i] !== slot.currentIndex
      return option.meetings.map((m, j) => ({
        ...m,
        key: `${slot.id}-${j}`,
        courseName: slot.courseName,
        type: slot.classType,
        groupNumber: option.groupNumber,
        changed,
      }))
    }),
    ...fixed.map((m, j) => ({ ...m, key: `fixed-${j}`, groupNumber: null, changed: false })),
  ].sort((a, b) => a.start.getTime() - b.start.getTime())

  const weeks = [...new Set(items.map((m) => startOfWeek(m.start).getTime()))].sort((a, b) => a - b)
  const thisWeek = startOfWeek(now).getTime()
  // Startujemy od pierwszego tygodnia, w którym widać zmienione grupy (inaczej od bieżącego).
  const [weekIndex, setWeekIndex] = useState(() => {
    const firstChanged = items.find((m) => m.changed && startOfWeek(m.start).getTime() >= thisWeek)
    const target = firstChanged ? startOfWeek(firstChanged.start).getTime() : thisWeek
    return Math.max(0, weeks.findIndex((w) => w >= target))
  })
  const weekStart = new Date(weeks[weekIndex] ?? thisWeek)
  const weekItems = items.filter((m) => m.start >= weekStart && m.start < addDays(weekStart, 7))
  const hasWeekend = weekItems.some((m) => m.start.getDay() === 0 || m.start.getDay() === 6)
  const days = Array.from({ length: hasWeekend ? 7 : 5 }, (_, i) => addDays(weekStart, i))

  return (
    <Dialog title={title} onClose={onClose}>
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

      <div className="preview-days">
        {days.map((day) => {
          const dayItems = weekItems.filter((m) => isSameDay(m.start, day))
          return (
            <div key={day.getTime()} className="preview-day">
              <div className="course-day">{formatDay(day)}</div>
              {dayItems.length === 0 ? (
                <p className="muted small">Wolne</p>
              ) : (
                <ul className="preview-list">
                  {dayItems.map((m) => (
                    <li key={m.key} className={`preview-item type-${typeSlug(m.type)}${m.changed ? ' is-changed' : ''}`}>
                      <span className="preview-time">
                        {formatTime(m.start)}–{formatTime(m.end)}
                      </span>
                      <span className="preview-main">
                        <span className="preview-name">{displayName(m.courseName)}</span>
                        <span className="preview-meta">
                          {typeLabel(m.type)}
                          {m.groupNumber !== null && ` · gr. ${m.groupNumber}`}
                          {m.room && ` · s. ${m.room}`}
                          {m.building && ` · ${m.building}`}
                        </span>
                      </span>
                      {m.changed && <span className="badge">nowa grupa</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })}
      </div>
    </Dialog>
  )
}
