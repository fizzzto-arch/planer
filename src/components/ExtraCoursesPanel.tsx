import { useMemo, useState, type FormEvent } from 'react'
import { usePlanUi } from '../hooks/planUi'
import { withExtraGroup } from '../lib/candidatePlan'
import { formatDuration, startOfWeek } from '../lib/dates'
import type { PlanMeeting } from '../lib/edits'
import { errorMessage } from '../lib/errors'
import {
  EXTRA_SOURCES,
  fetchExtraGroups,
  planTermId,
  rankExtraGroups,
  searchCourses,
  type ExtraCourse,
  type ExtraGroup,
  type ExtraSource,
} from '../lib/extraCourses'
import type { OptimizerSettings } from '../lib/optimizer'
import { WEEKDAYS } from '../lib/optimizerSettings'
import { buildTimetable, formatClock } from '../lib/timetable'
import type { Meeting } from '../lib/usos'
import type { GroupsProgress } from '../lib/usosGroups'
import { ExtraPreview } from './ExtraPreview'
import { ChoiceSetting } from './SettingControls'

interface Props {
  planMeetings: Meeting[] // plan z USOS - z niego semestr (term) zajęć
  meetings: PlanMeeting[] // plan z dodatkami - do niego dopasowujemy
  now: Date
  settings: OptimizerSettings
  gapThreshold: number
}

type Status = { kind: 'idle' } | { kind: 'loading'; progress?: GroupsProgress } | { kind: 'error'; message: string }

const SHOW_STEP = 8

// "Wychowanie fizyczne - Siatkówka" -> "Siatkówka" (w wynikach WF nazwa dyscypliny wystarczy).
const shortName = (name: string) => name.replace(/^Wychowanie fizyczne\s*-\s*/i, '')

function schedule(g: ExtraGroup): string {
  const times = g.meetings.map((m) => `${WEEKDAYS[m.weekday - 1]} ${formatClock(m.start)}–${formatClock(m.end)}`).join(', ')
  return g.parity === 'weekly' ? times : `${times}, tyg. ${g.parity === 'odd' ? 'nieparzyste' : 'parzyste'}`
}

function gapText(minutes: number): string {
  const rounded = Math.round(minutes / 5) * 5
  if (rounded === 0) return 'bez nowych okienek'
  return rounded > 0 ? `okienka +${formatDuration(rounded)}` : `okienka −${formatDuration(-rounded)}`
}

