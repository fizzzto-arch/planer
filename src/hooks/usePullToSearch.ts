import { useEffect, useRef, type RefObject } from 'react'

// Ile trzeba pociągnąć (po wytłumieniu), żeby po puszczeniu otworzyło się wyszukiwanie.
export const PULL_THRESHOLD = 56
const START_PX = 10 // mniejszy ruch to jeszcze stuknięcie
const DAMPING = 0.55 // pasek jedzie wolniej niż palec, jak w iOS
const MAX_PULL = 96
const SETTLE_MS = 240 // dojazd paska na miejsce (albo schowanie) po puszczeniu
const SETTLE = `height ${SETTLE_MS}ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity ${SETTLE_MS}ms ease`

// Gdzie pociągnięcie nie otwiera wyszukiwania: pola tekstowe, okna, sam pasek.
const IGNORED = 'input, textarea, select, dialog, [contenteditable="true"], .search-reveal'

// Pociągnięcie palcem w dół na samej górze strony wysuwa pasek wyszukiwania (reveal) razem z palcem;
// po puszczeniu za progiem pasek dojeżdża na miejsce i woła się onOpen - jeszcze w trakcie gestu, żeby
// iPhone mógł pokazać klawiaturę. Pasek przesuwamy bezpośrednio w stronie (bez przebudowy aplikacji
// przy każdym ruchu palca - to dawało przycinanie). Ruch w bok zostaje dla przesuwania zakładek.
export function usePullToSearch(enabled: boolean, reveal: RefObject<HTMLElement | null>, onOpen: () => void): void {
  const open = useRef(onOpen)
  useEffect(() => {
    open.current = onOpen
  })

  useEffect(() => {
    if (!enabled) return
    let start: { x: number; y: number } | null = null
    let pulling = false
    let distance = 0
    let frame = 0
    let settle: ReturnType<typeof setTimeout> | undefined

    const paint = () => {
      frame = 0
      const el = reveal.current
      if (!el) return
      el.style.transition = 'none'
      el.style.visibility = 'visible'
      el.style.height = `${distance}px`
      el.style.opacity = String(Math.min(1, distance / PULL_THRESHOLD))
    }
    const clear = (el: HTMLElement) => {
      el.style.transition = ''
      el.style.visibility = ''
      el.style.height = ''
      el.style.opacity = ''
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
        clearTimeout(settle)
      }
      if (e.cancelable) e.preventDefault() // bez "gumowego" odbicia strony pod paskiem
      distance = Math.min(Math.max(dy - START_PX, 0) * DAMPING, MAX_PULL)
      if (!frame) frame = requestAnimationFrame(paint)
    }
    const finish = (opened: boolean) => {
      cancelAnimationFrame(frame)
      frame = 0
      const el = reveal.current
      if (el) {
        // Dojazd: na wysokość paska (otwarte) albo z powrotem do zera; potem rządzi już klasa z aplikacji.
        el.style.transition = SETTLE
        el.style.height = opened ? 'var(--search-bar-h)' : '0px'
        el.style.opacity = opened ? '1' : '0'
        settle = setTimeout(() => clear(el), SETTLE_MS)
      }
    }
    const onEnd = () => {
      if (!pulling) {
        start = null
        return
      }
      const opened = distance >= PULL_THRESHOLD
      start = null
      pulling = false
      finish(opened)
      if (opened) open.current()
    }
    const onCancel = () => {
      if (pulling) finish(false)
      start = null
      pulling = false
    }

    window.addEventListener('touchstart', onStart, { passive: true })
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onEnd)
    window.addEventListener('touchcancel', onCancel)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('touchstart', onStart)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
      window.removeEventListener('touchcancel', onCancel)
    }
  }, [enabled, reveal])
}
