import { describe, expect, it } from 'vitest'
import { decideSync } from './sync'

const A = 'https://usos/a'
const B = 'https://usos/b'

describe('decideSync', () => {
  it('czeka, dopóki nie wiadomo, co jest na koncie', () => {
    expect(decideSync({ cloudUrl: undefined, localUrl: A }, { cloudUrl: undefined, localUrl: A })).toEqual({ kind: 'none' })
  })

  it('nowe urządzenie bez planu pobiera plan z konta', () => {
    expect(decideSync({ cloudUrl: undefined, localUrl: null }, { cloudUrl: A, localUrl: null })).toEqual({ kind: 'adopt', url: A })
  })

  it('puste konto dostaje plan z tej przeglądarki', () => {
    expect(decideSync({ cloudUrl: undefined, localUrl: A }, { cloudUrl: null, localUrl: A })).toEqual({ kind: 'upload', url: A })
  })

  it('przy pierwszym logowaniu i konflikcie wygrywa konto', () => {
    expect(decideSync({ cloudUrl: undefined, localUrl: B }, { cloudUrl: A, localUrl: B })).toEqual({ kind: 'adopt', url: A })
  })

  it('zmiana linku w tej przeglądarce trafia na konto', () => {
    expect(decideSync({ cloudUrl: A, localUrl: A }, { cloudUrl: A, localUrl: B })).toEqual({ kind: 'upload', url: B })
  })

  it('zmiana na innym urządzeniu trafia do tej przeglądarki', () => {
    expect(decideSync({ cloudUrl: A, localUrl: A }, { cloudUrl: B, localUrl: A })).toEqual({ kind: 'adopt', url: B })
  })

  it('nic nie robi, gdy obie strony są zgodne', () => {
    expect(decideSync({ cloudUrl: A, localUrl: B }, { cloudUrl: B, localUrl: B })).toEqual({ kind: 'none' })
  })

  it('plan z pliku (bez linku) nie nadpisuje konta', () => {
    expect(decideSync({ cloudUrl: null, localUrl: null }, { cloudUrl: null, localUrl: null })).toEqual({ kind: 'none' })
  })
})
