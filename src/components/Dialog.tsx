import { useEffect, useId, useRef, type ReactNode } from 'react'

interface Props {
  title: string
  onClose: () => void
  children: ReactNode
  wide?: boolean // szerokie okno (np. podgląd tygodnia w siatce)
}

// Okno dialogowe na natywnym <dialog>: Esc i kliknięcie obok zamykają, fokus zostaje w środku.
// Renderuj je tylko wtedy, gdy ma być otwarte.
export function Dialog({ title, onClose, children, wide = false }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  return (
    <dialog
      ref={ref}
      className={wide ? 'dialog dialog-wide' : 'dialog'}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose() // kliknięcie w tło
      }}
    >
      <div className="dialog-body">
        <header className="dialog-header">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="dialog-close" aria-label="Zamknij" onClick={onClose}>
            {/* Ikona zamiast znaku "×" - znak siedzi w kółku krzywo (zależy od czcionki). */}
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </header>
        {children}
      </div>
    </dialog>
  )
}
