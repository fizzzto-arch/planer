import { useEffect, useRef, type RefObject } from 'react'

export interface SwipeHandlers {
  onStart?: () => void // palec ruszył w bok - gest się zaczyna
  onMove: (dx: number) => void // przesunięcie od początku gestu (+ = w prawo)
  onEnd: (dx: number, velocity: number) => void // prędkość w px/ms z ostatniego ruchu
  onCancel?: () => void // system przerwał dotyk (np. połączenie przychodzące)
}

interface Options {
  enabled: boolean
  edge?: number // tylko gesty zaczęte przy lewej krawędzi ekranu (px)
  ignoreEdges?: number // pomijaj gesty od krawędzi - tam działa gest przeglądarki
}

// Ruch, po którym rozstrzygamy: gest w bok czy zwykłe przewijanie w pionie.
const LOCK_DISTANCE = 10

// Dotyk poza tymi elementami - w polach tekstowych przesuwa się kursor.
const IGNORED = 'input, textarea, select, dialog, [data-no-swipe]'

// Dotyk w elemencie przewijanym w bok (np. szeroka siatka tygodnia) - tam przesunięcie przewija.
function inHorizontalScroller(node: Element | null): boolean {
  for (let n = node; n && n !== document.body; n = n.parentElement) {
    const { overflowX } = getComputedStyle(n)
    if ((overflowX === 'auto' || overflowX === 'scroll') && n.scrollWidth > n.clientWidth) return true
  }
  return false
}

// Przesunięcie palcem w bok. target = element albo cały dokument (gest od krawędzi).
export function useHorizontalSwipe(
  target: RefObject<HTMLElement | null> | 'document',
  handlers: SwipeHandlers,
  { enabled, edge, ignoreEdges }: Options,
) {
  const handlersRef = useRef(handlers)
  useEffect(() => {
    handlersRef.current = handlers
  })

  useEffect(() => {
    if (!enabled) return
    const el = target === 'document' ? document : target.current
    if (!el) return

    let start: { x: number; y: number } | null = null
    let horizontal = false
    let last = { x: 0, t: 0 }
    let prev = { x: 0, t: 0 }

    const onTouchStart = (e: Event) => {
      const { touches, target: touched, timeStamp } = e as TouchEvent
      start = null
      if (touches.length !== 1) return
      const { clientX, clientY } = touches[0]
      if (edge !== undefined && clientX > edge) return
      if (ignoreEdges !== undefined && (clientX < ignoreEdges || clientX > window.innerWidth - ignoreEdges)) return
      if (touched instanceof Element && (touched.closest(IGNORED) || inHorizontalScroller(touched))) return
      if (document.querySelector('dialog[open]')) return
      start = { x: clientX, y: clientY }
      horizontal = false
      last = prev = { x: clientX, t: timeStamp }
    }

    const onTouchMove = (e: Event) => {
      const event = e as TouchEvent
      if (!start) return
      const { clientX, clientY } = event.touches[0]
      const dx = clientX - start.x
      const dy = clientY - start.y
      if (!horizontal) {
        if (Math.abs(dx) < LOCK_DISTANCE && Math.abs(dy) < LOCK_DISTANCE) return
        if (Math.abs(dx) <= Math.abs(dy) * 1.2) {
          start = null // przewijanie w pionie - nie przeszkadzamy
          return
        }
        horizontal = true
        handlersRef.current.onStart?.()
      }
      event.preventDefault() // w trakcie gestu strona nie przewija się w pionie
      prev = last
      last = { x: clientX, t: event.timeStamp }
      handlersRef.current.onMove(dx)
    }

    const onTouchEnd = () => {
      if (!start) return
      const dx = last.x - start.x
      start = null
      if (!horizontal) return
      const velocity = (last.x - prev.x) / Math.max(1, last.t - prev.t)
      handlersRef.current.onEnd(dx, velocity)
    }

    const onTouchCancel = () => {
      if (start && horizontal) handlersRef.current.onCancel?.()
      start = null
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd)
    el.addEventListener('touchcancel', onTouchCancel)
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('touchcancel', onTouchCancel)
    }
  }, [target, enabled, edge, ignoreEdges])
}

// Aplikacja z ekranu początkowego iPhone'a - bez paska Safari i jego gestu "wstecz".
export function isIosStandalone(): boolean {
  return (navigator as Navigator & { standalone?: boolean }).standalone === true
}

// Przesuwa element za palcem; animate = płynny dojazd (powrót na miejsce albo odjazd).
export function slideElement(el: HTMLElement | null, dx: number, animate: boolean, fade = false) {
  if (!el) return
  el.style.transition = animate ? 'transform 220ms ease-out, opacity 220ms ease-out' : 'none'
  el.style.transform = dx === 0 ? '' : `translateX(${dx}px)`
  el.style.opacity = !fade || dx === 0 ? '' : String(1 - Math.min(0.5, Math.abs(dx) / window.innerWidth))
}

// Czy gest ma "przeskoczyć" dalej: wystarczająco daleko albo szybkim machnięciem w tę stronę.
export function isFling(dx: number, velocity: number, distance: number): boolean {
  return Math.abs(dx) > distance || (Math.abs(velocity) > 0.4 && Math.sign(velocity) === Math.sign(dx) && Math.abs(dx) > 20)
}
