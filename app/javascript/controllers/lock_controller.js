import { Controller } from "@hotwired/stimulus";

export default class extends Controller {
  static targets = [
    "from",
    "to",
    "output",
    "unlockSteps",
    "offlineMessage",
    "syncStatus"
  ];

  async connect() {
    console.log("lock controller connected with IndexedDB");
    try {
      await this.initIndexedDB();
      this.checkConnectionStatus();
      await this.syncOfflineData();
    } catch (error) {
      console.error("Error connecting controller", error);
    }
  }

  async initIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("lockDB", 1);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains("locks")) {
          db.createObjectStore("locks", { keyPath: "id", autoIncrement: true });
        }
      };

      request.onerror = () => {
        reject("Error opening IndexedDB.");
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve();
      };
    });
  }

  checkConnectionStatus() {
    this.updateStatus();

    window.addEventListener("online", () => {
      this.updateStatus();
      this.syncOfflineData();
    });

    window.addEventListener("offline", () => {
      this.updateStatus();
    });
  }

  updateStatus() {
    const isOnline = navigator.onLine;
    this.toggleVisibility(this.offlineMessageTarget, !isOnline);
    this.toggleVisibility(this.unlockStepsTarget, isOnline);
  }

  toggleVisibility(element, isVisible) {
    element.style.display = isVisible ? "block" : "none";
  }

  async syncOfflineData() {
    if (!navigator.onLine || !this.db) return;

    try {
      const allRecords = await this.getAllRecordsFromIndexedDB();

      console.log(`Перед отправкой: ${allRecords.length} записей в базе данных.`);
      console.log("Содержимое базы данных:", allRecords);

      if (allRecords.length > 0) {
        this.syncStatusTarget.textContent = `Синхронизация ${allRecords.length} записей...`;
        this.syncStatusTarget.classList.remove("hidden");
        this.syncStatusTarget.classList.remove("fade-out");
      }

      await this.processOfflineData(allRecords);
      await this.logDatabaseState();

      this.syncStatusTarget.textContent = "Синхронизация завершена.";
      this.syncStatusTarget.classList.remove("hidden");
      this.syncStatusTarget.classList.add("fade-out");

      // Удаляем сообщение через 5 секунд
      setTimeout(() => {
        this.syncStatusTarget.classList.add("hidden");
        this.syncStatusTarget.classList.remove("fade-out");
      }, 5000);
    } catch (error) {
      console.error("Error syncing offline data:", error);
      this.syncStatusTarget.textContent = "Ошибка при синхронизации.";
    }
  }

  getAllRecordsFromIndexedDB() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["locks"], "readonly");
      const store = transaction.objectStore("locks");
      const allRecords = [];

      store.openCursor().onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          allRecords.push(cursor.value);
          cursor.continue();
        } else {
          resolve(allRecords);
        }
      };

      store.openCursor().onerror = (event) => {
        reject(event.target.error);
      };
    });
  }

  async processOfflineData(records) {
    for (const data of records) {
      try {
        // Логируем перед отправкой каждой записи
        console.log("Отправка данных на сервер:", data);

        await this.sendDataToServer(data.from, data.to);
        await this.removeDataFromIndexedDB(data.id);

        const remainingRecords = records.length - records.indexOf(data) - 1;
        this.syncStatusTarget.textContent = `Осталось синхронизировать: ${remainingRecords} записей`;
      } catch (error) {
        console.error("Error processing data:", error);
        // Продолжаем обработку оставшихся записей даже при ошибке
        continue;
      }
    }
  }

  removeDataFromIndexedDB(key) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["locks"], "readwrite");
      const store = transaction.objectStore("locks");
      const request = store.delete(key);

      request.onsuccess = () => {
        console.log(`Deleted entry with id ${key} from IndexedDB.`);
        resolve();
      };

      request.onerror = (event) => {
        console.error("Error deleting data:", event.target.error);
        reject(event.target.error);
      };
    });
  }

  saveToIndexedDB(from, to) {
    if (!this.db) {
      console.error("IndexedDB is not initialized yet.");
      return;
    }

    const transaction = this.db.transaction(["locks"], "readwrite");
    const store = transaction.objectStore("locks");
    const request = store.add({ from, to });

    request.onsuccess = () => {
      console.log("Data saved to IndexedDB:", { from, to });
    };

    request.onerror = (event) => {
      console.error("Error saving data to IndexedDB:", event.target.error);
    };
  }

  openLock(event) {
    event.preventDefault();

    const from = this.fromTargets.map((input) => parseInt(input.value));
    const to = this.toTargets.map((input) => parseInt(input.value));

    if (navigator.onLine) {
      this.sendDataToServer(from, to);
    } else {
      this.saveToIndexedDB(from, to);
    }
  }

  async sendDataToServer(from, to) {
    try {
      const response = await fetch("/open_lock", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": document
            .querySelector('meta[name="csrf-token"]')
            .getAttribute("content"),
        },
        body: JSON.stringify({ from, to }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      this.displayResults(data.solution);
    } catch (error) {
      console.error("Fetch error:", error);
      throw error;
    }
  }

  displayResults(solution) {
    const outputElement = this.unlockStepsTarget;
    outputElement.innerHTML = "";

    solution.forEach((step) => {
      const p = document.createElement("p");
      p.textContent = step.join(" ");
      p.className = "output-step";
      outputElement.appendChild(p);
    });
  }

  logDatabaseState() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["locks"], "readonly");
      const store = transaction.objectStore("locks");
      const allRecords = [];

      store.openCursor().onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          allRecords.push(cursor.value);
          cursor.continue();
        } else {
          console.log(`После отправки: ${allRecords.length} записей в базе данных.`);
          console.log("Содержимое базы данных:", allRecords);
          resolve();
        }
      };

      store.openCursor().onerror = (event) => {
        reject(event.target.error);
      };
    });
  }
}
