// Zdjęcie planu (canvas): poziomo - siatka tygodnia, pionowo - lista dni (pod ekran telefonu).
import type { ExportEntry, ExportModel } from './exportModel'
import { formatClock } from './timetable'

export type ImageTheme = 'light' | 'dark'

const PALETTE = {
  light: { bg: '#ffffff', panel: '#f4f4f6', text: '#1c1c1f', muted: '#6b6b73', line: '#e2e2e7', strong: '#c9c9d1' },
  dark: { bg: '#121215', panel: '#1c1c21', text: '#ececef', muted: '#9a9aa3', line: '#2c2c33', strong: '#3a3a43' },
}

const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
const font = (size: number, weight = 400) => `${weight} ${size}px ${FONT}`

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

// Kolor typu rozjaśniony do tła kafelka (w ciemnym motywie - przyciemniony).
function tint(hex: string, theme: ImageTheme): string {
  const [r, g, b] = hexToRgb(hex)
  const [br, bg, bb] = hexToRgb(PALETTE[theme].bg)
  const t = theme === 'light' ? 0.17 : 0.3
  const mix = (c: number, base: number) => Math.round(base + (c - base) * t)
  return `rgb(${mix(r, br)}, ${mix(g, bg)}, ${mix(b, bb)})`
}

// Tekst łamany do szerokości; najwyżej maxLines linii, ostatnia z "…".
function wrap(ctx: CanvasRenderingContext2D, text: string, width: number, maxLines = Infinity): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width <= width || !line) line = test
    else {
      lines.push(line)
      line = word
    }
  }
  if (line) lines.push(line)
  // Pojedyncze bardzo długie słowo - przycinamy.
  const fitted = lines.map((l) => ellipsize(ctx, l, width))
  if (fitted.length <= maxLines) return fitted
  const kept = fitted.slice(0, maxLines)
  kept[maxLines - 1] = ellipsize(ctx, `${kept[maxLines - 1]}…`, width, true)
  return kept
}

function ellipsize(ctx: CanvasRenderingContext2D, text: string, width: number, force = false): string {
  if (!force && ctx.measureText(text).width <= width) return text
  let t = text.replace(/…$/, '')
  while (t.length > 1 && ctx.measureText(`${t}…`).width > width) t = t.slice(0, -1)
  return `${t.trimEnd()}…`
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, Math.min(r, h / 2, w / 2))
}

function newCanvas(width: number, height: number, scale: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(width * scale)
  canvas.height = Math.round(height * scale)
  const ctx = canvas.getContext('2d')!
  ctx.scale(scale, scale)
  ctx.textBaseline = 'top'
  return [canvas, ctx]
}

// Wspólny nagłówek: tytuł + podtytuł. Zwraca wysokość.
function drawHeader(ctx: CanvasRenderingContext2D, model: ExportModel, x: number, y: number, width: number, theme: ImageTheme, size: number): number {
  const p = PALETTE[theme]
  ctx.fillStyle = p.text
  ctx.font = font(size, 700)
  const titleLines = wrap(ctx, model.title, width, 2)
  titleLines.forEach((l, i) => ctx.fillText(l, x, y + i * size * 1.2))
  let h = titleLines.length * size * 1.2 + size * 0.2
  ctx.fillStyle = p.muted
  ctx.font = font(size * 0.55, 500)
  ctx.fillText(model.subtitle, x, y + h)
  h += size * 0.55 * 1.3
  return h
}

// Uwagi pod planem. measure = tylko policz wysokość.
function drawNotes(ctx: CanvasRenderingContext2D, notes: string[], x: number, y: number, width: number, theme: ImageTheme, size: number, measure: boolean): number {
  if (notes.length === 0) return 0
  const p = PALETTE[theme]
  let h = 0
  ctx.font = font(size, 700)
  if (!measure) {
    ctx.fillStyle = p.text
    ctx.fillText('Uwagi', x, y)
  }
  h += size * 1.6
  ctx.font = font(size, 400)
  for (const note of notes) {
    const lines = wrap(ctx, note, width - size * 1.2)
    if (!measure) {
      ctx.fillStyle = p.muted
      ctx.fillText('•', x, y + h)
      ctx.fillStyle = p.text
      lines.forEach((l, i) => ctx.fillText(l, x + size * 1.2, y + h + i * size * 1.35))
    }
    h += lines.length * size * 1.35 + size * 0.3
  }
  return h
}

