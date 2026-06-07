const CACHE_NAME = "axiomflow-cache-v2";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./css/styles.css",
  "./js/theme.js",
  "./js/auth.js",
  "./js/ai.js",
  "./js/dashboard.js",
  "./js/app.js",
  "./assets/logo.svg",
  "./assets/og-image.svg",
  "./manifest.webmanifest",
  "./pages/ai-business-finder.html",
  "./pages/validation-center.html",
  "./pages/ai-business-builder.html",
  "./pages/automation-marketplace.html",
  "./pages/launch-blueprint-hub.html",
  "./pages/pricing.html",
  "./pages/dashboard.html",
  "./pages/login.html",
  "./pages/register.html",
  "./pages/profile.html",
  "./pages/settings.html",
  "./pages/contact.html",
  "./pages/blog.html",
  "./pages/documentation.html",
  "./pages/admin-panel.html",
  "./pages/about.html",
  "./pages/case-studies.html",
  "./pages/integrations.html",
  "./pages/security.html",
  "./pages/api.html",
  "./pages/status.html",
  "./pages/privacy.html",
  "./pages/terms.html",
  "./pages/forgot-password.html",
  "./pages/reset-password.html"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached || caches.match("./index.html"));
      return cached || network;
    })
  );
});
