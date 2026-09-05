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
  const branch = store.branches.find((b) => b.id === customer.branch_id && b.active);

  if (!branch) {
    return {
      status: "closed",
      nextOpening: "Your branch is currently inactive. Please contact support.",
      support: "919489581122",
    };
  }

  // 5. Strict Active Cycle Lookup for this branch ONLY (No generic fallback to other branches)
  const cycle = store.cycles.find((c) => c.branch_id === branch.id && isCycleOpen(c as any));

  if (!cycle) {
    return {
      status: "closed",
      nextOpening: branch.next_opening_note || `${branch.name} weekly harvest ordering is currently closed. Next round will open soon.`,
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
      collectionTiming: (cycle as any).collection_timing || branch.collection_timing || "Tuesday 7:00 AM - 10:00 AM",
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
  const branch = store.branches.find((b) => b.id === customer?.branch_id && b.active);
  const cycle = branch ? store.cycles.find((c) => c.branch_id === branch.id && isCycleOpen(c as any)) : null;

  // Active Cycle Items
  const cycleItemMap = new Map(
    cycle ? store.cycle_items.filter((ci) => ci.cycle_id === cycle.id).map((ci) => [ci.item_id, ci]) : []
  );

  const catalogItems = cycle
    ? store.items
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
            packOptions: (item as any).pack_options || [],
            minQty: ci?.min_qty ?? item.min_qty,
            maxQty: ci?.max_qty ?? item.max_qty,
            procurementCost: ci?.procurement_cost ?? item.procurement_cost,
            sellingPrice: ci?.selling_price ?? item.selling_price,
            discountPercent: ci?.discount_percent ?? item.discount_percent,
            price: ci ? ci.price : item.price,
            soldOut: false,
          };
        })
    : [];

  // Fetch Current & Previous Orders for customer
  const custOrders = customer
    ? store.orders.filter((o) => o.customer_id === customer.id).sort((a, b) => (b.created_at > a.created_at ? 1 : -1))
    : [];

  const currentOrder = cycle ? custOrders.find((o) => o.cycle_id === cycle.id && o.status === "Placed") : null;
  const previousOrder = custOrders.find((o) => o.cycle_id !== cycle?.id && o.status === "Placed");

  return {
    cycleId: cycle?.id,
    categories: store.categories.filter((c) => c.active),
    brands: store.brands.filter((b) => b.active),
    coupons: (store.coupons || []).filter((cp: any) => cp.active && cp.show_on_cart !== false),
    items: catalogItems,
    currentOrder: currentOrder
      ? {
          id: currentOrder.id,
          orderNo: currentOrder.order_no,
          deliveryMode: currentOrder.delivery_mode,
          deliveryAddress: currentOrder.delivery_address,
          note: currentOrder.note,
          couponCode: (currentOrder as any).coupon_code || null,
          discountAmount: (currentOrder as any).discount_amount || 0,
          order_items: (currentOrder.lines || []).map((l: any) => {
            const master = store.items.find((i) => i.id === l.item_id);
            return {
              item_id: l.item_id,
              qty: l.qty,
              pack_size: l.pack_size,
              pack_count: l.pack_count,
              pack_label: l.pack_label,
              name_en: master?.name_en || l.name_en,
              name_ta: master?.name_ta || l.name_ta,
              unit: master?.unit || l.unit,
              price: master ? master.price : l.price,
              line_total: l.line_total,
            };
          }),
        }
      : null,
    previousOrder: previousOrder
      ? {
          id: previousOrder.id,
          orderNo: previousOrder.order_no,
          deliveryMode: previousOrder.delivery_mode,
          deliveryAddress: previousOrder.delivery_address,
          lines: (previousOrder.lines || []).map((l: any) => ({
            item_id: l.item_id,
            qty: l.qty,
            pack_size: l.pack_size,
            pack_count: l.pack_count,
            name_en: l.name_en,
            unit: l.unit,
          })),
        }
      : null,
  };
}

/**
 * Validate Coupon Code against Cart Total
 */
export async function validateCouponAction(code: string, cartTotal: number) {
  const store = getLocalStore();
  const cleanCode = (code || "").toUpperCase().trim();
  const coupon = (store.coupons || []).find((c: any) => c.code === cleanCode && c.active);

  if (!coupon) {
    return { valid: false, message: "Invalid or expired coupon code." };
  }

  if (cartTotal < (coupon.min_order_value || 0)) {
    return {
      valid: false,
      message: `Minimum order amount of ₹${coupon.min_order_value} required for code ${coupon.code}.`,
    };
  }

  let discountAmount = 0;
  if (coupon.discount_type === "percentage") {
    discountAmount = (cartTotal * coupon.discount_value) / 100;
    if (coupon.max_discount && discountAmount > coupon.max_discount) {
      discountAmount = coupon.max_discount;
    }
  } else {
    discountAmount = coupon.discount_value;
  }

  discountAmount = Math.min(discountAmount, cartTotal);
  discountAmount = Math.round(discountAmount * 100) / 100;

  return {
    valid: true,
    code: coupon.code,
    discountAmount,
    description: coupon.description,
  };
}

/**
 * Submit / Update Order for Customer
 */
