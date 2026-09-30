import { describe, expect, it } from 'vitest'
import { meetingCounts, usosHtmlToText } from './courseInfo'

describe('o przedmiocie', () => {
  it('HTML z USOS na tekst: listy jako punkty, bez znaczników i skryptów', () => {
    const html =
      '<br><b>Treść wykładu</b><br>\n<ol><li>Półprzewodniki (2h)</li>\n<li>Złącze p-n &amp; dioda</li></ol><p>Uwaga&nbsp;końcowa</p><script>alert(1)</script>'
    expect(usosHtmlToText(html)).toBe('Treść wykładu\n• Półprzewodniki (2h)\n• Złącze p-n & dioda\n\nUwaga końcowa')
    expect(usosHtmlToText(null)).toBe('')
  })

  it('spotkania w semestrze: ile za Tobą, bez odwołanych, wykład pierwszy', () => {
    const now = new Date(2026, 9, 14)
    const m = (type: string, day: number, cancelled = false) => ({ type, end: new Date(2026, 9, day, 12), cancelled })
    expect(meetingCounts([m('CWI', 6), m('WYK', 5), m('WYK', 12), m('WYK', 19), m('CWI', 13, true), m('CWI', 20)], now)).toEqual([
      { type: 'WYK', done: 2, total: 3 },
      { type: 'CWI', done: 1, total: 2 },
    ])
  })
})
