import { normalizeCategory } from "@/data/roadmapConfig";
import type { Suggestion, UserProfile } from "@/types";

export type HomeControlStatus =
  | "in_control"
  | "approval_recommended"
  | "limited_control";

export interface HomeSuggestionControl {
  status: HomeControlStatus;
  label: string;
  reason: string;
  actionHint: string;
  sortRank: number;
  scoreMultiplier: number;
}

const APARTMENT_RENTER_CONTROLLED = new Set([
  "led lighting",
  "smart plug",
]);

const APARTMENT_APPROVAL_RECOMMENDED = new Set([
  "range",
  "oven",
  "cooktop",
  "clothes dryer",
]);

const APARTMENT_LIMITED_CONTROL = new Set([
  "thermostat",
  "weatherization",
  "insulation",
  "water heater",
  "furnace",
  "ac condenser",
  "air conditioner",
  "heat pump",
  "hvac",
  "electrical panel",
  "battery storage",
  "solar",
]);

const SHARED_BUILDING_APPROVAL_RECOMMENDED = new Set([
  "weatherization",
  "insulation",
  "furnace",
  "ac condenser",
  "air conditioner",
  "heat pump",
  "hvac",
  "electrical panel",
  "battery storage",
  "solar",
]);

const IN_CONTROL: HomeSuggestionControl = {
  status: "in_control",
  label: "Within your control",
  reason: "This upgrade is usually something the household can choose directly.",
  actionHint: "You can keep this in the active roadmap.",
  sortRank: 0,
  scoreMultiplier: 1,
};

const APARTMENT_APPROVAL: HomeSuggestionControl = {
  status: "approval_recommended",
  label: "Ask first",
  reason:
    "Apartment renters can sometimes change this item if they own it, but leases or building rules often require approval.",
  actionHint: "Confirm ownership and landlord approval before accepting this into the plan.",
  sortRank: 1,
  scoreMultiplier: 0.55,
};

const SHARED_BUILDING_APPROVAL: HomeSuggestionControl = {
  status: "approval_recommended",
  label: "Approval may be needed",
  reason:
    "This may touch shared systems, exterior work, HOA rules, or landlord-controlled equipment.",
  actionHint: "Confirm approval before scheduling quotes or counting this as a near-term step.",
  sortRank: 1,
  scoreMultiplier: 0.7,
};

const APARTMENT_LIMITED: HomeSuggestionControl = {
  status: "limited_control",
  label: "Landlord-controlled",
  reason:
    "Apartments and rentals usually place this equipment under landlord or building management control.",
  actionHint: "Treat this as a property-manager conversation, not a self-directed upgrade.",
  sortRank: 2,
  scoreMultiplier: 0.08,
};

export function getHomeSuggestionControl(
  profile: UserProfile | null | undefined,
  suggestion: Suggestion
): HomeSuggestionControl {
  const homeType = profile?.homeType ?? "house";
  const category = normalizeCategory(suggestion.category);

  if (homeType === "apartment") {
    if (APARTMENT_RENTER_CONTROLLED.has(category)) return IN_CONTROL;
    if (APARTMENT_APPROVAL_RECOMMENDED.has(category)) return APARTMENT_APPROVAL;
    if (APARTMENT_LIMITED_CONTROL.has(category)) return APARTMENT_LIMITED;
    return APARTMENT_APPROVAL;
  }

  if (
    (homeType === "townhouse" || homeType === "duplex") &&
    SHARED_BUILDING_APPROVAL_RECOMMENDED.has(category)
  ) {
    return SHARED_BUILDING_APPROVAL;
  }

  return IN_CONTROL;
}

export function isSuggestionPlanEligible(
  profile: UserProfile | null | undefined,
  suggestion: Suggestion
): boolean {
  return getHomeSuggestionControl(profile, suggestion).status !== "limited_control";
}
