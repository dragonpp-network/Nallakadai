import fs from "fs";
import path from "path";
import {
  INITIAL_BRANCHES,
  INITIAL_BRANDS,
  INITIAL_CATEGORIES,
  INITIAL_ITEMS,
  INITIAL_COUPONS,
  INITIAL_CUSTOMERS,
  INITIAL_CYCLE,
  INITIAL_ORDERS,
} from "./mock-data";

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_FILE = path.join(DATA_DIR, "store.json");
const FALLBACK_DIR = "/tmp/nk-data";
const FALLBACK_FILE = path.join(FALLBACK_DIR, "store.json");

export interface StoreState {
  branches: typeof INITIAL_BRANCHES;
  brands: typeof INITIAL_BRANDS;
  categories: typeof INITIAL_CATEGORIES;
  items: typeof INITIAL_ITEMS;
  coupons: typeof INITIAL_COUPONS;
  customers: typeof INITIAL_CUSTOMERS;
  cycles: (typeof INITIAL_CYCLE)[];
  cycle_items: {
    cycle_id: string;
    item_id: string;
    price: number;
    procurement_cost?: number;
    selling_price?: number;
    discount_percent?: number;
    cap_qty?: number | null;
    min_qty?: number | null;
    max_qty?: number | null;
  }[];
  orders: typeof INITIAL_ORDERS;
  admin_users: {
    id: string;
    email: string;
    password_hash: string;
    full_name: string;
    role: string;
    branch_id: string | null;
    active: boolean;
  }[];
  audit_logs: any[];
}

// Global In-Memory Singleton Cache
declare global {
  var __nk_store: StoreState | undefined;
}

function getDefaultState(): StoreState {
  const cycleItems = INITIAL_ITEMS.map((i) => ({
    cycle_id: INITIAL_CYCLE.id,
    item_id: i.id,
    price: i.price,
    procurement_cost: i.procurement_cost,
    selling_price: i.selling_price,
    discount_percent: i.discount_percent,
    cap_qty: null,
    min_qty: i.min_qty,
    max_qty: i.max_qty,
  }));

  return {
    branches: [...INITIAL_BRANCHES],
    brands: [...INITIAL_BRANDS],
    categories: [...INITIAL_CATEGORIES],
    items: [...INITIAL_ITEMS],
    coupons: [...INITIAL_COUPONS],
    customers: [...INITIAL_CUSTOMERS],
    cycles: [INITIAL_CYCLE],
    cycle_items: cycleItems,
    orders: [...INITIAL_ORDERS],
    admin_users: [
      {
        id: "a0000000-0000-4000-8000-000000000001",
        email: "admin@nallakadai.com",
        password_hash: "admin123",
        full_name: "Super Administrator",
        role: "super_admin",
        branch_id: null,
        active: true,
      },
      {
        id: "a0000000-0000-4000-8000-000000000002",
        email: "superadmin@fresh.nallakadai.com",
        password_hash: "SuperAdmin@2026",
        full_name: "Operations Head",
        role: "super_admin",
        branch_id: null,
        active: true,
      },
      {
        id: "a0000000-0000-4000-8000-000000000003",
        email: "erode.operator@nallakadai.in",
        password_hash: "Nallakadai@2026",
        full_name: "Erode Store Operator",
        role: "branch_admin",
        branch_id: "11111111-1111-4111-8111-111111111111",
        active: true,
      },
    ],
    audit_logs: [],
  };
}

function getStorageFilePath(): string {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    return STORE_FILE;
  } catch (err) {
    // Fallback to /tmp in restricted container environments
    try {
      if (!fs.existsSync(FALLBACK_DIR)) {
        fs.mkdirSync(FALLBACK_DIR, { recursive: true });
      }
      return FALLBACK_FILE;
    } catch {
      return STORE_FILE;
    }
  }
}

