// LOKAL service worker — caches the UI shell and static assets only.
// Streaming media (HLS manifests/segments, storage API, playback/watch-progress
// endpoints) is deliberately never cached (Section 27).
const CACHE_NAME = "lokal-shell-v1";
const OFFLINE_URL = "/offline.html";

const SHELL_ASSETS = [OFFLINE_URL, "/manifest.webmanifest"];

const NEVER_CACHE_PATTERNS = [/\/api\//, /\.m3u8($|\?)/, /\.ts($|\?)/, /\.mp4($|\?)/, /\/watch\//];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

function shouldSkipCache(url) {
  return NEVER_CACHE_PATTERNS.some((pattern) => pattern.test(url));
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  if (shouldSkipCache(request.url)) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL)),
    );
    return;
  }

  // Static assets (Next build output, images, fonts): cache-first.
  if (request.destination === "script" || request.destination === "style" || request.destination === "font" || request.destination === "image") {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            return response;
          }),
      ),
    );
  }
});

// Push notification readiness (Section 27) — full subscription management
// and server-side sends arrive in Phase 2; this handler just renders
// whatever payload a future push service delivers.
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "LOKAL", body: event.data.text() };
  }
  event.waitUntil(
    self.registration.showNotification(payload.title ?? "LOKAL", {
      body: payload.body,
      icon: "/icons/icon-192.png",
      data: { url: payload.url ?? "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow(event.notification.data?.url ?? "/"));
});
