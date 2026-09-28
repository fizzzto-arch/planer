import { describe, expect, it } from 'vitest'
import {
  MAX_FILE_BYTES,
  QUOTA_BYTES,
  checkUpload,
  chunkId,
  joinChunks,
  parseMaterial,
  splitIntoChunks,
  uploaderNameFromEmail,
} from './materials'

describe('dzielenie plików na kawałki', () => {
  it('dzieli i skleja plik bez utraty bajtów', () => {
    const bytes = new Uint8Array(2500).map((_, i) => i % 251)
    const chunks = splitIntoChunks(bytes, 1000)
    expect(chunks.map((c) => c.length)).toEqual([1000, 1000, 500])
    expect(joinChunks(chunks)).toEqual(bytes)
  })

  it('plik o rozmiarze dokładnie wielokrotności kawałka nie ma pustego ogona', () => {
    expect(splitIntoChunks(new Uint8Array(2000), 1000)).toHaveLength(2)
  })

  it('pusty plik to jeden pusty kawałek', () => {
    expect(splitIntoChunks(new Uint8Array(0), 1000)).toHaveLength(1)
  })

  it('id kawałków sortują się w kolejności pliku', () => {
    const ids = [10, 2, 1, 0].map(chunkId)
    expect([...ids].sort()).toEqual(['0000', '0001', '0002', '0010'])
  })
})

describe('limity i dane', () => {
  it('pilnuje limitu na plik i na całość', () => {
    expect(checkUpload(1024, 0)).toBeNull()
    expect(checkUpload(MAX_FILE_BYTES + 1, 0)).toMatch(/za duży/)
    expect(checkUpload(10, QUOTA_BYTES - 5)).toMatch(/Brak miejsca/)
  })

  it('podpisuje wgrywającego częścią e-maila', () => {
    expect(uploaderNameFromEmail('fizzz.to@gmail.com')).toBe('fizzz.to')
    expect(uploaderNameFromEmail(null)).toBe('ktoś')
  })

  it('odrzuca uszkodzone metadane i czyta poprawne', () => {
    expect(parseMaterial('x', { name: 'a.pdf' })).toBeNull()
    const meta = parseMaterial('x', {
      courseKey: 'Grafika',
      courseName: 'Grafika',
      name: 'w1.pdf',
      size: 100,
      type: 'application/pdf',
      chunkCount: 1,
      uploadedBy: 'u1',
      uploaderName: 'ala',
      createdAt: { toMillis: () => 1234 },
      complete: true,
    })
    expect(meta).toMatchObject({ id: 'x', size: 100, createdAt: 1234, complete: true })
  })
})

describe('formatSize', () => {
  it('czytelnie pokazuje rozmiary', async () => {
    const { formatSize } = await import('./localFiles')
    expect(formatSize(0)).toBe('0 kB')
    expect(formatSize(500)).toBe('1 kB')
    expect(formatSize(120 * 1024)).toBe('120 kB')
    expect(formatSize(1.4 * 1024 * 1024)).toBe('1,4 MB')
    expect(formatSize(900 * 1024 * 1024)).toBe('900 MB')
  })
})
