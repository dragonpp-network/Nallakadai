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
    cycles: [{ ...INITIAL_CYCLE }],
    cycle_items: cycleItems,
    orders: JSON.parse(JSON.stringify(INITIAL_ORDERS)),
    admin_users: [
      {
        id: "a0000000-0000-4000-8000-000000000001",
        email: "pingnagan@gmail.com",
        password_hash: "Nallakadai@2026",
        full_name: "Nagan (Super Admin)",
        role: "super_admin",
        branch_id: null,
        active: true,
      },
      {
        id: "a0000000-0000-4000-8000-000000000002",
        email: "goodshoperode@gmail.com",
        password_hash: "Nallakadai@2026",
        full_name: "Good Shop Admin",
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

export function getLocalStore(): StoreState {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(STORE_FILE)) {
      const initial = getDefaultState();
      fs.writeFileSync(STORE_FILE, JSON.stringify(initial, null, 2), "utf8");
      return initial;
    }
    const content = fs.readFileSync(STORE_FILE, "utf8");
    const parsed = JSON.parse(content);
    if (!parsed.brands) {
      parsed.brands = [...INITIAL_BRANDS];
    }
    if (!parsed.coupons) {
      parsed.coupons = [...INITIAL_COUPONS];
    }
    // Backfill pricing & discount fields on existing items if needed
    for (const item of parsed.items || []) {
      if (item.procurement_cost === undefined) {
        item.procurement_cost = Math.round(item.price * 0.7);
      }
      if (item.selling_price === undefined) {
        item.selling_price = item.price;
      }
      if (item.discount_percent === undefined) {
        item.discount_percent = 0;
      }
    }
    return parsed;
  } catch (err) {
    return getDefaultState();
  }
}

export function saveLocalStore(store: StoreState) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), "utf8");
  } catch (err) {
    console.error("Error saving local store:", err);
  }
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
