// Production offline assets must not override development bundles on the same origin.
// Keep IndexedDB and localStorage intact: they may contain unsynchronised sales.
if (process.env.NODE_ENV === "development" && "serviceWorker" in navigator) {
  void (async () => {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      const workers = [registration.active, registration.waiting, registration.installing];
      if (workers.some((worker) => worker && new URL(worker.scriptURL).pathname === "/pos-sw.js")) {
        await registration.unregister();
      }
    }
    if ("caches" in window) {
      await Promise.all(["pos-shell-v1", "pos-assets-v1"].map((name) => caches.delete(name)));
    }
  })().catch((error: unknown) => {
    console.warn("Could not disable the POS offline cache for development.", error);
  });
}
