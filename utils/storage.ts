import type { ParsedUtilityBill, Suggestion, UserProfile } from "@/types";

const STORAGE_KEY = "ecostep:v1";

export interface PersistedState {
  profile: UserProfile | null;
  suggestions: Suggestion[];
  rejectedSuggestionIds: string[];
  parsedBill: ParsedUtilityBill | null;
}

export function loadState(): PersistedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    return {
      profile: parsed.profile ?? null,
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
      rejectedSuggestionIds: Array.isArray(parsed.rejectedSuggestionIds)
        ? parsed.rejectedSuggestionIds
        : [],
      parsedBill: parsed.parsedBill ?? null,
    };
  } catch {
    return null;
  }
}

export function saveState(state: PersistedState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Best-effort persistence — e.g. Safari private mode throws on setItem. The app
    // still works for the session, it just won't survive a refresh.
  }
}

export function clearState(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // no-op
  }
}
