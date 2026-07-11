// Illustrative regional grid-cleanliness baselines (0-40), keyed by 3-digit zip
// prefix. NOT sourced from real EPA eGRID subregion data — a hackathon
// simplification standing in for a real grid-mix API/dataset.
interface GridProfile {
  zipPrefix: string;
  baseline: number;
  label: string;
}

export const GRID_PROFILES: GridProfile[] = [
  { zipPrefix: "981", baseline: 38, label: "Pacific Northwest (hydro-heavy)" },
  { zipPrefix: "902", baseline: 30, label: "LA Basin (mixed grid, high solar penetration)" },
  { zipPrefix: "941", baseline: 34, label: "Bay Area (mixed renewables)" },
  { zipPrefix: "328", baseline: 18, label: "Central Florida (gas-heavy grid)" },
  { zipPrefix: "770", baseline: 15, label: "Gulf Coast Texas (gas/coal-heavy grid)" },
  { zipPrefix: "100", baseline: 26, label: "NYC Metro (mixed grid)" },
  { zipPrefix: "ANY", baseline: 20, label: "U.S. national average (fallback)" },
];

export function getGridBaseline(zipCode: string): GridProfile {
  return (
    GRID_PROFILES.find((p) => p.zipPrefix !== "ANY" && zipCode.startsWith(p.zipPrefix)) ??
    GRID_PROFILES.find((p) => p.zipPrefix === "ANY")!
  );
}
