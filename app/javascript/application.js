import "@hotwired/turbo-rails";
import "controllers";
import "custom/companion";

console.log('application.js загружен');

// Функция для обновления статуса сети
const updateNetworkStatus = () => {
  const isOnline = navigator.onLine;
  const statusElement = document.getElementById("status");
  const statusIndicator = document.getElementById("status-indicator");

  if (statusElement && statusIndicator) {
    statusElement.textContent = isOnline ? "Online" : "Offline";
    statusIndicator.style.backgroundColor = isOnline ? "green" : "red";
  }
};

updateNetworkStatus();

// Слушаем изменения статуса сети
window.addEventListener('online', updateNetworkStatus);
window.addEventListener('offline', updateNetworkStatus);

// Логика для обработки установки PWA
let deferredPrompt;
const installButton = document.getElementById("install-button");

if (installButton) {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;

    // Обработка нажатия на кнопку установки
    installButton.addEventListener("click", () => {
      if (deferredPrompt) {
        deferredPrompt.prompt(); // Показываем установочный диалог
        deferredPrompt.userChoice.then((choiceResult) => {
          deferredPrompt = null; // Сбрасываем событие после использования
        });
      }
    });
  });

  // Обрабатываем событие appinstalled
  window.addEventListener("appinstalled", () => {
    installButton.classList.add("hidden"); // Скрываем кнопку после установки
  });
}


