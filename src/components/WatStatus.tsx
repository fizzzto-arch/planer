import { locale, t } from '../lib/i18n'
import { useRef, type ChangeEvent } from 'react'
import type { PlanApi } from '../hooks/usePlan'
import { WAT_PLAN_URL, parseWatTimestamp } from '../lib/wat'

// WAT generuje plany co noc - plan starszy niż dwa dni znaczy, że nasze pobieranie nie działa.
const STALE_MS = 2 * 24 * 60 * 60 * 1000

interface Props {
  plan: PlanApi
  group: string
  now: Date
}

// Plan grupy WAT: z kiedy jest. Od października 2026 WAT blokuje automatyczne pobieranie planów, więc
// przy starszym planie - ostrzeżenie, link do planu grupy na stronie WAT i wgranie zapisanej strony.
export function WatStatus({ plan, group, now }: Props) {
  const file = useRef<HTMLInputElement>(null)
  const { status } = plan
  const date = parseWatTimestamp(plan.watUpdatedAt)
  const stale = !date || now.getTime() - date.getTime() > STALE_MS

  let text: string
  if (status.kind === 'loading') text = t('Odświeżam plan…')
  else if (status.kind === 'error') text = status.message
  else if (date) text = t('Plan grupy {group} z WAT z {day}.', { group, day: date.toLocaleDateString(locale(), { day: 'numeric', month: 'long' }) })
  else text = t('Plan grupy {group} z WAT.', { group })

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const chosen = e.target.files?.[0]
    e.target.value = '' // ten sam plik jeszcze raz też ma zadziałać
    if (chosen) void plan.importWatPage(chosen)
  }

  return (
    <>
      <p className={`sync${status.kind === 'error' ? ' is-error' : ''}`}>
        {text}{' '}
        <button type="button" className="link-button" onClick={() => void plan.refresh()} disabled={status.kind === 'loading'}>
          <svg className={`inline-icon refresh-icon${status.kind === 'loading' ? ' is-spinning' : ''}`} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20 12a8 8 0 1 1-2.34-5.66M20 4v5h-5" />
          </svg>
          {t('Odśwież')}
        </button>
      </p>
      {stale && (
        <div className="wat-stale" role="note">
          <p>
            {t('Plan może być nieaktualny: WAT blokuje automatyczne pobieranie planów. Sprawdź go na stronie WAT albo wgraj sam - wtedy będzie aktualny.')}
          </p>
          <div className="wat-stale-actions">
            <a className="button small secondary" href={`${WAT_PLAN_URL}?grupa_id=${group}`} target="_blank" rel="noopener noreferrer">
              {t('Plan na stronie WAT')}
            </a>
            <button type="button" className="button small" onClick={() => file.current?.click()}>
              {t('Wgraj zapisaną stronę')}
            </button>
            <input
              ref={file}
              type="file"
              accept=".html,.htm,.mhtml,.mht,.webarchive,text/html"
              onChange={onFile}
              hidden
            />
          </div>
          <details className="wat-how">
            <summary>{t('Jak zapisać stronę?')}</summary>
            <ol>
              <li>{t('Otwórz plan swojej grupy na stronie WAT (przycisk wyżej).')}</li>
              <li>
                {t('Zapisz stronę: na komputerze Ctrl+S (Mac: Cmd+S), na Androidzie w Chrome ⋮ → Pobierz, na iPhonie w Safari Udostępnij → Opcje → Archiwum WWW → Zachowaj w Plikach.')}
              </li>
              <li>{t('Wróć tutaj, stuknij „Wgraj zapisaną stronę” i wybierz zapisany plik. Z kontem plan trafi też na Twoje inne urządzenia.')}</li>
            </ol>
          </details>
        </div>
      )}
    </>
  )
}
