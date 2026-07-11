# EcoStep

**"TurboTax for Clean Energy Electrification"** — a mobile-first web app that photographs home appliances, utility bills, and breaker panels, uses Google Gemini to extract their specs, and produces a phased, geo-targeted clean-energy roadmap with real local incentives.

Built for a hackathon (OneEthos + Gemini API tracks).

## Stack

- Next.js 16 (App Router, TypeScript, Turbopack)
- Tailwind CSS v4
- `@google/genai` — Gemini 3.5 Flash for multimodal appliance-label parsing
- No database — all state lives client-side in React Context + `localStorage`

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

## App flow

1. **Onboarding** — zip code + "I already have solar" toggle. Sets the local grid baseline and roadmap focus.
2. **Dashboard** — EcoScore, tiered suggestion cards (Tier 1 quick wins → Tier 3 structural), 4 sort modes, Target Bill simulator, Reject/recalibrate.
3. **Camera capture** — double-scan (context shot + data-plate shot) → Gemini extraction → confirm → added to roadmap. Falls back to a manual entry form after 3 unreadable scans, or any time via the always-visible manual-entry button.

## Project layout

- `app/` — routes, layout, the single `/api/audit` route handler
- `components/` — onboarding, dashboard, camera, and shared `ui/` primitives
- `context/` — the single `AppStateContext` (reducer + localStorage sync)
- `utils/` — pure logic: sorting, EcoScore/Target-Bill calculations, incentive matching, storage
- `data/` — static lookup tables: local incentives, category→tier/price mapping, grid-cleanliness baselines, mock demo data
- `types/` — shared TypeScript types
