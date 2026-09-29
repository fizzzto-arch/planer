import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './extras.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary'
import { wipeIfSessionEnded } from './lib/deviceMemory'
import { registerServiceWorker } from './lib/push'
import { listenForErrors } from './lib/errorReport'

// Service worker tylko do powiadomień o terminach.
registerServiceWorker()
// Wyjątki spoza widoków (np. w obsłudze kliknięć) też trafiają do administratora.
listenForErrors()

// Najpierw sprzątanie po sesji "bez zapamiętania urządzenia" - zanim cokolwiek wczyta dane.
void wipeIfSessionEnded().then(() =>
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  ),
)
