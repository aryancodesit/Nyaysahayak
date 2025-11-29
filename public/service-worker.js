const CACHE_NAME = 'nyayasahayak-v2';
const urlsToCache = [
    '/',
    '/index.html',
    '/vite.svg'
];

// Install SW
self.addEventListener('install', (event) => {
    // Force this SW to become the active one
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

// Activate the SW
self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME];
    // Take control of all clients immediately
    event.waitUntil(
        Promise.all([
            clients.claim(),
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheWhitelist.indexOf(cacheName) === -1) {
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
        ])
    );
});

// Listen for requests
self.addEventListener('fetch', (event) => {
    // Network First for HTML (Document)
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .catch(() => {
                    return caches.match(event.request);
                })
        );
        return;
    }

    // Cache First for Assets (JS, CSS, Images)
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                if (response) {
                    return response;
                }
                return fetch(event.request);
            })
    );
});
