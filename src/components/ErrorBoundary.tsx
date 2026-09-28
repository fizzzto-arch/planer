import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

// Błąd w jednym widoku nie może dać białej strony: pokazujemy komunikat,
// a reszta aplikacji (np. zakładki) dalej działa.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="panel crash" role="alert">
        <h2 className="day-title">Coś poszło nie tak</h2>
        <p className="muted">Twój plan, notatki i terminy są bezpieczne. Odśwież stronę albo przejdź do innej zakładki.</p>
        <button type="button" className="button" onClick={() => window.location.reload()}>
          Odśwież
        </button>
        <details className="collapsible">
          <summary>Szczegóły błędu</summary>
          <pre className="crash-details">{this.state.error.message}</pre>
        </details>
      </div>
    )
  }
}
