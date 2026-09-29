// Service worker Planera - tylko powiadomienia (przypomnienia o terminach).
// Celowo bez obsługi "fetch": strona zawsze ładuje się z sieci, jak dotąd.

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { title: 'Planer', body: event.data ? event.data.text() : '' }
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Planer', {
      body: data.body || '',
      tag: data.tag, // to samo przypomnienie drugi raz nie dubluje się na ekranie
      icon: 'icons/icon-192.png',
      badge: 'icons/icon-192.png',
      data: { url: data.url || './' },
    }),
  )
})

// Stuknięcie w powiadomienie: otwarty Planer wychodzi na wierzch, zamknięty się otwiera.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL(event.notification.data?.url || './', self.registration.scope).href
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows.find((w) => w.url.startsWith(self.registration.scope))
      return open ? open.focus() : self.clients.openWindow(url)
    }),
  )
})
