const CACHE_VERSION = 'campusiq-v2';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const OFFLINE_DB_NAME = 'campusiq-offline';
const OFFLINE_DB_VERSION = 1;
const SYNC_QUEUE_STORE = 'sync-queue';

// Assets to pre-cache on install
const STATIC_ASSETS = [
    '/offline.html',
    '/manifest.json',
    '/favicon.ico',
];

// ──── IndexedDB Helpers for Offline Data ────

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(OFFLINE_DB_NAME, OFFLINE_DB_VERSION);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(SYNC_QUEUE_STORE)) {
                db.createObjectStore(SYNC_QUEUE_STORE, { keyPath: 'id', autoIncrement: true });
            }
            if (!db.objectStoreNames.contains('offline-attendance')) {
                const store = db.createObjectStore('offline-attendance', { keyPath: 'id', autoIncrement: true });
                store.createIndex('synced', 'synced', { unique: false });
            }
            if (!db.objectStoreNames.contains('offline-diary')) {
                db.createObjectStore('offline-diary', { keyPath: 'id', autoIncrement: true });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function addToSyncQueue(data) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(SYNC_QUEUE_STORE, 'readwrite');
        tx.objectStore(SYNC_QUEUE_STORE).add({
            ...data,
            timestamp: Date.now(),
            synced: false,
        });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

async function getSyncQueue() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(SYNC_QUEUE_STORE, 'readonly');
        const request = tx.objectStore(SYNC_QUEUE_STORE).getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function clearSyncedItems(ids) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(SYNC_QUEUE_STORE, 'readwrite');
        const store = tx.objectStore(SYNC_QUEUE_STORE);
        ids.forEach((id) => store.delete(id));
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

// ──── Install: pre-cache static assets ────
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE).then((cache) => {
            console.log('[SW] Pre-caching static assets');
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// ──── Activate: clean up old caches ────
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                    .filter((key) => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
                    .map((key) => {
                        console.log('[SW] Removing old cache:', key);
                        return caches.delete(key);
                    })
            )
        )
    );
    self.clients.claim();
});

// ──── Fetch: routing strategies ────
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Ignore non-http requests (extensions, data uris, etc.)
    if (!url.protocol.startsWith('http')) return;

    // Intercept offline POST requests for attendance/diary — queue them
    if (request.method === 'POST' && !navigator.onLine) {
        if (url.pathname.startsWith('/api/attendance') || url.pathname.startsWith('/api/diary')) {
            event.respondWith(handleOfflinePost(request, url.pathname));
            return;
        }
    }

    // Skip non-GET requests
    if (request.method !== 'GET') return;

    // Network-first for API calls
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(networkFirst(request));
        return;
    }

    // Network-first for HTML navigation (pages)
    if (request.headers.get('accept')?.includes('text/html')) {
        event.respondWith(networkFirstWithOfflineFallback(request));
        return;
    }

    // Cache-first for static assets (JS, CSS, images, fonts)
    if (isStaticAsset(url.pathname)) {
        event.respondWith(cacheFirst(request));
        return;
    }

    // Default: network-first
    event.respondWith(networkFirst(request));
});

// ──── Offline POST Handler ────

