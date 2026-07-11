export type RecommendationPreference = "savings" | "budget" | "impact" | "speed";

export interface UserProfile {
  zipCode: string;
  hasSolar: boolean;
  preference: RecommendationPreference;
  maxBudgetUSD: number;
  targetBillUSD?: number;
  currentBillUSD?: number;
  homeType?: "house" | "apartment" | "townhouse" | "duplex";
  applianceAgeYears?: number;
}

export type Tier = 1 | 2 | 3;

export interface RequiredDocument {
  name: string;
  estimatedHours: number;
}

export interface AppliedIncentive {
  incentiveName: string;
  rebateValueUSD: number;
  type: string;
  eligibility?: string;
  sourceLabel?: string;
  sourceUrl?: string;
  deadlineISO?: string;
  requiredDocuments?: RequiredDocument[];
  nextStep?: string;
  confidenceScore?: number;
  stackable?: boolean;
}

export interface Suggestion {
  id: string;
  tier: Tier;
  title: string;
  shortName: string;
  description: string;
  category: string;
  fuelSource: string;
  priceUSD: number;
  estimatedMonthlySavingsUSD: number;
  conversionEfficiencyPct: number;
  rejected: boolean;
  accepted: boolean;
  appliedIncentives: AppliedIncentive[];
  source: "gemini" | "manual" | "mock";
  sourceAuditId?: string;
  createdAt: string;
  confidenceScore?: number;
  reason?: string;
}

export interface AuditResult {
  detectedCategory: string;
  brand: string;
  modelNumber: string;
  fuelSource: string;
  estimatedAgeYears: number;
  electricalDrawAmps: number;
  estimatedMonthlySavingsUSD: number;
  confidenceScore: number;
}

export interface IncentiveEntry {
  zipCodePrefix: string;
  targetCategory: string;
  incentiveName: string;
  rebateValueUSD: number;
  type: string;
  eligibility?: string;
  requiredDocuments?: RequiredDocument[];
  deadlineISO?: string;
  stackable?: boolean;
  sourceName?: string;
  sourceUrl?: string;
  confidenceScore?: number;
  incomeQualified?: boolean;
}

export type SortMode =
  | "recommended"
  | "priceLowHigh"
  | "efficiencyHighLow"
  | "maxSavings";

export interface TargetBillResult {
  requiredMonthlySavingsUSD: number;
  stack: Suggestion[];
  achievedMonthlySavingsUSD: number;
  isGoalMet: boolean;
  remainingGapUSD: number;
}

export interface EcoScoreBreakdown {
  score: number;
  gridBaseline: number;
  solarBoost: number;
  appliedScore: number;
}

export interface ParsedUtilityBill {
  providerName: string | null;
  billingDays: number | null;
  totalDueUSD: number | null;
  electricityKWh: number | null;
  gasTherms: number | null;
  demandKW: number | null;
  fixedChargesUSD: number | null;
  variableChargesUSD: number | null;
  estimatedRatePerKWh: number | null;
  estimatedRatePerTherm: number | null;
  averageDailyKWh: number | null;
  averageDailyTherms: number | null;
  ratePlan: string | null;
  confidenceScore: number;
  extractedFields: string[];
  warnings: string[];
}

export interface UtilityBillParseInput {
  rawText?: string;
  providerName?: string;
  billingDays?: number;
  totalDueUSD?: number;
  electricityKWh?: number;
  gasTherms?: number;
  demandKW?: number;
  fixedChargesUSD?: number;
  variableChargesUSD?: number;
  ratePlan?: string;
}

export interface IncentiveMatchInsight {
  incentiveName: string;
  rebateValueUSD: number;
  type: string;
  eligibility: string;
  sourceLabel: string;
  sourceUrl?: string;
  deadlineISO?: string;
  daysUntilDeadline?: number;
  requiredDocuments: RequiredDocument[];
  stackable: boolean;
  paperworkHours: number;
  nextStep: string;
  confidenceScore: number;
}

export interface SuggestionIncentiveInsight {
  suggestionId: string;
  category: string;
  matches: IncentiveMatchInsight[];
  totalPotentialRebateUSD: number;
  effectivePriceUSD: number;
  urgencyScore: number;
  eligibilitySummary: string;
  paperworkSteps: string[];
  confidenceScore: number;
  warnings: string[];
}

export interface IncentiveIntelligenceResult {
  generatedAt: string;
  zipCode: string;
  insights: SuggestionIncentiveInsight[];
  totalPotentialRebateUSD: number;
  highestUrgency: SuggestionIncentiveInsight | null;
  disclaimer: string;
}

export interface AffordabilityScenario {
  suggestionId: string;
  title: string;
  netUpfrontCostUSD: number;
  monthlyPaymentUSD: number;
  monthlySavingsUSD: number;
  monthlyNetImpactUSD: number;
  paybackMonths: number | null;
  firstYearCashflowUSD: number;
  affordabilityScore: number;
  status: "cash_positive" | "budget_fit" | "financing_needed" | "long_payback";
  flags: string[];
}

export interface AffordabilityResult {
  generatedAt: string;
  financingTermMonths: number;
  aprPct: number;
  monthlyCashAvailableUSD: number;
  scenarios: AffordabilityScenario[];
  recommendedStack: AffordabilityScenario[];
  portfolioMonthlyNetUSD: number;
  portfolioFirstYearCashflowUSD: number;
}

export interface CoachNudge {
  id: string;
  priority: "high" | "medium" | "low";
  title: string;
  message: string;
  actionType:
    | "scan"
    | "apply_incentive"
    | "accept_upgrade"
    | "review_bill"
    | "join_circle"
    | "plan_resilience";
  relatedSuggestionId?: string;
  dueDateISO?: string;
  estimatedImpactUSD?: number;
  confidenceScore: number;
}

export interface CoachResult {
  generatedAt: string;
  nudges: CoachNudge[];
  summary: string;
}

export interface BuyingCircle {
  id: string;
  zipPrefix: string;
  category: string;
  title: string;
  estimatedInterestedHomes: number;
  neighborsNeeded: number;
  groupDiscountPct: number;
  estimatedPerHomeDiscountUSD: number;
  contractorReadiness: "forming" | "quote_ready" | "ready_to_bid";
  privacyNote: string;
}

export interface BuyingCirclesResult {
  generatedAt: string;
  zipPrefix: string;
  circles: BuyingCircle[];
}

export interface CriticalLoadInput {
  label: string;
  watts: number;
  required: boolean;
}

export interface ResiliencePlan {
  generatedAt: string;
  outageHoursTarget: number;
  criticalLoadWatts: number;
  storageKWhRequired: number;
  solarKWRecommended: number;
  backupHoursEstimate: number;
  resilienceScore: number;
  recommendedSuggestionIds: string[];
  actionItems: string[];
  warnings: string[];
}
