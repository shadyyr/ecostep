import type { Suggestion, UserProfile } from "@/types";
import { withAppliedIncentives } from "@/utils/incentives";

// Hand-authored suggestions spanning all 3 tiers. Used to (a) unblock UI work before
// the Gemini pipeline exists, and (b) seed a new profile's dashboard immediately so the
// app is never an empty screen, including as a demo-day fallback if live scans fail.
const MOCK_SUGGESTION_TEMPLATES: Omit<Suggestion, "appliedIncentives">[] = [
  {
    id: "mock-thermostat",
    tier: 1,
    title: "Install a smart thermostat with off-peak scheduling",
    category: "thermostat",
    fuelSource: "Electricity",
    priceUSD: 130,
    estimatedMonthlySavingsUSD: 12,
    conversionEfficiencyPct: 20,
    rejected: false,
    applied: false,
    source: "mock",
    createdAt: new Date(0).toISOString(),
  },
  {
    id: "mock-weatherization",
    tier: 1,
    title: "Weatherize and add attic insulation",
    category: "insulation",
    fuelSource: "Natural Gas",
    priceUSD: 900,
    estimatedMonthlySavingsUSD: 18,
    conversionEfficiencyPct: 35,
    rejected: false,
    applied: false,
    source: "mock",
    createdAt: new Date(0).toISOString(),
  },
  {
    id: "mock-water-heater",
    tier: 2,
    title: "Replace gas water heater with a heat pump water heater",
    category: "water heater",
    fuelSource: "Natural Gas",
    priceUSD: 1800,
    estimatedMonthlySavingsUSD: 35,
    conversionEfficiencyPct: 65,
    rejected: false,
    applied: false,
    source: "mock",
    createdAt: new Date(0).toISOString(),
  },
  {
    id: "mock-range",
    tier: 2,
    title: "Swap gas range for an induction range",
    category: "range",
    fuelSource: "Natural Gas",
    priceUSD: 1600,
    estimatedMonthlySavingsUSD: 20,
    conversionEfficiencyPct: 55,
    rejected: false,
    applied: false,
    source: "mock",
    createdAt: new Date(0).toISOString(),
  },
  {
    id: "mock-furnace",
    tier: 3,
    title: "Replace aging gas furnace with a multi-zone heat pump system",
    category: "furnace",
    fuelSource: "Natural Gas",
    priceUSD: 6500,
    estimatedMonthlySavingsUSD: 90,
    conversionEfficiencyPct: 70,
    rejected: false,
    applied: false,
    source: "mock",
    createdAt: new Date(0).toISOString(),
  },
  {
    id: "mock-panel",
    tier: 3,
    title: "Upgrade electrical service panel (100A to 200A) to support electrification",
    category: "electrical panel",
    fuelSource: "Electricity",
    priceUSD: 4000,
    estimatedMonthlySavingsUSD: 15,
    conversionEfficiencyPct: 25,
    rejected: false,
    applied: false,
    source: "mock",
    createdAt: new Date(0).toISOString(),
  },
  {
    id: "mock-battery",
    tier: 3,
    title: "Add grid-tied home battery storage",
    category: "battery storage",
    fuelSource: "Electricity",
    priceUSD: 12000,
    estimatedMonthlySavingsUSD: 45,
    conversionEfficiencyPct: 40,
    rejected: false,
    applied: false,
    source: "mock",
    createdAt: new Date(0).toISOString(),
  },
];

export function getMockSuggestions(): Suggestion[] {
  return MOCK_SUGGESTION_TEMPLATES.map((s) => ({ ...s, appliedIncentives: [] }));
}

export function buildSeedSuggestions(profile: UserProfile): Suggestion[] {
  return MOCK_SUGGESTION_TEMPLATES.map((s) =>
    withAppliedIncentives({ ...s, appliedIncentives: [] }, profile.zipCode)
  );
}
