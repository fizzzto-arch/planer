import { t } from '../lib/i18n'
import { useCourseId } from '../hooks/useCourseId'
import { meetingCounts, USOSWEB_COURSE_URL } from '../lib/courseInfo'
import { typeLabel, type Meeting } from '../lib/usos'

interface Props {
  meetings: Pick<Meeting, 'unitId' | 'type' | 'end' | 'cancelled'>[]
  now: Date
}

// Postęp: ile spotkań każdego typu za Tobą, i link do przedmiotu w USOSweb (literatura, zaliczenie).
export function CourseInfoSection({ meetings, now }: Props) {
  const current = useCourseId(meetings.find((m) => m.unitId)?.unitId ?? null)

  const counts = meetingCounts(meetings, now)
  if (counts.length === 0) return null

  return (
    <div className="panel course-info">
      <h3 className="panel-title">{t('Postęp')}</h3>
      <ul className="course-counts">
        {counts.map((c) => (
          <li key={c.type}>
            <span>{typeLabel(c.type)}</span>
            <span className="muted">
              {t('{done} z {total} za Tobą', { done: c.done, total: c.total })}
            </span>
            <progress className="opt-progress" value={c.done} max={c.total} aria-label={t('{type}: postęp', { type: typeLabel(c.type) })} />
          </li>
        ))}
      </ul>
      {current && (
        <a className="link-button" href={`${USOSWEB_COURSE_URL}${encodeURIComponent(current)}`} target="_blank" rel="noreferrer">
          {t('Przedmiot w USOSweb ↗')}
        </a>
      )}
    </div>
  )
}
