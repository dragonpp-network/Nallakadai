import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const mobileSchema = z.object({ mobile: z.string().min(6).max(20) });

const submitSchema = z.object({
  mobile: z.string().min(6).max(20),
  cycleId: z.string().uuid(),
  deliveryMode: z.enum(["Door Delivery", "Customer Pickup"]),
  address: z.string().max(500).default(""),
  preferredTime: z.string().max(120).default(""),
  note: z.string().max(500).optional(),
  lines: z
    .array(z.object({ itemId: z.string().uuid(), qty: z.number().positive() }))
    .min(1)
    .max(200),
});

/** Customer entry: resolve the mobile number to a customer, branch and current cycle. */
export const lookupCustomer = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => mobileSchema.parse(d))
  .handler(async ({ data }) => {
    const { db, normaliseMobile, isCycleOpen } = await import("./db.server");
    const mobile = normaliseMobile(data.mobile);
    const { data: customer } = await db
      .from("customers")
      .select(
        "id, name, mobile, branch_id, delivery_mode, address, area, active, map_link, preferred_delivery_time",
      )
      .eq("mobile", mobile)
      .maybeSingle();

    if (!customer || !customer.active) {
      // Alternate numbers are contact-only: they can never be used to sign in.
      const { data: altMatch } = await db
        .from("customers")
        .select("mobile, active")
        .eq("alt_mobile", mobile)
        .maybeSingle();
      if (altMatch?.active) {
        return {
          status: "alt" as const,
          primaryHint: `${altMatch.mobile.slice(0, 2)}••••••${altMatch.mobile.slice(-2)}`,
        };
      }
      const { data: fallback } = await db
        .from("branches")
        .select("whatsapp_number, support_number")
        .eq("active", true)
        .limit(1)
        .maybeSingle();
      return {
        status: "unknown" as const,
        whatsapp: fallback?.whatsapp_number ?? "",
        support: fallback?.support_number ?? "",
      };
    }

    const { data: branch } = await db
      .from("branches")
      .select("*")
      .eq("id", customer.branch_id)
      .single();

    const { data: cycles } = await db
      .from("cycles")
      .select("*")
      .eq("branch_id", customer.branch_id)
      .in("status", ["Open", "Closed"])
      .order("cycle_no", { ascending: false })
      .limit(5);

    const cycle = (cycles ?? []).find((c) => isCycleOpen(c)) ?? null;

    if (!cycle) {
      return {
        status: "closed" as const,
        name: customer.name,
        support: branch?.support_number ?? "",
        whatsapp: branch?.whatsapp_number ?? "",
        nextOpening: branch?.next_opening_note ?? null,
      };
    }

    return {
      status: "ok" as const,
      customer: {
        id: customer.id,
        name: customer.name,
        mobile: customer.mobile,
        deliveryMode: customer.delivery_mode,
        address: customer.address,
        area: customer.area,
        mapLink: customer.map_link ?? "",
        preferredTime: customer.preferred_delivery_time ?? "",
      },
      branch: {
        id: branch!.id,
        name: branch!.name,
        showPrices: branch!.show_prices,
        support: branch!.support_number,
        whatsapp: branch!.whatsapp_number,
        pickupAddress: branch!.pickup_address,
        collectionTiming: branch!.collection_timing,
      },
      cycle: {
        id: cycle.id,
        cycleNo: cycle.cycle_no,
        closeAt: cycle.close_at,
        deliveryDate: cycle.delivery_date,
      },
    };
  });

