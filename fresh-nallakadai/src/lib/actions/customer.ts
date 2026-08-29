"use server";

import { db } from "@/lib/supabase/server";
import { normaliseMobile, isCycleOpen } from "@/lib/validation";
import { getLocalStore, saveLocalStore } from "@/lib/data-store";

export type LookupResult =
  | {
      status: "ok";
      customer: {
        id: string;
        name: string;
        mobile: string;
        deliveryMode: "Door Delivery" | "Customer Pickup";
        address: string;
        preferredTime: string;
      };
      branch: {
        id: string;
        name: string;
        showPrices: boolean;
        pickupAddress: string;
        collectionTiming: string;
      };
      cycle: {
        id: string;
        cycleNo: number;
        deliveryDate: string | null;
        closeAt: string | null;
        openAt: string | null;
      };
    }
  | {
      status: "alt";
      primaryHint: string;
    }
  | {
      status: "unknown";
      whatsapp: string;
    }
  | {
      status: "closed";
      nextOpening: string | null;
      support: string;
    };

/**
 * Customer Passwordless Login by Mobile
 */
export async function lookupCustomerAction(rawPhone: string): Promise<LookupResult> {
  const mobile = normaliseMobile(rawPhone);
  const store = getLocalStore();

  // 1. Check Primary Customer Match
  const customer = store.customers.find((c) => normaliseMobile(c.mobile) === mobile && c.active);

  if (!customer) {
    // 2. Check Alternate Mobile
    const altCustomer = store.customers.find((c) => c.alt_mobile && normaliseMobile(c.alt_mobile) === mobile);
    if (altCustomer) {
      const hint = altCustomer.mobile.slice(-4);
      return { status: "alt", primaryHint: hint };
    }

    // 3. Unknown Customer -> WhatsApp onboarding
    const branch = store.branches.find((b) => b.active) || store.branches[0];
    return {
      status: "unknown",
      whatsapp: branch?.whatsapp_number || "919489581122",
    };
  }

  // 4. Branch Lookup
  const branch = store.branches.find((b) => b.id === customer.branch_id) || store.branches[0];

  // 5. Active Cycle Lookup
  const cycle = store.cycles.find((c) => c.branch_id === branch.id) || store.cycles[0];

  if (!cycle || !isCycleOpen(cycle as any)) {
    return {
      status: "closed",
      nextOpening: branch.next_opening_note,
      support: branch.support_number || branch.whatsapp_number,
    };
  }

  return {
    status: "ok",
    customer: {
      id: customer.id,
      name: customer.name,
      mobile: customer.mobile,
      deliveryMode: customer.delivery_mode as any,
      address: customer.address || "",
      preferredTime: (customer as any).preferred_delivery_time || "Morning",
    },
    branch: {
      id: branch.id,
      name: branch.name,
      showPrices: branch.show_prices,
      pickupAddress: branch.pickup_address,
      collectionTiming: branch.collection_timing,
    },
    cycle: {
      id: cycle.id,
      cycleNo: cycle.cycle_no,
      deliveryDate: cycle.delivery_date,
      closeAt: cycle.close_at,
      openAt: cycle.open_at,
    },
  };
}

/**
 * Get Storefront Catalog for Active Cycle
 */
export async function getStoreCatalogAction(rawPhone: string) {
  const mobile = normaliseMobile(rawPhone);
  const store = getLocalStore();

  const customer = store.customers.find((c) => normaliseMobile(c.mobile) === mobile);
  const branch = store.branches.find((b) => b.id === customer?.branch_id) || store.branches[0];
  const cycle = store.cycles.find((c) => c.branch_id === branch.id) || store.cycles[0];

  // Active Cycle Items
  const cycleItemMap = new Map(
    store.cycle_items.filter((ci) => ci.cycle_id === cycle?.id).map((ci) => [ci.item_id, ci])
  );

  const catalogItems = store.items
    .filter((item) => item.active)
    .map((item) => {
      const ci = cycleItemMap.get(item.id);
      const brand = store.brands.find((b) => b.id === (item as any).brand_id);
      return {
        itemId: item.id,
        nameEn: item.name_en,
        nameTa: item.name_ta,
        categoryId: item.category_id,
        brandId: (item as any).brand_id || null,
        brand: brand ? { id: brand.id, name: brand.name, nameTa: brand.name_ta, logoUrl: brand.logo_url } : null,
        imageUrl: (item as any).image_url || null,
        unit: item.unit,
        presets: item.presets,
        minQty: ci?.min_qty ?? item.min_qty,
        maxQty: ci?.max_qty ?? item.max_qty,
        price: ci ? ci.price : item.price,
        soldOut: false,
      };
    });

  // Fetch Current & Previous Orders for customer
  const custOrders = customer
    ? store.orders.filter((o) => o.customer_id === customer.id).sort((a, b) => (b.created_at > a.created_at ? 1 : -1))
    : [];

  const currentOrder = custOrders.find((o) => o.cycle_id === cycle?.id && o.status === "Placed");
  const previousOrder = custOrders.find((o) => o.cycle_id !== cycle?.id && o.status === "Placed");

  return {
    cycleId: cycle?.id,
    categories: store.categories.filter((c) => c.active),
    brands: store.brands.filter((b) => b.active),
    items: catalogItems,
    currentOrder: currentOrder
      ? {
          id: currentOrder.id,
          orderNo: currentOrder.order_no,
          deliveryMode: currentOrder.delivery_mode,
          deliveryAddress: currentOrder.delivery_address,
          note: currentOrder.note,
          order_items: (currentOrder.lines || []).map((l: any) => ({
            item_id: l.item_id,
            qty: l.qty,
            name_en: l.name_en,
            name_ta: l.name_ta,
            unit: l.unit,
            price: l.price,
          })),
        }
      : null,
    previousOrder: previousOrder
      ? {
          id: previousOrder.id,
          orderNo: previousOrder.order_no,
          order_items: (previousOrder.lines || []).map((l: any) => ({
            item_id: l.item_id,
            qty: l.qty,
            name_en: l.name_en,
            name_ta: l.name_ta,
            unit: l.unit,
            price: l.price,
          })),
        }
      : null,
  };
}

