// Service worker Planera: powiadomienia (przypomnienia o terminach) i start bez internetu.
// Strona ładuje się zawsze z sieci, jak dotąd - kopia w pamięci telefonu służy tylko wtedy, gdy sieci
// nie ma (sale w piwnicach, metro). Dane konta (Firebase) i plan z USOS to inne domeny - tych nie ruszamy.

const CACHE = 'planer-offline-v1'
const MAX_ENTRIES = 80 // stare pliki po aktualizacjach wypadają z pamięci
const SHELL = new URL('./', self.registration.scope).href

// Pliki strony wypisane w index.html (skrypty, style) - zapamiętane od razu przy instalacji,
// żeby start bez sieci działał już po pierwszej wizycie.
async function precacheShell() {
  const cache = await caches.open(CACHE)
  const response = await fetch(SHELL, { cache: 'no-store' })
  if (!response.ok) return
  const html = await response.clone().text()
  await cache.put(SHELL, response)
  const assets = [...html.matchAll(/(?:src|href)="(\.?\/?assets\/[^"]+)"/g)].map((m) => new URL(m[1], SHELL).href)
  await Promise.all(assets.map((url) => cache.add(url).catch(() => undefined)))
}

self.addEventListener('install', (event) => {
  event.waitUntil(precacheShell().catch(() => undefined))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((n) => n.startsWith('planer-offline-') && n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  )
})

async function trim(cache) {
  const keys = await cache.keys()
  for (const request of keys.slice(0, Math.max(0, keys.length - MAX_ENTRIES))) {
    if (request.url !== SHELL) await cache.delete(request)
  }
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE)
  const key = request.mode === 'navigate' ? SHELL : request
  try {
    const response = await fetch(request)
    // Tylko pełne odpowiedzi z tej strony (206 przy wideo nie da się zapisać).
    if (response.status === 200 && response.type === 'basic') {
      await cache.put(key, response.clone())
      void trim(cache)
    }
    return response
  } catch (error) {
    const cached = await cache.match(key)
    if (cached) return cached
    throw error
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return // Firebase, USOS - bez zmian
  if (url.pathname.endsWith('/version.json')) return // sprawdzanie nowej wersji zawsze z sieci
  event.respondWith(networkFirst(request))
})

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
