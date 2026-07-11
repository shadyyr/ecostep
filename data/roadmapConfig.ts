import type { Tier } from "@/types";

// Illustrative hackathon lookup tables that bridge Gemini's AuditResult schema
// (which has no price/tier/efficiency fields) into a full Suggestion. Values are
// reasonable ballpark U.S. residential figures for a demo, not sourced pricing data.

export const DEFAULT_TIER: Tier = 2;
export const DEFAULT_PRICE_USD = 1000;
export const DEFAULT_EFFICIENCY_GAIN_PCT = 40;

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

export function normalizeCategory(category: string): string {
  return category.trim().toLowerCase();
}

export function normalizeFuelSource(fuelSource: string): string {
  return fuelSource.trim().toLowerCase();
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
