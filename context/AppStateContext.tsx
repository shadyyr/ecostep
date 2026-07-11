"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type Dispatch,
  type ReactNode,
} from "react";
import type { Suggestion, UserProfile } from "@/types";
import { loadState, saveState, clearState, type PersistedState } from "@/utils/storage";
import { loadRemoteState, saveRemoteState } from "@/utils/remoteStorage";
import { buildSeedSuggestions } from "@/data/mockData";
import { useAuth } from "@/context/AuthContext";

interface AppState {
  status: "loading" | "ready";
  profile: UserProfile | null;
  suggestions: Suggestion[];
  rejectedSuggestionIds: string[];
}

type Action =
  | { type: "HYDRATE"; payload: Omit<AppState, "status"> | null }
  | { type: "SET_PROFILE"; payload: UserProfile }
  | { type: "ADD_SUGGESTIONS"; payload: Suggestion[] }
  | { type: "REJECT_SUGGESTION"; payload: { id: string } }
  | { type: "TOGGLE_APPLIED"; payload: { id: string } }
  | { type: "RESET_ALL" };

const initialState: AppState = {
  status: "loading",
  profile: null,
  suggestions: [],
  rejectedSuggestionIds: [],
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "HYDRATE": {
      if (!action.payload) return { ...state, status: "ready" };
      return { ...state, ...action.payload, status: "ready" };
    }
    case "SET_PROFILE": {
      const suggestions =
        state.suggestions.length === 0
          ? buildSeedSuggestions(action.payload)
          : state.suggestions;
      return { ...state, profile: action.payload, suggestions };
    }
    case "ADD_SUGGESTIONS": {
      return { ...state, suggestions: [...action.payload, ...state.suggestions] };
    }
    case "REJECT_SUGGESTION": {
      const { id } = action.payload;
      return {
        ...state,
        rejectedSuggestionIds: state.rejectedSuggestionIds.includes(id)
          ? state.rejectedSuggestionIds
          : [...state.rejectedSuggestionIds, id],
        suggestions: state.suggestions.map((s) =>
          s.id === id ? { ...s, rejected: true } : s
        ),
      };
    }
    case "TOGGLE_APPLIED": {
      const { id } = action.payload;
      return {
        ...state,
        suggestions: state.suggestions.map((s) =>
          s.id === id ? { ...s, applied: !s.applied } : s
        ),
      };
    }
    case "RESET_ALL": {
      return { ...initialState, status: "ready" };
    }
    default:
      return state;
  }
}

interface AppStateContextValue extends AppState {
  dispatch: Dispatch<Action>;
  setProfile(profile: UserProfile): void;
  addSuggestions(suggestions: Suggestion[]): void;
  rejectSuggestion(id: string): void;
  toggleApplied(id: string): void;
  resetAll(): void;
  activeSuggestions: Suggestion[];
}

const AppStateContext = createContext<AppStateContextValue | null>(null);

function guestState(): PersistedState {
  return loadState() ?? { profile: null, suggestions: [], rejectedSuggestionIds: [] };
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const { user, authLoading } = useAuth();
  const [state, dispatch] = useReducer(reducer, initialState);
  const identity = user?.id ?? "guest";
  // Tracks which identity (a user id, or "guest") the in-memory `state` currently
  // reflects. The save effect below only persists once this matches `identity` —
  // without this guard, the instant `user` flips from null to {id} on sign-in,
  // the save effect would fire with stale pre-sign-in guest data still in `state`
  // and could clobber real cloud data before hydration even checks for it.
  const hydratedIdentityRef = useRef<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (hydratedIdentityRef.current === identity) return;
    let cancelled = false;

    async function hydrate() {
      if (!user) {
        const payload = guestState();
        if (cancelled) return;
        hydratedIdentityRef.current = identity;
        dispatch({ type: "HYDRATE", payload });
        return;
      }

      const remote = await loadRemoteState(user.id);
      if (cancelled) return;

      if (remote.status === "found") {
        // An account's cloud data always wins over whatever is in local guest state.
        hydratedIdentityRef.current = identity;
        dispatch({ type: "HYDRATE", payload: remote.state });
      } else if (remote.status === "not_found") {
        // First sign-in for this account: seed the DB from current local guest
        // state so guest progress isn't lost.
        const payload = guestState();
        await saveRemoteState(user.id, payload);
        if (cancelled) return;
        hydratedIdentityRef.current = identity;
        dispatch({ type: "HYDRATE", payload });
      } else {
        // Transient error: don't seed or overwrite anything. Show a local,
        // unpersisted view for this session — leave hydratedIdentityRef unset so
        // saves stay blocked until a real hydration succeeds (e.g. next reload).
        dispatch({ type: "HYDRATE", payload: guestState() });
      }
    }

    hydrate();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user, identity]);

  useEffect(() => {
    if (state.status !== "ready") return;
    if (hydratedIdentityRef.current !== identity) return;
    const snapshot: PersistedState = {
      profile: state.profile,
      suggestions: state.suggestions,
      rejectedSuggestionIds: state.rejectedSuggestionIds,
    };
    if (user) saveRemoteState(user.id, snapshot);
    else saveState(snapshot);
  }, [state.status, state.profile, state.suggestions, state.rejectedSuggestionIds, user, identity]);

  const activeSuggestions = useMemo(
    () => state.suggestions.filter((s) => !s.rejected),
    [state.suggestions]
  );

  const value = useMemo<AppStateContextValue>(
    () => ({
      ...state,
      dispatch,
      activeSuggestions,
      setProfile: (profile) => dispatch({ type: "SET_PROFILE", payload: profile }),
      addSuggestions: (suggestions) =>
        dispatch({ type: "ADD_SUGGESTIONS", payload: suggestions }),
      rejectSuggestion: (id) => dispatch({ type: "REJECT_SUGGESTION", payload: { id } }),
      toggleApplied: (id) => dispatch({ type: "TOGGLE_APPLIED", payload: { id } }),
      resetAll: () => {
        clearState();
        dispatch({ type: "RESET_ALL" });
      },
    }),
    [state, activeSuggestions]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppStateContextValue {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used within an AppStateProvider");
  return ctx;
}
