import { useEffect, useRef, type RefObject } from 'react'
import { swipeLog } from '../lib/swipeDebug'

export interface SwipeHandlers {
  onStart?: () => void // palec ruszył w bok - gest się zaczyna
  onMove: (dx: number) => void // przesunięcie od początku gestu (+ = w prawo)
  onEnd: (dx: number, velocity: number) => void // prędkość w px/ms z ostatniego ruchu
  onCancel?: () => void // system przerwał dotyk (np. połączenie przychodzące)
}

interface Options {
  name: string // do diagnostyki gestów
  enabled: boolean
  onlyRight?: boolean // tylko gest w prawo ("wstecz"); ruch w lewo zostaje stronie
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

// Przesunięcie palcem w bok na elemencie target.
export function useHorizontalSwipe(
  target: RefObject<HTMLElement | null>,
  handlers: SwipeHandlers,
  { name, enabled, onlyRight, ignoreEdges }: Options,
) {
  const handlersRef = useRef(handlers)
  useEffect(() => {
    handlersRef.current = handlers
  })

  useEffect(() => {
    if (!enabled) return
    const el = target.current
    if (!el) {
      swipeLog(`${name}: brak elementu`)
      return
    }

    let start: { x: number; y: number } | null = null
    let horizontal = false
    let moves = 0
    let last = { x: 0, t: 0 }
    let prev = { x: 0, t: 0 }

    const onTouchStart = (e: TouchEvent) => {
      const { touches, target: touched, timeStamp } = e
      start = null
      if (touches.length !== 1) return
      const { clientX, clientY } = touches[0]
      const skip =
        ignoreEdges !== undefined && (clientX < ignoreEdges || clientX > window.innerWidth - ignoreEdges)
          ? 'krawędź'
          : touched instanceof Element && touched.closest(IGNORED)
            ? 'pole/okno'
            : touched instanceof Element && inHorizontalScroller(touched)
              ? 'przewijany element'
              : document.querySelector('dialog[open]')
                ? 'otwarte okno'
                : null
      swipeLog(`${name}: start x=${Math.round(clientX)}${skip ? ` pomijam (${skip})` : ''}`)
      if (skip) return
      start = { x: clientX, y: clientY }
      horizontal = false
      moves = 0
      last = prev = { x: clientX, t: timeStamp }
    }

    const onTouchMove = (e: TouchEvent) => {
      if (!start) return
      const { clientX, clientY } = e.touches[0]
      const dx = clientX - start.x
      const dy = clientY - start.y
      if (!horizontal) {
        if (Math.abs(dx) < LOCK_DISTANCE && Math.abs(dy) < LOCK_DISTANCE) return
        if (Math.abs(dx) <= Math.abs(dy) * 1.2 || (onlyRight && dx < 0)) {
          swipeLog(`${name}: to nie gest (dx=${Math.round(dx)} dy=${Math.round(dy)})`)
          start = null // przewijanie w pionie (albo zły kierunek) - nie przeszkadzamy
          return
        }
        horizontal = true
        swipeLog(`${name}: gest w bok, cancelable=${e.cancelable}`)
        handlersRef.current.onStart?.()
      }
      if (e.cancelable) e.preventDefault() // w trakcie gestu strona nie przewija się w pionie
      moves++
      prev = last
      last = { x: clientX, t: e.timeStamp }
      handlersRef.current.onMove(dx)
    }

    const onTouchEnd = () => {
      if (!start) return
      const dx = last.x - start.x
      start = null
      if (!horizontal) return
      const velocity = (last.x - prev.x) / Math.max(1, last.t - prev.t)
      swipeLog(`${name}: koniec dx=${Math.round(dx)} v=${velocity.toFixed(2)} ruchów=${moves}`)
      handlersRef.current.onEnd(dx, velocity)
    }

    const onTouchCancel = () => {
      if (start && horizontal) handlersRef.current.onCancel?.()
      if (start) swipeLog(`${name}: przerwane przez system`)
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
  }, [target, name, enabled, onlyRight, ignoreEdges])
}


// Aplikacja z ekranu początkowego - bez paska Safari i jego gestów "wstecz / dalej" od krawędzi.
// navigator.standalone to stary sposób iOS, display-mode - nowszy; sprawdzamy oba.
export function isStandaloneApp(): boolean {
  return (
    (navigator as Navigator & { standalone?: boolean }).standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches
  )
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
