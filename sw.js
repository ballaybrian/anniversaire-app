self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Minimal: no caching logic (safe). You can add caching later if needed.
self.addEventListener("fetch", (event) => {});
