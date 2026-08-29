import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const uuid = z.string().uuid();

export const adminMe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { requireAdmin, db } = await import("./db.server");
    const ctx = await requireAdmin(context.userId);
    const { data: branches } = await db
      .from("branches")
      .select("id, name, show_prices, support_number, whatsapp_number")
      .order("name");
    return {
      role: ctx.role,
      isSuper: ctx.isSuper,
      label: ctx.label,
      branchId: ctx.branchId,
      branches: (branches ?? []).filter((b) => ctx.isSuper || b.id === ctx.branchId),
    };
  });

/* ------------------------------------------------------------------ branches */

export const saveBranch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: uuid.optional(),
        name: z.string().min(1).max(120),
        address: z.string().max(400).default(""),
        whatsapp_number: z.string().max(20).default(""),
        support_number: z.string().max(20).default(""),
        pickup_address: z.string().max(400).default(""),
        collection_timing: z.string().max(200).default(""),
        show_prices: z.boolean().default(true),
        next_opening_note: z.string().max(200).nullable().default(null),
        active: z.boolean().default(true),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { db, requireSuperAdmin, logAudit } = await import("./db.server");
    const ctx = await requireSuperAdmin(context.userId);
    const { id, ...values } = data;
    if (id) {
      const { data: before } = await db.from("branches").select("*").eq("id", id).single();
      const { error } = await db.from("branches").update(values).eq("id", id);
      if (error) throw new Error(error.message);
      await logAudit(ctx, "update", "branch", id, before, values);
      return { id };
    }
    const { data: created, error } = await db
      .from("branches")
      .insert(values)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await logAudit(ctx, "create", "branch", created.id, null, values);
    return { id: created.id };
  });

export const listBranches = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { db, requireAdmin } = await import("./db.server");
    const ctx = await requireAdmin(context.userId);
    const { data } = await db.from("branches").select("*").order("name");
    return (data ?? []).filter((b) => ctx.isSuper || b.id === ctx.branchId);
  });

/* ----------------------------------------------------------------- suppliers */

export const listSuppliers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { db, requireAdmin } = await import("./db.server");
    await requireAdmin(context.userId);
    const { data } = await db.from("suppliers").select("*").order("name");
    return data ?? [];
  });

export const saveSupplier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: uuid.optional(),
        name: z.string().min(1).max(120),
        contact_person: z.string().max(120).default(""),
        phone: z.string().max(20).default(""),
        address: z.string().max(400).default(""),
        notes: z.string().max(400).default(""),
        active: z.boolean().default(true),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { db, requireSuperAdmin, logAudit } = await import("./db.server");
    const ctx = await requireSuperAdmin(context.userId);
    const { id, ...values } = data;
    if (id) {
      const { error } = await db.from("suppliers").update(values).eq("id", id);
      if (error) throw new Error(error.message);
      await logAudit(ctx, "update", "supplier", id, null, values);
      return { id };
    }
    const { data: created, error } = await db
      .from("suppliers")
      .insert(values)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await logAudit(ctx, "create", "supplier", created.id, null, values);
    return { id: created.id };
  });

/* ------------------------------------------------------- categories and items */

export const listCatalog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { db, requireAdmin } = await import("./db.server");
    await requireAdmin(context.userId);
    const [{ data: categories }, { data: items }] = await Promise.all([
      db.from("categories").select("*").order("sort_order"),
      db.from("items").select("*").order("name_en"),
    ]);
    return { categories: categories ?? [], items: items ?? [] };
  });

export const saveCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: uuid.optional(),
        name: z.string().min(1).max(60),
        name_ta: z.string().max(60).default(""),
        tint: z.string().max(30).default("#EAF3DD"),
        icon: z.string().max(40).default("leaf"),
        sort_order: z.number().int().default(0),
        active: z.boolean().default(true),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { db, requireSuperAdmin, logAudit } = await import("./db.server");
    const ctx = await requireSuperAdmin(context.userId);
    const { id, ...values } = data;
    if (id) {
      const { error } = await db.from("categories").update(values).eq("id", id);
      if (error) throw new Error(error.message);
      await logAudit(ctx, "update", "category", id, null, values);
      return { id };
    }
    const { data: created, error } = await db
      .from("categories")
      .insert(values)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await logAudit(ctx, "create", "category", created.id, null, values);
    return { id: created.id };
  });

