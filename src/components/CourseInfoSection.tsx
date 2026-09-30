import { useEffect, useState } from 'react'
import { errorMessage } from '../lib/errors'
import { fetchCourseInfo, loadCachedCourseInfo, meetingCounts, saveCachedCourseInfo, type CourseInfo } from '../lib/courseInfo'
import { typeLabel, type Meeting } from '../lib/usos'

interface Props {
  meetings: Pick<Meeting, 'unitId' | 'type' | 'end' | 'cancelled'>[]
  now: Date
}

// Ile spotkań za Tobą (z planu) i to, co o przedmiocie mówi USOS: kod, ECTS, jednostka, opis.
export function CourseInfoSection({ meetings, now }: Props) {
  const unitId = meetings.find((m) => m.unitId)?.unitId ?? null
  const [info, setInfo] = useState<{ unitId: string; info: CourseInfo } | null>(() => {
    const cached = unitId ? loadCachedCourseInfo(unitId) : null
    return cached && unitId ? { unitId, info: cached } : null
  })
  const [error, setError] = useState<string | null>(null)
  const current = info?.unitId === unitId ? info.info : null

  useEffect(() => {
    if (!unitId || current) return
    let cancelled = false
    fetchCourseInfo(unitId)
      .then((fresh) => {
        if (cancelled) return
        saveCachedCourseInfo(unitId, fresh)
        setInfo({ unitId, info: fresh })
      })
      .catch((e) => {
        if (!cancelled) setError(errorMessage(e))
      })
    return () => {
      cancelled = true
    }
  }, [unitId, current])

  const counts = meetingCounts(meetings, now)
  if (counts.length === 0 && !unitId) return null

  return (
    <div className="panel course-info">
      <h3 className="panel-title">O przedmiocie</h3>
      {counts.length > 0 && (
        <ul className="course-counts">
          {counts.map((c) => (
            <li key={c.type}>
              <span>{typeLabel(c.type)}</span>
              <span className="muted">
                {c.done} z {c.total} za Tobą
              </span>
              <progress className="opt-progress" value={c.done} max={c.total} aria-label={`${typeLabel(c.type)}: postęp`} />
            </li>
          ))}
        </ul>
      )}
      {unitId && !current && !error && <p className="muted loading-line">Sprawdzam w USOS…</p>}
      {error && !current && <p className="muted">Nie udało się pobrać opisu z USOS. {error}</p>}
      {current && (
        <>
          <dl className="facts">
            {current.code && (
              <>
                <dt>Kod</dt>
                <dd>{current.code}</dd>
              </>
            )}
            {current.ects !== null && (
              <>
                <dt>ECTS</dt>
                <dd>{current.ects}</dd>
              </>
            )}
            {current.unit && (
              <>
                <dt>Prowadzi</dt>
                <dd>{current.unit}</dd>
              </>
            )}
          </dl>
          {[
            ['Zasady zaliczenia', current.assessment],
            ['Treść zajęć', current.description],
            ['Literatura', current.bibliography],
          ]
            .filter(([, text]) => text)
            .map(([title, text]) => (
              <details key={title} className="collapsible">
                <summary>{title}</summary>
                <p className="course-text">{text}</p>
              </details>
            ))}
          <a className="link-button" href={current.profileUrl} target="_blank" rel="noreferrer">
            Regulamin i forma zaliczenia w USOSweb ↗
          </a>
        </>
      )}
    </div>
  )
}