async function handleOfflinePost(request, pathname) {
    try {
        const body = await request.clone().json();
        await addToSyncQueue({
            url: pathname,
            method: 'POST',
            body: body,
            headers: { 'Content-Type': 'application/json' },
        });

        // Notify client that data was queued for sync
        const clients = await self.clients.matchAll({ type: 'window' });
        clients.forEach((client) => {
            client.postMessage({
                type: 'OFFLINE_QUEUED',
                message: `Data saved offline. Will sync when back online.`,
                pathname,
            });
        });

        return new Response(
            JSON.stringify({
                success: true,
                offline: true,
                message: 'Saved offline. Will sync when connection is restored.',
            }),
            { status: 202, headers: { 'Content-Type': 'application/json' } }
        );
    } catch (err) {
        return new Response(
            JSON.stringify({ error: 'Failed to save offline data' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}

// ──── Background Sync ────

self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-offline-data') {
        event.waitUntil(syncOfflineData());
    }
});

async function syncOfflineData() {
    try {
        const queue = await getSyncQueue();
        if (queue.length === 0) return;

        console.log(`[SW] Syncing ${queue.length} offline items...`);
        const syncedIds = [];

        for (const item of queue) {
            try {
                const response = await fetch(item.url, {
                    method: item.method,
                    headers: item.headers,
                    body: JSON.stringify(item.body),
                    credentials: 'include',
                });

                if (response.ok) {
                    syncedIds.push(item.id);
                    console.log(`[SW] Synced item ${item.id} to ${item.url}`);
                }
            } catch (err) {
                console.warn(`[SW] Failed to sync item ${item.id}:`, err);
            }
        }

        if (syncedIds.length > 0) {
            await clearSyncedItems(syncedIds);

            // Notify clients about successful sync
            const clients = await self.clients.matchAll({ type: 'window' });
            clients.forEach((client) => {
                client.postMessage({
                    type: 'SYNC_COMPLETE',
                    synced: syncedIds.length,
                    total: queue.length,
                    message: `${syncedIds.length} offline items synced successfully!`,
                });
            });
        }
    } catch (err) {
        console.error('[SW] Sync failed:', err);
    }
}

// Listen for online event to trigger sync
self.addEventListener('message', (event) => {
    if (event.data?.type === 'ONLINE') {
        syncOfflineData();
    }
    if (event.data?.type === 'FORCE_SYNC') {
        syncOfflineData();
    }
});

// ──── Strategies ────

async function cacheFirst(request) {
    const cached = await caches.match(request);
    if (cached) return cached;

    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, response.clone());
        }
        return response;
    } catch {
        return new Response('', { status: 408, statusText: 'Offline' });
    }
}

async function networkFirst(request) {
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, response.clone());
        }
        return response;
    } catch {
        const cached = await caches.match(request);
        return cached || new Response('', { status: 408, statusText: 'Offline' });
    }
}

async function networkFirstWithOfflineFallback(request) {
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, response.clone());
        }
        return response;
    } catch {
        const cached = await caches.match(request);
        if (cached) return cached;
        return caches.match('/offline.html');
    }
}

// ──── Push Notifications ────
self.addEventListener('push', (event) => {
    let data = { title: 'CampusIQ', body: 'You have a new notification', icon: '/favicon.ico', url: '/notifications' };
    try {
        if (event.data) {
            const payload = event.data.json();
            data = { ...data, ...payload };
        }
    } catch {
        if (event.data) {
            data.body = event.data.text();
        }
    }

    const options = {
        body: data.body,
        icon: data.icon || '/favicon.ico',
        badge: '/favicon.ico',
        vibrate: [100, 50, 100],
        data: { url: data.url || '/notifications' },
        actions: [
            { action: 'open', title: 'Open' },
            { action: 'dismiss', title: 'Dismiss' },
        ],
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'dismiss') return;

    const url = event.notification.data?.url || '/notifications';
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
            for (const client of clients) {
                if (client.url.includes(url) && 'focus' in client) {
                    return client.focus();
                }
            }
            return self.clients.openWindow(url);
        })
    );
});

// ──── Periodic Sync for cache refresh ────
self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'refresh-dashboard') {
        event.waitUntil(
            fetch('/api/dashboard/summary').then(async (response) => {
                if (response.ok) {
                    const cache = await caches.open(DYNAMIC_CACHE);
                    await cache.put('/api/dashboard/summary', response);
                }
            }).catch(() => { })
        );
    }
});

// ──── Helpers ────

function isStaticAsset(pathname) {
    return /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/i.test(pathname)
        || pathname.startsWith('/_next/static/');
}
