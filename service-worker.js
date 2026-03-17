self.addEventListener("install", () => {
  console.log("Service Worker Installed");
});
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js");
}