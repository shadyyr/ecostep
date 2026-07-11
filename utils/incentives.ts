import { incentives as incentiveTable } from "@/data/incentives";
import type { AppliedIncentive, IncentiveEntry, Suggestion } from "@/types";

import { normalizeCategory } from "@/data/roadmapConfig";

export function getMatchingIncentives(
  category: string,
  zipCode: string,
  table: IncentiveEntry[] = incentiveTable
): IncentiveEntry[] {
  const normalizedCategory = normalizeCategory(category);
  const normalizedZip = zipCode.trim().toUpperCase();

  return table.filter((entry) => {
    const categoryTokens = entry.targetCategory
      .split(",")
      .map((token) => normalizeCategory(token))
      .filter(Boolean);
    const categoryMatches = categoryTokens.some((token) => {
      const normalizedToken = token.trim().toLowerCase();
      return (
        normalizedToken === normalizedCategory ||
        normalizedCategory.includes(normalizedToken) ||
        normalizedToken.includes(normalizedCategory)
      );
    });

    const zipMatches =
      entry.zipCodePrefix === "ANY" ||
      normalizedZip.startsWith(entry.zipCodePrefix.toUpperCase()) ||
      normalizedZip.startsWith(entry.zipCodePrefix.slice(0, 3).toUpperCase());

    return categoryMatches && zipMatches;
  });
}

export function withAppliedIncentives(suggestion: Suggestion, zipCode: string): Suggestion {
  const appliedIncentives: AppliedIncentive[] = getMatchingIncentives(
    suggestion.category,
    zipCode
  ).map(({ incentiveName, rebateValueUSD, type }) => ({ incentiveName, rebateValueUSD, type }));
  return { ...suggestion, appliedIncentives };
}

export function getEffectivePrice(suggestion: Suggestion): number {
  const totalRebate = suggestion.appliedIncentives.reduce(
    (sum, incentive) => sum + incentive.rebateValueUSD,
    0
  );
  return Math.max(0, suggestion.priceUSD - totalRebate);
}
