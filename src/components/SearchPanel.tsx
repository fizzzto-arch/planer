import { msg, t, tk } from '../lib/i18n'
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { usePlanUi } from '../hooks/planUi'
import type { CourseAssessment } from '../lib/assessment'
import { programAssessments } from '../lib/courseAssessment'
import type { PlanMeeting } from '../lib/edits'
import { GENERAL_NOTE, courseKey } from '../lib/extras'
import { highlight, searchItems, type SearchGroup, type SearchHit } from '../lib/search'
import { buildSearchIndex, type SearchAction, type SearchSources } from '../lib/searchIndex'
import { fetchCourseStaff, loadCachedStaff, saveCachedStaff, staffCacheKey, type CourseStaff } from '../lib/staff'
import type { CourseSummary as ProgramSummary, StudyProgram } from '../lib/studyProgram'

interface Props {
  meetings: PlanMeeting[]
  now: Date
  onClose: () => void
  onAction: (action: SearchAction) => void
}

const GROUP_LABELS: Record<SearchGroup, string> = {
  courses: msg('Przedmioty'),
  deadlines: msg('Terminy'),
  rooms: msg('Sale'),
  notes: msg('Notatki'),
  materials: msg('Materiały'),
  program: msg('Program studiów'),
  settings: msg('Ustawienia i funkcje'),
}

const PER_GROUP = 4 // więcej po "Pokaż więcej"
const RECENT_MS = 14 * 24 * 60 * 60 * 1000

type ProgramData = SearchSources['program']

