import { t } from '../lib/i18n'
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { usePlanUi } from '../hooks/planUi'
import { courseKey } from '../lib/extras'
import {
  customScoring,
  formatGrade,
  formatNumber,
  meets,
  parsePoints,
  scoreResult,
  type CustomScoring,
  type PartResult,
  type Points,
  type ScoreItem,
  type ScoreResult,
  type Scoring,
} from '../lib/scoring'
import { typeSlug } from '../lib/usos'
import { ScoringEditor } from './ScoringEditor'

interface Props {
  courseName: string
  scoring: Scoring | null // zasady z regulaminu; null - własna rozpiska (albo jeszcze żadnej)
}

const SAVE_DELAY_MS = 600

// "2,5 pkt" albo "10,1%" (części z wynikami w procentach i średnia ważona).
const amount = (value: number, percent = false) =>
  percent ? `${formatNumber(value)}%` : t('{n} pkt', { n: formatNumber(value) })

// Punkty z zaliczenia: wpisujesz, co dostałeś, a Planer liczy, ile brakuje do zaliczenia i do kolejnej oceny.
// Bez zasad z regulaminu - własna rozpiska (pozycje z maksimum punktów i progi ocen).
export function ScoreSection({ courseName, scoring: rules }: Props) {
  const { extras } = usePlanUi()
  const saved = extras?.extras.scores.get(courseKey(courseName)) ?? null
  const custom = saved?.custom ?? null
  const scoring = rules ?? (custom ? customScoring(custom) : null)
  const [editing, setEditing] = useState(false)

  // Wpisany tekst (np. "12," w trakcie pisania) - pokazujemy go zamiast wartości z konta.
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const pending = useRef<{ points: Points; custom: CustomScoring | null } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const save = useRef(extras?.saveScores)
  useEffect(() => {
    save.current = extras?.saveScores
  }, [extras])

  const flush = () => {
    clearTimeout(timer.current)
    if (pending.current) save.current?.(courseName, pending.current)
    pending.current = null
  }
  // Wyjście ze strony w trakcie pisania - zapisujemy od razu.
  useEffect(() => () => flush(), []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!extras) return null

  if (!scoring) {
    return (
      <div className="panel score">
        <h3 className="panel-title">{t('Punkty')}</h3>
        <p className="muted">
          {t('Ułóż rozpiskę zaliczenia (np. kolokwia i laboratoria z maksymalną liczbą punktów), a Planer policzy, ile brakuje do zaliczenia i do oceny.')}
        </p>
        <button type="button" className="button small secondary" onClick={() => setEditing(true)}>
          {t('Ułóż rozpiskę')}
        </button>
        {editing && (
          <ScoringEditor
            initial={null}
            onClose={() => setEditing(false)}
            onSave={(next) => extras.saveScores(courseName, { points: {}, custom: next })}
          />
        )}
      </div>
    )
  }

  const items = new Map(scoring.parts.flatMap((p) => p.items.map((i) => [i.id, i] as const)))
  const invalid = (id: string) => {
    const text = drafts[id]
    if (text === undefined || text.trim() === '') return false
    const value = parsePoints(text)
    return value === null || value > (items.get(id)?.max ?? 0)
  }
  const points: Points = { ...(saved?.points ?? {}) }
  for (const [id, text] of Object.entries(drafts)) {
    const value = parsePoints(text)
    if (value === null || invalid(id)) delete points[id]
    else points[id] = value
  }
  // Tylko pozycje z obecnej rozpiski (po zmianie własnej rozpiski stare punkty nie liczą się).
  for (const id of Object.keys(points)) if (!items.has(id)) delete points[id]
  const result = scoreResult(scoring, points)

  const change = (item: ScoreItem, text: string) => {
    setDrafts((d) => ({ ...d, [item.id]: text }))
    const value = parsePoints(text)
    const next = { ...points }
    if (value === null || value > item.max) delete next[item.id]
    else next[item.id] = value
    pending.current = { points: next, custom }
    clearTimeout(timer.current)
    timer.current = setTimeout(flush, SAVE_DELAY_MS)
  }

  return (
    <div className="panel score">
      <div className="section-head">
        <h3 className="panel-title">{t('Punkty')}</h3>
        {!rules && (
          <button type="button" className="link-button" onClick={() => setEditing(true)}>
            {t('Zmień rozpiskę')}
          </button>
        )}
      </div>

      {result.parts.map((part) => (
        <PartRow
          key={part.part.id}
          part={part}
          exempt={result.exemption?.ok === true && scoring.exemption?.part !== part.part.id}
          value={(item) => drafts[item.id] ?? (points[item.id] !== undefined ? formatNumber(points[item.id]) : '')}
          invalid={invalid}
          onChange={change}
          onBlur={flush}
        />
      ))}

      <ScoreSummary result={result} scoring={scoring} />

      {editing && custom && (
        <ScoringEditor
          initial={custom}
          onClose={() => setEditing(false)}
          onSave={(next) => {
            const kept = new Set(next.items.map((i) => i.id))
            extras.saveScores(courseName, { points: Object.fromEntries(Object.entries(points).filter(([id]) => kept.has(id))), custom: next })
          }}
          onDelete={() => {
            setDrafts({})
            pending.current = null
            extras.saveScores(courseName, { points: {}, custom: null })
          }}
        />
      )}
    </div>
  )
}

