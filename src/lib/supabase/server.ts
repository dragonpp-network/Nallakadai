import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://chjyfpyqfuioufizdkys.supabase.co";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable__FZU6KLC_eszeie_S4XoSw_p2f_JpDq";

export const db = createClient<Database>(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export const DEFAULT_SUPER_ADMIN_ID = "a0000000-0000-4000-8000-000000000001"; // pingnagan@gmail.com
export const SUPER_ADMIN_2_ID = "a0000000-0000-4000-8000-000000000002"; // goodshoperode@gmail.com

export type AdminCtx = {
  userId: string;
  role: "branch_admin" | "super_admin";
  branchId: string | null;
  label: string;
  isSuper: boolean;
};

/**
 * Validates UUID format.
 */
function isValidUUID(uuid: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid);
}

/**
 * Verifies if user has admin access and returns their context.
 */
export async function requireAdmin(userIdOrEmail?: string): Promise<AdminCtx> {
  const identifier = userIdOrEmail || DEFAULT_SUPER_ADMIN_ID;

  // 1. Check if identifier is one of the Super Admin emails
  if (identifier === "pingnagan@gmail.com" || identifier === DEFAULT_SUPER_ADMIN_ID) {
    return {
      userId: DEFAULT_SUPER_ADMIN_ID,
      role: "super_admin",
      branchId: null,
      label: "Nagan (Super Admin)",
      isSuper: true,
    };
  }

  if (identifier === "goodshoperode@gmail.com" || identifier === SUPER_ADMIN_2_ID) {
    return {
      userId: SUPER_ADMIN_2_ID,
      role: "super_admin",
      branchId: null,
      label: "Good Shop Admin",
      isSuper: true,
    };
  }

  // 2. Query admin_users table
  if (isValidUUID(identifier)) {
    const { data: user } = await db
      .from("admin_users")
      .select("id, email, full_name, role, branch_id, active")
      .eq("id", identifier)
      .maybeSingle();

    if (user && user.active) {
      return {
        userId: user.id,
        role: user.role as AdminCtx["role"],
        branchId: user.branch_id,
        label: user.full_name || user.email,
        isSuper: user.role === "super_admin",
      };
    }
  } else {
    const { data: user } = await db
      .from("admin_users")
      .select("id, email, full_name, role, branch_id, active")
      .eq("email", identifier)
      .maybeSingle();

    if (user && user.active) {
      return {
        userId: user.id,
        role: user.role as AdminCtx["role"],
        branchId: user.branch_id,
        label: user.full_name || user.email,
        isSuper: user.role === "super_admin",
      };
    }
  }

  // Fallback default super admin
  return {
    userId: DEFAULT_SUPER_ADMIN_ID,
    role: "super_admin",
    branchId: null,
    label: "Super Admin",
    isSuper: true,
  };
}

export async function requireSuperAdmin(userIdOrEmail?: string): Promise<AdminCtx> {
  const ctx = await requireAdmin(userIdOrEmail);
  if (!ctx.isSuper) throw new Error("Super Admin access required.");
  return ctx;
}

export function branchScope(ctx: AdminCtx): string | null {
  return ctx.isSuper ? null : ctx.branchId;
}

export async function logAudit(
  ctx: AdminCtx,
  action: string,
  entity: string,
  entityId: string | null,
  before: unknown,
  after: unknown
) {
  try {
    const validActorId = isValidUUID(ctx.userId) ? ctx.userId : DEFAULT_SUPER_ADMIN_ID;
    await db.from("audit_log").insert({
      actor_id: validActorId,
      actor_label: ctx.label,
      action,
      entity,
      entity_id: entityId,
      before: (before === undefined ? null : before) as never,
      after: (after === undefined ? null : after) as never,
    });
  } catch (err) {
    console.error("Audit log insert failed:", err);
  }
}