export const saveItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: uuid.optional(),
        name_en: z.string().min(1).max(120),
        name_ta: z.string().max(120).default(""),
        category_id: uuid,
        unit: z.enum(["Kg", "Gram", "Nos", "Litre", "Ml"]),
        presets: z.array(z.number().positive()).max(6).default([]),
        min_qty: z.number().positive(),
        max_qty: z.number().positive(),
        image_url: z.string().max(500).nullable().default(null),
        supplier_id: uuid.nullable().default(null),
        active: z.boolean().default(true),
      })
      .refine((v) => v.max_qty >= v.min_qty, { message: "Maximum must be at least the minimum." })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { db, requireSuperAdmin, logAudit } = await import("./db.server");
    const ctx = await requireSuperAdmin(context.userId);
    const { id, ...values } = data;
    if (id) {
      const { data: before } = await db.from("items").select("*").eq("id", id).single();
      const { error } = await db.from("items").update(values).eq("id", id);
      if (error) throw new Error(error.message);
      await logAudit(ctx, "update", "item", id, before, values);
      return { id };
    }
    const { data: created, error } = await db.from("items").insert(values).select("id").single();
    if (error) throw new Error(error.message);
    await logAudit(ctx, "create", "item", created.id, null, values);
    return { id: created.id };
  });

/* ----------------------------------------------------------------- customers */

export const listCustomers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ branchId: uuid.optional(), q: z.string().max(80).optional() }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { db, requireAdmin, branchScope } = await import("./db.server");
    const ctx = await requireAdmin(context.userId);
    let query = db.from("customers").select("*, branches(name)").order("name");
    const scope = branchScope(ctx) ?? data.branchId;
    if (scope) query = query.eq("branch_id", scope);
    if (data.q) query = query.or(`name.ilike.%${data.q}%,mobile.ilike.%${data.q}%`);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const saveCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: uuid.optional(),
        name: z.string().min(1).max(120),
        mobile: z.string().min(6).max(20),
        alt_mobile: z.string().max(20).nullable().default(null),
        branch_id: uuid,
        delivery_mode: z.enum(["Door Delivery", "Customer Pickup"]),
        address: z.string().max(400).default(""),
        area: z.string().max(200).default(""),
        map_link: z.string().max(600).default(""),
        preferred_delivery_time: z.string().max(120).default(""),
        active: z.boolean().default(true),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { db, requireAdmin, logAudit, normaliseMobile } = await import("./db.server");
    const ctx = await requireAdmin(context.userId);
    const alt = data.alt_mobile?.trim() ? normaliseMobile(data.alt_mobile) : null;
    const values = { ...data, mobile: normaliseMobile(data.mobile), alt_mobile: alt };
    const { id, ...rest } = values;
    if (alt && alt === rest.mobile)
      throw new Error("The alternate number must be different from the login mobile number.");
    const { data: dup } = await db
      .from("customers")
      .select("id, name, mobile")
      .eq("mobile", rest.mobile)
      .maybeSingle();
    if (dup && dup.id !== id)
      return { duplicate: dup as { id: string; name: string; mobile: string } };
    if (id) {
      const { data: before } = await db.from("customers").select("*").eq("id", id).single();
      const { error } = await db.from("customers").update(rest).eq("id", id);
      if (error) throw new Error(error.message);
      await logAudit(ctx, "update", "customer", id, before, rest);
      return { id };
    }
    const { data: created, error } = await db
      .from("customers")
      .insert(rest)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await logAudit(ctx, "create", "customer", created.id, null, rest);
    return { id: created.id };
  });

