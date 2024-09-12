const cacheVersion = 'v2';
const assetsCacheName = `assets-${cacheVersion}`;
const documentsCacheName = `documents-${cacheVersion}`;
const staticResourcesCache = 'static-resources';

console.log('[Service Worker] Запуск...');

// Предварительное кэширование статичных ресурсов во время установки
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Событие установки');

  event.waitUntil(
    caches.open(assetsCacheName).then((cache) => {
      console.log('[Service Worker] Предварительное кэширование статичных ресурсов');
      return cache.addAll([
        '/',  // Кэширование корневой страницы
        '/manifest.json',  // Кэширование манифеста
        // Здесь можно добавить дополнительные ресурсы для предварительного кэширования
      ]);
    })
  );
});

// Фаза активации: очистка старого кэша
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Событие активации');

  const cacheAllowlist = [assetsCacheName, documentsCacheName, staticResourcesCache];

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Удаляем старые версии кэша, которые не в списке актуальных
          if (!cacheAllowlist.includes(cacheName)) {
            console.log(`[Service Worker] Удаление старого кэша: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  console.log('[Service Worker] Старый кэш очищен');
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

  // Обрабатываем различные типы запросов
  if (request.destination === 'document' || request.url.endsWith('manifest.json')) {
    // Стратегия NetworkFirst для документов
    event.respondWith(
      caches.open(documentsCacheName).then((cache) => {
        return fetch(request)
          .then((response) => {
            console.log(`[Service Worker] Кэширование нового документа: ${request.url}`);
            cache.put(request, response.clone());
            return response;
          })
          .catch(() => {
            console.log(`[Service Worker] Возврат кэшированного документа: ${request.url}`);
            return cache.match(request);
          });
      })
    );
  } else if (['script', 'style', 'image'].includes(request.destination)) {
    // Стратегия StaleWhileRevalidate для ассетов (скрипты, стили, изображения)
    event.respondWith(
      caches.open(assetsCacheName).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          const fetchPromise = fetch(request).then((networkResponse) => {
            console.log(`[Service Worker] Кэширование обновленного ассета: ${request.url}`);
            cache.put(request, networkResponse.clone());
            return networkResponse;
          });
          return cachedResponse || fetchPromise;
        });
      })
    );
  } else if (request.url.match(/\.(?:woff2|woff|ttf|otf|png|jpg|jpeg|svg|gif)$/)) {
    // Стратегия CacheFirst для статических ресурсов с истечением срока хранения
    event.respondWith(
      caches.open(staticResourcesCache).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            console.log(`[Service Worker] Возврат кэшированного ресурса: ${request.url}`);
            return cachedResponse;
          }
          return fetch(request).then((networkResponse) => {
            console.log(`[Service Worker] Кэширование нового ресурса: ${request.url}`);
            cache.put(request, networkResponse.clone());
            return networkResponse;
          });
        });
      })
    );
  } else if (request.url.match(/\/api\/.*\/*.json/)) {
    // Стратегия NetworkOnly для API запросов
    event.respondWith(fetch(request));
  }
});
