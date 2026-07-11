import {
  CATEGORY_PRICE_MAP,
  CATEGORY_TIER_MAP,
  DEFAULT_PRICE_USD,
  DEFAULT_TIER,
  FUEL_EFFICIENCY_GAIN_MAP,
  DEFAULT_EFFICIENCY_GAIN_PCT,
  normalizeCategory,
  normalizeFuelSource,
} from "@/data/roadmapConfig";
import { getGridBaseline } from "@/data/gridProfiles";
import { withAppliedIncentives } from "@/utils/incentives";
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
 * ownership bonus (0 or 15), and points for upgrades the user has marked applied
 * (0-45, weighted by tier size and that upgrade's conversion efficiency).
 */
export function calculateEcoScore(
  profile: UserProfile,
  suggestions: Suggestion[]
): EcoScoreBreakdown {
  return computeEcoScoreBreakdown(profile, suggestions, (s) => s.applied);
}

/**
 * Same formula, but counts every active (non-rejected) suggestion as if it were
 * already applied — the score you'd reach by completing everything currently on
 * your roadmap. Lets newly-added suggestions visibly move something right away,
 * even before the user checks them off as done.
 */
export function calculatePotentialEcoScore(
  profile: UserProfile,
  suggestions: Suggestion[]
): EcoScoreBreakdown {
  return computeEcoScoreBreakdown(profile, suggestions, () => true);
}

/**
 * Greedy, largest-savings-first stack that closes the gap between the user's
 * current and target monthly bill in as few suggestions as possible. Does not
 * minimize total spend (a true cost-minimizing stack is a knapsack problem) —
 * documented tradeoff, fine for the suggestion-set sizes this app deals with.
 */
export function simulateTargetBill(
  currentBillUSD: number,
  targetBillUSD: number,
  activeSuggestions: Suggestion[]
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
    .sort((a, b) => b.estimatedMonthlySavingsUSD - a.estimatedMonthlySavingsUSD);

  const stack: Suggestion[] = [];
  let achieved = 0;
  for (const suggestion of candidates) {
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
  const conversionEfficiencyPct =
    FUEL_EFFICIENCY_GAIN_MAP[fuelSource] ?? DEFAULT_EFFICIENCY_GAIN_PCT;

  const base: Suggestion = {
    id: generateId(),
    tier,
    category,
    title: `Upgrade your ${audit.detectedCategory} (${audit.fuelSource}) to a high-efficiency electric alternative`,
    fuelSource: audit.fuelSource,
    priceUSD,
    estimatedMonthlySavingsUSD: Math.max(0, audit.estimatedMonthlySavingsUSD),
    conversionEfficiencyPct,
    rejected: false,
    applied: false,
    appliedIncentives: [],
    source,
    sourceAuditId,
    createdAt: new Date().toISOString(),
  };

  return withAppliedIncentives(base, profile.zipCode);
}
