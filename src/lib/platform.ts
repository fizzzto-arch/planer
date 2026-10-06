// iPhone / iPad (także iPad udający Maca): tam wyszukiwanie otwiera pociągnięcie w dół, jak w Ustawieniach iOS.
// Na Androidzie i komputerze - lupa w górnym pasku (na Androidzie pociągnięcie w dół odświeża stronę).
export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}
