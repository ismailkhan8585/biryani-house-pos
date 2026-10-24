const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const vm = require("node:vm");
const { PGlite } = require("@electric-sql/pglite");
function load(file, mocks = {}) {
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    {
      exports,
      require: (n) => {
        if (n in mocks) return mocks[n];
        if (n.startsWith("@/")) return load(n.slice(2) + ".ts", mocks);
        if (n.startsWith("."))
          return load(path.join(path.dirname(file), n) + ".ts", mocks);
        return require(n);
      },
      console,
      Date,
      Intl,
      URL,
      Headers,
      Buffer,
      TextEncoder,
      process,
      crypto: require("node:crypto").webcrypto,
      ...(mocks.__globals || {}),
    },
  );
  return exports;
}
const ops = load("lib/operations.ts");
test("connection snapshots match during SSR and offline browser hydration", () => {
  for (const navigator of [undefined, {}, { onLine: true }, { onLine: false }]) {
    const { useConnectionStore: store } = load("stores/pos-connection.ts", {
      __globals: { navigator },
    });
    assert.equal(store.getInitialState().isOnline, true);
    store.getState().setOnline(false);
    assert.equal(store.getState().isOnline, false);
    assert.equal(store.getInitialState().isOnline, true);
    store.getState().setOnline(true);
    assert.equal(store.getState().isOnline, true);
  }
});
test("settings reject unknown keys and invalid values before saving", async () => {
  let saved,
    writes = 0;
  const api = load("lib/api.ts", {
    "./auth": { getAuth: async () => ({ role: "admin", staffId: "owner" }) },
  });
  const route = load("app/api/settings/route.ts", {
    "@/lib/api": api,
    "@/lib/supabase": {
      createServerClient: () => ({
        from: () => ({
          upsert: async (values) => {
            writes++;
            saved = values;
            return {};
          },
        }),
      }),
    },
  });
  const call = (body) =>
    route.POST(
      new (require("next/server").NextRequest)(
        "http://localhost/api/settings",
        { method: "POST", body: JSON.stringify(body) },
      ),
    );
  for (const body of [
    null,
    [],
    {},
    { secret: "value" },
    { restaurant_name: " " },
    { tax_rate: "" },
    { tax_rate: "101" },
    { tax_enabled: "yes" },
    { receipt_footer: {} },
  ])
    assert.equal((await call(body)).status, 400);
  assert.equal(writes, 0);
  assert.equal(
    (
      await call({
        restaurant_name: "Ilyas",
        tax_enabled: "true",
        tax_rate: "16.25",
        jazzcash_title: "Shop account",
      })
    ).status,
    200,
  );
  assert.equal(writes, 1);
  assert.equal(saved.find((row) => row.key === "tax_rate").value, "16.25");
});

