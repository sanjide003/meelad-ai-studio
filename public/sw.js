// MeeladPulse Service Worker - Offline Resiliency Core
const CACHE_NAME = "meeladpulse-v1";
const OFFLINE_ASSETS = [
  "/login.html",
  "/assets/css/main.css",
  "/manifest.json",
  "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
];

// Install Event
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Pre-caching offline portal shells...");
      return cache.addAll(OFFLINE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[Service Worker] Retracting legacy cache:", key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Stale-While-Revalidate Strategy
self.addEventListener("fetch", (event) => {
  // Do not intercept or cache Firestore, Auth, or Private Portal endpoints
  if (
    event.request.url.includes("firestore.googleapis.com") || 
    event.request.url.includes("identitytoolkit") ||
    event.request.url.includes("/admin/") ||
    event.request.url.includes("/team/") ||
    event.request.url.includes("/judge/")
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch fresh copy in the background
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse);
              });
            }
          })
          .catch(() => { /* Ignore offline fetch failures */ });
        
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        // Cache dynamic static assets
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          (event.request.url.includes("/assets/") || event.request.url.endsWith(".html"))
        ) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      });
    })
  );
});
