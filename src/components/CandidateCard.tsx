import { useState, type ReactNode } from 'react'
import { usePlanUi } from '../hooks/planUi'
import { formatDuration } from '../lib/dates'
import type { Candidate, GroupOption, OptimizerSettings, PlanMetrics, Slot } from '../lib/optimizer'
import { describeOption, usosGroupUrl } from '../lib/optimizerSettings'
import { typeLabel } from '../lib/usos'
import { GroupChangeDialog } from './GroupChangeDialog'

function formatMinutes(minutes: number): string {
  const rounded = Math.round(minutes / 5) * 5
  return rounded === 0 ? '0' : formatDuration(rounded)
}

function formatClock(minutes: number): string {
  const rounded = Math.round(minutes / 5) * 5
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, '0')}`
}

function formatDays(days: number): string {
  return days.toFixed(1).replace('.', ',')
}

interface MetricProps {
  label: string
  value: number
  base: number | null
  format: (v: number) => string
  formatDelta?: (v: number) => string // gdy różnica ma inny format niż wartość (godzina vs minuty)
  tolerance: number
}

// Wartość + zmiana względem obecnego planu (zielona = lepiej, czerwona = gorzej).
function Metric({ label, value, base, format, formatDelta = format, tolerance }: MetricProps) {
  const diff = base === null ? 0 : value - base
  const show = base !== null && Math.abs(diff) > tolerance
  return (
    <div className="metric">
      <span className="metric-label">{label}</span>
      <span className="metric-value">
        {format(value)}
        {show && (
          <span className={`metric-delta ${diff < 0 ? 'is-better' : 'is-worse'}`}>
            {diff < 0 ? '−' : '+'}
            {formatDelta(Math.abs(diff))}
          </span>
        )}
      </span>
    </div>
  )
}

export function MetricsGrid({
  metrics,
  base,
  settings,
}: {
  metrics: PlanMetrics
  base: PlanMetrics | null
  settings: OptimizerSettings
}) {
  return (
    <div className="metrics">
      <Metric label="Okienka / tydz." value={metrics.gapMinutes} base={base?.gapMinutes ?? null} format={formatMinutes} tolerance={2} />
      <Metric label="Dni na uczelni / tydz." value={metrics.days} base={base?.days ?? null} format={formatDays} tolerance={0.05} />
      {settings.dayStyle === 'early' ? (
        <Metric
          label="Koniec zajęć (średnio)"
          value={metrics.avgEndMinutes ?? 0}
          base={base?.avgEndMinutes ?? null}
          format={formatClock}
          formatDelta={formatMinutes}
          tolerance={2}
        />
      ) : (
        <>
          <Metric
            label={`Przed ${settings.startAfter} / tydz.`}
            value={metrics.earlyMinutes}
            base={base?.earlyMinutes ?? null}
            format={formatMinutes}
            tolerance={2}
          />
          <Metric
            label={`Po ${settings.endBefore} / tydz.`}
            value={metrics.lateMinutes}
            base={base?.lateMinutes ?? null}
            format={formatMinutes}
            tolerance={2}
          />
        </>
      )}
    </div>
  )
}

interface Props {
  title: ReactNode
  candidate: Candidate
  current: Candidate | null
  slots: Slot[]
  settings: OptimizerSettings
  onPreview: () => void
  onExport: () => void // eksport tego planu (zdjęcie, PDF, Excel, kalendarz)
  highlight?: boolean
}

export function CandidateCard({ title, candidate, current, slots, settings, onPreview, onExport, highlight = false }: Props) {
  const { displayName, isAdmin } = usePlanUi()
  // Prośba o zmianę grupy (na razie tylko administrator - wersja testowa).
  const [request, setRequest] = useState<{ slot: Slot; from: GroupOption; to: GroupOption } | null>(null)
  const changes = slots.flatMap((slot, i) => {
    const to = candidate.choice[i]
    if (slot.currentIndex === null || to === slot.currentIndex) return []
    return [{ slot, from: slot.options[slot.currentIndex], to: slot.options[to] }]
  })

  return (
    <div className={`panel candidate${highlight ? ' is-highlight' : ''}`}>
      <div className="section-head">
        <h4 className="candidate-title">{title}</h4>
        <span className="candidate-actions">
          <button type="button" className="button small secondary" onClick={onPreview}>
            Podgląd tygodnia
          </button>
          <button type="button" className="button small secondary" onClick={onExport}>
            Eksportuj
          </button>
        </span>
      </div>
      <MetricsGrid metrics={candidate.metrics} base={current?.metrics ?? null} settings={settings} />
      {changes.length === 0 ? (
        <p className="muted small">Bez zmian - to Twój obecny plan.</p>
      ) : (
        <ul className="change-list">
          {changes.map(({ slot, from, to }) => (
            <li key={slot.id}>
              <span className="change-course">
                {displayName(slot.courseName)} · {typeLabel(slot.classType)}
              </span>
              <span className="change-groups">
                gr. {from.groupNumber} <span className="muted">({describeOption(from)})</span> →{' '}
                <strong>gr. {to.groupNumber}</strong> <span className="muted">({describeOption(to)})</span>{' '}
                <a className="usos-link" href={usosGroupUrl(to)} target="_blank" rel="noreferrer">
                  terminy w USOS
                </a>
                {isAdmin && (
                  <button type="button" className="link-button change-request" onClick={() => setRequest({ slot, from, to })}>
                    Poproś o zmianę
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
      {request && (
        <GroupChangeDialog
          courseName={request.slot.courseName}
          classType={request.slot.classType}
          from={request.from}
          to={request.to}
          fromWhen={describeOption(request.from)}
          toWhen={describeOption(request.to)}
          onClose={() => setRequest(null)}
        />
      )}
    </div>
  )
}
