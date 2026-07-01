const CACHE_NAME = 'myexpense-v3';
const CACHE_VERSION = 'v1.2.0';

// Diselaraskan dengan fail ikon di root folder seperti dalam index.html
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Install: Simpan semua aset statik ke dalam cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => {
      self.skipWaiting();
    })
  );
});

// Activate: Buang cache lama jika versi berubah
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

// Fetch: Menguruskan request rangkaian & cache
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Benarkan request pihak ketiga (seperti Supabase), tetapi tangkap Chart.js CDN untuk kegunaan offline
  if (url.origin !== self.location.origin) {
    if (url.href.includes('cdn.jsdelivr.net')) {
      event.respondWith(cacheFirstWithNetworkUpdate(request));
    }
    return;
  }

  // Untuk navigasi halaman (HTML), guna Network-First supaya data sentiasa fresh
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstWithFallback(request));
    return;
  }

  // Untuk aset lain (CSS, JS, Ikon, Manifest), guna Cache-First
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
    // Halaman fallback jika pengguna offline total dan tiada dalam cache
    return new Response(
      '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline</title><style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#eef2ff;color:#0f172a;text-align:center;padding:20px}div{max-width:400px}h1{color:#4f46e5;font-size:2rem;margin-bottom:8px}p{color:#64748b}</style></head><body><div><h1>📴 Offline</h1><p>Sambungan internet tidak tersedia. Data anda disimpan setempat.</p></div></body></html>',
      { headers: { 'Content-Type': 'text/html; charset=UTF-8' } }
    );
  }
}

async function cacheFirstWithNetworkUpdate(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    // Jalankan fetch di latar belakang untuk mengemaskini cache (Stale-While-Revalidate)
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

// Mendengar permintaan semakan versi daripada index.html
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'GET_VERSION') {
    if (event.source) {
      event.source.postMessage({ type: 'VERSION', version: CACHE_VERSION });
    }
  }
});