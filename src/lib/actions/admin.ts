"use server";

import { db, requireAdmin, requireSuperAdmin, branchScope, logAudit, DEFAULT_SUPER_ADMIN_ID, type AdminCtx } from "@/lib/supabase/server";
import {
  getLocalStore,
  saveLocalStore,
  resetLocalStoreDemoData,
  clearLocalStoreOrders,
} from "@/lib/data-store";

/**
 * Admin Authentication Action (Super Admin & Store Operators)
 */
export async function adminLoginAction(email: string, password: string) {
  const cleanEmail = email.trim().toLowerCase();

  // 1. Built-in Super Admin Credentials
  if (
    (cleanEmail === "pingnagan@gmail.com" || cleanEmail === "goodshoperode@gmail.com") &&
    password === "Nallakadai@2026"
  ) {
    const isNagan = cleanEmail === "pingnagan@gmail.com";
    return {
      success: true,
      user: {
        id: isNagan ? "a0000000-0000-4000-8000-000000000001" : "a0000000-0000-4000-8000-000000000002",
        email: cleanEmail,
        fullName: isNagan ? "Nagan (Super Admin)" : "Good Shop Admin",
        role: "super_admin",
        branchId: null,
      },
    };
  }

  // 2. Check Database / Local Store
  const store = getLocalStore();
  const user = store.admin_users.find((u) => u.email.toLowerCase() === cleanEmail && u.active);

  if (user && user.password_hash === password) {
    const branch = store.branches.find((b) => b.id === user.branch_id);
    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        branchId: user.branch_id,
        branchName: branch?.name,
      },
    };
  }

  throw new Error("Invalid email or password.");
}

/**
 * User & Store Operator Management (Super Admin only)
 */
export async function getAdminUsersAction(userId?: string) {
  await requireSuperAdmin(userId);
  const store = getLocalStore();
  return store.admin_users.map((u) => {
    const b = store.branches.find((br) => br.id === u.branch_id);
    return {
      ...u,
      branches: b ? { name: b.name } : null,
    };
  });
}

export async function saveAdminUserAction(
  userId: string,
  data: {
    id?: string;
    email: string;
    fullName: string;
    password?: string;
    role: "super_admin" | "branch_admin";
    branchId?: string | null;
    active: boolean;
  }
) {
  await requireSuperAdmin(userId);
  const store = getLocalStore();

  const cleanEmail = data.email.trim().toLowerCase();

  if (data.id) {
    const idx = store.admin_users.findIndex((u) => u.id === data.id);
    if (idx >= 0) {
      store.admin_users[idx] = {
        ...store.admin_users[idx],
        email: cleanEmail,
        full_name: data.fullName,
        role: data.role,
        branch_id: data.role === "super_admin" ? null : data.branchId || null,
        active: data.active,
        ...(data.password ? { password_hash: data.password } : {}),
      };
    }
  } else {
    store.admin_users.push({
      id: `a0000000-0000-4000-8000-00000000000${store.admin_users.length + 1}`,
      email: cleanEmail,
      password_hash: data.password || "Nallakadai@2026",
      full_name: data.fullName,
      role: data.role,
      branch_id: data.role === "super_admin" ? null : data.branchId || null,
      active: data.active,
    });
  }

  saveLocalStore(store);
  return { success: true };
}

/**
 * Admin Dashboard Stats + Live Not-Yet-Ordered List
 */
