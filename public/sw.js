// Service worker Planera: powiadomienia (przypomnienia o terminach) i szybki start, także bez internetu.
// Pliki programu (z odciskiem w nazwie) prosto z pamięci telefonu; sama strona z sieci, a przy braku
// albo bardzo wolnej sieci (sale w piwnicach, metro) - z pamięci. Dane konta (Firebase) i plan z USOS
// to inne domeny - tych nie ruszamy.

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

// Pliki programu z odciskiem w nazwie (assets/index-AbC123.js): nowa wersja ma nowe nazwy, więc
// zapisany plik nigdy się nie zmienia - bierzemy go z pamięci od razu, bez pytania sieci.
const IMMUTABLE = /\/assets\/[^/]+-[A-Za-z0-9_-]{8}\.(?:js|css)$/
// Strona (index.html): z sieci, ale przy wolnej sieci po tylu ms kopia z pamięci (nowa zapisze się w tle).
const PAGE_TIMEOUT_MS = 3000

async function save(cache, key, response) {
  // Tylko pełne odpowiedzi z tej strony (206 przy wideo nie da się zapisać).
  if (response.status === 200 && response.type === 'basic') {
    await cache.put(key, response.clone())
    void trim(cache)
  }
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE)
  try {
    const response = await fetch(request)
    await save(cache, request, response)
    return response
  } catch (error) {
    const cached = await cache.match(request)
    if (cached) return cached
    throw error
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE)
  const cached = await cache.match(request)
  if (cached) return cached
  const response = await fetch(request)
  await save(cache, request, response)
  return response
}

// Wolna sieć (sala w piwnicy, metro) nie może wstrzymać startu: po PAGE_TIMEOUT_MS kopia z pamięci.
async function page(request) {
  const cache = await caches.open(CACHE)
  const cached = await cache.match(SHELL)
  const network = fetch(request).then(async (response) => {
    await save(cache, SHELL, response)
    return response
  })
  if (!cached) return network
  return Promise.race([
    network.catch(() => cached),
    new Promise((resolve) => setTimeout(() => resolve(cached), PAGE_TIMEOUT_MS)),
  ])
}

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return // Firebase, USOS - bez zmian
  if (url.pathname.endsWith('/version.json')) return // sprawdzanie nowej wersji zawsze z sieci
  if (request.mode === 'navigate') event.respondWith(page(request))
  else if (IMMUTABLE.test(url.pathname)) event.respondWith(cacheFirst(request))
  else event.respondWith(networkFirst(request)) // plany WAT, kalendarz, ikony - świeże, gdy jest sieć
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
