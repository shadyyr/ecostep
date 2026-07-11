import { describe, expect, it } from "vitest";
import { buildSavingsProjection, DEFAULT_RATE_PER_KWH } from "@/utils/progress";
import type { Suggestion } from "@/types";

function suggestion(overrides: Partial<Suggestion> = {}): Suggestion {
  return {
    id: "s-1",
    tier: 1,
    title: "Test",
    shortName: "Test",
    description: "Test upgrade.",
    category: "thermostat",
    fuelSource: "Electricity",
    priceUSD: 100,
    estimatedMonthlySavingsUSD: 20,
    conversionEfficiencyPct: 20,
    rejected: false,
    accepted: true,
    appliedIncentives: [],
    source: "mock",
    createdAt: "now",
    ...overrides,
  };
}

describe("buildSavingsProjection", () => {
  it("returns a flat zero line when nothing is accepted", () => {
    const result = buildSavingsProjection([], DEFAULT_RATE_PER_KWH, 24);
    expect(result.monthlyUSD).toBe(0);
    expect(result.monthlyKWh).toBe(0);
    expect(result.points).toHaveLength(25);
    expect(result.points[24].cumulativeUSD).toBe(0);
    expect(result.points[24].cumulativeKWh).toBe(0);
  });

  it("sums accepted suggestions and projects linearly at the given rate", () => {
    const result = buildSavingsProjection(
      [suggestion({ id: "a", estimatedMonthlySavingsUSD: 20 }), suggestion({ id: "b", estimatedMonthlySavingsUSD: 30 })],
      0.2,
      12
    );
    expect(result.monthlyUSD).toBe(50);
    expect(result.monthlyKWh).toBe(250);
    expect(result.points[0]).toEqual({ month: 0, cumulativeUSD: 0, cumulativeKWh: 0 });
    expect(result.points[12].cumulativeUSD).toBe(600);
    expect(result.points[12].cumulativeKWh).toBe(3000);
  });
});