export const importCustomers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        branchId: uuid,
        rows: z
          .array(
            z.object({
              name: z.string().default(""),
              mobile: z.string().default(""),
              alt_mobile: z.string().default(""),
              address: z.string().default(""),
              area: z.string().default(""),
              delivery_mode: z.string().default("Door Delivery"),
            }),
          )
          .max(2000),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { db, requireAdmin, normaliseMobile, logAudit } = await import("./db.server");
    const ctx = await requireAdmin(context.userId);
    const errors: { row: number; name: string; mobile: string; reason: string }[] = [];
    const seen = new Set<string>();
    let imported = 0;
    for (let i = 0; i < data.rows.length; i++) {
      const r = data.rows[i]!;
      const mobile = normaliseMobile(r.mobile);
      const alt = r.alt_mobile?.trim() ? normaliseMobile(r.alt_mobile) : null;
      const fail = (reason: string) =>
        errors.push({ row: i + 1, name: r.name.trim(), mobile: r.mobile.trim(), reason });
      if (!r.name.trim()) {
        fail("Name is missing");
        continue;
      }
      if (mobile.length !== 10) {
        fail(`Invalid mobile number "${r.mobile}"`);
        continue;
      }
      if (alt && alt === mobile) {
        fail("Alternate number is the same as the main number");
        continue;
      }
      if (seen.has(mobile)) {
        fail("Duplicate mobile number inside this file");
        continue;
      }
      seen.add(mobile);
      const { data: exists } = await db
        .from("customers")
        .select("id, name")
        .eq("mobile", mobile)
        .maybeSingle();
      if (exists) {
        fail(`Already registered as ${exists.name}`);
        continue;
      }
      const { error } = await db.from("customers").insert({
        name: r.name.trim(),
        mobile,
        alt_mobile: alt,
        branch_id: data.branchId,
        address: r.address,
        area: r.area,
        delivery_mode:
          r.delivery_mode === "Customer Pickup" ? "Customer Pickup" : "Door Delivery",
      });
      if (error)
        errors.push({
          row: i + 1,
          name: r.name.trim(),
          mobile: r.mobile.trim(),
          reason: error.message,
        });
      else imported++;
    }
    await logAudit(ctx, "import", "customer", null, null, { imported, rejected: errors.length });
    return { imported, errors };
  });

/* -------------------------------------------------------------------- cycles */

export const listCycles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { db, requireAdmin, branchScope, isCycleOpen } = await import("./db.server");
    const ctx = await requireAdmin(context.userId);
    let q = db
      .from("cycles")
      .select("*, branches(name)")
      .order("cycle_no", { ascending: false });
    const scope = branchScope(ctx);
    if (scope) q = q.eq("branch_id", scope);
    const { data } = await q;
    return (data ?? []).map((c) => ({ ...c, isOpen: isCycleOpen(c) }));
  });

export const saveCycle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: uuid.optional(),
        branch_id: uuid,
        cycle_no: z.number().int().positive(),
        open_at: z.string().nullable().default(null),
        close_at: z.string().nullable().default(null),
        delivery_date: z.string().nullable().default(null),
        status: z.enum(["Draft", "Open", "Closed", "Delivered"]),
        manual_override: z.enum(["force_open", "force_closed"]).nullable().default(null),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { db, requireAdmin, logAudit } = await import("./db.server");
    const ctx = await requireAdmin(context.userId);
    const { id, ...values } = data;
    if (id) {
      const { data: before } = await db.from("cycles").select("*").eq("id", id).single();
      const { error } = await db.from("cycles").update(values).eq("id", id);
      if (error) throw new Error(error.message);
      await logAudit(ctx, "update", "cycle", id, before, values);
      return { id };
    }
    const { data: created, error } = await db.from("cycles").insert(values).select("id").single();
    if (error) throw new Error(error.message);
    await logAudit(ctx, "create", "cycle", created.id, null, values);
    return { id: created.id };
  });

/** Customers of a branch carrying non-collection flags — shown when opening a cycle (FR-3.7). */
export const nonCollectionAlerts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ branchId: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { db, requireAdmin } = await import("./db.server");
    await requireAdmin(context.userId);
    const { data: rows } = await db
      .from("orders")
      .select("id, order_no, non_collection_reason, customers(id, name, mobile)")
      .eq("branch_id", data.branchId)
      .eq("non_collected", true);
    return rows ?? [];
  });

/* ------------------------------------------------------------- availability */

export const getAvailability = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ cycleId: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { db, requireAdmin } = await import("./db.server");
    await requireAdmin(context.userId);
    const { data: rows } = await db
      .from("cycle_items")
      .select("*")
      .eq("cycle_id", data.cycleId);
    return rows ?? [];
  });

