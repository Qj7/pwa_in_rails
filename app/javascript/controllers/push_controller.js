import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  connect() {
    this.vapidKey = this.element.dataset.pushVapidKey;
    this.setupSubscription();
  }

  setupSubscription() {
    const subscribeButton = document.getElementById('subscribeButton');
    const blockedMessage = document.getElementById('blockedMessage');

    // Проверяем текущее разрешение на уведомления
    if (Notification.permission === 'denied') {
      // Скрываем кнопку подписки и показываем сообщение о блокировке
      subscribeButton.style.display = 'none';
      blockedMessage.style.display = 'block';
      console.log('Notifications are blocked.');
      return;
    } else {
      // Если уведомления разрешены или не запрашивались
      blockedMessage.style.display = 'none';
      subscribeButton.style.display = 'block';

      subscribeButton.addEventListener('click', async () => {
        await this.subscribeUser();
      });

      this.checkSubscription();
    }
  }

  async subscribeUser() {
    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.error('User denied notification permission.');
        return;
      }
    }

    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        const registration = await navigator.serviceWorker.ready;
        const applicationServerKey = this.urlBase64ToUint8Array(this.vapidKey);
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey
        });

        console.log('Subscription object:', subscription);
        await this.sendSubscriptionToServer(subscription);
      } catch (error) {
        console.error('Failed to subscribe to notifications:', error);
      }
    } else {
      console.warn('Push messaging is not supported.');
    }
  }

  async checkSubscription() {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        console.log('User is subscribed:', subscription);
      } else {
        console.log('User is not subscribed.');
      }
    }
  }

  async sendSubscriptionToServer(subscription) {
    try {
      const response = await fetch('/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
        },
        body: JSON.stringify({
          subscription: subscription.toJSON()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send subscription to server');
      }

      const data = await response.json();
      console.log('Server response:', data);
    } catch (error) {
      console.error('Error sending subscription to server:', error);
    }
  }

  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    try {
      const rawData = window.atob(base64);
      const outputArray = new Uint8Array(rawData.length);

      for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
      }

      return outputArray;
    } catch (error) {
      console.error('Ошибка при декодировании base64 строки:', error);
      throw new Error('Неправильный VAPID ключ');
    }
  }
}
