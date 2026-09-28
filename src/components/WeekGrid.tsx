import type { CSSProperties } from 'react'
import { formatShortDay, formatTime, isSameDay } from '../lib/dates'
import type { PlanMeeting } from '../lib/edits'
import { deadlineKindLabel } from '../lib/extras'
import { usePlanUi } from '../hooks/planUi'
import { shortBuilding, typeLabel, typeSlug } from '../lib/usos'

const PX_PER_MIN = 1.1
const DEFAULT_FIRST_HOUR = 8
const DEFAULT_LAST_HOUR = 16
// Krótsze zajęcia pokazują nazwę i szczegóły w jednej linii każde.
const SHORT_EVENT_MIN = 75

interface Props {
  days: Date[]
  meetings: PlanMeeting[] // zajęcia z tego tygodnia
  now: Date
  readOnly?: boolean // podgląd (np. propozycja optymalizatora): kliknięcie nic nie otwiera
  highlightIds?: Set<string> // zajęcia do wyróżnienia (np. nowe grupy)
}

function minuteOfDay(d: Date): number {
  return d.getHours() * 60 + d.getMinutes()
}

// Nakładające się zajęcia dzielą szerokość kolumny na pasy.
function layoutLanes(dayMeetings: PlanMeeting[]): Map<string, { lane: number; lanes: number }> {
  const out = new Map<string, { lane: number; lanes: number }>()
  let cluster: { id: string; lane: number }[] = []
  let laneEnds: number[] = []
  let clusterEnd = -Infinity

  const flush = () => {
    for (const c of cluster) out.set(c.id, { lane: c.lane, lanes: laneEnds.length })
    cluster = []
    laneEnds = []
  }

  for (const m of dayMeetings) {
    const start = m.start.getTime()
    const end = m.end.getTime()
    if (start >= clusterEnd) {
      flush()
      clusterEnd = -Infinity
    }
    let lane = laneEnds.findIndex((laneEnd) => laneEnd <= start)
    if (lane === -1) {
      lane = laneEnds.length
      laneEnds.push(end)
    } else {
      laneEnds[lane] = end
    }
    cluster.push({ id: m.id, lane })
    clusterEnd = Math.max(clusterEnd, end)
  }
  flush()
  return out
}

export function WeekGrid({ days, meetings, now, readOnly = false, highlightIds }: Props) {
  const { openCourse, deadlinesFor, displayName } = usePlanUi()
  const firstHour = Math.min(
    DEFAULT_FIRST_HOUR,
    ...meetings.map((m) => Math.floor(minuteOfDay(m.start) / 60)),
  )
  const lastHour = Math.max(DEFAULT_LAST_HOUR, ...meetings.map((m) => Math.ceil(minuteOfDay(m.end) / 60)))
  const firstMin = firstHour * 60
  const totalMin = (lastHour - firstHour) * 60
  const hours = Array.from({ length: lastHour - firstHour + 1 }, (_, i) => firstHour + i)
  const nowMin = minuteOfDay(now)

  return (
    <div className="week-grid" style={{ gridTemplateColumns: `3rem repeat(${days.length}, 1fr)` }}>
      <div />
      {days.map((day) => (
        <div key={day.getTime()} className={`grid-day-head${isSameDay(day, now) ? ' is-today' : ''}`}>
          {formatShortDay(day)}
        </div>
      ))}

      <div className="grid-hours" style={{ height: totalMin * PX_PER_MIN }}>
        {hours.map((h) => (
          <span key={h} style={{ top: (h * 60 - firstMin) * PX_PER_MIN }}>
            {h}:00
          </span>
        ))}
      </div>

      {days.map((day) => {
        const dayMeetings = meetings.filter((m) => isSameDay(m.start, day))
        const lanes = layoutLanes(dayMeetings)
        const isToday = isSameDay(day, now)
        return (
          <div
            key={day.getTime()}
            className={`grid-col${isToday ? ' is-today' : ''}`}
            style={{ height: totalMin * PX_PER_MIN, backgroundSize: `100% ${60 * PX_PER_MIN}px` }}
          >
            {dayMeetings.map((m, i) => {
              const { lane, lanes: laneCount } = lanes.get(m.id) ?? { lane: 0, lanes: 1 }
              const building = shortBuilding(m.building)
              const details = [
                typeLabel(m.type),
                m.groupNumber !== null ? `gr. ${m.groupNumber}` : null,
                m.room ? `s. ${m.room}` : null,
                building,
              ].filter(Boolean)
              const durationMin = minuteOfDay(m.end) - minuteOfDay(m.start)
              const classes = ['grid-event', `type-${typeSlug(m.type)}`]
              if (durationMin < SHORT_EVENT_MIN) classes.push('is-short')
              if (m.end <= now) classes.push('is-past')
              if (m.cancelled) classes.push('is-cancelled')
              if (m.custom) classes.push('is-custom')
              if (highlightIds?.has(m.id)) classes.push('is-highlight')
              if (readOnly) classes.push('is-readonly')
              const deadlines = readOnly ? [] : deadlinesFor(m)
              const tooltip = [
                m.courseName,
                `${formatTime(m.start)}–${formatTime(m.end)}`,
                details.join(' · '),
                ...deadlines.map((d) => `📌 ${d.title || deadlineKindLabel(d.kind)}`),
                m.note ? `Notatka: ${m.note}` : null,
                m.edited ? 'Zmienione ręcznie' : null,
              ]
                .filter(Boolean)
                .join('\n')
              return (
                <button
                  type="button"
                  key={m.id}
                  className={classes.join(' ')}
                  title={tooltip}
                  onClick={readOnly ? undefined : () => openCourse(m.courseName)}
                  tabIndex={readOnly ? -1 : undefined}
                  style={{
                    '--i': i,
                    top: (minuteOfDay(m.start) - firstMin) * PX_PER_MIN,
                    height: Math.max(durationMin, 20) * PX_PER_MIN,
                    left: `${(lane / laneCount) * 100}%`,
                    width: `${100 / laneCount}%`,
                  } as CSSProperties}
                >
                  <span className="grid-event-title">{displayName(m.courseName)}</span>
                  <span className="grid-event-meta">
                    {formatTime(m.start)}–{formatTime(m.end)} · {details.join(' · ')}
                  </span>
                  {(deadlines.length > 0 || m.note || m.edited) && (
                    <span className="grid-event-flags" aria-hidden="true">
                      {deadlines.length > 0 && <span className="flag flag-deadline" />}
                      {m.note && <span className="flag flag-note" />}
                      {m.edited && <span className="flag flag-edited" />}
                    </span>
                  )}
                </button>
              )
            })}
            {isToday && nowMin >= firstMin && nowMin <= firstMin + totalMin && (
              <div className="now-line" style={{ top: (nowMin - firstMin) * PX_PER_MIN }} />
            )}
          </div>
        )
      })}
    </div>
  )
}
