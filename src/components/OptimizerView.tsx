import { useMemo, useState } from 'react'
import { usePlanUi } from '../hooks/planUi'
import { useGroupOptions } from '../hooks/useGroupOptions'
import { useOptimizerSettings } from '../hooks/useOptimizerSettings'
import { formatUpdatedAt, startOfWeek } from '../lib/dates'
import type { PlanMeeting } from '../lib/edits'
import { deanFilter, deanGroupOf, deanGroups, optimize, type Candidate } from '../lib/optimizer'
import type { Meeting } from '../lib/usos'
import { CandidateCard, MetricsGrid } from './CandidateCard'
import { OptimizerSettingsPanel } from './OptimizerSettingsPanel'
import { PlanPreview } from './PlanPreview'

interface Props {
  planMeetings: Meeting[] // plan z USOS (bez ręcznych zmian) - źródło grup
  meetings: PlanMeeting[] // plan z dodatkami - własne zajęcia traktujemy jako stałe
  now: Date
  onBack: () => void
}

const TOP_LIMIT = 5

export function OptimizerView({ planMeetings, meetings, now, onBack }: Props) {
  const { prefs, extras } = usePlanUi()
  const settingsApi = useOptimizerSettings(extras)
  const { settings } = settingsApi

  // Liczy się tylko to, co przed nami: od początku bieżącego tygodnia.
  const weekStart = startOfWeek(now).getTime()
  const upcoming = useMemo(() => planMeetings.filter((m) => m.start.getTime() >= weekStart), [planMeetings, weekStart])
  const { slots, fetchedAt, status, refresh } = useGroupOptions(upcoming)

  const fixed = useMemo(
    () =>
      meetings
        .filter((m) => m.custom && !m.cancelled && m.start.getTime() >= weekStart)
        .map((m) => ({ start: m.start, end: m.end, room: m.room, building: null, courseName: m.courseName, type: m.type })),
    [meetings, weekStart],
  )

  const results = useMemo(() => {
    if (!slots || slots.length === 0) return null
    const base = { fixed, settings, gapThreshold: prefs.gapMinutes }
    const free = optimize(slots, { ...base, limit: TOP_LIMIT + 1 })
    const deans = deanGroups(slots).map((dean) => ({
      dean,
      best: optimize(slots, { ...base, limit: 1, filter: deanFilter(dean) }).candidates[0] ?? null,
    }))
    return { free, deans }
  }, [slots, fixed, settings, prefs.gapMinutes])

  const [preview, setPreview] = useState<{ title: string; candidate: Candidate } | null>(null)

  // Twoja grupa dziekańska: najczęstsza wśród obecnych grup.
  const myDean = useMemo(() => {
    const counts = new Map<number, number>()
    for (const s of slots ?? []) {
      if (s.currentIndex === null) continue
      const d = deanGroupOf(s.options[s.currentIndex].groupNumber)
      if (d !== null) counts.set(d, (counts.get(d) ?? 0) + 1)
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
  }, [slots])

  const current = results?.free.current ?? null
  const better = results?.free.candidates.filter((c) => c.changes > 0).slice(0, TOP_LIMIT) ?? []
  const bestIsCurrent = results?.free.candidates[0]?.changes === 0

  return (
    <section className="optimizer">
      <button type="button" className="back-button" onClick={onBack}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m15 6-6 6 6 6" />
        </svg>
        Wróć
      </button>

      <header className="course-header opt-header">
        <h2>
          Dobierz grupy <span className="alpha-badge">alpha</span>
        </h2>
        <p className="muted">
          Porównuję plany wszystkich grup Twoich przedmiotów z USOS i szukam układu, który najlepiej pasuje do Twoich
          kryteriów. Zmianę grupy trzeba potem załatwić w USOS albo w dziekanacie - Planer tylko podpowiada.
        </p>
      </header>

      {status.kind === 'loading' && (
        <div className="panel">
          <p className="loading-line">
            <span className="spinner" aria-hidden="true" />
            Pobieram plany wszystkich grup z USOS…
          </p>
          {status.progress && status.progress.total > 1 && (
            <progress className="opt-progress" value={status.progress.done} max={status.progress.total} />
          )}
        </div>
      )}

      {status.kind === 'error' && (
        <div className="panel">
          <p className="error">{status.message}</p>
          <button type="button" className="button small" onClick={refresh}>
            Spróbuj ponownie
          </button>
        </div>
      )}

      {slots && status.kind !== 'loading' && (
        <p className="sync">
          Plany grup z USOS: {fetchedAt ? formatUpdatedAt(new Date(fetchedAt), now) : '—'}{' '}
          <button type="button" className="link-button" onClick={refresh}>
            Odśwież
          </button>
        </p>
      )}

      {slots && slots.length === 0 && (
        <p className="empty-state">W planie nie ma nadchodzących zajęć z USOS, dla których można dobierać grupy.</p>
      )}

      {slots && slots.length > 0 && results && (
        <>
          <OptimizerSettingsPanel api={settingsApi} slots={slots} />

          {current && (
            <div className="panel">
              <div className="section-head">
                <h3 className="panel-title">Twój obecny plan</h3>
                <button
                  type="button"
                  className="button small secondary"
                  onClick={() => setPreview({ title: 'Obecny plan', candidate: current })}
                >
                  Podgląd tygodnia
                </button>
              </div>
              <MetricsGrid metrics={current.metrics} base={null} settings={settings} />
            </div>
          )}

          {results.deans.length > 1 && (
            <>
              <h3 className="section-title">Cała grupa dziekańska</h3>
              {results.deans.map(({ dean, best }) =>
                best ? (
                  <CandidateCard
                    key={dean}
                    title={
                      <>
                        Grupa dziekańska {dean}
                        {dean === myDean && <span className="badge opt-badge">Twoja</span>}
                      </>
                    }
                    candidate={best}
                    current={current}
                    slots={slots}
                    settings={settings}
                    onPreview={() => setPreview({ title: `Grupa dziekańska ${dean}`, candidate: best })}
                  />
                ) : (
                  <div key={dean} className="panel candidate">
                    <h4 className="candidate-title">Grupa dziekańska {dean}</h4>
                    <p className="muted small">Brak planu bez kolizji przy Twoich ograniczeniach.</p>
                  </div>
                ),
              )}
            </>
          )}

          <h3 className="section-title">Najlepsze zestawy grup</h3>
          {bestIsCurrent && (
            <p className="opt-note">
              Twój obecny plan jest najlepszy według wybranych kryteriów. Poniżej kolejne propozycje - jeśli ważne jest
              dla Ciebie coś innego, zmień kryteria wyżej.
            </p>
          )}
          {better.length === 0 ? (
            <p className="empty-state">
              {results.free.candidates.length === 0
                ? 'Żaden układ grup nie spełnia Twoich ograniczeń - usuń którąś blokadę albo przypięcie.'
                : 'Nie ma innych układów grup bez kolizji.'}
            </p>
          ) : (
            better.map((candidate, i) => {
              const title = i === 0 && !bestIsCurrent ? 'Najlepsza propozycja' : `Propozycja ${i + 1}`
              return (
                <CandidateCard
                  key={candidate.choice.join('-')}
                  title={title}
                  highlight={i === 0 && !bestIsCurrent}
                  candidate={candidate}
                  current={current}
                  slots={slots}
                  settings={settings}
                  onPreview={() => setPreview({ title, candidate })}
                />
              )
            })
          )}
          {results.free.truncated && (
            <p className="hint">Kombinacji jest bardzo dużo - sprawdziłem pierwsze {results.free.checked} z nich.</p>
          )}
        </>
      )}

      {preview && slots && (
        <PlanPreview
          title={preview.title}
          candidate={preview.candidate}
          slots={slots}
          fixed={fixed}
          now={now}
          onClose={() => setPreview(null)}
        />
      )}
    </section>
  )
}
