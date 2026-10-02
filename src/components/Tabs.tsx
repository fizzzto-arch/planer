import { t } from '../lib/i18n'
import { useImperativeHandle, useLayoutEffect, useRef, type ReactNode, type Ref } from 'react'

// Sterowanie podświetleniem z zewnątrz - przesuwanie widoku palcem przesuwa też suwak.
export interface TabsControl {
  preview: (offset: number) => void // przesunięcie o ułamek zakładki od aktywnej (+ = w prawo)
  settle: () => void // powrót na aktywną zakładkę
}

interface Props<T extends string> {
  tabs: { id: T; label: string; icon?: ReactNode }[] // z ikoną: sama ikona, etykieta dla czytników ekranu
  value: T
  onChange: (id: T) => void
  controlRef?: Ref<TabsControl>
}

// Ruch, po którym przytrzymanie suwaka staje się przeciąganiem (a nie stuknięciem).
const DRAG_START_PX = 6

const tabElements = (list: HTMLElement) => [...list.querySelectorAll<HTMLElement>('.tab')]

// Suwak w miejscu "position" - ułamkowy numer zakładki, np. 1.5 = w połowie między drugą a trzecią.
function placeIndicator(list: HTMLElement, indicator: HTMLElement, position: number) {
  const els = tabElements(list)
  if (els.length === 0) return
  const clamped = Math.min(Math.max(position, 0), els.length - 1)
  const i = Math.floor(clamped)
  const j = Math.min(i + 1, els.length - 1)
  const f = clamped - i
  const left = els[i].offsetLeft + (els[j].offsetLeft - els[i].offsetLeft) * f
  const width = els[i].offsetWidth + (els[j].offsetWidth - els[i].offsetWidth) * f
  indicator.style.width = `${width}px`
  indicator.style.transform = `translateX(${left}px)`
  // Biały tekst ma zakładka, nad którą akurat jest suwak.
  const under = Math.round(clamped)
  els.forEach((el, k) => el.classList.toggle('is-under', k === under))
}

// Ułamkowy numer zakładki pod palcem - środki zakładek to liczby całkowite.
function positionAt(list: HTMLElement, clientX: number): number {
  const els = tabElements(list)
  const x = clientX - list.getBoundingClientRect().left
  const centers = els.map((el) => el.offsetLeft + el.offsetWidth / 2)
  if (x <= centers[0]) return 0
  for (let k = 0; k < centers.length - 1; k++) {
    if (x <= centers[k + 1]) return k + (x - centers[k]) / (centers[k + 1] - centers[k])
  }
  return centers.length - 1
}

// Zakładki z podświetleniem, które płynnie przesuwa się pod aktywną pozycję.
// Suwak można też chwycić i przeciągnąć - po puszczeniu zatrzaskuje się na najbliższej zakładce.
export function Tabs<T extends string>({ tabs, value, onChange, controlRef }: Props<T>) {
  const listRef = useRef<HTMLElement>(null)
  const indicatorRef = useRef<HTMLSpanElement>(null)
  const activeIndex = Math.max(0, tabs.findIndex((item) => item.id === value))
  const drag = useRef<{ startX: number; moved: boolean; position: number } | null>(null)
  const swallowClick = useRef(false)

  const startDragging = () => {
    listRef.current?.classList.add('is-dragging')
    if (indicatorRef.current) indicatorRef.current.style.transition = 'none'
  }

  const settle = () => {
    const list = listRef.current
    const indicator = indicatorRef.current
    if (!list || !indicator) return
    list.classList.remove('is-dragging')
    indicator.style.transition = ''
    placeIndicator(list, indicator, activeIndex)
  }

  useImperativeHandle(controlRef, () => ({
    preview: (offset) => {
      const list = listRef.current
      const indicator = indicatorRef.current
      if (!list || !indicator) return
      startDragging()
      placeIndicator(list, indicator, activeIndex + offset)
    },
    settle,
  }))

  // Napisy zakładek (np. po zmianie języka) zmieniają ich szerokość - suwak liczymy od nowa.
  const labels = tabs.map((tab) => tab.label).join('|')

  useLayoutEffect(() => {
    const list = listRef.current
    const indicator = indicatorRef.current
    if (!list || !indicator) return

    // Zmiana rozmiaru w trakcie przeciągania nie zabiera suwaka spod palca.
    const place = () => {
      if (!list.classList.contains('is-dragging')) placeIndicator(list, indicator, activeIndex)
    }
    list.classList.remove('is-dragging')
    indicator.style.transition = ''
    place()
    // Animację włączamy dopiero po pierwszym ustawieniu, żeby nie "wjeżdżała" przy starcie.
    const frame = requestAnimationFrame(() => {
      indicator.dataset.ready = 'true'
    })
    const observer = new ResizeObserver(place)
    observer.observe(list)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [activeIndex, labels])

  return (
    <nav
      className="tabs"
      aria-label={t('Widok')}
      ref={listRef}
      onPointerDown={(e) => {
        // Chwytamy tylko niebieski suwak, czyli aktywną zakładkę.
        if (!(e.target instanceof Element) || !e.target.closest('.tab.is-active')) return
        drag.current = { startX: e.clientX, moved: false, position: activeIndex }
        try {
          e.currentTarget.setPointerCapture(e.pointerId) // palec może zjechać z paska, a suwak dalej za nim idzie
        } catch {
          // dotyk już się skończył (bardzo szybkie stuknięcie) - bez przechwycenia, zwykłe kliknięcie
        }
      }}
      onPointerMove={(e) => {
        const d = drag.current
        const list = listRef.current
        const indicator = indicatorRef.current
        if (!d || !list || !indicator) return
        if (!d.moved) {
          if (Math.abs(e.clientX - d.startX) < DRAG_START_PX) return
          d.moved = true
          startDragging()
        }
        d.position = activeIndex + positionAt(list, e.clientX) - positionAt(list, d.startX)
        placeIndicator(list, indicator, d.position)
      }}
      onPointerUp={() => {
        const d = drag.current
        drag.current = null
        if (!d?.moved) return
        // Puszczenie nad inną zakładką nie jest jej stuknięciem. Kliknięcie (jeśli w ogóle przyjdzie)
        // przychodzi zaraz po puszczeniu - potem blokada znika, żeby nie zjadła następnego stuknięcia.
        swallowClick.current = true
        window.setTimeout(() => {
          swallowClick.current = false
        }, 0)
        const target = Math.min(Math.max(Math.round(d.position), 0), tabs.length - 1)
        if (target === activeIndex) settle()
        else onChange(tabs[target].id)
      }}
      onPointerCancel={() => {
        if (drag.current?.moved) settle()
        drag.current = null
      }}
      onClickCapture={(e) => {
        if (!swallowClick.current) return
        swallowClick.current = false
        e.stopPropagation()
      }}
    >
      <span className="tab-indicator" ref={indicatorRef} aria-hidden="true" />
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`tab${value === tab.id ? ' is-active' : ''}${tab.icon ? ' is-icon' : ''}`}
          aria-current={value === tab.id ? 'page' : undefined}
          aria-label={tab.icon ? tab.label : undefined}
          title={tab.icon ? tab.label : undefined}
          onClick={() => onChange(tab.id)}
        >
          {tab.icon ?? tab.label}
        </button>
      ))}
    </nav>
  )
}
