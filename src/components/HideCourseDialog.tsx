import { t } from '../lib/i18n'
import { useState, type FormEvent } from 'react'
import { usePlanUi } from '../hooks/planUi'
import { withHidden } from '../lib/hiddenClasses'
import { typeLabel } from '../lib/usos'
import { Dialog } from './Dialog'

interface Props {
  courseName: string
  types: string[] // rodzaje zajęć przedmiotu w planie
  onHidden: (wholeCourse: boolean) => void
  onClose: () => void
}

// Usunięcie przedmiotu (albo jednego rodzaju zajęć) z planu - USOS czasem pokazuje zajęcia, których nie ma.
// Odwracalne: "Usunięte z planu" na dole zakładki Przedmioty.
export function HideCourseDialog({ courseName, types, onHidden, onClose }: Props) {
  const { prefs, setHiddenClasses, displayName } = usePlanUi()
  const [type, setType] = useState<string | null>(null) // null - cały przedmiot

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setHiddenClasses(withHidden(prefs.hiddenClasses, { course: courseName, type }))
    onClose()
    onHidden(type === null)
  }

  return (
    <Dialog title={t('Usuń z planu')} onClose={onClose}>
      <form className="form-grid" onSubmit={handleSubmit}>
        <p className="hide-course-lead">
          {t('Usunięte zajęcia znikną z planu i nie wrócą po odświeżeniu z USOS.')}
        </p>
        {types.length > 1 && (
          <div className="hide-course-options" role="radiogroup" aria-label={t('Co usunąć')}>
            {[null, ...types].map((option) => (
              <label key={option ?? 'all'} className="check-field">
                <input type="radio" name="hide-type" checked={type === option} onChange={() => setType(option)} />
                {option === null
                  ? t('Cały przedmiot „{name}”', { name: displayName(courseName) })
                  : t('Tylko: {type}', { type: typeLabel(option) })}
              </label>
            ))}
          </div>
        )}
        <p className="muted hide-course-note">
          {t('Notatki, terminy i punkty zostają. Przywrócisz zajęcia na dole zakładki Przedmioty.')}
        </p>
        <div className="dialog-actions">
          <span className="spacer" />
          <button type="button" className="button secondary" onClick={onClose}>
            {t('Anuluj')}
          </button>
          <button type="submit" className="button danger">
            {t('Usuń')}
          </button>
        </div>
      </form>
    </Dialog>
  )
}
