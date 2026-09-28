import { useRef, useState, type FormEvent } from 'react'
import { usePlanUi } from '../hooks/planUi'
import { useLocalFiles } from '../hooks/useLocalFiles'
import { courseKey, isSafeUrl, type CourseLink } from '../lib/extras'
import { formatSize } from '../lib/localFiles'

interface Props {
  courseName: string
}

function newLinkId(): string {
  return typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Math.random().toString(36).slice(2)
}

// "teams.microsoft.com" z pełnego adresu - podpis linku bez tytułu
function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function FileIcon() {
  return (
    <svg className="material-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 3h9l4 4v14H6z M14 3v5h5" />
    </svg>
  )
}

function LinkIcon() {
  return (
    <svg className="material-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1 M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
    </svg>
  )
}

function Links({ courseName }: Props) {
  const { extras } = usePlanUi()
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (!extras) {
    return <p className="muted small">Zaloguj się, żeby dodawać linki - będą wtedy na każdym Twoim urządzeniu.</p>
  }
  const links = extras.extras.courses.get(courseKey(courseName))?.links ?? []

  function handleAdd(e: FormEvent) {
    e.preventDefault()
    const address = url.trim()
    if (!isSafeUrl(address)) {
      setError('Wklej pełny adres zaczynający się od https://')
      return
    }
    const link: CourseLink = { id: newLinkId(), title: title.trim(), url: address }
    extras!.saveCourseLinks(courseName, [...links, link])
    setTitle('')
    setUrl('')
    setError(null)
    setAdding(false)
  }

  return (
    <>
      {links.length > 0 && (
        <ul className="material-list">
          {links.map((link) => (
            <li key={link.id} className="material-item">
              <LinkIcon />
              <a className="material-name" href={link.url} target="_blank" rel="noreferrer">
                {link.title || hostOf(link.url)}
                {link.title && <span className="material-meta">{hostOf(link.url)}</span>}
              </a>
              <button
                type="button"
                className="material-delete"
                aria-label={`Usuń link ${link.title || hostOf(link.url)}`}
                onClick={() => {
                  if (window.confirm('Usunąć ten link?')) {
                    extras.saveCourseLinks(courseName, links.filter((l) => l.id !== link.id))
                  }
                }}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      {adding ? (
        <form className="material-form" onSubmit={handleAdd}>
          <input
            className="text-input"
            value={title}
            placeholder="Nazwa, np. Wykład 3 - filtry"
            onChange={(e) => setTitle(e.target.value)}
          />
          <input
            className="text-input"
            type="url"
            inputMode="url"
            value={url}
            placeholder="https://… (Teams, Leon, Drive, strona prowadzącego)"
            onChange={(e) => setUrl(e.target.value)}
          />
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="button-row">
            <button type="submit" className="button small">
              Dodaj link
            </button>
            <button type="button" className="button small secondary" onClick={() => setAdding(false)}>
              Anuluj
            </button>
          </div>
        </form>
      ) : (
        <button type="button" className="button small secondary" onClick={() => setAdding(true)}>
          + Dodaj link
        </button>
      )}
    </>
  )
}

function Files({ courseName }: Props) {
  const { files, busy, error, add, remove, share, canShare } = useLocalFiles(courseKey(courseName))
  const input = useRef<HTMLInputElement>(null)

  return (
    <>
      {files.length > 0 && (
        <ul className="material-list">
          {files.map((file) => (
            <li key={file.id} className="material-item">
              <FileIcon />
              <a className="material-name" href={file.url} target="_blank" rel="noreferrer">
                {file.name}
                <span className="material-meta">{formatSize(file.size)} · tylko na tym urządzeniu</span>
              </a>
              {canShare && (
                <button
                  type="button"
                  className="material-action"
                  aria-label={`Udostępnij lub zapisz ${file.name}`}
                  title="Udostępnij / zapisz w Plikach"
                  onClick={() => void share(file.id)}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 3v12 M7 8l5-5 5 5 M5 13v7h14v-7" />
                  </svg>
                </button>
              )}
              <button
                type="button"
                className="material-delete"
                aria-label={`Usuń ${file.name}`}
                onClick={() => {
                  if (window.confirm(`Usunąć „${file.name}” z tego urządzenia?`)) void remove(file.id)
                }}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <input
        ref={input}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files?.length) void add(e.target.files)
          e.target.value = ''
        }}
      />
      <button type="button" className="button small secondary" disabled={busy} onClick={() => input.current?.click()}>
        {busy ? 'Zapisuję…' : '+ Wgraj plik (PDF)'}
      </button>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </>
  )
}

export function MaterialsSection({ courseName }: Props) {
  return (
    <div className="panel">
      <h3 className="panel-title">Wykłady i materiały</h3>
      <div className="material-group">
        <h4 className="material-heading">Linki</h4>
        <Links courseName={courseName} />
      </div>
      <div className="material-group">
        <h4 className="material-heading">Pliki na tym urządzeniu</h4>
        <Files courseName={courseName} />
      </div>
    </div>
  )
}
