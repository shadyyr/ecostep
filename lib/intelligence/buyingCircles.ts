import type { BuyingCircle, BuyingCirclesResult, Suggestion, UserProfile } from "@/types";
import { effectivePriceUSD, round, stableHash, sumBy, zipPrefix } from "@/lib/intelligence/shared";
import { isSuggestionPlanEligible } from "@/utils/homeEligibility";

export interface BuyingCirclesInput {
  profile: UserProfile;
  suggestions: Suggestion[];
  minimumHomesForQuote?: number;
}

const CATEGORY_TITLES: Record<string, string> = {
  "water heater": "Heat pump water heater buying circle",
  furnace: "Heat pump HVAC buying circle",
  hvac: "Heat pump HVAC buying circle",
  "heat pump": "Heat pump HVAC buying circle",
  "battery storage": "Battery backup buying circle",
  solar: "Solar buying circle",
  insulation: "Weatherization buying circle",
  weatherization: "Weatherization buying circle",
  range: "Induction kitchen buying circle",
  "electrical panel": "Electrical panel readiness circle",
};

function groupableCategory(category: string): string {
  if (["furnace", "hvac", "heat pump", "ac condenser", "air conditioner"].includes(category)) {
    return "heat pump";
  }
  if (["insulation", "weatherization"].includes(category)) return "weatherization";
  return category;
}

function estimatedInterest(zip: string, category: string, localCount: number): number {
  const seeded = stableHash(`${zip}:${category}`) % 9;
  const categoryBoost = ["heat pump", "water heater", "battery storage", "solar"].includes(category) ? 5 : 2;
  return Math.max(1, localCount + seeded + categoryBoost);
}

function readiness(participants: number, threshold: number): BuyingCircle["contractorReadiness"] {
  if (participants >= threshold + 4) return "ready_to_bid";
  if (participants >= threshold) return "quote_ready";
  return "forming";
}

export function planBuyingCircles(input: BuyingCirclesInput): BuyingCirclesResult {
  const threshold = Math.max(3, input.minimumHomesForQuote ?? 6);
  const prefix = zipPrefix(input.profile.zipCode);
  const openSuggestions = input.suggestions.filter(
    (suggestion) =>
      !suggestion.rejected &&
      !suggestion.accepted &&
      isSuggestionPlanEligible(input.profile, suggestion)
  );
  const grouped = new Map<string, Suggestion[]>();

  for (const suggestion of openSuggestions) {
    const key = groupableCategory(suggestion.category);
    if (!CATEGORY_TITLES[key]) continue;
    grouped.set(key, [...(grouped.get(key) ?? []), suggestion]);
  }

  const circles: BuyingCircle[] = Array.from(grouped.entries())
    .map(([category, suggestions]) => {
      const estimatedInterestedHomes = estimatedInterest(prefix, category, suggestions.length);
      const neighborsNeeded = Math.max(0, threshold - estimatedInterestedHomes);
      const averageCost = sumBy(suggestions, effectivePriceUSD) / Math.max(1, suggestions.length);
      const groupDiscountPct = round(Math.min(18, 4 + estimatedInterestedHomes * 1.2), 1);
      return {
        id: `${prefix}-${category.replace(/\s+/g, "-")}`,
        zipPrefix: prefix,
        category,
        title: CATEGORY_TITLES[category],
        estimatedInterestedHomes,
        neighborsNeeded,
        groupDiscountPct,
        estimatedPerHomeDiscountUSD: Math.round((averageCost * groupDiscountPct) / 100),
        contractorReadiness: readiness(estimatedInterestedHomes, threshold),
        privacyNote:
          "Estimate is modeled from this home's open roadmap and ZIP-prefix demand heuristics; no neighbor identities are exposed.",
      };
    })
    .sort((a, b) => {
      const readinessRank = { ready_to_bid: 3, quote_ready: 2, forming: 1 };
      return (
        readinessRank[b.contractorReadiness] - readinessRank[a.contractorReadiness] ||
        b.estimatedPerHomeDiscountUSD - a.estimatedPerHomeDiscountUSD
      );
    });

  return {
    generatedAt: new Date().toISOString(),
    zipPrefix: prefix,
    circles,
  };
}
