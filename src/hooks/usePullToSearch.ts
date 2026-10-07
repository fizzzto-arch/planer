import { useEffect, useRef, useState } from 'react'

// Ile trzeba pociągnąć (po wytłumieniu), żeby po puszczeniu otworzyło się wyszukiwanie.
export const PULL_THRESHOLD = 56
const START_PX = 10 // mniejszy ruch to jeszcze stuknięcie
const DAMPING = 0.55 // pasek jedzie wolniej niż palec, jak w iOS
const MAX_PULL = 96

// Gdzie pociągnięcie nie otwiera wyszukiwania: pola tekstowe, okna, wyszukiwarka.
const IGNORED = 'input, textarea, select, dialog, [contenteditable="true"], .search'

// Pociągnięcie palcem w dół na samej górze strony: zwraca, ile pociągnięto (o tyle wysuwa się pasek
// wyszukiwania), a po puszczeniu za progiem woła onOpen. Ruch w bok zostaje dla przesuwania zakładek.
export function usePullToSearch(enabled: boolean, onOpen: () => void): number {
  const [pull, setPull] = useState(0)
  const open = useRef(onOpen)
  useEffect(() => {
    open.current = onOpen
  })

  useEffect(() => {
    if (!enabled) return
    let start: { x: number; y: number } | null = null
    let pulling = false
    let distance = 0

    const reset = () => {
      start = null
      pulling = false
      distance = 0
      setPull(0)
    }
    const onStart = (e: TouchEvent) => {
      const target = e.target instanceof Element ? e.target : null
      if (e.touches.length !== 1 || window.scrollY > 0 || target?.closest(IGNORED) || document.querySelector('dialog[open]')) {
        start = null
        return
      }
      start = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      pulling = false
      distance = 0
    }
    const onMove = (e: TouchEvent) => {
      if (!start) return
      const dx = e.touches[0].clientX - start.x
      const dy = e.touches[0].clientY - start.y
      if (!pulling) {
        if (Math.abs(dx) > START_PX && Math.abs(dx) > Math.abs(dy)) {
          start = null // w bok - to przesuwanie zakładek
          return
        }
        if (dy < -START_PX) start = null // w górę - zwykłe przewijanie
        if (dy < START_PX) return
        pulling = true
      }
      if (e.cancelable) e.preventDefault() // bez "gumowego" odbicia strony pod paskiem
      distance = Math.min(Math.max(dy - START_PX, 0) * DAMPING, MAX_PULL)
      setPull(distance)
    }
    const onEnd = () => {
      const opened = pulling && distance >= PULL_THRESHOLD
      reset()
      if (opened) open.current()
    }

    window.addEventListener('touchstart', onStart, { passive: true })
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onEnd)
    window.addEventListener('touchcancel', reset)
    return () => {
      window.removeEventListener('touchstart', onStart)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
      window.removeEventListener('touchcancel', reset)
    }
  }, [enabled])

  return enabled ? pull : 0
}
