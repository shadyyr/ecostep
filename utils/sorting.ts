import type { SortMode, Suggestion, Tier } from "@/types";
import { getEffectivePrice } from "@/utils/incentives";

export type SortFn = (suggestions: Suggestion[]) => Suggestion[];

const TIER_BOOST: Record<Tier, number> = { 1: 1.15, 2: 1.0, 3: 0.9 };

function recommendedScore(suggestion: Suggestion): number {
  const price = getEffectivePrice(suggestion);
  const annualSavings = suggestion.estimatedMonthlySavingsUSD * 12;
  const roi = price <= 0 ? annualSavings : annualSavings / price;
  const efficiency = suggestion.conversionEfficiencyPct / 100;
  return (roi * 0.6 + efficiency * 0.4) * TIER_BOOST[suggestion.tier];
}

export const sortRecommended: SortFn = (list) =>
  [...list].sort((a, b) => recommendedScore(b) - recommendedScore(a));

export const sortPriceLowHigh: SortFn = (list) =>
  [...list].sort((a, b) => getEffectivePrice(a) - getEffectivePrice(b));

export const sortEfficiencyHighLow: SortFn = (list) =>
  [...list].sort((a, b) => b.conversionEfficiencyPct - a.conversionEfficiencyPct);

export const sortMaxSavings: SortFn = (list) =>
  [...list].sort((a, b) => b.estimatedMonthlySavingsUSD - a.estimatedMonthlySavingsUSD);

export const SORTERS: Record<SortMode, SortFn> = {
  recommended: sortRecommended,
  priceLowHigh: sortPriceLowHigh,
  efficiencyHighLow: sortEfficiencyHighLow,
  maxSavings: sortMaxSavings,
};

export const SORT_MODE_LABELS: Record<SortMode, string> = {
  recommended: "Recommended",
  priceLowHigh: "Price: Low to High",
  efficiencyHighLow: "Conversion Efficiency: High to Low",
  maxSavings: "Max Savings",
};

export function sortSuggestions(list: Suggestion[], mode: SortMode): Suggestion[] {
  return SORTERS[mode](list);
}