// Wyszukiwanie: pole na górze, wyniki na bieżąco, pogrupowane. Wszystko lokalnie - nic nie wychodzi z telefonu
// (poza dociągnięciem prowadzących z publicznego USOS, jak na stronie przedmiotu).
export function SearchPanel({ meetings, now, onClose, onAction }: Props) {
  const { extras, materials, displayName, canOptimize } = usePlanUi()
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState<SearchGroup[]>([])
  const [active, setActive] = useState(0)
  const input = useRef<HTMLInputElement>(null)

  const assessment = useMemo(() => programAssessments(meetings, now), [meetings, now])

  // Program studiów (osobny plik) - dopiero gdy pasuje do planu.
  const [program, setProgram] = useState<ProgramData>(null)
  useEffect(() => {
    if (!assessment) return
    let cancelled = false
    void Promise.all([import('../lib/programs/ib'), import('../lib/programs/ibSummaries'), import('../lib/programs/ibAssessment')]).then(
      ([p, s, a]) => {
        if (!cancelled)
          setProgram({
            program: p.PROGRAM as StudyProgram,
            summaries: s.SUMMARIES as Record<string, ProgramSummary>,
            assessments: a.ASSESSMENTS as Record<string, CourseAssessment>,
          })
      },
    )
    return () => {
      cancelled = true
    }
  }, [assessment])

  // Prowadzący obecnych przedmiotów: z pamięci, brakujących dociągamy z USOS (raz na tydzień).
  const current = useMemo(() => {
    const byCourse = new Map<string, PlanMeeting[]>()
    for (const m of meetings) {
      if (m.custom || !m.unitId) continue
      byCourse.set(m.courseName, [...(byCourse.get(m.courseName) ?? []), m])
    }
    const since = now.getTime() - RECENT_MS
    return [...byCourse].filter(([, list]) => list.some((m) => m.start.getTime() >= since))
  }, [meetings, now])
  const [staff, setStaff] = useState(() => {
    const known = new Map<string, CourseStaff>()
    for (const [name, list] of current) {
      const cached = loadCachedStaff(staffCacheKey(list))
      if (cached) known.set(name, cached)
    }
    return known
  })
  useEffect(() => {
    let cancelled = false
    void (async () => {
      for (const [name, list] of current) {
        if (cancelled) return
        if (staff.has(name)) continue
        try {
          const found = await fetchCourseStaff(list)
          if (!found || cancelled) continue
          saveCachedStaff(staffCacheKey(list), found)
          setStaff((prev) => new Map(prev).set(name, found))
        } catch {
          // bez internetu - szukamy bez prowadzących
        }
      }
    })()
    return () => {
      cancelled = true
    }
    // Tylko przy otwarciu: dociągnięci prowadzący trafiają do staff, nie trzeba zaczynać od nowa.
  }, [current]) // eslint-disable-line react-hooks/exhaustive-deps

  const index = useMemo(() => {
    const courseExtras = extras ? [...extras.extras.courses.values()].filter((c) => c.name !== GENERAL_NOTE) : []
    const courseNames = [...new Set(meetings.map((m) => m.courseName))]
    return buildSearchIndex({
      now,
      meetings,
      displayName,
      deadlines: extras?.extras.deadlines ?? [],
      courseExtras,
      generalNote: extras?.extras.courses.get(courseKey(GENERAL_NOTE))?.note ?? '',
      materials: materials ? courseNames.flatMap((name) => materials.forCourse(courseKey(name)).map((m) => ({ courseName: name, name: m.name }))) : [],
      staff,
      assessment,
      program,
      features: { signedIn: extras !== null, canOptimize, hasProgram: assessment !== null },
    })
  }, [now, meetings, displayName, extras, materials, staff, assessment, program, canOptimize])

  const groups = useMemo(() => searchItems(index, query), [index, query])
  const visible = groups.map((g) => ({
    ...g,
    shown: expanded.includes(g.group) ? g.hits : g.hits.slice(0, PER_GROUP),
  }))
  const flat = visible.flatMap((g) => g.shown)

  // Bez przewijania strony pod spodem.
  useEffect(() => {
    const root = document.documentElement
    const previous = root.style.overflow
    root.style.overflow = 'hidden'
    return () => {
      root.style.overflow = previous
    }
  }, [])

  const choose = (hit: SearchHit<SearchAction>) => {
    onClose()
    onAction(hit.item.action)
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (flat.length === 0) return
      setActive((i) => (i + (e.key === 'ArrowDown' ? 1 : flat.length - 1)) % flat.length)
    } else if (e.key === 'Enter' && flat[active]) {
      e.preventDefault()
      choose(flat[active])
    }
  }

  let position = -1
  return (
    <div className="search-overlay" role="dialog" aria-modal="true" aria-label={t('Wyszukiwanie')} onKeyDown={onKeyDown}>
      <div className="search-backdrop" onClick={onClose} />
      <div className="search-sheet">
        <div className="search-bar">
          <label className="search-field">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="10.5" cy="10.5" r="6.5" />
              <path d="m15.5 15.5 5 5" />
            </svg>
            <input
              ref={input}
              type="search"
              enterKeyHint="search"
              autoFocus
              aria-label={t('Szukaj')}
              placeholder={t('Szukaj')}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setActive(0)
                setExpanded([])
              }}
            />
          </label>
          <button type="button" className="link-button search-cancel" onClick={onClose}>
            {t('Anuluj')}
          </button>
        </div>

        <div className="search-results">
          {query.trim() === '' ? (
            <p className="search-hint">
              {t('Przedmioty, prowadzący, zasady zaliczenia, terminy, sale, notatki, materiały i ustawienia - wpisz kilka liter.')}
            </p>
          ) : groups.length === 0 ? (
            <p className="search-hint">{t('Nic nie znaleziono dla „{query}”.', { query: query.trim() })}</p>
          ) : (
            visible.map((g) => (
              <section key={g.group} className="search-group">
                <h3 className="search-group-title">{tk(GROUP_LABELS[g.group])}</h3>
                <ul>
                  {g.shown.map((hit) => {
                    position++
                    const hitIndex = position
                    return (
                      <li key={hit.item.id}>
                        <button
                          type="button"
                          className={`search-hit${hitIndex === active ? ' is-active' : ''}`}
                          onClick={() => choose(hit)}
                          onMouseMove={() => setActive(hitIndex)}
                        >
                          <span className="search-hit-title">
                            {highlight(hit.item.title, query).map(([text, marked], i) =>
                              marked ? <mark key={i}>{text}</mark> : <span key={i}>{text}</span>,
                            )}
                          </span>
                          {hit.item.detail && <span className="search-hit-detail">{hit.item.detail}</span>}
                          {hit.snippet && (
                            <span className="search-hit-snippet">
                              {hit.snippet.label && `${hit.snippet.label}: `}
                              {hit.snippet.text}
                            </span>
                          )}
                        </button>
                      </li>
                    )
                  })}
                </ul>
                {g.hits.length > g.shown.length && (
                  <button type="button" className="link-button search-more" onClick={() => setExpanded((e) => [...e, g.group])}>
                    {t('Pokaż więcej ({n})', { n: g.hits.length - g.shown.length })}
                  </button>
                )}
              </section>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
