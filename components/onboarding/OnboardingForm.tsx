"use client";

import { useState, type FormEvent } from "react";
import { useAppState } from "@/context/AppStateContext";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { RecommendationPreference } from "@/types";

const ZIP_PATTERN = /^\d{5}$/;

export function OnboardingForm() {
  const { setProfile } = useAppState();
  const [zipCode, setZipCode] = useState("");
  const [hasSolar, setHasSolar] = useState(false);
  const [preference, setPreference] = useState<RecommendationPreference>("savings");
  const [maxBudgetUSD] = useState(5000);
  const [currentBillUSD, setCurrentBillUSD] = useState("120");
  const [targetBillUSD, setTargetBillUSD] = useState("95");
  const [homeType, setHomeType] = useState<"house" | "apartment" | "townhouse" | "duplex">("house");
  const [error, setError] = useState<string | null>(null);

  function normalizeOnBlur(value: string, setter: (value: string) => void) {
    const parsed = Number(value);
    setter(value.trim() === "" || !Number.isFinite(parsed) ? "0" : String(parsed));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!ZIP_PATTERN.test(zipCode)) {
      setError("Enter a valid 5-digit zip code.");
      return;
    }
    setError(null);
    setProfile({
      zipCode,
      hasSolar,
      preference,
      maxBudgetUSD,
      currentBillUSD: Number(currentBillUSD) || 0,
      targetBillUSD: Number(targetBillUSD) || 0,
      homeType,
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-10">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-brand-900 dark:text-brand-250">
          Welcome to EcoStep
        </h1>
        <p className="mt-2 text-sm text-black/60 dark:text-white/60">
          Your phased, geo-targeted roadmap to a cleaner, cheaper home.
        </p>
        <div className="mt-3 flex justify-center gap-2 text-xs text-brand-700 dark:text-brand-250">
          <span className="rounded-full border border-brand-250/50 px-2.5 py-1">1. Tell us about your home</span>
          <span className="rounded-full border border-brand-250/50 px-2.5 py-1">2. Pick your goal</span>
          <span className="rounded-full border border-brand-250/50 px-2.5 py-1">3. Start saving</span>
        </div>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label htmlFor="zipCode" className="mb-1.5 block text-sm font-medium">
              Zip code
            </label>
            <input
              id="zipCode"
              name="zipCode"
              type="text"
              inputMode="numeric"
              maxLength={5}
              placeholder="e.g. 90210"
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value.replace(/\D/g, ""))}
              className="w-full rounded-lg border border-black/10 bg-white px-3.5 py-2.5 text-base outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-250 dark:border-white/15 dark:bg-black/20"
            />
            <p className="mt-1.5 text-xs text-black/50 dark:text-white/50">
              We use this to map your home to your local power grid&apos;s clean-energy mix.
            </p>
            {error ? <p className="mt-1.5 text-xs text-status-critical">{error}</p> : null}
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-black/10 p-3.5 dark:border-white/15">
            <input
              type="checkbox"
              checked={hasSolar}
              onChange={(e) => setHasSolar(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-brand-600"
            />
            <span>
              <span className="block text-sm font-medium">I already have solar panels</span>
              <span className="block text-xs text-black/50 dark:text-white/50">
                Boosts your baseline EcoScore and shifts your roadmap toward storage and
                electrification instead of power generation.
              </span>
            </span>
          </label>

          <div className="rounded-lg border border-black/10 p-3.5 dark:border-white/15">
            <label className="mb-2 block text-sm font-medium">What matters most?</label>
            <select
              value={preference}
              onChange={(e) => setPreference(e.target.value as RecommendationPreference)}
              className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-black outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-250 dark:border-white/15 dark:bg-black/20 dark:text-white"
            >
              <option className="bg-white text-black dark:bg-[#111814] dark:text-white" value="savings">
                Highest savings
              </option>
              <option className="bg-white text-black dark:bg-[#111814] dark:text-white" value="budget">
                Lowest upfront cost
              </option>
              <option className="bg-white text-black dark:bg-[#111814] dark:text-white" value="impact">
                Biggest carbon impact
              </option>
              <option className="bg-white text-black dark:bg-[#111814] dark:text-white" value="speed">
                Fastest payoff
              </option>
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              Current monthly bill
              <input
                type="number"
                min={0}
                step="any"
                value={currentBillUSD}
                onChange={(e) => setCurrentBillUSD(e.target.value)}
                onBlur={(e) => normalizeOnBlur(e.target.value, setCurrentBillUSD)}
                className="rounded-lg border border-black/10 px-3 py-2 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-250 dark:border-white/15 dark:bg-black/20"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Target monthly bill
              <input
                type="number"
                min={0}
                step="any"
                value={targetBillUSD}
                onChange={(e) => setTargetBillUSD(e.target.value)}
                onBlur={(e) => normalizeOnBlur(e.target.value, setTargetBillUSD)}
                className="rounded-lg border border-black/10 px-3 py-2 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-250 dark:border-white/15 dark:bg-black/20"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1 text-sm">
            Home type
            <select
              value={homeType}
              onChange={(e) =>
                setHomeType(e.target.value as "house" | "apartment" | "townhouse" | "duplex")
              }
              className="rounded-lg border border-black/10 bg-white px-3 py-2 text-black outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-250 dark:border-white/15 dark:bg-black/20 dark:text-white"
            >
              <option className="bg-white text-black dark:bg-[#111814] dark:text-white" value="house">
                House
              </option>
              <option className="bg-white text-black dark:bg-[#111814] dark:text-white" value="apartment">
                Apartment
              </option>
              <option className="bg-white text-black dark:bg-[#111814] dark:text-white" value="townhouse">
                Townhouse
              </option>
              <option className="bg-white text-black dark:bg-[#111814] dark:text-white" value="duplex">
                Duplex
              </option>
            </select>
          </label>

          <div className="rounded-lg border border-black/10 bg-black/[0.03] p-3 text-sm text-black/60 dark:border-white/15 dark:bg-white/5 dark:text-white/60">
            These details help EcoStep recommend upgrades that actually fit your home and budget.
          </div>

          <Button type="submit" className="w-full">
            Build my roadmap
          </Button>
        </form>
      </Card>
    </div>
  );
}
