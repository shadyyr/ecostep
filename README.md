# EcoStep

**"TurboTax for Clean Energy Electrification"** — a mobile-first web app that photographs home appliances, utility bills, and breaker panels, uses Google Gemini to extract their specs, and produces a phased, geo-targeted clean-energy roadmap with real local incentives.

Built for a hackathon (OneEthos + Gemini API tracks).

## Stack

- Next.js 16 (App Router, TypeScript, Turbopack)
- Tailwind CSS v4
- `@google/genai` — Gemini 3.5 Flash for multimodal appliance-label parsing
- `@supabase/supabase-js` + `@supabase/ssr` — optional accounts (email/password) and cross-device sync
- No account required: state lives client-side in React Context + `localStorage` by default; signing in swaps the same state onto a Supabase-hosted Postgres row

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in GEMINI_API_KEY below
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Gemini API key

The camera → audit flow calls `/api/audit`, a server-side Next.js route handler that calls Gemini 3.5 Flash. It needs a real key in `.env.local`:

```
GEMINI_API_KEY=your_key_here
```

Get a key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey). Without a key, everything **except** the camera/audit flow still works (onboarding, dashboard, sorting, Target Bill simulator, and manual appliance entry all run entirely on client-side/mock data).

### Accounts (optional — Supabase)

Signing in is never required — the app works fully on `localStorage` for guests. Setting up Supabase adds "save your roadmap to an account" on top. Without it configured, the "Sign in" link simply doesn't render.

1. Create a project at [supabase.com/dashboard](https://supabase.com/dashboard). In **Project Settings → API**, copy the **Project URL** and **anon/public key** into `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
2. In the **SQL Editor**, run:
   ```sql
   create table if not exists public.user_state (
     user_id uuid primary key references auth.users(id) on delete cascade,
     state jsonb not null default '{}'::jsonb,
     updated_at timestamptz not null default now()
   );

   alter table public.user_state enable row level security;

   create policy "user_state_select_own" on public.user_state for select
     to authenticated using (auth.uid() = user_id);
   create policy "user_state_insert_own" on public.user_state for insert
     to authenticated with check (auth.uid() = user_id);
   create policy "user_state_update_own" on public.user_state for update
     to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
   create policy "user_state_delete_own" on public.user_state for delete
     to authenticated using (auth.uid() = user_id);

   grant usage on schema public to authenticated;
   grant select, insert, update, delete on public.user_state to authenticated;

   create or replace function public.set_user_state_updated_at()
   returns trigger language plpgsql as $$
   begin new.updated_at = now(); return new; end;
   $$;

   create trigger user_state_set_updated_at
     before update on public.user_state
     for each row execute function public.set_user_state_updated_at();
   ```
3. **Authentication → Providers → Email**: turn **off** "Confirm email" — accounts work immediately after sign-up.

Email/password only for now (kept deliberately simple for judging) — no Google OAuth setup needed.

Guest → account data migration: signing in for the first time seeds your account with whatever's currently in `localStorage` on that device. On every sign-in after that, the account's cloud data wins over local state.

## App flow

1. **Onboarding** — zip code + "I already have solar" toggle. Sets the local grid baseline and roadmap focus.
2. **Dashboard** — EcoScore, tiered suggestion cards (Tier 1 quick wins → Tier 3 structural), 4 sort modes, Target Bill simulator, Reject/recalibrate, optional sign-in.
3. **Camera capture** — double-scan (context shot + data-plate shot) → Gemini extraction → confirm → added to roadmap. Falls back to a manual entry form after 3 unreadable scans, or any time via the always-visible manual-entry button.

## Project layout

- `app/` — routes, layout, the `/api/audit` (Gemini) route handler
- `components/` — onboarding, dashboard, camera, auth, and shared `ui/` primitives
- `context/` — `AppStateContext` (reducer + local/remote persistence) and `AuthContext` (Supabase session)
- `lib/supabase/` — the browser Supabase client factory + the `isSupabaseConfigured()` guard
- `utils/` — pure logic: sorting, EcoScore/Target-Bill calculations, incentive matching, local + remote storage
- `data/` — static lookup tables: local incentives, category→tier/price mapping, grid-cleanliness baselines, mock demo data
- `types/` — shared TypeScript types
- `proxy.ts` — Supabase session-cookie refresh (Next.js 16 renamed `middleware.ts` → `proxy.ts`)
