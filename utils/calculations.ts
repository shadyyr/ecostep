import {
  CATEGORY_PRICE_MAP,
  CATEGORY_TIER_MAP,
  CATEGORY_SHORT_NAME_MAP,
  CATEGORY_DESCRIPTION_MAP,
  DEFAULT_PRICE_USD,
  DEFAULT_TIER,
  FUEL_EFFICIENCY_GAIN_MAP,
  DEFAULT_EFFICIENCY_GAIN_PCT,
  getRegionalAdjustment,
  normalizeCategory,
  normalizeFuelSource,
} from "@/data/roadmapConfig";
import { getGridBaseline } from "@/data/gridProfiles";
import { withAppliedIncentives } from "@/utils/incentives";
import { getHomeSuggestionControl, isSuggestionPlanEligible } from "@/utils/homeEligibility";
import { generateId } from "@/utils/id";
import type {
  AuditResult,
  EcoScoreBreakdown,
  Suggestion,
  TargetBillResult,
  Tier,
  UserProfile,
} from "@/types";

const SOLAR_BOOST_POINTS = 15;
const MAX_APPLIED_POINTS = 45;
const TIER_POINTS: Record<Tier, number> = { 1: 5, 2: 10, 3: 15 };

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function computeEcoScoreBreakdown(
  profile: UserProfile,
  suggestions: Suggestion[],
  countSuggestion: (s: Suggestion) => boolean
): EcoScoreBreakdown {
  const gridBaseline = getGridBaseline(profile.zipCode).baseline;
  const solarBoost = profile.hasSolar ? SOLAR_BOOST_POINTS : 0;
  const appliedScore = clamp(
    suggestions
      .filter((s) => !s.rejected && countSuggestion(s))
      .reduce((sum, s) => sum + (s.conversionEfficiencyPct / 100) * TIER_POINTS[s.tier], 0),
    0,
    MAX_APPLIED_POINTS
  );
  const score = clamp(gridBaseline + solarBoost + appliedScore, 0, 100);
  return { score: Math.round(score), gridBaseline, solarBoost, appliedScore };
}

/**
 * 0-100, three additive components: local grid cleanliness (0-40), a solar
 * ownership bonus (0 or 15), and points for upgrades the user has accepted into
 * their plan (0-45, weighted by tier size and that upgrade's conversion efficiency).
 */
export function calculateEcoScore(
  profile: UserProfile,
  suggestions: Suggestion[]
): EcoScoreBreakdown {
  return computeEcoScoreBreakdown(
    profile,
    suggestions,
    (s) => s.accepted && isSuggestionPlanEligible(profile, s)
  );
}

/**
 * Same formula, but counts every active (non-rejected) suggestion as if it were
 * already accepted — the score you'd reach by accepting everything currently on
 * your roadmap. Lets newly-added suggestions visibly move something right away,
 * even before the user accepts them.
 */
export function calculatePotentialEcoScore(
  profile: UserProfile,
  suggestions: Suggestion[]
): EcoScoreBreakdown {
  return computeEcoScoreBreakdown(
    profile,
    suggestions,
    (s) => isSuggestionPlanEligible(profile, s)
  );
}

/**
 * Greedy, largest-savings-first stack that closes the gap between the user's
 * current and target monthly bill in as few suggestions as possible. Does not
 * minimize total spend (a true cost-minimizing stack is a knapsack problem) —
 * documented tradeoff, fine for the suggestion-set sizes this app deals with.
 */
export function getPaybackMonths(suggestion: Suggestion): number | null {
  const effectivePrice = Math.max(1, suggestion.priceUSD - suggestion.appliedIncentives.reduce((sum, incentive) => sum + incentive.rebateValueUSD, 0));
  const monthlySavings = suggestion.estimatedMonthlySavingsUSD;
  if (monthlySavings <= 0) return null;
  return Math.max(1, Math.round(effectivePrice / monthlySavings));
}