function drawFooter(ctx: CanvasRenderingContext2D, x: number, y: number, theme: ImageTheme, size: number) {
  ctx.fillStyle = PALETTE[theme].muted
  ctx.font = font(size, 500)
  ctx.fillText('Planer · fizzzto-arch.github.io/planer', x, y)
}

// ---------- Poziomo: siatka tygodnia ----------

function drawEntryBlock(ctx: CanvasRenderingContext2D, e: ExportEntry, x: number, y: number, w: number, h: number, theme: ImageTheme) {
  const p = PALETTE[theme]
  ctx.fillStyle = tint(e.color, theme)
  roundRect(ctx, x, y, w, h, 8)
  ctx.fill()
  ctx.fillStyle = e.color
  roundRect(ctx, x, y, 5, h, 3)
  ctx.fill()

  const pad = 8
  const innerX = x + pad + 3
  const innerW = w - pad * 2 - 3
  let cy = y + pad - 1
  const bottom = y + h - pad + 2
  const small = w < 120 ? 12 : 13.5

  // Kolejność ważności: nazwa, kiedy (tygodnie), godziny z typem i grupą, sala.
  // Godziny i typ w jednej linii - w krótkich (45 min) zajęciach zostaje miejsce na salę.
  ctx.font = font(w < 120 ? 13.5 : 15, 700)
  const nameLines = wrap(ctx, e.course, innerW, h > 110 ? 3 : 2)
  const rest: { text: string; color: string; weight: number }[] = [
    ...(e.when ? [{ text: e.when, color: e.color, weight: 700 }] : []),
    { text: [e.time, e.meta].filter(Boolean).join(' · '), color: p.text, weight: 500 },
    ...(e.place ? [{ text: e.place, color: p.muted, weight: 400 }] : []),
  ]
  const nameH = 15 * 1.2
  const lineH = small * 1.3
  // Ile linii nazwy się zmieści, zostawiając miejsce przynajmniej na "kiedy"/godziny.
  const reserve = Math.min(rest.length, 1) * lineH
  const maxName = Math.max(1, Math.min(nameLines.length, Math.floor((bottom - cy - reserve) / nameH)))
  ctx.fillStyle = p.text
  ctx.font = font(w < 120 ? 13.5 : 15, 700)
  wrap(ctx, e.course, innerW, maxName).forEach((l) => {
    ctx.fillText(l, innerX, cy)
    cy += nameH
  })
  cy += 2
  for (const line of rest) {
    if (cy + lineH > bottom + 1) break
    ctx.fillStyle = line.color
    ctx.font = font(small, line.weight)
    ctx.fillText(ellipsize(ctx, line.text, innerW), innerX, cy)
    cy += lineH
  }
}

