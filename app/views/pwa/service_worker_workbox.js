importScripts("https://storage.googleapis.com/workbox-cdn/releases/7.1.0/workbox-sw.js");

if (workbox) {
  console.log(`WB working`);

  workbox.setConfig({ debug: true });

  const { CacheFirst, StaleWhileRevalidate, NetworkFirst, NetworkOnly } = workbox.strategies;
  const { registerRoute } = workbox.routing;
  const { ExpirationPlugin } = workbox.expiration;
  const { offlineFallback } = workbox.recipes;

  const currentVersion = 'v1';
  const assetsCacheName = `assets-${currentVersion}`;
  const documentsCacheName = `documents-${currentVersion}`;
  const offlineCacheName = `offline-fallbacks-${currentVersion}`;
  const offlineUrl = '/offline.html';

  self.addEventListener("message", (event) => {
    if (event.data && event.data.type === "SKIP_WAITING") {
      skipWaiting();
    }
  });

  // Кэширование рутовой страницы (/) и манифеста
  registerRoute(
    ({ url }) => url.pathname === '/' || url.pathname.endsWith('manifest.json') || url.pathname.endsWith('offline'),
    new NetworkFirst({
      cacheName: documentsCacheName,
    })
  );

  // Кэширование ассетов (скрипты, стили, изображения)
  registerRoute(
    ({ request }) => ['script', 'style', 'image', 'font'].includes(request.destination),
    new StaleWhileRevalidate({
      cacheName: assetsCacheName,
      plugins: [
        new ExpirationPlugin({
          maxEntries: 50, // Максимум 50 записей в кэше
          maxAgeSeconds: 30 * 24 * 60 * 60, // Кэш на 30 дней
        }),
      ],
    })
  );

  // Кэширование API-запросов
  registerRoute(
    /\/api\/.*\/*.json/,
    new NetworkOnly()
  );

  self.addEventListener('activate', (event) => {
    const cacheAllowlist = [
      assetsCacheName,
      documentsCacheName,
      offlineCacheName
    ];

    event.waitUntil(
      caches.keys().then((cacheNames) => {
        console.log(`[Service Worker] Текущие кэши: ${cacheNames.join(', ')}`);
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Удаляем все кэши, которые не соответствуют актуальным версиям
            if (!cacheAllowlist.includes(cacheName)) {
              console.log(`[Service Worker] Удаление устаревшего кэша: ${cacheName}`);
              return caches.delete(cacheName);
            }
          })
        );
      }).then(() => {
        console.log('[Service Worker] Все устаревшие кэши удалены');
        // Уведомляем сервис-воркер, что активация завершена
        return self.clients.claim();
      })
    );
  });

  offlineFallback({
    pageFallback: offlineUrl,
  });

} else {
  console.log("WB Error");
}
