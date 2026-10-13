const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");

function workerHarness() {
  const handlers = {};
  const stores = new Map();
  let online = true;
  let now = 1000;
  const key = (request) =>
    new URL(
      typeof request === "string" ? request : request.url,
      "https://pos.test",
    ).href;
  const caches = {
    delete: async (name) => stores.delete(name),
    open: async (name) => {
      if (!stores.has(name)) stores.set(name, new Map());
      const store = stores.get(name);
      return {
        match: async (request) => store.get(key(request))?.clone(),
        put: async (request, response) =>
          store.set(key(request), response.clone()),
      };
    },
  };
  vm.runInNewContext(fs.readFileSync("public/pos-sw.js", "utf8"), {
    self: {
      location: { origin: "https://pos.test" },
      addEventListener: (name, handler) => {
        handlers[name] = handler;
      },
      skipWaiting() {},
      clients: { claim: async () => {} },
    },
    caches,
    URL,
    Response,
    Date: { now: () => now },
    fetch: async (request) => {
      if (!online) throw TypeError("Network unavailable");
      const url = key(request);
      if (url.endsWith("/api/offline-context"))
        return Response.json({ context: "staff:shop", expires: 10000 });
      if (url.endsWith("/pos"))
        return new Response(
          '<html><script src="/_next/static/app.js"></script>POS</html>',
          { headers: { "Content-Type": "text/html" } },
        );
      return new Response("asset");
    },
  });
  return {
    setOnline: (value) => {
      online = value;
    },
    expire: () => {
      now = 20000;
    },
    message: async (data) => {
      let done, reply;
      handlers.message({
        data,
        ports: [
          {
            postMessage: (value) => {
              reply = value;
            },
          },
        ],
        waitUntil: (promise) => {
          done = promise;
        },
      });
      await done;
      return reply;
    },
    request: async (path, mode = "navigate", method = "GET") => {
      let result;
      handlers.fetch({
        request: { url: "https://pos.test" + path, mode, method },
        respondWith: (promise) => {
          result = promise;
        },
      });
      return result;
    },
  };
}
test("prepared POS and its assets reopen offline; APIs and reports are not cached", async () => {
  const worker = workerHarness();
  assert.equal(
    (await worker.message({ type: "PREPARE", context: "staff:shop" })).ready,
    true,
  );
  worker.setOnline(false);
  assert.match(await (await worker.request("/pos")).text(), /POS/);
  assert.equal(
    await (await worker.request("/_next/static/app.js", "cors")).text(),
    "asset",
  );
  assert.equal(await worker.request("/api/orders", "cors"), undefined);
  assert.equal((await worker.request("/reports")).status, 503);
  assert.equal(
    (await worker.message({ type: "STATUS", context: "another:shop" })).ready,
    false,
  );
});
test("offline POS is unavailable before preparation and after session expiry", async () => {
  const worker = workerHarness();
  worker.setOnline(false);
  assert.equal((await worker.request("/pos")).status, 503);
  worker.setOnline(true);
  await worker.message({ type: "PREPARE", context: "staff:shop" });
  worker.expire();
  worker.setOnline(false);
  assert.equal((await worker.request("/pos")).status, 503);
});
test("login, logout and branch switching invalidate the private offline screen", async () => {
  for (const path of [
    "/api/auth/login",
    "/api/auth/logout",
    "/api/auth/branch",
  ]) {
    const worker = workerHarness();
    await worker.message({ type: "PREPARE", context: "staff:shop" });
    await worker.request(path, "cors", "POST");
    worker.setOnline(false);
    assert.equal((await worker.request("/pos")).status, 503);
  }
});
test("preparing an offline screen for the wrong cashier fails", async () => {
  const worker = workerHarness();
  assert.equal(
    (await worker.message({ type: "PREPARE", context: "another:shop" })).ready,
    false,
  );
  worker.setOnline(false);
  assert.equal((await worker.request("/pos")).status, 503);
});