export function getLocalStore(): StoreState {
  if (globalThis.__nk_store) {
    return globalThis.__nk_store;
  }

  try {
    const targetFile = getStorageFilePath();
    if (!fs.existsSync(targetFile)) {
      const initial = getDefaultState();
      try {
        fs.writeFileSync(targetFile, JSON.stringify(initial, null, 2), "utf8");
      } catch (e) {
        console.warn("Could not write initial store file, using in-memory:", e);
      }
      globalThis.__nk_store = initial;
      return initial;
    }
    const content = fs.readFileSync(targetFile, "utf8");
    const parsed = JSON.parse(content);
    if (!parsed.brands) parsed.brands = [...INITIAL_BRANDS];
    if (!parsed.coupons) parsed.coupons = [...INITIAL_COUPONS];

    for (const c of parsed.coupons || []) {
      if (c.show_on_cart === undefined) c.show_on_cart = true;
    }

    for (const cy of parsed.cycles || []) {
      if (cy.collection_timing === undefined) {
        const branch = (parsed.branches || []).find((b: any) => b.id === cy.branch_id);
        cy.collection_timing = branch?.collection_timing || "Tuesday 7:00 AM - 10:00 AM";
      }
    }

    for (const item of parsed.items || []) {
      if (item.procurement_cost === undefined) item.procurement_cost = Math.round(item.price * 0.7);
      if (item.selling_price === undefined) item.selling_price = item.price;
      if (item.discount_percent === undefined) item.discount_percent = 0;
    }

    globalThis.__nk_store = parsed;
    return parsed;
  } catch (err) {
    console.warn("Failed to load store file, falling back to default state:", err);
    const initial = getDefaultState();
    globalThis.__nk_store = initial;
    return initial;
  }
}

const BACKUP_DIR = path.join(DATA_DIR, "backups");

export function getBackupDirectory(): string {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
    return BACKUP_DIR;
  } catch {
    return DATA_DIR;
  }
}

export function saveLocalStore(store: StoreState, skipSnapshot: boolean = false) {
  globalThis.__nk_store = store;
  try {
    const targetFile = getStorageFilePath();
    fs.writeFileSync(targetFile, JSON.stringify(store, null, 2), "utf8");

    // Auto-save daily snapshot in data/backups
    if (!skipSnapshot) {
      try {
        const bDir = getBackupDirectory();
        const todayStr = new Date().toISOString().slice(0, 10);
        const autoBackupPath = path.join(bDir, `store_auto_backup_${todayStr}.json`);
        fs.writeFileSync(autoBackupPath, JSON.stringify(store, null, 2), "utf8");

        // Keep last 15 snapshots
        cleanOldBackups(bDir, 15);
      } catch (snapErr) {
        console.warn("Could not write daily backup snapshot:", snapErr);
      }
    }
  } catch (err) {
    try {
      if (!fs.existsSync(FALLBACK_DIR)) {
        fs.mkdirSync(FALLBACK_DIR, { recursive: true });
      }
      fs.writeFileSync(FALLBACK_FILE, JSON.stringify(store, null, 2), "utf8");
    } catch (fallbackErr) {
      console.warn("Could not persist to disk, store kept in memory:", fallbackErr);
    }
  }
}

function cleanOldBackups(dir: string, maxKeep: number = 15) {
  try {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
    if (files.length > maxKeep) {
      const sorted = files
        .map((f) => ({
          name: f,
          time: fs.statSync(path.join(dir, f)).mtime.getTime(),
        }))
        .sort((a, b) => b.time - a.time);

      const toDelete = sorted.slice(maxKeep);
      for (const item of toDelete) {
        fs.unlinkSync(path.join(dir, item.name));
      }
    }
  } catch (e) {
    console.warn("Could not clean old backups:", e);
  }
}

/**
 * Restore Store from JSON string with full auto-migration
 */
