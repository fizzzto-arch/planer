import { describe, expect, it } from 'vitest'
import { buildExportModel, DEFAULT_EXPORT_OPTIONS } from './exportModel'
import { exportXlsx } from './exportXlsx'
import { buildTimetable, type TimetableMeeting } from './timetable'

// Pliki z archiwum ZIP zapisanego metodą "stored" (tak zapisuje xlsx.ts).
function unzipStored(bytes: Uint8Array): Map<string, string> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const files = new Map<string, string>()
  let pos = 0
  while (view.getUint32(pos, true) === 0x04034b50) {
    const size = view.getUint32(pos + 18, true)
    const nameLen = view.getUint16(pos + 26, true)
    const name = new TextDecoder().decode(bytes.slice(pos + 30, pos + 30 + nameLen))
    files.set(name, new TextDecoder().decode(bytes.slice(pos + 30 + nameLen, pos + 30 + nameLen + size)))
    pos += 30 + nameLen + size
  }
  return files
}

function cellsOf(range: string): string[] {
  const [a, b] = range.split(':')
  const col = (r: string) => r.charCodeAt(0) - 65
  const row = (r: string) => Number(r.slice(1))
  const out: string[] = []
  for (let c = col(a); c <= col(b); c++) for (let r = row(a); r <= row(b); r++) out.push(`${c}:${r}`)
  return out
}

describe('plan w Excelu', () => {
  // Dwie grupy o tej samej porze w poniedziałek (np. tygodnie nieparzyste i parzyste) + wtorek.
  const at = (d: number, h: number, m = 15) => new Date(2026, 9, d, h, m)
  const meetings: TimetableMeeting[] = []
  for (let week = 0; week < 8; week++) {
    const mon = 5 + week * 7
    meetings.push({ id: `a${week}`, courseName: 'Analiza', type: 'WYK', start: at(mon, 8), end: at(mon, 10, 0), room: '1', building: null, groupNumber: 1, cancelled: false })
    const lab = week % 2 === 0 ? 'Elektro' : 'Fizyka'
    meetings.push({ id: `l${week}`, courseName: lab, type: 'LAB', start: at(mon, 9), end: at(mon, 11, 0), room: '2', building: null, groupNumber: 101, cancelled: false })
    meetings.push({ id: `t${week}`, courseName: 'Chemia', type: 'CWI', start: at(mon + 1, 12), end: at(mon + 1, 14, 0), room: '3', building: null, groupNumber: 102, cancelled: false })
  }

  it('nakładające się zajęcia dostają osobne kolumny, a scalenia się nie pokrywają', async () => {
    const timetable = buildTimetable(meetings, at(5, 7))!
    const model = buildExportModel({
      timetable,
      meetings,
      options: DEFAULT_EXPORT_OPTIONS,
      weekStart: at(5, 0, 0),
      hiddenNotes: new Set(),
      label: (c) => c,
      colors: {},
    })
    const files = unzipStored(new Uint8Array(await exportXlsx(model).arrayBuffer()))
    const sheet = files.get('xl/worksheets/sheet1.xml')!
    const merges = [...sheet.matchAll(/<mergeCell ref="([A-Z]+\d+:[A-Z]+\d+)"\/>/g)].map((m) => m[1])
    const seen = new Set<string>()
    for (const cell of merges.flatMap(cellsOf)) {
      expect(seen.has(cell)).toBe(false)
      seen.add(cell)
    }
    // Poniedziałek ma 3 kolumny (wykład + dwa laboratoria nakładające się na siebie).
    expect(sheet).toContain('Elektro')
    expect(sheet).toContain('Fizyka')
    expect(files.get('xl/workbook.xml')).toContain('name="Lista"')

    // Każdy wiersz ma wysokość - podgląd na iPhonie rozciągał wiersz bez niej (legendę) na pół ekranu.
    for (const xml of [sheet, files.get('xl/worksheets/sheet2.xml')!]) {
      const rows = [...xml.matchAll(/<row [^>]*>/g)].map((m) => m[0])
      expect(rows.length).toBeGreaterThan(0)
      for (const row of rows) expect(row).toMatch(/ht="\d+(\.\d+)?" customHeight="1"/)
      expect(xml).toContain('<sheetFormatPr defaultRowHeight=')
    }
    // Legenda nad siatką (wiersz 3), bez szarej siatki arkusza.
    expect(sheet).toMatch(/<row r="3"[^>]*>.*?Wykład/)
    expect(sheet).toContain('showGridLines="0"')
  })
})
