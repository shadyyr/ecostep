const PLACEHOLDER_VALUES = new Set(["your_supabase_project_url", "your_supabase_anon_key"]);

/**
 * True once real Supabase project credentials are in place. Every Supabase
 * entry point (proxy, AuthContext, remote storage) checks this first so the
 * app — guest mode especially — never hard-crashes on the placeholder values
 * shipped in .env.example/.env.local before setup is complete.
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return false;
  if (PLACEHOLDER_VALUES.has(url) || PLACEHOLDER_VALUES.has(anonKey)) return false;
  return true;
}
