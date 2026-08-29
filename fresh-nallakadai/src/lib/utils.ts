import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatMoney = (n: number) => `₹${n.toFixed(2)}`;
export const roundQty = (n: number) => Math.round(n * 1000) / 1000;
