import { t } from '../lib/i18n'
import { useState } from 'react'
import { addDays, formatWeekRange, startOfWeek } from '../lib/dates'
import type { PlanMeeting } from '../lib/edits'
import { extraGroupWeek } from '../lib/candidatePlan'
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
  const extra = extraGroupWeek(group, weekStart, sw ? sw.odd : null)
  // Po godzinie - siatka układa nakładające się zajęcia w pasy według kolejności.
  const items = [...active.filter((m) => m.start >= weekStart && m.start < weekEnd), ...extra].sort(
    (a, b) => a.start.getTime() - b.start.getTime(),
  )
  const hasWeekend = items.some((m) => m.start.getDay() === 0 || m.start.getDay() === 6)
  const days = Array.from({ length: hasWeekend ? 7 : 5 }, (_, i) => addDays(weekStart, i))
  const highlight = new Set(extra.map((m) => m.id))

  return (
    <Dialog title={`${group.courseName} · ${t('gr. {n}', { n: group.groupNumber })}`} onClose={onClose} wide>
      <div className="week-nav preview-nav">
        <button
          type="button"
          className="icon-button"
          aria-label={t('Poprzedni tydzień')}
          disabled={weekIndex === 0}
          onClick={() => setWeekIndex((i) => i - 1)}
        >
          ‹
        </button>
        <div className="week-label">
          <strong>{formatWeekRange(weekStart)}</strong>
          <span className="muted">
            {sw ? (sw.odd ? t('tydzień {n} · nieparzysty', { n: sw.number }) : t('tydzień {n} · parzysty', { n: sw.number })) + ' · ' : ''}
            {extra.length > 0 ? t('nowe zajęcia mają pomarańczową ramkę') : t('w tym tygodniu ta grupa nie ma zajęć')}
          </span>
        </div>
        <button
          type="button"
          className="icon-button"
          aria-label={t('Następny tydzień')}
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
