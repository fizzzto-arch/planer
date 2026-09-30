import { useEffect, useState } from 'react'
import { fetchCourseId, loadCachedCourseId, meetingCounts, saveCachedCourseId, USOSWEB_COURSE_URL } from '../lib/courseInfo'
import { typeLabel, type Meeting } from '../lib/usos'

interface Props {
  meetings: Pick<Meeting, 'unitId' | 'type' | 'end' | 'cancelled'>[]
  now: Date
}

// Postęp: ile spotkań każdego typu za Tobą, i link do przedmiotu w USOSweb (literatura, zaliczenie).
export function CourseInfoSection({ meetings, now }: Props) {
  const unitId = meetings.find((m) => m.unitId)?.unitId ?? null
  const [courseId, setCourseId] = useState<{ unitId: string; id: string } | null>(() => {
    const cached = unitId ? loadCachedCourseId(unitId) : null
    return cached && unitId ? { unitId, id: cached } : null
  })
  const current = courseId?.unitId === unitId ? courseId.id : null

  useEffect(() => {
    if (!unitId || current) return
    let cancelled = false
    fetchCourseId(unitId)
      .then((id) => {
        if (cancelled) return
        saveCachedCourseId(unitId, id)
        setCourseId({ unitId, id })
      })
      .catch(() => undefined) // bez linku - postęp i tak widać
    return () => {
      cancelled = true
    }
  }, [unitId, current])

  const counts = meetingCounts(meetings, now)
  if (counts.length === 0) return null

  return (
    <div className="panel course-info">
      <h3 className="panel-title">Postęp</h3>
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
      {current && (
        <a className="link-button" href={`${USOSWEB_COURSE_URL}${encodeURIComponent(current)}`} target="_blank" rel="noreferrer">
          Przedmiot w USOSweb ↗
        </a>
      )}
    </div>
  )
}
