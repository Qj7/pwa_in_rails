const cacheVersion = 'v1';  // Обновите версию при необходимости
const assetsCacheName = `assets-${cacheVersion}`;
const documentsCacheName = `documents-${cacheVersion}`;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(assetsCacheName).then((cache) => {
      return cache.addAll([
        '/',
        '/manifest.json',
      ]).catch((error) => {
        console.error('Ошибка при кэшировании:', error);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  const cacheAllowlist = [assetsCacheName, documentsCacheName];

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheAllowlist.includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (!request.url.startsWith('http')) {
    return;
  }

  if (request.destination === 'document' || request.url.endsWith('manifest.json')) {
    event.respondWith(
      caches.open(documentsCacheName).then((cache) => {
        return fetch(request)
          .then((response) => {
            if (!response || response.status !== 200) {
              return cache.match(request);
            }
            cache.put(request, response.clone());
            return response;
          })
          .catch(() => {
            return cache.match(request);
          });
      })
    );
  } else if (['script', 'style', 'image', 'font'].includes(request.destination)) {
    event.respondWith(
      caches.open(assetsCacheName).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          const fetchPromise = fetch(request).then((networkResponse) => {
            if (!networkResponse || networkResponse.status !== 200) {
              return cachedResponse;
            }
            cache.put(request, networkResponse.clone());
            return networkResponse;
          }).catch(() => {
            return cachedResponse;
          });
          return cachedResponse || fetchPromise;
        });
      })
    );
  } else if (request.url.match(/\/api\/.*\/*.json/)) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(JSON.stringify({ error: 'Сеть недоступна' }), {
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
  }
});

// Добавляем обработку события push
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};

  const title = data.title || 'Новое уведомление';
  const options = {
    body: data.message || 'Вы получили новое уведомление.',
    icon: data.icon || '/icon_192.png',
    badge: data.badge || '/icon_192.png',
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Обработка кликов по уведомлению
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.openWindow('/')
  );
});
