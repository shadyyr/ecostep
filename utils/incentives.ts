import { incentives as incentiveTable } from "@/data/incentives";
import type { AppliedIncentive, IncentiveEntry, Suggestion } from "@/types";

export function getMatchingIncentives(
  category: string,
  zipCode: string,
  table: IncentiveEntry[] = incentiveTable
): IncentiveEntry[] {
  const normalizedCategory = category.trim().toLowerCase();
  return table.filter((entry) => {
    const categoryMatches = entry.targetCategory.trim().toLowerCase() === normalizedCategory;
    const zipMatches = entry.zipCodePrefix === "ANY" || zipCode.startsWith(entry.zipCodePrefix);
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
