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
];