export function restoreStoreFromJson(jsonContent: string): {
  success: boolean;
  message: string;
  stats: {
    customers: number;
    items: number;
    cycles: number;
    orders: number;
    branches: number;
    coupons: number;
  };
} {
  let parsed: any;
  try {
    parsed = typeof jsonContent === "string" ? JSON.parse(jsonContent) : jsonContent;
  } catch (e) {
    throw new Error("Invalid JSON file. Please provide a valid store.json file.");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Invalid store structure.");
  }

  // Pre-restore snapshot of current state
  try {
    const current = getLocalStore();
    const bDir = getBackupDirectory();
    const preRestoreFile = path.join(bDir, `pre_restore_${Date.now()}.json`);
    fs.writeFileSync(preRestoreFile, JSON.stringify(current, null, 2), "utf8");
  } catch (e) {
    console.warn("Could not write pre-restore snapshot:", e);
  }

  // Auto-migration & Validation
  const migrated: StoreState = {
    branches: Array.isArray(parsed.branches) && parsed.branches.length > 0 ? parsed.branches : [...INITIAL_BRANCHES],
    brands: Array.isArray(parsed.brands) && parsed.brands.length > 0 ? parsed.brands : [...INITIAL_BRANDS],
    categories: Array.isArray(parsed.categories) && parsed.categories.length > 0 ? parsed.categories : [...INITIAL_CATEGORIES],
    items: Array.isArray(parsed.items) ? parsed.items : [...INITIAL_ITEMS],
    coupons: Array.isArray(parsed.coupons) ? parsed.coupons : [...INITIAL_COUPONS],
    customers: Array.isArray(parsed.customers) ? parsed.customers : [],
    cycles: Array.isArray(parsed.cycles) ? parsed.cycles : [INITIAL_CYCLE],
    cycle_items: Array.isArray(parsed.cycle_items) ? parsed.cycle_items : [],
    orders: Array.isArray(parsed.orders) ? parsed.orders : [],
    admin_users: Array.isArray(parsed.admin_users) && parsed.admin_users.length > 0 ? parsed.admin_users : getDefaultState().admin_users,
    audit_logs: Array.isArray(parsed.audit_logs) ? parsed.audit_logs : [],
  };

  // Backfill schema fields
  for (const c of migrated.coupons || []) {
    if (c.show_on_cart === undefined) c.show_on_cart = true;
  }

  for (const cy of migrated.cycles || []) {
    if (cy.collection_timing === undefined) {
      const branch = (migrated.branches || []).find((b: any) => b.id === cy.branch_id);
      cy.collection_timing = branch?.collection_timing || "Tuesday 7:00 AM - 10:00 AM";
    }
  }

  for (const item of migrated.items || []) {
    if (item.procurement_cost === undefined) item.procurement_cost = Math.round((item.price || 50) * 0.7);
    if (item.selling_price === undefined) item.selling_price = item.price || 50;
    if (item.discount_percent === undefined) item.discount_percent = 0;
  }

  saveLocalStore(migrated);

  return {
    success: true,
    message: "Store restored and migrated successfully!",
    stats: {
      customers: migrated.customers.length,
      items: migrated.items.length,
      cycles: migrated.cycles.length,
      orders: migrated.orders.length,
      branches: migrated.branches.length,
      coupons: migrated.coupons.length,
    },
  };
}

/**
 * List all available automated snapshots
 */
export function listStoreBackups(): { filename: string; size: number; createdAt: string }[] {
  try {
    const bDir = getBackupDirectory();
    if (!fs.existsSync(bDir)) return [];
    const files = fs.readdirSync(bDir).filter((f) => f.endsWith(".json"));
    return files
      .map((f) => {
        const stat = fs.statSync(path.join(bDir, f));
        return {
          filename: f,
          size: stat.size,
          createdAt: stat.mtime.toISOString(),
        };
      })
      .sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
  } catch (e) {
    return [];
  }
}

/**
 * Restore from a specific backup file in data/backups
 */
export function restoreFromBackupFile(filename: string) {
  const safeFilename = path.basename(filename);
  const bDir = getBackupDirectory();
  const filePath = path.join(bDir, safeFilename);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Backup file ${safeFilename} not found.`);
  }
  const content = fs.readFileSync(filePath, "utf8");
  return restoreStoreFromJson(content);
}

export function clearLocalStoreOrders() {
  const store = getLocalStore();
  store.orders = [];
  saveLocalStore(store);
}

export function resetLocalStoreDemoData() {
  const initial = getDefaultState();
  saveLocalStore(initial);
}
