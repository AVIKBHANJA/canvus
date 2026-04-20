// Minimal service worker — registered so the PWA install criteria are met
// and the share_target works from installed Canvus on Android.
// Deliberately does NOT cache API/auth/storage responses: cross-device sync
// and auth must always hit the network.
//
// Cache is versioned with the build id passed by the registration URL
// (`/sw.js?v=<build-id>`). Whenever the build id changes, the SW activates
// a fresh cache and drops old ones.

const swUrl = new URL(self.location.href);
const BUILD_ID = swUrl.searchParams.get("v") || "dev";
const CACHE = `canvus-shell-${BUILD_ID}`;
const SHELL = ["/login", "/signup", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL).catch(() => {})),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
        ),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Never intercept API, auth, or cross-origin storage reads.
  if (url.pathname.startsWith("/api")) return;
  if (url.pathname.startsWith("/auth")) return;
  if (url.pathname.startsWith("/share")) return;
  if (url.origin !== self.location.origin) return;

  // Network-first for navigations, cache fallback for login/signup shell.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((r) => {
          if (url.pathname === "/login" || url.pathname === "/signup") {
            const copy = r.clone();
            caches.open(CACHE).then((c) => c.put(req, copy).catch(() => {}));
          }
          return r;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match("/login"))),
    );
  }
});