export async function getAdminDashboardAction(userId: string = DEFAULT_SUPER_ADMIN_ID, selectedBranchId?: string) {
  const ctx = await requireAdmin(userId);
  const store = getLocalStore();

  const branches = store.branches.filter((b) => b.active);
  const targetBranchId = branchScope(ctx) || selectedBranchId || branches[0]?.id;
  const currentBranch = branches.find((b) => b.id === targetBranchId) || branches[0];

  if (!currentBranch) {
    return { branches: [], currentBranch: null, currentCycle: null, stats: null, notYetOrdered: [] };
  }

  const currentCycle = store.cycles.find((c) => c.branch_id === currentBranch.id) || store.cycles[0] || null;
  const customers = store.customers.filter((c) => c.branch_id === currentBranch.id && c.active);

  const activeOrders = currentCycle
    ? store.orders.filter((o) => o.cycle_id === currentCycle.id && o.status === "Placed")
    : [];

  const orderedCustIds = new Set(activeOrders.map((o) => o.customer_id));

  let totalQty = 0;
  let tentativeValue = 0;

  for (const o of activeOrders) {
    for (const l of o.lines || []) {
      const q = Number(l.qty || 0);
      const p = Number(l.price || 0);
      totalQty += q;
      tentativeValue += q * p;
    }
  }

  const notYetOrdered = customers.filter((c) => !orderedCustIds.has(c.id));

  return {
    branches,
    currentBranch,
    currentCycle,
    stats: {
      totalOrders: activeOrders.length,
      totalCustomers: customers.length,
      totalQty: Math.round(totalQty * 100) / 100,
      tentativeValue: Math.round(tentativeValue * 100) / 100,
      notOrderedCount: notYetOrdered.length,
    },
    notYetOrdered,
  };
}

/**
 * Cycle Management
 */
export async function getCyclesAction(userId: string = DEFAULT_SUPER_ADMIN_ID, branchId?: string) {
  const ctx = await requireAdmin(userId);
  const store = getLocalStore();
  const targetBranchId = branchScope(ctx) || branchId;

  let cycles = store.cycles;
  if (targetBranchId) {
    cycles = cycles.filter((c) => c.branch_id === targetBranchId);
  }

  return cycles.map((c) => {
    const b = store.branches.find((br) => br.id === c.branch_id);
    return {
      ...c,
      branches: b ? { name: b.name } : null,
    };
  });
}

export async function createCycleAction(
  userId: string = DEFAULT_SUPER_ADMIN_ID,
  data: {
    branchId: string;
    openAt: string;
    closeAt: string;
    deliveryDate: string;
    copyFromCycleId?: string;
  }
) {
  await requireAdmin(userId);
  const store = getLocalStore();

  const nextCycleNo = store.cycles.length + 1;
  const newCycle = {
    id: `44444444-000${nextCycleNo}-4111-8111-111111111111`,
    branch_id: data.branchId,
    cycle_no: nextCycleNo,
    open_at: data.openAt,
    close_at: data.closeAt,
    delivery_date: data.deliveryDate,
    status: "Open",
    manual_override: null,
  };

  store.cycles.unshift(newCycle);

  // Copy cycle items
  const itemsToAdd = store.items.map((i) => ({
    cycle_id: newCycle.id,
    item_id: i.id,
    price: i.price,
    cap_qty: null,
    min_qty: i.min_qty,
    max_qty: i.max_qty,
  }));
  store.cycle_items.push(...itemsToAdd);

  saveLocalStore(store);

  return {
    cycle: newCycle,
    defaulters: [],
  };
}

export async function updateCycleStatusAction(
  userId: string = DEFAULT_SUPER_ADMIN_ID,
  cycleId: string,
  updates: any
) {
  await requireAdmin(userId);
  const store = getLocalStore();

  const cycle = store.cycles.find((c) => c.id === cycleId);
  if (cycle) {
    if (updates.status) cycle.status = updates.status;
    if (updates.manualOverride !== undefined) cycle.manual_override = updates.manualOverride;
    if (updates.deliveryDate) cycle.delivery_date = updates.deliveryDate;
    if (updates.closeAt) cycle.close_at = updates.closeAt;
    if (updates.openAt) cycle.open_at = updates.openAt;
    saveLocalStore(store);
  }

  return cycle;
}

/**
 * Cycle Availability & Pricing Setup
 */