// Zajęcia spoza planu (WF, lektorat): wyszukiwanie w USOS i grupy, które najlepiej pasują do planu.
export function ExtraCoursesPanel({ planMeetings, meetings, now, settings, gapThreshold }: Props) {
  const { openExport } = usePlanUi()
  const [query, setQuery] = useState('')
  const [source, setSource] = useState<ExtraSource>('wf')
  const [termId, setTermId] = useState<string | null>(null)
  const [found, setFound] = useState<ExtraCourse[] | null>(null)
  const [truncated, setTruncated] = useState(false) // USOS uciął wyniki (limit 100)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [searchStatus, setSearchStatus] = useState<Status>({ kind: 'idle' })
  const [groups, setGroups] = useState<ExtraGroup[] | null>(null)
  const [groupsStatus, setGroupsStatus] = useState<Status>({ kind: 'idle' })
  const [shown, setShown] = useState(SHOW_STEP)
  const [preview, setPreview] = useState<ExtraGroup | null>(null)

  const timetable = useMemo(() => buildTimetable(meetings, now), [meetings, now])
  const ranking = useMemo(
    () => (groups && timetable ? rankExtraGroups(groups, timetable.entries, settings, gapThreshold) : null),
    [groups, timetable, settings, gapThreshold],
  )

  async function ensureTerm(): Promise<string> {
    if (termId) return termId
    const units = [...new Set(planMeetings.map((m) => m.unitId).filter((u): u is string => !!u))]
    const term = await planTermId(units)
    if (!term) throw new Error('Nie udało się ustalić semestru planu (brak zajęć z USOS).')
    setTermId(term)
    return term
  }

  async function search(e: FormEvent) {
    e.preventDefault()
    const q = query.trim()
    if (q.length < 3) {
      setSearchStatus({
        kind: 'error',
        message: 'Wpisz co najmniej 3 litery, np. „siatkówka” albo „angielski B2”, albo wklej kod przedmiotu.',
      })
      return
    }
    setSearchStatus({ kind: 'loading' })
    setGroups(null)
    setFound(null)
    try {
      const { courses, truncated } = await searchCourses(q, source, await ensureTerm())
      setFound(courses)
      setTruncated(truncated)
      setSelected(new Set(courses.length <= 3 ? courses.map((c) => c.courseId) : []))
      setSearchStatus({ kind: 'idle' })
    } catch (err) {
      setSearchStatus({ kind: 'error', message: errorMessage(err) })
    }
  }

  async function findGroups() {
    if (!found || !timetable) return
    const courses = found.filter((c) => selected.has(c.courseId))
    setGroupsStatus({ kind: 'loading' })
    setShown(SHOW_STEP)
    try {
      const result = await fetchExtraGroups(courses, await ensureTerm(), timetable.semester, (progress) =>
        setGroupsStatus({ kind: 'loading', progress }),
      )
      setGroups(result)
      setGroupsStatus({ kind: 'idle' })
    } catch (err) {
      setGroupsStatus({ kind: 'error', message: errorMessage(err) })
    }
  }

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <div className="panel">
      <h3 className="panel-title">WF, lektorat i inne zajęcia spoza planu</h3>
      <p className="setting-hint">
        Nie masz jeszcze WF albo lektoratu? Znajdź przedmiot w USOS, a Planer pokaże grupy, które najlepiej pasują do
        Twojego obecnego planu - bez kolizji i według kryteriów powyżej. Zapisujesz się jak zwykle w USOS.
      </p>

      <form className="extra-search" onSubmit={(e) => void search(e)}>
        <ChoiceSetting
          label="Gdzie szukać"
          value={source}
          options={EXTRA_SOURCES.map((s) => ({ value: s.id, label: s.label }))}
          onChange={setSource}
        />
        <div className="extra-search-row">
          <input
            className="text-input"
            value={query}
            placeholder={
              source === 'lang' ? 'np. angielski B2 albo kod / link z USOS' : source === 'wf' ? 'np. siatkówka, pływanie' : 'nazwa, kod albo link z USOSweb'
            }
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Nazwa, kod albo link przedmiotu"
          />
          <button type="submit" className="button" disabled={searchStatus.kind === 'loading'}>
            {searchStatus.kind === 'loading' ? 'Szukam…' : 'Szukaj'}
          </button>
        </div>
      </form>
      {searchStatus.kind === 'error' && <p className="error">{searchStatus.message}</p>}

      {found && found.length === 0 && (
        <p className="muted small">
          Nic nie znalazłem w tym semestrze. Spróbuj innej nazwy albo „Wszędzie” - albo wklej kod przedmiotu lub link do
          niego z USOSweb.
        </p>
      )}
      {found && found.length > 0 && truncated && (
        <p className="setting-hint">
          USOS pokazuje najwyżej 100 wyników, więc część mogła się nie zmieścić. Nie ma Twojego przedmiotu? Wklej jego
          kod (np. 6420-EEH60-0SA-0008) albo link do strony przedmiotu z USOSweb.
        </p>
      )}
      {found && found.length > 0 && (
        <>
          <ul className="extra-courses">
            {found.map((c) => (
              <li key={c.courseId}>
                <label className="check-row">
                  <input type="checkbox" checked={selected.has(c.courseId)} onChange={() => toggle(c.courseId)} />
                  <span>
                    {c.name}
                    <span className="setting-hint">{c.courseId}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <div className="button-row">
            <button
              type="button"
              className="button small"
              disabled={selected.size === 0 || groupsStatus.kind === 'loading'}
              onClick={() => void findGroups()}
            >
              Dopasuj grupy{selected.size > 1 ? ` (${selected.size} przedmioty)` : ''}
            </button>
            {found.length > 1 && (
              <button
                type="button"
                className="link-button"
                onClick={() => setSelected(selected.size === found.length ? new Set() : new Set(found.map((c) => c.courseId)))}
              >
                {selected.size === found.length ? 'Odznacz wszystkie' : 'Zaznacz wszystkie'}
              </button>
            )}
          </div>
        </>
      )}

      {groupsStatus.kind === 'loading' && (
        <div className="extra-loading">
          <p className="loading-line">
            <span className="spinner" aria-hidden="true" />
            Pobieram grupy z USOS…
          </p>
          {groupsStatus.progress && groupsStatus.progress.total > 1 && (
            <progress className="opt-progress" value={groupsStatus.progress.done} max={groupsStatus.progress.total} />
          )}
        </div>
      )}
      {groupsStatus.kind === 'error' && <p className="error">{groupsStatus.message}</p>}

      {ranking && groupsStatus.kind === 'idle' && (
        <div className="extra-results">
          {ranking.fits.length === 0 ? (
            <p className="empty-state">
              {groups?.length ? 'Każda grupa koliduje z Twoim planem.' : 'Te przedmioty nie mają jeszcze grup w USOS.'}
            </p>
          ) : (
            <ol className="extra-fits">
              {ranking.fits.slice(0, shown).map((fit, i) => (
                <li key={fit.group.id} className={`extra-fit${i === 0 ? ' is-best' : ''}`}>
                  <div className="extra-fit-main">
                    <strong>
                      {shortName(fit.group.courseName)} · gr. {fit.group.groupNumber}
                    </strong>
                    <span>{schedule(fit.group)}</span>
                    {fit.group.place && <span className="muted">{fit.group.place}</span>}
                  </div>
                  <div className="extra-fit-side">
                    <div className="extra-fit-tags">
                      {i === 0 && <span className="extra-tag is-best">Najlepiej pasuje</span>}
                      <span className={`extra-tag ${fit.newDay ? 'is-worse' : 'is-better'}`}>
                        {fit.newDay ? 'dodatkowy dzień' : 'bez nowego dnia'}
                      </span>
                      <span className={`extra-tag ${fit.gapMinutes > 2 ? 'is-worse' : 'is-better'}`}>{gapText(fit.gapMinutes)}</span>
                      <span className="extra-tag">koniec dnia {formatClock(fit.dayEnd)}</span>
                    </div>
                    <span className="candidate-actions">
                      <button type="button" className="button small secondary" onClick={() => setPreview(fit.group)}>
                        Podgląd tygodnia
                      </button>
                      <button
                        type="button"
                        className="button small secondary"
                        onClick={() =>
                          openExport(startOfWeek(now), {
                            meetings: withExtraGroup(meetings, fit.group, now),
                            // "Plan + Siatkówka (gr. 10)" - bez odmiany nazw, której nie da się zrobić niezawodnie.
                            title: `Plan + ${shortName(fit.group.courseName)} (gr. ${fit.group.groupNumber})`,
                          })
                        }
                      >
                        Eksportuj
                      </button>
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          )}
          <p className="hint">
            {ranking.fits.length > shown && (
              <button type="button" className="link-button" onClick={() => setShown((n) => n + SHOW_STEP)}>
                Pokaż więcej ({ranking.fits.length - shown})
              </button>
            )}
            {ranking.conflicts > 0 && ` ${ranking.conflicts} ${ranking.conflicts === 1 ? 'grupa koliduje' : 'grup koliduje'} z planem - pominięte.`}
          </p>
        </div>
      )}

      {preview && <ExtraPreview group={preview} meetings={meetings} now={now} onClose={() => setPreview(null)} />}
    </div>
  )
}
