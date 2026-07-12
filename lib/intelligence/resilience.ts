import type { CriticalLoadInput, ResiliencePlan, Suggestion, UserProfile } from "@/types";
import { clamp, round } from "@/lib/intelligence/shared";
import { isSuggestionPlanEligible } from "@/utils/homeEligibility";

export interface ResilienceInput {
  profile: UserProfile;
  suggestions: Suggestion[];
  outageHoursTarget?: number;
  criticalLoads?: CriticalLoadInput[];
  includeHeatingCooling?: boolean;
  hasMedicalDevice?: boolean;
}

const DEFAULT_CRITICAL_LOADS: CriticalLoadInput[] = [
  { label: "Refrigerator", watts: 150, required: true },
  { label: "WiFi and phones", watts: 40, required: true },
  { label: "LED safety lighting", watts: 60, required: true },
  { label: "Laptop or small electronics", watts: 90, required: false },
];

function normalizeLoads(input: ResilienceInput): CriticalLoadInput[] {
  const loads = input.criticalLoads?.length ? input.criticalLoads : DEFAULT_CRITICAL_LOADS;
  const extra: CriticalLoadInput[] = [];
  if (input.hasMedicalDevice) extra.push({ label: "Medical device reserve", watts: 120, required: true });
  if (input.includeHeatingCooling) extra.push({ label: "Efficient heating/cooling reserve", watts: 900, required: false });
  return [...loads, ...extra].filter((load) => load.watts > 0);
}

function hasAcceptedCategory(profile: UserProfile, suggestions: Suggestion[], category: string): boolean {
  return suggestions.some(
    (suggestion) =>
      suggestion.accepted &&
      suggestion.category === category &&
      isSuggestionPlanEligible(profile, suggestion)
  );
}

function matchingSuggestionIds(profile: UserProfile, suggestions: Suggestion[], categories: string[]): string[] {
  return suggestions
    .filter(
      (suggestion) =>
        categories.includes(suggestion.category) &&
        isSuggestionPlanEligible(profile, suggestion)
    )
    .map((suggestion) => suggestion.id);
}

export function planOutageResilience(input: ResilienceInput): ResiliencePlan {
  const outageHoursTarget = Math.max(4, Math.round(input.outageHoursTarget ?? 24));
  const loads = normalizeLoads(input);
  const requiredLoadWatts = loads
    .filter((load) => load.required)
    .reduce((sum, load) => sum + load.watts, 0);
  const optionalLoadWatts = loads
    .filter((load) => !load.required)
    .reduce((sum, load) => sum + load.watts * 0.5, 0);
  const criticalLoadWatts = Math.round(requiredLoadWatts + optionalLoadWatts);
  const storageKWhRequired = round((criticalLoadWatts * outageHoursTarget * 1.25) / 1000, 1);
  const hasBattery = hasAcceptedCategory(input.profile, input.suggestions, "battery storage");
  const hasSolar = input.profile.hasSolar || hasAcceptedCategory(input.profile, input.suggestions, "solar");
  const hasPanel = hasAcceptedCategory(input.profile, input.suggestions, "electrical panel");
  const installedStorageKWh = hasBattery ? 10 : 0;
  const solarExtension = hasSolar ? 1.35 : 1;
  const backupHoursEstimate =
    criticalLoadWatts > 0 ? round(((installedStorageKWh * 1000) / criticalLoadWatts) * solarExtension, 1) : 0;
  const solarKWRecommended = hasSolar ? 0 : round(Math.max(2, storageKWhRequired / 5), 1);
  const recommendedSuggestionIds = matchingSuggestionIds(input.profile, input.suggestions, [
    "battery storage",
    "solar",
    "electrical panel",
    "smart plug",
  ]);
  const actionItems: string[] = [];
  const warnings: string[] = [];

  if (!hasBattery) actionItems.push(`Size battery storage around ${storageKWhRequired} kWh for critical loads.`);
  if (!hasSolar) actionItems.push(`Consider ${solarKWRecommended} kW of solar or a battery charged from off-peak grid power.`);
  if (!hasPanel) actionItems.push("Confirm panel capacity before adding battery, solar, or large heat-pump loads.");
  actionItems.push("Create a labeled critical-load list for the electrician and keep outage priorities under 1 kW where possible.");

  if (input.includeHeatingCooling) warnings.push("Whole-home heating or cooling can multiply backup needs; critical-room backup is cheaper.");
  if (input.hasMedicalDevice) warnings.push("Medical-device backup should be verified with the device manufacturer and a licensed electrician.");
  if (backupHoursEstimate < outageHoursTarget && hasBattery) warnings.push("Accepted storage may not cover the full outage target without load shedding.");

  const resilienceScore = clamp(
    Math.round(
      20 +
        (hasBattery ? 35 : 0) +
        (hasSolar ? 25 : 0) +
        (hasPanel ? 10 : 0) +
        Math.min(10, backupHoursEstimate / Math.max(1, outageHoursTarget) * 10)
    ),
    0,
    100
  );

  return {
    generatedAt: new Date().toISOString(),
    outageHoursTarget,
    criticalLoadWatts,
    storageKWhRequired,
    solarKWRecommended,
    backupHoursEstimate,
    resilienceScore,
    recommendedSuggestionIds,
    actionItems,
    warnings,
  };
}
