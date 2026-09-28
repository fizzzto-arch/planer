import type { CSSProperties } from 'react'
import { countdownLabel, urgency } from '../lib/deadlines'
import { formatShortDay, parseDateKey } from '../lib/dates'
import { deadlineKindLabel, type Deadline } from '../lib/extras'
import { usePlanUi } from '../hooks/planUi'

interface Props {
  deadlines: Deadline[]
  now: Date
  showCourse?: boolean
  compact?: boolean // bez przycisku "zrobione" (np. pasek w widoku Dziś)
}

export function DeadlineList({ deadlines, now, showCourse = false, compact = false }: Props) {
  const { extras, editDeadline, displayName } = usePlanUi()

  return (
    <ul className={`deadline-list${compact ? ' is-compact' : ''}`}>
      {deadlines.map((d, i) => {
        const date = parseDateKey(d.date)
        const classes = ['deadline-item', `urgency-${urgency(d, now)}`, `kind-${d.kind}`]
        if (d.done) classes.push('is-done')
        return (
          <li key={d.id} className={classes.join(' ')} style={{ '--i': i } as CSSProperties}>
            {!compact && (
              <button
                type="button"
                className="deadline-check"
                aria-label={d.done ? 'Oznacz jako niezrobione' : 'Oznacz jako zrobione'}
                aria-pressed={d.done}
                onClick={() => extras?.saveDeadline({ ...d, done: !d.done })}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m6 12.5 4 4 8-9" />
                </svg>
              </button>
            )}
            <button type="button" className="deadline-main" onClick={() => editDeadline(d)}>
              <span className="deadline-top">
                <span className="deadline-kind">{deadlineKindLabel(d.kind)}</span>
                <span className="deadline-title">{d.title || deadlineKindLabel(d.kind)}</span>
              </span>
              <span className="deadline-meta">
                {date && formatShortDay(date)}
                {d.time && ` · ${d.time}`}
                {showCourse && d.courseName && ` · ${displayName(d.courseName)}`}
              </span>
            </button>
            <span className="deadline-countdown">{d.done ? 'zrobione' : countdownLabel(d, now)}</span>
          </li>
        )
      })}
    </ul>
  )
}
