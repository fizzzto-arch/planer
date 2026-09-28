import { useLayoutEffect, useRef, type ReactNode } from 'react'

interface Props<T extends string> {
  tabs: { id: T; label: string; icon?: ReactNode }[] // z ikoną: sama ikona, etykieta dla czytników ekranu
  value: T
  onChange: (id: T) => void
}

// Zakładki z podświetleniem, które płynnie przesuwa się pod aktywną pozycję.
export function Tabs<T extends string>({ tabs, value, onChange }: Props<T>) {
  const listRef = useRef<HTMLElement>(null)
  const indicatorRef = useRef<HTMLSpanElement>(null)

  useLayoutEffect(() => {
    const list = listRef.current
    const indicator = indicatorRef.current
    if (!list || !indicator) return

    const place = () => {
      const active = list.querySelector<HTMLElement>('.tab.is-active')
      if (!active) return
      indicator.style.width = `${active.offsetWidth}px`
      indicator.style.transform = `translateX(${active.offsetLeft}px)`
    }
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
  }, [value])

  return (
    <nav className="tabs" aria-label="Widok" ref={listRef}>
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
