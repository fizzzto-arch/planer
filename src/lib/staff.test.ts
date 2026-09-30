import { describe, expect, it } from 'vitest'
import { staffPeople, staffUnits } from './staff'

describe('prowadzący przedmiotu', () => {
  it('każda osoba raz, z rolami; najpierw ci, którzy uczą Twoje grupy', () => {
    const list = staffPeople({
      coordinators: [
        { id: '97003', name: 'Alicja Siewnicka' },
        { id: '8596', name: 'Sławomir Szostak' },
      ],
      groups: [
        { type: 'WYK', groupNumber: 1, lecturers: [{ id: '8596', name: 'Sławomir Szostak' }] },
        { type: 'CWI', groupNumber: 101, lecturers: [{ id: '228979', name: 'Damian Suski' }, { id: '8596', name: 'Sławomir Szostak' }] },
      ],
    })
    expect(list.map((p) => [p.person.name, p.roles.join(' · ')])).toEqual([
      ['Sławomir Szostak', 'Koordynator przedmiotu · Wykład gr. 1 · Ćwiczenia gr. 101'],
      ['Damian Suski', 'Ćwiczenia gr. 101'],
      ['Alicja Siewnicka', 'Koordynator przedmiotu'],
    ])
  })

  it('grupy tylko z zajęć USOS, bez powtórzeń', () => {
    const units = staffUnits([
      { unitId: 'U1', groupNumber: 101, type: 'CWI' },
      { unitId: 'U1', groupNumber: 101, type: 'CWI' },
      { unitId: null, groupNumber: null, type: 'INNE' }, // własne zajęcia
      { unitId: 'U2', groupNumber: 1, type: 'WYK' },
    ])
    expect(units).toHaveLength(2)
  })
})
