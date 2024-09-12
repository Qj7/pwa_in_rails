const cacheVersion = 'v1';  // Обновите версию при необходимости
const assetsCacheName = `assets-${cacheVersion}`;
const documentsCacheName = `documents-${cacheVersion}`;

console.log('[Service Worker] Запуск...');

// Предварительное кэширование статичных ресурсов во время установки
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Событие установки');

  event.waitUntil(
    caches.open(assetsCacheName).then((cache) => {
      console.log('[Service Worker] Предварительное кэширование статичных ресурсов');
      return cache.addAll([
        '/',
        '/manifest.json',
        // Здесь можно добавить дополнительные ресурсы для предварительного кэширования
      ]).catch((error) => {
        console.error('Ошибка при кэшировании:', error);
      });
    })
  );
});

// Очистка старого кэша при активации нового service worker
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Событие активации');

  const cacheAllowlist = [assetsCacheName, documentsCacheName, offlineCacheName];

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      console.log(`[Service Worker] Текущие кэши: ${cacheNames.join(', ')}`);
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheAllowlist.includes(cacheName)) {
            console.log(`[Service Worker] Удаление старого кэша: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[Service Worker] Все устаревшие кэши удалены');
      return self.clients.claim();  // Уведомляем, что активация завершена
    })
  );
});

// Обработчик сообщений для SKIP_WAITING
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[Service Worker] Сообщение SKIP_WAITING получено');
    self.skipWaiting();
  }
});

// Обработчик событий fetch для работы с сетевыми запросами и стратегиями кэширования
self.addEventListener('fetch', (event) => {
  const { request } = event;

  console.log(`[Service Worker] Запрос: ${request.url}`);

  // Пропускаем запросы с расширениями или локальными файлами
  if (!request.url.startsWith('http')) {
    console.log('[Service Worker] Пропуск запроса с расширениями или локальными файлами');
    return;
  }

  // Обрабатываем запросы на документы
  if (request.destination === 'document' || request.url.endsWith('manifest.json')) {
    event.respondWith(
      caches.open(documentsCacheName).then((cache) => {
        return fetch(request)
          .then((response) => {
            if (!response || response.status !== 200) {
              console.error(`[Service Worker] Ошибка при получении документа: ${request.url}`);
              return cache.match(request);
            }
            console.log(`[Service Worker] Кэширование нового документа: ${request.url}`);
            cache.put(request, response.clone());
            return response;
          })
          .catch((error) => {
            console.error(`[Service Worker] Возврат кэшированного документа (ошибка сети): ${request.url}`, error);
            return cache.match(request);
          });
      })
    );
  }
  // Кэширование ассетов (скрипты, стили, изображения, шрифты)
  else if (['script', 'style', 'image', 'font'].includes(request.destination)) {
    event.respondWith(
      caches.open(assetsCacheName).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          const fetchPromise = fetch(request).then((networkResponse) => {
            if (!networkResponse || networkResponse.status !== 200) {
              console.error(`[Service Worker] Ошибка при получении ассета: ${request.url}`);
              return cachedResponse;
            }
            console.log(`[Service Worker] Кэширование обновленного ассета: ${request.url}`);
            cache.put(request, networkResponse.clone());
            return networkResponse;
          }).catch((error) => {
            console.error(`[Service Worker] Ошибка сети для ассета: ${request.url}`, error);
            return cachedResponse;
          });
          return cachedResponse || fetchPromise;
        });
      })
    );
  }
  // Кэширование API-запросов
  else if (request.url.match(/\/api\/.*\/*.json/)) {
    event.respondWith(
      fetch(request).catch((error) => {
        console.error(`[Service Worker] Ошибка сети для API-запроса: ${request.url}`, error);
        return new Response(JSON.stringify({ error: 'Сеть недоступна' }), {
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
  }
});