test("staff settings validate identity, branch, password reset and missing accounts", async () => {
  let saved,
    activeBranch = true,
    missing = false,
    duplicate = false;
  const api = load("lib/api.ts", {
    "./auth": { getAuth: async () => ({ role: "admin", staffId: "owner" }) },
  });
  const db = {
    from: (table) => {
      const q = {
        select: () => q,
        eq: () => q,
        update: (values) => {
          saved = values;
          return q;
        },
        insert: (values) => {
          saved = values;
          return q;
        },
        maybeSingle: async () =>
          table === "branches"
            ? { data: activeBranch ? { id: "shop" } : null }
            : {
                data: missing ? null : { id: "staff" },
                error: duplicate ? { code: "23505" } : null,
              },
      };
      return q;
    },
  };
  const route = load("app/api/staff/route.ts", {
    "@/lib/api": api,
    "@/lib/supabase": { createServerClient: () => db },
  });
  const call = (body) =>
    route.POST(
      new (require("next/server").NextRequest)("http://localhost/api/staff", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    );
  const staff = {
    name: "Cashier",
    username: "cashier",
    role: "branch",
    branch_id: "shop",
    password: "test-password-987",
  };
  for (const values of [
    { name: " " },
    { username: "bad name" },
    { password: "x" },
    { password: "a".repeat(201) },
    { is_active: "false" },
  ])
    assert.equal((await call({ ...staff, ...values })).status, 400);
  activeBranch = false;
  assert.equal((await call(staff)).status, 400);
  activeBranch = true;
  assert.equal((await call(staff)).status, 200);
  assert.equal(
    load("lib/password.ts").checkPassword(staff.password, saved.password_hash),
    true,
  );
  assert.equal(
    (await call({ ...staff, id: "staff", password: "" })).status,
    200,
  );
  assert.equal(saved.password_hash, undefined);
  assert.equal(
    (await call({ ...staff, id: "owner", is_active: false })).status,
    400,
  );
  missing = true;
  assert.equal((await call({ ...staff, id: "missing" })).status, 404);
  missing = false;
  duplicate = true;
  assert.equal((await call(staff)).status, 409);
});
test("category forms create and edit allowed fields with server validation and admin permissions", async () => {
  let actor = { role: "admin", staffId: "owner", branchId: "all" };
  let saved,
    editedId,
    writes = 0;
  const id = "11111111-1111-4111-8111-111111111111";
  const db = {
    from: (table) => {
      assert.equal(table, "categories");
      const q = {
        insert: (values) => {
          saved = values;
          writes++;
          return q;
        },
        update: (values) => {
          saved = values;
          writes++;
          return q;
        },
        eq: (key, value) => {
          assert.equal(key, "id");
          editedId = value;
          return q;
        },
        select: () => q,
        maybeSingle: async () => ({ data: { id, ...saved, is_active: true } }),
      };
      return q;
    },
  };
  const api = load("lib/api.ts", { "./auth": { getAuth: async () => actor } });
  const route = load("app/api/categories/route.ts", {
    "@/lib/api": api,
    "@/lib/supabase": { createServerClient: () => db },
  });
  const call = (method, data) =>
    route[method](
      new (require("next/server").NextRequest)(
        "http://localhost/api/categories",
        { method, body: JSON.stringify(data) },
      ),
    );
  const values = {
    name_en: "  Rice dishes  ",
    name_ur: "بریانی",
    icon: "🍛",
    sort_order: 4,
    is_active: false,
    created_at: "forged",
    id,
  };
  assert.equal((await call("POST", values)).status, 201);
  assert.equal(saved.name_en, "Rice dishes");
  assert.equal(saved.is_active, undefined);
  assert.equal(saved.id, undefined);
  assert.equal(saved.created_at, undefined);
  assert.equal(
    (
      await call("PATCH", {
        ...values,
        name_en: "Biryani & Pulao",
        sort_order: 1,
      })
    ).status,
    200,
  );
  assert.equal(editedId, id);
  assert.equal(saved.sort_order, 1);
  const before = writes;
  for (const invalid of [
    { name_en: " " },
    { name_en: "a".repeat(101) },
    { icon: "" },
    { sort_order: -1 },
    { sort_order: 1.5 },
  ]) {
    assert.equal((await call("POST", { ...values, ...invalid })).status, 400);
  }
  assert.equal((await call("PATCH", { ...values, id: "bad" })).status, 400);
  actor = { role: "branch", staffId: "cashier", branchId: "shop" };
  assert.equal((await call("POST", values)).status, 403);
  assert.equal((await call("PATCH", values)).status, 403);
  actor = null;
  assert.equal((await call("POST", values)).status, 401);
  assert.equal(writes, before);
});
test("payment transport queues connection failures but preserves HTTP rejections", async () => {
  let mode = "online";
  const transport = load("lib/sale-transport.ts", {
    __globals: {
      AbortController,
      TypeError,
      setTimeout,
      clearTimeout,
      fetch: async () => {
        if (mode === "offline") throw TypeError("Lost connection");
        return { status: mode === "unauthorized" ? 401 : 200 };
      },
    },
  });
  assert.equal((await transport.sendSale("/api/orders", {})).status, 200);
  mode = "offline";
  assert.equal(await transport.sendSale("/api/orders", {}), null);
  mode = "unauthorized";
  assert.equal((await transport.sendSale("/api/orders", {})).status, 401);
});
test("receipt numbers stay unique when terminals create sales in the same millisecond", () => {
  const { generateOrderNumber } = load("lib/utils.ts");
  const numbers = Array.from({ length: 1000 }, () => generateOrderNumber());
  assert.equal(new Set(numbers).size, numbers.length);
  assert.ok(numbers.every((number) => number.length <= 50));
});
test("sync retains failed sales and retries the same identifier after reconnecting", async () => {
  const rows = [
    {
      id: "local-1",
      offline_order_id: "stable-sale-1",
      _syncStatus: "PENDING",
    },
  ];
  const sent = [];
  let connected = false;
  const state = {};
  const sync = load("lib/pos-sync.ts", {
    "./pos-db-local": {
      getPendingOrders: async () =>
        rows.filter((o) => o._syncStatus !== "SYNCED"),
      markOrderFailed: async (id) => {
        rows.find((o) => o.id === id)._syncStatus = "FAILED";
      },
      markOrderSynced: async (id) => {
        rows.find((o) => o.id === id)._syncStatus = "SYNCED";
      },
    },
    "@/stores/pos-connection": {
      useConnectionStore: {
        setState: (update) => Object.assign(state, update),
      },
    },
    __globals: {
      fetch: async (_url, options) => {
        sent.push(JSON.parse(options.body).orders[0].offline_order_id);
        if (!connected) throw TypeError("Internet unavailable");
        return { ok: true, json: async () => ({ syncedIds: ["local-1"] }) };
      },
    },
  });
  assert.equal((await sync.syncPendingOrders()).failed, 1);
  assert.equal(rows[0]._syncStatus, "FAILED");
  assert.equal(state.pendingSyncCount, 1);
  connected = true;
  assert.equal((await sync.syncPendingOrders()).synced, 1);
  assert.deepEqual(sent, ["stable-sale-1", "stable-sale-1"]);
  assert.equal(state.pendingSyncCount, 0);
  assert.equal(state.isSyncing, false);
});

test("expired-session sync responses never mark a local sale as synced", async () => {
  let markedSynced = false,
    markedFailed = false;
  const sync = load("lib/pos-sync.ts", {
    "./pos-db-local": {
      getPendingOrders: async () => [{ id: "local-1" }],
      markOrderFailed: async () => {
        markedFailed = true;
      },
      markOrderSynced: async () => {
        markedSynced = true;
      },
    },
    "@/stores/pos-connection": { useConnectionStore: { setState() {} } },
    __globals: {
      fetch: async () => ({
        ok: false,
        json: async () => ({ error: "Please sign in again" }),
      }),
    },
  });
  assert.equal((await sync.syncPendingOrders()).failed, 1);
  assert.equal(markedFailed, true);
  assert.equal(markedSynced, false);
});
test("session verification rejects expired, forged and incomplete tokens", async () => {
  const { SignJWT } = await import("jose");
  const oldSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "test-only-secret-32-characters-long";
  try {
    const auth = load("lib/auth.ts", {
      "next/headers": {},
      "./supabase": {},
      jose: await import("jose"),
    });
    const payload = {
      staffId: "staff",
      staffName: "Name",
      role: "admin",
      branchId: "all",
      branchName: "All Branches",
    };
    assert.equal(
      (await auth.verifyToken(await auth.signToken(payload))).role,
      "admin",
    );
    assert.equal(await auth.verifyToken("invalid-token"), null);
    const expired = await new SignJWT(payload)
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime(1)
      .sign(new TextEncoder().encode(process.env.JWT_SECRET));
    assert.equal(await auth.verifyToken(expired), null);
    const incomplete = await auth.signToken({ ...payload, branchId: "" });
    assert.equal(await auth.verifyToken(incomplete), null);
    const unscoped = await auth.signToken({ ...payload, role: "branch" });
    assert.equal(await auth.verifyToken(unscoped), null);
  } finally {
    if (oldSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = oldSecret;
  }
});
test("login handles both roles, invalid credentials, disabled accounts and branch assignment", async () => {
  const { hashPassword } = load("lib/password.ts");
  const password = "Test-only-Password-847!";
  const password_hash = hashPassword(password);
  for (const scenario of [
    { role: "admin", status: 200 },
    { role: "branch", status: 200 },
    { role: "branch", password: "wrong", status: 401 },
    { role: "admin", active: false, status: 401 },
    { role: "branch", active: false, status: 401 },
    { role: "unknown", status: 401 },
    { role: "branch", requestedBranch: "other", status: 403 },
    { role: "admin", selectedRole: "admin", status: 200 },
    { role: "branch", selectedRole: "branch", status: 200 },
    { role: "branch", selectedRole: "admin", status: 403 },
    { role: "admin", selectedRole: "branch", status: 403 },
    { role: "admin", selectedRole: "manager", status: 400 },
    { role: "branch", unavailableBranch: true, status: 403 },
    { role: "admin", rateLimited: true, status: 429 },
    { role: "admin", username: " ", status: 400 },
    { role: "admin", password: "", status: 400 },
  ]) {
    let signed;
    let lookedUpUsername;
    const db = {
      rpc: async () => ({ data: !scenario.rateLimited }),
      from: (table) => {
        const q = {
          select: () => q,
          eq: (key, value) => {
            if (key === "username") lookedUpUsername = value;
            return q;
          },
          maybeSingle: async () => ({
            data: {
              id: "person",
              name: "Cashier",
              role: scenario.role,
              branch_id: "shop",
              is_active: scenario.active !== false,
              password_hash,
            },
          }),
          single: async () => ({
            data:
              table === "branches" && !scenario.unavailableBranch
                ? { id: "shop", name: "Main shop" }
                : null,
          }),
        };
        return q;
      },
    };
    const api = load("lib/api.ts", { "./auth": { getAuth: async () => null } });
    const route = load("app/api/auth/login/route.ts", {
      "@/lib/api": api,
      "@/lib/supabase": { createServerClient: () => db },
      "@/lib/auth": {
        signToken: async (payload) => {
          signed = payload;
          return "test-token";
        },
      },
    });
    const res = await route.POST(
      new (require("next/server").NextRequest)(
        "http://localhost/api/auth/login",
        {
          method: "POST",
          body: JSON.stringify({
            username: scenario.username ?? " CASHIER ",
            password: scenario.password ?? password,
            branchId: scenario.requestedBranch,
            role: scenario.selectedRole,
          }),
        },
      ),
    );
    assert.equal(res.status, scenario.status, JSON.stringify(scenario));
    if (scenario.status === 200) {
      assert.equal(lookedUpUsername, "cashier");
      assert.equal(signed.staffId, "person");
      assert.equal(signed.branchId, scenario.role === "admin" ? "all" : "shop");
      assert.equal((await res.json()).role, scenario.role);
      assert.match(res.headers.get("set-cookie"), /HttpOnly/i);
      assert.match(res.headers.get("set-cookie"), /SameSite=strict/i);
    } else {
      assert.equal(signed, undefined);
      assert.equal(res.headers.get("set-cookie"), null);
    }
  }
});

test("home and login redirect signed-in users by role", async () => {
  for (const file of ["app/page.tsx", "app/login/layout.tsx"]) {
    for (const role of ["admin", "branch", null]) {
      const page = load(file, {
        "@/lib/auth": { getAuth: async () => (role ? { role } : null) },
        "next/navigation": {
          redirect: (url) => {
            throw Error("redirect:" + url);
          },
        },
      });
      if (!role && file.includes("layout")) {
        assert.equal(await page.default({ children: "login" }), "login");
      } else {
        await assert.rejects(
          () => page.default({ children: "login" }),
          new RegExp(
            "redirect:" +
              (role === "admin" ? "/admin" : role ? "/pos" : "/login"),
          ),
        );
      }
    }
  }
});

test("active sessions reject disabled, reassigned and role-changed staff", async () => {
  for (const scenario of [
    "active",
    "disabled",
    "reassigned",
    "demoted",
    "branch-disabled",
  ]) {
    const auth = load("lib/auth.ts", {
      jose: {
        jwtVerify: async () => ({
          payload: {
            staffId: "staff",
            staffName: "Name",
            role: "branch",
            branchId: "shop",
            branchName: "Shop",
            exp: 9999999999,
          },
        }),
      },
      "next/headers": {
        cookies: async () => ({ get: () => ({ value: "token" }) }),
      },
      "./supabase": {
        createServerClient: () => ({
          from: (table) => {
            const q = {
              select: () => q,
              eq: () => q,
              single: async () => ({
                data:
                  table === "staff"
                    ? {
                        name: "Current name",
                        role: scenario === "demoted" ? "admin" : "branch",
                        branch_id: scenario === "reassigned" ? "other" : "shop",
                        is_active: scenario !== "disabled",
                      }
                    : scenario === "branch-disabled"
                      ? null
                      : { name: "Shop" },
              }),
            };
            return q;
          },
        }),
      },
      process: process,
    });
    const oldSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = "test-only-secret-32-characters-long";
    try {
      const session = await auth.getAuth();
      assert.equal(!!session, scenario === "active");
    } finally {
      if (oldSecret === undefined) delete process.env.JWT_SECRET;
      else process.env.JWT_SECRET = oldSecret;
    }
  }
});
test("configured tax follows discount, quantities and new carts", () => {
  const utils = load("lib/utils.ts");
  assert.equal(
    utils.configuredTaxRate({ tax_enabled: "false", tax_rate: "16" }),
    0,
  );
  assert.equal(
    utils.configuredTaxRate({ tax_enabled: "true", tax_rate: "16" }),
    16,
  );
  assert.throws(() =>
    utils.configuredTaxRate({ tax_enabled: "true", tax_rate: "NaN" }),
  );
  const { useCartStore: store } = load("stores/pos-cart.ts", {
    "zustand/middleware": { persist: (initializer) => initializer },
  });
  store.getState().setTaxRate(16);
  store.getState().addItem({ id: "dish", name_en: "Biryani", price: 500 });
  assert.equal(store.getState().total, 580);
  store.getState().setDiscount(10, "PERCENT");
  assert.equal(store.getState().taxAmount, 72);
  assert.equal(store.getState().total, 522);
  store.getState().updateQuantity(store.getState().items[0].id, 2);
  assert.equal(store.getState().total, 1044);
  store.getState().newOrder();
  store.getState().addItem({ id: "dish", name_en: "Biryani", price: 500 });
  assert.equal(store.getState().total, 580);
  store.getState().setTaxRate(0);
  assert.equal(store.getState().total, 500);
});

test("server rejects live sales with tax different from configured settings", async () => {
  let wrote = false;
  const db = {
    from: (table) => {
      const result = {
        data:
          table === "orders"
            ? null
            : table === "shifts"
              ? { opened_at: "2026-01-01" }
              : table === "menu_items"
                ? [{ id: "dish", price: 500, is_available: true }]
                : [
                    { key: "tax_enabled", value: "true" },
                    { key: "tax_rate", value: "16" },
                  ],
      };
      const query = {
        select: () => query,
        eq: () => query,
        in: () => query,
        maybeSingle: async () => result,
        single: async () => result,
        then: (resolve) => Promise.resolve(result).then(resolve),
      };
      return query;
    },
    rpc: () => {
      wrote = true;
      throw Error("Unexpected write");
    },
  };
  const { createOrder } = load("lib/order-service.ts", {
    "./supabase": { createServerClient: () => db },
    "./auth": { getAuth: async () => null },
  });
  await assert.rejects(
    () =>
      createOrder(
        { role: "branch", branchId: "shop", staffId: "cashier" },
        {
          branchId: "shop",
          shiftId: "shift",
          offlineOrderId: "retry",
          orderType: "TAKEAWAY",
          items: [
            {
              menuItemId: "dish",
              name: "Biryani",
              unitPrice: 500,
              quantity: 1,
            },
          ],
          discount: 0,
          discountType: "AMOUNT",
          tax: 0,
          totalAmount: 500,
        },
      ),
    /Tax settings changed/,
  );
  assert.equal(wrote, false);
});
test("consistent total, unpaid, completed, cancelled, revenue and split totals", () => {
  const rows = [
    { order_status: "PENDING", payment_status: "UNPAID", total_amount: 300 },
    {
      order_status: "COMPLETED",
      payment_status: "PAID",
      payment_method: "CASH",
      total_amount: 500,
    },
    { order_status: "CANCELLED", payment_status: "UNPAID", total_amount: 200 },
    {
      order_status: "COMPLETED",
      payment_status: "REFUNDED",
      total_amount: 100,
    },
    {
      order_status: "COMPLETED",
      payment_status: "PAID",
      payment_method: "SPLIT",
      cash_amount: 100,
      total_amount: 300,
    },
    {
      order_status: "COMPLETED",
      payment_status: "PAID",
      payment_method: "SPLIT",
      total_amount: 200,
    },
  ];
  const s = ops.summarizeOrders(rows);
  assert.equal(s.totalOrders, 6);
  assert.equal(s.unpaidOrders, 1);
  assert.equal(s.completedOrders, 4);
  assert.equal(s.cancelledOrders, 1);
  assert.equal(s.totalRevenue, 1000);
  assert.equal(s.cashSales, 600);
  assert.equal(s.digitalSales, 200);
  assert.equal(s.unallocatedSplitSales, 200);
});
test("Pakistan day boundary and invalid dates", () => {
  assert.equal(ops.businessDate("2026-10-08T19:30:00Z"), "2026-10-09");
  assert.equal(ops.dayBounds("2026-10-09")[0], "2026-10-09T00:00:00.000+05:00");
  assert.throws(() => ops.dayBounds("2026-02-31"));
});
test("free tables cannot display history; occupied tables display only current open bill", () => {
  const orders = [
    { id: "old", order_status: "COMPLETED" },
    { id: "active", order_status: "PENDING" },
  ];
  assert.equal(
    ops.activeTableOrders(
      { status: "AVAILABLE", current_order_id: "old" },
      orders,
    ).length,
    0,
  );
  assert.equal(
    ops.activeTableOrders(
      { status: "OCCUPIED", current_order_id: "active" },
      orders,
    )[0].id,
    "active",
  );
});
test("server branch scopes reject cross-branch and All Branches sales", () => {
  const { branchScope } = load("lib/api.ts", {
    "./auth": {},
    "next/server": {},
  });
  assert.throws(
    () => branchScope({ role: "branch", branchId: "one" }, "two"),
    /denied/,
  );
  assert.throws(
    () => branchScope({ role: "admin", branchId: "all" }, null),
    /Select/,
  );
  assert.equal(
    branchScope({ role: "admin", branchId: "all" }, null, true),
    null,
  );
});
test("passwords are salted and checked without plaintext storage", () => {
  const { hashPassword, checkPassword } = load("lib/password.ts");
  const a = hashPassword("example-password");
  assert.notEqual(a, hashPassword("example-password"));
  assert.equal(checkPassword("example-password", a), true);
  assert.equal(checkPassword("wrong", a), false);
});
test("receipt uses branch snapshot and escapes customer content", () => {
  const { generateReceiptHTML } = load("lib/receipt.ts");
  const html = generateReceiptHTML(
    {
      order_number: "bill",
      order_type: "DELIVERY",
      created_at: "2026-10-09T05:00:00Z",
      subtotal: 1000,
      discount: 10,
      discount_type: "PERCENT",
      tax: 0,
      total_amount: 900,
      payment_status: "PAID",
      payment_method: "CASH",
      customer_name: "<script>x</script>",
      receipt_branch: {
        name: "Branch Two",
        address: "Correct address",
        phone: "123",
      },
      branches: { name: "Wrong branch" },
    },
    [{ item_name: "Rice", quantity: 1, total_price: 1000 }],
    {},
  );
  assert.match(html, /Correct address/);
  assert.match(html, /Branch Two/);
  assert.doesNotMatch(html, /<script>/);
  assert.doesNotMatch(html, /Wrong branch/);
  assert.match(html, /-100/);
});
test("database migration and transaction workflows preserve data and enforce ownership", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      "CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;",
    );
    const schema = fs
      .readFileSync("schema.sql", "utf8")
      .split("-- 10. REALTIME CONFIGURATION")[0]
      .replace(/CREATE EXTENSION[^;]+;/, "");
    await db.exec(schema);
    const one = "11111111-1111-1111-1111-111111111111",
      two = "22222222-2222-2222-2222-222222222222";
    const cashier = "aaaaaaaa-1111-1111-1111-111111111111",
      other = "aaaaaaaa-2222-2222-2222-222222222222",
      admin = "aaaaaaaa-3333-3333-3333-333333333333",
      tid = "bbbbbbbb-1111-1111-1111-111111111111",
      mid = "cccccccc-1111-1111-1111-111111111111";
    await db.query("INSERT INTO branches(id,name) VALUES($1,$2),($3,$4)", [
      one,
      "Main",
      two,
      "City",
    ]);
    await db.query(
      "INSERT INTO restaurant_tables(id,branch_id,table_number,status) VALUES($1,$2,10,$3)",
      [tid, one, "OCCUPIED"],
    );
    await db.query(
      "INSERT INTO menu_items(id,name_en,price) VALUES($1,'Rice',500)",
      [mid],
    );
    const old = (
      await db.query(
        "INSERT INTO orders(order_number,branch_id,table_id,order_status,payment_status,total_amount) VALUES('historic',$1,$2,'COMPLETED','PAID',250) RETURNING id",
        [one, tid],
      )
    ).rows[0].id;
    await db.query(
      "UPDATE restaurant_tables SET current_order_id=$1 WHERE id=$2",
      [old, tid],
    );
    await db.exec(
      fs.readFileSync("migrations/20261009_operations.sql", "utf8"),
    );
    assert.equal(
      (await db.query("SELECT total_amount FROM orders WHERE id=$1", [old]))
        .rows[0].total_amount,
      "250.00",
    );
    assert.equal(
      (
        await db.query("SELECT status FROM restaurant_tables WHERE id=$1", [
          tid,
        ])
      ).rows[0].status,
      "AVAILABLE",
    );
    await db.query(
      "INSERT INTO staff(id,username,name,password_hash,role,branch_id) VALUES($1,'cashier','Cashier','hash','branch',$4),($2,'other','Other','hash','branch',$5),($3,'owner','Owner','hash','admin',NULL)",
      [cashier, other, admin, one, two],
    );
    const rpc = async (name, params) =>
      (
        await db.query(
          "SELECT " +
            name +
            "(" +
            params.map((_, i) => "$" + (i + 1)).join(",") +
            ") AS result",
          params,
        )
      ).rows[0].result;
    await assert.rejects(() => rpc("pos_open_shift", [cashier, two, 0]));
    const shift = await rpc("pos_open_shift", [cashier, one, 100]);
    assert.equal(
      (await rpc("pos_open_shift", [cashier, one, 500])).id,
      shift.id,
    );
    await assert.rejects(() => rpc("pos_open_shift", [cashier, one, -1]));
    const items = [
      {
        menu_item_id: mid,
        item_name: "Rice",
        quantity: 1,
        unit_price: 500,
        total_price: 500,
      },
    ];
    let sequence = 0;
    const payload = (extra = {}) => ({
      order_number: "test-" + ++sequence,
      branch_id: one,
      shift_id: shift.id,
      order_type: "TAKEAWAY",
      table_id: null,
      table_number: null,
      subtotal: 500,
      discount: 0,
      discount_type: "AMOUNT",
      tax: 0,
      total_amount: 500,
      payment_method: "CASH",
      payment_status: "PAID",
      order_status: "COMPLETED",
      cash_amount: 500,
      offline_order_id: "offline-" + sequence,
      sale_source: "ONLINE",
      created_at: new Date().toISOString(),
      receipt_branch: { name: "Main" },
      ...extra,
    });
    const create = (p, person = cashier, lines = items) =>
      rpc("pos_create_order", [
        JSON.stringify(p),
        JSON.stringify(lines),
        person,
      ]);
    const first = payload();
    const id = await create(first);
    assert.equal(await create(first), id);
    await assert.rejects(() => create(payload(), other));
    await assert.rejects(() => create(payload({ branch_id: two })));
    const before = (await db.query("SELECT count(*) FROM orders")).rows[0]
      .count;
    await assert.rejects(() =>
      create(payload(), cashier, [{ ...items[0], menu_item_id: other }]),
    );
    assert.equal(
      (await db.query("SELECT count(*) FROM orders")).rows[0].count,
      before,
    );
    for (const order_type of ["DINE_IN", "DELIVERY"])
      await create(
        payload({
          order_type,
          table_id: order_type === "DINE_IN" ? tid : null,
          payment_method: "SPLIT",
          cash_amount: 200,
        }),
      );
    const unpaid = await create(
      payload({
        order_type: "DINE_IN",
        table_id: tid,
        table_number: 10,
        payment_method: null,
        payment_status: "UNPAID",
        order_status: "PENDING",
        cash_amount: 0,
      }),
    );
    assert.equal(
      (
        await db.query("SELECT status FROM restaurant_tables WHERE id=$1", [
          tid,
        ])
      ).rows[0].status,
      "OCCUPIED",
    );
    await assert.rejects(() =>
      rpc("pos_cancel_order", [unpaid, cashier, "Mistake"]),
    );
    await assert.rejects(() => rpc("pos_cancel_order", [unpaid, admin, ""]));
    await rpc("pos_cancel_order", [unpaid, admin, "Customer left"]);
    assert.equal(
      (
        await db.query("SELECT cancellation_reason FROM orders WHERE id=$1", [
          unpaid,
        ])
      ).rows[0].cancellation_reason,
      "Customer left",
    );
    assert.equal(
      (
        await db.query(
          "SELECT current_order_id FROM restaurant_tables WHERE id=$1",
          [tid],
        )
      ).rows[0].current_order_id,
      null,
    );
    await assert.rejects(() =>
      rpc("pos_cancel_order", [id, admin, "No refund"]),
    );
    const due = await create(
      payload({
        order_type: "DINE_IN",
        table_id: tid,
        payment_method: null,
        payment_status: "UNPAID",
        order_status: "PENDING",
        cash_amount: 0,
      }),
    );
    await assert.rejects(() =>
      rpc("pos_settle_order", [due, shift.id, other, "CASH", 500]),
    );
    await rpc("pos_settle_order", [due, shift.id, cashier, "CASH", 500]);
    assert.equal(
      (await db.query("SELECT payment_status FROM orders WHERE id=$1", [due]))
        .rows[0].payment_status,
      "PAID",
    );
    assert.equal(
      (
        await db.query("SELECT status FROM restaurant_tables WHERE id=$1", [
          tid,
        ])
      ).rows[0].status,
      "AVAILABLE",
    );
    await assert.rejects(() => rpc("pos_close_shift", [shift.id, other, 1500]));
    const closed = await rpc("pos_close_shift", [shift.id, cashier, 1500]);
    assert.equal(Number(closed.expected_cash), 1500);
    assert.equal(Number(closed.cash_difference), 0);
    await assert.rejects(() => create(payload()));
    assert.equal(await create(first), id);
    for (let i = 0; i < 10; i++)
      assert.equal(await rpc("pos_login_attempt", ["cashier"]), true);
    assert.equal(await rpc("pos_login_attempt", ["cashier"]), false);
    await db.exec("SET ROLE anon");
    await assert.rejects(() => db.query("SELECT * FROM branches"));
    await assert.rejects(() => rpc("pos_open_shift", [cashier, one, 0]));
    await db.exec("RESET ROLE");
  } finally {
    await db.close();
  }
});