interface PartProps {
  part: PartResult
  exempt: boolean // zwolnienie z egzaminu - tej części nie trzeba zaliczać
  value: (item: ScoreItem) => string
  invalid: (id: string) => boolean
  onChange: (item: ScoreItem, text: string) => void
  onBlur: () => void
}

function PartRow({ part: r, exempt, value, invalid, onChange, onBlur }: PartProps) {
  const { part } = r
  const label = part.label || t('Razem') // własna rozpiska - jedna część bez nazwy
  const unit = part.percent ? '%' : t('pkt')
  // Jedna pozycja o nazwie części (np. egzamin) - bez osobnej etykiety.
  const single = part.items.length === 1 && part.items[0].label === part.label
  // Kolejne ćwiczenia za tyle samo punktów - maksimum raz, obok pól (mieści się więcej w rzędzie).
  const uniform = !single && part.items.every((i) => i.max === part.items[0].max)
  const maxText = (max: number) => (part.percent ? '100%' : formatNumber(max))
  return (
    <section className="score-part">
      <header className="score-part-head">
        <span
          className="assessment-form"
          style={{ '--c': part.form === 'ALL' ? 'var(--muted)' : `var(--c-${typeSlug(part.form)})` } as CSSProperties}
        >
          {label}
        </span>
        <span className="score-part-sum">
          {part.percent ? `${formatNumber(r.percent)}%` : `${formatNumber(r.got)} / ${formatNumber(r.max)} ${unit}`}
        </span>
        <PartStatus result={r} exempt={exempt} />
      </header>
      <div className="score-items">
        {part.items.map((item) => (
          <label key={item.id} className={`score-item${single ? ' is-single' : ''}`}>
            {!single && <span className="score-item-label">{item.label}</span>}
            <input
              className={`text-input score-input${invalid(item.id) ? ' is-invalid' : ''}`}
              type="text"
              inputMode="decimal"
              enterKeyHint="done"
              autoComplete="off"
              aria-label={/^\d+$/.test(item.label) ? `${label} ${item.label}` : item.label}
              aria-invalid={invalid(item.id) || undefined}
              placeholder="–"
              value={value(item)}
              onChange={(e) => onChange(item, e.target.value)}
              onBlur={onBlur}
            />
            {!uniform && <span className="score-item-max">/ {maxText(item.max)}</span>}
          </label>
        ))}
        {uniform && (
          <span className="score-item-max score-items-each">
            {part.percent ? t('w %') : t('po {n} pkt', { n: maxText(part.items[0].max) })}
          </span>
        )}
      </div>
    </section>
  )
}

function PartStatus({ result: r, exempt }: { result: PartResult; exempt: boolean }) {
  if (r.part.bonus) return <span className="score-status muted">{t('dodatkowe – do oceny')}</span>
  if (exempt) return <span className="score-status is-ok">{t('zwolnienie ✓')}</span>
  const status: ReactNode[] = []
  if (r.pass && r.filled === 0) {
    // Jeszcze nic nie wpisane - sam próg.
    const n = amount(r.part.pass!.from, r.part.percent)
    status.push(
      <span key="pass" className="score-status muted">
        {r.part.pass!.above ? t('zalicza ponad {n}', { n }) : t('zalicza od {n}', { n })}
      </span>,
    )
  } else if (r.pass) {
    status.push(
      r.pass.ok ? (
        <span key="pass" className="score-status is-ok">
          {t('zaliczone ✓')}
        </span>
      ) : (
        <span key="pass" className={`score-status${r.pass.reachable ? '' : ' is-bad'}`}>
          {r.pass.reachable
            ? t('do zaliczenia brakuje {n}', { n: amount(r.pass.missing, r.part.percent) })
            : t('niezaliczone')}
        </span>
      ),
    )
  }
  if (r.items) {
    status.push(
      <span key="items" className={`score-status${r.items.passed >= r.items.need ? ' is-ok' : ' muted'}`}>
        {t('zaliczone ćwiczenia: {n} z {need}', { n: r.items.passed, need: r.items.need })}
      </span>,
    )
  }
  return <>{status}</>
}

