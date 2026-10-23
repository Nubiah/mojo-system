/* Mojo System — Service Worker (offline-first, compatible sous-dossier GitHub Pages) */

// Base calculée depuis le scope réel du SW (ex. '/mojo-system/')
const BASE = new URL(self.registration.scope).pathname
const INDEX = `${BASE}index.html`
const CACHE_NAME = 'mojo-system-v2'
const CORE_ASSETS = [
  BASE,
  INDEX,
  `${BASE}manifest.webmanifest`,
  `${BASE}icons/icon.svg`
  // Note : les assets Vite hashés (assets/...) sont mis en cache à la volée (runtime).
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
      .catch((err) => console.warn('[SW] install cache failed', err))
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  )
})

// Stratégie :
// - navigation (HTML) : network-first avec fallback cache -> /index.html (SPA offline)
// - assets GET same-origin : stale-while-revalidate
// - cross-origin : network only (pas de cache)
self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // Navigations : fallback offline vers index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE_NAME).then((c) => c.put(INDEX, copy))
          return res
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME)
          return (await cache.match(INDEX)) || Response.error()
        })
    )
    return
  }

  // Seulement le same-origin est caché
  if (url.origin !== self.location.origin) return

  event.respondWith(
    caches.match(request, { ignoreSearch: false }).then((cached) => {
      const network = fetch(request)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone()
            caches.open(CACHE_NAME).then((c) => c.put(request, copy))
          }
          return res
        })
        .catch(() => cached)
      return cached || network
    })
  )
})
