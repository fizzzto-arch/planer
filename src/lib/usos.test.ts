import { describe, expect, it } from 'vitest'
import { mergeWithHistory, parseUsosCalendar, shortBuilding, type Meeting } from './usos'
import { plural } from './plural'
import { formatDuration, formatWeekRange, startOfWeek } from './dates'

// Zmyślony plan w formacie zwracanym przez USOS PW (CRLF, zawijane linie, escapowane przecinki).
const SAMPLE = [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'X-WR-TIMEZONE:Europe/Warsaw',
  'BEGIN:VEVENT',
  'SUMMARY:WYK - Grafika komputerowa',
  'DTSTART;VALUE=DATE-TIME:20261002T121500',
  'DTEND;VALUE=DATE-TIME:20261002T140000',
  'UID:sm-1@apps.usos.pw.edu.pl',
  'DESCRIPTION:Sala: 170\\nBudynek Wydziału Elektroniki i Technik Informacyjn',
  ' ych\\n\\nhttps://usosweb.usos.pw.edu.pl/kontroler.php?_action=katalog2/przed',
  ' mioty/pokazZajecia&gr_nr=1&zaj_cyk_id=111\\n',
  'LOCATION:Nowowiejska 15/19\\, 00-665 Warszawa',
  'STATUS:CONFIRMED',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'SUMMARY:PRO - Projektowanie',
  'DTSTART;VALUE=DATE-TIME:20261001T141500',
  'DTEND;VALUE=DATE-TIME:20261001T160000',
  'UID:sm-2@apps.usos.pw.edu.pl',
  'DESCRIPTION:Sala: 129\\nBudynek Wydziału Mechatroniki\\n\\nhttps://usosweb.u',
  ' sos.pw.edu.pl/kontroler.php?_action=katalog2/przedmioty/pokazZajecia&gr_nr',
  ' =102&zaj_cyk_id=222\\n',
  'LOCATION:Świętego Andrzeja Boboli 8\\, 02-525 Warszawa',
  'STATUS:CANCELLED',
  'END:VEVENT',
  'END:VCALENDAR',
  '',
].join('\r\n')

describe('parseUsosCalendar', () => {
  const meetings = parseUsosCalendar(SAMPLE)

  it('czyta wszystkie zajęcia posortowane po czasie', () => {
    expect(meetings.map((m) => m.id)).toEqual(['sm-2@apps.usos.pw.edu.pl', 'sm-1@apps.usos.pw.edu.pl'])
  })

  it('rozbija nagłówek na typ i nazwę przedmiotu', () => {
    const [pro, wyk] = meetings
    expect(wyk.type).toBe('WYK')
    expect(wyk.courseName).toBe('Grafika komputerowa')
    expect(pro.type).toBe('PRO')
  })

  it('czyta salę, budynek, adres i grupę z zawiniętych linii', () => {
    const wyk = meetings[1]
    expect(wyk.room).toBe('170')
    expect(wyk.building).toBe('Budynek Wydziału Elektroniki i Technik Informacyjnych')
    expect(wyk.address).toBe('Nowowiejska 15/19, 00-665 Warszawa')
    expect(wyk.groupNumber).toBe(1)
    expect(wyk.unitId).toBe('111')
    expect(meetings[0].groupNumber).toBe(102)
    expect(meetings[0].unitId).toBe('222')
  })

  it('traktuje czas bez strefy jako lokalny', () => {
    const wyk = meetings[1]
    expect(wyk.start.getHours()).toBe(12)
    expect(wyk.start.getMinutes()).toBe(15)
    expect(wyk.end.getHours()).toBe(14)
  })

  it('rozpoznaje odwołane zajęcia', () => {
    expect(meetings[0].cancelled).toBe(true)
    expect(meetings[1].cancelled).toBe(false)
  })

  it('odrzuca plik, który nie jest kalendarzem', () => {
    expect(() => parseUsosCalendar('<html>Zaloguj się</html>')).toThrow()
  })
})

describe('mergeWithHistory', () => {
  const at = (id: string, day: number, hour: number): Meeting => ({
    id,
    courseName: id,
    type: 'WYK',
    start: new Date(2026, 9, day, hour),
    end: new Date(2026, 9, day, hour + 2),
    room: null,
    building: null,
    address: null,
    groupNumber: null,
    unitId: null,
    usosUrl: null,
    cancelled: false,
  })

  it('zachowuje zajęcia, które już się odbyły, a przyszłość bierze ze świeżych danych', () => {
    const now = new Date(2026, 9, 7, 12)
    const previous = [at('pon', 5, 8), at('sr-rano', 7, 8), at('czw-stare', 8, 10)]
    const fresh = [at('czw-nowe', 8, 12)]
    const merged = mergeWithHistory(previous, fresh, now).map((m) => m.id)
    expect(merged).toEqual(['pon', 'sr-rano', 'czw-nowe'])
  })

  it('nie dubluje zajęć obecnych w obu wersjach', () => {
    const now = new Date(2026, 9, 7, 9)
    const trwajace = at('trwa', 7, 8)
    const merged = mergeWithHistory([trwajace], [trwajace], now)
    expect(merged).toHaveLength(1)
  })
})

describe('drobne formatowanie', () => {
  it('skraca znane budynki PW', () => {
    expect(shortBuilding('Budynek Wydziału Elektroniki i Technik Informacyjnych')).toBe('EiTI')
    expect(shortBuilding('Budynek Wydziału Mechatroniki')).toBe('Mechatronika')
    expect(shortBuilding('Budynek Gmach Główny')).toBe('Gmach Główny')
  })

  it('odmienia liczebniki', () => {
    expect(plural(1, 'przedmiot', 'przedmioty', 'przedmiotów')).toBe('przedmiot')
    expect(plural(3, 'przedmiot', 'przedmioty', 'przedmiotów')).toBe('przedmioty')
    expect(plural(12, 'przedmiot', 'przedmioty', 'przedmiotów')).toBe('przedmiotów')
    expect(plural(22, 'przedmiot', 'przedmioty', 'przedmiotów')).toBe('przedmioty')
  })

  it('formatuje czas trwania i tydzień', () => {
    expect(formatDuration(45)).toBe('45 min')
    expect(formatDuration(60)).toBe('1 h')
    expect(formatDuration(75)).toBe('1 h 15 min')
    const sunday = new Date(2026, 9, 11)
    expect(startOfWeek(sunday)).toEqual(new Date(2026, 9, 5))
    expect(formatWeekRange(new Date(2026, 9, 5))).toBe('5 – 11 października')
  })
})

describe('typy zajęć z USOS', () => {
  it('WF z USOS ("FIZ") ma nazwę i kolor WF, a nie szare "Inne"', async () => {
    const { typeLabel, typeSlug, colorType } = await import('./usos')
    expect(typeLabel('FIZ')).toBe('WF')
    expect(typeSlug('FIZ')).toBe('wf')
    expect(colorType('SED')).toBe('SEM')
    expect(typeLabel('ZKO')).toBe('Zajęcia komputerowe')
    expect(typeSlug('ZKO')).toBe('lab')
    expect(typeSlug('EGZ')).toBe('inne')
    expect(typeLabel('XYZ')).toBe('XYZ')
  })
})