function renderLandscape(model: ExportModel, theme: ImageTheme, scale: number): HTMLCanvasElement {
  const p = PALETTE[theme]
  const width = 1600
  const pad = 48
  const timeCol = 64
  const headerRow = 52
  const hourH = 86
  const hours = (model.lastMinute - model.firstMinute) / 60
  const gridW = width - pad * 2
  const dayW = (gridW - timeCol) / model.days.length
  const gridH = headerRow + hours * hourH

  // Najpierw wysokość uwag (zależy od łamania tekstu).
  const [, measureCtx] = newCanvas(1, 1, 1)
  const notesW = width - pad * 2
  const notesH = drawNotes(measureCtx, model.notes, 0, 0, notesW, theme, 17, true)
  const legendH = model.types.length > 0 ? 40 : 0
  const headerH = 92
  const height = pad + headerH + gridH + 24 + legendH + (notesH ? notesH + 16 : 0) + 36 + pad * 0.5

  const [canvas, ctx] = newCanvas(width, height, scale)
  ctx.fillStyle = p.bg
  ctx.fillRect(0, 0, width, height)

  drawHeader(ctx, model, pad, pad, gridW, theme, 38)
  const top = pad + headerH

  // Nagłówki dni.
  ctx.fillStyle = p.panel
  roundRect(ctx, pad, top, gridW, headerRow, 10)
  ctx.fill()
  model.days.forEach((d, i) => {
    const x = pad + timeCol + i * dayW
    ctx.fillStyle = p.text
    ctx.font = font(18, 700)
    const date = d.date ? ` ${d.date.getDate()}.${String(d.date.getMonth() + 1).padStart(2, '0')}` : ''
    const text = ellipsize(ctx, `${d.name}${date}`, dayW - 16)
    ctx.fillText(text, x + (dayW - ctx.measureText(text).width) / 2, top + (headerRow - 18) / 2)
  })

  // Linie godzin i podpisy.
  const gridTop = top + headerRow
  for (let hIdx = 0; hIdx <= hours; hIdx++) {
    const y = gridTop + hIdx * hourH
    ctx.strokeStyle = p.line
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(pad + timeCol, y + 0.5)
    ctx.lineTo(pad + gridW, y + 0.5)
    ctx.stroke()
    if (hIdx < hours) {
      ctx.fillStyle = p.muted
      ctx.font = font(15, 500)
      const label = formatClock(model.firstMinute + hIdx * 60)
      ctx.fillText(label, pad + timeCol - 12 - ctx.measureText(label).width, y + 4)
    }
  }
  // Pionowe linie dni.
  model.days.forEach((_, i) => {
    const x = pad + timeCol + i * dayW
    ctx.strokeStyle = p.line
    ctx.beginPath()
    ctx.moveTo(x + 0.5, gridTop)
    ctx.lineTo(x + 0.5, gridTop + hours * hourH)
    ctx.stroke()
  })

  // Zajęcia.
  const minuteH = hourH / 60
  for (const e of model.entries) {
    const dayIdx = model.days.findIndex((d) => d.weekday === e.weekday)
    if (dayIdx < 0) continue
    const colX = pad + timeCol + dayIdx * dayW + 4
    const colW = dayW - 8
    const laneW = colW / e.lanes
    const x = colX + e.lane * laneW + (e.lane > 0 ? 2 : 0)
    const w = laneW - (e.lanes > 1 ? 2 : 0)
    const y = gridTop + (e.start - model.firstMinute) * minuteH + 2
    const h = (e.end - e.start) * minuteH - 4
    drawEntryBlock(ctx, e, x, y, w, h, theme)
  }

  // Legenda typów.
  let y = gridTop + hours * hourH + 24
  if (legendH) {
    let x = pad
    ctx.font = font(15, 500)
    for (const t of model.types) {
      ctx.fillStyle = t.color
      roundRect(ctx, x, y + 1, 16, 16, 4)
      ctx.fill()
      ctx.fillStyle = p.text
      ctx.fillText(t.name, x + 24, y + 1)
      x += 24 + ctx.measureText(t.name).width + 28
    }
    y += legendH
  }
  if (notesH) {
    drawNotes(ctx, model.notes, pad, y, notesW, theme, 17, false)
    y += notesH + 16
  }
  drawFooter(ctx, pad, y + 8, theme, 13)
  return canvas
}

// ---------- Pionowo: lista dni ----------

