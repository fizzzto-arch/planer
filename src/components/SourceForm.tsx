import { tx } from '../lib/i18nReact'
import { t } from '../lib/i18n'
import { useState, type ChangeEvent, type FormEvent } from 'react'
import type { PlanApi } from '../hooks/usePlan'
import { errorMessage } from '../lib/errors'
import { parseWatGroup, watPlanUrl } from '../lib/wat'

const USOSWEB_PLAN_URL = 'https://usosweb.usos.pw.edu.pl/kontroler.php?_action=home/plan'

function validateUrl(url: string): string | null {
  if (!url) return t('Wklej odnośnik do planu albo wpisz kod grupy WAT.')
  if (!/^https:\/\//i.test(url)) return t('Odnośnik powinien zaczynać się od https://')
  // Ikona "udostępnij" (<) daje link do strony z planem, a nie do kalendarza - łatwo pomylić ikony.
  if (/pokazPlanZajecStudenta/i.test(url)) {
    return t('To link do udostępniania planu (ikona „<”), a potrzebny jest link do kalendarza. W USOSweb kliknij ikonę eksportu (strzałka w górę do kreski, obok) i skopiuj „Odnośnik do planu” z okna, które się otworzy.')
  }
  if (/usosweb\.usos\.pw\.edu\.pl/i.test(url)) {
    return t('To adres strony USOSweb. Potrzebny jest „Odnośnik do planu” z okna eksportu (krok 2).')
  }
  return null
}

// Ikona eksportu w USOSweb: strzałka w górę do poziomej kreski.
function ExportIcon() {
  return (
    <svg className="inline-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 4h14M12 20V9M7 13l5-5 5 5" />
    </svg>
  )
}

interface Props {
  plan: PlanApi
  onDone?: () => void
}

export function SourceForm({ plan, onDone }: Props) {
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run(task: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await task()
      onDone?.()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const value = url.trim()
    // WAT (Wydział Cybernetyki): kod grupy zamiast linku - plan leży obok Planera (scripts/wat-plans.ts).
    const watGroup = parseWatGroup(value)
    if (watGroup) {
      void run(async () => {
        try {
          await plan.connectUrl(watPlanUrl(watGroup, document.baseURI))
        } catch {
          throw new Error(
            t('Nie mam planu grupy {watGroup}. Sprawdź kod na planzajec.wcy.wat.edu.pl - plany nowych grup pojawiają się tu następnej nocy.', { watGroup }),
          )
        }
      })
      return
    }
    const problem = validateUrl(value)
    if (problem) {
      setError(problem)
      return
    }
    void run(() => plan.connectUrl(value))
  }

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) void run(() => plan.importFile(file))
  }

  return (
    <div className="source-form">
      <ol className="steps">
        <li>
          {t('Otwórz')}{' '}
          <a href={USOSWEB_PLAN_URL} target="_blank" rel="noreferrer">
            {t('Mój plan zajęć w USOSweb')}
          </a>
          .
        </li>
        <li>
          {tx('Kliknij ikonę eksportu {icon} (strzałka w górę do kreski) obok nagłówka „Mój plan zajęć” - nie ikonę udostępniania „<”.', {
            icon: <ExportIcon />,
          })}
        </li>
        <li>{t('Skopiuj „Odnośnik do planu” i wklej go poniżej.')}</li>
      </ol>
      <p className="hint">
        {t('Studiujesz na WAT (Wydział Cybernetyki)? Zamiast linku wpisz kod swojej grupy, np. WCY26IY4S1.')}
      </p>

      <form onSubmit={handleSubmit}>
        <label className="field-label" htmlFor="ical-url">
          {t('Odnośnik do planu (albo kod grupy WAT)')}
        </label>
        <div className="input-row">
          <input
            id="ical-url"
            type="text"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            placeholder="https://apps.usos.pw.edu.pl/services/tt/upcoming_ical?…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <button type="submit" className="button" disabled={busy}>
            {busy ? t('Wczytuję…') : t('Wczytaj plan')}
          </button>
        </div>
      </form>
      <p className="hint">
        {t('Link działa jak hasło do Twojego planu. Jest zapisywany tylko w tej przeglądarce, a plan odświeża się sam przy każdym otwarciu strony.')}
      </p>

      <div className="divider">{t('albo')}</div>

      <label className={`button secondary${busy ? ' is-disabled' : ''}`}>
        {t('Wgraj plik .ics')}
        <input type="file" accept=".ics,text/calendar" onChange={handleFile} disabled={busy} hidden />
      </label>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