export async function getCycleAvailabilityAction(cycleId: string) {
  const store = getLocalStore();
  const cycle = store.cycles.find((c) => c.id === cycleId) || store.cycles[0];
  const branch = store.branches.find((b) => b.id === cycle?.branch_id);

  const cycleItemMap = new Map(
    store.cycle_items.filter((ci) => ci.cycle_id === cycle?.id).map((ci) => [ci.item_id, ci])
  );

  return {
    cycle: cycle ? { ...cycle, branches: branch ? { name: branch.name } : null } : null,
    items: store.items.map((item) => {
      const cat = store.categories.find((c) => c.id === item.category_id);
      const ci = cycleItemMap.get(item.id);
      return {
        id: item.id,
        nameEn: item.name_en,
        nameTa: item.name_ta,
        category: cat?.name || "General",
        categoryTa: cat?.name_ta || "",
        tint: cat?.tint || "#EAF3DD",
        unit: item.unit,
        defaultMinQty: item.min_qty,
        defaultMaxQty: item.max_qty,
        presets: item.presets,
        included: !!ci,
        cycleItemId: ci ? `${cycle?.id}_${item.id}` : undefined,
        price: ci ? ci.price : item.price,
        capQty: ci?.cap_qty ?? null,
        minQty: ci?.min_qty ?? item.min_qty,
        maxQty: ci?.max_qty ?? item.max_qty,
      };
    }),
  };
}

export async function saveCycleItemAction(
  userId: string = DEFAULT_SUPER_ADMIN_ID,
  cycleId: string,
  item: {
    itemId: string;
    included: boolean;
    price: number;
    capQty: number | null;
    minQty: number | null;
    maxQty: number | null;
  }
) {
  await requireAdmin(userId);
  const store = getLocalStore();

  const idx = store.cycle_items.findIndex((ci) => ci.cycle_id === cycleId && ci.item_id === item.itemId);

  if (!item.included) {
    if (idx >= 0) store.cycle_items.splice(idx, 1);
  } else {
    if (idx >= 0) {
      store.cycle_items[idx] = {
        cycle_id: cycleId,
        item_id: item.itemId,
        price: item.price,
        cap_qty: item.capQty,
        min_qty: item.minQty,
        max_qty: item.maxQty,
      };
    } else {
      store.cycle_items.push({
        cycle_id: cycleId,
        item_id: item.itemId,
        price: item.price,
        cap_qty: item.capQty,
        min_qty: item.minQty,
        max_qty: item.maxQty,
      });
    }
  }

  saveLocalStore(store);
  return { success: true };
}

/**
 * Order Management
 */
export async function getAdminOrdersAction(userId: string = DEFAULT_SUPER_ADMIN_ID, cycleId?: string) {
  await requireAdmin(userId);
  const store = getLocalStore();

  let orders = store.orders;
  if (cycleId) orders = orders.filter((o) => o.cycle_id === cycleId);

  return orders.map((o: any) => {
    const cust = store.customers.find((c) => c.id === o.customer_id);
    const branch = store.branches.find((b) => b.id === o.branch_id) || store.branches[0];

    let tentativeTotal = 0;
    for (const l of o.lines || []) {
      if (!l.unavailable) {
        tentativeTotal += Number(l.qty) * Number(l.price);
      }
    }

    return {
      id: o.id,
      orderNo: o.order_no,
      cycleId: o.cycle_id,
      customerName: cust?.name || "Customer",
      mobile: cust?.mobile || "",
      altMobile: cust?.alt_mobile || "",
      address: o.delivery_address || cust?.address || "",
      area: cust?.area || "",
      deliveryMode: o.delivery_mode,
      status: o.status,
      adminEntered: !!o.admin_entered,
      nonCollected: !!o.non_collected,
      nonCollectionReason: o.non_collection_reason || null,
      notes: o.note || "",
      createdAt: o.created_at,
      branch: branch
        ? {
            id: branch.id,
            name: branch.name,
            whatsappNumber: branch.whatsapp_number,
            supportNumber: branch.support_number,
            pickupAddress: branch.pickup_address,
          }
        : null,
      tentativeTotal: Math.round(tentativeTotal * 100) / 100,
      itemCount: (o.lines || []).length,
      lines: (o.lines || []).map((li: any) => ({
        id: li.item_id,
        itemId: li.item_id,
        nameEn: li.name_en,
        nameTa: li.name_ta,
        unit: li.unit,
        qty: Number(li.qty),
        price: Number(li.price),
        unavailable: !!li.unavailable,
        lineTotal: Math.round(Number(li.qty) * Number(li.price) * 100) / 100,
      })),
    };
  });
}

