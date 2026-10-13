import { openDB, DBSchema, IDBPDatabase } from "idb";
import type { MenuItem, Category, Order, OrderItem, Setting } from "./supabase";

interface POSDBSchema extends DBSchema {
  menu: {
    key: string;
    value: MenuItem;
    indexes: { "by-category": string };
  };
  categories: {
    key: string;
    value: Category;
  };
  orders: {
    key: string;
    value: Order & {
      _items: OrderItem[];
      _syncStatus: "PENDING" | "SYNCED" | "FAILED";
    };
    indexes: { "by-sync": string; "by-branch": string };
  };
  settings: {
    key: string;
    value: Setting;
  };
  shifts: {
    key: string;
    value: {
      id: string;
      branchId: string;
      shiftNumber: string;
      operatorName: string;
      openingCash: number;
      totalSales: number;
      totalOrders: number;
      status: "OPEN" | "CLOSED";
      openedAt: string;
    };
  };
}

let db: IDBPDatabase<POSDBSchema> | null = null;

async function getDB(): Promise<IDBPDatabase<POSDBSchema>> {
  if (db) return db;
  db = await openDB<POSDBSchema>("biryani-house-pos", 1, {
    upgrade(database) {
      // Menu items store
      const menuStore = database.createObjectStore("menu", { keyPath: "id" });
      menuStore.createIndex("by-category", "category_id");

      // Categories store
      database.createObjectStore("categories", { keyPath: "id" });

      // Orders store
      const ordersStore = database.createObjectStore("orders", {
        keyPath: "id",
      });
      ordersStore.createIndex("by-sync", "_syncStatus");
      ordersStore.createIndex("by-branch", "branch_id");

      // Settings store
      database.createObjectStore("settings", { keyPath: "key" });

      // Shifts store
      database.createObjectStore("shifts", { keyPath: "id" });
    },
  });
  return db;
}

// ── Menu ──────────────────────────────────────────────────────────

export async function cacheMenuItems(items: MenuItem[]): Promise<void> {
  const database = await getDB();
  const tx = database.transaction("menu", "readwrite");
  await tx.store.clear();
  await Promise.all([...items.map((item) => tx.store.put(item)), tx.done]);
}

export async function getCachedMenuItems(): Promise<MenuItem[]> {
  const database = await getDB();
  return database.getAll("menu");
}

export async function cacheCategories(categories: Category[]): Promise<void> {
  const database = await getDB();
  const tx = database.transaction("categories", "readwrite");
  await tx.store.clear();
  await Promise.all([...categories.map((cat) => tx.store.put(cat)), tx.done]);
}

export async function getCachedCategories(): Promise<Category[]> {
  const database = await getDB();
  return database.getAll("categories");
}

// ── Orders ────────────────────────────────────────────────────────

export async function saveOfflineOrder(
  order: Order,
  items: OrderItem[],
): Promise<void> {
  const database = await getDB();
  await database.put("orders", {
    ...order,
    _items: items,
    _syncStatus: "PENDING",
  });
}

export async function getPendingOrders(): Promise<
  (Order & {
    _items: OrderItem[];
    _syncStatus: "PENDING" | "SYNCED" | "FAILED";
  })[]
> {
  const database = await getDB();
  const pending = await database.getAllFromIndex(
    "orders",
    "by-sync",
    "PENDING",
  );
  const failed = await database.getAllFromIndex("orders", "by-sync", "FAILED");
  return [...pending, ...failed];
}

export async function markOrderSynced(orderId: string): Promise<void> {
  const database = await getDB();
  const tx = database.transaction("orders", "readwrite");
  const order = await tx.store.get(orderId);
  if (order) {
    await tx.store.put({ ...order, _syncStatus: "SYNCED" });
  }
  await tx.done;
}

export async function markOrderFailed(orderId: string): Promise<void> {
  const database = await getDB();
  const tx = database.transaction("orders", "readwrite");
  const order = await tx.store.get(orderId);
  if (order) {
    await tx.store.put({ ...order, _syncStatus: "FAILED" });
  }
  await tx.done;
}

// ── Settings ──────────────────────────────────────────────────────

export async function cacheSettings(settings: Setting[]): Promise<void> {
  const database = await getDB();
  const tx = database.transaction("settings", "readwrite");
  await Promise.all([...settings.map((s) => tx.store.put(s)), tx.done]);
}

export async function getCachedSetting(key: string): Promise<string | null> {
  const database = await getDB();
  const setting = await database.get("settings", key);
  return setting?.value ?? null;
}

// ── Shifts ────────────────────────────────────────────────────────

export async function saveLocalShift(shift: {
  id: string;
  branchId: string;
  shiftNumber: string;
  operatorName: string;
  openingCash: number;
  totalSales: number;
  totalOrders: number;
  status: "OPEN" | "CLOSED";
  openedAt: string;
}): Promise<void> {
  const database = await getDB();
  await database.put("shifts", shift);
}

export async function getLocalShift(shiftId: string) {
  const database = await getDB();
  return database.get("shifts", shiftId);
}
