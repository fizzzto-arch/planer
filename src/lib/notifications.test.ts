import { describe, expect, it } from 'vitest'
import { parseNotification, sortNotifications, unreadCount } from './notifications'

describe('historia powiadomień', () => {
  it('odczyt z bazy: nieznane rodzaje i śmieci odrzucone', () => {
    expect(parseNotification('x', { kind: 'spam', title: 'a' })).toBeNull()
    expect(parseNotification('x', { kind: 'plan' })).toBeNull()
    const n = parseNotification('x', { kind: 'plan', title: 'Zmiany', body: 'a', details: ['1', 2, '3'], createdAt: 5 })!
    expect(n).toMatchObject({ kind: 'plan', details: ['1', '3'], createdAt: 5 })
    expect(parseNotification('y', { kind: 'reply', title: 'x', createdAt: { toMillis: () => 7 } })!.createdAt).toBe(7)
  })

  it('nowsze wyżej, nieprzeczytane to nowsze niż ostatnie otwarcie', () => {
    const at = (id: string, createdAt: number | null) => parseNotification(id, { kind: 'day', title: id, createdAt })!
    const list = sortNotifications([at('a', 10), at('b', 30), at('c', null), at('d', 20)])
    expect(list.map((n) => n.id)).toEqual(['c', 'b', 'd', 'a'])
    expect(unreadCount(list, 15)).toBe(3) // b, d i "w drodze"
    expect(unreadCount(list, 100)).toBe(1)
  })
})
