import { locale, t } from '../lib/i18n'
import type { CSSProperties } from 'react'
import { formatShortDay, formatTime, isSameDay, toDateKey } from '../lib/dates'
import { dayLabel, eventName, shortDayLabel } from '../lib/academicCalendar'
import type { PlanMeeting } from '../lib/edits'
import { deadlineKindLabel } from '../lib/extras'
import { usePlanUi } from '../hooks/planUi'
import { placeLabel, shortBuilding, typeLabel, typeShort, typeSlug } from '../lib/usos'

const PX_PER_MIN = 1.1
const COMPACT_PX_PER_MIN = 0.85 // telefon: cały dzień bez długiego przewijania
const DEFAULT_FIRST_HOUR = 8
const DEFAULT_LAST_HOUR = 16
// Krótsze zajęcia pokazują nazwę i szczegóły w jednej linii każde.
const SHORT_EVENT_MIN = 75
// Telefon: wysokości linii w okienku (px, jak w extras.css) - ile się mieści. Najkrótsze zajęcia
// (45 min) mieszczą wszystkie trzy linie.
const COMPACT_TITLE_LINE = 13.5 // nazwa (0.7rem × 1.2 - z miejscem na ogonki liter: g, y, ę)
const COMPACT_TYPE_LINE = 11 // rodzaj (0.62rem × 1.1)
const COMPACT_TIME_LINE = 10.6 // godziny drobnym drukiem (0.6rem × 1.1)
const COMPACT_CHROME = 2 // ramka (bez odstępów w pionie - napisy i tak są na środku)

interface Props {
  days: Date[]
  meetings: PlanMeeting[] // zajęcia z tego tygodnia
  now: Date
  readOnly?: boolean // podgląd (np. propozycja optymalizatora): kliknięcie nic nie otwiera
  highlightIds?: Set<string> // zajęcia do wyróżnienia (np. nowe grupy)
  // Telefon: wąskie kolumny - skrót nazwy i sala, krótkie nagłówki dni, ciaśniejsza skala godzin.
  compact?: boolean
}

// Co zmieści się w okienku na telefonie: nazwa zawsze, potem godziny, potem rodzaj (gdyby zajęcia były
// krótsze niż 45 min - bez rodzaju, jest jeszcze kolor), a nazwa dostaje tyle linii, ile zostało (najwyżej 3).
function compactFit(heightPx: number): { time: boolean; type: boolean; titleLines: number } {
  const room = heightPx - COMPACT_CHROME
  const time = room >= COMPACT_TITLE_LINE + COMPACT_TIME_LINE
  const type = room >= COMPACT_TITLE_LINE + COMPACT_TYPE_LINE + COMPACT_TIME_LINE
  const left = room - (time ? COMPACT_TIME_LINE : 0) - (type ? COMPACT_TYPE_LINE : 0)
  return { time, type, titleLines: Math.max(1, Math.min(3, Math.floor(left / COMPACT_TITLE_LINE))) }
}