export const setAvailability = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        cycleId: uuid,
        rows: z
          .array(
            z.object({
              item_id: uuid,
              price: z.number().min(0),
              cap_qty: z.number().positive().nullable().default(null),
              min_qty: z.number().positive().nullable().default(null),
              max_qty: z.number().positive().nullable().default(null),
            }),
          )
          .max(500),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { db, requireAdmin, logAudit } = await import("./db.server");
    const ctx = await requireAdmin(context.userId);
    const keep = new Set(data.rows.map((r) => r.item_id));
    const { data: existing } = await db
      .from("cycle_items")
      .select("id, item_id")
      .eq("cycle_id", data.cycleId);
    const removing = (existing ?? []).filter((e) => !keep.has(e.item_id)).map((e) => e.item_id);

    let affected: { order_no: string; name: string }[] = [];
    if (removing.length) {
      const { data: hits } = await db
        .from("order_items")
        .select("item_id, name_en, orders!inner(order_no, cycle_id, status)")
        .in("item_id", removing);
      affected = (hits ?? [])
        .filter((h) => {
          const o = h.orders as unknown as { cycle_id: string; status: string };
          return o.cycle_id === data.cycleId && o.status === "Placed";
        })
        .map((h) => ({
          order_no: (h.orders as unknown as { order_no: string }).order_no,
          name: h.name_en,
        }));
      await db.from("cycle_items").delete().eq("cycle_id", data.cycleId).in("item_id", removing);
    }

    if (data.rows.length) {
      const { error } = await db
        .from("cycle_items")
        .upsert(
          data.rows.map((r) => ({ ...r, cycle_id: data.cycleId })),
          { onConflict: "cycle_id,item_id" },
        );
      if (error) throw new Error(error.message);
    }
    await logAudit(ctx, "update", "availability", data.cycleId, null, {
      items: data.rows.length,
      removed: removing.length,
    });
    return { affected };
  });

export const copyAvailability = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ fromCycleId: uuid, toCycleId: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { db, requireAdmin } = await import("./db.server");
    await requireAdmin(context.userId);
    const { data: rows } = await db
      .from("cycle_items")
      .select("item_id, price, cap_qty, min_qty, max_qty")
      .eq("cycle_id", data.fromCycleId);
    if (!rows?.length) return { copied: 0 };
    const { error } = await db
      .from("cycle_items")
      .upsert(
        rows.map((r) => ({ ...r, cycle_id: data.toCycleId })),
        { onConflict: "cycle_id,item_id" },
      );
    if (error) throw new Error(error.message);
    return { copied: rows.length };
  });

/* ----------------------------------------------------------------- dashboard */

export const cycleDashboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ cycleId: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { db, requireAdmin, isCycleOpen } = await import("./db.server");
    await requireAdmin(context.userId);
    const { data: cycle } = await db
      .from("cycles")
      .select("*, branches(name, support_number)")
      .eq("id", data.cycleId)
      .single();
    if (!cycle) throw new Error("Cycle not found");

    const { data: orders } = await db
      .from("orders")
      .select(
        "id, order_no, created_at, delivery_mode, delivery_address, preferred_delivery_time, status, admin_entered, non_collected, note, customers(id, name, mobile), order_items(item_id, name_en, name_ta, unit, qty, price)",
      )
      .eq("cycle_id", data.cycleId)
      .order("created_at", { ascending: false });

    const placed = (orders ?? []).filter((o) => o.status === "Placed");
    let totalQty = 0;
    let totalValue = 0;
    const itemTotals = new Map<
      string,
      { nameEn: string; nameTa: string; unit: string; qty: number; value: number }
    >();
    for (const o of placed)
      for (const li of o.order_items ?? []) {
        totalQty += Number(li.qty);
        totalValue += Number(li.qty) * Number(li.price);
        const cur = itemTotals.get(li.item_id) ?? {
          nameEn: li.name_en,
          nameTa: li.name_ta,
          unit: li.unit,
          qty: 0,
          value: 0,
        };
        cur.qty += Number(li.qty);
        cur.value += Number(li.qty) * Number(li.price);
        itemTotals.set(li.item_id, cur);
      }

    const { data: customers } = await db
      .from("customers")
      .select("id, name, mobile")
      .eq("branch_id", cycle.branch_id)
      .eq("active", true);
    const orderedIds = new Set(placed.map((o) => (o.customers as { id: string } | null)?.id));
    const notYetOrdered = (customers ?? []).filter((c) => !orderedIds.has(c.id));

    return {
      cycle: {
        id: cycle.id,
        cycleNo: cycle.cycle_no,
        status: cycle.status,
        isOpen: isCycleOpen(cycle),
        closeAt: cycle.close_at,
        deliveryDate: cycle.delivery_date,
        branchName: (cycle.branches as unknown as { name: string } | null)?.name ?? "",
        branchId: cycle.branch_id,
      },
      stats: {
        customersOrdered: orderedIds.size,
        totalOrders: placed.length,
        totalQty,
        totalValue,
        registered: (customers ?? []).length,
        notOrdered: notYetOrdered.length,
      },
      notYetOrdered,
      itemTotals: [...itemTotals.values()].sort((a, b) => b.qty - a.qty),
      orders: (orders ?? []).map((o) => ({
        id: o.id,
        orderNo: o.order_no,
        createdAt: o.created_at,
        deliveryMode: o.delivery_mode,
        address: o.delivery_address,
        preferredTime: o.preferred_delivery_time ?? "",
        status: o.status,
        adminEntered: o.admin_entered,
        nonCollected: o.non_collected,
        note: o.note,
        customer: o.customers as unknown as { id: string; name: string; mobile: string } | null,
        lines: (o.order_items ?? []).map((l) => ({
          itemId: l.item_id,
          nameEn: l.name_en,
          nameTa: l.name_ta,
          unit: l.unit,
          qty: Number(l.qty),
          price: Number(l.price),
        })),
        itemCount: (o.order_items ?? []).length,
        value: (o.order_items ?? []).reduce((s, l) => s + Number(l.qty) * Number(l.price), 0),
      })),
    };
  });

