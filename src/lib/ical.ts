// Minimalny parser formatu iCalendar (RFC 5545) - tylko to, czego potrzebujemy z USOS.

export interface IcsEvent {
  uid: string
  summary: string
  description: string
  location: string
  status: string
  start: Date
  end: Date
}

// Długie linie są w .ics "zawijane": kontynuacja zaczyna się od spacji lub tabulatora.
function unfoldLines(text: string): string[] {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/\n[ \t]/g, '')
    .split('\n')
}

function unescapeText(value: string): string {
  return value.replace(/\\([\\;,nN])/g, (_, ch: string) =>
    ch === 'n' || ch === 'N' ? '\n' : ch,
  )
}

// "DTSTART;VALUE=DATE-TIME:20261002T121500" -> nazwa "DTSTART", wartość "20261002T121500".
// Dwukropek w cudzysłowie (np. w parametrze TZID) nie kończy nazwy.
function splitProperty(line: string): { name: string; value: string } | null {
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') inQuotes = !inQuotes
    else if (ch === ':' && !inQuotes) {
      const name = line.slice(0, i).split(';')[0].toUpperCase()
      return { name, value: line.slice(i + 1) }
    }
  }
  return null
}

// Czas bez "Z" to czas lokalny (USOS podaje czas warszawski), z "Z" to UTC.
export function parseIcsDate(value: string): Date | null {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/.exec(value.trim())
  if (!m) return null
  const [, y, mo, d, h = '0', mi = '0', s = '0', utc] = m
  if (utc) return new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s))
  return new Date(+y, +mo - 1, +d, +h, +mi, +s)
}

export function parseIcs(text: string): IcsEvent[] {
  const events: IcsEvent[] = []
  let current: Record<string, string> | null = null

  for (const line of unfoldLines(text)) {
    if (line === 'BEGIN:VEVENT') {
      current = {}
      continue
    }
    if (line === 'END:VEVENT') {
      if (current) {
        const start = parseIcsDate(current.DTSTART ?? '')
        const end = parseIcsDate(current.DTEND ?? '')
        if (start && end) {
          events.push({
            uid: current.UID ?? `${current.DTSTART}-${current.SUMMARY}`,
            summary: unescapeText(current.SUMMARY ?? ''),
            description: unescapeText(current.DESCRIPTION ?? ''),
            location: unescapeText(current.LOCATION ?? ''),
            status: (current.STATUS ?? '').toUpperCase(),
            start,
            end,
          })
        }
      }
      current = null
      continue
    }
    if (!current) continue
    const prop = splitProperty(line)
    if (prop) current[prop.name] = prop.value
  }
  return events
}