/**
 * Submit or In-Place Update Customer Order
 */
export async function submitCustomerOrderAction(data: {
  mobile: string;
  cycleId: string;
  deliveryMode: "Door Delivery" | "Customer Pickup";
  address: string;
  preferredTime?: string;
  note?: string;
  lines: { itemId: string; qty: number }[];
}) {
  const store = getLocalStore();
  const mobile = normaliseMobile(data.mobile);
  const customer = store.customers.find((c) => normaliseMobile(c.mobile) === mobile);
  if (!customer) throw new Error("Customer not found");

  const cycle = store.cycles.find((c) => c.id === data.cycleId) || store.cycles[0];

  const orderLines = data.lines.map((l) => {
    const item = store.items.find((i) => i.id === l.itemId);
    const ci = store.cycle_items.find((c_i) => c_i.cycle_id === cycle.id && c_i.item_id === l.itemId);
    return {
      item_id: l.itemId,
      name_en: item?.name_en || "Item",
      name_ta: item?.name_ta || "",
      unit: item?.unit || "Kg",
      qty: l.qty,
      price: ci ? ci.price : item?.price || 50,
    };
  });

  const existingIdx = store.orders.findIndex((o) => o.cycle_id === cycle.id && o.customer_id === customer.id && o.status === "Placed");

  const orderNo = existingIdx >= 0 ? store.orders[existingIdx].order_no : `FNK-${1000 + store.orders.length + 1}`;

  const orderRecord = {
    id: existingIdx >= 0 ? store.orders[existingIdx].id : `66666666-000${store.orders.length + 1}-4111-8111-111111111111`,
    order_no: orderNo,
    cycle_id: cycle.id,
    customer_id: customer.id,
    branch_id: customer.branch_id,
    delivery_mode: data.deliveryMode,
    delivery_address: data.address,
    status: "Placed",
    created_at: existingIdx >= 0 ? store.orders[existingIdx].created_at : new Date().toISOString(),
    updated_at: new Date().toISOString(),
    lines: orderLines,
    note: data.note || "",
  };

  if (existingIdx >= 0) {
    store.orders[existingIdx] = orderRecord;
  } else {
    store.orders.unshift(orderRecord);
  }

  saveLocalStore(store);

  return {
    orderNo,
    deliveryDate: cycle.delivery_date,
    isUpdate: existingIdx >= 0,
  };
}

/**
 * Customer Self-Cancel Active Order (before cycle cutoff)
 */
export async function cancelCustomerOrderAction(rawPhone: string, orderId: string, reason: string = "Customer requested cancellation before cutoff") {
  const mobile = normaliseMobile(rawPhone);
  const store = getLocalStore();
  const customer = store.customers.find((c) => normaliseMobile(c.mobile) === mobile);
  if (!customer) throw new Error("Customer not found");

  const order = store.orders.find((o) => o.id === orderId && o.customer_id === customer.id);
  if (!order) throw new Error("Order not found or access denied.");

  order.status = "Cancelled";
  (order as any).cancel_reason = reason;
  (order as any).updated_at = new Date().toISOString();

  saveLocalStore(store);
  return { success: true, orderNo: order.order_no };
}

/**
 * Customer Past Order History
 */
export async function getCustomerOrderHistoryAction(rawPhone: string) {
  const mobile = normaliseMobile(rawPhone);
  const store = getLocalStore();
  const customer = store.customers.find((c) => normaliseMobile(c.mobile) === mobile);
  if (!customer) return [];

  const currentCycle = store.cycles.find((c) => c.branch_id === customer.branch_id);

  return store.orders
    .filter((o) => o.customer_id === customer.id)
    .map((o) => {
      const isCurrentCycle = o.cycle_id === currentCycle?.id && o.status === "Placed";
      let total = 0;
      for (const l of o.lines || []) {
        total += Number(l.qty) * Number(l.price);
      }

      return {
        id: o.id,
        order_no: o.order_no,
        cycle_id: o.cycle_id,
        status: o.status,
        delivery_mode: o.delivery_mode,
        delivery_address: o.delivery_address,
        note: o.note,
        created_at: o.created_at,
        isCurrentCycle,
        tentativeTotal: Math.round(total * 100) / 100,
        order_items: (o.lines || []).map((l: any) => ({
          id: l.item_id,
          name_en: l.name_en,
          name_ta: l.name_ta,
          qty: l.qty,
          unit: l.unit,
          price: l.price,
          lineTotal: Math.round(Number(l.qty) * Number(l.price) * 100) / 100,
        })),
      };
    });
}
