// Configure your import map in config/importmap.rb. Read more: https://github.com/rails/importmap-rails
import "@hotwired/turbo-rails"
import "controllers"

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

// Слушаем события изменения статуса сети
window.addEventListener('online', updateNetworkStatus);
window.addEventListener('offline', updateNetworkStatus);