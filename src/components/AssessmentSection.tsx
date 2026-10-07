import { t } from '../lib/i18n'
import type { CSSProperties } from 'react'
import { usePlanUi } from '../hooks/planUi'
import { useCourseId } from '../hooks/useCourseId'
import { formLabel, nextDeadlineTitle, type CourseAssessment } from '../lib/assessment'
import { USOSWEB_COURSE_URL } from '../lib/courseInfo'
import { typeSlug } from '../lib/usos'

interface Props {
  courseName: string
  assessment: CourseAssessment
  unitId: string | null // do linku do strony przedmiotu w USOSweb (tam jest regulamin)
}

// Zaliczenie przedmiotu: co składa się na ocenę z każdej formy zajęć, skala ocen, daty kolokwiów
// jednym stuknięciem do terminów i regulamin (w USOSweb - plików nie trzymamy w Planerze).
export function AssessmentSection({ courseName, assessment, unitId }: Props) {
  const { extras, editDeadline } = usePlanUi()
  const courseId = useCourseId(unitId)
  const deadlines = extras?.extras.deadlines.filter((d) => d.courseName === courseName) ?? []

  return (
    // W zwijanym panelu "Zaliczenie" na stronie przedmiotu (tytuł i podsumowanie ma panel).
    <div className="assessment">
      <ul className="assessment-rows">
        {assessment.rows.map((row, i) => {
          const add = row.add
          const added = add ? deadlines.filter((d) => d.kind === add.kind && d.title.startsWith(add.title)).length : 0
          const complete = add?.count !== undefined && added >= add.count
          return (
            <li key={i}>
              <span
                className="assessment-form"
                style={{ '--c': row.form === 'ALL' ? 'var(--muted)' : `var(--c-${typeSlug(row.form)})` } as CSSProperties}
              >
                {formLabel(row.form)}
              </span>
              <span className="assessment-text">{row.text}</span>
              {add && extras && (
                <span className="assessment-add">
                  {added > 0 && (
                    <span className="muted">
                      {add.count !== undefined
                        ? t('w terminach: {n} z {total}', { n: added, total: add.count })
                        : t('w terminach: {n}', { n: added })}
                    </span>
                  )}
                  {!complete && (
                    <button
                      type="button"
                      className="link-button"
                      onClick={() => editDeadline({ courseName, kind: add.kind, title: nextDeadlineTitle(add, added) })}
                    >
                      {t('+ Dodaj datę')}
                    </button>
                  )}
                </span>
              )}
            </li>
          )
        })}
      </ul>
      {assessment.grading && <p className="assessment-grading">{assessment.grading}</p>}
      {assessment.notes && assessment.notes.length > 0 && (
        <div className="assessment-notes">
          <h4>{t('Warto wiedzieć')}</h4>
          <ul>
            {assessment.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      )}
      <p className="assessment-source">
        {assessment.source.kind === 'regulamin'
          ? t('Na podstawie regulaminu przedmiotu {year}.', { year: assessment.source.year })
          : t('Na podstawie sylabusa {year} - dokładne zasady (liczba kolokwiów, punkty, progi) są w regulaminie przedmiotu.', {
              year: assessment.source.year,
            })}
        {courseId && (
          <>
            {' '}
            <a href={`${USOSWEB_COURSE_URL}${encodeURIComponent(courseId)}`} target="_blank" rel="noreferrer">
              {t('Regulamin w USOSweb ↗')}
            </a>
          </>
        )}
      </p>
    </div>
  )
}
