import { Controller } from "@hotwired/stimulus";

export default class extends Controller {
  static targets = ["from", "to", "output", "unlockSteps", "offlineMessage"];

  connect() {
    console.log("lock controller connected with IndexedDB");
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

  syncOfflineData() {
    if (!navigator.onLine || !this.db) return;

    const transaction = this.db.transaction(["locks"], "readonly");
    const store = transaction.objectStore("locks");

    store.openCursor().onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        const data = cursor.value;
        this.sendDataToServer(data.from, data.to).then(() => {
          this.removeDataFromIndexedDB(cursor.key);
        });
        cursor.continue();
      }
    };
  }

  removeDataFromIndexedDB(key) {
    const transaction = this.db.transaction(["locks"], "readwrite");
    const store = transaction.objectStore("locks");
    store.delete(key);
    console.log(`Deleted entry with id ${key} from IndexedDB.`);
  }

  saveToIndexedDB(from, to) {
    if (!this.db) {
      console.error("IndexedDB is not initialized yet.");
      return;
    }

    const transaction = this.db.transaction(["locks"], "readwrite");
    const store = transaction.objectStore("locks");
    store.add({ from, to });
    console.log("Data saved to IndexedDB:", { from, to });
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

  sendDataToServer(from, to) {
    return fetch("/open_lock", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": document.querySelector('meta[name="csrf-token"]').getAttribute("content"),
      },
      body: JSON.stringify({ from, to }),
    })
      .then((response) => response.json())
      .then((data) => {
        this.displayResults(data.solution);
      })
      .catch((error) => {
        console.error("Fetch error:", error);
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
