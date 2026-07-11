import type { Tier } from "@/types";

// Illustrative hackathon lookup tables that bridge Gemini's AuditResult schema
// (which has no price/tier/efficiency fields) into a full Suggestion. Values are
// reasonable ballpark U.S. residential figures for a demo, not sourced pricing data.

export const DEFAULT_TIER: Tier = 2;
export const DEFAULT_PRICE_USD = 1000;
export const DEFAULT_EFFICIENCY_GAIN_PCT = 40;

export interface RegionalProfile {
  zipPrefix: string;
  label: string;
  savingsMultiplier: number;
  efficiencyMultiplier: number;
  confidenceMultiplier: number;
}

export const REGIONAL_PROFILES: RegionalProfile[] = [
  { zipPrefix: "981", label: "Pacific Northwest", savingsMultiplier: 1.08, efficiencyMultiplier: 1.05, confidenceMultiplier: 1.05 },
  { zipPrefix: "902", label: "Southern California", savingsMultiplier: 1.12, efficiencyMultiplier: 1.08, confidenceMultiplier: 1.1 },
  { zipPrefix: "941", label: "Bay Area", savingsMultiplier: 1.1, efficiencyMultiplier: 1.06, confidenceMultiplier: 1.08 },
  { zipPrefix: "328", label: "Central Florida", savingsMultiplier: 1.02, efficiencyMultiplier: 1.02, confidenceMultiplier: 0.98 },
  { zipPrefix: "770", label: "Gulf Coast", savingsMultiplier: 0.95, efficiencyMultiplier: 0.97, confidenceMultiplier: 0.95 },
  { zipPrefix: "100", label: "New York Metro", savingsMultiplier: 1.04, efficiencyMultiplier: 1.03, confidenceMultiplier: 1.02 },
  { zipPrefix: "ANY", label: "national average", savingsMultiplier: 1, efficiencyMultiplier: 1, confidenceMultiplier: 1 },
];

export const CATEGORY_TIER_MAP: Record<string, Tier> = {
  "thermostat": 1,
  "weatherization": 1,
  "insulation": 1,
  "led lighting": 1,
  "smart plug": 1,
  "water heater": 2,
  "range": 2,
  "oven": 2,
  "cooktop": 2,
  "clothes dryer": 2,
  "furnace": 3,
  "ac condenser": 3,
  "air conditioner": 3,
  "heat pump": 3,
  "hvac": 3,
  "electrical panel": 3,
  "battery storage": 3,
  "solar": 3,
};

export const CATEGORY_PRICE_MAP: Record<string, number> = {
  "thermostat": 130,
  "weatherization": 150,
  "insulation": 900,
  "led lighting": 60,
  "smart plug": 40,
  "water heater": 1800,
  "range": 1600,
  "oven": 1600,
  "cooktop": 1400,
  "clothes dryer": 1200,
  "furnace": 6500,
  "ac condenser": 7000,
  "air conditioner": 7000,
  "heat pump": 8500,
  "hvac": 8500,
  "electrical panel": 4000,
  "battery storage": 12000,
  "solar": 18000,
};

// % drop in fossil-fuel footprint when swapped for a clean electric alternative,
// relative to the fuel source Gemini (or the manual form) reports on the existing unit.
export const FUEL_EFFICIENCY_GAIN_MAP: Record<string, number> = {
  "natural gas": 65,
  "propane": 70,
  "heating oil": 78,
  "gasoline": 60,
  "electricity": 20,
  "not found": DEFAULT_EFFICIENCY_GAIN_PCT,
};

const CATEGORY_ALIASES: Record<string, string> = {
  "air con": "air conditioner",
  "ac": "air conditioner",
  "ac condenser": "ac condenser",
  "hvac": "hvac",
  "waterheater": "water heater",
  "water heater": "water heater",
  "electricalpanel": "electrical panel",
  "electrical panel": "electrical panel",
  "battery": "battery storage",
  "battery storage": "battery storage",
  "heatpump": "heat pump",
  "heat pump": "heat pump",
  "furnace": "furnace",
  "range": "range",
  "clothes dryer": "clothes dryer",
  "oven": "oven",
  "cooktop": "cooktop",
  "thermostat": "thermostat",
  "weatherization": "weatherization",
  "insulation": "insulation",
  "led lighting": "led lighting",
  "smart plug": "smart plug",
  "solar": "solar",
};

const FUEL_ALIASES: Record<string, string> = {
  "natural gas": "natural gas",
  "nat gas": "natural gas",
  "gas": "natural gas",
  "propane": "propane",
  "heating oil": "heating oil",
  "fuel oil": "heating oil",
  "electric": "electricity",
  "electricity": "electricity",
  "not found": "not found",
  "unknown": "not found",
};

export function normalizeCategory(category: string): string {
  const normalized = category.trim().toLowerCase();
  return CATEGORY_ALIASES[normalized] ?? normalized;
}

export function normalizeFuelSource(fuelSource: string): string {
  const normalized = fuelSource.trim().toLowerCase();
  return FUEL_ALIASES[normalized] ?? normalized;
}

export function getRegionalProfile(zipCode: string): RegionalProfile {
  const normalized = zipCode.trim();
  const prefix = normalized.replace(/\D/g, "").slice(0, 3);
  return (
    REGIONAL_PROFILES.find((profile) => profile.zipPrefix === prefix) ??
    REGIONAL_PROFILES.find((profile) => profile.zipPrefix === "ANY")!
  );
}

export function getRegionalAdjustment(zipCode: string, category: string) {
  const profile = getRegionalProfile(zipCode);
  const normalizedCategory = normalizeCategory(category);
  const categoryBoost = /(?:water heater|furnace|heat pump|air conditioner|hvac|battery storage)/.test(
    normalizedCategory
  )
    ? 1.08
    : 1;

  return {
    ...profile,
    savingsMultiplier: profile.savingsMultiplier * categoryBoost,
    efficiencyMultiplier: profile.efficiencyMultiplier * (categoryBoost > 1 ? 1.02 : 1),
  };
}

export const APPLIANCE_CATEGORY_OPTIONS = [
  "Water Heater",
  "Furnace",
  "AC Condenser",
  "Electrical Panel",
  "Range",
  "Clothes Dryer",
  "Battery Storage",
] as const;

export const FUEL_TYPE_OPTIONS = [
  "Natural Gas",
  "Propane",
  "Heating Oil",
  "Electricity",
] as const;

export const APPROXIMATE_AGE_OPTIONS = [
  "0-5 years",
  "6-10 years",
  "11-15 years",
  "16-20 years",
  "20+ years",
] as const;

// Rough monthly-savings estimate for manually-entered appliances, since there's no
// Gemini-derived estimatedMonthlySavingsUSD to fall back on for that path.
export function estimateManualSavings(category: string, fuelSource: string): number {
  const tier = CATEGORY_TIER_MAP[normalizeCategory(category)] ?? DEFAULT_TIER;
  const baseByTier: Record<Tier, number> = { 1: 12, 2: 35, 3: 90 };
  const fuelMultiplier = normalizeFuelSource(fuelSource) === "electricity" ? 0.5 : 1;
  return Math.round(baseByTier[tier] * fuelMultiplier);
}
