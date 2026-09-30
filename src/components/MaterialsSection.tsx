import { t } from '../lib/i18n'
import { useRef, useState, type FormEvent } from 'react'
import { usePlanUi } from '../hooks/planUi'
import { useLocalFiles } from '../hooks/useLocalFiles'
import { courseKey, isSafeUrl, type CourseLink } from '../lib/extras'
import { formatSize } from '../lib/localFiles'
import { QUOTA_BYTES } from '../lib/materials'
import type { SharedMaterialsApi } from '../hooks/useSharedMaterials'

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
    return <p className="muted small">{t('Zaloguj się, żeby dodawać linki - będą wtedy na każdym Twoim urządzeniu.')}</p>
  }
  const links = extras.extras.courses.get(courseKey(courseName))?.links ?? []

  function handleAdd(e: FormEvent) {
    e.preventDefault()
    const address = url.trim()
    if (!isSafeUrl(address)) {
      setError(t('Wklej pełny adres zaczynający się od https://'))
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
                aria-label={t('Usuń link {name}', { name: link.title || hostOf(link.url) })}
                onClick={() => {
                  if (window.confirm(t('Usunąć ten link?'))) {
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
            placeholder={t('Nazwa, np. Wykład 3 - filtry')}
            onChange={(e) => setTitle(e.target.value)}
          />
          <input
            className="text-input"
            type="url"
            inputMode="url"
            value={url}
            placeholder={t('https://… (Teams, Leon, Drive, strona prowadzącego)')}
            onChange={(e) => setUrl(e.target.value)}
          />
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="button-row">
            <button type="submit" className="button small">
              {t('Dodaj link')}
            </button>
            <button type="button" className="button small secondary" onClick={() => setAdding(false)}>
              {t('Anuluj')}
            </button>
          </div>
        </form>
      ) : (
        <button type="button" className="button small secondary" onClick={() => setAdding(true)}>
          {t('+ Dodaj link')}
        </button>
      )}
    </>
  )
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3v12 M7 8l5-5 5 5 M5 13v7h14v-7" />
    </svg>
  )
}

// Arkusz "Udostępnij" z plikami działa głównie na telefonach.
const CAN_SHARE_FILES =
  typeof navigator.canShare === 'function' &&
  navigator.canShare({ files: [new File([''], 'test.pdf', { type: 'application/pdf' })] })

function formatDate(ms: number): string {
  const d = new Date(ms)
  return `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')}`
}

type WithMaterials = Props & { materials: SharedMaterialsApi }