/* ------------------------------------------------------------- order editing */

export const adminSaveOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        orderId: uuid.optional(),
        cycleId: uuid,
        customerId: uuid,
        deliveryMode: z.enum(["Door Delivery", "Customer Pickup"]),
        address: z.string().max(400).default(""),
        preferredTime: z.string().max(120).default(""),
        note: z.string().max(500).nullable().default(null),
        override: z.boolean().default(false),
        lines: z.array(z.object({ itemId: uuid, qty: z.number().positive() })).max(200),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { db, requireAdmin, logAudit, validateQty } = await import("./db.server");
    const ctx = await requireAdmin(context.userId);

    const { data: cycle } = await db.from("cycles").select("*").eq("id", data.cycleId).single();
    if (!cycle) throw new Error("Cycle not found");

    const { data: avail } = await db
      .from("cycle_items")
      .select("price, min_qty, max_qty, items(id, name_en, name_ta, unit, min_qty, max_qty)")
      .eq("cycle_id", data.cycleId);
    const meta = new Map<
      string,
      { price: number; min: number; max: number; nameEn: string; nameTa: string; unit: string }
    >();
    for (const row of avail ?? []) {
      const it = row.items as unknown as {
        id: string;
        name_en: string;
        name_ta: string;
        unit: string;
        min_qty: number;
        max_qty: number;
      } | null;
      if (!it) continue;
      meta.set(it.id, {
        price: Number(row.price),
        min: Number(row.min_qty ?? it.min_qty),
        max: Number(row.max_qty ?? it.max_qty),
        nameEn: it.name_en,
        nameTa: it.name_ta,
        unit: it.unit,
      });
    }
    if (!data.override)
      for (const l of data.lines) {
        const m = meta.get(l.itemId);
        if (!m) throw new Error("Item is not part of this cycle.");
        const err = validateQty(l.qty, { name: m.nameEn, unit: m.unit, min: m.min, max: m.max });
        if (err) throw new Error(err);
      }

    let orderId = data.orderId;
    let before: unknown = null;
    if (orderId) {
      const { data: b } = await db
        .from("orders")
        .select("*, order_items(item_id, name_en, qty)")
        .eq("id", orderId)
        .single();
      before = b;
      await db
        .from("orders")
        .update({
          delivery_mode: data.deliveryMode,
          delivery_address: data.address,
          preferred_delivery_time: data.preferredTime,
          note: data.note,
        })
        .eq("id", orderId);
      await db.from("order_items").delete().eq("order_id", orderId);
    } else {
      const { data: customer } = await db
        .from("customers")
        .select("branch_id")
        .eq("id", data.customerId)
        .single();
      const { data: created, error } = await db
        .from("orders")
        .insert({
          cycle_id: data.cycleId,
          customer_id: data.customerId,
          branch_id: customer!.branch_id,
          delivery_mode: data.deliveryMode,
          delivery_address: data.address,
          preferred_delivery_time: data.preferredTime,
          note: data.note,
          admin_entered: true,
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      orderId = created.id;
    }

    if (data.lines.length)
      await db.from("order_items").insert(
        data.lines.map((l) => {
          const m = meta.get(l.itemId)!;
          return {
            order_id: orderId!,
            item_id: l.itemId,
            name_en: m.nameEn,
            name_ta: m.nameTa,
            unit: m.unit,
            qty: l.qty,
            price: m.price,
          };
        }),
      );

    await logAudit(ctx, before ? "update" : "create", "order", orderId!, before, data.lines);
    return { id: orderId };
  });

