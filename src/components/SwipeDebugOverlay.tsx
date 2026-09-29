import { useSyncExternalStore } from 'react'
import { swipeDebugStore } from '../lib/swipeDebug'

// Ostatnie zdarzenia gestów na dole ekranu - tylko gdy administrator włączył diagnostykę.
export function SwipeDebugOverlay() {
  const enabled = useSyncExternalStore(swipeDebugStore.subscribe, swipeDebugStore.enabled)
  const lines = useSyncExternalStore(swipeDebugStore.subscribe, swipeDebugStore.lines)
  if (!enabled) return null
  const standalone = (navigator as Navigator & { standalone?: boolean }).standalone
  const displayMode = window.matchMedia('(display-mode: standalone)').matches ? 'standalone' : 'przeglądarka'
  return (
    <pre className="swipe-debug" aria-hidden="true">
      {`tryb: ${displayMode}, navigator.standalone=${String(standalone)}\n`}
      {lines.length > 0 ? lines.join('\n') : 'dotknij i przesuń palcem…'}
    </pre>
  )
}
