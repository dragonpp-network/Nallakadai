"use server";

import fs from "fs";
import path from "path";
import JSZip from "jszip";
import { db, requireAdmin, requireSuperAdmin, branchScope, logAudit, DEFAULT_SUPER_ADMIN_ID, type AdminCtx } from "@/lib/supabase/server";
import {
  getLocalStore,
  saveLocalStore,
  resetLocalStoreDemoData,
  clearLocalStoreOrders,
  restoreStoreFromJson,
  listStoreBackups,
  restoreFromBackupFile,
  getStorageDiagnostics,
  getUploadsDirectory,
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
      id: crypto.randomUUID(),
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
      collectionTiming: (c as any).collection_timing || b?.collection_timing || "Tuesday 7:00 AM - 10:00 AM",
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
    collectionTiming?: string;
    copyFromCycleId?: string;
  }
) {
  await requireAdmin(userId);
  const store = getLocalStore();
  const branch = store.branches.find((b) => b.id === data.branchId);

  const nextCycleNo = store.cycles.length + 1;
  const newCycle = {
    id: crypto.randomUUID(),
    branch_id: data.branchId,
    cycle_no: nextCycleNo,
    open_at: data.openAt,
    close_at: data.closeAt,
    delivery_date: data.deliveryDate,
    collection_timing: data.collectionTiming || branch?.collection_timing || "Tuesday 7:00 AM - 10:00 AM",
    status: "Open",
    manual_override: null,
  };

  store.cycles.unshift(newCycle as any);

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

export async function updateAdminCycleAction(
  userId: string = DEFAULT_SUPER_ADMIN_ID,
  cycleId: string,
  data: {
    deliveryDate?: string;
    closeAt?: string;
    openAt?: string;
    cycleNo?: number;
    collectionTiming?: string;
    status?: string;
    manualOverride?: string | null;
  }
) {
  await requireAdmin(userId);
  const store = getLocalStore();
  const cycle = store.cycles.find((c) => c.id === cycleId);
  if (!cycle) throw new Error("Harvest cycle not found");

  if (data.deliveryDate) cycle.delivery_date = data.deliveryDate;
  if (data.closeAt) cycle.close_at = data.closeAt;
  if (data.openAt) cycle.open_at = data.openAt;
  if (data.cycleNo !== undefined) cycle.cycle_no = Number(data.cycleNo);
  if (data.collectionTiming !== undefined) (cycle as any).collection_timing = data.collectionTiming;
  if (data.status) cycle.status = data.status;
  if (data.manualOverride !== undefined) cycle.manual_override = data.manualOverride;

  saveLocalStore(store);
  return { success: true, cycle };
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
    if (updates.collectionTiming !== undefined) (cycle as any).collection_timing = updates.collectionTiming;
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
    const isPipeline = o.status === "Placed";
    let tentativeTotal = 0;
    const resolvedLines = (o.lines || []).map((li: any) => {
      const masterItem = store.items.find((i) => i.id === li.item_id);
      const effectivePrice = isPipeline && masterItem ? masterItem.price : Number(li.price);
      const lineTotal = Math.round(Number(li.qty) * effectivePrice * 100) / 100;
      if (!li.unavailable) {
        tentativeTotal += lineTotal;
      }
      return {
        id: li.item_id,
        itemId: li.item_id,
        nameEn: masterItem?.name_en || li.name_en,
        nameTa: masterItem?.name_ta || li.name_ta,
        unit: masterItem?.unit || li.unit,
        qty: Number(li.qty),
        price: effectivePrice,
        unavailable: !!li.unavailable,
        lineTotal,
      };
    });

    const discountAmount = Number((o as any).discount_amount || 0);
    const finalTentativeTotal = Math.max(0, Math.round((tentativeTotal - discountAmount) * 100) / 100);

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
      tentativeTotal: finalTentativeTotal,
      itemCount: resolvedLines.length,
      lines: resolvedLines,
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
export async function getFarmOrderAggregationAction(
  cycleId: string,
  bufferPercent: number = 0,
  roundUpUnit: number = 0
) {
  const store = getLocalStore();
  const cycle = store.cycles.find((c) => c.id === cycleId) || store.cycles[0];
  const branch = store.branches.find((b) => b.id === cycle?.branch_id);

  const activeOrders = store.orders.filter((o) => o.cycle_id === cycle?.id && o.status === "Placed");

  const aggregated = new Map<string, any>();

  for (const o of activeOrders) {
    for (const item of o.lines || []) {
      if (item.unavailable) continue; // Skip items marked unavailable

      const existing = aggregated.get(item.item_id);
      const masterItem = store.items.find((i) => i.id === item.item_id);
      const effectivePrice = masterItem ? masterItem.price : Number(item.price);
      const q = Number(item.qty);
      const p = effectivePrice;
      const cat = store.categories.find((c) => c.id === masterItem?.category_id);
      const brand = store.brands.find((b) => b.id === (masterItem as any)?.brand_id);

      if (existing) {
        existing.totalDemandQty += q;
        existing.estimatedValue += q * p;
        existing.customerOrderCount += 1;
      } else {
        aggregated.set(item.item_id, {
          itemId: item.item_id,
          nameEn: masterItem?.name_en || item.name_en,
          nameTa: masterItem?.name_ta || item.name_ta,
          unit: masterItem?.unit || item.unit,
          categoryId: cat?.id || "other",
          category: cat?.name || "Other Produce",
          categoryTa: cat?.name_ta || "",
          categoryTint: cat?.tint || "#EAF3DD",
          categorySortOrder: cat?.sort_order || 99,
          brandName: brand?.name || "Direct Farm",
          totalDemandQty: q,
          estimatedValue: q * p,
          customerOrderCount: 1,
        });
      }
    }
  }

  const itemsList = Array.from(aggregated.values()).map((row) => {
    let finalProcQty = row.totalDemandQty * (1 + (bufferPercent || 0) / 100);
    if (roundUpUnit && roundUpUnit > 0) {
      finalProcQty = Math.ceil(finalProcQty / roundUpUnit) * roundUpUnit;
    }
    finalProcQty = Math.round(finalProcQty * 100) / 100;
    const roundedDemand = Math.round(row.totalDemandQty * 100) / 100;

    return {
      ...row,
      totalQty: roundedDemand,
      totalDemandQty: roundedDemand,
      customerOrderCount: row.customerOrderCount,
      orderCount: row.customerOrderCount,
      procurementQty: finalProcQty,
      estimatedValue: Math.round(row.estimatedValue * 100) / 100,
    };
  });

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
      lines: (o.lines || []).map((l: any) => {
        const masterItem = store.items.find((i) => i.id === l.item_id);
        const price = masterItem ? masterItem.price : Number(l.price);
        const unit = masterItem?.unit || l.unit;
        const packCount = Number(l.pack_count || 1);
        const packSize = Number(l.pack_size || l.qty);
        const totalQty = Number(l.qty);
        const displayQty = packCount > 1
          ? `${packCount} × ${packSize} ${unit} (${totalQty} ${unit})`
          : `${totalQty} ${unit}`;

        return {
          nameEn: masterItem?.name_en || l.name_en,
          nameTa: masterItem?.name_ta || l.name_ta,
          qty: totalQty,
          packSize,
          packCount,
          displayQty,
          unit,
          price,
        };
      }),
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
      id: crypto.randomUUID(),
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

export async function deleteCustomerAction(
  userId: string = DEFAULT_SUPER_ADMIN_ID,
  customerId: string
) {
  await requireAdmin(userId);
  const store = getLocalStore();
  const idx = store.customers.findIndex((c) => c.id === customerId);
  if (idx >= 0) {
    store.customers.splice(idx, 1);
    saveLocalStore(store);
  }
  return { success: true };
}

export async function bulkDeleteCustomersAction(
  userId: string = DEFAULT_SUPER_ADMIN_ID,
  customerIds: string[]
) {
  await requireAdmin(userId);
  const store = getLocalStore();
  const idSet = new Set(customerIds);
  const initialCount = store.customers.length;
  store.customers = store.customers.filter((c) => !idSet.has(c.id));
  const deletedCount = initialCount - store.customers.length;
  saveLocalStore(store);
  return { success: true, deletedCount };
}

export async function bulkSaveCustomersAction(
  userId: string = DEFAULT_SUPER_ADMIN_ID,
  customerList: any[]
) {
  await requireAdmin(userId);
  const store = getLocalStore();
  let addedCount = 0;
  let updatedCount = 0;

  for (const c of customerList) {
    const mobile = String(c.mobile || "").trim();
    if (!mobile || mobile.length < 10) continue;

    const cleanMobile = mobile.slice(-10);
    const existingIdx = store.customers.findIndex((cust) => cust.mobile === cleanMobile);

    if (existingIdx >= 0) {
      store.customers[existingIdx] = {
        ...store.customers[existingIdx],
        name: c.name || store.customers[existingIdx].name,
        alt_mobile: c.altMobile || store.customers[existingIdx].alt_mobile,
        branch_id: c.branchId || store.customers[existingIdx].branch_id,
        delivery_mode: c.deliveryMode || store.customers[existingIdx].delivery_mode,
        address: c.address !== undefined ? c.address : store.customers[existingIdx].address,
        area: c.area !== undefined ? c.area : store.customers[existingIdx].area,
        active: c.active !== undefined ? c.active : store.customers[existingIdx].active,
      };
      updatedCount++;
    } else {
      store.customers.push({
        id: crypto.randomUUID(),
        name: c.name || "Customer",
        mobile: cleanMobile,
        alt_mobile: c.altMobile || null,
        branch_id: c.branchId || store.branches[0]?.id || "11111111-0001-4111-8111-111111111111",
        delivery_mode: c.deliveryMode || "Door Delivery",
        address: c.address || "",
        area: c.area || "",
        active: c.active !== false,
      });
      addedCount++;
    }
  }

  saveLocalStore(store);
  return { success: true, addedCount, updatedCount };
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

  let itemId = itemData.id;

  if (itemId) {
    const idx = store.items.findIndex((i) => i.id === itemId);
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
    itemId = crypto.randomUUID();
    store.items.push({
      id: itemId,
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

  // 🔄 Auto-Attach or Synchronize with all currently Open Harvest Cycles
  for (const cy of store.cycles) {
    if (cy.status === "Open") {
      const existingCi = store.cycle_items.find((ci) => ci.cycle_id === cy.id && ci.item_id === itemId);
      if (existingCi) {
        existingCi.price = netPrice;
        existingCi.procurement_cost = procurementCost;
        existingCi.selling_price = sellingPrice;
        existingCi.discount_percent = discountPercent;
      } else {
        store.cycle_items.push({
          cycle_id: cy.id,
          item_id: itemId,
          price: netPrice,
          procurement_cost: procurementCost,
          selling_price: sellingPrice,
          discount_percent: discountPercent,
          cap_qty: null,
          min_qty: itemData.minQty || itemData.presets?.[0] || 0.5,
          max_qty: itemData.maxQty || 10,
        });
      }
    }
  }

  // 🔄 AUTOMATICALLY UPDATE ALL PIPELINE ORDERS (status: "Placed") WITH THE LATEST PRICE
  for (const order of store.orders) {
    if (order.status === "Placed") {
      for (const line of order.lines || []) {
        if (line.item_id === itemId) {
          line.price = netPrice;
          line.name_en = itemData.nameEn || line.name_en;
          line.name_ta = itemData.nameTa || line.name_ta;
          line.unit = itemData.unit || line.unit;
        }
      }
    }
  }

  saveLocalStore(store);
  return { success: true, id: itemId };
}

export async function deleteMasterItemAction(
  userId: string = DEFAULT_SUPER_ADMIN_ID,
  itemId: string
) {
  await requireAdmin(userId);
  const store = getLocalStore();
  const idx = store.items.findIndex((i) => i.id === itemId);
  if (idx >= 0) {
    store.items.splice(idx, 1);
    // Remove from cycle_items
    store.cycle_items = store.cycle_items.filter((ci) => ci.item_id !== itemId);
    saveLocalStore(store);
  }
  return { success: true };
}

export async function bulkDeleteItemsAction(
  userId: string = DEFAULT_SUPER_ADMIN_ID,
  itemIds: string[]
) {
  await requireAdmin(userId);
  const store = getLocalStore();
  const idSet = new Set(itemIds);
  const initialCount = store.items.length;
  store.items = store.items.filter((i) => !idSet.has(i.id));
  store.cycle_items = store.cycle_items.filter((ci) => !idSet.has(ci.item_id));
  const deletedCount = initialCount - store.items.length;
  saveLocalStore(store);
  return { success: true, deletedCount };
}

export async function bulkSaveMasterItemsAction(
  userId: string = DEFAULT_SUPER_ADMIN_ID,
  rawItems: any[]
) {
  await requireAdmin(userId);
  const store = getLocalStore();
  let addedCount = 0;
  let updatedCount = 0;

  for (const raw of rawItems) {
    const nameEn = String(raw.nameEn || raw.name_en || raw.name || "").trim();
    if (!nameEn) continue;

    const nameTa = String(raw.nameTa || raw.name_ta || "").trim();
    const unit = String(raw.unit || "Kg").trim();

    // 1. Resolve Category
    let categoryId = raw.categoryId || raw.category_id;
    if (!categoryId && raw.category) {
      const catName = String(raw.category).trim();
      let foundCat = store.categories.find(
        (c) => c.name.toLowerCase() === catName.toLowerCase() || c.name_ta === catName
      );
      if (!foundCat) {
        // Create new category automatically with UUID
        const newCatId = crypto.randomUUID();
        foundCat = {
          id: newCatId,
          name: catName,
          name_ta: raw.categoryTa || raw.category_ta || "",
          tint: "#EAF3DD",
          sort_order: store.categories.length + 1,
          active: true,
        };
        store.categories.push(foundCat);
      }
      categoryId = foundCat.id;
    }
    if (!categoryId) {
      categoryId = store.categories[0]?.id || "22222222-0001-4111-8111-111111111111";
    }

    // 2. Resolve Brand
    let brandId = raw.brandId || raw.brand_id || null;
    if (!brandId && raw.brand) {
      const brandName = String(raw.brand).trim();
      let foundBrand = store.brands.find(
        (b) => b.name.toLowerCase() === brandName.toLowerCase() || b.name_ta === brandName
      );
      if (!foundBrand && brandName.toLowerCase() !== "direct farm" && brandName.toLowerCase() !== "none") {
        const newBrandId = crypto.randomUUID();
        foundBrand = {
          id: newBrandId,
          name: brandName,
          name_ta: "",
          description: "Direct Partner Farm",
          category_ids: [categoryId],
          active: true,
        };
        store.brands.push(foundBrand);
      }
      if (foundBrand) brandId = foundBrand.id;
    }

    // 3. Resolve Presets (Pack sizes)
    let presets: number[] = [];
    if (Array.isArray(raw.presets)) {
      presets = raw.presets.map((n: any) => Number(n)).filter((n: number) => !isNaN(n) && n > 0);
    } else if (typeof raw.presets === "string" || typeof raw.packSizes === "string") {
      const str = String(raw.presets || raw.packSizes || "");
      presets = str
        .split(/[,\/|]/)
        .map((s) => parseFloat(s.trim()))
        .filter((n) => !isNaN(n) && n > 0);
    }
    if (presets.length === 0) {
      presets = unit.toLowerCase() === "gram" ? [100, 250, 500] : unit.toLowerCase() === "nos" ? [1, 2, 5] : [0.5, 1, 2];
    }

    // 4. Resolve Min / Max Qty
    const minQty = Number(raw.minQty || raw.min_qty || presets[0] || 1);
    const maxQty = Number(raw.maxQty || raw.max_qty || 25);

    // 5. Resolve Pricing
    const sellingPrice = Number(raw.sellingPrice || raw.selling_price || raw.mrp || raw.price || 50);
    const procurementCost = Number(raw.procurementCost || raw.procurement_cost || raw.buyingCost || raw.cost || Math.round(sellingPrice * 0.7));
    const discountPercent = Number(raw.discountPercent || raw.discount_percent || raw.discount || 0);
    const netPrice = Math.round((sellingPrice - (sellingPrice * discountPercent) / 100) * 100) / 100;
    const active = raw.active !== undefined ? Boolean(raw.active) : true;

    // Check existing item by ID or Name
    const existingIdx = store.items.findIndex(
      (i) => (raw.id && i.id === raw.id) || i.name_en.toLowerCase() === nameEn.toLowerCase()
    );

    let finalItemId = "";

    if (existingIdx >= 0) {
      finalItemId = store.items[existingIdx].id;
      store.items[existingIdx] = {
        ...store.items[existingIdx],
        name_en: nameEn,
        name_ta: nameTa || store.items[existingIdx].name_ta,
        category_id: categoryId,
        brand_id: brandId !== undefined ? brandId : store.items[existingIdx].brand_id,
        image_url: raw.imageUrl || raw.image_url || store.items[existingIdx].image_url || null,
        unit,
        presets,
        min_qty: minQty,
        max_qty: maxQty,
        procurement_cost: procurementCost,
        selling_price: sellingPrice,
        discount_percent: discountPercent,
        price: netPrice,
        active,
      };
      updatedCount++;
    } else {
      finalItemId = crypto.randomUUID();
      store.items.push({
        id: finalItemId,
        name_en: nameEn,
        name_ta: nameTa,
        category_id: categoryId,
        brand_id: brandId,
        image_url: raw.imageUrl || raw.image_url || null,
        unit,
        presets,
        min_qty: minQty,
        max_qty: maxQty,
        procurement_cost: procurementCost,
        selling_price: sellingPrice,
        discount_percent: discountPercent,
        price: netPrice,
        active,
      });
      addedCount++;
    }

    // Auto-Attach or Synchronize with all currently Open Harvest Cycles
    for (const cy of store.cycles) {
      if (cy.status === "Open") {
        const existingCi = store.cycle_items.find((ci) => ci.cycle_id === cy.id && ci.item_id === finalItemId);
        if (existingCi) {
          existingCi.price = netPrice;
          existingCi.procurement_cost = procurementCost;
          existingCi.selling_price = sellingPrice;
          existingCi.discount_percent = discountPercent;
        } else {
          store.cycle_items.push({
            cycle_id: cy.id,
            item_id: finalItemId,
            price: netPrice,
            procurement_cost: procurementCost,
            selling_price: sellingPrice,
            discount_percent: discountPercent,
            cap_qty: null,
            min_qty: minQty,
            max_qty: maxQty,
          });
        }
      }
    }
  }

  saveLocalStore(store);
  return { success: true, addedCount, updatedCount };
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
  const showOnCart = couponData.showOnCart !== undefined ? couponData.showOnCart : (couponData.show_on_cart !== undefined ? couponData.show_on_cart : true);

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
        show_on_cart: showOnCart,
        active: couponData.active !== undefined ? couponData.active : true,
      };
    }
  } else {
    store.coupons.push({
      id: crypto.randomUUID(),
      code,
      description: couponData.description,
      discount_type: couponData.discountType || "percentage",
      discount_value: discountValue,
      min_order_value: minOrderValue,
      max_discount: maxDiscount,
      show_on_cart: showOnCart,
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
      id: crypto.randomUUID(),
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
    const newId = crypto.randomUUID();
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

export async function bulkDeleteCategoriesAction(
  userId: string = DEFAULT_SUPER_ADMIN_ID,
  categoryIds: string[]
) {
  await requireAdmin(userId);
  const store = getLocalStore();
  const idSet = new Set(categoryIds);

  const blocked: string[] = [];
  const allowedToDelete: string[] = [];

  for (const catId of categoryIds) {
    const linked = store.items.filter((i) => i.category_id === catId);
    if (linked.length > 0) {
      const catObj = store.categories.find((c) => c.id === catId);
      blocked.push(`${catObj?.name || "Category"} (${linked.length} items)`);
    } else {
      allowedToDelete.push(catId);
    }
  }

  const allowedSet = new Set(allowedToDelete);
  const initialCount = store.categories.length;
  store.categories = store.categories.filter((c) => !allowedSet.has(c.id));
  const deletedCount = initialCount - store.categories.length;

  saveLocalStore(store);
  return {
    success: true,
    deletedCount,
    blockedCount: blocked.length,
    blockedNames: blocked,
  };
}

export async function bulkSaveCategoriesAction(
  userId: string = DEFAULT_SUPER_ADMIN_ID,
  rawCategories: any[]
) {
  await requireAdmin(userId);
  const store = getLocalStore();
  let addedCount = 0;
  let updatedCount = 0;

  for (const raw of rawCategories) {
    const name = String(raw.name || raw.nameEn || raw.name_en || "").trim();
    if (!name) continue;

    const nameTa = String(raw.nameTa || raw.name_ta || "").trim();
    const tint = String(raw.tint || "#EAF3DD").trim();
    const sortOrder = Number(raw.sortOrder || raw.sort_order || store.categories.length + 1);
    const active = raw.active !== undefined ? Boolean(raw.active) : true;

    const existingIdx = store.categories.findIndex(
      (c) => (raw.id && c.id === raw.id) || c.name.toLowerCase() === name.toLowerCase()
    );

    if (existingIdx >= 0) {
      store.categories[existingIdx] = {
        ...store.categories[existingIdx],
        name,
        name_ta: nameTa || store.categories[existingIdx].name_ta,
        tint: tint || store.categories[existingIdx].tint,
        sort_order: sortOrder || store.categories[existingIdx].sort_order,
        active,
      };
      updatedCount++;
    } else {
      store.categories.push({
        id: crypto.randomUUID(),
        name,
        name_ta: nameTa,
        tint,
        sort_order: sortOrder,
        active,
      });
      addedCount++;
    }
  }

  saveLocalStore(store);
  return { success: true, addedCount, updatedCount };
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
    const newId = crypto.randomUUID();
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

export async function bulkDeleteBrandsAction(
  userId: string = DEFAULT_SUPER_ADMIN_ID,
  brandIds: string[]
) {
  await requireAdmin(userId);
  const store = getLocalStore();

  const blocked: string[] = [];
  const allowedToDelete: string[] = [];

  for (const bId of brandIds) {
    const linked = store.items.filter((i) => (i as any).brand_id === bId);
    if (linked.length > 0) {
      const bObj = store.brands.find((b) => b.id === bId);
      blocked.push(`${bObj?.name || "Brand"} (${linked.length} items)`);
    } else {
      allowedToDelete.push(bId);
    }
  }

  const allowedSet = new Set(allowedToDelete);
  const initialCount = store.brands.length;
  store.brands = store.brands.filter((b) => !allowedSet.has(b.id));
  const deletedCount = initialCount - store.brands.length;

  saveLocalStore(store);
  return {
    success: true,
    deletedCount,
    blockedCount: blocked.length,
    blockedNames: blocked,
  };
}

export async function bulkSaveBrandsAction(
  userId: string = DEFAULT_SUPER_ADMIN_ID,
  rawBrands: any[]
) {
  await requireAdmin(userId);
  const store = getLocalStore();
  let addedCount = 0;
  let updatedCount = 0;

  for (const raw of rawBrands) {
    const name = String(raw.name || raw.nameEn || raw.name_en || "").trim();
    if (!name) continue;

    const nameTa = String(raw.nameTa || raw.name_ta || "").trim();
    const description = String(raw.description || raw.desc || "").trim();
    const active = raw.active !== undefined ? Boolean(raw.active) : true;

    const existingIdx = store.brands.findIndex(
      (b) => (raw.id && b.id === raw.id) || b.name.toLowerCase() === name.toLowerCase()
    );

    if (existingIdx >= 0) {
      store.brands[existingIdx] = {
        ...store.brands[existingIdx],
        name,
        name_ta: nameTa || store.brands[existingIdx].name_ta,
        description: description || store.brands[existingIdx].description,
        active,
      };
      updatedCount++;
    } else {
      store.brands.push({
        id: crypto.randomUUID(),
        name,
        name_ta: nameTa,
        logo_url: null,
        description,
        category_ids: [],
        active,
      });
      addedCount++;
    }
  }

  saveLocalStore(store);
  return { success: true, addedCount, updatedCount };
}

/**
 * ============================================================================
 * DATABASE INTEGRITY, BACKUP & RESTORE ACTIONS
 * ============================================================================
 */
export async function getDatabaseOverviewAction(userId: string = DEFAULT_SUPER_ADMIN_ID) {
  await requireAdmin(userId);
  const store = getLocalStore();
  const backups = listStoreBackups();

  return {
    customerCount: (store.customers || []).length,
    itemCount: (store.items || []).length,
    cycleCount: (store.cycles || []).length,
    orderCount: (store.orders || []).length,
    branchCount: (store.branches || []).length,
    brandCount: (store.brands || []).length,
    categoryCount: (store.categories || []).length,
    couponCount: (store.coupons || []).length,
    backups,
    diagnostics: getStorageDiagnostics(),
  };
}

export async function exportDatabaseJsonAction(userId: string = DEFAULT_SUPER_ADMIN_ID) {
  await requireAdmin(userId);
  const store = getLocalStore();
  return JSON.stringify(store, null, 2);
}

export async function restoreDatabaseAction(
  userId: string = DEFAULT_SUPER_ADMIN_ID,
  jsonContent: string
) {
  await requireAdmin(userId);
  return restoreStoreFromJson(jsonContent);
}

export async function restoreSnapshotByNameAction(
  userId: string = DEFAULT_SUPER_ADMIN_ID,
  filename: string
) {
  await requireAdmin(userId);
  return restoreFromBackupFile(filename);
}

export async function exportDatabaseZipAction(userId: string = DEFAULT_SUPER_ADMIN_ID) {
  await requireAdmin(userId);
  const store = getLocalStore();
  const uploadsDir = getUploadsDirectory();

  const zip = new JSZip();
  // 1. Add store.json
  zip.file("store.json", JSON.stringify(store, null, 2));

  // 2. Add all image files in uploads/
  if (fs.existsSync(uploadsDir)) {
    const uploadFiles = fs.readdirSync(uploadsDir);
    const uploadsFolder = zip.folder("uploads");
    for (const f of uploadFiles) {
      try {
        const fullPath = path.join(uploadsDir, f);
        const fileData = fs.readFileSync(fullPath);
        uploadsFolder?.file(f, fileData);
      } catch (err) {
        console.warn(`Could not add ${f} to zip:`, err);
      }
    }
  }

  const zipBase64 = await zip.generateAsync({ type: "base64", compression: "DEFLATE" });
  return zipBase64;
}

export async function restoreDatabaseZipAction(
  userId: string = DEFAULT_SUPER_ADMIN_ID,
  zipBase64: string
) {
  await requireAdmin(userId);
  const zip = await JSZip.loadAsync(Buffer.from(zipBase64, "base64"));

  // 1. Find store.json in the zip
  const storeFile = zip.file("store.json");
  if (!storeFile) {
    throw new Error("Invalid backup archive: 'store.json' not found inside the ZIP file.");
  }
  const storeJsonStr = await storeFile.async("string");

  // 2. Extract all images to uploads/
  const uploadsDir = getUploadsDirectory();
  const fileNames = Object.keys(zip.files);
  for (const name of fileNames) {
    if (name.startsWith("uploads/") && !zip.files[name].dir) {
      const fileNameOnly = path.basename(name);
      if (fileNameOnly) {
        const fileData = await zip.files[name].async("nodebuffer");
        fs.writeFileSync(path.join(uploadsDir, fileNameOnly), fileData);
      }
    }
  }

  // 3. Restore and migrate database
  return restoreStoreFromJson(storeJsonStr);
}



