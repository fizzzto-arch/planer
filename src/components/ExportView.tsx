import { t } from '../lib/i18n'
import { tx } from '../lib/i18nReact'
import { useEffect, useMemo, useState } from 'react'
import { usePlanUi } from '../hooks/planUi'
import { addDays, formatWeekRange, startOfWeek } from '../lib/dates'
import type { PlanMeeting } from '../lib/edits'
import { errorMessage } from '../lib/errors'
import { canvasToBlob, renderPlanImage } from '../lib/exportImage'
import { exportIcs } from '../lib/exportIcs'
import {
  buildExportModel,
  loadExportOptions,
  notesInScope,
  saveExportOptions,
  type ExportOptions,
} from '../lib/exportModel'
import { exportXlsx } from '../lib/exportXlsx'
import { jpegToPdf } from '../lib/pdf'
import { saveFile } from '../lib/saveFile'
import { buildTimetable, noteLine, semesterTitle } from '../lib/timetable'
import type { TypeColors } from '../lib/typeColors'
import { ChoiceSetting, SwitchSetting } from './SettingControls'

interface Props {
  meetings: PlanMeeting[]
  now: Date
  initialWeek: Date
  colors: TypeColors
  source: string | null // eksport propozycji z optymalizatora (jej nazwa) zamiast obecnego planu
  onBack: () => void
}

type Format = 'png' | 'jpeg' | 'pdf' | 'xlsx' | 'ics'

const FORMATS = (): { id: Format; label: string; hint: string }[] => ([
  { id: 'png', label: t('Zdjęcie PNG'), hint: t('najostrzejsze') },
  { id: 'jpeg', label: t('Zdjęcie JPEG'), hint: t('lżejsze, do komunikatorów') },
  { id: 'pdf', label: 'PDF', hint: t('strona A4, do druku') },
  { id: 'xlsx', label: 'Excel', hint: t('siatka z kolorami + lista') },
  { id: 'ics', label: t('Kalendarz (.ics)'), hint: t('Google, Apple') },
])

