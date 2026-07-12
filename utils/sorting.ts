import type { RecommendationPreference, SortMode, Suggestion, Tier, UserProfile } from "@/types";
import { getEffectivePrice } from "@/utils/incentives";
import { getHomeSuggestionControl } from "@/utils/homeEligibility";

export type SortFn = (suggestions: Suggestion[]) => Suggestion[];

const TIER_BOOST: Record<Tier, number> = { 1: 1.15, 2: 1.0, 3: 0.9 };
const BUNDLE_PAIRS: Record<string, string[]> = {
  thermostat: ["hvac"],
  hvac: ["thermostat"],
  "water heater": ["insulation"],
  insulation: ["water heater"],
};

function getBundleBoost(suggestion: Suggestion, list: Suggestion[]): number {
  const partners = BUNDLE_PAIRS[suggestion.category.toLowerCase()] ?? [];
  const hasPartner = partners.some((partner) =>
    list.some((other) => other.id !== suggestion.id && other.category.toLowerCase() === partner)
  );
  return hasPartner ? 1.12 : 1;
}

function recommendedScore(
  suggestion: Suggestion,
  preference: RecommendationPreference,
  profile: UserProfile,
  list: Suggestion[],
  targetBillUSD?: number
): number {
  const confidence = suggestion.confidenceScore ?? 0.7;
  const price = getEffectivePrice(suggestion);
  const annualSavings = suggestion.estimatedMonthlySavingsUSD * 12;
  const roi = price <= 0 ? annualSavings : annualSavings / price;
  const efficiency = suggestion.conversionEfficiencyPct / 100;
  const savingsWeight = preference === "savings" ? 1 : preference === "budget" ? 0.5 : 0.8;
  const budgetWeight = preference === "budget" ? 1 : 0.4;
  const impactWeight = preference === "impact" ? 1 : 0.3;
  const speedWeight = preference === "speed" ? 1 : 0.25;
  const targetGap = profile.currentBillUSD && targetBillUSD ? Math.max(0, profile.currentBillUSD - targetBillUSD) : 0;
  const targetPressure = targetGap > 0 ? Math.min(1.35, 1 + targetGap / 250) : 1;
  const budgetBandPenalty = price > 2500 ? 0.9 : price > 1000 ? 0.95 : 1;
  const confidenceBoost = confidence >= 0.85 ? 1.08 : confidence >= 0.65 ? 1 : 0.9;
  const sizeMultiplier = profile.homeSizeSqft ? Math.min(1.2, 0.85 + profile.homeSizeSqft / 1600) : 1;
  const ageMultiplier = profile.applianceAgeYears ? Math.min(1.18, 0.95 + profile.applianceAgeYears / 30) : 1;
  const homeControl = getHomeSuggestionControl(profile, suggestion);

  return (
    ((roi * speedWeight + efficiency * impactWeight + (annualSavings / 1000) * savingsWeight) *
      TIER_BOOST[suggestion.tier] +
      (price <= 0 ? 0 : (1 / Math.max(1, price)) * budgetWeight * 100)) *
      getBundleBoost(suggestion, list) *
      targetPressure *
      budgetBandPenalty *
      confidenceBoost *
      sizeMultiplier *
      ageMultiplier *
      homeControl.scoreMultiplier
  );
}

const buildProfileFallback: UserProfile = {
  zipCode: "00000",
  hasSolar: false,
  preference: "savings",
  maxBudgetUSD: 0,
  currentBillUSD: 0,
  targetBillUSD: 0,
  homeSizeSqft: 0,
  homeType: "house",
  applianceAgeYears: 0,
};

export const sortRecommended: SortFn = (list) =>
  [...list].sort((a, b) =>
    recommendedScore(b, "savings", buildProfileFallback, list) -
    recommendedScore(a, "savings", buildProfileFallback, list)
  );

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

function prioritizeHomeControl(list: Suggestion[], profile: UserProfile): Suggestion[] {
  return list
    .map((suggestion, index) => ({
      suggestion,
      index,
      homeControl: getHomeSuggestionControl(profile, suggestion),
    }))
    .sort((a, b) => a.homeControl.sortRank - b.homeControl.sortRank || a.index - b.index)
    .map(({ suggestion }) => suggestion);
}

export function sortSuggestionsForProfile(
  list: Suggestion[],
  profile: UserProfile,
  mode: SortMode = "recommended",
  targetBillUSD?: number
): Suggestion[] {
  const sorted =
    mode !== "recommended"
      ? sortSuggestions(list, mode)
      : [...list].sort(
          (a, b) =>
            recommendedScore(b, profile.preference, profile, list, targetBillUSD) -
            recommendedScore(a, profile.preference, profile, list, targetBillUSD)
        );
  return prioritizeHomeControl(sorted, profile);
}
