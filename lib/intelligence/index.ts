import type {
  AffordabilityResult,
  BuyingCirclesResult,
  CoachResult,
  CriticalLoadInput,
  IncentiveIntelligenceResult,
  ParsedUtilityBill,
  ResiliencePlan,
  Suggestion,
  UserProfile,
  UtilityBillParseInput,
} from "@/types";
import { simulateAffordability } from "@/lib/intelligence/affordability";
import { planBuyingCircles } from "@/lib/intelligence/buyingCircles";
import { generateCoach } from "@/lib/intelligence/coach";
import { analyzeIncentives } from "@/lib/intelligence/incentiveIntelligence";
import { planOutageResilience } from "@/lib/intelligence/resilience";
import { parseUtilityBill } from "@/lib/intelligence/utilityBill";

export interface HomeIntelligenceInput {
  profile: UserProfile;
  suggestions: Suggestion[];
  utilityBill?: UtilityBillParseInput | ParsedUtilityBill;
  householdIncomeUSD?: number;
  taxLiabilityUSD?: number;
  financingTermMonths?: number;
  aprPct?: number;
  monthlyCashAvailableUSD?: number;
  outageHoursTarget?: number;
  criticalLoads?: CriticalLoadInput[];
  includeHeatingCooling?: boolean;
  hasMedicalDevice?: boolean;
}

export interface HomeIntelligenceResult {
  generatedAt: string;
  utilityBill: ParsedUtilityBill | null;
  incentives: IncentiveIntelligenceResult;
  affordability: AffordabilityResult;
  coach: CoachResult;
  buyingCircles: BuyingCirclesResult;
  resilience: ResiliencePlan;
}

function isParsedUtilityBill(value: UtilityBillParseInput | ParsedUtilityBill): value is ParsedUtilityBill {
  return "confidenceScore" in value && "extractedFields" in value && "warnings" in value;
}

export function generateHomeIntelligence(input: HomeIntelligenceInput): HomeIntelligenceResult {
  const utilityBill = input.utilityBill
    ? isParsedUtilityBill(input.utilityBill)
      ? input.utilityBill
      : parseUtilityBill(input.utilityBill)
    : null;
  const incentives = analyzeIncentives({
    profile: input.profile,
    suggestions: input.suggestions,
    householdIncomeUSD: input.householdIncomeUSD,
    taxLiabilityUSD: input.taxLiabilityUSD,
  });
  const affordability = simulateAffordability({
    profile: input.profile,
    suggestions: input.suggestions,
    parsedBill: utilityBill ?? undefined,
    financingTermMonths: input.financingTermMonths,
    aprPct: input.aprPct,
    monthlyCashAvailableUSD: input.monthlyCashAvailableUSD,
  });
  const resilience = planOutageResilience({
    profile: input.profile,
    suggestions: input.suggestions,
    outageHoursTarget: input.outageHoursTarget,
    criticalLoads: input.criticalLoads,
    includeHeatingCooling: input.includeHeatingCooling,
    hasMedicalDevice: input.hasMedicalDevice,
  });
  const buyingCircles = planBuyingCircles({
    profile: input.profile,
    suggestions: input.suggestions,
  });
  const coach = generateCoach({
    profile: input.profile,
    suggestions: input.suggestions,
    parsedBill: utilityBill ?? undefined,
    incentiveIntelligence: incentives,
    affordability,
  });

  return {
    generatedAt: new Date().toISOString(),
    utilityBill,
    incentives,
    affordability,
    coach,
    buyingCircles,
    resilience,
  };
}

export { simulateAffordability } from "@/lib/intelligence/affordability";
export { planBuyingCircles } from "@/lib/intelligence/buyingCircles";
export { generateCoach } from "@/lib/intelligence/coach";
export { analyzeIncentives } from "@/lib/intelligence/incentiveIntelligence";
export { planOutageResilience } from "@/lib/intelligence/resilience";
export { parseUtilityBill } from "@/lib/intelligence/utilityBill";
