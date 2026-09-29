import { useState } from 'react'
import { addDays, formatWeekRange, startOfWeek } from '../lib/dates'
import type { PlanMeeting } from '../lib/edits'
import type { ExtraGroup } from '../lib/extraCourses'
import { semesterWeek } from '../lib/semesterWeek'
import { Dialog } from './Dialog'
import { WeekGrid } from './WeekGrid'

interface Props {
  group: ExtraGroup
  meetings: PlanMeeting[] // obecny plan
  now: Date
  onClose: () => void
}

// Zajęcia grupy w danym tygodniu jako wpisy planu (w tygodnie z właściwą parzystością).
function groupMeetings(group: ExtraGroup, weekStart: Date, odd: boolean | null): PlanMeeting[] {
  if (group.parity !== 'weekly' && odd !== null && odd !== (group.parity === 'odd')) return []
  // WF z USOS ma typ "FIZ" - w Planerze kolor WF.
  const type = group.classType === 'FIZ' ? 'WF' : group.classType
  return group.meetings.map((m, i) => {
    const day = addDays(weekStart, m.weekday - 1)
    const at = (minutes: number) => new Date(day.getFullYear(), day.getMonth(), day.getDate(), Math.floor(minutes / 60), minutes % 60)
    return {
      id: `extra-${group.id}-${weekStart.getTime()}-${i}`,
      courseName: group.courseName,
      type,
      start: at(m.start),
      end: at(m.end),
      room: group.place || null,
      building: null,
      address: null,
      groupNumber: group.groupNumber,
      unitId: null,
      usosUrl: null,
      cancelled: false,
      edited: false,
      custom: false,
      note: '',
      original: null,
    }
  })
}

// Terminarz tygodnia: obecny plan + wybrana grupa spoza planu (w pomarańczowej ramce).
export function ExtraPreview({ group, meetings, now, onClose }: Props) {
  const active = meetings.filter((m) => !m.cancelled)
  // Tygodnie z zajęciami - od bieżącego (albo od pierwszego, jeśli semestr jeszcze się nie zaczął).
  const weeks = [...new Set(active.map((m) => startOfWeek(m.start).getTime()))].sort((a, b) => a - b)
  const thisWeek = startOfWeek(now).getTime()
  // Start od pierwszego "pełnego" tygodnia (początek semestru bywa niepełny i nic nie pokazuje).
  const [weekIndex, setWeekIndex] = useState(() => {
    const counts = weeks.map((w) => active.filter((m) => startOfWeek(m.start).getTime() === w).length)
    const full = Math.max(0, ...counts) * 0.8
    const i = weeks.findIndex((w, k) => w >= thisWeek && counts[k] >= full)
    return i >= 0 ? i : Math.max(0, weeks.findIndex((w) => w >= thisWeek))
  })
  const weekStart = new Date(weeks[weekIndex] ?? thisWeek)
  const weekEnd = addDays(weekStart, 7)
  const sw = semesterWeek(weekStart, active)
  const extra = groupMeetings(group, weekStart, sw ? sw.odd : null)
  // Po godzinie - siatka układa nakładające się zajęcia w pasy według kolejności.
  const items = [...active.filter((m) => m.start >= weekStart && m.start < weekEnd), ...extra].sort(
    (a, b) => a.start.getTime() - b.start.getTime(),
  )
  const hasWeekend = items.some((m) => m.start.getDay() === 0 || m.start.getDay() === 6)
  const days = Array.from({ length: hasWeekend ? 7 : 5 }, (_, i) => addDays(weekStart, i))
  const highlight = new Set(extra.map((m) => m.id))

  return (
    <Dialog title={`${group.courseName} · gr. ${group.groupNumber}`} onClose={onClose} wide>
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
            {sw ? `tydzień ${sw.number} · ${sw.odd ? 'nieparzysty' : 'parzysty'} · ` : ''}
            {extra.length > 0 ? 'nowe zajęcia mają pomarańczową ramkę' : 'w tym tygodniu ta grupa nie ma zajęć'}
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
      <div key={weekStart.getTime()} className="preview-grid">
        <WeekGrid days={days} meetings={items} now={now} readOnly highlightIds={highlight} />
      </div>
    </Dialog>
  )
}