// Pliki wspólne dla wszystkich z listy dostępu, którzy mają ten przedmiot.
function SharedFiles({ courseName, materials }: WithMaterials) {
  const key = courseKey(courseName)
  const files = materials.forCourse(key)
  const uploading = materials.uploading?.courseKey === key ? materials.uploading : null
  const input = useRef<HTMLInputElement>(null)

  async function uploadAll(list: FileList) {
    for (const file of Array.from(list)) await materials.upload(key, courseName, file)
  }

  return (
    <>
      {files.length === 0 && !uploading && (
        <p className="muted small">
          {t('Brak plików. Wgrany plik zobaczą wszyscy z Twojej grupy, którzy mają ten przedmiot.')}
        </p>
      )}
      {files.length > 0 && (
        <ul className="material-list">
          {files.map((file) => {
            const url = materials.urls[file.id]
            const progress = materials.downloading[file.id]
            const mine = file.uploadedBy === materials.uid
            const meta = [
              formatSize(file.size),
              mine ? t('Ty') : file.uploaderName,
              formatDate(file.createdAt),
              file.complete ? null : t('wysyłanie przerwane'),
            ]
              .filter(Boolean)
              .join(' · ')
            return (
              <li key={file.id} className={`material-item${file.complete ? '' : ' is-broken'}`}>
                <FileIcon />
                {url ? (
                  <a className="material-name" href={url} target="_blank" rel="noreferrer">
                    {file.name}
                    <span className="material-meta">{meta} · {t('pobrany, kliknij, aby otworzyć')}</span>
                  </a>
                ) : (
                  <button
                    type="button"
                    className="material-name"
                    disabled={progress !== undefined || !file.complete}
                    onClick={() => void materials.open(file)}
                  >
                    {file.name}
                    <span className="material-meta">
                      {progress !== undefined ? t('Pobieranie… {n}%', { n: Math.round(progress * 100) }) : meta}
                    </span>
                  </button>
                )}
                {url && CAN_SHARE_FILES && (
                  <button
                    type="button"
                    className="material-action"
                    aria-label={t('Udostępnij lub zapisz {name}', { name: file.name })}
                    title={t('Udostępnij / zapisz w Plikach')}
                    onClick={() => void materials.share(file)}
                  >
                    <ShareIcon />
                  </button>
                )}
                {mine && (
                  <button
                    type="button"
                    className="material-delete"
                    aria-label={t('Usuń {name}', { name: file.name })}
                    onClick={() => {
                      if (window.confirm(t('Usunąć „{name}” dla wszystkich?', { name: file.name }))) void materials.remove(file)
                    }}
                  >
                    ×
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {uploading && (
        <div className="upload-progress" role="status">
          <span>
            {t('Wysyłanie „{name}”… {n}%', { name: uploading.name, n: Math.round((uploading.done / uploading.total) * 100) })}
          </span>
          <progress value={uploading.done} max={uploading.total} />
        </div>
      )}

      <input
        ref={input}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files?.length) void uploadAll(e.target.files)
          e.target.value = ''
        }}
      />
      <div className="material-footer">
        <button
          type="button"
          className="button small secondary"
          disabled={!!materials.uploading}
          onClick={() => input.current?.click()}
        >
          {t('+ Wgraj plik (PDF)')}
        </button>
        <span className="muted small">
          {t('Zajęte {used} z {total}', { used: formatSize(materials.usedBytes), total: formatSize(QUOTA_BYTES) })}
        </span>
      </div>
      {materials.error && (
        <p className="error" role="alert">
          {materials.error}
        </p>
      )}
    </>
  )
}

// Pliki tylko w tej przeglądarce. Po zalogowaniu widoczne tylko, jeśli jakieś zostały -
// z przyciskiem przeniesienia do wspólnych.
function LocalFiles({ courseName, materials }: Props & { materials: SharedMaterialsApi | null }) {
  const key = courseKey(courseName)
  const { files, busy, error, add, remove, share, canShare, toFile } = useLocalFiles(key)
  const input = useRef<HTMLInputElement>(null)
  if (materials && files.length === 0) return null

  async function moveToShared(id: string) {
    const file = toFile(id)
    if (!file || !materials) return
    if (await materials.upload(key, courseName, file)) await remove(id)
  }

  return (
    <div className="material-group">
      <h4 className="material-heading">{materials ? t('Tylko na tym urządzeniu') : t('Pliki na tym urządzeniu')}</h4>
      {!materials && (
        <p className="muted small">{t('Zaloguj się, żeby dzielić się plikami z grupą i mieć je na każdym urządzeniu.')}</p>
      )}
      {files.length > 0 && (
        <ul className="material-list">
          {files.map((file) => (
            <li key={file.id} className="material-item">
              <FileIcon />
              <a className="material-name" href={file.url} target="_blank" rel="noreferrer">
                {file.name}
                <span className="material-meta">{formatSize(file.size)} · {t('tylko na tym urządzeniu')}</span>
              </a>
              {materials && (
                <button
                  type="button"
                  className="button small"
                  disabled={!!materials.uploading}
                  onClick={() => void moveToShared(file.id)}
                >
                  {t('Udostępnij grupie')}
                </button>
              )}
              {canShare && (
                <button
                  type="button"
                  className="material-action"
                  aria-label={t('Udostępnij lub zapisz {name}', { name: file.name })}
                  title={t('Udostępnij / zapisz w Plikach')}
                  onClick={() => void share(file.id)}
                >
                  <ShareIcon />
                </button>
              )}
              <button
                type="button"
                className="material-delete"
                aria-label={t('Usuń {name}', { name: file.name })}
                onClick={() => {
                  if (window.confirm(t('Usunąć „{name}” z tego urządzenia?', { name: file.name }))) void remove(file.id)
                }}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      {!materials && (
        <>
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
          <button
            type="button"
            className="button small secondary"
            disabled={busy}
            onClick={() => input.current?.click()}
          >
            {busy ? t('Zapisuję…') : t('+ Wgraj plik (PDF)')}
          </button>
        </>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

export function MaterialsSection({ courseName }: Props) {
  const { materials } = usePlanUi()

  return (
    <div className="panel">
      <h3 className="panel-title">{t('Wykłady i materiały')}</h3>
      <div className="material-group">
        <h4 className="material-heading">{t('Linki')}</h4>
        <Links courseName={courseName} />
      </div>
      {materials && (
        <div className="material-group">
          <h4 className="material-heading">{t('Pliki wspólne dla grupy')}</h4>
          <SharedFiles courseName={courseName} materials={materials} />
        </div>
      )}
      <LocalFiles courseName={courseName} materials={materials} />
    </div>
  )
}