// Eksport planu: typowy tydzień albo konkretny tydzień jako zdjęcie, PDF, Excel albo kalendarz.
export function ExportView({ meetings, now, initialWeek, colors, source, onBack }: Props) {
  const { displayName } = usePlanUi()
  const [savedOptions, setOptions] = useState<ExportOptions>(loadExportOptions)
  // Propozycja z optymalizatora ma własny tytuł (jej nazwę) - nie nadpisuje zapamiętanego tytułu planu.
  const [sourceTitle, setSourceTitle] = useState(source ?? '')
  const options = useMemo(
    () => (source !== null ? { ...savedOptions, title: sourceTitle } : savedOptions),
    [source, savedOptions, sourceTitle],
  )
  const [weekStart, setWeekStart] = useState(() => startOfWeek(initialWeek))
  const [hiddenNotes, setHiddenNotes] = useState<Set<string>>(new Set())
  const [preview, setPreview] = useState<{ url: string; canvas: HTMLCanvasElement } | null>(null)
  const [busy, setBusy] = useState<Format | null>(null)
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null)

  const update = (patch: Partial<ExportOptions>) =>
    setOptions((prev) => {
      const next = { ...prev, ...patch }
      saveExportOptions(next)
      return next
    })

  const timetable = useMemo(() => buildTimetable(meetings, now, displayName), [meetings, now, displayName])
  const model = useMemo(
    () =>
      timetable
        ? buildExportModel({ timetable, meetings, options, weekStart, hiddenNotes, label: displayName, colors })
        : null,
    [timetable, meetings, options, weekStart, hiddenNotes, displayName, colors],
  )
  const autoNotes = timetable ? notesInScope(timetable, options, weekStart) : []

  // Podgląd: rysujemy zdjęcie po krótkiej chwili bez zmian (pisanie tytułu nie rysuje co literę).
  useEffect(() => {
    if (!model) return
    let cancelled = false
    const timer = setTimeout(() => {
      const canvas = renderPlanImage(model, options.layout, options.theme)
      canvasToBlob(canvas, 'image/png')
        .then((blob) => {
          if (!cancelled) setPreview({ url: URL.createObjectURL(blob), canvas })
        })
        .catch(() => undefined)
    }, 150)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [model, options.layout, options.theme])

  // Poprzedni podgląd zwalniamy dopiero, gdy jest już nowy (obrazek nie znika w trakcie rysowania).
  const previewUrl = preview?.url
  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  async function download(format: Format) {
    if (!model || !timetable) return
    setBusy(format)
    setStatus(null)
    try {
      const canvas = preview?.canvas ?? renderPlanImage(model, options.layout, options.theme)
      let blob: Blob
      if (format === 'png') blob = await canvasToBlob(canvas, 'image/png')
      else if (format === 'jpeg') blob = await canvasToBlob(canvas, 'image/jpeg')
      else if (format === 'pdf') {
        const jpeg = new Uint8Array(await (await canvasToBlob(canvas, 'image/jpeg')).arrayBuffer())
        blob = jpegToPdf(jpeg, canvas.width, canvas.height)
      } else if (format === 'xlsx') blob = exportXlsx(model)
      else {
        const from = options.scope === 'week' ? weekStart : timetable.semester.firstWeek
        const to = options.scope === 'week' ? addDays(weekStart, 7) : addDays(timetable.semester.lastWeek, 7)
        blob = exportIcs(
          meetings.filter((m) => m.start >= from && m.start < to),
          displayName,
          model.title,
        )
      }
      const result = await saveFile(blob, `${model.fileBase}.${format === 'jpeg' ? 'jpg' : format}`)
      if (result === 'downloaded') setStatus({ ok: true, text: t('Zapisano w pobranych plikach.') })
      else if (result === 'shared') setStatus({ ok: true, text: t('Gotowe.') })
    } catch (e) {
      setStatus({ ok: false, text: errorMessage(e) })
    } finally {
      setBusy(null)
    }
  }

  const toggleNote = (id: string, on: boolean) =>
    setHiddenNotes((prev) => {
      const next = new Set(prev)
      if (on) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <section className="export">
      <button type="button" className="back-button" onClick={onBack}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m15 6-6 6 6 6" />
        </svg>
        {t('Wróć')}
      </button>

      <header className="course-header">
        <h2>{t('Eksport planu')}</h2>
        <p className="muted">{t('Zdjęcie do galerii albo dla znajomych, PDF do druku, Excel albo plik do kalendarza.')}</p>
        {source !== null && (
          <p className="export-source">
            {tx('Eksportujesz propozycję z optymalizatora: {name} - nie swój obecny plan.', { name: <strong>{source}</strong> })}
          </p>
        )}
      </header>

      {!timetable || !model ? (
        <p className="empty-state">{t('W planie nie ma zajęć do wyeksportowania.')}</p>
      ) : (
        <div className="export-layout">
          <div className="export-options">
            <div className="panel">
              <h3 className="panel-title">{t('Co eksportować')}</h3>
              <ChoiceSetting
                label={t('Zakres')}
                hint={
                  options.scope === 'typical'
                    ? t('{semester} - każde zajęcia raz, z oznaczeniem tygodni.', { semester: semesterTitle(timetable.semester) })
                    : t('Dokładnie tak, jak wypada wybrany tydzień.')
                }
                value={options.scope}
                options={[
                  { value: 'typical', label: t('Typowy tydzień') },
                  { value: 'week', label: t('Konkretny tydzień') },
                ]}
                onChange={(scope) => update({ scope })}
              />
              {options.scope === 'typical' ? (
                <ChoiceSetting
                  label={t('Tygodnie')}
                  hint={t('Nieparzyste/parzyste: bez zajęć z drugiego rodzaju tygodnia.')}
                  value={options.parity}
                  options={[
                    { value: 'both', label: t('Oba') },
                    { value: 'odd', label: t('Nieparzyste') },
                    { value: 'even', label: t('Parzyste') },
                  ]}
                  onChange={(parity) => update({ parity })}
                />
              ) : (
                <div className="week-nav export-week">
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={t('Poprzedni tydzień')}
                    onClick={() => setWeekStart((w) => addDays(w, -7))}
                  >
                    ‹
                  </button>
                  <div className="week-label">
                    <strong>{formatWeekRange(weekStart)}</strong>
                  </div>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={t('Następny tydzień')}
                    onClick={() => setWeekStart((w) => addDays(w, 7))}
                  >
                    ›
                  </button>
                </div>
              )}
            </div>

            <div className="panel">
              <h3 className="panel-title">{t('Wygląd')}</h3>
              <label className="field">
                <span className="field-label">{t('Tytuł')}</span>
                <input
                  className="text-input"
                  value={options.title}
                  maxLength={80}
                  placeholder={semesterTitle(timetable.semester)}
                  onChange={(e) => (source !== null ? setSourceTitle(e.target.value) : update({ title: e.target.value }))}
                />
              </label>
              <ChoiceSetting
                label={t('Układ zdjęcia')}
                hint={options.layout === 'portrait' ? t('Dni jeden pod drugim - wygodne na telefonie.') : t('Siatka tygodnia - do druku i na komputer.')}
                value={options.layout}
                options={[
                  { value: 'landscape', label: t('Poziomy') },
                  { value: 'portrait', label: t('Pionowy') },
                ]}
                onChange={(layout) => update({ layout })}
              />
              <ChoiceSetting
                label={t('Motyw')}
                value={options.theme}
                options={[
                  { value: 'light', label: t('Jasny') },
                  { value: 'dark', label: t('Ciemny') },
                ]}
                onChange={(theme) => update({ theme })}
              />
              <SwitchSetting label={t('Sala i budynek')} checked={options.showRoom} onChange={(showRoom) => update({ showRoom })} />
              <SwitchSetting label={t('Numer grupy')} checked={options.showGroup} onChange={(showGroup) => update({ showGroup })} />
            </div>

            <div className="panel">
              <h3 className="panel-title">{t('Uwagi pod planem')}</h3>
              {autoNotes.length === 0 ? (
                <p className="hint">{t('W tym zakresie Planer nie znalazł świąt, zamian dni ani zmian.')}</p>
              ) : (
                <>
                  <p className="hint">{t('Wykryte z planu - odznacz te, których nie chcesz.')}</p>
                  <ul className="export-notes">
                    {autoNotes.map((n) => (
                      <li key={n.id}>
                        <label className="check-row">
                          <input type="checkbox" checked={!hiddenNotes.has(n.id)} onChange={(e) => toggleNote(n.id, e.target.checked)} />
                          <span>{noteLine(n)}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <label className="field">
                <span className="field-label">{t('Własne uwagi')}</span>
                <textarea
                  className="text-input"
                  rows={3}
                  value={options.customNotes}
                  maxLength={2000}
                  placeholder={t('Każda uwaga w osobnej linii, np.\nKolokwium z fizyki 20.11 w s. 170')}
                  onChange={(e) => update({ customNotes: e.target.value })}
                />
              </label>
            </div>
          </div>

          <div className="export-result">
            <div className={`export-preview is-${options.layout}`}>
              {preview ? <img src={preview.url} alt={t('Podgląd eksportowanego planu')} /> : <span className="spinner" aria-hidden="true" />}
            </div>
            <div className="export-buttons">
              {FORMATS().map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={`button ${f.id === 'png' ? '' : 'secondary'}`}
                  disabled={busy !== null}
                  onClick={() => void download(f.id)}
                >
                  <span>{busy === f.id ? t('Przygotowuję…') : f.label}</span>
                  <span className="export-button-hint">{f.hint}</span>
                </button>
              ))}
            </div>
            {status && <p className={status.ok ? 'hint' : 'error'}>{status.text}</p>}
            <p className="hint">
              {t('Na iPhonie zdjęcie zapiszesz przez „Udostępnij” → „Zachowaj obraz”, a pozostałe pliki przez „Zachowaj w Plikach”. Uwagi i tytuł zdjęcia, PDF i Excela są takie same.')}
            </p>
          </div>
        </div>
      )}
    </section>
  )
}