function renderPortrait(model: ExportModel, theme: ImageTheme, scale: number): HTMLCanvasElement {
  const p = PALETTE[theme]
  const width = 420
  const pad = 22
  const innerW = width - pad * 2
  const timeW = 52
  const textX = pad + timeW + 14
  const textW = width - pad - textX - 10

  // Układ kart liczony raz - do pomiaru i do rysowania.
  const [, m] = newCanvas(1, 1, 1)
  type Card = { e: ExportEntry; name: string[]; lines: { text: string; color: string; weight: number }[]; h: number }
  const daysWithCards = model.days
    .map((d) => {
      const cards: Card[] = model.entries
        .filter((e) => e.weekday === d.weekday)
        .sort((a, b) => a.start - b.start)
        .map((e) => {
          m.font = font(15, 700)
          const name = wrap(m, e.course, textW, 3)
          const lines = [
            ...(e.when ? [{ text: e.when, color: e.color, weight: 700 }] : []),
            ...(e.meta ? [{ text: e.meta, color: p.muted, weight: 400 }] : []),
            ...(e.place ? [{ text: e.place, color: p.muted, weight: 400 }] : []),
          ]
          const h = Math.max(54, 12 + name.length * 18 + lines.length * 16.5 + 10)
          return { e, name, lines, h }
        })
      return { d, cards }
    })
    .filter((x) => x.cards.length > 0)

  const notesH = drawNotes(m, model.notes, 0, 0, innerW, theme, 13, true)
  const headerH = 70
  const daysH = daysWithCards.reduce((sum, x) => sum + 34 + x.cards.reduce((s, c) => s + c.h + 8, 0) + 8, 0)
  const height = pad + headerH + daysH + (notesH ? notesH + 12 : 0) + 30 + pad * 0.5

  const [canvas, ctx] = newCanvas(width, height, scale)
  ctx.fillStyle = p.bg
  ctx.fillRect(0, 0, width, height)
  drawHeader(ctx, model, pad, pad, innerW, theme, 24)

  let y = pad + headerH
  for (const { d, cards } of daysWithCards) {
    ctx.fillStyle = p.text
    ctx.font = font(17, 700)
    const date = d.date ? ` ${d.date.getDate()}.${String(d.date.getMonth() + 1).padStart(2, '0')}` : ''
    ctx.fillText(`${d.name}${date}`, pad, y + 6)
    y += 34
    for (const c of cards) {
      ctx.fillStyle = tint(c.e.color, theme)
      roundRect(ctx, pad, y, innerW, c.h, 10)
      ctx.fill()
      ctx.fillStyle = c.e.color
      roundRect(ctx, pad, y, 5, c.h, 3)
      ctx.fill()
      // Godziny po lewej.
      ctx.fillStyle = p.text
      ctx.font = font(14, 700)
      ctx.fillText(formatClock(c.e.start), pad + 14, y + 11)
      ctx.fillStyle = p.muted
      ctx.font = font(13, 500)
      ctx.fillText(formatClock(c.e.end), pad + 14, y + 29)
      // Treść.
      let cy = y + 10
      ctx.fillStyle = p.text
      ctx.font = font(15, 700)
      for (const l of c.name) {
        ctx.fillText(l, textX, cy)
        cy += 18
      }
      cy += 1
      for (const l of c.lines) {
        ctx.fillStyle = l.color
        ctx.font = font(12.5, l.weight)
        ctx.fillText(ellipsize(ctx, l.text, textW), textX, cy)
        cy += 16.5
      }
      y += c.h + 8
    }
    y += 8
  }
  if (notesH) {
    drawNotes(ctx, model.notes, pad, y + 4, innerW, theme, 13, false)
    y += notesH + 12
  }
  drawFooter(ctx, pad, y + 6, theme, 11)
  return canvas
}

export function renderPlanImage(model: ExportModel, layout: 'landscape' | 'portrait', theme: ImageTheme): HTMLCanvasElement {
  return layout === 'landscape' ? renderLandscape(model, theme, 2) : renderPortrait(model, theme, 3)
}

export function canvasToBlob(canvas: HTMLCanvasElement, type: 'image/png' | 'image/jpeg'): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Nie udało się utworzyć obrazu.'))), type, 0.92),
  )
}
