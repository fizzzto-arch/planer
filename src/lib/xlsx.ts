// Minimalny zapis .xlsx (bez bibliotek): archiwum ZIP (bez kompresji) z plikami XML arkusza.
// Obsługuje: tekst i liczby, style (pogrubienie, rozmiar, kolor, tło, ramki, zawijanie,
// wyrównanie), scalone komórki, szerokości kolumn, wysokości wierszy, zamrożenie, filtr, wydruk.

export interface CellStyle {
  bold?: boolean
  size?: number
  color?: string // "#rrggbb"
  fill?: string
  border?: string // kolor cienkiej ramki dookoła
  borderTop?: string // tylko górna krawędź (np. linie godzin)
  wrap?: boolean
  align?: 'left' | 'center' | 'right'
  valign?: 'top' | 'center'
}

export interface Cell {
  v: string | number
  s?: CellStyle
}

export interface Sheet {
  name: string
  cells: Map<string, Cell> // "B4" -> komórka
  merges: string[] // "B4:C10"
  colWidths: number[] // szerokości kolumn w znakach, od A
  rowHeights: Map<number, number> // numer wiersza (od 1) -> punkty
  freeze?: { rows: number; cols: number }
  autoFilter?: string
  landscape?: boolean // wydruk w poziomie, dopasowany do szerokości strony
}

export function colName(index: number): string {
  // 0 -> A, 25 -> Z, 26 -> AA
  let s = ''
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s
  return s
}

export const ref = (col: number, row: number) => `${colName(col)}${row}`

const esc = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    // znaki sterujące są niedozwolone w XML (poza tabulatorem i nową linią) - wycinamy je celowo
    // oxlint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')

const argb = (hex: string) => `FF${hex.slice(1).toUpperCase()}`

// Rejestr stylów: te same style dostają ten sam numer.
class Styles {
  fonts: string[] = ['<font><sz val="11"/><name val="Calibri"/></font>']
  fills: string[] = ['<fill><patternFill patternType="none"/></fill>', '<fill><patternFill patternType="gray125"/></fill>']
  borders: string[] = ['<border><left/><right/><top/><bottom/><diagonal/></border>']
  xfs: string[] = ['<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>']
  private index = new Map<string, number>()

  private add(list: string[], xml: string): number {
    const i = list.indexOf(xml)
    if (i >= 0) return i
    list.push(xml)
    return list.length - 1
  }

  id(s: CellStyle | undefined): number {
    if (!s) return 0
    const key = JSON.stringify(s)
    const known = this.index.get(key)
    if (known !== undefined) return known
    const font = this.add(
      this.fonts,
      `<font>${s.bold ? '<b/>' : ''}<sz val="${s.size ?? 11}"/>${s.color ? `<color rgb="${argb(s.color)}"/>` : ''}<name val="Calibri"/></font>`,
    )
    const fill = s.fill
      ? this.add(this.fills, `<fill><patternFill patternType="solid"><fgColor rgb="${argb(s.fill)}"/><bgColor indexed="64"/></patternFill></fill>`)
      : 0
    const side = (name: string, color?: string) => (color ? `<${name} style="thin"><color rgb="${argb(color)}"/></${name}>` : `<${name}/>`)
    const border =
      s.border || s.borderTop
        ? this.add(
            this.borders,
            `<border>${side('left', s.border)}${side('right', s.border)}${side('top', s.border ?? s.borderTop)}${side('bottom', s.border)}<diagonal/></border>`,
          )
        : 0
    const alignment =
      s.wrap || s.align || s.valign
        ? `<alignment${s.align ? ` horizontal="${s.align}"` : ''}${s.valign ? ` vertical="${s.valign}"` : ''}${s.wrap ? ' wrapText="1"' : ''}/>`
        : ''
    const xf = `<xf numFmtId="0" fontId="${font}" fillId="${fill}" borderId="${border}" xfId="0"${font ? ' applyFont="1"' : ''}${fill ? ' applyFill="1"' : ''}${border ? ' applyBorder="1"' : ''}${alignment ? ' applyAlignment="1">' + alignment + '</xf>' : '/>'}`
    const id = this.add(this.xfs, xf)
    this.index.set(key, id)
    return id
  }

