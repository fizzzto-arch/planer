// Przejście do elementu strony: rozwija go (i wszystko, w czym leży), przewija do niego i na chwilę podświetla.
export function revealElement(id: string): boolean {
  const el = document.getElementById(id)
  if (!el) return false
  for (let node: HTMLElement | null = el; node; node = node.parentElement) {
    if (node instanceof HTMLDetailsElement) node.open = true
  }
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  el.classList.remove('is-flash')
  void el.offsetWidth // ponowne odpalenie animacji przy kolejnym przejściu
  el.classList.add('is-flash')
  return true
}

// To samo dla elementu, którego jeszcze nie ma (widok dopiero się ładuje) - czekamy do ~2 s.
export function revealWhenReady(id: string, framesLeft = 120): void {
  if (revealElement(id) || framesLeft <= 0) return
  requestAnimationFrame(() => revealWhenReady(id, framesLeft - 1))
}
