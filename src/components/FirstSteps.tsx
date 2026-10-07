import { t } from '../lib/i18n'
import { usePlanUi } from '../hooks/planUi'
import { isIos, isStandalone } from '../lib/push'
import { revealWhenReady } from '../lib/reveal'

// Starsze "Ukryj" było zapamiętane tylko w przeglądarce - dalej je honorujemy.
const OLD_HIDDEN_KEY = 'planer.first-steps-hidden'

function hiddenBefore(): boolean {
  try {
    return localStorage.getItem(OLD_HIDDEN_KEY) === '1'
  } catch {
    return false
  }
}

interface Step {
  id: string
  title: string
  hint: string
  done: boolean // zrobione samo (np. Planer już na ekranie telefonu)
  action?: { label: string; run: () => void }
}

interface Props {
  courseName: string | null // przedmiot do pokazania w kroku "Zajrzyj do przedmiotu" (najbliższe zajęcia)
}

// "Pierwsze kroki" na ekranie Dziś: krótkie zapoznanie z Planerem, jeden krok naraz. Nic na siłę -
// krok odhacza się sam, gdy go zrobisz (otworzysz przedmiot, wyszukasz), albo po "Pomiń".
// Zrobione, pominięte i "Ukryj" - w ustawieniach na koncie, więc na wszystkich urządzeniach.
export function FirstSteps({ courseName }: Props) {
  const { extras, prefs, openCourse, openSearch, openSettings, skipFirstStep, hideFirstSteps } = usePlanUi()
  // Dopóki ustawienia z konta się nie wczytały, kroki wyglądałyby na niezrobione - karta mignęłaby i znikła.
  if (!extras || !extras.ready || prefs.firstSteps.hidden || hiddenBefore()) return null

  const phone = window.matchMedia('(pointer: coarse)').matches
  const notificationsOn = 'Notification' in window && Notification.permission === 'granted'
  const steps: Step[] = [
    ...(phone
      ? [
          {
            id: 'home',
            title: t('Planer na ekranie telefonu'),
            hint: isIos()
              ? t('W Safari: Udostępnij → „Do ekranu początkowego”. Otwiera się wtedy jak aplikacja.')
              : t('W Chrome: menu ⋮ → „Zainstaluj aplikację”.'),
            done: isStandalone(),
          },
        ]
      : []),
    {
      id: 'course',
      title: t('Zajrzyj do przedmiotu'),
      hint: t('Zaliczenie, punkty, notatki i materiały - wszystko o przedmiocie w jednym miejscu.'),
      done: false,
      action: courseName ? { label: t('Otwórz'), run: () => openCourse(courseName) } : undefined,
    },
    {
      id: 'search',
      title: t('Wyszukiwanie'),
      hint: phone && isIos()
        ? t('Pociągnij ekran w dół na samej górze - znajdziesz przedmiot, salę, termin albo ustawienie.')
        : t('Lupa na górze - znajdziesz przedmiot, salę, termin albo ustawienie.'),
      done: false,
      action: { label: t('Spróbuj'), run: openSearch },
    },
    {
      id: 'reminders',
      title: t('Przypomnienia o terminach'),
      hint: t('Powiadomienie przed kolokwium czy egzaminem, także przy zamkniętym Planerze.'),
      done: notificationsOn,
      action: {
        label: t('Włącz'),
        run: () => {
          openSettings()
          revealWhenReady('settings-reminders')
        },
      },
    },
  ]
  const finished = (s: Step) => s.done || prefs.firstSteps.done.includes(s.id)
  const next = steps.find((s) => !finished(s))
  if (!next) return null
  const position = steps.filter(finished).length + 1

  return (
    <div className="panel first-steps">
      <div className="section-head">
        <h3 className="panel-title">
          {t('Pierwsze kroki')}{' '}
          <span className="muted first-steps-count">{t('{done} z {total}', { done: position, total: steps.length })}</span>
        </h3>
        <button type="button" className="link-button" onClick={hideFirstSteps}>
          {t('Ukryj')}
        </button>
      </div>
      {/* key - kolejny krok wjeżdża od nowa */}
      <div key={next.id} className="first-step">
        <strong>{next.title}</strong>
        <p className="muted">{next.hint}</p>
        <div className="first-step-actions">
          {next.action && (
            <button type="button" className="button small" onClick={next.action.run}>
              {next.action.label}
            </button>
          )}
          <button type="button" className="button small secondary" onClick={() => skipFirstStep(next.id)}>
            {next.action ? t('Pomiń') : t('Dalej')}
          </button>
        </div>
      </div>
    </div>
  )
}