const BUNDLE_PAIRS: Record<string, string[]> = {
  thermostat: ["hvac"],
  hvac: ["thermostat"],
  "water heater": ["insulation"],
  insulation: ["water heater"],
};

function getBundlePartner(suggestion: Suggestion, allSuggestions: Suggestion[] = []): string | null {
  const partners = BUNDLE_PAIRS[suggestion.category.toLowerCase()] ?? [];
  const match = allSuggestions.find((other) =>
    other.id !== suggestion.id && partners.includes(other.category.toLowerCase())
  );
  return match?.title ?? null;
}

export function getSuggestionInsight(
  suggestion: Suggestion,
  profile: UserProfile,
  allSuggestions: Suggestion[] = []
): string {
  const payback = getPaybackMonths(suggestion) ?? Number.POSITIVE_INFINITY;
  const budgetFit = suggestion.priceUSD <= profile.maxBudgetUSD ? "fits your budget" : "exceeds your current budget";
  const impactLevel = suggestion.conversionEfficiencyPct >= 70 ? "strong" : suggestion.conversionEfficiencyPct >= 40 ? "solid" : "moderate";
  const preferenceLabel = profile.preference === "impact"
    ? "impact"
    : profile.preference === "budget"
      ? "budget"
      : profile.preference === "speed"
        ? "speed"
        : "savings";
  const bundlePartner = getBundlePartner(suggestion, allSuggestions);
  const bundleText = bundlePartner ? ` It also pairs well with ${bundlePartner}.` : "";
  const targetHint = profile.targetBillUSD && profile.targetBillUSD > 0 ? " and helps move you closer to your target bill" : "";
  const homeControl = getHomeSuggestionControl(profile, suggestion);
  const homeControlText =
    homeControl.status === "in_control"
      ? ""
      : ` ${homeControl.reason} ${homeControl.actionHint}`;

  return `A ${impactLevel} ${preferenceLabel} fit with ${budgetFit}${targetHint}, delivering strong monthly savings and about ${payback} months to break even.${bundleText}${homeControlText}`;
}

export function getPersonalizedNextAction(
  suggestions: Suggestion[],
  profile: UserProfile,
  targetBillUSD?: number
): Suggestion | null {
  const remainingBudget = profile.maxBudgetUSD > 0 ? profile.maxBudgetUSD : Number.POSITIVE_INFINITY;
  const active = suggestions.filter(
    (suggestion) =>
      !suggestion.accepted &&
      !suggestion.rejected &&
      isSuggestionPlanEligible(profile, suggestion)
  );
  const targetGap =
    targetBillUSD && targetBillUSD > 0 && profile.currentBillUSD
      ? Math.max(0, profile.currentBillUSD - targetBillUSD)
      : 0;

  const ranked = active
    .filter((suggestion) => suggestion.priceUSD <= remainingBudget)
    .map((suggestion) => {
      const payback = getPaybackMonths(suggestion) ?? Number.POSITIVE_INFINITY;
      let score = suggestion.estimatedMonthlySavingsUSD * 10;
      score += suggestion.conversionEfficiencyPct / 2;
      score -= payback * 0.8;
      if (profile.preference === "budget") score -= suggestion.priceUSD / 250;
      if (profile.preference === "impact") score += suggestion.conversionEfficiencyPct / 4;
      if (profile.preference === "speed") score += 20 / Math.max(1, payback);
      if (profile.preference === "savings") score += suggestion.estimatedMonthlySavingsUSD / 4;
      if (targetGap > 0) score += Math.min(20, targetGap / 25);
      return { suggestion, score };
    })
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.suggestion ?? null;
}

