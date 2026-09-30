import { describe, expect, it } from 'vitest'
import { isPersonId, parsePersonPage } from './usosPeople'

// Fragment strony osoby w USOSweb (ta sama budowa, wymyślona osoba).
const PAGE = `
<table class='uwb-text-with-photo'><tr><td><a href='...'><img src='x.jpg' alt=''></a></td><td>
  <div class='uwb-primary'>
      adiunkt                                                w jednostce                        <a href='https://usosweb.usos.pw.edu.pl/kontroler.php?_action=katalog2/jednostki/pokazJednostke&kod=103000' tabindex='0'  >Wydział Elektroniki i Technik Informacyjnych</a>                    </div>
</td></tr></table>
<table class='uwb-text-with-photo'><tr><td></td><td>
  <div class='uwb-primary'>Kierownik Zakładu - Zakład Przyrząd&oacute;w      w jednostce  <a href='x'>Zakład Przyrząd&oacute;w</a></div>
</td></tr></table>
<div class='uwb-clearfix'>
    <div>Imiona</div>
    <div>Jan</div>
</div>
<div class='uwb-clearfix'>
    <div>Stopnie i tytuły</div>
    <div>
        dr hab. inż. prof. uczelni
    </div>
</div>`

describe('strona osoby w USOSweb', () => {
  it('tytuł i pierwsze stanowisko z jednostką', () => {
    expect(parsePersonPage(PAGE)).toEqual({
      title: 'dr hab. inż. prof. uczelni',
      position: 'adiunkt',
      unit: 'Wydział Elektroniki i Technik Informacyjnych',
    })
  })

  it('strona bez tych danych (np. student) - puste pola zamiast błędu', () => {
    expect(parsePersonPage('<html><body>Brak danych</body></html>')).toEqual({ title: null, position: null, unit: null })
  })

  it('numer osoby tylko z cyfr', () => {
    expect(isPersonId('228979')).toBe(true)
    expect(isPersonId('../../x')).toBe(false)
    expect(isPersonId('')).toBe(false)
  })
})
