import { describe, expect, it } from 'vitest'
import { safeBlobType } from './safeBlob'

describe('typ cudzego pliku przed otwarciem', () => {
  it('PDF, zdjęcia i nagrania zostają', () => {
    expect(safeBlobType('application/pdf')).toBe('application/pdf')
    expect(safeBlobType('IMAGE/JPEG')).toBe('image/jpeg')
    expect(safeBlobType('video/quicktime')).toBe('video/quicktime')
  })

  it('wszystko, co mogłoby uruchomić skrypt, tylko do pobrania', () => {
    for (const type of ['text/html', 'image/svg+xml', 'application/xhtml+xml', 'text/html; charset=utf-8', 'application/javascript', '', null]) {
      expect(safeBlobType(type)).toBe('application/octet-stream')
    }
  })
})
