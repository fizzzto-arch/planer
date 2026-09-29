import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './extras.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary'
import { registerServiceWorker } from './lib/push'

// Service worker tylko do powiadomień o terminach.
registerServiceWorker()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