  xml(): string {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="${this.fonts.length}">${this.fonts.join('')}</fonts>
<fills count="${this.fills.length}">${this.fills.join('')}</fills>
<borders count="${this.borders.length}">${this.borders.join('')}</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="${this.xfs.length}">${this.xfs.join('')}</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`
  }
}

// "A1:J20" -> "$A$1:$J$20"
const absoluteRange = (range: string) =>
  range
    .split(':')
    .map((r) => r.replace(/^([A-Z]+)(\d+)$/, '$$$1$$$2'))
    .join(':')

function parseRef(r: string): [number, number] {
  const m = /^([A-Z]+)(\d+)$/.exec(r)!
  let col = 0
  for (const ch of m[1]) col = col * 26 + (ch.charCodeAt(0) - 64)
  return [col - 1, Number(m[2])]
}

function sheetXml(sheet: Sheet, styles: Styles): string {
  const rows = new Map<number, [number, Cell][]>()
  for (const [r, cell] of sheet.cells) {
    const [col, row] = parseRef(r)
    rows.set(row, [...(rows.get(row) ?? []), [col, cell]])
  }
  for (const row of sheet.rowHeights.keys()) if (!rows.has(row)) rows.set(row, [])
  const rowXml = [...rows.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([row, cells]) => {
      const height = sheet.rowHeights.get(row)
      const cellsXml = cells
        .sort((a, b) => a[0] - b[0])
        .map(([col, cell]) => {
          const s = styles.id(cell.s)
          const r = ref(col, row)
          if (typeof cell.v === 'number') return `<c r="${r}" s="${s}"><v>${cell.v}</v></c>`
          if (cell.v === '') return `<c r="${r}" s="${s}"/>`
          return `<c r="${r}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${esc(cell.v)}</t></is></c>`
        })
        .join('')
      return `<row r="${row}"${height ? ` ht="${height}" customHeight="1"` : ''}>${cellsXml}</row>`
    })
    .join('')

  const pane = sheet.freeze
    ? `<sheetViews><sheetView workbookViewId="0"><pane${sheet.freeze.cols ? ` xSplit="${sheet.freeze.cols}"` : ''}${sheet.freeze.rows ? ` ySplit="${sheet.freeze.rows}"` : ''} topLeftCell="${ref(sheet.freeze.cols, sheet.freeze.rows + 1)}" activePane="bottomRight" state="frozen"/></sheetView></sheetViews>`
    : ''
  const cols = sheet.colWidths.length
    ? `<cols>${sheet.colWidths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>`
    : ''
  const merges = sheet.merges.length
    ? `<mergeCells count="${sheet.merges.length}">${sheet.merges.map((m) => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>`
    : ''
  const filter = sheet.autoFilter ? `<autoFilter ref="${sheet.autoFilter}"/>` : ''
  const print = sheet.landscape
    ? '<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/><pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/>'
    : '<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/>'
  const sheetPr = sheet.landscape ? '<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>' : ''
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">${sheetPr}${pane}${cols}<sheetData>${rowXml}</sheetData>${filter}${merges}${print}</worksheet>`
}

export function buildXlsx(sheets: Sheet[]): Blob {
  const styles = new Styles()
  const sheetFiles = sheets.map((s, i) => ({ path: `xl/worksheets/sheet${i + 1}.xml`, xml: sheetXml(s, styles) }))
  const files: { path: string; xml: string }[] = [
    {
      path: '[Content_Types].xml',
      xml: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets
        .map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`)
        .join('')}</Types>`,
    },
    {
      path: '_rels/.rels',
      xml: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    },
    {
      path: 'xl/workbook.xml',
      xml: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets
        .map((s, i) => `<sheet name="${esc(s.name.slice(0, 31))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
        .join('')}</sheets>${sheets.some((s) => s.autoFilter) ? `<definedNames>${sheets
        .map((s, i) => (s.autoFilter ? `<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">'${esc(s.name.slice(0, 31))}'!${absoluteRange(s.autoFilter)}</definedName>` : ''))
        .join('')}</definedNames>` : ''}</workbook>`,
    },
    {
      path: 'xl/_rels/workbook.xml.rels',
      xml: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets
        .map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`)
        .join('')}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    },
    ...sheetFiles,
    { path: 'xl/styles.xml', xml: styles.xml() },
  ]
  return new Blob([zip(files.map((f) => ({ path: f.path, data: new TextEncoder().encode(f.xml) })))], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

// ---------- ZIP (metoda "stored", bez kompresji) ----------

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

export function crc32(data: Uint8Array): number {
  let c = 0xffffffff
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

export function zip(files: { path: string; data: Uint8Array }[]): Uint8Array<ArrayBuffer> {
  const encoder = new TextEncoder()
  const locals: Uint8Array[] = []
  const centrals: Uint8Array[] = []
  let offset = 0
  for (const f of files) {
    const name = encoder.encode(f.path)
    const crc = crc32(f.data)
    const local = new Uint8Array(30 + name.length)
    const lv = new DataView(local.buffer)
    lv.setUint32(0, 0x04034b50, true)
    lv.setUint16(4, 20, true) // wersja
    lv.setUint16(6, 0x0800, true) // nazwy w UTF-8
    lv.setUint16(8, 0, true) // stored
    lv.setUint32(14, crc, true)
    lv.setUint32(18, f.data.length, true)
    lv.setUint32(22, f.data.length, true)
    lv.setUint16(26, name.length, true)
    local.set(name, 30)
    const central = new Uint8Array(46 + name.length)
    const cv = new DataView(central.buffer)
    cv.setUint32(0, 0x02014b50, true)
    cv.setUint16(4, 20, true)
    cv.setUint16(6, 20, true)
    cv.setUint16(8, 0x0800, true)
    cv.setUint16(10, 0, true)
    cv.setUint32(16, crc, true)
    cv.setUint32(20, f.data.length, true)
    cv.setUint32(24, f.data.length, true)
    cv.setUint16(28, name.length, true)
    cv.setUint32(42, offset, true)
    central.set(name, 46)
    locals.push(local, f.data)
    centrals.push(central)
    offset += local.length + f.data.length
  }
  const centralSize = centrals.reduce((s, c) => s + c.length, 0)
  const end = new Uint8Array(22)
  const ev = new DataView(end.buffer)
  ev.setUint32(0, 0x06054b50, true)
  ev.setUint16(8, files.length, true)
  ev.setUint16(10, files.length, true)
  ev.setUint32(12, centralSize, true)
  ev.setUint32(16, offset, true)
  const out = new Uint8Array(new ArrayBuffer(offset + centralSize + 22))
  let pos = 0
  for (const part of [...locals, ...centrals, end]) {
    out.set(part, pos)
    pos += part.length
  }
  return out
}