export async function updateAdminOrderAction(
  userId: string = DEFAULT_SUPER_ADMIN_ID,
  orderId: string,
  updates: any
) {
  await requireAdmin(userId);
  const store = getLocalStore();

  const o = store.orders.find((ord) => ord.id === orderId);
  if (o) {
    if (updates.deliveryMode) o.delivery_mode = updates.deliveryMode;
    if (updates.deliveryAddress !== undefined) o.delivery_address = updates.deliveryAddress;
    if (updates.note !== undefined) o.note = updates.note;
    if (updates.status) o.status = updates.status;
    if (updates.lines) {
      o.lines = updates.lines.map((l: any) => ({
        item_id: l.itemId,
        name_en: l.nameEn,
        name_ta: l.nameTa,
        unit: l.unit,
        qty: l.qty,
        price: l.price,
        unavailable: !!l.unavailable,
      }));
    }
    saveLocalStore(store);
  }

  return { success: true };
}

export async function cancelOrderAction(userId: string = DEFAULT_SUPER_ADMIN_ID, orderId: string, reason: string) {
  await requireAdmin(userId);
  const store = getLocalStore();

  const o = store.orders.find((ord) => ord.id === orderId);
  if (o) {
    o.status = "Cancelled";
    (o as any).cancel_reason = reason;
    saveLocalStore(store);
  }

  return { success: true };
}

export async function markNonCollectionAction(
  userId: string = DEFAULT_SUPER_ADMIN_ID,
  orderId: string,
  nonCollected: boolean,
  reason?: string
) {
  await requireAdmin(userId);
  const store = getLocalStore();

  const o = store.orders.find((ord) => ord.id === orderId);
  if (o) {
    (o as any).non_collected = nonCollected;
    (o as any).non_collection_reason = reason || null;
    saveLocalStore(store);
  }

  return { success: true };
}

/**
 * Vendor / Farm Order Cumulative Aggregation
 */
export async function getFarmOrderAggregationAction(cycleId: string) {
  const store = getLocalStore();
  const cycle = store.cycles.find((c) => c.id === cycleId) || store.cycles[0];
  const branch = store.branches.find((b) => b.id === cycle?.branch_id);

  const activeOrders = store.orders.filter((o) => o.cycle_id === cycle?.id && o.status === "Placed");

  const aggregated = new Map<string, any>();

  for (const o of activeOrders) {
    for (const item of o.lines || []) {
      if (item.unavailable) continue; // Skip items marked unavailable

      const existing = aggregated.get(item.item_id);
      const q = Number(item.qty);
      const p = Number(item.price);
      const masterItem = store.items.find((i) => i.id === item.item_id);
      const cat = store.categories.find((c) => c.id === masterItem?.category_id);
      const brand = store.brands.find((b) => b.id === (masterItem as any)?.brand_id);

      if (existing) {
        existing.totalQty += q;
        existing.estimatedValue += q * p;
        existing.orderCount += 1;
      } else {
        aggregated.set(item.item_id, {
          itemId: item.item_id,
          nameEn: item.name_en,
          nameTa: item.name_ta,
          unit: item.unit,
          categoryId: cat?.id || "other",
          category: cat?.name || "Other Produce",
          categoryTa: cat?.name_ta || "",
          categoryTint: cat?.tint || "#EAF3DD",
          categorySortOrder: cat?.sort_order || 99,
          brandName: brand?.name || "Direct Farm",
          totalQty: q,
          estimatedValue: q * p,
          orderCount: 1,
        });
      }
    }
  }

  const itemsList = Array.from(aggregated.values()).map((row) => ({
    ...row,
    totalQty: Math.round(row.totalQty * 100) / 100,
    estimatedValue: Math.round(row.estimatedValue * 100) / 100,
  }));

  // Group Category-wise for Vendor Procurement
  const categoryGroupsMap = new Map<string, any>();
  for (const item of itemsList) {
    if (!categoryGroupsMap.has(item.categoryId)) {
      categoryGroupsMap.set(item.categoryId, {
        categoryId: item.categoryId,
        categoryName: item.category,
        categoryNameTa: item.categoryTa,
        categoryTint: item.categoryTint,
        categorySortOrder: item.categorySortOrder,
        items: [],
        totalVarietyCount: 0,
        estimatedCategoryValue: 0,
      });
    }
    const group = categoryGroupsMap.get(item.categoryId);
    group.items.push(item);
    group.totalVarietyCount += 1;
    group.estimatedCategoryValue += item.estimatedValue;
  }

  const categoryGroups = Array.from(categoryGroupsMap.values())
    .sort((a, b) => a.categorySortOrder - b.categorySortOrder);

  const grandTotalValue = itemsList.reduce((sum, i) => sum + i.estimatedValue, 0);

  return {
    cycle: cycle ? { ...cycle, branches: branch ? { name: branch.name } : null } : null,
    totalOrders: activeOrders.length,
    distinctItemCount: itemsList.length,
    grandTotalValue: Math.round(grandTotalValue * 100) / 100,
    items: itemsList,
    categoryGroups,
  };
}

