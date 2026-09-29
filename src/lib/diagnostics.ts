// Informacje o urządzeniu do zgłoszenia problemu - bez danych osobowych, tylko wersja i sprzęt.
export function diagnostics(): string {
  const standalone =
    (navigator as Navigator & { standalone?: boolean }).standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches
  const notifications = 'Notification' in window ? Notification.permission : 'brak'
  return [
    `Planer ${__APP_VERSION__}`,
    `tryb: ${standalone ? 'aplikacja z ekranu początkowego' : 'przeglądarka'}`,
    `ekran: ${window.innerWidth}×${window.innerHeight}`,
    `powiadomienia: ${notifications}`,
    `przeglądarka: ${navigator.userAgent}`,
  ].join('\n')
}
