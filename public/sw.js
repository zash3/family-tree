/**
 * Minimal offline cache for the home-screen app.
 *
 * The build emits content-hashed assets, so anything under /assets/ can be
 * cached forever (cache-first). The HTML shell is network-first with a cached
 * fallback, which keeps a fresh deploy from being pinned to an old index.html.
 */
// Both constants are rewritten by the precache-sw plugin in vite.config.ts:
// PRECACHE gets the hashed asset list from the build, and the version string
// changes whenever that list does, so a new deploy drops the previous cache.
const PRECACHE = /* __PRECACHE__ */ ['./']
const CACHE = 'family-tree-' + /* __VERSION__ */ 'dev'
const SHELL = './'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      // A miss here would fail the whole install, so tolerate individual
      // failures rather than leaving the app with no service worker at all.
      .then((cache) =>
        Promise.all(PRECACHE.map((url) => cache.add(url).catch(() => undefined))),
      )
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(CACHE).then((cache) => cache.put(SHELL, copy))
          return response
        })
        // ignoreVary: the cached copy was stored under whatever Accept-Encoding
        // the install-time fetch used, which need not match this request's.
        .catch(() =>
          caches.match(SHELL, { ignoreVary: true }).then((hit) => hit ?? Response.error()),
        ),
    )
    return
  }

  event.respondWith(
    caches.match(request, { ignoreVary: true }).then(
      (hit) =>
        hit ??
        fetch(request).then((response) => {
          if (response.ok && response.type === 'basic') {
            const copy = response.clone()
            caches.open(CACHE).then((cache) => cache.put(request, copy))
          }
          return response
        }),
    ),
  )
})