/**
 * Order Sheets
 */
export async function getOrderSheetsAction(cycleId: string) {
  const store = getLocalStore();
  const cycle = store.cycles.find((c) => c.id === cycleId) || store.cycles[0];
  const branch = store.branches.find((b) => b.id === cycle?.branch_id);

  const orders = store.orders.filter((o) => o.cycle_id === cycle?.id && o.status === "Placed");

  return orders.map((o) => {
    const cust = store.customers.find((c) => c.id === o.customer_id);
    return {
      orderNo: o.order_no,
      customerName: cust?.name || "Customer",
      mobile: cust?.mobile || "",
      altMobile: cust?.alt_mobile || "",
      branchName: branch?.name || "Erode",
      deliveryMode: o.delivery_mode,
      deliveryAddress: o.delivery_address || cust?.address || "",
      area: cust?.area || "",
      preferredTime: cust?.preferred_delivery_time || "Morning",
      notes: o.note || "",
      createdAt: o.created_at,
      lines: (o.lines || []).map((l: any) => ({
        nameEn: l.name_en,
        nameTa: l.name_ta,
        qty: Number(l.qty),
        unit: l.unit,
        price: Number(l.price),
      })),
    };
  });
}

/**
 * Customer Master
 */
export async function getCustomersAction(userId: string = DEFAULT_SUPER_ADMIN_ID, branchId?: string) {
  await requireAdmin(userId);
  const store = getLocalStore();
  let custs = store.customers;
  if (branchId) custs = custs.filter((c) => c.branch_id === branchId);

  return custs.map((c) => {
    const b = store.branches.find((br) => br.id === c.branch_id);
    return {
      ...c,
      branches: b ? { name: b.name } : null,
    };
  });
}

export async function saveCustomerAction(
  userId: string = DEFAULT_SUPER_ADMIN_ID,
  customerData: any
) {
  await requireAdmin(userId);
  const store = getLocalStore();

  if (customerData.id) {
    const idx = store.customers.findIndex((c) => c.id === customerData.id);
    if (idx >= 0) {
      store.customers[idx] = {
        ...store.customers[idx],
        name: customerData.name,
        mobile: customerData.mobile,
        alt_mobile: customerData.altMobile || null,
        branch_id: customerData.branchId,
        delivery_mode: customerData.deliveryMode,
        address: customerData.address || "",
        area: customerData.area || "",
        active: customerData.active,
      };
    }
  } else {
    store.customers.push({
      id: `55555555-000${store.customers.length + 1}-4111-8111-111111111111`,
      name: customerData.name,
      mobile: customerData.mobile,
      alt_mobile: customerData.altMobile || null,
      branch_id: customerData.branchId,
      delivery_mode: customerData.deliveryMode,
      address: customerData.address || "",
      area: customerData.area || "",
      active: customerData.active,
    });
  }

  saveLocalStore(store);
  return { success: true };
}

