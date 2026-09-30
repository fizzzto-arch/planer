import { describe, expect, it } from 'vitest'
import { coordinatorMail, lecturerMail, subject, type ChangeRequest } from './groupChange'

const request: ChangeRequest = {
  course: 'Podstawy automatyki',
  classType: 'Ćwiczenia',
  from: { group: 101, when: 'wt. 15:15' },
  to: { group: 301, when: 'wt. 14:15' },
}

describe('prośba o zmianę grupy', () => {
  it('temat i mail do prowadzącego z danymi studenta', () => {
    expect(subject(request)).toBe('Prośba o zmianę grupy – Podstawy automatyki, ćwiczenia 101 → 301')
    const mail = lecturerMail(request, { name: 'Jan Kowalski', album: '123456', intro: 'studentem 3. semestru IB' })
    expect(mail.startsWith('Dzień dobry,\njestem studentem 3. semestru IB, Jan Kowalski, nr albumu 123456.')).toBe(true)
    expect(mail).toContain('z grupy 101 (wt. 15:15) do grupy 301 (wt. 14:15) z przedmiotu Podstawy automatyki (ćwiczenia)')
    expect(mail.endsWith('Z poważaniem,\nJan Kowalski')).toBe(true)
  })

  it('bez danych studenta - widoczne miejsca do uzupełnienia; do koordynatora z powołaniem na zgodę', () => {
    const mail = coordinatorMail(request, { name: '', album: ' ', intro: '' })
    expect(mail).toContain('[imię i nazwisko], nr albumu [nr albumu]')
    expect(mail).toContain('przeniesienie mnie w USOS z grupy 101')
    expect(mail).toContain('Prowadzący zajęcia wyraził zgodę')
  })
})