test("date presets stay on business dates regardless of device time zone", () => {
  const range = ops.reportDateRange("month", new Date("2026-10-31T20:00:00Z"));
  assert.equal(range.from, "2026-11-01");
  assert.equal(range.to, "2026-11-01");
  const week = ops.reportDateRange("week", new Date("2026-10-09T08:00:00Z"));
  assert.equal(week.from, "2026-10-03");
  assert.equal(week.to, "2026-10-09");
});

test("report and table APIs enforce branch permission before database access", async () => {
  const next = require("next/server");
  let reads = 0;
  const db = {
    from: () => {
      reads++;
      throw Error("Unexpected read");
    },
  };
  const api = load("lib/api.ts", {
    "./auth": {
      getAuth: async () => ({
        role: "branch",
        branchId: "one",
        staffId: "staff",
      }),
    },
  });
  for (const file of [
    "app/api/reports/route.ts",
    "app/api/tables/route.ts",
    "app/api/orders/route.ts",
  ]) {
    const route = load(file, {
      "@/lib/api": api,
      "@/lib/supabase": { createServerClient: () => db },
      "@/lib/order-service": { ORDER_SELECT: "*" },
    });
    const response = await route.GET(
      new next.NextRequest("http://localhost/api?branchId=two"),
    );
    assert.equal(response.status, 403);
  }
  assert.equal(reads, 0);
});