/** Full ordering payload: available items by category, plus this customer's current and last order. */
export const getStore = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => mobileSchema.parse(d))
  .handler(async ({ data }) => {
    const { db, normaliseMobile, isCycleOpen } = await import("./db.server");
    const mobile = normaliseMobile(data.mobile);
    const { data: customer } = await db
      .from("customers")
      .select("id, branch_id")
      .eq("mobile", mobile)
      .eq("active", true)
      .maybeSingle();
    if (!customer) throw new Error("Customer not found");

    const { data: cycles } = await db
      .from("cycles")
      .select("*")
      .eq("branch_id", customer.branch_id)
      .order("cycle_no", { ascending: false })
      .limit(5);
    const cycle = (cycles ?? []).find((c) => isCycleOpen(c));
    if (!cycle) throw new Error("Store closed");

    const [{ data: categories }, { data: avail }] = await Promise.all([
      db.from("categories").select("*").eq("active", true).order("sort_order"),
      db
        .from("cycle_items")
        .select("id, price, cap_qty, min_qty, max_qty, items(*)")
        .eq("cycle_id", cycle.id),
    ]);

    // sold-out detection against the per-cycle cap
    const { data: cycleOrders } = await db
      .from("orders")
      .select("id, order_items(item_id, qty)")
      .eq("cycle_id", cycle.id)
      .eq("status", "Placed");
    const ordered = new Map<string, number>();
    for (const o of cycleOrders ?? [])
      for (const li of (o.order_items ?? []) as { item_id: string; qty: number }[])
        ordered.set(li.item_id, (ordered.get(li.item_id) ?? 0) + Number(li.qty));

    const items = (avail ?? [])
      .filter((row) => row.items && (row.items as { active: boolean }).active)
      .map((row) => {
        const it = row.items as unknown as {
          id: string;
          name_en: string;
          name_ta: string;
          category_id: string;
          unit: string;
          presets: number[];
          min_qty: number;
          max_qty: number;
          image_url: string | null;
        };
        return {
          itemId: it.id,
          nameEn: it.name_en,
          nameTa: it.name_ta,
          categoryId: it.category_id,
          unit: it.unit,
          presets: it.presets ?? [],
          min: Number(row.min_qty ?? it.min_qty),
          max: Number(row.max_qty ?? it.max_qty),
          price: Number(row.price),
          imageUrl: it.image_url,
          soldOut: row.cap_qty != null && (ordered.get(it.id) ?? 0) >= Number(row.cap_qty),
        };
      })
      .sort((a, b) => a.nameEn.localeCompare(b.nameEn));

    const { data: current } = await db
      .from("orders")
      .select(
        "id, order_no, note, delivery_mode, delivery_address, preferred_delivery_time, order_items(item_id, qty)",
      )
      .eq("cycle_id", cycle.id)
      .eq("customer_id", customer.id)
      .eq("status", "Placed")
      .maybeSingle();

    const { data: previous } = await db
      .from("orders")
      .select("id, created_at, order_items(item_id, qty, name_en)")
      .eq("customer_id", customer.id)
      .eq("status", "Placed")
      .neq("cycle_id", cycle.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return {
      categories: (categories ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        nameTa: c.name_ta,
        tint: c.tint,
        icon: (c as { icon?: string }).icon ?? "leaf",
      })),
      items,
      current: current
        ? {
            id: current.id,
            orderNo: current.order_no,
            note: current.note,
            deliveryMode: current.delivery_mode,
            address: current.delivery_address,
            preferredTime: current.preferred_delivery_time ?? "",
            lines: (current.order_items ?? []).map((l) => ({
              itemId: l.item_id,
              qty: Number(l.qty),
            })),
          }
        : null,
      lastOrder: previous
        ? (previous.order_items ?? []).map((l) => ({
            itemId: l.item_id,
            qty: Number(l.qty),
            nameEn: l.name_en,
          }))
        : null,
    };
  });

