import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { PersistedState } from "@/utils/storage";

export type RemoteLoadResult =
  | { status: "found"; state: PersistedState }
  | { status: "not_found" }
  | { status: "error" };

/**
 * Deliberately a 3-way result rather than collapsing "no row yet" and "query
 * error" into the same falsy bucket: the caller treats "not_found" as
 * first-sign-in (seed the DB from local state) and "error" as "don't touch
 * anything" — conflating the two would let a transient network blip look like
 * a first sign-in and silently overwrite real account data.
 */
export async function loadRemoteState(userId: string): Promise<RemoteLoadResult> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("user_state")
    .select("state")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("loadRemoteState failed", error);
    return { status: "error" };
  }
  if (!data) return { status: "not_found" };

  const raw = data.state as Partial<PersistedState> | null;
  return {
    status: "found",
    state: {
      profile: raw?.profile ?? null,
      suggestions: Array.isArray(raw?.suggestions) ? raw.suggestions : [],
      rejectedSuggestionIds: Array.isArray(raw?.rejectedSuggestionIds)
        ? raw.rejectedSuggestionIds
        : [],
    },
  };
}

export async function saveRemoteState(userId: string, state: PersistedState): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("user_state")
    .upsert({ user_id: userId, state, updated_at: new Date().toISOString() });
  if (error) console.error("saveRemoteState failed", error);
}
