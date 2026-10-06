// Ashirvad service worker: app ko "install" hone layak banata hai.
// Sirf app ki files (HTML/JS/CSS/icons) cache hoti hain taaki jaldi khule.
// API/data KABHI cache nahi hota, hamesha server se taaza aata hai.
const CACHE = "ashirvad-shell-v1";

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(["/", "/manifest.webmanifest", "/icons/icon-192.png"])).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  // Sirf apni site ki GET files; API (dusra domain ya /api) ko haath nahi lagana
  if (req.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api")) return;

  // Page khulna: pehle network (naya version), net na ho to cached app shell
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put("/", copy));
          return res;
        })
        .catch(() => caches.match("/"))
    );
    return;
  }

  // JS/CSS/icons: cache se turant, peeche se update
  if (/\.(js|css|png|svg|woff2?|webmanifest)$/.test(url.pathname)) {
    e.respondWith(
      caches.match(req).then((hit) => {
        const net = fetch(req)
          .then((res) => {
            if (res.ok) {
              const copy = res.clone(); // clone turant, warna body use ho chuki hoti hai
              caches.open(CACHE).then((c) => c.put(req, copy));
            }
            return res;
          })
          .catch(() => hit);
        return hit || net;
      })
    );
  }
});
