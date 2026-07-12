import type {
  AffordabilityResult,
  CoachNudge,
  CoachResult,
  IncentiveIntelligenceResult,
  ParsedUtilityBill,
  Suggestion,
  UserProfile,
} from "@/types";
import { effectivePriceUSD, round } from "@/lib/intelligence/shared";
import { isSuggestionPlanEligible } from "@/utils/homeEligibility";

export interface CoachInput {
  profile: UserProfile;
  suggestions: Suggestion[];
  parsedBill?: ParsedUtilityBill;
  incentiveIntelligence?: IncentiveIntelligenceResult;
  affordability?: AffordabilityResult;
}

function priorityRank(priority: CoachNudge["priority"]): number {
  return priority === "high" ? 3 : priority === "medium" ? 2 : 1;
}

export function generateCoach(input: CoachInput): CoachResult {
  const nudges: CoachNudge[] = [];
  const active = input.suggestions.filter((suggestion) => !suggestion.rejected);
  const eligibleActive = active.filter((suggestion) => isSuggestionPlanEligible(input.profile, suggestion));
  const open = eligibleActive.filter((suggestion) => !suggestion.accepted);
  const accepted = eligibleActive.filter((suggestion) => suggestion.accepted);

  if (active.length === 0) {
    nudges.push({
      id: "scan-first-appliance",
      priority: "high",
      title: "Start with one appliance scan",
      message: "Scan a water heater, furnace, panel, or utility bill so EcoStep can build a real home-specific plan.",
      actionType: "scan",
      confidenceScore: 0.9,
    });
  }

  const urgent = input.incentiveIntelligence?.highestUrgency;
  if (urgent && urgent.urgencyScore >= 15 && urgent.matches[0]) {
    nudges.push({
      id: `urgent-incentive-${urgent.suggestionId}`,
      priority: "high",
      title: "Protect a likely rebate window",
      message: `${urgent.matches[0].incentiveName} could reduce this project by $${urgent.totalPotentialRebateUSD}. ${urgent.matches[0].nextStep}`,
      actionType: "apply_incentive",
      relatedSuggestionId: urgent.suggestionId,
      dueDateISO: urgent.matches[0].deadlineISO,
      estimatedImpactUSD: urgent.totalPotentialRebateUSD,
      confidenceScore: urgent.confidenceScore,
    });
  }

  const bestAffordable = input.affordability?.recommendedStack[0];
  if (bestAffordable) {
    nudges.push({
      id: `affordable-next-${bestAffordable.suggestionId}`,
      priority: bestAffordable.monthlyNetImpactUSD >= 0 ? "high" : "medium",
      title: "Accept the most affordable next step",
      message: `${bestAffordable.title} has an estimated ${bestAffordable.paybackMonths ?? "unknown"} month payback and ${bestAffordable.monthlyNetImpactUSD >= 0 ? "positive" : "near-term negative"} monthly cashflow under the current financing assumption.`,
      actionType: "accept_upgrade",
      relatedSuggestionId: bestAffordable.suggestionId,
      estimatedImpactUSD: Math.max(0, bestAffordable.monthlySavingsUSD * 12),
      confidenceScore: round(bestAffordable.affordabilityScore / 100, 2),
    });
  }

  if (input.parsedBill?.totalDueUSD && input.profile.targetBillUSD) {
    const gap = input.parsedBill.totalDueUSD - input.profile.targetBillUSD;
    if (gap > 20) {
      nudges.push({
        id: "bill-target-gap",
        priority: "medium",
        title: "Close the bill gap deliberately",
        message: `Your parsed bill is about $${Math.round(gap)} above the target. Prioritize upgrades with verified monthly savings before large comfort-only projects.`,
        actionType: "review_bill",
        estimatedImpactUSD: Math.round(gap),
        confidenceScore: input.parsedBill.confidenceScore,
      });
    }
  }

  const resilienceMissing =
    !eligibleActive.some((suggestion) => suggestion.category === "battery storage" && suggestion.accepted) &&
    !eligibleActive.some((suggestion) => suggestion.category === "solar" && suggestion.accepted);
  if (input.profile.hasSolar && resilienceMissing) {
    nudges.push({
      id: "solar-resilience-gap",
      priority: "medium",
      title: "Turn solar into backup power",
      message: "Because you already have solar, battery storage may unlock outage resilience instead of only bill savings.",
      actionType: "plan_resilience",
      confidenceScore: 0.72,
    });
  }

  const highValueRejected = input.suggestions
    .filter(
      (suggestion) =>
        suggestion.rejected &&
        isSuggestionPlanEligible(input.profile, suggestion) &&
        effectivePriceUSD(suggestion) <= input.profile.maxBudgetUSD
    )
    .sort((a, b) => b.estimatedMonthlySavingsUSD - a.estimatedMonthlySavingsUSD)[0];
  if (highValueRejected) {
    nudges.push({
      id: `review-rejected-${highValueRejected.id}`,
      priority: "low",
      title: "Revisit a rejected savings option",
      message: `${highValueRejected.shortName} was rejected, but it still fits the stated budget and could save about $${highValueRejected.estimatedMonthlySavingsUSD}/mo.`,
      actionType: "accept_upgrade",
      relatedSuggestionId: highValueRejected.id,
      estimatedImpactUSD: highValueRejected.estimatedMonthlySavingsUSD * 12,
      confidenceScore: highValueRejected.confidenceScore ?? 0.55,
    });
  }

  if (open.length >= 2) {
    nudges.push({
      id: "buying-circle-candidate",
      priority: "low",
      title: "Look for neighborhood buying power",
      message: "You have enough open projects to see if nearby households could bundle quotes and lower contractor acquisition costs.",
      actionType: "join_circle",
      confidenceScore: 0.58,
    });
  }

  const sortedNudges = nudges.sort(
    (a, b) => priorityRank(b.priority) - priorityRank(a.priority) || b.confidenceScore - a.confidenceScore
  );
  const summary =
    sortedNudges.length === 0
      ? "Your plan is quiet right now; scan another appliance or parse a bill to unlock more coaching."
      : `${sortedNudges.length} next action${sortedNudges.length === 1 ? "" : "s"} found across incentives, affordability, bills, and resilience. ${accepted.length} upgrade${accepted.length === 1 ? "" : "s"} already accepted.`;

  return {
    generatedAt: new Date().toISOString(),
    nudges: sortedNudges.slice(0, 6),
    summary,
  };
}
