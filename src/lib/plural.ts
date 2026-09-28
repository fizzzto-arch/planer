// Polska odmiana liczebników: 1 przedmiot, 2 przedmioty, 5 przedmiotów, 22 przedmioty.
export function plural(n: number, one: string, few: string, many: string): string {
  if (n === 1) return one
  const lastDigit = n % 10
  const lastTwo = n % 100
  if (lastDigit >= 2 && lastDigit <= 4 && (lastTwo < 12 || lastTwo > 14)) return few
  return many
}
