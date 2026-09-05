import fs from "fs";
import path from "path";
import crypto from "crypto";
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
  var __nk_active_dir: string | undefined;
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

/**
 * Multi-Tier Storage Directory Discovery
 * Prioritizes persistent volume locations across Railway, Docker, and local development.
 */
export function getStorageDirectory(): string {
  if (globalThis.__nk_active_dir) {
    return globalThis.__nk_active_dir;
  }

  const candidateDirs: string[] = [];

  // 1. Explicit environment variable if configured
  if (process.env.DATA_DIR && process.env.DATA_DIR.trim() !== "") {
    candidateDirs.push(process.env.DATA_DIR.trim());
  }

  // 2. Standard Railway volume mount path (/app/data)
  candidateDirs.push("/app/data");

  // 3. Alternative standard volume mount path (/data)
  candidateDirs.push("/data");

  // 4. Local application relative directory (process.cwd()/data)
  candidateDirs.push(path.join(process.cwd(), "data"));

  // 5. Ephemeral fallback
  candidateDirs.push("/tmp/nk-data");

  for (const dir of candidateDirs) {
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      // Test write permissions
      const testFile = path.join(dir, `.nk_test_${Date.now()}`);
      fs.writeFileSync(testFile, "test", "utf8");
      fs.unlinkSync(testFile);

      globalThis.__nk_active_dir = dir;
      console.log(`[Storage] Selected active persistent storage directory: ${dir}`);
      return dir;
    } catch {
      // Continue to next candidate
    }
  }

  // Fallback to /tmp
  const fallback = "/tmp/nk-data";
  try {
    if (!fs.existsSync(fallback)) fs.mkdirSync(fallback, { recursive: true });
  } catch {}
  globalThis.__nk_active_dir = fallback;
  return fallback;
}

export function getStorageFilePath(): string {
  const dir = getStorageDirectory();
  return path.join(dir, "store.json");
}

export function getBackupDirectory(): string {
  const dir = getStorageDirectory();
  const backupDir = path.join(dir, "backups");
  try {
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
  } catch {}
  return backupDir;
}

export function getUploadsDirectory(): string {
  const dir = getStorageDirectory();
  const uploadsDir = path.join(dir, "uploads");
  try {
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
  } catch {}
  return uploadsDir;
}

/**
 * Save binary image buffer to uploads directory
 */
export function saveUploadedImageBuffer(
  buffer: Buffer,
  originalExt: string = "webp",
  prefix: string = "img"
): { filename: string; url: string } {
  const uploadsDir = getUploadsDirectory();
  let ext = originalExt.replace(/^\./, "").toLowerCase();
  if (!["webp", "jpg", "jpeg", "png", "gif", "svg"].includes(ext)) {
    ext = "webp";
  }
  const filename = `${prefix}_${crypto.randomUUID().slice(0, 8)}.${ext}`;
  const filePath = path.join(uploadsDir, filename);
  fs.writeFileSync(filePath, buffer);
  return {
    filename,
    url: `/api/uploads/${filename}`,
  };
}

/**
 * Helper to convert Base64 data URL into binary file in uploads directory
 */
export function saveBase64ImageToUploads(dataUrl: string, prefix: string = "img"): string | null {
  try {
    if (!dataUrl || typeof dataUrl !== "string") return null;
    const matches = dataUrl.match(/^data:image\/([A-Za-z-+]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) return null;

    const format = matches[1].toLowerCase();
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, "base64");

    let ext = "webp";
    if (format === "jpeg" || format === "jpg") ext = "jpg";
    else if (format === "png") ext = "png";
    else if (format === "webp") ext = "webp";

    const saved = saveUploadedImageBuffer(buffer, ext, prefix);
    return saved.url;
  } catch (err) {
    console.warn("Could not save base64 image to uploads:", err);
    return null;
  }
}

/**
 * Auto-migration of Base64 images to uploads directory with mandatory pre-upgrade snapshot
 */
