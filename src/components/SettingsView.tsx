import { useState } from 'react'
import type { PlanApi } from '../hooks/usePlan'
import { formatShortDay, formatUpdatedAt } from '../lib/dates'
import { plural } from '../lib/plural'
import { SourceForm } from './SourceForm'

interface Props {
  plan: PlanApi
  now: Date
  onSourceChanged: () => void
}

export function SettingsView({ plan, now, onSourceChanged }: Props) {
  const [changing, setChanging] = useState(false)
  const { source, meetings, updatedAt } = plan
  const courseCount = new Set(meetings.map((m) => m.courseName)).size
  const first = meetings[0]
  const last = meetings[meetings.length - 1]

  function handleReset() {
    if (window.confirm('Usunąć plan i zapisany link z tej przeglądarki?')) plan.reset()
  }

  return (
    <section>
      <h2 className="day-title">Źródło planu</h2>
      <div className="panel">
        <dl className="facts">
          <dt>Źródło</dt>
          <dd>{source?.kind === 'url' ? 'Link iCal z USOS (klucz ukryty)' : `Plik ${source?.name ?? ''}`}</dd>
          <dt>W planie</dt>
          <dd>
            {courseCount} {plural(courseCount, 'przedmiot', 'przedmioty', 'przedmiotów')},{' '}
            {meetings.length} {plural(meetings.length, 'termin', 'terminy', 'terminów')}
          </dd>
          {first && last && (
            <>
              <dt>Zakres</dt>
              <dd>
                {formatShortDay(first.start)} – {formatShortDay(last.start)}
              </dd>
            </>
          )}
          {updatedAt && (
            <>
              <dt>Aktualizacja</dt>
              <dd>{formatUpdatedAt(updatedAt, now)}</dd>
            </>
          )}
        </dl>

        {changing ? (
          <SourceForm
            plan={plan}
            onDone={() => {
              setChanging(false)
              onSourceChanged()
            }}
          />
        ) : (
          <div className="button-row">
            {source?.kind === 'url' && (
              <button
                type="button"
                className="button"
                onClick={() => void plan.refresh()}
                disabled={plan.status.kind === 'loading'}
              >
                Odśwież teraz
              </button>
            )}
            <button type="button" className="button secondary" onClick={() => setChanging(true)}>
              Zmień źródło planu
            </button>
          </div>
        )}
      </div>

      <div className="panel">
        <p className="hint">
          Plan i link są zapisane tylko w tej przeglądarce. Synchronizacja między telefonem a
          komputerem pojawi się w kolejnym etapie.
        </p>
        <button type="button" className="button danger" onClick={handleReset}>
          Usuń dane z tej przeglądarki
        </button>
      </div>
    </section>
  )
}