export const adminOrderAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        orderId: uuid,
        action: z.enum(["cancel", "non_collect", "clear_non_collect"]),
        reason: z.string().max(300).nullable().default(null),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { db, requireAdmin, logAudit } = await import("./db.server");
    const ctx = await requireAdmin(context.userId);
    const patch =
      data.action === "cancel"
        ? { status: "Cancelled", cancel_reason: data.reason }
        : data.action === "non_collect"
          ? { non_collected: true, non_collection_reason: data.reason }
          : { non_collected: false, non_collection_reason: null };
    const { error } = await db.from("orders").update(patch).eq("id", data.orderId);
    if (error) throw new Error(error.message);
    await logAudit(ctx, data.action, "order", data.orderId, null, patch);
    return { ok: true };
  });

/* --------------------------------------------------- procurement and sheets */

export const procurement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ cycleId: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { db, requireAdmin } = await import("./db.server");
    await requireAdmin(context.userId);
    const { data: cycle } = await db
      .from("cycles")
      .select("*, branches(name, pickup_address, collection_timing, support_number)")
      .eq("id", data.cycleId)
      .single();
    const { data: orders } = await db
      .from("orders")
      .select(
        "id, order_no, created_at, delivery_mode, delivery_address, preferred_delivery_time, note, status, customers(name, mobile, area, map_link), order_items(item_id, name_en, name_ta, unit, qty, price)",
      )
      .eq("cycle_id", data.cycleId)
      .eq("status", "Placed")
      .order("order_no");
    const { data: categories } = await db.from("categories").select("id, name").order("sort_order");
    const { data: items } = await db.from("items").select("id, category_id, supplier_id");
    const { data: suppliers } = await db.from("suppliers").select("id, name").order("name");
    const catOf = new Map((items ?? []).map((i) => [i.id, i.category_id]));
    const supOf = new Map((items ?? []).map((i) => [i.id, i.supplier_id]));
    const catName = new Map((categories ?? []).map((c) => [c.id, c.name]));
    const supName = new Map((suppliers ?? []).map((s) => [s.id, s.name]));

    const agg = new Map<
      string,
      {
        nameEn: string;
        nameTa: string;
        unit: string;
        qty: number;
        value: number;
        category: string;
        supplierId: string;
        supplier: string;
      }
    >();
    for (const o of orders ?? [])
      for (const li of o.order_items ?? []) {
        const sid = supOf.get(li.item_id) ?? "";
        const cur = agg.get(li.item_id) ?? {
          nameEn: li.name_en,
          nameTa: li.name_ta,
          unit: li.unit,
          qty: 0,
          value: 0,
          category: catName.get(catOf.get(li.item_id) ?? "") ?? "Other",
          supplierId: sid ?? "",
          supplier: (sid ? supName.get(sid) : null) ?? "Unassigned",
        };
        cur.qty += Number(li.qty);
        cur.value += Number(li.qty) * Number(li.price);
        agg.set(li.item_id, cur);
      }

    return {
      cycle: {
        cycleNo: cycle!.cycle_no,
        deliveryDate: cycle!.delivery_date,
        branch: (cycle!.branches as unknown as { name: string }).name,
        pickupAddress: (cycle!.branches as unknown as { pickup_address: string }).pickup_address,
        collectionTiming: (cycle!.branches as unknown as { collection_timing: string })
          .collection_timing,
      },
      suppliers: (suppliers ?? []).map((s) => ({ id: s.id, name: s.name })),
      farmOrder: [...agg.values()].sort(
        (a, b) =>
          a.supplier.localeCompare(b.supplier) ||
          a.category.localeCompare(b.category) ||
          a.nameEn.localeCompare(b.nameEn),
      ),
      sheets: (orders ?? []).map((o) => ({
        orderNo: o.order_no,
        createdAt: o.created_at,
        deliveryMode: o.delivery_mode,
        address: o.delivery_address,
        preferredTime: o.preferred_delivery_time ?? "",
        note: o.note,
        customer: o.customers as unknown as {
          name: string;
          mobile: string;
          area: string;
          map_link: string | null;
        },
        lines: (o.order_items ?? []).map((l) => ({
          nameEn: l.name_en,
          nameTa: l.name_ta,
          unit: l.unit,
          qty: Number(l.qty),
          price: Number(l.price),
        })),
      })),
    };
  });

