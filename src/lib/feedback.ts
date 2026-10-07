// Zgłoszenia od testerów: co działa, co nie, czego brakuje - z opcjonalnymi zdjęciami i nagraniami.
// Załączniki, jak wspólne PDF-y, dzielimy na kawałki w bazie (darmowy plan nie ma magazynu plików).
import { msg, t } from './i18n.ts'
import { CHUNK_BYTES, chunkId } from './materials.ts'

export type FeedbackKind = 'bug' | 'idea' | 'opinion'
export type FeedbackStatus = 'new' | 'seen' | 'done'

// Do wyboru w formularzu: opinia albo błąd (pomysły to pole "Czego brakuje?" w opinii).
// Opinie są częstsze - pierwsze (po lewej) i zaznaczone na start.
export const FEEDBACK_KINDS: { id: FeedbackKind; label: string }[] = [
  { id: 'opinion', label: msg('Opinia lub pomysł') },
  { id: 'bug', label: msg('Błąd') },
]

// Nazwy rodzajów do wyświetlania - także "Pomysł" ze starszych zgłoszeń.
export const FEEDBACK_KIND_LABELS: Record<FeedbackKind, string> = {
  bug: msg('Błąd'),
  idea: msg('Pomysł'),
  opinion: msg('Opinia lub pomysł'),
}

export const FEEDBACK_STATUS_LABELS: Record<FeedbackStatus, string> = {
  new: msg('Nowe'),
  seen: msg('Przeczytane'),
  done: msg('Załatwione'),
}

// Początek treści zgłoszenia wysłanego automatycznie po błędzie (lib/errorReport.ts).
export const AUTO_PREFIX = 'Automatyczne zgłoszenie błędu'

export const isAutoReport = (f: { text: string }) => f.text.startsWith(AUTO_PREFIX)

export const MAX_ATTACHMENTS = 4
export const MAX_VIDEO_BYTES = 30 * 1024 * 1024 // ok. 30 s nagrania ekranu
export const MAX_TOTAL_BYTES = 40 * 1024 * 1024
export const MAX_TEXT = 3000

export interface FeedbackAttachment {
  name: string
  type: string // "image/jpeg", "video/mp4"...
  size: number
  chunkCount: number
}

export interface Feedback {
  id: string
  uid: string
  email: string
  kind: FeedbackKind
  good: string // co działa dobrze
  bad: string // co działa źle
  missing: string // czego brakuje
  text: string // opis (np. kroki do powtórzenia błędu)
  diagnostics: string // wersja, urządzenie (opcjonalnie)
  status: FeedbackStatus
  reply: string // odpowiedź administratora
  createdAt: number | null
  attachments: FeedbackAttachment[]
  complete: boolean // false = wysyłanie przerwane w połowie
}

export type NewFeedback = Pick<Feedback, 'kind' | 'good' | 'bad' | 'missing' | 'text' | 'diagnostics'>

export interface FeedbackFile {
  name: string
  type: string
  bytes: Uint8Array
}

const str = (v: unknown, max = MAX_TEXT) => (typeof v === 'string' ? v.slice(0, max) : '')

export function parseFeedback(id: string, raw: Record<string, unknown>): Feedback | null {
  if (typeof raw.uid !== 'string') return null
  const kinds = Object.keys(FEEDBACK_KIND_LABELS) // też 'idea' ze starszych zgłoszeń
  const created = raw.createdAt as { toMillis?: () => number } | number | undefined
  return {
    id,
    uid: raw.uid,
    email: str(raw.email, 200),
    kind: kinds.includes(raw.kind as FeedbackKind) ? (raw.kind as FeedbackKind) : 'opinion',
    good: str(raw.good),
    bad: str(raw.bad),
    missing: str(raw.missing),
    text: str(raw.text),
    diagnostics: str(raw.diagnostics, 1000),
    status: raw.status === 'seen' || raw.status === 'done' ? raw.status : 'new',
    reply: str(raw.reply),
    createdAt: typeof created === 'number' ? created : typeof created?.toMillis === 'function' ? created.toMillis() : null,
    attachments: Array.isArray(raw.attachments)
      ? raw.attachments
          .filter(
            (a): a is FeedbackAttachment =>
              typeof a === 'object' && a !== null && typeof a.name === 'string' && typeof a.chunkCount === 'number',
          )
          .slice(0, MAX_ATTACHMENTS)
      : [],
    complete: raw.complete === true,
  }
}

// Id kawałka załącznika: "1-0003" = załącznik nr 1, kawałek nr 3.
export function feedbackChunkId(attachment: number, chunk: number): string {
  return `${attachment}-${chunkId(chunk)}`
}

export function chunkCountFor(size: number): number {
  return Math.max(1, Math.ceil(size / CHUNK_BYTES))
}

// Powód odrzucenia załączników albo null, gdy można je wysłać.
export function checkAttachments(files: { type: string; size: number }[]): string | null {
  if (files.length > MAX_ATTACHMENTS) return t('Najwyżej {n} załączniki.', { n: MAX_ATTACHMENTS })
  for (const f of files) {
    if (!f.type.startsWith('image/') && !f.type.startsWith('video/')) return t('Dołączyć można tylko zdjęcia i nagrania.')
    if (f.type.startsWith('video/') && f.size > MAX_VIDEO_BYTES) {
      return t('Nagranie jest za duże (limit {mb} MB, czyli ok. 30 sekund). Przytnij je w Zdjęciach.', { mb: MAX_VIDEO_BYTES / 1024 / 1024 })
    }
  }
  if (files.reduce((s, f) => s + f.size, 0) > MAX_TOTAL_BYTES) return t('Załączniki są za duże razem - usuń któryś.')
  return null
}

export function isEmptyFeedback(f: NewFeedback): boolean {
  return ![f.good, f.bad, f.missing, f.text].some((item) => item.trim())
}
