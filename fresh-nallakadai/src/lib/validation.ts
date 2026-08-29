/**
 * Normalizes user input mobile number to 10 digits without leading +91 or non-digits.
 */
export function normaliseMobile(input: string): string {
  return input.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "").slice(-10);
}

/**
 * Strict Unit-Confusion Protection Guard (FR-4.5)
 * Prevents errors like entering 500 (thinking grams) on an item sold in Kg with max 10kg.
 */
export function validateQty(
  qty: number,
  opts: { name: string; unit: string; min: number; max: number }
): string | null {
  if (!Number.isFinite(qty) || qty <= 0) {
    return `Please enter a valid quantity for ${opts.name}.`;
  }
  if (qty < opts.min || qty > opts.max) {
    return `${opts.name} is sold in ${opts.unit.toLowerCase()}. Please enter between ${opts.min} and ${opts.max} ${opts.unit.toLowerCase()}.`;
  }
  return null;
}

/**
 * Validates whether a cycle is currently open for orders.
 */
export function isCycleOpen(cycle: {
  status: string;
  close_at: string | null;
  open_at: string | null;
  manual_override: string | null;
}): boolean {
  if (cycle.manual_override === "force_closed") return false;
  if (cycle.manual_override === "force_open") return cycle.status !== "Delivered";
  if (cycle.status !== "Open") return false;

  const now = Date.now();
  if (cycle.open_at && new Date(cycle.open_at).getTime() > now) return false;
  if (cycle.close_at && new Date(cycle.close_at).getTime() <= now) return false;
  return true;
}
