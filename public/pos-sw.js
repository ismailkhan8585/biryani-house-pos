/* Cache only the current cashier's POS screen. APIs and other pages remain online. */
const SHELL = "pos-shell-v1";
const ASSETS = "pos-assets-v1";
const MARKER = "/__pos-offline-context";
let generation = 0;

async function clearShell() {
  generation++;
  await caches.delete(SHELL);
}
async function context() {
  const cache = await caches.open(SHELL);
  const response = await cache.match(MARKER);
  const value = response ? await response.json() : null;
  if (!value || value.expires <= Date.now()) return null;
  return value;
}
async function prepare(expected, extraAssets = []) {
  const revision = ++generation;
  const readContext = async () => {
    const response = await fetch("/api/offline-context", { cache: "no-store" });
    if (!response.ok) throw Error("Sign in and select a branch first.");
    const value = await response.json();
    if (value.context !== expected || value.expires <= Date.now())
      throw Error("Session changed. Reopen POS.");
    return value;
  };
  const before = await readContext();
  const page = await fetch("/pos", {
    cache: "no-store",
    headers: { Accept: "text/html" },
  });
  if (
    !page.ok ||
    page.redirected ||
    !page.headers.get("content-type")?.includes("text/html")
  )
    throw Error("POS screen could not be saved.");
  const html = await page.clone().text();
  const paths = new Set(["/ilyas-logo.png", ...extraAssets]);
  for (const match of html.matchAll(/(?:src|href)="([^"<>]+)"/g))
    paths.add(match[1].replaceAll("&amp;", "&"));
  const assets = await caches.open(ASSETS);
  await Promise.all(
    [...paths].map(async (path) => {
      const url = new URL(path, self.location.origin);
      if (
        url.origin !== self.location.origin ||
        !(
          url.pathname.startsWith("/_next/static/") ||
          url.pathname === "/ilyas-logo.png"
        )
      )
        return;
      if (await assets.match(url.href)) return;
      const response = await fetch(url.href);
      if (!response.ok)
        throw Error("Some POS files are unavailable. Retry while online.");
      await assets.put(url.href, response);
    }),
  );
  const after = await readContext();
  if (generation !== revision || before.context !== after.context)
    throw Error("Session changed. Reopen POS.");
  const cache = await caches.open(SHELL);
  await cache.put("/pos", page);
  await cache.put(MARKER, new Response(JSON.stringify(after)));
  // A logout or branch change during the cache writes must win.
  if (generation !== revision) {
    await caches.delete(SHELL);
    throw Error("Session changed.");
  }
  return after;
}

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) =>
  event.waitUntil(self.clients.claim()),
);
self.addEventListener("message", (event) => {
  const reply = (data) => event.ports[0]?.postMessage(data);
  event.waitUntil(
    (async () => {
      try {
        if (event.data?.type === "PREPARE")
          reply({
            ready: true,
            ...(await prepare(event.data.context, event.data.assets)),
          });
        else if (event.data?.type === "STATUS") {
          const saved = await context();
          reply({ ready: saved?.context === event.data.context, ...saved });
        } else if (event.data?.type === "CLEAR") {
          await clearShell();
          reply({ ready: false });
        }
      } catch (error) {
        reply({ ready: false, error: error.message });
      }
    })(),
  );
});
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (
    request.method === "POST" &&
    ["/api/auth/login", "/api/auth/logout", "/api/auth/branch"].includes(
      url.pathname,
    )
  ) {
    event.respondWith(
      (async () => {
        await clearShell();
        return fetch(request);
      })(),
    );
    return;
  }
  if (request.method !== "GET") return;
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname === "/ilyas-logo.png"
  ) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(ASSETS);
        const saved = await cache.match(request);
        if (saved) return saved;
        const response = await fetch(request);
        if (response.ok) await cache.put(request, response.clone());
        return response;
      })(),
    );
    return;
  }
  if (request.mode !== "navigate") return;
  event.respondWith(
    (async () => {
      try {
        const response = await fetch(request);
        if (response.redirected && new URL(response.url).pathname === "/login")
          await clearShell();
        return response;
      } catch {
        if (url.pathname === "/pos" && !url.search && (await context())) {
          const saved = await (await caches.open(SHELL)).match("/pos");
          if (saved) return saved;
        }
        return new Response(
          '<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Connection required</title><body style="font:16px system-ui;max-width:480px;margin:12vh auto;padding:24px;line-height:1.6"><h1>You are offline</h1><p>Return to your prepared POS to continue the current shift. Signing in, reports and administration require a connection.</p><p><a href="/pos">Return to POS</a></p><p>If your session expired or POS was not prepared, reconnect first. Saved sales remain on this device.</p></body></html>',
          {
            status: 503,
            headers: {
              "Content-Type": "text/html; charset=utf-8",
              "Cache-Control": "no-store",
            },
          },
        );
      }
    })(),
  );
});