/**
 * Master Items
 */
export async function getMasterItemsAction() {
  const store = getLocalStore();
  return store.items.map((item) => {
    const cat = store.categories.find((c) => c.id === item.category_id);
    const brand = store.brands.find((b) => b.id === (item as any).brand_id);
    return {
      ...item,
      categories: cat ? { name: cat.name, name_ta: cat.name_ta, tint: cat.tint } : null,
      brands: brand ? { id: brand.id, name: brand.name, name_ta: brand.name_ta, logo_url: brand.logo_url } : null,
    };
  });
}

export async function saveMasterItemAction(
  userId: string = DEFAULT_SUPER_ADMIN_ID,
  itemData: any
) {
  await requireAdmin(userId);
  const store = getLocalStore();

  const procurementCost = Number(itemData.procurementCost || itemData.procurement_cost || 0);
  const sellingPrice = Number(itemData.sellingPrice || itemData.selling_price || itemData.price || 50);
  const discountPercent = Number(itemData.discountPercent || itemData.discount_percent || 0);
  const netPrice = Math.round((sellingPrice - (sellingPrice * discountPercent) / 100) * 100) / 100;

  if (itemData.id) {
    const idx = store.items.findIndex((i) => i.id === itemData.id);
    if (idx >= 0) {
      store.items[idx] = {
        ...store.items[idx],
        name_en: itemData.nameEn,
        name_ta: itemData.nameTa,
        category_id: itemData.categoryId,
        brand_id: itemData.brandId || null,
        image_url: itemData.imageUrl || null,
        unit: itemData.unit,
        presets: itemData.presets,
        min_qty: itemData.minQty,
        max_qty: itemData.maxQty,
        procurement_cost: procurementCost,
        selling_price: sellingPrice,
        discount_percent: discountPercent,
        price: netPrice,
        active: itemData.active,
      };
    }
  } else {
    store.items.push({
      id: `33333333-00${store.items.length + 1}-4111-8111-111111111111`,
      name_en: itemData.nameEn,
      name_ta: itemData.nameTa,
      category_id: itemData.categoryId,
      brand_id: itemData.brandId || null,
      image_url: itemData.imageUrl || null,
      unit: itemData.unit,
      presets: itemData.presets,
      min_qty: itemData.minQty,
      max_qty: itemData.maxQty,
      procurement_cost: procurementCost,
      selling_price: sellingPrice,
      discount_percent: discountPercent,
      price: netPrice,
      active: itemData.active,
    });
  }

  saveLocalStore(store);
  return { success: true };
}

/**
 * Coupon Codes Management
 */
export async function getAdminCouponsAction() {
  const store = getLocalStore();
  return store.coupons || [];
}

export async function saveAdminCouponAction(
  userId: string = DEFAULT_SUPER_ADMIN_ID,
  couponData: any
) {
  await requireAdmin(userId);
  const store = getLocalStore();
  if (!store.coupons) store.coupons = [];

  const code = (couponData.code || "").toUpperCase().trim();
  const discountValue = Number(couponData.discountValue || couponData.discount_value || 0);
  const minOrderValue = Number(couponData.minOrderValue || couponData.min_order_value || 0);
  const maxDiscount = Number(couponData.maxDiscount || couponData.max_discount || discountValue);

  if (couponData.id) {
    const idx = store.coupons.findIndex((c) => c.id === couponData.id);
    if (idx >= 0) {
      store.coupons[idx] = {
        ...store.coupons[idx],
        code,
        description: couponData.description,
        discount_type: couponData.discountType || "percentage",
        discount_value: discountValue,
        min_order_value: minOrderValue,
        max_discount: maxDiscount,
        active: couponData.active !== undefined ? couponData.active : true,
      };
    }
  } else {
    store.coupons.push({
      id: `c0000000-000${store.coupons.length + 1}-4111-8111-111111111111`,
      code,
      description: couponData.description,
      discount_type: couponData.discountType || "percentage",
      discount_value: discountValue,
      min_order_value: minOrderValue,
      max_discount: maxDiscount,
      active: couponData.active !== undefined ? couponData.active : true,
    });
  }

  saveLocalStore(store);
  return { success: true };
}