export function simulateTargetBill(
  currentBillUSD: number,
  targetBillUSD: number,
  activeSuggestions: Suggestion[],
  profile?: UserProfile | null
): TargetBillResult {
  const requiredMonthlySavingsUSD = Math.max(0, currentBillUSD - targetBillUSD);

  if (requiredMonthlySavingsUSD === 0) {
    return {
      requiredMonthlySavingsUSD: 0,
      stack: [],
      achievedMonthlySavingsUSD: 0,
      isGoalMet: true,
      remainingGapUSD: 0,
    };
  }

  const candidates = [...activeSuggestions]
    .filter((s) => s.estimatedMonthlySavingsUSD > 0)
    .filter((s) => !profile || s.accepted || isSuggestionPlanEligible(profile, s))
    .map((suggestion) => {
      const paybackMonths = suggestion.priceUSD / Math.max(1, suggestion.estimatedMonthlySavingsUSD);
      const score =
        (suggestion.estimatedMonthlySavingsUSD * 10) / Math.max(1, paybackMonths) +
        (suggestion.conversionEfficiencyPct / 100) * 8 +
        (suggestion.appliedIncentives.length > 0 ? 4 : 0);
      return { suggestion, score };
    })
    .sort((a, b) => b.score - a.score);

  const stack: Suggestion[] = [];
  let achieved = 0;
  for (const { suggestion } of candidates) {
    if (achieved >= requiredMonthlySavingsUSD) break;
    stack.push(suggestion);
    achieved += suggestion.estimatedMonthlySavingsUSD;
  }

  return {
    requiredMonthlySavingsUSD,
    stack,
    achievedMonthlySavingsUSD: achieved,
    isGoalMet: achieved >= requiredMonthlySavingsUSD,
    remainingGapUSD: Math.max(0, requiredMonthlySavingsUSD - achieved),
  };
}

/**
 * Single place where the gap between Gemini's AuditResult schema (no price or
 * efficiency fields) and the full Suggestion type gets resolved, via the static
 * lookup tables in data/roadmapConfig.ts. Shared by both the Gemini success path
 * and the manual-entry fallback path.
 */
export function auditResultToSuggestion(
  audit: AuditResult,
  profile: UserProfile,
  source: "gemini" | "manual",
  sourceAuditId?: string
): Suggestion {
  const category = normalizeCategory(audit.detectedCategory);
  const fuelSource = normalizeFuelSource(audit.fuelSource);
  const tier = CATEGORY_TIER_MAP[category] ?? DEFAULT_TIER;
  const priceUSD = CATEGORY_PRICE_MAP[category] ?? DEFAULT_PRICE_USD;
  const regionalAdjustment = getRegionalAdjustment(profile.zipCode, category);
  const baseEfficiencyPct =
    FUEL_EFFICIENCY_GAIN_MAP[fuelSource] ?? DEFAULT_EFFICIENCY_GAIN_PCT;
  const shortName = CATEGORY_SHORT_NAME_MAP[category] ?? audit.detectedCategory;
  const description = CATEGORY_DESCRIPTION_MAP[category] ?? "This upgrade will help you save energy and reduce your carbon footprint.";
  const conversionEfficiencyPct = clamp(
    Math.round(baseEfficiencyPct * regionalAdjustment.efficiencyMultiplier),
    0,
    100
  );
  const estimatedMonthlySavingsUSD = Math.max(
    0,
    Math.round(audit.estimatedMonthlySavingsUSD * regionalAdjustment.savingsMultiplier)
  );
  const confidenceScore = clamp(
    Number((audit.confidenceScore * regionalAdjustment.confidenceMultiplier).toFixed(2)),
    0,
    1
  );

  const base: Suggestion = {
    id: generateId(),
    tier,
    category,
    title: `Upgrade your ${audit.detectedCategory} (${audit.fuelSource}) to a high-efficiency electric alternative`,
    shortName,
    description,
    fuelSource: audit.fuelSource,
    priceUSD,
    estimatedMonthlySavingsUSD,
    conversionEfficiencyPct,
    rejected: false,
    accepted: false,
    appliedIncentives: [],
    source,
    sourceAuditId,
    createdAt: new Date().toISOString(),
    confidenceScore,
    reason: `Good fit for ${regionalAdjustment.label} conditions and ${fuelSource} systems.`,
  };

  return withAppliedIncentives(base, profile.zipCode);
}
