import type { RecommendationPreference, SortMode, Suggestion, Tier, UserProfile } from "@/types";
import { getEffectivePrice } from "@/utils/incentives";

export type SortFn = (suggestions: Suggestion[]) => Suggestion[];

const TIER_BOOST: Record<Tier, number> = { 1: 1.15, 2: 1.0, 3: 0.9 };

function recommendedScore(suggestion: Suggestion, preference: RecommendationPreference): number {
  const price = getEffectivePrice(suggestion);
  const annualSavings = suggestion.estimatedMonthlySavingsUSD * 12;
  const roi = price <= 0 ? annualSavings : annualSavings / price;
  const efficiency = suggestion.conversionEfficiencyPct / 100;
  const savingsWeight = preference === "savings" ? 1 : preference === "budget" ? 0.5 : 0.8;
  const budgetWeight = preference === "budget" ? 1 : 0.4;
  const impactWeight = preference === "impact" ? 1 : 0.3;
  const speedWeight = preference === "speed" ? 1 : 0.25;

  return (
    (roi * speedWeight + efficiency * impactWeight + (annualSavings / 1000) * savingsWeight) *
      TIER_BOOST[suggestion.tier] +
    (price <= 0 ? 0 : (1 / Math.max(1, price)) * budgetWeight * 100)
  );
}

export const sortRecommended: SortFn = (list) =>
  [...list].sort((a, b) => recommendedScore(b, "savings") - recommendedScore(a, "savings"));

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

export function sortSuggestionsForProfile(
  list: Suggestion[],
  profile: UserProfile,
  mode: SortMode = "recommended"
): Suggestion[] {
  if (mode !== "recommended") return sortSuggestions(list, mode);
  return [...list]
    .filter((suggestion) => suggestion.priceUSD <= profile.maxBudgetUSD || profile.maxBudgetUSD <= 0)
    .sort((a, b) => recommendedScore(b, profile.preference) - recommendedScore(a, profile.preference));
}