/* ------------------------------------------------------------------- reports */

export const reports = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        from: z.string().nullable().default(null),
        to: z.string().nullable().default(null),
        branchIds: z.array(uuid).default([]),
        customerQ: z.string().max(80).default(""),
        itemQ: z.string().max(80).default(""),
        cycleNo: z.number().int().nullable().default(null),
        lapsedCycles: z.number().int().min(1).max(20).default(3),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { db, requireAdmin, branchScope } = await import("./db.server");
    const ctx = await requireAdmin(context.userId);
    const scope = branchScope(ctx);
    const branchIds = scope ? [scope] : data.branchIds;

    let q = db
      .from("orders")
      .select(
        "id, order_no, created_at, branch_id, non_collected, status, cycles(cycle_no, delivery_date), branches(name), customers(id, name, mobile), order_items(item_id, name_en, name_ta, unit, qty, price)",
      )
      .eq("status", "Placed");
    if (branchIds.length) q = q.in("branch_id", branchIds);
    if (data.from) q = q.gte("created_at", data.from);
    if (data.to) q = q.lte("created_at", `${data.to}T23:59:59`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    let orders = rows ?? [];
    if (data.cycleNo != null)
      orders = orders.filter(
        (o) => (o.cycles as unknown as { cycle_no: number } | null)?.cycle_no === data.cycleNo,
      );
    if (data.customerQ) {
      const needle = data.customerQ.toLowerCase();
      orders = orders.filter((o) => {
        const c = o.customers as unknown as { name: string; mobile: string } | null;
        return (
          !!c && (c.name.toLowerCase().includes(needle) || c.mobile.includes(data.customerQ))
        );
      });
    }
    const matchesItem = (l: { name_en: string; name_ta: string }) =>
      !data.itemQ ||
      l.name_en.toLowerCase().includes(data.itemQ.toLowerCase()) ||
      l.name_ta.includes(data.itemQ);

    const customerReport = new Map<
      string,
      { name: string; mobile: string; orders: number; qty: number; value: number; last: string }
    >();
    const itemReport = new Map<
      string,
      { nameEn: string; nameTa: string; unit: string; qty: number; value: number; orders: number }
    >();
    const customerItem: {
      customer: string;
      mobile: string;
      item: string;
      itemTa: string;
      qty: number;
      times: number;
    }[] = [];
    const ciKey = new Map<string, number>();
    const cycleReport = new Map<
      string,
      { label: string; customers: Set<string>; orders: number; qty: number; value: number; items: Set<string> }
    >();
    const branchReport = new Map<
      string,
      { name: string; orders: number; customers: Set<string>; qty: number; value: number }
    >();
    const nonCollection: { orderNo: string; customer: string; mobile: string; cycle: number }[] =
      [];

    for (const o of orders) {
      const c = o.customers as unknown as { id: string; name: string; mobile: string } | null;
      const cyc = o.cycles as unknown as { cycle_no: number; delivery_date: string } | null;
      const branchName = (o.branches as unknown as { name: string } | null)?.name ?? "—";
      const lines = (o.order_items ?? []).filter(matchesItem);
      if (data.itemQ && lines.length === 0) continue;
      const qty = lines.reduce((s, l) => s + Number(l.qty), 0);
      const value = lines.reduce((s, l) => s + Number(l.qty) * Number(l.price), 0);

      if (c) {
        const cur = customerReport.get(c.id) ?? {
          name: c.name,
          mobile: c.mobile,
          orders: 0,
          qty: 0,
          value: 0,
          last: o.created_at,
        };
        cur.orders++;
        cur.qty += qty;
        cur.value += value;
        if (o.created_at > cur.last) cur.last = o.created_at;
        customerReport.set(c.id, cur);
      }

      for (const l of lines) {
        const cur = itemReport.get(l.item_id) ?? {
          nameEn: l.name_en,
          nameTa: l.name_ta,
          unit: l.unit,
          qty: 0,
          value: 0,
          orders: 0,
        };
        cur.qty += Number(l.qty);
        cur.value += Number(l.qty) * Number(l.price);
        cur.orders++;
        itemReport.set(l.item_id, cur);

        if (c) {
          const key = `${c.id}|${l.item_id}`;
          const idx = ciKey.get(key);
          if (idx == null) {
            ciKey.set(key, customerItem.length);
            customerItem.push({
              customer: c.name,
              mobile: c.mobile,
              item: l.name_en,
              itemTa: l.name_ta,
              qty: Number(l.qty),
              times: 1,
            });
          } else {
            customerItem[idx]!.qty += Number(l.qty);
            customerItem[idx]!.times += 1;
          }
        }
      }

      const cycKey = `${branchName}#${cyc?.cycle_no ?? "?"}`;
      const cr = cycleReport.get(cycKey) ?? {
        label: `${branchName} — Cycle ${cyc?.cycle_no ?? "?"}`,
        customers: new Set<string>(),
        orders: 0,
        qty: 0,
        value: 0,
        items: new Set<string>(),
      };
      cr.orders++;
      cr.qty += qty;
      cr.value += value;
      if (c) cr.customers.add(c.id);
      lines.forEach((l) => cr.items.add(l.item_id));
      cycleReport.set(cycKey, cr);

      const br = branchReport.get(o.branch_id) ?? {
        name: branchName,
        orders: 0,
        customers: new Set<string>(),
        qty: 0,
        value: 0,
      };
      br.orders++;
      br.qty += qty;
      br.value += value;
      if (c) br.customers.add(c.id);
      branchReport.set(o.branch_id, br);

      if (o.non_collected && c)
        nonCollection.push({
          orderNo: o.order_no,
          customer: c.name,
          mobile: c.mobile,
          cycle: cyc?.cycle_no ?? 0,
        });
    }

    // lapsed customers: active customers with no order in the last N cycles of their branch
    let custQ = db.from("customers").select("id, name, mobile, branch_id").eq("active", true);
    if (branchIds.length) custQ = custQ.in("branch_id", branchIds);
    const { data: allCustomers } = await custQ;
    const { data: recentCycles } = await db
      .from("cycles")
      .select("id, branch_id, cycle_no")
      .order("cycle_no", { ascending: false });
    const recentByBranch = new Map<string, string[]>();
    for (const c of recentCycles ?? []) {
      const arr = recentByBranch.get(c.branch_id) ?? [];
      if (arr.length < data.lapsedCycles) arr.push(c.id);
      recentByBranch.set(c.branch_id, arr);
    }
    const recentIds = [...recentByBranch.values()].flat();
    const { data: recentOrders } = recentIds.length
      ? await db
          .from("orders")
          .select("customer_id, cycle_id")
          .in("cycle_id", recentIds)
          .eq("status", "Placed")
      : { data: [] as { customer_id: string; cycle_id: string }[] };
    const orderedRecently = new Set((recentOrders ?? []).map((o) => o.customer_id));
    const lapsed = (allCustomers ?? []).filter((c) => !orderedRecently.has(c.id));

    return {
      customerValue: [...customerReport.values()]
        .map((c) => ({ ...c, avg: c.orders ? c.value / c.orders : 0 }))
        .sort((a, b) => b.value - a.value),
      itemMovement: [...itemReport.values()].sort((a, b) => b.qty - a.qty),
      customerItem: customerItem.sort((a, b) => b.times - a.times),
      cycleSummary: [...cycleReport.values()].map((c) => ({
        label: c.label,
        customers: c.customers.size,
        orders: c.orders,
        qty: c.qty,
        value: c.value,
        items: c.items.size,
      })),
      branchComparison: ctx.isSuper
        ? [...branchReport.values()].map((b) => ({
            name: b.name,
            orders: b.orders,
            customers: b.customers.size,
            qty: b.qty,
            value: b.value,
          }))
        : [],
      lapsed,
      nonCollection,
    };
  });

export const auditLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { db, requireSuperAdmin } = await import("./db.server");
    await requireSuperAdmin(context.userId);
    const { data } = await db
      .from("audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300);
    return data ?? [];
  });

/** Bootstrap: the very first signed-in user becomes Super Admin. */
export const claimSuperAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ email: z.string().max(200).default(""), name: z.string().max(120).default("") }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { db } = await import("./db.server");
    const { count } = await db.from("user_roles").select("id", { count: "exact", head: true });
    const { data: mine } = await db
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (mine && mine.length) return { role: mine[0]!.role, created: false };
    if ((count ?? 0) > 0) return { role: null, created: false };
    const { error } = await db.from("user_roles").insert({
      user_id: context.userId,
      role: "super_admin",
      email: data.email,
      full_name: data.name || data.email,
    });
    if (error) throw new Error(error.message);
    return { role: "super_admin" as const, created: true };
  });
