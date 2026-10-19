// "Załóż konto" z "Pierwszych kroków": formularz logowania otwiera się od razu na zakładce nowego konta.
let registerNext = false

export function openRegisterNext(): void {
  registerNext = true
}

// Jednorazowo - kolejne otwarcie formularza znowu zaczyna od logowania.
export function takeRegisterNext(): boolean {
  const next = registerNext
  registerNext = false
  return next
}
