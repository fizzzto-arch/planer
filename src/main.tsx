import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './extras.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary'
import { wipeIfSessionEnded } from './lib/deviceMemory'
import { registerServiceWorker } from './lib/push'
import { listenForErrors } from './lib/errorReport'
import { detectLanguage, loadEnglish } from './lib/i18n'
import { loadLocalPrefs } from './lib/prefs'

// Service worker tylko do powiadomień o terminach.
registerServiceWorker()
// Wyjątki spoza widoków (np. w obsłudze kliknięć) też trafiają do administratora.
listenForErrors()

// Najpierw sprzątanie po sesji "bez zapamiętania urządzenia" - zanim cokolwiek wczyta dane.
// Angielski interfejs: słownik przed pierwszym rysowaniem (polski go nie pobiera).
const english = (loadLocalPrefs()?.language ?? detectLanguage()) === 'en'
void Promise.all([wipeIfSessionEnded(), english ? loadEnglish().catch(() => undefined) : null]).then(() =>
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  ),
)