function ScoreSummary({ result: r, scoring }: { result: ScoreResult; scoring: Scoring }) {
  const percent = r.unit === '%'
  const exempt = r.exemption?.ok === true && r.exemption.grade !== null
  const lines: { text: string; tone?: 'ok' | 'bad' }[] = []

  if (r.filled === 0) {
    lines.push({ text: t('Wpisuj punkty, gdy je dostaniesz – Planer policzy, ile brakuje do zaliczenia i do kolejnej oceny.') })
  } else {
    if (exempt) lines.push({ text: t('Zwolnienie z egzaminu – ocena {grade}', { grade: formatGrade(r.exemption!.grade!) }), tone: 'ok' })
    else if (r.exemption?.reachable)
      lines.push({ text: t('Do zwolnienia z egzaminu brakuje {n}', { n: amount(r.exemption.missing) }) })
    else if (r.exemption) lines.push({ text: t('Zwolnienia z egzaminu już nie będzie – liczy się egzamin') })

    if (r.filled === r.total) {
      lines.push(
        r.grade === 2
          ? { text: r.conditionsMet ? t('Ocena: 2') : t('Ocena: 2 – nie wszystkie części zaliczone'), tone: 'bad' }
          : { text: t('Ocena: {grade}', { grade: formatGrade(r.grade) }), tone: 'ok' },
      )
    } else if (r.forecast !== null && !exempt) {
      lines.push({ text: t('Prognoza: {grade} – jeśli dalej pójdzie Ci tak samo', { grade: formatGrade(r.forecast) }) })
    }

    if (r.next && !exempt) {
      const vars = { grade: formatGrade(r.next.grade), n: amount(r.next.missing, percent) }
      lines.push({
        text:
          r.filled === r.total
            ? t('Do {grade} zabrakło {n}', vars) // wszystko wpisane - już tylko informacja
            : r.next.reachable
              ? t('Do {grade}: brakuje {n}', vars)
              : t('Na {grade} nie wystarczy już punktów', { grade: vars.grade }),
      })
    }
  }

  return (
    <div className="score-summary">
      <ScoreBar result={r} scoring={scoring} />
      <p className="score-total">
        {percent
          ? t('Masz {value}% z 100%', { value: formatNumber(r.value) })
          : t('Masz {value} z {max} pkt', { value: formatNumber(r.value), max: formatNumber(r.max) })}
        {r.filled < r.total && r.filled > 0 && (
          <span className="muted">
            {' · '}
            {r.unit === '%'
              ? t('najwyżej {n}%', { n: formatNumber(Math.min(r.potential, 100)) })
              : t('do zdobycia jeszcze {n}', { n: formatNumber(r.potential - r.value) })}
          </span>
        )}
      </p>
      <ul className="score-lines">
        {lines.map((line) => (
          <li key={line.text} className={line.tone ? `is-${line.tone}` : undefined}>
            {line.text}
          </li>
        ))}
      </ul>
    </div>
  )
}

// Pasek: ile masz (pełny), ile jeszcze możliwe (jasny) i progi ocen.
function ScoreBar({ result: r, scoring }: { result: ScoreResult; scoring: Scoring }) {
  const at = (v: number) => `${Math.max(0, Math.min(100, r.max > 0 ? (v / r.max) * 100 : 0))}%`
  return (
    <div className="score-bar" aria-hidden="true">
      <div className="score-bar-track">
        <span className="score-bar-potential" style={{ width: at(r.potential) }} />
        <span className="score-bar-fill" style={{ width: at(r.value) }} />
        {scoring.scale.map((s) => (
          <span key={s.grade} className={`score-bar-tick${meets(r.value, s) ? ' is-reached' : ''}`} style={{ left: at(s.from) }} />
        ))}
      </div>
      <div className="score-bar-labels">
        {scoring.scale.map((s) => (
          <span key={s.grade} className={meets(r.value, s) ? 'is-reached' : undefined} style={{ left: at(s.from) }}>
            {formatGrade(s.grade)}
          </span>
        ))}
      </div>
    </div>
  )
}
