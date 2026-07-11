import type { IncentiveEntry } from "@/types";

// Localized Incentive & Generation Database (PRD section 5, verbatim).
// Static seed data for the hackathon MVP — not a live/official incentive feed.
export const incentives: IncentiveEntry[] = [
  {
    zipCodePrefix: "328",
    targetCategory: "Water Heater",
    incentiveName: "Florida Local Utility Energy-Star Upgrade Bonus",
    rebateValueUSD: 350,
    type: "Instant Rebate",
  },
  {
    zipCodePrefix: "902",
    targetCategory: "Battery Storage",
    incentiveName: "California Self-Generation Incentive Program (SGIP)",
    rebateValueUSD: 1000,
    type: "Capacity Rebate",
  },
  {
    zipCodePrefix: "ANY",
    targetCategory: "Leased Battery / Solar Upgrade",
    incentiveName: "Commercial Lease/PPA Pass-Through Credit Savings",
    rebateValueUSD: 2500,
    type: "Bill Discount Lease Offset",
  },
  {
    zipCodePrefix: "981",
    targetCategory: "Water Heater",
    incentiveName: "Seattle Heat Pump Water Heater Upgrade Rebate",
    rebateValueUSD: 400,
    type: "Rebate",
  },
  {
    zipCodePrefix: "ANY",
    targetCategory: "Thermostat",
    incentiveName: "Home Energy Audit Rebate",
    rebateValueUSD: 100,
    type: "Rebate",
  },
  {
    zipCodePrefix: "941",
    targetCategory: "Furnace",
    incentiveName: "Bay Area Electrification Bonus",
    rebateValueUSD: 600,
    type: "Rebate",
  },
  {
    zipCodePrefix: "100",
    targetCategory: "Range",
    incentiveName: "NYC Induction Range Incentive",
    rebateValueUSD: 500,
    type: "Rebate",
  },
];
