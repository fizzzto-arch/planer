import { describe, expect, it } from 'vitest'
import { parseUsosCalendar } from './usos'
import { parseWatGroup, parseWatGroups, parseWatPlan, watGroupFromUrl, watPlanUrl, watToIcs } from './wat'

// Fragment strony planzajec.wcy.wat.edu.pl (ta sama budowa, wymyślone zajęcia).
const lesson = (date: string, block: string, name: string, info: string) =>
  `<div class="lesson"><span class="date">${date}</span><span class="block_id">${block}</span><span class="name">${name}</span><span class="info">${info}</span><span class="colorp">#FFD700</span><span class="sSkrotProwadzacego">X</span></div>`

const HTML = `
<select><option value="rozklad?grupa_id=WCY26IY4S1">WCY26IY4S1</option><option value="rozklad?grupa_id=WCY25IB1S4">x</option></select>
<h1>Rozkład zajęć grupy: WCY26IY4S1</h1><span class="head_info">Data aktualizacji:2026-09-30 00:39:49</span>
<div class="block_nr block1"><span class="nr">1</span><div class="h"><span class="hr1">08:00</span><span class="hr2">09:35</span></div></div>
<div class="block_nr block3"><span class="nr">3</span><div class="h"><span class="hr1">11:40</span><span class="hr2">13:15</span></div></div>
<div class="block_nr block5"><span class="nr">5</span><div class="h"><span class="hr1">16:00</span><span class="hr2">17:35</span></div></div>
<div class="day 2026_10_01">${lesson('2026_10_01', 'block3', 'AM<br>(w)<br>316 S<br>[1]', 'Analiza matematyczna - (Wykład) - ')}</div>
<div class="lessons hidden">
${lesson('2026_10_01', 'block3', 'AM<br>(w)<br>316 S<br>[1]', 'Analiza matematyczna - (Wykład) - ')}
${lesson('2026_10_26', 'block1', 'JO<br>(ć)<br>210 S<br>Kw[3]', 'Język obcy (II) międzywydziałowy - (Ćwiczenia) - Kowalska Anna')}
${lesson('2026_10_02', 'block5', 'Sieci<br>(L)<br>224 S<br>Nw[1]', 'Sieci komputerowe - (Laboratorium) - Nowak Jan')}
${lesson('2026_10_03', 'block1', 'AM<br>(Inne)<br>314 S<br>', 'Analiza matematyczna - (Zaliczenie) - ')}
${lesson('2026_10_04', 'block9', 'XX<br>(w)<br>1 S<br>', 'Blok spoza siatki - (Wykład) - ')}
</div>`

describe('plan WAT', () => {
  it('kod grupy z wpisanego tekstu', () => {
    expect(parseWatGroup('WCY26IY4S1')).toBe('WCY26IY4S1')
    expect(parseWatGroup('wcy26iy4s1 ')).toBe('WCY26IY4S1')
    expect(parseWatGroup('WCY26IY4S1 - I6Y4S1')).toBe('WCY26IY4S1')
    expect(parseWatGroup('https://planzajec.wcy.wat.edu.pl/pl/rozklad?grupa_id=WCY26IY4S1')).toBe('WCY26IY4S1')
    expect(parseWatGroup('https://apps.usos.pw.edu.pl/services/tt/upcoming_ical?lang=pl&user_id=1&key=abc')).toBeNull()
    expect(parseWatGroups(HTML)).toEqual(['WCY25IB1S4', 'WCY26IY4S1'])
  })

  it('zajęcia z ukrytej listy: godziny bloków, sala, typ, bez prowadzącego i bez duplikatów', () => {
    const plan = parseWatPlan('WCY26IY4S1', HTML)
    expect(plan.updatedAt).toBe('2026-09-30 00:39:49')
    expect(plan.lessons).toHaveLength(4) // blok 9 nie istnieje w siatce - pomijamy
    expect(plan.lessons[0]).toEqual({
      date: '2026-10-01',
      start: '11:40',
      end: '13:15',
      short: 'AM',
      courseName: 'Analiza matematyczna', // opis bez prowadzącego kończy się " -"
      kind: 'Wykład',
      room: '316',
      building: 'S',
      teacher: null,
    })
    expect(plan.lessons.find((l) => l.short === 'JO')).toMatchObject({
      courseName: 'Język obcy (II) międzywydziałowy', // nawias w nazwie to nie rodzaj zajęć
      kind: 'Ćwiczenia',
      teacher: 'Kowalska Anna',
    })
  })

  it('kalendarz w dialekcie USOS - Planer czyta go jak link z USOS', () => {
    const meetings = parseUsosCalendar(watToIcs(parseWatPlan('WCY26IY4S1', HTML)))
    expect(meetings.map((m) => [m.type, m.courseName])).toEqual([
      ['WYK', 'Analiza matematyczna'],
      ['LAB', 'Sieci komputerowe'],
      ['INNE', 'Analiza matematyczna (Zaliczenie)'],
      ['CWI', 'Język obcy (II) międzywydziałowy'],
    ])
    const lab = meetings[1]
    expect(lab).toMatchObject({ room: '224', building: 'Budynek S', groupNumber: null, unitId: null, cancelled: false })
    // Czas polski - także po zmianie czasu (26.10).
    expect(lab.start).toEqual(new Date(2026, 9, 2, 16, 0))
    expect(meetings[3].start).toEqual(new Date(2026, 9, 26, 8, 0))
    // Stałe identyfikatory - te same zajęcia jutro to te same zajęcia (powiadomienia o zmianach).
    expect(meetings[0].id).toBe('wat-WCY26IY4S1-2026-10-01-1140-AM')
  })

  it('adres pliku z planem obok strony', () => {
    const url = watPlanUrl('WCY26IY4S1', 'https://fizzzto-arch.github.io/planer/')
    expect(url).toBe('https://fizzzto-arch.github.io/planer/wat/WCY26IY4S1.ics')
    expect(watGroupFromUrl(url)).toBe('WCY26IY4S1')
    expect(watGroupFromUrl('https://apps.usos.pw.edu.pl/services/tt/upcoming_ical?key=x')).toBeNull()
  })
})
