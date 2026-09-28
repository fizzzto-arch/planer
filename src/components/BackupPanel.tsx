import { useRef, useState } from 'react'
import { parseBackup, type ExtrasApi } from '../hooks/useExtras'
import { toDateKey } from '../lib/dates'
import { errorMessage } from '../lib/errors'
import { plural } from '../lib/plural'

interface Props {
  extras: ExtrasApi | null
}

// Kopia zapasowa dodatków (notatki, terminy, zmiany planu, ustawienia) do pliku i z pliku.
export function BackupPanel({ extras }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  if (!extras) {
    return (
      <div className="panel">
        <h3 className="panel-title">Kopia zapasowa</h3>
        <p className="hint">Zaloguj się, żeby zapisać kopię notatek, terminów i zmian planu.</p>
      </div>
    )
  }

  function download() {
    const backup = extras!.exportBackup()
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `planer-kopia-${toDateKey(new Date())}.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
    setMessage({ ok: true, text: 'Kopia pobrana. Wspólne pliki PDF nie wchodzą do kopii - są w bazie grupy.' })
  }

  async function restore(file: File) {
    setMessage(null)
    try {
      const backup = parseBackup(JSON.parse(await file.text()))
      if (typeof backup === 'string') {
        setMessage({ ok: false, text: backup })
        return
      }
      const total = Object.values(backup.collections).reduce((sum, docs) => sum + docs.length, 0)
      const question = `Przywrócić ${total} ${plural(total, 'element', 'elementy', 'elementów')} z kopii? Elementy o tych samych identyfikatorach zostaną nadpisane, reszta zostaje bez zmian.`
      if (!window.confirm(question)) return
      setBusy(true)
      const count = await extras!.importBackup(backup)
      setMessage({ ok: true, text: `Przywrócono ${count} ${plural(count, 'element', 'elementy', 'elementów')}.` })
    } catch (e) {
      setMessage({ ok: false, text: e instanceof SyntaxError ? 'To nie jest plik kopii Planera.' : errorMessage(e) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="panel">
      <h3 className="panel-title">Kopia zapasowa</h3>
      <p className="hint">Notatki, terminy, zmiany planu, skróty nazw, kolory i ustawienia - w jednym pliku.</p>
      <div className="button-row">
        <button type="button" className="button secondary" onClick={download}>
          Pobierz kopię
        </button>
        <button type="button" className="button secondary" disabled={busy} onClick={() => input.current?.click()}>
          {busy ? 'Przywracam…' : 'Wczytaj kopię'}
        </button>
      </div>
      <input
        ref={input}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) void restore(file)
        }}
      />
      {message && <p className={message.ok ? 'success' : 'error'}>{message.text}</p>}
    </div>
  )
}