/** Place or replace this customer's order for the open cycle. */
export const submitOrder = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => submitSchema.parse(d))
  .handler(async ({ data }) => {
    const { db, normaliseMobile, isCycleOpen, validateQty } = await import("./db.server");
    const mobile = normaliseMobile(data.mobile);
    const { data: customer } = await db
      .from("customers")
      .select("id, branch_id")
      .eq("mobile", mobile)
      .eq("active", true)
      .maybeSingle();
    if (!customer) throw new Error("Customer not found");

    const { data: cycle } = await db.from("cycles").select("*").eq("id", data.cycleId).single();
    if (!cycle || cycle.branch_id !== customer.branch_id || !isCycleOpen(cycle))
      throw new Error("This order window has closed.");

    const { data: avail } = await db
      .from("cycle_items")
      .select("price, min_qty, max_qty, items(id, name_en, name_ta, unit, min_qty, max_qty, active)")
      .eq("cycle_id", cycle.id);

    const byItem = new Map<string, { price: number; min: number; max: number; it: never }>();
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
        active: boolean;
      } | null;
      if (!it || !it.active) continue;
      meta.set(it.id, {
        price: Number(row.price),
        min: Number(row.min_qty ?? it.min_qty),
        max: Number(row.max_qty ?? it.max_qty),
        nameEn: it.name_en,
        nameTa: it.name_ta,
        unit: it.unit,
      });
    }
    byItem.clear();

    for (const line of data.lines) {
      const m = meta.get(line.itemId);
      if (!m) throw new Error("One of the items is no longer available this cycle.");
      const err = validateQty(line.qty, {
        name: m.nameEn,
        unit: m.unit,
        min: m.min,
        max: m.max,
      });
      if (err) throw new Error(err);
    }

    // A revision never edits the old order in place: the previous order is
    // cancelled and a brand-new order number is issued, so both the customer
    // and the admin see the change trail.
    const { data: existing } = await db
      .from("orders")
      .select("id, order_no")
      .eq("cycle_id", cycle.id)
      .eq("customer_id", customer.id)
      .eq("status", "Placed")
      .maybeSingle();

    // Cancel the old order first so the active-order unique index frees the slot.
    if (existing) {
      const { error: cancelErr } = await db
        .from("orders")
        .update({
          status: "Cancelled",
          cancel_reason: "Revised by customer — replacement pending",
        })
        .eq("id", existing.id);
      if (cancelErr) throw new Error(cancelErr.message);
    }

    const { data: created, error } = await db
      .from("orders")
      .insert({
        cycle_id: cycle.id,
        customer_id: customer.id,
        branch_id: customer.branch_id,
        delivery_mode: data.deliveryMode,
        delivery_address: data.address,
        preferred_delivery_time: data.preferredTime,
        note: data.note ?? null,
      })
      .select("id, order_no")
      .single();
    if (error) throw new Error(error.message);
    const orderId = created.id;

    await db.from("order_items").insert(
      data.lines.map((l) => {
        const m = meta.get(l.itemId)!;
        return {
          order_id: orderId,
          item_id: l.itemId,
          name_en: m.nameEn,
          name_ta: m.nameTa,
          unit: m.unit,
          qty: l.qty,
          price: m.price,
        };
      }),
    );

    if (existing) {
      await db
        .from("orders")
        .update({
          cancel_reason: `Revised by customer — replaced by ${created.order_no}`,
        })
        .eq("id", existing.id);

      await db.from("audit_log").insert({
        actor_id: null,
        actor_label: `Customer ${mobile}`,
        action: "order_revised",
        entity: "orders",
        entity_id: orderId,
        before: { orderNo: existing.order_no, status: "Cancelled" } as never,
        after: { orderNo: created.order_no, status: "Placed" } as never,
      });
    }

    return {
      orderNo: created.order_no,
      deliveryDate: cycle.delivery_date,
      replacedOrderNo: existing?.order_no ?? null,
    };
  });

/** Past orders for this customer, newest first. */
export const getOrderHistory = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => mobileSchema.parse(d))
  .handler(async ({ data }) => {
    const { db, normaliseMobile } = await import("./db.server");
    const mobile = normaliseMobile(data.mobile);
    const { data: customer } = await db
      .from("customers")
      .select("id")
      .eq("mobile", mobile)
      .eq("active", true)
      .maybeSingle();
    if (!customer) return { orders: [] };

    const { data: orders } = await db
      .from("orders")
      .select(
        "id, order_no, status, created_at, delivery_mode, preferred_delivery_time, cycles(delivery_date, cycle_no), order_items(item_id, name_en, name_ta, qty, unit, price)",
      )
      .eq("customer_id", customer.id)
      .order("created_at", { ascending: false })
      .limit(20);

    return {
      orders: (orders ?? []).map((o) => {
        const cyc = o.cycles as unknown as { delivery_date: string | null; cycle_no: number } | null;
        const lines = ((o.order_items ?? []) as {
          item_id: string;
          name_en: string;
          name_ta: string | null;
          qty: number;
          unit: string;
          price: number;
        }[]).map((l) => ({
          itemId: l.item_id,
          nameEn: l.name_en,
          nameTa: l.name_ta ?? "",
          qty: Number(l.qty),
          unit: l.unit,
          price: Number(l.price),
        }));
        return {
          id: o.id,
          orderNo: o.order_no,
          status: o.status,
          createdAt: o.created_at,
          deliveryMode: o.delivery_mode,
          preferredTime: o.preferred_delivery_time ?? "",
          cycleNo: cyc?.cycle_no ?? null,
          deliveryDate: cyc?.delivery_date ?? null,
          lines,
          total: lines.reduce((t, l) => t + l.qty * l.price, 0),
        };
      }),
    };
  });
