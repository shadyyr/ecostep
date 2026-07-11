import { describe, expect, it } from "vitest";
import {
  analyzeIncentives,
  generateCoach,
  generateHomeIntelligence,
  parseUtilityBill,
  planBuyingCircles,
  planOutageResilience,
  simulateAffordability,
} from "@/lib/intelligence";
import type { Suggestion, UserProfile } from "@/types";

const profile: UserProfile = {
  zipCode: "98105",
  hasSolar: true,
  preference: "budget",
  maxBudgetUSD: 2500,
  targetBillUSD: 90,
};

function suggestion(overrides: Partial<Suggestion> = {}): Suggestion {
  return {
    id: "s-water",
    tier: 2,
    title: "Replace gas water heater with heat pump water heater",
    shortName: "Heat Pump Water Heater",
    description: "Efficient water heating.",
    category: "water heater",
    fuelSource: "Natural Gas",
    priceUSD: 1800,
    estimatedMonthlySavingsUSD: 45,
    conversionEfficiencyPct: 65,
    rejected: false,
    accepted: false,
    appliedIncentives: [],
    source: "mock",
    createdAt: "2026-07-11T00:00:00.000Z",
    confidenceScore: 0.85,
    ...overrides,
  };
}

describe("home intelligence backend", () => {
  it("parses utility bill text into usage, charges, rates, and confidence", () => {
    const bill = parseUtilityBill({
      rawText: `
        Seattle City Light
        Billing Period: 30 days
        Total Amount Due: $142.40
        Electric usage: 812 kWh
        Basic charge: $12.00
        Energy charges: $130.40
        Rate plan: Residential TOU
      `,
    });

    expect(bill.providerName).toContain("Seattle");
    expect(bill.totalDueUSD).toBe(142.4);
    expect(bill.electricityKWh).toBe(812);
    expect(bill.billingDays).toBe(30);
    expect(bill.estimatedRatePerKWh).toBeCloseTo(0.161, 3);
    expect(bill.confidenceScore).toBeGreaterThan(0.5);
  });

  it("scores matched incentives with paperwork and urgency context", () => {
    const result = analyzeIncentives({
      profile,
      suggestions: [suggestion()],
      currentDateISO: "2026-07-11T00:00:00.000Z",
    });

    const insight = result.insights[0];
    expect(insight.totalPotentialRebateUSD).toBeGreaterThanOrEqual(400);
    expect(insight.matches[0].requiredDocuments.length).toBeGreaterThan(0);
    expect(insight.urgencyScore).toBeGreaterThan(0);
    expect(result.highestUrgency?.suggestionId).toBe("s-water");
  });

  it("simulates affordability with financing and bill-rate adjustments", () => {
    const result = simulateAffordability({
      profile,
      suggestions: [
        suggestion({
          id: "s-thermostat",
          title: "Install smart thermostat",
          shortName: "Smart Thermostat",
          category: "thermostat",
          priceUSD: 130,
          estimatedMonthlySavingsUSD: 12,
          appliedIncentives: [{ incentiveName: "Audit rebate", rebateValueUSD: 100, type: "Rebate" }],
        }),
      ],
      parsedBill: parseUtilityBill({ totalDueUSD: 180, electricityKWh: 400, billingDays: 30 }),
      financingTermMonths: 24,
      aprPct: 0,
    });

    expect(result.scenarios[0].netUpfrontCostUSD).toBe(30);
    expect(result.scenarios[0].monthlyNetImpactUSD).toBeGreaterThan(0);
    expect(result.recommendedStack[0].suggestionId).toBe("s-thermostat");
  });

  it("generates coach nudges from incentive and affordability signals", () => {
    const suggestions = [suggestion()];
    const incentives = analyzeIncentives({
      profile,
      suggestions,
      currentDateISO: "2026-07-11T00:00:00.000Z",
    });
    const affordability = simulateAffordability({ profile, suggestions });
    const coach = generateCoach({ profile, suggestions, incentiveIntelligence: incentives, affordability });

    expect(coach.nudges.length).toBeGreaterThan(0);
    expect(coach.nudges.some((nudge) => nudge.actionType === "apply_incentive")).toBe(true);
  });

  it("models neighborhood buying circles without neighbor identity data", () => {
    const result = planBuyingCircles({
      profile,
      suggestions: [suggestion(), suggestion({ id: "s-furnace", category: "furnace", priceUSD: 7000 })],
    });

    expect(result.zipPrefix).toBe("981");
    expect(result.circles.length).toBeGreaterThan(0);
    expect(result.circles[0].privacyNote).toContain("no neighbor identities");
  });

  it("sizes outage resilience from critical loads and accepted storage", () => {
    const result = planOutageResilience({
      profile,
      suggestions: [suggestion({ id: "s-battery", category: "battery storage", accepted: true })],
      outageHoursTarget: 24,
      hasMedicalDevice: true,
    });

    expect(result.storageKWhRequired).toBeGreaterThan(0);
    expect(result.backupHoursEstimate).toBeGreaterThan(0);
    expect(result.warnings.some((warning) => warning.includes("Medical-device"))).toBe(true);
  });

  it("orchestrates the full home intelligence payload", () => {
    const result = generateHomeIntelligence({
      profile,
      suggestions: [suggestion()],
      utilityBill: { totalDueUSD: 150, electricityKWh: 650, billingDays: 31 },
      outageHoursTarget: 12,
    });

    expect(result.utilityBill?.electricityKWh).toBe(650);
    expect(result.incentives.insights.length).toBe(1);
    expect(result.affordability.scenarios.length).toBe(1);
    expect(result.coach.nudges.length).toBeGreaterThan(0);
    expect(result.resilience.outageHoursTarget).toBe(12);
  });
});
