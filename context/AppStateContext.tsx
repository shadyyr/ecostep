"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode,
} from "react";
import type { Suggestion, UserProfile } from "@/types";
import { loadState, saveState, clearState } from "@/utils/storage";
import { buildSeedSuggestions } from "@/data/mockData";

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

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    const persisted = loadState();
    dispatch({
      type: "HYDRATE",
      payload: persisted
        ? {
            profile: persisted.profile,
            suggestions: persisted.suggestions,
            rejectedSuggestionIds: persisted.rejectedSuggestionIds,
          }
        : null,
    });
    // Runs once on mount to hydrate from localStorage before first paint of real content.
  }, []);

  useEffect(() => {
    if (state.status !== "ready") return;
    saveState({
      profile: state.profile,
      suggestions: state.suggestions,
      rejectedSuggestionIds: state.rejectedSuggestionIds,
    });
  }, [state.status, state.profile, state.suggestions, state.rejectedSuggestionIds]);

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