export async function deleteAdminCouponAction(
  userId: string = DEFAULT_SUPER_ADMIN_ID,
  couponId: string
) {
  await requireAdmin(userId);
  const store = getLocalStore();
  if (store.coupons) {
    store.coupons = store.coupons.filter((c) => c.id !== couponId);
    saveLocalStore(store);
  }
  return { success: true };
}

/**
 * Branches Management
 */
export async function getBranchesAction() {
  const store = getLocalStore();
  return store.branches;
}

export async function saveBranchAction(
  userId: string = DEFAULT_SUPER_ADMIN_ID,
  branchData: any
) {
  await requireAdmin(userId);
  const store = getLocalStore();

  if (branchData.id) {
    const idx = store.branches.findIndex((b) => b.id === branchData.id);
    if (idx >= 0) {
      store.branches[idx] = {
        ...store.branches[idx],
        name: branchData.name,
        address: branchData.address,
        whatsapp_number: branchData.whatsappNumber,
        support_number: branchData.supportNumber,
        pickup_address: branchData.pickupAddress,
        collection_timing: branchData.collectionTiming,
        show_prices: branchData.showPrices,
        next_opening_note: branchData.nextOpeningNote,
        active: branchData.active,
      };
    }
  } else {
    store.branches.push({
      id: `11111111-000${store.branches.length + 1}-4111-8111-111111111111`,
      name: branchData.name,
      address: branchData.address,
      whatsapp_number: branchData.whatsappNumber,
      support_number: branchData.supportNumber,
      pickup_address: branchData.pickupAddress,
      collection_timing: branchData.collectionTiming,
      show_prices: branchData.showPrices,
      next_opening_note: branchData.nextOpeningNote,
      active: branchData.active,
    });
  }

  saveLocalStore(store);
  return { success: true };
}

/**
 * Audit Logs Action
 */
export async function getAuditLogsAction() {
  const store = getLocalStore();
  return store.audit_logs || [];
}

/**
 * Super Admin Utility: Clear Dummy Test Data
 */
export async function clearTestDataAction(userId: string = DEFAULT_SUPER_ADMIN_ID) {
  await requireSuperAdmin(userId);
  clearLocalStoreOrders();
  return { success: true };
}

/**
 * Super Admin Utility: Re-seed Demo Data for Testing
 */
export async function seedDemoDataAction(userId: string = DEFAULT_SUPER_ADMIN_ID) {
  await requireSuperAdmin(userId);
  resetLocalStoreDemoData();
  return { success: true };
}

/**
 * Categories Management
 */
export async function getCategoriesAdminAction() {
  const store = getLocalStore();
  return store.categories.map((cat) => {
    const count = store.items.filter((i) => i.category_id === cat.id).length;
    return {
      ...cat,
      itemCount: count,
    };
  });
}

