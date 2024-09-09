import { Controller } from "@hotwired/stimulus";

export default class extends Controller {
  static targets = ["from", "to", "output", "unlockSteps", "offlineMessage"];

  connect() {
    console.log("lock controller connected with localStorage");
    this.checkConnectionStatus();
    this.syncOfflineData();
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
    const offlineData = JSON.parse(localStorage.getItem("locks")) || [];

    if (offlineData.length > 0 && navigator.onLine) {
      offlineData.forEach((data, index) => {
        this.sendDataToServer(data.from, data.to).then(() => {
          this.removeDataFromLocalStorage(index);
        });
      });
    }
  }

  removeDataFromLocalStorage(index) {
    const offlineData = JSON.parse(localStorage.getItem("locks")) || [];
    offlineData.splice(index, 1);
    localStorage.setItem("locks", JSON.stringify(offlineData));
    console.log(`Deleted entry at index ${index} from localStorage.`);
  }

  saveToLocalStorage(from, to) {
    const offlineData = JSON.parse(localStorage.getItem("locks")) || [];
    const data = { from, to };
    offlineData.push(data);
    localStorage.setItem("locks", JSON.stringify(offlineData));
    console.log("Data saved to localStorage:", data);
  }

  openLock(event) {
    event.preventDefault();

    const from = this.fromTargets.map((input) => parseInt(input.value));
    const to = this.toTargets.map((input) => parseInt(input.value));

    if (navigator.onLine) {
      this.sendDataToServer(from, to);
    } else {
      this.saveToLocalStorage(from, to);
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