test("unauthenticated APIs and cashier-only admin mutations fail closed", async () => {
  const req = new (require("next/server").NextRequest)("http://localhost/api", {
    method: "POST",
    body: JSON.stringify({ status: "CANCELLED", reason: "test" }),
  });
  for (const auth of [
    null,
    { role: "branch", branchId: "one", staffId: "staff" },
  ]) {
    const api = load("lib/api.ts", { "./auth": { getAuth: async () => auth } });
    for (const [file, method] of [
      ["app/api/branches/route.ts", "PATCH"],
      ["app/api/staff/route.ts", "POST"],
      ["app/api/menu/route.ts", "POST"],
      ["app/api/settings/route.ts", "POST"],
      ["app/api/orders/[id]/status/route.ts", "PATCH"],
    ]) {
      const route = load(file, {
        "@/lib/api": api,
        "@/lib/auth": { getAuth: async () => auth },
        "@/lib/supabase": {
          createServerClient: () => {
            throw Error("Unexpected database access");
          },
        },
      });
      const response = await route[method](req, {
        params: Promise.resolve({ id: "test" }),
      });
      assert.equal(response.status, auth ? 403 : 401, file);
    }
  }
});

test("reports include every page and unpaid rows, not just paid or first 1000", async () => {
  const rows = Array.from({ length: 1002 }, (_, i) => ({
    id: String(i),
    branch_id: "one",
    order_type: "TAKEAWAY",
    payment_method: "CASH",
    cash_amount: null,
    total_amount: 500,
    created_at: "2026-10-09T06:00:00Z",
    order_status: i === 1001 ? "PENDING" : "COMPLETED",
    payment_status: i === 1001 ? "UNPAID" : "PAID",
    order_items: [],
    branches: { name: "Main", color: "#f97316" },
  }));
  let requests = 0;
  const db = {
    from: () => {
      let start = 0,
        end = 999;
      const q = {
        select: () => q,
        gte: () => q,
        lte: () => q,
        order: () => q,
        eq: () => q,
        range: (a, b) => {
          start = a;
          end = b;
          return q;
        },
        then: (resolve) => {
          requests++;
          return Promise.resolve({
            data: rows.slice(start, end + 1),
            error: null,
          }).then(resolve);
        },
      };
      return q;
    },
  };
  const api = load("lib/api.ts", {
    "./auth": {
      getAuth: async () => ({
        role: "admin",
        branchId: "all",
        staffId: "staff",
      }),
    },
  });
  const route = load("app/api/reports/route.ts", {
    "@/lib/api": api,
    "@/lib/supabase": { createServerClient: () => db },
    "@/lib/order-service": { ORDER_SELECT: "*" },
  });
  const res = await route.GET(
    new (require("next/server").NextRequest)(
      "http://localhost/api/reports?allBranches=true&dateFrom=2026-10-09&dateTo=2026-10-09",
    ),
  );
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.stats.totalOrders, 1002);
  assert.equal(data.stats.unpaidOrders, 1);
  assert.equal(data.stats.completedOrders, 1001);
  assert.equal(data.stats.totalRevenue, 500500);
  assert.equal(requests, 2);
  assert.equal(data.branchStats[0].totalOrders, data.stats.totalOrders);
});