// Szerokość napisu w em czcionki strony - każdy telefon ma inną czcionkę (iPhone, Samsung, Pixel), więc
// godziny w okienku dostają czcionkę dobraną do swojej szerokości i zawsze mieszczą się w jednej linii.
const FALLBACK_EM = 6.4 // bez pomiaru: zapas jak dla szerokiej czcionki
const emWidths = new Map<string, number>()
let measure: CanvasRenderingContext2D | null | undefined
function textEm(text: string): number {
  const known = emWidths.get(text)
  if (known !== undefined) return known
  if (measure === undefined) {
    try {
      measure = document.createElement('canvas').getContext('2d')
      if (measure) measure.font = `400 100px ${getComputedStyle(document.body).fontFamily}`
    } catch {
      measure = null
    }
  }
  const width = measure ? measure.measureText(text).width / 100 : 0
  const em = width > 2 && width < 12 ? width : FALLBACK_EM
  emWidths.set(text, em)
  return em
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

export function WeekGrid({ days, meetings, now, readOnly = false, highlightIds, compact = false }: Props) {
  const { openCourse, deadlinesFor, shortName, calendarEvents, notesOn } = usePlanUi()
  const px = compact ? COMPACT_PX_PER_MIN : PX_PER_MIN
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
    // minmax(0, 1fr): kolumny zawsze równe - długi tekst w nagłówku nie poszerza swojego dnia.
    <div
      className={`week-grid${compact ? ' is-compact' : ''}`}
      style={{ gridTemplateColumns: `${compact ? 'var(--grid-hours)' : '3rem'} repeat(${days.length}, minmax(0, 1fr))` }}
    >
      <div />
      {days.map((day) => {
        // Święto, przerwa, sesja - krótko ("Święto"), pełna nazwa w podpowiedzi.
        const special = dayLabel(calendarEvents, toDateKey(day))
        return (
          <div key={day.getTime()} className={`grid-day-head${isSameDay(day, now) ? ' is-today' : ''}`}>
            {compact ? (
              <>
                <span className="grid-day-name">{day.toLocaleDateString(locale(), { weekday: 'short' })}</span>
                <span className="grid-day-number">{day.getDate()}</span>
              </>
            ) : (
              formatShortDay(day)
            )}
            {special && (
              <span className="calendar-label" title={eventName(special)}>
                {shortDayLabel(special)}
              </span>
            )}
          </div>
        )
      })}

      <div className="grid-hours" style={{ height: totalMin * px }}>
        {hours.map((h) => (
          <span key={h} style={{ top: (h * 60 - firstMin) * px }}>
            {compact ? h : `${h}:00`}
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
            style={{ height: totalMin * px, backgroundSize: `100% ${60 * px}px` }}
          >
            {dayMeetings.map((m, i) => {
              const { lane, lanes: laneCount } = lanes.get(m.id) ?? { lane: 0, lanes: 1 }
              const building = shortBuilding(m.building)
              const details = [
                typeLabel(m.type),
                m.groupNumber !== null ? t('gr. {n}', { n: m.groupNumber }) : null,
                placeLabel(m),
                building,
              ].filter(Boolean)
              const durationMin = minuteOfDay(m.end) - minuteOfDay(m.start)
              const height = Math.max(durationMin, 20) * px
              const fit = compactFit(height)
              const classes = ['grid-event', `type-${typeSlug(m.type)}`]
              if (durationMin < SHORT_EVENT_MIN) classes.push('is-short')
              if (m.end <= now) classes.push('is-past')
              if (m.cancelled) classes.push('is-cancelled')
              if (m.custom) classes.push('is-custom')
              if (highlightIds?.has(m.id)) classes.push('is-highlight')
              if (readOnly) classes.push('is-readonly')
              const deadlines = readOnly ? [] : deadlinesFor(m)
              const note = notesOn ? m.note : '' // notatki - gdy włączone w ustawieniach
              const tooltip = [
                m.courseName,
                `${formatTime(m.start)}–${formatTime(m.end)}`,
                details.join(' · '),
                ...deadlines.map((d) => `📌 ${d.title || deadlineKindLabel(d.kind)}`),
                note ? t('Notatka: {note}', { note }) : null,
                m.edited ? t('Zmienione ręcznie') : null,
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
                    top: (minuteOfDay(m.start) - firstMin) * px,
                    height,
                    left: `${(lane / laneCount) * 100}%`,
                    width: `${100 / laneCount}%`,
                  } as CSSProperties}
                >
                  {compact ? (
                    // Telefon: skrót nazwy, rodzaj i godziny drobnym drukiem, razem na środku okienka
                    // (sala - po stuknięciu, na stronie przedmiotu).
                    <span className="grid-event-body">
                      <span className="grid-event-title" style={{ WebkitLineClamp: fit.titleLines }}>
                        {shortName(m.courseName, true)}
                      </span>
                      {fit.type && <span className="grid-event-meta">{typeShort(m.type)}</span>}
                      {fit.time && (
                        <span
                          className="grid-event-time"
                          style={{ '--time-em': textEm(`${formatTime(m.start)}–${formatTime(m.end)}`) } as CSSProperties}
                        >
                          {formatTime(m.start)}–{formatTime(m.end)}
                        </span>
                      )}
                    </span>
                  ) : (
                    <>
                      <span className="grid-event-title">{shortName(m.courseName)}</span>
                      <span className="grid-event-meta">
                        {formatTime(m.start)}–{formatTime(m.end)} · {details.join(' · ')}
                      </span>
                    </>
                  )}
                  {(deadlines.length > 0 || note || m.edited) && (
                    <span className="grid-event-flags" aria-hidden="true">
                      {deadlines.length > 0 && <span className="flag flag-deadline" />}
                      {note && <span className="flag flag-note" />}
                      {m.edited && <span className="flag flag-edited" />}
                    </span>
                  )}
                </button>
              )
            })}
            {isToday && nowMin >= firstMin && nowMin <= firstMin + totalMin && (
              <div className="now-line" style={{ top: (nowMin - firstMin) * px }} />
            )}
          </div>
        )
      })}
    </div>
  )
}
