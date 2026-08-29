import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const db = supabaseAdmin;

export type AdminCtx = {
  userId: string;
  role: "branch_admin" | "super_admin";
  branchId: string | null;
  label: string;
  isSuper: boolean;
};

/** Resolves the signed-in user's admin role. Throws when they have none. */
export async function requireAdmin(userId: string): Promise<AdminCtx> {
  const { data, error } = await db
    .from("user_roles")
    .select("role, branch_id, email, full_name")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("You do not have admin access.");
  const superRow = data.find((r) => r.role === "super_admin");
  const row = superRow ?? data[0]!;
  return {
    userId,
    role: row.role as AdminCtx["role"],
    branchId: row.branch_id,
    label: row.full_name || row.email || userId,
    isSuper: !!superRow,
  };
}

export async function requireSuperAdmin(userId: string): Promise<AdminCtx> {
  const ctx = await requireAdmin(userId);
  if (!ctx.isSuper) throw new Error("Super Admin access required.");
  return ctx;
}

/** Branch a branch admin is limited to; null for super admins (all branches). */
export function branchScope(ctx: AdminCtx): string | null {
  return ctx.isSuper ? null : ctx.branchId;
}

export async function logAudit(
  ctx: AdminCtx,
  action: string,
  entity: string,
  entityId: string | null,
  before: unknown,
  after: unknown,
) {
  await db.from("audit_log").insert({
    actor_id: ctx.userId,
    actor_label: ctx.label,
    action,
    entity,
    entity_id: entityId,
    before: before === undefined ? null : (before as never),
    after: after === undefined ? null : (after as never),
  });
}

/** A cycle accepts orders when it is Open, not force-closed, and inside its window. */
export function isCycleOpen(cycle: {
  status: string;
  close_at: string | null;
  open_at: string | null;
  manual_override: string | null;
}) {
  if (cycle.manual_override === "force_closed") return false;
  if (cycle.manual_override === "force_open") return cycle.status !== "Delivered";
  if (cycle.status !== "Open") return false;
  const now = Date.now();
  if (cycle.open_at && new Date(cycle.open_at).getTime() > now) return false;
  if (cycle.close_at && new Date(cycle.close_at).getTime() <= now) return false;
  return true;
}

export function normaliseMobile(input: string) {
  return input.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "").slice(-10);
}

/** Shared min/max guard — the critical unit-confusion protection (FR-4.5). */
export function validateQty(
  qty: number,
  opts: { name: string; unit: string; min: number; max: number },
): string | null {
  if (!Number.isFinite(qty) || qty <= 0) return `Please enter a quantity for ${opts.name}.`;
  if (qty < opts.min || qty > opts.max)
    return `${opts.name} is sold in ${opts.unit.toLowerCase()}. Please enter between ${opts.min} and ${opts.max} ${opts.unit.toLowerCase()}.`;
  return null;
}
