import { t } from '../lib/i18n'
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { isStaleChunkError, reloadForNewVersion, reportError } from '../lib/errorReport'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

// Błąd w jednym widoku nie może dać białej strony: pokazujemy komunikat,
// a reszta aplikacji (np. zakładki) dalej działa. Administrator dostaje zgłoszenie automatycznie.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Otwarta stara wersja po wdrożeniu nowej - wystarczy przeładować, to nie błąd do zgłoszenia.
    // Bez internetu ta część strony po prostu się nie wczytała - przeładowanie nic nie da.
    if (isStaleChunkError(error)) {
      if (navigator.onLine) reloadForNewVersion()
      return
    }
    reportError(error, 'widok', info.componentStack ?? undefined)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    if (isStaleChunkError(error) && !navigator.onLine) {
      return (
        <div className="panel crash" role="alert">
          <h2 className="day-title">{t('Brak internetu')}</h2>
          <p className="muted">
            {t('Ta część Planera wczyta się po połączeniu. Plan, terminy i notatki działają bez sieci - wróć do innej zakładki.')}
          </p>
          <button type="button" className="button" onClick={() => window.location.reload()}>
            {t('Spróbuj ponownie')}
          </button>
        </div>
      )
    }
    if (isStaleChunkError(error)) {
      return (
        <div className="panel crash" role="alert">
          <h2 className="day-title">{t('Jest nowa wersja Planera')}</h2>
          <p className="muted">{t('Odśwież stronę, żeby ją wczytać. Twoje dane są bezpieczne.')}</p>
          <button type="button" className="button" onClick={() => window.location.reload()}>
            {t('Odśwież')}
          </button>
        </div>
      )
    }
    return (
      <div className="panel crash" role="alert">
        <h2 className="day-title">{t('Coś poszło nie tak')}</h2>
        <p className="muted">
          {t('Twój plan, notatki i terminy są bezpieczne. Odśwież stronę albo przejdź do innej zakładki. Opis błędu trafił automatycznie do administratora.')}
        </p>
        <button type="button" className="button" onClick={() => window.location.reload()}>
          {t('Odśwież')}
        </button>
        <details className="collapsible">
          <summary>{t('Szczegóły błędu')}</summary>
          <pre className="crash-details">{error.message}</pre>
        </details>
      </div>
    )
  }
}
