import type {
  AffordabilityResult,
  AffordabilityScenario,
  ParsedUtilityBill,
  Suggestion,
  UserProfile,
} from "@/types";
import { clamp, effectivePriceUSD, round, sumBy } from "@/lib/intelligence/shared";

export interface AffordabilityInput {
  profile: UserProfile;
  suggestions: Suggestion[];
  parsedBill?: ParsedUtilityBill;
  financingTermMonths?: number;
  aprPct?: number;
  monthlyCashAvailableUSD?: number;
}

function monthlyPayment(principal: number, termMonths: number, aprPct: number): number {
  if (principal <= 0) return 0;
  if (termMonths <= 0) return principal;
  const monthlyRate = aprPct / 100 / 12;
  if (monthlyRate <= 0) return principal / termMonths;
  return (principal * monthlyRate) / (1 - (1 + monthlyRate) ** -termMonths);
}

function billRateSavingsBoost(parsedBill?: ParsedUtilityBill): number {
  if (!parsedBill?.estimatedRatePerKWh) return 1;
  if (parsedBill.estimatedRatePerKWh >= 0.45) return 1.15;
  if (parsedBill.estimatedRatePerKWh >= 0.3) return 1.08;
  if (parsedBill.estimatedRatePerKWh <= 0.11) return 0.95;
  return 1;
}

function statusFor(
  netCost: number,
  monthlyNet: number,
  paybackMonths: number | null,
  profile: UserProfile
): AffordabilityScenario["status"] {
  if (monthlyNet >= 0) return "cash_positive";
  if (netCost <= profile.maxBudgetUSD) return "budget_fit";
  if (paybackMonths !== null && paybackMonths > 96) return "long_payback";
  return "financing_needed";
}

function flagsFor(
  scenario: Pick<
    AffordabilityScenario,
    "netUpfrontCostUSD" | "monthlyNetImpactUSD" | "paybackMonths" | "monthlySavingsUSD"
  >,
  profile: UserProfile
): string[] {
  const flags: string[] = [];
  if (scenario.netUpfrontCostUSD > profile.maxBudgetUSD && profile.maxBudgetUSD > 0) {
    flags.push("Above stated upgrade budget");
  }
  if (scenario.monthlyNetImpactUSD >= 0) flags.push("Monthly cashflow positive with financing");
  if (scenario.paybackMonths !== null && scenario.paybackMonths <= 36) flags.push("Fast payback");
  if (scenario.monthlySavingsUSD >= 50) flags.push("Large bill impact");
  if (flags.length === 0) flags.push("Needs quote validation");
  return flags;
}

export function simulateAffordability(input: AffordabilityInput): AffordabilityResult {
  const financingTermMonths = Math.max(1, Math.round(input.financingTermMonths ?? 60));
  const aprPct = Math.max(0, input.aprPct ?? 6.5);
  const monthlyCashAvailableUSD = Math.max(
    0,
    input.monthlyCashAvailableUSD ?? Math.max(50, Math.round(input.profile.maxBudgetUSD / 48))
  );
  const savingsBoost = billRateSavingsBoost(input.parsedBill);

  const scenarios = input.suggestions.map((suggestion) => {
    const netUpfrontCostUSD = effectivePriceUSD(suggestion);
    const payment = monthlyPayment(netUpfrontCostUSD, financingTermMonths, aprPct);
    const monthlySavingsUSD = Math.max(
      0,
      Math.round(suggestion.estimatedMonthlySavingsUSD * savingsBoost)
    );
    const monthlyNetImpactUSD = round(monthlySavingsUSD - payment, 2);
    const paybackMonths =
      monthlySavingsUSD > 0 ? Math.max(1, Math.round(netUpfrontCostUSD / monthlySavingsUSD)) : null;
    const firstYearCashflowUSD = round(monthlyNetImpactUSD * 12, 0);
    const affordabilityScore = clamp(
      round(
        50 +
          monthlyNetImpactUSD * 1.5 +
          (paybackMonths ? Math.max(0, 36 - paybackMonths) : -20) +
          (netUpfrontCostUSD <= input.profile.maxBudgetUSD ? 15 : -15) +
          suggestion.conversionEfficiencyPct / 5,
        0
      ),
      0,
      100
    );
    const status = statusFor(netUpfrontCostUSD, monthlyNetImpactUSD, paybackMonths, input.profile);
    const draft = {
      netUpfrontCostUSD,
      monthlyNetImpactUSD,
      paybackMonths,
      monthlySavingsUSD,
    };

    return {
      suggestionId: suggestion.id,
      title: suggestion.title,
      netUpfrontCostUSD,
      monthlyPaymentUSD: round(payment, 2),
      monthlySavingsUSD,
      monthlyNetImpactUSD,
      paybackMonths,
      firstYearCashflowUSD,
      affordabilityScore,
      status,
      flags: flagsFor(draft, input.profile),
    };
  });

  const recommendedStack = [...scenarios]
    .filter((scenario) => scenario.monthlyPaymentUSD <= monthlyCashAvailableUSD || scenario.monthlyNetImpactUSD >= 0)
    .sort((a, b) => b.affordabilityScore - a.affordabilityScore)
    .slice(0, 3);

  return {
    generatedAt: new Date().toISOString(),
    financingTermMonths,
    aprPct,
    monthlyCashAvailableUSD,
    scenarios,
    recommendedStack,
    portfolioMonthlyNetUSD: round(sumBy(recommendedStack, (scenario) => scenario.monthlyNetImpactUSD), 2),
    portfolioFirstYearCashflowUSD: round(sumBy(recommendedStack, (scenario) => scenario.firstYearCashflowUSD), 0),
  };
}
