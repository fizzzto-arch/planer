import { useEffect, useRef, useState, type FormEvent } from 'react'
import { prepareAttachment, type FeedbackApi } from '../hooks/useFeedback'
import { diagnostics } from '../lib/diagnostics'
import { errorMessage } from '../lib/errors'
import {
  checkAttachments,
  FEEDBACK_KINDS,
  FEEDBACK_STATUS_LABELS,
  isAutoReport,
  isEmptyFeedback,
  MAX_ATTACHMENTS,
  MAX_TEXT,
  type Feedback,
  type FeedbackFile,
  type FeedbackKind,
  type FeedbackStatus,
} from '../lib/feedback'
import { formatSize } from '../lib/localFiles'
import type { TesterTask } from '../lib/testerTasks'
import { TesterTasks } from './TesterTasks'

interface Props {
  feedback: FeedbackApi
  admin: boolean // skrzynka ze wszystkimi zgłoszeniami
  onBack?: () => void // brak = otwarte z zakładki (trójkąt na pasku), nie z podstrony
}

const kindLabel = (k: FeedbackKind) => FEEDBACK_KINDS.find((x) => x.id === k)?.label ?? k

const formatWhen = (ms: number | null) =>
  ms === null
    ? 'wysyłanie…'
    : new Date(ms).toLocaleString('pl-PL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

// Zgłoszenia od testerów: co działa, co nie, czego brakuje, ze zdjęciami i nagraniami.
export function FeedbackView({ feedback, admin, onBack }: Props) {
  // "Problem?" przy zadaniu: nowy formularz (key) z rodzajem "Błąd" i nazwą zadania w opisie.
  const [prefill, setPrefill] = useState<{ text: string; nonce: number } | null>(null)
  const report = (task: TesterTask) => {
    setPrefill({ text: `Zadanie „${task.title}”: `, nonce: Date.now() })
    setTimeout(() => document.getElementById('feedback-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0)
  }

  return (
    <section className="help feedback">
      {onBack && (
        <button type="button" className="back-button" onClick={onBack}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m15 6-6 6 6 6" />
          </svg>
          Wróć
        </button>
      )}

      <header className="course-header">
        <h2>{admin ? 'Zgłoszenia' : 'Uwagi i pomysły'}</h2>
        <p className="muted">
          {admin
            ? 'Wszystko, co przysłali testerzy. Odpowiedź zobaczą przy swoim zgłoszeniu.'
            : 'Napisz, co Ci się podoba, co przeszkadza i czego brakuje. Możesz dołączyć zrzut ekranu albo krótkie nagranie - odpowiedź pojawi się niżej.'}
        </p>
      </header>

      {feedback.error && (
        <p className="error" role="alert">
          {feedback.error}
        </p>
      )}

      {admin && <Inbox feedback={feedback} />}
      <TesterTasks onReport={report} />
      <FeedbackForm key={prefill?.nonce ?? 0} feedback={feedback} initialText={prefill?.text ?? null} />
      {feedback.own.length > 0 && (
        <div className="panel">
          <h3 className="panel-title">Twoje zgłoszenia</h3>
          <ul className="feedback-list">
            {feedback.own.map((f) => (
              <OwnItem key={f.id} item={f} feedback={feedback} />
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

interface Picked {
  file: FeedbackFile
  url: string // podgląd
}

// initialText: zgłoszenie problemu z zadaniem testera - od razu rodzaj "Błąd" z nazwą zadania.
function FeedbackForm({ feedback, initialText }: { feedback: FeedbackApi; initialText: string | null }) {
  const [kind, setKind] = useState<FeedbackKind>(initialText ? 'bug' : 'opinion')
  const [good, setGood] = useState('')
  const [bad, setBad] = useState('')
  const [missing, setMissing] = useState('')
  const [text, setText] = useState(initialText ?? '')
  const [withDevice, setWithDevice] = useState(true)
  const [picked, setPicked] = useState<Picked[]>([])
  const [preparing, setPreparing] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  // Podglądy zwalniamy przy wyjściu ze strony.
  const urls = useRef<string[]>([])
  useEffect(() => () => urls.current.forEach((u) => URL.revokeObjectURL(u)), [])

  async function addFiles(list: FileList | null) {
    if (!list?.length) return
    setError(null)
    setPreparing(true)
    try {
      const incoming = [...list]
      const raw = checkAttachments([...picked.map((p) => ({ type: p.file.type, size: 0 })), ...incoming])
      // Rozmiar zdjęć sprawdzamy dopiero po zmniejszeniu - z telefonu mają po kilka MB.
      if (raw && !raw.startsWith('Załączniki są za duże')) {
        setError(raw)
        return
      }
      const prepared = await Promise.all(incoming.map(prepareAttachment))
      const next = [
        ...picked,
        ...prepared.map((file) => {
          const url = URL.createObjectURL(new Blob([file.bytes as Uint8Array<ArrayBuffer>], { type: file.type }))
          urls.current.push(url)
          return { file, url }
        }),
      ]
      const problem = checkAttachments(next.map((p) => ({ type: p.file.type, size: p.file.bytes.length })))
      if (problem) {
        setError(problem)
        return
      }
      setPicked(next)
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setPreparing(false)
      if (input.current) input.current.value = ''
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const entry = {
      kind,
      good: good.trim(),
      bad: bad.trim(),
      missing: missing.trim(),
      text: text.trim(),
      diagnostics: withDevice ? diagnostics() : '',
    }
    if (isEmptyFeedback(entry)) {
      setError('Wpisz cokolwiek w którymś polu.')
      return
    }
    setError(null)
    setSent(false)
    setProgress({ done: 0, total: 0 })
    try {
      await feedback.submit(
        entry,
        picked.map((p) => p.file),
        (done, total) => setProgress({ done, total }),
      )
      setGood('')
      setBad('')
      setMissing('')
      setText('')
      setPicked([])
      setSent(true)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setProgress(null)
    }
  }

  const busy = progress !== null
  const field = (label: string, value: string, set: (v: string) => void, placeholder: string, rows = 2) => (
    <label className="field">
      <span className="field-label">{label}</span>
      <textarea
        className="text-input note-input"
        rows={rows}
        maxLength={MAX_TEXT}
        value={value}
        placeholder={placeholder}
        disabled={busy}
        onChange={(e) => set(e.target.value)}
      />
    </label>
  )

  return (
    <form id="feedback-form" className="panel form-grid" onSubmit={(e) => void handleSubmit(e)}>
      <h3 className="panel-title">Nowe zgłoszenie</h3>
      <div className="segmented" role="radiogroup" aria-label="Rodzaj zgłoszenia">
        {FEEDBACK_KINDS.map((k) => (
          <button
            key={k.id}
            type="button"
            role="radio"
            aria-checked={kind === k.id}
            className={`segment${kind === k.id ? ' is-active' : ''}`}
            onClick={() => setKind(k.id)}
          >
            {k.label}
          </button>
        ))}
      </div>

      {kind === 'bug' ? (
        field(
          'Co się stało?',
          text,
          setText,
          'np. Kliknąłem „Eksportuj” w tygodniu 5 i nic się nie pobrało. Co robiłeś tuż przed błędem?',
          4,
        )
      ) : (
        <>
          {field('Co działa dobrze (+)', good, setGood, 'np. widok tygodnia, przypomnienia')}
          {field('Co działa źle albo przeszkadza (−)', bad, setBad, 'np. za mały tekst na telefonie')}
          {field('Czego brakuje?', missing, setMissing, 'np. widgetu na ekran blokady')}
          {field('Coś jeszcze?', text, setText, 'dowolny komentarz')}
        </>
      )}

      <div className="field">
        <span className="field-label">
          Zdjęcia i nagrania <span className="label-note">(opcjonalnie, do {MAX_ATTACHMENTS})</span>
        </span>
        {picked.length > 0 && (
          <ul className="feedback-thumbs">
            {picked.map((p, i) => (
              <li key={p.url}>
                {p.file.type.startsWith('video/') ? (
                  <video src={p.url} muted playsInline preload="metadata" />
                ) : (
                  <img src={p.url} alt={p.file.name} />
                )}
                <span className="feedback-thumb-size">{formatSize(p.file.bytes.length)}</span>
                <button
                  type="button"
                  className="chip-remove"
                  aria-label={`Usuń ${p.file.name}`}
                  disabled={busy}
                  onClick={() => setPicked(picked.filter((_, k) => k !== i))}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M7 7l10 10M17 7 7 17" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}
        <input
          ref={input}
          type="file"
          accept="image/*,video/*"
          multiple
          hidden
          onChange={(e) => void addFiles(e.target.files)}
        />
        {picked.length < MAX_ATTACHMENTS && (
          <button
            type="button"
            className="button small secondary"
            disabled={busy || preparing}
            onClick={() => input.current?.click()}
          >
            {preparing ? 'Przygotowuję…' : 'Dodaj zdjęcie lub nagranie'}
          </button>
        )}
        <p className="hint">Nagranie do ok. 30 sekund (30 MB). Zdjęcia zmniejszam przed wysłaniem.</p>
      </div>

      <label className="check-field">
        <input type="checkbox" checked={withDevice} disabled={busy} onChange={(e) => setWithDevice(e.target.checked)} />
        Dołącz informacje o urządzeniu (wersja Planera, telefon, przeglądarka)
      </label>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {sent && <p className="success">Dzięki! Zgłoszenie wysłane.</p>}

      {progress && progress.total > 0 && (
        <progress className="opt-progress" value={progress.done} max={progress.total} aria-label="Wysyłanie załączników" />
      )}

      <button type="submit" className="button" disabled={busy || preparing}>
        {busy ? 'Wysyłam…' : 'Wyślij'}
      </button>
    </form>
  )
}

function Body({ item }: { item: Feedback }) {
  const parts: [string, string][] = [
    ['+', item.good],
    ['−', item.bad],
    ['Brakuje', item.missing],
    [item.kind === 'bug' ? 'Opis' : 'Komentarz', item.text],
  ]
  return (
    <dl className="feedback-body">
      {parts
        .filter(([, v]) => v)
        .map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
    </dl>
  )
}

function StatusPill({ status }: { status: FeedbackStatus }) {
  return <span className={`feedback-status is-${status}`}>{FEEDBACK_STATUS_LABELS[status]}</span>
}

function OwnItem({ item, feedback }: { item: Feedback; feedback: FeedbackApi }) {
  return (
    <li className="feedback-item">
      <div className="feedback-meta">
        <strong>{kindLabel(item.kind)}</strong>
        <span className="muted">{formatWhen(item.createdAt)}</span>
        <StatusPill status={item.status} />
      </div>
      <Body item={item} />
      {item.attachments.length > 0 && (
        <p className="hint">
          Załączniki: {item.attachments.length}
          {!item.complete && ' - wysyłanie przerwane, wyślij zgłoszenie jeszcze raz'}
        </p>
      )}
      {item.reply && (
        <div className="feedback-reply">
          <span className="field-label">Odpowiedź</span>
          <p>{item.reply}</p>
        </div>
      )}
      {item.status === 'new' && (
        <button
          type="button"
          className="link-button"
          onClick={() => {
            if (window.confirm('Wycofać to zgłoszenie?')) feedback.remove(item)
          }}
        >
          Wycofaj
        </button>
      )}
    </li>
  )
}

type InboxFilter = 'open' | 'done'

function Inbox({ feedback }: { feedback: FeedbackApi }) {
  const [filter, setFilter] = useState<InboxFilter>('open')
  const list = feedback.all.filter((f) => (filter === 'done' ? f.status === 'done' : f.status !== 'done'))
  return (
    <div className="panel">
      <h3 className="panel-title">
        Skrzynka{feedback.newCount > 0 && <span className="feedback-count">{feedback.newCount}</span>}
      </h3>
      <div className="segmented" role="radiogroup" aria-label="Filtr zgłoszeń">
        {(
          [
            ['open', 'Do zrobienia'],
            ['done', 'Załatwione'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={filter === id}
            className={`segment${filter === id ? ' is-active' : ''}`}
            onClick={() => setFilter(id)}
          >
            {label}
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <p className="hint">{filter === 'open' ? 'Nic nie czeka.' : 'Jeszcze nic nie załatwione.'}</p>
      ) : (
        <ul className="feedback-list">
          {list.map((f) => (
            <InboxItem key={f.id} item={f} feedback={feedback} />
          ))}
        </ul>
      )}
    </div>
  )
}

function InboxItem({ item, feedback }: { item: Feedback; feedback: FeedbackApi }) {
  const [reply, setReply] = useState(item.reply)
  const [open, setOpen] = useState(false)

  return (
    <li className={`feedback-item${item.status === 'new' ? ' is-new' : ''}`}>
      <button
        type="button"
        className="feedback-toggle"
        aria-expanded={open}
        onClick={() => {
          setOpen(!open)
          // Otwarcie nowego = przeczytane.
          if (!open && item.status === 'new') feedback.update(item.id, { status: 'seen' })
        }}
      >
        <span className="feedback-meta">
          <strong>{isAutoReport(item) ? 'Błąd (automatyczny)' : kindLabel(item.kind)}</strong>
          <span className="muted">
            {item.email || 'bez e-maila'} · {formatWhen(item.createdAt)}
            {item.attachments.length > 0 && ` · załączniki: ${item.attachments.length}`}
          </span>
          <StatusPill status={item.status} />
        </span>
      </button>
      {!open && <p className="feedback-excerpt">{[item.bad, item.text, item.missing, item.good].find((t) => t)}</p>}
      {open && (
        <div className="feedback-details">
          <Body item={item} />
          {item.attachments.length > 0 && (
            <div className="feedback-attachments">
              {item.attachments.map((_, i) => (
                <AttachmentView key={i} item={item} index={i} feedback={feedback} />
              ))}
            </div>
          )}
          {item.diagnostics && <pre className="help-diagnostics">{item.diagnostics}</pre>}
          <label className="field">
            <span className="field-label">Odpowiedź (widzi ją autor)</span>
            <textarea
              className="text-input note-input"
              rows={2}
              maxLength={MAX_TEXT}
              value={reply}
              onChange={(e) => setReply(e.target.value)}
            />
          </label>
          <div className="feedback-actions">
            {reply.trim() !== item.reply && (
              <button type="button" className="button small" onClick={() => feedback.update(item.id, { reply: reply.trim() })}>
                Zapisz odpowiedź
              </button>
            )}
            {item.status === 'done' ? (
              <button type="button" className="button small secondary" onClick={() => feedback.update(item.id, { status: 'seen' })}>
                Otwórz ponownie
              </button>
            ) : (
              <button type="button" className="button small secondary" onClick={() => feedback.update(item.id, { status: 'done' })}>
                Załatwione
              </button>
            )}
            <button
              type="button"
              className="button small danger"
              onClick={() => {
                if (window.confirm('Usunąć zgłoszenie razem z załącznikami?')) feedback.remove(item)
              }}
            >
              Usuń
            </button>
          </div>
        </div>
      )}
    </li>
  )
}

// Załącznik pobieramy dopiero na żądanie - nagranie to nawet 30 MB z darmowego limitu odczytów.
function AttachmentView({ item, index, feedback }: { item: Feedback; index: number; feedback: FeedbackApi }) {
  const a = item.attachments[index]
  const [url, setUrl] = useState<string | null>(null)
  const [state, setState] = useState<'idle' | 'loading' | string>('idle')
  const [unplayable, setUnplayable] = useState(false)

  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url)
  }, [url])

  async function load() {
    setState('loading')
    try {
      setUrl(URL.createObjectURL(await feedback.download(item, index)))
      setState('idle')
    } catch (e) {
      setState(errorMessage(e))
    }
  }

  if (url) {
    // Plik zawsze da się pobrać: nagrania z aparatu iPhone'a (HEVC) Chrome na Windowsie często nie odtworzy.
    const download = (
      <a className="link-button" href={url} download={a.name}>
        Pobierz plik ({formatSize(a.size)})
      </a>
    )
    return (
      <div className="feedback-attachment-open">
        {a.type.startsWith('video/') ? (
          unplayable ? (
            <p className="hint">
              Ta przeglądarka nie odtworzy tego nagrania (pewnie format HEVC z iPhone'a) - pobierz je i otwórz w
              odtwarzaczu, np. VLC albo „Filmy i TV”.
            </p>
          ) : (
            <video className="feedback-media" src={url} controls playsInline onError={() => setUnplayable(true)} />
          )
        ) : (
          <a href={url} target="_blank" rel="noreferrer">
            <img className="feedback-media" src={url} alt={a.name} />
          </a>
        )}
        {download}
      </div>
    )
  }
  return (
    <div className="feedback-attachment">
      <span>
        {a.type.startsWith('video/') ? 'Nagranie' : 'Zdjęcie'} · {formatSize(a.size)}
      </span>
      <button type="button" className="button small secondary" disabled={state === 'loading'} onClick={() => void load()}>
        {state === 'loading' ? 'Pobieram…' : 'Pokaż'}
      </button>
      {state !== 'idle' && state !== 'loading' && <span className="error">{state}</span>}
    </div>
  )
}
