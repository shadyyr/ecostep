import { describe, expect, it } from 'vitest';
import { simulateTargetBill, calculateEcoScore, auditResultToSuggestion } from '@/utils/calculations';
import { getMatchingIncentives } from '@/utils/incentives';
import type { AuditResult, Suggestion, UserProfile } from '@/types';

describe('normalize and scoring logic', () => {
  it('prefers higher savings and lower cost when building a bill-reduction stack', () => {
    const suggestions: Suggestion[] = [
      {
        id: 'cheap-low-savings',
        tier: 1,
        title: 'Low savings',
        category: 'thermostat',
        fuelSource: 'Electricity',
        priceUSD: 100,
        estimatedMonthlySavingsUSD: 10,
        conversionEfficiencyPct: 20,
        rejected: false,
        applied: false,
        appliedIncentives: [],
        source: 'mock',
        createdAt: 'now',
      },
      {
        id: 'expensive-high-savings',
        tier: 2,
        title: 'High savings',
        category: 'water heater',
        fuelSource: 'Natural Gas',
        priceUSD: 200,
        estimatedMonthlySavingsUSD: 30,
        conversionEfficiencyPct: 50,
        rejected: false,
        applied: false,
        appliedIncentives: [],
        source: 'mock',
        createdAt: 'now',
      },
    ];

    const result = simulateTargetBill(50, 0, suggestions);
    expect(result.stack.map((s) => s.id)).toEqual(['expensive-high-savings', 'cheap-low-savings']);
  });

  it('calculates eco score with grid baseline, solar bonus, and applied points', () => {
    const profile: UserProfile = { zipCode: '98101', hasSolar: true };
    const suggestions: Suggestion[] = [
      {
        id: 's1',
        tier: 1,
        title: 'Thermostat',
        category: 'thermostat',
        fuelSource: 'Electricity',
        priceUSD: 130,
        estimatedMonthlySavingsUSD: 12,
        conversionEfficiencyPct: 20,
        rejected: false,
        applied: true,
        appliedIncentives: [],
        source: 'mock',
        createdAt: 'now',
      },
    ];

    const result = calculateEcoScore(profile, suggestions);
    expect(result.score).toBeGreaterThan(0);
    expect(result.solarBoost).toBe(15);
  });

  it('converts audit results into suggestions with normalized values and regional confidence', () => {
    const profile: UserProfile = { zipCode: '98101', hasSolar: false };
    const audit: AuditResult = {
      detectedCategory: 'HVAC',
      brand: 'Brand',
      modelNumber: '123',
      fuelSource: 'Gas',
      estimatedAgeYears: 10,
      electricalDrawAmps: 20,
      estimatedMonthlySavingsUSD: 40,
      confidenceScore: 0.9,
    };

    const suggestion = auditResultToSuggestion(audit, profile, 'manual');
    expect(suggestion.category).toBe('hvac');
    expect(suggestion.fuelSource).toBe('Gas');
    expect(suggestion.tier).toBe(3);
    expect(suggestion.confidenceScore).toBeGreaterThan(0.8);
    expect(suggestion.reason).toContain('conditions');
  });

  it('matches incentives by category and zip for richer regional logic', () => {
    const matches = getMatchingIncentives('Water Heater', '98105');
    expect(matches.some((entry) => entry.incentiveName.includes('Heat Pump'))).toBe(true);
  });
});
