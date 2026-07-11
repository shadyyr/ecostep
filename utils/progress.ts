import type { Suggestion } from "@/types";

export const DEFAULT_RATE_PER_KWH = 0.15;

export interface SavingsProjectionPoint {
  month: number;
  cumulativeUSD: number;
  cumulativeKWh: number;
}

export interface SavingsProjection {
  monthlyUSD: number;
  monthlyKWh: number;
  points: SavingsProjectionPoint[];
}

export function buildSavingsProjection(
  acceptedSuggestions: Suggestion[],
  ratePerKWh: number = DEFAULT_RATE_PER_KWH,
  months = 24
): SavingsProjection {
  const monthlyUSD = acceptedSuggestions.reduce(
    (sum, suggestion) => sum + suggestion.estimatedMonthlySavingsUSD,
    0
  );
  const safeRate = ratePerKWh > 0 ? ratePerKWh : DEFAULT_RATE_PER_KWH;
  const monthlyKWh = monthlyUSD / safeRate;

  const points: SavingsProjectionPoint[] = Array.from({ length: months + 1 }, (_, month) => ({
    month,
    cumulativeUSD: Math.round(monthlyUSD * month * 100) / 100,
    cumulativeKWh: Math.round(monthlyKWh * month * 10) / 10,
  }));

  return { monthlyUSD, monthlyKWh, points };
}