export async function saveCategoryAction(
  userId: string = DEFAULT_SUPER_ADMIN_ID,
  categoryData: {
    id?: string;
    name: string;
    nameTa: string;
    tint: string;
    sortOrder: number;
    imageUrl?: string | null;
    active: boolean;
  }
) {
  await requireAdmin(userId);
  const store = getLocalStore();

  if (categoryData.id) {
    const idx = store.categories.findIndex((c) => c.id === categoryData.id);
    if (idx >= 0) {
      store.categories[idx] = {
        ...store.categories[idx],
        name: categoryData.name,
        name_ta: categoryData.nameTa,
        tint: categoryData.tint || "#EAF3DD",
        sort_order: Number(categoryData.sortOrder) || 1,
        image_url: categoryData.imageUrl !== undefined ? categoryData.imageUrl : store.categories[idx].image_url,
        active: categoryData.active,
      };
    }
  } else {
    const newId = `22222222-00${store.categories.length + 1}-4111-8111-111111111111`;
    store.categories.push({
      id: newId,
      name: categoryData.name,
      name_ta: categoryData.nameTa,
      tint: categoryData.tint || "#EAF3DD",
      sort_order: Number(categoryData.sortOrder) || store.categories.length + 1,
      image_url: categoryData.imageUrl || null,
      active: categoryData.active,
    });
  }

  saveLocalStore(store);
  return { success: true };
}

export async function deleteCategoryAction(
  userId: string = DEFAULT_SUPER_ADMIN_ID,
  categoryId: string
) {
  await requireAdmin(userId);
  const store = getLocalStore();

  const linkedItems = store.items.filter((i) => i.category_id === categoryId);
  if (linkedItems.length > 0) {
    throw new Error(`Cannot delete category because it contains ${linkedItems.length} produce item(s). Please move or delete the items first.`);
  }

  const idx = store.categories.findIndex((c) => c.id === categoryId);
  if (idx >= 0) {
    store.categories.splice(idx, 1);
    saveLocalStore(store);
  }

  return { success: true };
}

/**
 * Brands Management
 */
export async function getBrandsAction() {
  const store = getLocalStore();
  return store.brands.map((brand) => {
    const itemsCount = store.items.filter((i) => (i as any).brand_id === brand.id).length;
    const categoryNames = brand.category_ids
      ? brand.category_ids.map((cid) => store.categories.find((c) => c.id === cid)?.name).filter(Boolean)
      : [];

    return {
      ...brand,
      itemCount: itemsCount,
      categoryNames,
    };
  });
}

export async function saveBrandAction(
  userId: string = DEFAULT_SUPER_ADMIN_ID,
  brandData: {
    id?: string;
    name: string;
    nameTa: string;
    logoUrl?: string | null;
    description?: string;
    categoryIds: string[];
    active: boolean;
  }
) {
  await requireAdmin(userId);
  const store = getLocalStore();

  if (brandData.id) {
    const idx = store.brands.findIndex((b) => b.id === brandData.id);
    if (idx >= 0) {
      store.brands[idx] = {
        ...store.brands[idx],
        name: brandData.name,
        name_ta: brandData.nameTa,
        logo_url: brandData.logoUrl !== undefined ? brandData.logoUrl : store.brands[idx].logo_url,
        description: brandData.description || "",
        category_ids: brandData.categoryIds || [],
        active: brandData.active,
      };
    }
  } else {
    const newId = `b0000000-000${store.brands.length + 1}-4111-8111-111111111111`;
    store.brands.push({
      id: newId,
      name: brandData.name,
      name_ta: brandData.nameTa,
      logo_url: brandData.logoUrl || null,
      description: brandData.description || "",
      category_ids: brandData.categoryIds || [],
      active: brandData.active,
    });
  }

  saveLocalStore(store);
  return { success: true };
}

export async function deleteBrandAction(
  userId: string = DEFAULT_SUPER_ADMIN_ID,
  brandId: string
) {
  await requireAdmin(userId);
  const store = getLocalStore();

  const linkedItems = store.items.filter((i) => (i as any).brand_id === brandId);
  if (linkedItems.length > 0) {
    throw new Error(`Cannot delete brand because it is assigned to ${linkedItems.length} produce item(s). Reassign the items first.`);
  }

  const idx = store.brands.findIndex((b) => b.id === brandId);
  if (idx >= 0) {
    store.brands.splice(idx, 1);
    saveLocalStore(store);
  }

  return { success: true };
}


