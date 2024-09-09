// Configure your import map in config/importmap.rb. Read more: https://github.com/rails/importmap-rails
import "@hotwired/turbo-rails";
import "controllers";

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
  // Слушаем событие beforeinstallprompt
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault(); // Останавливаем автоматическое показ установки
    deferredPrompt = event;

    // Показываем кнопку установки
    installButton.classList.remove("hidden");

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

// Проверка режима standalone
if (window.matchMedia('(display-mode: standalone)').matches) {
  installButton.classList.add("hidden"); // Скрываем кнопку, если уже установлено как PWA
}