function migrateBase64ImagesToUploads(store: StoreState): boolean {
  let hasBase64 = false;

  // Check if any entity contains base64 image
  const checkBase64 = (url?: string | null) => url && typeof url === "string" && url.startsWith("data:image/");

  if (store.items?.some((i) => checkBase64(i.imageUrl))) hasBase64 = true;
  if (store.categories?.some((c) => checkBase64(c.image_url))) hasBase64 = true;
  if (store.brands?.some((b) => checkBase64(b.logo_url))) hasBase64 = true;

  if (!hasBase64) return false;

  console.log("[Storage Migration] Base64 images detected. Creating mandatory pre-upgrade safety snapshot...");

  // Mandatory safety snapshot before extracting Base64 images
  try {
    const bDir = getBackupDirectory();
    const safetyFile = path.join(bDir, `pre_upgrade_snapshot_${Date.now()}.json`);
    fs.writeFileSync(safetyFile, JSON.stringify(store, null, 2), "utf8");
    console.log(`[Storage Migration] Mandatory safety snapshot created at ${safetyFile}`);
  } catch (e) {
    console.warn("Could not write pre-upgrade safety snapshot:", e);
  }

  // Extract and replace in items
  if (Array.isArray(store.items)) {
    for (const item of store.items) {
      if (checkBase64(item.imageUrl)) {
        const fileUrl = saveBase64ImageToUploads(item.imageUrl!, "item");
        if (fileUrl) {
          item.imageUrl = fileUrl;
        }
      }
    }
  }

  // Extract and replace in categories
  if (Array.isArray(store.categories)) {
    for (const cat of store.categories) {
      if (checkBase64(cat.image_url)) {
        const fileUrl = saveBase64ImageToUploads(cat.image_url!, "cat");
        if (fileUrl) {
          cat.image_url = fileUrl;
        }
      }
    }
  }

  // Extract and replace in brands
  if (Array.isArray(store.brands)) {
    for (const brand of store.brands) {
      if (checkBase64(brand.logo_url)) {
        const fileUrl = saveBase64ImageToUploads(brand.logo_url!, "brand");
        if (fileUrl) {
          brand.logo_url = fileUrl;
        }
      }
    }
  }

  console.log("[Storage Migration] Completed Base64 image decoupling to /uploads directory!");
  return true;
}

/**
 * Startup Deduplication Sanitizer
 * Scans arrays to guarantee no duplicate IDs exist in the database.
 */
