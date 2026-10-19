import { t, tk } from '../lib/i18n'
import { useState } from 'react'
import { CHANGELOG, markReleaseSeen, releaseToShow } from '../lib/changelog'
import { parseDateKey } from '../lib/dates'
import { Dialog } from './Dialog'

function releaseDate(date: string): string {
  const d = parseDateKey(date)
  return d ? `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}` : date
}

// Wszystkie wersje z listą zmian (najnowsza na górze).
export function WhatsNewDialog({ onClose }: { onClose: () => void }) {
  return (
    <Dialog title={t('Co nowego w Planerze')} onClose={onClose}>
      {CHANGELOG.map((release) => (
        <section key={release.version} className="whats-new-release">
          <h4>
            {t('Wersja {version}', { version: release.version })} <span className="muted">· {releaseDate(release.date)}</span>
          </h4>
          <ul className="whats-new-list">
            {release.items.map((item) => (
              <li key={item}>{tk(item)}</li>
            ))}
          </ul>
        </section>
      ))}
      <div className="dialog-actions">
        <span className="spacer" />
        <button type="button" className="button" onClick={onClose}>
          {t('Zamknij')}
        </button>
      </div>
    </Dialog>
  )
}

// Karta raz po aktualizacji: najważniejsze zmiany i "Wszystkie zmiany". Znika po "OK" albo po otwarciu listy.
export function WhatsNewCard({ hasPlan }: { hasPlan: boolean }) {
  const [release, setRelease] = useState(() => releaseToShow(hasPlan))
  const [open, setOpen] = useState(false)
  if (!release && !open) return null

  function dismiss() {
    markReleaseSeen()
    setRelease(null)
  }

  return (
    <>
      {release && (
        <div className="panel whats-new" role="status">
          <h3 className="panel-title">{t('Nowość: Planer {version}', { version: release.version })}</h3>
          <ul className="whats-new-list">
            {release.items.slice(0, 3).map((item) => (
              <li key={item}>{tk(item)}</li>
            ))}
          </ul>
          <div className="button-row">
            <button type="button" className="button small" onClick={dismiss}>
              {t('OK')}
            </button>
            <button
              type="button"
              className="button small secondary"
              onClick={() => {
                dismiss()
                setOpen(true)
              }}
            >
              {t('Wszystkie zmiany')}
            </button>
          </div>
        </div>
      )}
      {open && <WhatsNewDialog onClose={() => setOpen(false)} />}
    </>
  )
}
