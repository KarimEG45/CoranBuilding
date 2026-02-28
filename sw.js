const CACHE_NAME = 'coran-building-v1'
const STATIC_ASSETS = [
  '/CoranBuilding/',
  '/CoranBuilding/index.html',
  '/CoranBuilding/icons/icon.svg',
  '/CoranBuilding/manifest.json',
]

// Install: cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {})
    })
  )
  self.skipWaiting()
})

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  )
  self.clients.claim()
})

// Fetch: cache-first for static assets, network-first for Quran API
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // AlQuran.cloud API → network first, fallback cache
  if (url.hostname === 'api.alquran.cloud') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
          return response
        })
        .catch(() => caches.match(event.request))
    )
    return
  }

  // HuggingFace models → network only (too large to cache manually)
  if (url.hostname.includes('huggingface.co')) {
    event.respondWith(fetch(event.request))
    return
  }

  // Everything else → cache first, fallback network
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response
        }
        const clone = response.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        return response
      })
    })
  )
})
