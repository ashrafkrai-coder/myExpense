const CACHE_NAME = 'myexpense-v3';
const CACHE_VERSION = 'v1.2.0';

const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-192.svg',
  './icons/icon-512.svg'
];

// Install: cache all static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => {
      self.skipWaiting();
    })
  );
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => {
      self.clients.claim();
    })
  );
});

// Fetch: network-first for HTML, cache-first for everything else
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstWithFallback(request));
    return;
  }

  event.respondWith(cacheFirstWithNetworkUpdate(request));
});

async function networkFirstWithFallback(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (err) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    return new Response(
      '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline</title><style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#eef2ff;color:#0f172a;text-align:center;padding:20px}div{max-width:400px}h1{color:#4f46e5;font-size:2rem;margin-bottom:8px}p{color:#64748b}</style></head><body><div><h1>📴 Offline</h1><p>Sambungan internet tidak tersedia. Data anda disimpan setempat.</p></div></body></html>',
      { headers: { 'Content-Type': 'text/html; charset=UTF-8' } }
    );
  }
}

async function cacheFirstWithNetworkUpdate(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    fetch(request).then((networkResponse) => {
      if (networkResponse && networkResponse.ok) {
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, networkResponse);
        });
      }
    }).catch(() => {});
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (err) {
    return new Response('', { status: 404, statusText: 'Not Found' });
  }
}

// Listen for version request from the page
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'GET_VERSION') {
    if (event.source) {
      event.source.postMessage({ type: 'VERSION', version: CACHE_VERSION });
    }
  }
});
