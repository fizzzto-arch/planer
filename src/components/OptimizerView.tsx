import { plural } from '../lib/plural'
import { t } from '../lib/i18n'
import { useMemo, useState } from 'react'
import { usePlanUi } from '../hooks/planUi'
import { useGroupOptions } from '../hooks/useGroupOptions'
import { useOptimizerSettings } from '../hooks/useOptimizerSettings'
import { formatUpdatedAt, startOfWeek } from '../lib/dates'
import type { PlanMeeting } from '../lib/edits'
import { deanFilter, deanGroupOf, deanGroups, optimize, type Candidate } from '../lib/optimizer'
import type { Meeting } from '../lib/usos'
import { describeOption } from '../lib/optimizerSettings'
import { groupsCacheMaxAge } from '../lib/usosGroups'
import { candidateMeetings, extraGroupsSlot, extraSlotId } from '../lib/candidatePlan'
import type { ExtraGroup } from '../lib/extraCourses'
import { CandidateCard, MetricsGrid } from './CandidateCard'
import { ExtraCoursesPanel } from './ExtraCoursesPanel'
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
  const { prefs, extras, openExport } = usePlanUi()
  const settingsApi = useOptimizerSettings(extras)
  const { settings } = settingsApi

  // Liczy się tylko to, co przed nami: od początku bieżącego tygodnia.
  const weekStart = startOfWeek(now).getTime()
  const upcoming = useMemo(() => planMeetings.filter((m) => m.start.getTime() >= weekStart), [planMeetings, weekStart])
  const maxAge = useMemo(() => groupsCacheMaxAge(planMeetings, now), [planMeetings, now])
  const { slots: planSlots, fetchedAt, status, refresh } = useGroupOptions(upcoming, maxAge)

  // WF, lektorat: grupy z wyszukiwania dobierane razem ze zmianami grup w planie.
  const [included, setIncluded] = useState<ExtraGroup[][]>([])
  const extraSlots = useMemo(() => {
    return included.flatMap((groups) => {
      const slot = extraGroupsSlot(groups, meetings, new Date(weekStart))
      return slot ? [{ slot, groups }] : []
    })
  }, [included, meetings, weekStart])
  const slots = useMemo(
    () => (planSlots ? [...planSlots, ...extraSlots.map((e) => e.slot)] : null),
    [planSlots, extraSlots],
  )

  const fixed = useMemo(
    () =>
      meetings
        .filter((m) => m.custom && !m.cancelled && m.start.getTime() >= weekStart)
        .map((m) => ({ start: m.start, end: m.end, room: m.room, building: null, courseName: m.courseName, type: m.type })),
    [meetings, weekStart],
  )

  const results = useMemo(() => {
    if (!slots || !slots.some((s) => !s.extra)) return null
    const base = { fixed, settings, gapThreshold: prefs.gapMinutes }
    const free = optimize(slots, { ...base, limit: TOP_LIMIT + 1 })
    const deans = deanGroups(slots).map((dean) => ({
      dean,
      best: optimize(slots, { ...base, limit: 1, filter: deanFilter(dean) }).candidates[0] ?? null,
    }))
    return { free, deans }
  }, [slots, fixed, settings, prefs.gapMinutes])

  const [preview, setPreview] = useState<{ title: string; candidate: Candidate } | null>(null)

  // Eksport propozycji: zwykły eksport (zdjęcie, PDF, Excel, kalendarz), ale z planem po zmianie grup.
  const exportCandidate = (title: string, candidate: Candidate) => {
    if (!slots) return
    openExport(startOfWeek(now), { meetings: candidateMeetings(candidate, slots, fixed).meetings, title })
  }

  // Twoja grupa dziekańska: najczęstsza wśród obecnych grup.
  const myDean = useMemo(() => {
    const counts = new Map<number, number>()
    for (const s of planSlots ?? []) {
      if (s.currentIndex === null) continue
      const d = deanGroupOf(s.options[s.currentIndex].groupNumber)
      if (d !== null) counts.set(d, (counts.get(d) ?? 0) + 1)
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
  }, [planSlots])

  const current = results?.free.current ?? null
  // Zajęcia spoza planu bez grupy pasującej do obecnego planu.
  const clashing = current && slots ? slots.filter((s, i) => s.extra && current.choice[i] < 0) : []
  const better = results?.free.candidates.filter((c) => c.changes > 0).slice(0, TOP_LIMIT) ?? []
  const bestIsCurrent = results?.free.candidates[0]?.changes === 0

  return (
    <section className="optimizer">
      <button type="button" className="back-button" onClick={onBack}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m15 6-6 6 6 6" />
        </svg>
        {t('Wróć')}
      </button>

      <header className="course-header opt-header">
        <h2>
          {t('Dobierz grupy')} <span className="alpha-badge">alpha</span>
        </h2>
        <p className="muted">
          {t('Porównuję plany wszystkich grup Twoich przedmiotów z USOS i szukam układu, który najlepiej pasuje do Twoich kryteriów. Zmianę grupy trzeba potem załatwić w USOS albo w dziekanacie - Planer tylko podpowiada.')}
        </p>
      </header>

      {status.kind === 'loading' && (
        <div className="panel">
          <p className="loading-line">
            <span className="spinner" aria-hidden="true" />
            {t('Pobieram plany wszystkich grup z USOS…')}
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
            {t('Spróbuj ponownie')}
          </button>
        </div>
      )}

      {slots && status.kind !== 'loading' && (
        <p className="sync">
          {t('Plany grup z USOS: {when}', { when: fetchedAt ? formatUpdatedAt(new Date(fetchedAt), now) : '—' })}{' '}
          <button type="button" className="link-button" onClick={refresh}>
            {t('Odśwież')}
          </button>
        </p>
      )}

      {planSlots && planSlots.length === 0 && (
        <>
          <p className="empty-state">{t('W planie nie ma nadchodzących zajęć z USOS, dla których można dobierać grupy.')}</p>
          {/* WF i lektorat da się dobrać także bez grup do zamiany w planie. */}
          <ExtraCoursesPanel
            planMeetings={planMeetings}
            meetings={meetings}
            now={now}
            settings={settings}
            gapThreshold={prefs.gapMinutes}
          />
        </>
      )}

      {slots && planSlots && planSlots.length > 0 && results && (
        <>
          <OptimizerSettingsPanel api={settingsApi} slots={planSlots} />
          <ExtraCoursesPanel
            planMeetings={planMeetings}
            meetings={meetings}
            now={now}
            settings={settings}
            gapThreshold={prefs.gapMinutes}
            // Ten sam przedmiot drugi raz - nowsze wyniki zastępują poprzednie.
            onInclude={(groups) => setIncluded((prev) => [...prev.filter((g) => extraSlotId(g) !== extraSlotId(groups)), groups])}
            included={extraSlots.map((e) => e.groups)}
          />

          {extraSlots.length > 0 && (
            <div className="panel extra-included">
              <h3 className="panel-title">{t('Dobieram też grupę')}</h3>
              <ul className="extra-included-list">
                {extraSlots.map(({ slot, groups }) => {
                  const courses = new Set(slot.options.map((o) => o.courseId)).size
                  return (
                    <li key={slot.id}>
                      <span>
                        {slot.courseName}
                        {courses > 1 && ` i ${courses - 1} podobne`}{' '}
                        <span className="muted">
                          · {slot.options.length} {plural(slot.options.length, 'grupa', 'grupy', 'grup')}
                        </span>
                      </span>
                      <button
                        type="button"
                        className="link-button"
                        onClick={() => setIncluded((prev) => prev.filter((g) => g !== groups))}
                      >
                        {t('Usuń')}
                      </button>
                    </li>
                  )
                })}
              </ul>
              <p className="setting-hint">
                {t('Każda propozycja ma najlepiej pasującą do niej grupę - na nią zapisujesz się w USOS.')}
              </p>
            </div>
          )}

          {current && (
            <div className="panel">
              <div className="section-head">
                <h3 className="panel-title">{t('Twój obecny plan')}</h3>
                <button
                  type="button"
                  className="button small secondary"
                  onClick={() => setPreview({ title: t('Obecny plan'), candidate: current })}
                >
                  {t('Podgląd tygodnia')}
                </button>
              </div>
              <MetricsGrid metrics={current.metrics} base={null} settings={settings} />
              {slots.map((slot, i) => {
                if (!slot.extra) return null
                const option = slot.options[current.choice[i]]
                if (!option) return null
                return (
                  <p key={slot.id} className="muted small">
                    {t('Z najlepiej pasującą grupą: {course} gr. {n} ({when})', {
                      course: option.courseName ?? slot.courseName,
                      n: option.groupNumber,
                      when: describeOption(option),
                    })}
                  </p>
                )
              })}
              {clashing.length > 0 && (
                <p className="opt-note is-warn">
                  {t('Żadna grupa: {courses} nie mieści się w obecnym planie bez kolizji (albo trafia w zablokowane godziny) - powyżej plan bez niej. Propozycje niżej zmieniają grupy tak, żeby się zmieściła.', { courses: clashing.map((c) => c.courseName).join(', ') })}
                </p>
              )}
            </div>
          )}

          {results.deans.length > 1 && (
            <>
              <h3 className="section-title">{t('Cała grupa dziekańska')}</h3>
              {results.deans.map(({ dean, best }) =>
                best ? (
                  <CandidateCard
                    key={dean}
                    title={
                      <>
                        {t('Grupa dziekańska {dean}', { dean })}
                        {dean === myDean && <span className="badge opt-badge">{t('Twoja')}</span>}
                      </>
                    }
                    candidate={best}
                    current={current}
                    slots={slots}
                    settings={settings}
                    onPreview={() => setPreview({ title: t('Grupa dziekańska {dean}', { dean }), candidate: best })}
                    onExport={() => exportCandidate(t('Grupa dziekańska {dean}', { dean }), best)}
                  />
                ) : (
                  <div key={dean} className="panel candidate">
                    <h4 className="candidate-title">{t('Grupa dziekańska {dean}', { dean })}</h4>
                    <p className="muted small">{t('Brak planu bez kolizji przy Twoich ograniczeniach.')}</p>
                  </div>
                ),
              )}
            </>
          )}

          <h3 className="section-title">{t('Najlepsze zestawy grup')}</h3>
          {bestIsCurrent && (
            <p className="opt-note">
              {t('Twój obecny plan jest najlepszy według wybranych kryteriów. Poniżej kolejne propozycje - jeśli ważne jest dla Ciebie coś innego, zmień kryteria wyżej.')}
            </p>
          )}
          {better.length === 0 ? (
            <p className="empty-state">
              {results.free.candidates.length === 0
                ? t('Żaden układ grup nie spełnia Twoich ograniczeń - usuń którąś blokadę albo przypięcie.')
                : t('Nie ma innych układów grup bez kolizji.')}
            </p>
          ) : (
            better.map((candidate, i) => {
              const title = i === 0 && !bestIsCurrent ? t('Najlepsza propozycja') : t('Propozycja {n}', { n: i + 1 })
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
                  onExport={() => exportCandidate(title, candidate)}
                />
              )
            })
          )}
          {results.free.truncated && (
            <p className="hint">{t('Kombinacji jest bardzo dużo - sprawdziłem pierwsze {n} z nich.', { n: results.free.checked })}</p>
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
