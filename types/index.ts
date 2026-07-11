export interface UserProfile {
  zipCode: string;
  hasSolar: boolean;
}

export type Tier = 1 | 2 | 3;

export interface AppliedIncentive {
  incentiveName: string;
  rebateValueUSD: number;
  type: string;
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
  applied: boolean;
  appliedIncentives: AppliedIncentive[];
  source: "gemini" | "manual" | "mock";
  sourceAuditId?: string;
  createdAt: string;
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
