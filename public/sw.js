const CACHE = "preceptor-v1"
const OFFLINE_URL = "/offline.html"

const ASSETS = [
  "/",
  OFFLINE_URL,
  "/icon-192.png",
  "/icon-512.png",
]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS))
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  )
})

function cacheResponse(request, response) {
  try {
    const cloned = response.clone()
    caches.open(CACHE).then((cache) => cache.put(request, cloned)).catch(() => {})
  } catch {
    // Response body ya fue consumido, ignorar
  }
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url)

  if (event.request.method !== "GET") return

  if (url.pathname.startsWith("/rest/v1/") || url.pathname.startsWith("/auth/v1/")) {
    return
  }

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(OFFLINE_URL))
    )
    return
  }

  const isStaticAsset = url.pathname.startsWith("/_next/static/") || ASSETS.includes(url.pathname)

  if (isStaticAsset) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            cacheResponse(event.request, networkResponse)
            return networkResponse
          })
          .catch(() => {})

        return cachedResponse || fetchPromise
      })
    )
    return
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        cacheResponse(event.request, response)
        return response
      })
      .catch(() => caches.match(event.request))
  )
})

self.addEventListener("push", (event) => {
  if (!event.data) return
  const data = event.data.json()
  const options = {
    body: data.body,
    icon: data.icon || "/icon-192.png",
    badge: "/icon-192.png",
    vibrate: [100, 50, 100],
    data: {
      url: data.url || "/",
      dateOfArrival: Date.now(),
    },
  }
  event.waitUntil(self.registration.showNotification(data.title, options))
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const url = event.notification.data?.url || "/"
  event.waitUntil(clients.openWindow(url))
})
