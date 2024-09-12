import { Controller } from "@hotwired/stimulus";

export default class extends Controller {
  static targets = ["from", "to", "output", "unlockSteps", "offlineMessage"];

  connect() {
    console.log("lock controller connected with IndexedDB");
    this.idsToSync = [];
    this.initIndexedDB().then(() => {
      this.checkConnectionStatus();
      this.syncOfflineData();
    }).catch((error) => {
      console.error("Error connecting controller", error);
    });
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

  // Синхронизация данных при восстановлении интернета
  syncOfflineData() {
    if (!navigator.onLine || !this.db || this.idsToSync.length === 0) return;

    // Проходим по массиву ID и обрабатываем каждую запись
    this.idsToSync.forEach((id) => {
      this.getDataById(id).then((data) => {
        if (data) {
          this.sendDataToServer(data.from, data.to)
            .then(() => {
              this.removeDataFromIndexedDB(id); // Удаляем запись из IndexedDB
              this.removeIdFromArray(id); // Удаляем ID из массива
            })
            .catch((error) => {
              console.error(`Ошибка отправки данных для ID ${id}:`, error);
            });
        }
      });
    });
  }

  // Получение данных по ID из IndexedDB
  getDataById(id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["locks"], "readonly");
      const store = transaction.objectStore("locks");
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = (event) => {
        console.error(`Ошибка получения данных по ID ${id}:`, event.target.error);
        reject(event.target.error);
      };
    });
  }

  // Удаление данных из IndexedDB по ID
  removeDataFromIndexedDB(id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["locks"], "readwrite");
      const store = transaction.objectStore("locks");
      const request = store.delete(id);

      request.onsuccess = () => {
        console.log(`Deleted entry with id ${id} from IndexedDB.`);
        resolve();
      };

      request.onerror = (event) => {
        console.error("Ошибка удаления записи из IndexedDB:", event.target.error);
        reject(event.target.error);
      };
    });
  }

  // Сохранение данных в IndexedDB и добавление ID в массив
  saveToIndexedDB(from, to) {
    if (!this.db) {
      console.error("IndexedDB is not initialized yet.");
      return;
    }

    const transaction = this.db.transaction(["locks"], "readwrite");
    const store = transaction.objectStore("locks");
    const request = store.add({ from, to });

    request.onsuccess = (event) => {
      const id = event.target.result; // Получаем сгенерированный ID
      this.idsToSync.push(id); // Добавляем ID в массив
      console.log("Data saved to IndexedDB with id:", id);
    };

    request.onerror = (event) => {
      console.error("Ошибка сохранения в IndexedDB:", event.target.error);
    };
  }

  // Удаление ID из массива
  removeIdFromArray(id) {
    this.idsToSync = this.idsToSync.filter(storedId => storedId !== id);
  }

  openLock(event) {
    event.preventDefault();

    const from = this.fromTargets.map((input) => parseInt(input.value));
    const to = this.toTargets.map((input) => parseInt(input.value));

    if (navigator.onLine) {
      this.sendDataToServer(from, to);
    } else {
      this.saveToIndexedDB(from, to); // Сохраняем в IndexedDB и сохраняем ID
    }
  }

  sendDataToServer(from, to) {
    return fetch("/open_lock", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": document.querySelector('meta[name="csrf-token"]').getAttribute("content"),
      },
      body: JSON.stringify({ from, to }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Ошибка сервера: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        this.displayResults(data.solution);
      })
      .catch((error) => {
        console.error("Fetch error:", error);
        throw error;
      });
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
}
