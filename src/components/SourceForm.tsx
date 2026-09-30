import { useState, type ChangeEvent, type FormEvent } from 'react'
import type { PlanApi } from '../hooks/usePlan'
import { errorMessage } from '../lib/errors'
import { parseWatGroup, watPlanUrl } from '../lib/wat'

const USOSWEB_PLAN_URL = 'https://usosweb.usos.pw.edu.pl/kontroler.php?_action=home/plan'

function validateUrl(url: string): string | null {
  if (!url) return 'Wklej odnośnik do planu albo wpisz kod grupy WAT.'
  if (!/^https:\/\//i.test(url)) return 'Odnośnik powinien zaczynać się od https://'
  if (/usosweb\.usos\.pw\.edu\.pl/i.test(url)) {
    return 'To adres strony USOSweb. Potrzebny jest „Odnośnik do planu” z okna eksportu (krok 2).'
  }
  return null
}

function ShareIcon() {
  return (
    <svg className="inline-icon" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="18" cy="5" r="2.5" />
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="19" r="2.5" />
      <path d="M8.2 10.9 15.8 6.1M8.2 13.1l7.6 4.8" />
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
            `Nie mam planu grupy ${watGroup}. Sprawdź kod na planzajec.wcy.wat.edu.pl - plany nowych grup pojawiają się tu następnej nocy.`,
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
          Otwórz{' '}
          <a href={USOSWEB_PLAN_URL} target="_blank" rel="noreferrer">
            Mój plan zajęć w USOSweb
          </a>
          .
        </li>
        <li>
          Kliknij ikonę udostępniania <ShareIcon /> obok nagłówka „Mój plan zajęć”.
        </li>
        <li>Skopiuj „Odnośnik do planu” i wklej go poniżej.</li>
      </ol>
      <p className="hint">
        Studiujesz na WAT (Wydział Cybernetyki)? Zamiast linku wpisz kod swojej grupy, np. WCY26IY4S1.
      </p>

      <form onSubmit={handleSubmit}>
        <label className="field-label" htmlFor="ical-url">
          Odnośnik do planu (albo kod grupy WAT)
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
            {busy ? 'Wczytuję…' : 'Wczytaj plan'}
          </button>
        </div>
      </form>
      <p className="hint">
        Link działa jak hasło do Twojego planu. Jest zapisywany tylko w tej przeglądarce, a plan
        odświeża się sam przy każdym otwarciu strony.
      </p>

      <div className="divider">albo</div>

      <label className={`button secondary${busy ? ' is-disabled' : ''}`}>
        Wgraj plik .ics
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
