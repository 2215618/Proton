import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type CurrencyCode = "USD" | "PEN";

/**
 * Formato consistente bimoneda:
 * USD => "$" | PEN => "S/"
 */
export function formatMoney(amount: number | null | undefined, currency: CurrencyCode = "USD") {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return "—";
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Backward compatible: antes era USD fijo */
export function formatCurrency(amount: number) {
  return formatMoney(amount, "USD");
}

/**
 * Heurística lead:
 * <= 10,000 => PEN (alquiler)
 * > 10,000 => USD (venta)
 */
export function guessCurrencyFromBudget(maxBudget: number | null | undefined): CurrencyCode {
  const v = maxBudget ?? 0;
  return v <= 10000 ? "PEN" : "USD";
}

export function formatBudgetRange(min: number | null | undefined, max: number | null | undefined) {
  const currency = guessCurrencyFromBudget(max ?? min ?? 0);
  const a = min ?? 0;
  const b = max ?? 0;
  if (!min && !max) return "—";
  if (a && b && a !== b) return `${formatMoney(a, currency)} – ${formatMoney(b, currency)}`;
  return formatMoney(b || a, currency);
}

export function formatTimeShort(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatDateShort(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

export function makeId() {
  // @ts-ignore
  return typeof crypto !== "undefined" && crypto?.randomUUID
    // @ts-ignore
    ? crypto.randomUUID()
    : `id_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}
