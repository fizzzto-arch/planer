import { t } from '../lib/i18n'
import { usePlanUi } from '../hooks/planUi'
import { formatShortDay, parseDateKey } from '../lib/dates'
import { deadlineKindLabel } from '../lib/extras'
import type { Suggestion } from '../lib/sharedDeadlines'

const when = (date: string, time: string | null) => {
  const day = parseDateKey(date)
  return [day ? formatShortDay(day) : date, time].filter(Boolean).join(' ')
}

interface Props {
  courseName?: string // na stronie przedmiotu - tylko jego terminy (bez nazwy przedmiotu)
  limit?: number // w Dziś - najwyżej tyle, reszta w Przedmiotach
}

// "Od innych z roku": terminy pokazane przez innych z moich przedmiotów - "Dodaj u siebie" albo "Ukryj";
// a gdy autor przesunął termin, który już mam - "Zaktualizuj".
export function SharedSuggestions({ courseName, limit }: Props) {
  const { sharedSuggestions, adoptShared, dismissShared } = usePlanUi()
  const all = courseName ? sharedSuggestions.filter((s) => s.shared.courseName === courseName) : sharedSuggestions
  if (all.length === 0) return null
  const shown = limit ? all.slice(0, limit) : all

  return (
    <div className="shared-suggestions">
      <h4 className="shared-suggestions-title">{t('Od innych z roku')}</h4>
      <ul className="shared-suggestions-list">
        {shown.map((s) => (
          <SuggestionRow key={s.dismissKey} suggestion={s} showCourse={!courseName} onAdopt={adoptShared} onDismiss={dismissShared} />
        ))}
      </ul>
      {shown.length < all.length && (
        <p className="muted small">{t('i jeszcze {n} w zakładce Przedmioty', { n: all.length - shown.length })}</p>
      )}
    </div>
  )
}

function SuggestionRow({
  suggestion: s,
  showCourse,
  onAdopt,
  onDismiss,
}: {
  suggestion: Suggestion
  showCourse: boolean
  onAdopt: (s: Suggestion) => void
  onDismiss: (key: string) => void
}) {
  const d = s.shared
  const from = s.kind === 'new' && s.others > 0 ? t('od {name} i {n} innych', { name: d.sharedByName, n: s.others }) : t('od {name}', { name: d.sharedByName })
  return (
    <li className="shared-suggestion">
      <div className="shared-suggestion-main">
        <strong>
          {d.title || deadlineKindLabel(d.kind)}
          {showCourse && <span className="shared-suggestion-course"> · {d.courseName}</span>}
        </strong>
        <span className="muted">
          {when(d.date, d.time)} · {from}
        </span>
        {s.kind === 'changed' && (
          <span className="shared-suggestion-change">
            {t('Termin przesunięty - u Ciebie: {old}', { old: when(s.own.date, s.own.time) })}
          </span>
        )}
      </div>
      <div className="shared-suggestion-actions">
        <button type="button" className="button small" onClick={() => onAdopt(s)}>
          {s.kind === 'changed' ? t('Zaktualizuj') : t('Dodaj u siebie')}
        </button>
        <button type="button" className="link-button" onClick={() => onDismiss(s.dismissKey)}>
          {t('Ukryj')}
        </button>
      </div>
    </li>
  )
}
