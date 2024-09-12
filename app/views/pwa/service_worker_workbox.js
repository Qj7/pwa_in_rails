importScripts("https://storage.googleapis.com/workbox-cdn/releases/7.1.0/workbox-sw.js");

if (workbox) {
  console.log(`WB working`);

  workbox.setConfig({ debug: true });

  const { CacheFirst, StaleWhileRevalidate, NetworkFirst, NetworkOnly } = workbox.strategies;
  const { registerRoute } = workbox.routing;
  const { ExpirationPlugin } = workbox.expiration;

  const cacheVersion = 'v1';
  const assetsCacheName = `assets-${cacheVersion}`;
  const documentsCacheName = `documents-${cacheVersion}`;

  self.addEventListener("message", (event) => {
    if (event.data && event.data.type === "SKIP_WAITING") {
      skipWaiting();
    }
  });

  // Кэширование рутовой страницы (/) и манифеста
  registerRoute(
    ({ url }) => url.pathname === '/' || url.pathname.endsWith('manifest.json'),
    new NetworkFirst({
      cacheName: documentsCacheName,
    })
  );

  // Кэширование ассетов (скрипты, стили, изображения)
  registerRoute(
    ({ request }) => ['script', 'style', 'image'].includes(request.destination),
    new StaleWhileRevalidate({
      cacheName: assetsCacheName,
    })
  );

  // Кэширование изображений с истечением срока хранения
  registerRoute(
    /\.(?:woff2|woff|ttf|otf|png|jpg|jpeg|svg|gif)$/,
    new CacheFirst({
      cacheName: 'static-resources',
      plugins: [
        new ExpirationPlugin({
          maxEntries: 50,
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

  // Очистка старого кэша при активации нового service worker
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
      })
    );
  });

} else {
  console.log("WB Error");
}
