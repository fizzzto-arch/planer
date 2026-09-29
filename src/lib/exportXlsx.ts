// Plan w Excelu: arkusz "Plan" (siatka jak w Planerze, z kolorami i uwagami) i "Lista" (tabela do sortowania).
import type { ExportModel } from './exportModel'
import { formatDateShort, formatClock } from './timetable'
import { buildXlsx, ref, type Cell, type CellStyle, type Sheet } from './xlsx'

const SLOT_MIN = 15 // jeden wiersz siatki = 15 minut
const SLOT_HEIGHT = 13 // pt
const LINE = '#d9d9de'
const HEADER_FILL = '#f0f0f3'

// Kolor typu rozjaśniony do tła komórki.
function lighten(hex: string, t = 0.22): string {
  const n = parseInt(hex.slice(1), 16)
  const mix = (c: number) => Math.round(255 + (c - 255) * t)
  const [r, g, b] = [mix((n >> 16) & 255), mix((n >> 8) & 255), mix(n & 255)]
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`
}

function planSheet(model: ExportModel): Sheet {
  const cells = new Map<string, Cell>()
  const merges: string[] = []
  const rowHeights = new Map<number, number>()
  const set = (col: number, row: number, v: string | number, s?: CellStyle) => cells.set(ref(col, row), { v, s })

  // Każdy dzień ma tyle kolumn, ile najwięcej zajęć nakłada się na siebie tego dnia.
  const lanesPerDay = model.days.map((d) => Math.max(1, ...model.entries.filter((e) => e.weekday === d.weekday).map((e) => e.lanes)))
  const dayCol: number[] = []
  let col = 1
  for (const lanes of lanesPerDay) {
    dayCol.push(col)
    col += lanes
  }
  const lastCol = col - 1

  // Tytuł i podtytuł.
  set(0, 1, model.title, { bold: true, size: 16 })
  merges.push(`${ref(0, 1)}:${ref(lastCol, 1)}`)
  rowHeights.set(1, 24)
  set(0, 2, model.subtitle, { color: '#6b6b73' })
  merges.push(`${ref(0, 2)}:${ref(lastCol, 2)}`)

  // Nagłówki dni.
  const headerRow = 4
  const header: CellStyle = { bold: true, fill: HEADER_FILL, align: 'center', valign: 'center', border: LINE }
  set(0, headerRow, 'Godz.', header)
  model.days.forEach((d, i) => {
    const date = d.date ? ` ${formatDateShort(d.date)}` : ''
    set(dayCol[i], headerRow, `${d.name}${date}`, header)
    for (let c = dayCol[i] + 1; c < dayCol[i] + lanesPerDay[i]; c++) set(c, headerRow, '', header)
    if (lanesPerDay[i] > 1) merges.push(`${ref(dayCol[i], headerRow)}:${ref(dayCol[i] + lanesPerDay[i] - 1, headerRow)}`)
  })
  rowHeights.set(headerRow, 20)

  // Siatka 15-minutowa: godzina co 4 wiersze, cienka linia na początku każdej godziny.
  const firstRow = headerRow + 1
  const slots = (model.lastMinute - model.firstMinute) / SLOT_MIN
  for (let s = 0; s < slots; s++) {
    const row = firstRow + s
    const minute = model.firstMinute + s * SLOT_MIN
    const fullHour = minute % 60 === 0
    rowHeights.set(row, SLOT_HEIGHT)
    set(0, row, fullHour ? formatClock(minute) : '', {
      color: '#6b6b73',
      size: 9,
      align: 'right',
      valign: 'top',
      ...(fullHour ? { borderTop: LINE } : {}),
    })
    if (fullHour) for (let c = 1; c <= lastCol; c++) set(c, row, '', { borderTop: LINE })
  }

  // Zajęcia: scalone komórki w kolorze typu.
  for (const e of model.entries) {
    const dayIdx = model.days.findIndex((d) => d.weekday === e.weekday)
    if (dayIdx < 0) continue
    const total = lanesPerDay[dayIdx]
    const c1 = dayCol[dayIdx] + Math.floor((e.lane * total) / e.lanes)
    const c2 = dayCol[dayIdx] + Math.floor(((e.lane + 1) * total) / e.lanes) - 1
    const r1 = firstRow + Math.floor((e.start - model.firstMinute) / SLOT_MIN)
    const r2 = firstRow + Math.ceil((e.end - model.firstMinute) / SLOT_MIN) - 1
    const text = [e.course, [e.meta, e.time].filter(Boolean).join(' · '), e.place, e.when].filter(Boolean).join('\n')
    const style: CellStyle = { fill: lighten(e.color), border: e.color, wrap: true, valign: 'top', size: 9 }
    for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) set(c, r, '', style)
    set(c1, r1, text, style)
    if (r2 > r1 || c2 > c1) merges.push(`${ref(c1, r1)}:${ref(c2, r2)}`)
  }

  // Legenda i uwagi pod siatką.
  let row = firstRow + slots + 1
  if (model.types.length) {
    model.types.forEach((t, i) => set(1 + i, row, t.name, { fill: lighten(t.color), border: t.color, align: 'center', size: 9 }))
    row += 2
  }
  if (model.notes.length) {
    set(0, row, 'Uwagi', { bold: true })
    row++
    for (const note of model.notes) {
      set(0, row, `• ${note}`, { wrap: true, valign: 'top' })
      merges.push(`${ref(0, row)}:${ref(lastCol, row)}`)
      rowHeights.set(row, note.length > 120 ? 30 : 16)
      row++
    }
  }

  const dayWidth = 26
  const colWidths = [7, ...lanesPerDay.flatMap((lanes) => Array.from({ length: lanes }, () => Math.max(12, dayWidth / lanes)))]
  return {
    name: 'Plan',
    cells,
    merges,
    colWidths,
    rowHeights,
    freeze: { rows: headerRow, cols: 1 },
    landscape: true,
  }
}

function listSheet(model: ExportModel): Sheet {
  const cells = new Map<string, Cell>()
  const week = model.days.some((d) => d.date)
  const headers = ['Dzień', ...(week ? ['Data'] : []), 'Od', 'Do', 'Przedmiot', 'Typ', 'Grupa', 'Sala', 'Budynek', ...(week ? [] : ['Tygodnie'])]
  headers.forEach((h, c) => cells.set(ref(c, 1), { v: h, s: { bold: true, fill: HEADER_FILL, border: LINE } }))
  const sorted = [...model.entries].sort((a, b) => a.weekday - b.weekday || a.start - b.start)
  sorted.forEach((e, i) => {
    const day = model.days.find((d) => d.weekday === e.weekday)
    const values: (string | number)[] = [
      day?.name ?? '',
      ...(week ? [e.date ? formatDateShort(e.date) : ''] : []),
      formatClock(e.start),
      formatClock(e.end),
      e.course,
      e.typeName,
      e.groupNumber ?? '',
      e.room ?? '',
      e.building ?? '',
      ...(week ? [] : [e.when || 'co tydzień']),
    ]
    values.forEach((v, c) => cells.set(ref(c, i + 2), { v, s: { border: LINE } }))
  })
  const widths = [13, ...(week ? [8] : []), 7, 7, 42, 13, 7, 9, 30, ...(week ? [] : [26])]
  return {
    name: 'Lista',
    cells,
    merges: [],
    colWidths: widths,
    rowHeights: new Map(),
    freeze: { rows: 1, cols: 0 },
    autoFilter: `${ref(0, 1)}:${ref(headers.length - 1, Math.max(1, sorted.length + 1))}`,
  }
}

export function exportXlsx(model: ExportModel): Blob {
  return buildXlsx([planSheet(model), listSheet(model)])
}