export async function submitCustomerOrderAction(data: {
  mobile: string;
  cycleId?: string;
  deliveryMode?: "Door Delivery" | "Customer Pickup";
  address?: string;
  preferredTime?: string;
  note?: string;
  couponCode?: string;
  discountAmount?: number;
  lines: { 
    itemId: string; 
    packSize?: number; 
    packCount?: number; 
    packLabel?: string; 
    packPrice?: number; 
    qty?: number; 
    lineTotal?: number 
  }[];
}) {
  const mobile = normaliseMobile(data.mobile);
  const store = getLocalStore();

  const customer = store.customers.find((c) => normaliseMobile(c.mobile) === mobile);
  if (!customer) throw new Error("Customer not found");

  const branch = store.branches.find((b) => b.id === customer.branch_id) || store.branches[0];
  const cycle = data.cycleId
    ? store.cycles.find((c) => c.id === data.cycleId)
    : store.cycles.find((c) => c.branch_id === branch.id) || store.cycles[0];

  if (!cycle) throw new Error("No active harvest cycle found for this branch.");

  // Check if existing placed order in this cycle
  const existingIdx = store.orders.findIndex(
    (o) => o.customer_id === customer.id && o.cycle_id === cycle.id && o.status === "Placed"
  );

  const orderLines = data.lines
    .filter((l) => (l.packCount ? l.packCount > 0 : (l.qty || 0) > 0))
    .map((l) => {
      const item = store.items.find((i) => i.id === l.itemId);
      if (!item) throw new Error(`Produce item ${l.itemId} not found.`);
      const packSize = Number(l.packSize || item.presets?.[0] || l.qty || 1);
      const packCount = Number(l.packCount || 1);
      const totalQty = Number(l.qty !== undefined ? l.qty : packCount * packSize);
      const packLabel = l.packLabel || `${packSize} ${item.unit}`;
      const packPrice = l.packPrice !== undefined ? l.packPrice : (item.price || 0);
      const lineTotal = l.lineTotal !== undefined ? l.lineTotal : (packCount * packPrice);

      return {
        item_id: item.id,
        name_en: item.name_en,
        name_ta: item.name_ta,
        unit: item.unit,
        pack_label: packLabel,
        pack_size: packSize,
        pack_count: packCount,
        pack_price: packPrice,
        qty: totalQty,
        price: item.price,
        line_total: lineTotal,
      };
    });

  let orderNo = `ORD-${Date.now().toString().slice(-4)}`;

  if (existingIdx >= 0) {
    // Update in-place
    orderNo = store.orders[existingIdx].order_no;
    store.orders[existingIdx] = {
      ...store.orders[existingIdx],
      delivery_mode: data.deliveryMode || store.orders[existingIdx].delivery_mode,
      delivery_address: data.address !== undefined ? data.address : store.orders[existingIdx].delivery_address,
      note: data.note !== undefined ? data.note : store.orders[existingIdx].note,
      lines: orderLines,
      coupon_code: data.couponCode || null,
      discount_amount: data.discountAmount || 0,
      updated_at: new Date().toISOString(),
    } as any;
  } else {
    // New Order
    const orderRecord = {
      id: `ord-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      order_no: orderNo,
      customer_id: customer.id,
      cycle_id: cycle.id,
      branch_id: branch.id,
      delivery_mode: data.deliveryMode || customer.delivery_mode || "Door Delivery",
      delivery_address: data.address || customer.address || "",
      note: data.note || "",
      status: "Placed",
      admin_entered: false,
      coupon_code: data.couponCode || null,
      discount_amount: data.discountAmount || 0,
      created_at: new Date().toISOString(),
      lines: orderLines,
    };
    store.orders.unshift(orderRecord as any);
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
      const isPipeline = o.status === "Placed" && o.cycle_id === currentCycle?.id;
      let total = 0;
      const resolvedItems = (o.lines || []).map((l: any) => {
        const masterItem = store.items.find((i) => i.id === l.item_id);
        const price = isPipeline && masterItem ? masterItem.price : Number(l.price || 0);
        const packSize = Number(l.pack_size || l.qty || 1);
        const packCount = Number(l.pack_count || 1);
        const packPrice = Number(l.pack_price !== undefined ? l.pack_price : price * packSize);
        const packLabel = l.pack_label || `${packSize} ${masterItem?.unit || l.unit || "Kg"}`;
        const lineTotal = l.line_total !== undefined ? Number(l.line_total) : Math.round(Number(l.qty || 1) * price * 100) / 100;
        total += lineTotal;
        return {
          id: l.item_id,
          item_id: l.item_id,
          name_en: masterItem?.name_en || l.name_en,
          name_ta: masterItem?.name_ta || l.name_ta,
          qty: l.qty,
          pack_size: packSize,
          pack_count: packCount,
          pack_price: packPrice,
          pack_label: packLabel,
          unit: masterItem?.unit || l.unit,
          price,
          lineTotal,
          line_total: lineTotal,
        };
      });

      const discountAmount = Number((o as any).discount_amount || 0);
      const finalTotal = Math.max(0, Math.round((total - discountAmount) * 100) / 100);

      return {
        id: o.id,
        order_no: o.order_no,
        cycle_id: o.cycle_id,
        status: o.status,
        delivery_mode: o.delivery_mode,
        delivery_address: o.delivery_address,
        note: o.note,
        created_at: o.created_at,
        isCurrentCycle: isPipeline,
        tentativeTotal: finalTotal,
        coupon_code: (o as any).coupon_code || null,
        discount_amount: discountAmount,
        order_items: resolvedItems,
      };
    });
}
