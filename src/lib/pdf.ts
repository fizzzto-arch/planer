// Najprostszy PDF: jedna strona A4 ze zdjęciem JPEG wyśrodkowanym w marginesach.
// Bez bibliotek - PDF z jednym obrazkiem to kilka obiektów tekstowych i sam JPEG.

const A4 = { short: 595.28, long: 841.89 } // punkty (1/72 cala)
const MARGIN = 24

export function jpegToPdf(jpeg: Uint8Array, widthPx: number, heightPx: number): Blob {
  const landscape = widthPx >= heightPx
  const pageW = landscape ? A4.long : A4.short
  const pageH = landscape ? A4.short : A4.long
  const fit = Math.min((pageW - MARGIN * 2) / widthPx, (pageH - MARGIN * 2) / heightPx)
  const w = widthPx * fit
  const h = heightPx * fit
  const x = (pageW - w) / 2
  const y = pageH - MARGIN - h // obraz przy górnej krawędzi (PDF liczy y od dołu)
  const n = (v: number) => v.toFixed(2)

  const content = `q ${n(w)} 0 0 ${n(h)} ${n(x)} ${n(y)} cm /Im0 Do Q`
  const encoder = new TextEncoder()
  const parts: Uint8Array[] = []
  const offsets: number[] = []
  let length = 0
  const push = (chunk: string | Uint8Array) => {
    const bytes = typeof chunk === 'string' ? encoder.encode(chunk) : chunk
    parts.push(bytes)
    length += bytes.length
  }
  const object = (id: number, body: string | (() => void)) => {
    offsets[id] = length
    push(`${id} 0 obj\n`)
    if (typeof body === 'string') push(body)
    else body()
    push('\nendobj\n')
  }

  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n')
  object(1, '<< /Type /Catalog /Pages 2 0 R >>')
  object(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>')
  object(
    3,
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${n(pageW)} ${n(pageH)}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`,
  )
  object(4, () => {
    push(
      `<< /Type /XObject /Subtype /Image /Width ${widthPx} /Height ${heightPx} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`,
    )
    push(jpeg)
    push('\nendstream')
  })
  object(5, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`)

  const xref = length
  push(`xref\n0 6\n0000000000 65535 f \n`)
  for (let id = 1; id <= 5; id++) push(`${String(offsets[id]).padStart(10, '0')} 00000 n \n`)
  push(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`)

  const out = new Uint8Array(length)
  let pos = 0
  for (const part of parts) {
    out.set(part, pos)
    pos += part.length
  }
  return new Blob([out], { type: 'application/pdf' })
}
