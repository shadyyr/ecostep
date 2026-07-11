import { getMatchingIncentives } from "@/utils/incentives";
import type {
  IncentiveIntelligenceResult,
  IncentiveMatchInsight,
  IncentiveEntry,
  Suggestion,
  SuggestionIncentiveInsight,
  UserProfile,
} from "@/types";
import {
  clamp,
  effectivePriceUSD,
  INTELLIGENCE_DISCLAIMER,
  round,
  sumBy,
} from "@/lib/intelligence/shared";

export interface IncentiveIntelligenceInput {
  profile: UserProfile;
  suggestions: Suggestion[];
  householdIncomeUSD?: number;
  taxLiabilityUSD?: number;
  currentDateISO?: string;
}

function daysUntil(deadlineISO: string | undefined, currentDate: Date): number | undefined {
  if (!deadlineISO) return undefined;
  const deadline = new Date(`${deadlineISO}T23:59:59.999Z`);
  if (Number.isNaN(deadline.getTime())) return undefined;
  return Math.ceil((deadline.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
}

function getDeadlineBoost(days: number | undefined): number {
  if (days === undefined) return 0;
  if (days < 0) return 0;
  if (days <= 30) return 35;
  if (days <= 90) return 20;
  if (days <= 180) return 10;
  return 3;
}

function getEligibilitySummary(matchCount: number, householdIncomeUSD?: number): string {
  if (matchCount === 0) return "No matching programs in the demo catalog yet.";
  if (!householdIncomeUSD) return "Potentially eligible; income-sensitive rules still need verification.";
  if (householdIncomeUSD < 80000) return "Potentially strong fit for income-sensitive or standard programs.";
  if (householdIncomeUSD > 180000) return "Likely standard programs only; income-capped rebates may phase down.";
  return "Potentially eligible for standard programs; verify local income caps.";
}

function confidenceFor(entry: IncentiveEntry, category: string, zipCode: string): number {
  const base = entry.confidenceScore ?? 0.55;
  const exactZip = entry.zipCodePrefix !== "ANY" && zipCode.startsWith(entry.zipCodePrefix);
  const categoryExact = entry.targetCategory
    .toLowerCase()
    .split(",")
    .map((value) => value.trim())
    .includes(category.toLowerCase());
  return clamp(round(base + (exactZip ? 0.12 : 0) + (categoryExact ? 0.08 : 0), 2), 0.2, 0.95);
}

function matchToInsight(
  entry: IncentiveEntry,
  suggestion: Suggestion,
  zipCode: string,
  currentDate: Date
): IncentiveMatchInsight {
  const days = daysUntil(entry.deadlineISO, currentDate);
  const requiredDocuments = entry.requiredDocuments ?? [
    "Equipment quote or paid invoice",
    "Proof of installation address",
    "Model or efficiency certificate",
  ];
  const deadlineText =
    days === undefined
      ? "Confirm current availability before purchase."
      : days < 0
        ? "Program deadline appears to have passed; verify if renewed."
        : `Submit within ${days} day${days === 1 ? "" : "s"} if still available.`;

  return {
    incentiveName: entry.incentiveName,
    rebateValueUSD: entry.rebateValueUSD,
    type: entry.type,
    eligibility: entry.eligibility ?? "Eligibility depends on address, equipment, and installer documentation.",
    sourceLabel: entry.sourceName ?? "EcoStep demo incentive catalog",
    sourceUrl: entry.sourceUrl,
    deadlineISO: entry.deadlineISO,
    daysUntilDeadline: days,
    requiredDocuments,
    stackable: entry.stackable ?? true,
    paperworkHours: entry.paperworkHours ?? 1.5,
    nextStep: `${deadlineText} Gather ${requiredDocuments[0].toLowerCase()}.`,
    confidenceScore: confidenceFor(entry, suggestion.category, zipCode),
  };
}

function buildPaperworkSteps(matches: IncentiveMatchInsight[]): string[] {
  const documents = new Set<string>();
  for (const match of matches) {
    for (const document of match.requiredDocuments) documents.add(document);
  }
  return [
    ...Array.from(documents).slice(0, 5).map((document) => `Collect ${document.toLowerCase()}.`),
    matches.some((match) => !match.stackable)
      ? "Confirm non-stackable programs before counting every rebate."
      : "Ask the installer to itemize eligible equipment and labor.",
  ];
}

export function analyzeIncentives(input: IncentiveIntelligenceInput): IncentiveIntelligenceResult {
  const currentDate = input.currentDateISO ? new Date(input.currentDateISO) : new Date();
  const generatedAt = Number.isNaN(currentDate.getTime())
    ? new Date().toISOString()
    : currentDate.toISOString();

  const insights: SuggestionIncentiveInsight[] = input.suggestions.map((suggestion) => {
    const matches = getMatchingIncentives(suggestion.category, input.profile.zipCode).map((entry) =>
      matchToInsight(entry, suggestion, input.profile.zipCode, currentDate)
    );
    const nonExpired = matches.filter(
      (match) => match.daysUntilDeadline === undefined || match.daysUntilDeadline >= 0
    );
    const totalPotentialRebateUSD = sumBy(nonExpired, (match) => match.rebateValueUSD);
    const effectivePrice = Math.max(0, suggestion.priceUSD - totalPotentialRebateUSD);
    const urgencyScore = clamp(
      round(
        sumBy(nonExpired, (match) => getDeadlineBoost(match.daysUntilDeadline)) +
          Math.min(35, totalPotentialRebateUSD / 100) +
          (suggestion.priceUSD > 0 ? (totalPotentialRebateUSD / suggestion.priceUSD) * 20 : 0),
        0
      ),
      0,
      100
    );
    const confidenceScore =
      matches.length > 0 ? round(sumBy(matches, (match) => match.confidenceScore) / matches.length, 2) : 0.3;
    const warnings: string[] = [];

    if (matches.length === 0) warnings.push("No matching incentive found in the demo catalog.");
    if (matches.some((match) => match.daysUntilDeadline !== undefined && match.daysUntilDeadline < 0)) {
      warnings.push("At least one matched program appears expired and should be verified.");
    }
    if (effectivePriceUSD(suggestion) !== effectivePrice && suggestion.appliedIncentives.length > 0) {
      warnings.push("Existing applied incentive assumptions differ from the richer incentive intelligence total.");
    }

    return {
      suggestionId: suggestion.id,
      category: suggestion.category,
      matches,
      totalPotentialRebateUSD,
      effectivePriceUSD: effectivePrice,
      urgencyScore,
      eligibilitySummary: getEligibilitySummary(matches.length, input.householdIncomeUSD),
      paperworkSteps: buildPaperworkSteps(matches),
      confidenceScore,
      warnings,
    };
  });

  const highestUrgency = [...insights].sort((a, b) => b.urgencyScore - a.urgencyScore)[0] ?? null;

  return {
    generatedAt,
    zipCode: input.profile.zipCode,
    insights,
    totalPotentialRebateUSD: sumBy(insights, (insight) => insight.totalPotentialRebateUSD),
    highestUrgency,
    disclaimer: INTELLIGENCE_DISCLAIMER,
  };
}
