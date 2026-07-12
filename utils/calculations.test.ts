import { describe, expect, it } from 'vitest';
import {
  simulateTargetBill,
  calculateEcoScore,
  calculatePotentialEcoScore,
  auditResultToSuggestion,
  getPersonalizedNextAction,
  getSuggestionInsight,
} from '@/utils/calculations';
import { getMatchingIncentives } from '@/utils/incentives';
import { sortSuggestionsForProfile } from '@/utils/sorting';
import type { AuditResult, Suggestion, UserProfile } from '@/types';

describe('normalize and scoring logic', () => {
  it('prefers higher savings and lower cost when building a bill-reduction stack', () => {
    const suggestions: Suggestion[] = [
      {
        id: 'cheap-low-savings',
        tier: 1,
        title: 'Low savings',
        shortName: 'Low savings',
        description: 'Low savings upgrade.',
        category: 'thermostat',
        fuelSource: 'Electricity',
        priceUSD: 100,
        estimatedMonthlySavingsUSD: 10,
        conversionEfficiencyPct: 20,
        rejected: false,
        accepted: false,
        appliedIncentives: [],
        source: 'mock',
        createdAt: 'now',
      },
      {
        id: 'expensive-high-savings',
        tier: 2,
        title: 'High savings',
        shortName: 'High savings',
        description: 'High savings upgrade.',
        category: 'water heater',
        fuelSource: 'Natural Gas',
        priceUSD: 200,
        estimatedMonthlySavingsUSD: 30,
        conversionEfficiencyPct: 50,
        rejected: false,
        accepted: false,
        appliedIncentives: [],
        source: 'mock',
        createdAt: 'now',
      },
    ];

    const result = simulateTargetBill(50, 0, suggestions);
    expect(result.stack.map((s) => s.id)).toEqual(['expensive-high-savings', 'cheap-low-savings']);
  });

  it('calculates eco score with grid baseline, solar bonus, and accepted points', () => {
    const profile: UserProfile = {
      zipCode: '98101',
      hasSolar: true,
      preference: 'savings',
      maxBudgetUSD: 5000,
    };
    const suggestions: Suggestion[] = [
      {
        id: 's1',
        tier: 1,
        title: 'Thermostat',
        shortName: 'Smart Thermostat',
        description: 'Smart thermostat upgrade.',
        category: 'thermostat',
        fuelSource: 'Electricity',
        priceUSD: 130,
        estimatedMonthlySavingsUSD: 12,
        conversionEfficiencyPct: 20,
        rejected: false,
        accepted: true,
        appliedIncentives: [],
        source: 'mock',
        createdAt: 'now',
      },
    ];

    const result = calculateEcoScore(profile, suggestions);
    expect(result.score).toBeGreaterThan(0);
    expect(result.solarBoost).toBe(15);
    expect(result.appliedScore).toBeGreaterThan(0);
  });

  it('converts audit results into suggestions with normalized values and regional confidence', () => {
    const profile: UserProfile = {
      zipCode: '98101',
      hasSolar: false,
      preference: 'savings',
      maxBudgetUSD: 5000,
    };
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

  it('builds a short explanation for why a suggestion is a strong fit', () => {
    const profile: UserProfile = { zipCode: '98101', hasSolar: false, preference: 'impact', maxBudgetUSD: 5000 };
    const suggestion: Suggestion = {
      id: 'insight-1',
      tier: 2,
      title: 'Heat pump water heater',
      shortName: 'Heat Pump Water Heater',
      description: 'Heat pump water heater upgrade.',
      category: 'water heater',
      fuelSource: 'Natural Gas',
      priceUSD: 2500,
      estimatedMonthlySavingsUSD: 45,
      conversionEfficiencyPct: 70,
      rejected: false,
      accepted: false,
      appliedIncentives: [],
      source: 'mock',
      createdAt: 'now',
    };

    const insight = getSuggestionInsight(suggestion, profile);
    expect(insight).toContain('impact');
    expect(insight).toContain('savings');
  });

  it('prefers budget-friendly suggestions when the user has a tight budget and bill target', () => {
    const profile: UserProfile = {
      zipCode: '98101',
      hasSolar: false,
      preference: 'budget',
      maxBudgetUSD: 1000,
      targetBillUSD: 80,
    };
    const suggestions: Suggestion[] = [
      {
        id: 'expensive',
        tier: 3,
        title: 'Premium upgrade',
        shortName: 'Premium Upgrade',
        description: 'Premium upgrade.',
        category: 'hvac',
        fuelSource: 'Electricity',
        priceUSD: 2400,
        estimatedMonthlySavingsUSD: 60,
        conversionEfficiencyPct: 80,
        rejected: false,
        accepted: false,
        appliedIncentives: [],
        source: 'mock',
        createdAt: 'now',
      },
      {
        id: 'budget',
        tier: 1,
        title: 'Budget upgrade',
        shortName: 'Budget Upgrade',
        description: 'Budget upgrade.',
        category: 'thermostat',
        fuelSource: 'Electricity',
        priceUSD: 250,
        estimatedMonthlySavingsUSD: 25,
        conversionEfficiencyPct: 35,
        rejected: false,
        accepted: false,
        appliedIncentives: [],
        source: 'mock',
        createdAt: 'now',
      },
    ];

    const sorted = sortSuggestionsForProfile(suggestions, profile, 'recommended', profile.targetBillUSD);
    expect(sorted).toHaveLength(2);
    expect(sorted.map((s) => s.id)).toContain('expensive');
    expect(sorted[0].id).toBe('budget');
  });

  it('keeps apartment-restricted projects visible but out of self-directed planning', () => {
    const apartmentProfile: UserProfile = {
      zipCode: '98101',
      hasSolar: false,
      preference: 'savings',
      maxBudgetUSD: 5000,
      currentBillUSD: 100,
      targetBillUSD: 70,
      homeType: 'apartment',
    };
    const houseProfile: UserProfile = { ...apartmentProfile, homeType: 'house' };
    const smartPlug: Suggestion = {
      id: 'smart-plug',
      tier: 1,
      title: 'Use smart plugs',
      shortName: 'Smart Plug',
      description: 'Plug load control.',
      category: 'smart plug',
      fuelSource: 'Electricity',
      priceUSD: 40,
      estimatedMonthlySavingsUSD: 8,
      conversionEfficiencyPct: 10,
      rejected: false,
      accepted: false,
      appliedIncentives: [],
      source: 'mock',
      createdAt: 'now',
    };
    const thermostat: Suggestion = {
      id: 'thermostat',
      tier: 1,
      title: 'Install smart thermostat',
      shortName: 'Smart Thermostat',
      description: 'Thermostat upgrade.',
      category: 'thermostat',
      fuelSource: 'Electricity',
      priceUSD: 130,
      estimatedMonthlySavingsUSD: 25,
      conversionEfficiencyPct: 20,
      rejected: false,
      accepted: false,
      appliedIncentives: [],
      source: 'mock',
      createdAt: 'now',
    };
    const suggestions = [thermostat, smartPlug];

    const sorted = sortSuggestionsForProfile(suggestions, apartmentProfile, 'maxSavings');
    const apartmentPotential = calculatePotentialEcoScore(apartmentProfile, suggestions);
    const housePotential = calculatePotentialEcoScore(houseProfile, suggestions);
    const apartmentAccepted = calculateEcoScore(apartmentProfile, [
      { ...thermostat, accepted: true },
    ]);
    const targetBill = simulateTargetBill(100, 70, suggestions, apartmentProfile);
    const nextAction = getPersonalizedNextAction(
      suggestions,
      apartmentProfile,
      apartmentProfile.targetBillUSD
    );

    expect(sorted.map((s) => s.id)).toEqual(['smart-plug', 'thermostat']);
    expect(apartmentPotential.appliedScore).toBeLessThan(housePotential.appliedScore);
    expect(apartmentAccepted.appliedScore).toBe(0);
    expect(targetBill.stack.map((s) => s.id)).toEqual(['smart-plug']);
    expect(nextAction?.id).toBe('smart-plug');
  });
});
