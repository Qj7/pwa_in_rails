document.addEventListener('DOMContentLoaded', () => {
  const subscribeButton = document.getElementById('subscribe');
  console.log('-----------TEST=-------------------------------')
  console.log('-----------TEST=-------------------------------')

  console.log('-----------TEST=-------------------------------')
  console.log('-----------TEST=-------------------------------')

  // Получение VAPID_PUBLIC_KEY из meta-тега
  const vapidPublicKey = document.querySelector('meta[name="vapid-public-key"]').getAttribute('content');

  // Регистрация Service Worker и подписка пользователя
  subscribeButton.addEventListener('click', async () => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        const registration = await navigator.serviceWorker.register('/service-worker.js');
        console.log('Service Worker зарегистрирован', registration);

        const subscription = await subscribeUserToPush(registration, vapidPublicKey);
        console.log('Пользователь подписан:', subscription);

        // Отправка подписки на сервер
        await saveSubscription(subscription);
      } catch (error) {
        console.error('Ошибка регистрации Service Worker', error);
      }
    } else {
      console.error('Push notifications не поддерживаются в этом браузере');
    }
  });

  // Subscribe the user to push notifications
  async function subscribeUserToPush(registration, vapidPublicKey) {
    const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

    return await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedVapidKey
    });
  }

  // Convert VAPID key to Uint8Array
  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Save subscription to the Rails backend
  async function saveSubscription(subscription) {
    const response = await fetch('/notifications/save_subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').getAttribute('content'),
      },
      body: JSON.stringify({ subscription })
    });

    if (!response.ok) {
      throw new Error('Failed to save subscription on the server');
    }

    console.log('Subscription saved on the server');
  }
});
