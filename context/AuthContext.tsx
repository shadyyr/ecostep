"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

interface AuthResult {
  error: string | null;
}

interface AuthContextValue {
  user: User | null;
  authLoading: boolean;
  /** False until real Supabase credentials exist — lets the UI hide sign-in entirely
   * rather than offering a flow that can only ever fail. */
  authEnabled: boolean;
  signInWithPassword(email: string, password: string): Promise<AuthResult>;
  signUpWithPassword(email: string, password: string): Promise<AuthResult>;
  signOut(): Promise<void>;
}

const NOT_CONFIGURED_ERROR = "Accounts aren't set up for this deployment yet.";

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const authEnabled = isSupabaseConfigured();
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(authEnabled);

  useEffect(() => {
    if (!authEnabled) return;
    const supabase = getSupabaseBrowserClient();

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthLoading(false);
    });

    return () => subscription.subscription.unsubscribe();
  }, [authEnabled]);

  const value = useMemo<AuthContextValue>(() => {
    if (!authEnabled) {
      return {
        user: null,
        authLoading: false,
        authEnabled: false,
        signInWithPassword: async () => ({ error: NOT_CONFIGURED_ERROR }),
        signUpWithPassword: async () => ({ error: NOT_CONFIGURED_ERROR }),
        signOut: async () => {},
      };
    }

    const supabase = getSupabaseBrowserClient();
    return {
      user: session?.user ?? null,
      authLoading,
      authEnabled: true,
      signInWithPassword: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error: error?.message ?? null };
      },
      signUpWithPassword: async (email, password) => {
        const { error } = await supabase.auth.signUp({ email, password });
        return { error: error?.message ?? null };
      },
      signOut: async () => {
        await supabase.auth.signOut();
      },
    };
  }, [authEnabled, session, authLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
