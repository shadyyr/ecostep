import type { Suggestion } from "@/types";

export const INTELLIGENCE_DISCLAIMER =
  "EcoStep intelligence uses demo data and estimates. Verify incentive eligibility, rates, permits, and financing terms with official providers before making purchase decisions.";

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function round(value: number, digits = 0): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function asFiniteNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[$,\s]/g, ""));
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

export function zipPrefix(zipCode: string, length = 3): string {
  const digits = zipCode.replace(/\D/g, "");
  return digits.slice(0, length) || "ANY";
}

export function sumBy<T>(items: T[], value: (item: T) => number): number {
  return items.reduce((sum, item) => sum + value(item), 0);
}

export function totalRebateUSD(suggestion: Suggestion): number {
  return sumBy(suggestion.appliedIncentives, (incentive) => incentive.rebateValueUSD);
}

export function effectivePriceUSD(suggestion: Suggestion): number {
  return Math.max(0, suggestion.priceUSD - totalRebateUSD(suggestion));
}

export function stableHash(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) % 100000;
  }
  return hash;
}
