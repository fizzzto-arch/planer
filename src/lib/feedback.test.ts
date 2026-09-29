import { describe, expect, it } from 'vitest'
import { checkAttachments, chunkCountFor, feedbackChunkId, isEmptyFeedback, parseFeedback } from './feedback'

describe('zgłoszenia', () => {
  it('odczyt z bazy: braki uzupełnione, śmieci odrzucone', () => {
    expect(parseFeedback('x', { kind: 'bug' })).toBeNull() // bez autora
    const f = parseFeedback('x', { uid: 'u', kind: 'coś', status: 'dziwny', attachments: [{ name: 'a.jpg', chunkCount: 1 }, 'zły'] })!
    expect(f).toMatchObject({ kind: 'opinion', status: 'new', reply: '', complete: false })
    expect(f.attachments).toHaveLength(1)
  })

  it('limity załączników: tylko zdjęcia i nagrania, nagranie do 30 MB', () => {
    const MB = 1024 * 1024
    expect(checkAttachments([{ type: 'image/jpeg', size: 2 * MB }, { type: 'video/mp4', size: 20 * MB }])).toBeNull()
    expect(checkAttachments([{ type: 'application/pdf', size: MB }])).toMatch(/zdjęcia i nagrania/)
    expect(checkAttachments([{ type: 'video/quicktime', size: 60 * MB }])).toMatch(/za duże/)
    expect(checkAttachments(Array.from({ length: 5 }, () => ({ type: 'image/png', size: 1 })))).toMatch(/Najwyżej 4/)
  })

  it('kawałki i pusta treść', () => {
    expect(feedbackChunkId(1, 3)).toBe('1-0003')
    expect(chunkCountFor(0)).toBe(1)
    expect(chunkCountFor(900 * 1024 + 1)).toBe(2)
    expect(isEmptyFeedback({ kind: 'bug', good: ' ', bad: '', missing: '', text: '', diagnostics: 'x' })).toBe(true)
  })
})