function sanitizeDuplicateIds(store: StoreState): boolean {
  let changed = false;

  function ensureUniqueIds<T extends { id: string }>(items: T[]): T[] {
    const seen = new Set<string>();
    for (let i = 0; i < items.length; i++) {
      if (!items[i].id || seen.has(items[i].id)) {
        items[i] = {
          ...items[i],
          id: crypto.randomUUID(),
        };
        changed = true;
      }
      seen.add(items[i].id);
    }
    return items;
  }

  if (Array.isArray(store.items)) ensureUniqueIds(store.items);
  if (Array.isArray(store.categories)) ensureUniqueIds(store.categories);
  if (Array.isArray(store.brands)) ensureUniqueIds(store.brands);
  if (Array.isArray(store.customers)) ensureUniqueIds(store.customers);
  if (Array.isArray(store.coupons)) ensureUniqueIds(store.coupons);
  if (Array.isArray(store.branches)) ensureUniqueIds(store.branches);
  if (Array.isArray(store.cycles)) ensureUniqueIds(store.cycles);

  return changed;
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
        saveLocalStore(initial, true);
      } catch (e) {
        console.warn("Could not write initial store file, using in-memory:", e);
      }
      globalThis.__nk_store = initial;
      return initial;
    }

    const content = fs.readFileSync(targetFile, "utf8");
    const parsed: StoreState = JSON.parse(content);

    if (!parsed.branches) parsed.branches = [...INITIAL_BRANCHES];
    if (!parsed.brands) parsed.brands = [...INITIAL_BRANDS];
    if (!parsed.categories) parsed.categories = [...INITIAL_CATEGORIES];
    if (!parsed.coupons) parsed.coupons = [...INITIAL_COUPONS];
    if (!parsed.customers) parsed.customers = [];
    if (!parsed.items) parsed.items = [...INITIAL_ITEMS];
    if (!parsed.cycles) parsed.cycles = [INITIAL_CYCLE];
    if (!parsed.cycle_items) parsed.cycle_items = [];
    if (!parsed.orders) parsed.orders = [];
    if (!parsed.admin_users) parsed.admin_users = getDefaultState().admin_users;
    if (!parsed.audit_logs) parsed.audit_logs = [];

    // Backfill missing schema fields
    for (const c of parsed.coupons || []) {
      if (c.show_on_cart === undefined) c.show_on_cart = true;
    }

    for (const cy of parsed.cycles || []) {
      if ((cy as any).collection_timing === undefined) {
        const branch = (parsed.branches || []).find((b: any) => b.id === cy.branch_id);
        (cy as any).collection_timing = branch?.collection_timing || "Tuesday 7:00 AM - 10:00 AM";
      }
    }

    for (const item of parsed.items || []) {
      if (item.procurement_cost === undefined) item.procurement_cost = Math.round((item.price || 50) * 0.7);
      if (item.selling_price === undefined) item.selling_price = item.price || 50;
      if (item.discount_percent === undefined) item.discount_percent = 0;
    }

    // Sanitize any duplicate IDs automatically
    const idsFixed = sanitizeDuplicateIds(parsed);

    // Auto-migrate any base64 images into physical binary files in uploads/
    const imagesMigrated = migrateBase64ImagesToUploads(parsed);

    if (idsFixed || imagesMigrated) {
      console.log("[Storage] Automatically repaired and saved clean store.json");
      saveLocalStore(parsed, true);
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

/**
 * Save StoreState atomically to disk with daily snapshots
 */
export function saveLocalStore(store: StoreState, skipSnapshot: boolean = false) {
  globalThis.__nk_store = store;
  try {
    const targetFile = getStorageFilePath();
    const tempFile = `${targetFile}.tmp.${Date.now()}`;

    // 1. Atomic write to temporary file
    fs.writeFileSync(tempFile, JSON.stringify(store, null, 2), "utf8");

    // 2. Atomic rename to target file (guarantees zero partial file corruption)
    fs.renameSync(tempFile, targetFile);

    // 3. Auto-save daily snapshot in backups folder
    if (!skipSnapshot) {
      try {
        const bDir = getBackupDirectory();
        const todayStr = new Date().toISOString().slice(0, 10);
        const autoBackupPath = path.join(bDir, `store_auto_backup_${todayStr}.json`);
        fs.writeFileSync(autoBackupPath, JSON.stringify(store, null, 2), "utf8");

        // Retain strictly the last 5 rotating snapshots
        cleanOldBackups(bDir, 5);
      } catch (snapErr) {
        console.warn("Could not write daily backup snapshot:", snapErr);
      }
    }
  } catch (err) {
    console.error("Error saving store to disk:", err);
  }
}

function cleanOldBackups(dir: string, maxKeep: number = 5) {
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
 * Restore Store from JSON string with full auto-migration & deduplication
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
    if ((cy as any).collection_timing === undefined) {
      const branch = (migrated.branches || []).find((b: any) => b.id === cy.branch_id);
      (cy as any).collection_timing = branch?.collection_timing || "Tuesday 7:00 AM - 10:00 AM";
    }
  }

  for (const item of migrated.items || []) {
    if (item.procurement_cost === undefined) item.procurement_cost = Math.round((item.price || 50) * 0.7);
    if (item.selling_price === undefined) item.selling_price = item.price || 50;
    if (item.discount_percent === undefined) item.discount_percent = 0;
  }

  // Deduplicate IDs
  sanitizeDuplicateIds(migrated);

  saveLocalStore(migrated);

  return {
    success: true,
    message: "Store restored, deduplicated, and migrated successfully!",
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

/**
 * Get storage diagnostics for admin dashboard
 */
export function getStorageDiagnostics() {
  const activeDir = getStorageDirectory();
  const activeFile = getStorageFilePath();
  const uploadsDir = getUploadsDirectory();
  let fileSize = 0;
  let lastModified = "";
  let isVolume = activeDir.startsWith("/app/data") || activeDir.startsWith("/data");
  let uploadFilesCount = 0;
  let uploadFilesTotalSizeBytes = 0;

  try {
    if (fs.existsSync(activeFile)) {
      const stat = fs.statSync(activeFile);
      fileSize = stat.size;
      lastModified = stat.mtime.toISOString();
    }
  } catch {}

  try {
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      uploadFilesCount = files.length;
      for (const f of files) {
        try {
          const st = fs.statSync(path.join(uploadsDir, f));
          uploadFilesTotalSizeBytes += st.size;
        } catch {}
      }
    }
  } catch {}

  return {
    activeDir,
    activeFile,
    fileSize,
    fileSizeFormatted: `${(fileSize / 1024).toFixed(1)} KB`,
    lastModified,
    isVolume,
    uploadsDir,
    uploadFilesCount,
    uploadFilesTotalSizeFormatted: `${(uploadFilesTotalSizeBytes / (1024 * 1024)).toFixed(2)} MB`,
  };
}