test("retired routes redirect by role and never render a kitchen screen", async () => {
  for (const role of ["admin", "branch"]) {
    const { proxy } = load("proxy.ts", {
      "@/lib/auth": {
        verifyToken: async () => ({
          role,
          branchId: "one",
          branchName: "Main",
          staffId: "staff",
        }),
      },
    });
    for (const url of [
      "/kitchen",
      "/kitchen/queue",
      "/admin/kitchen",
      "/kds",
    ]) {
      const request = new (require("next/server").NextRequest)(
        "http://localhost" + url,
        { headers: { cookie: "pos_token=test" } },
      );
      const res = await proxy(request);
      assert.equal(
        res.headers.get("location"),
        "http://localhost" + (role === "admin" ? "/admin" : "/pos"),
      );
    }
  }
});

test("failed offline orders remain in the retry queue alongside pending orders", async () => {
  const local = load("lib/pos-db-local.ts", {
    idb: {
      openDB: async () => ({
        getAllFromIndex: async (_t, _i, status) => [
          { id: status, _syncStatus: status },
        ],
      }),
    },
  });
  const rows = await local.getPendingOrders();
  assert.equal(rows.length, 2);
  assert.equal(rows[0]._syncStatus, "PENDING");
  assert.equal(rows[1]._syncStatus, "FAILED");
});
