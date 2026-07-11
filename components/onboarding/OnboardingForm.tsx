"use client";

import { useState, type FormEvent } from "react";
import { useAppState } from "@/context/AppStateContext";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const ZIP_PATTERN = /^\d{5}$/;

export function OnboardingForm() {
  const { setProfile } = useAppState();
  const [zipCode, setZipCode] = useState("");
  const [hasSolar, setHasSolar] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!ZIP_PATTERN.test(zipCode)) {
      setError("Enter a valid 5-digit zip code.");
      return;
    }
    setError(null);
    setProfile({ zipCode, hasSolar });
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

          <Button type="submit" className="w-full">
            Build my roadmap
          </Button>
        </form>
      </Card>
    </div>
  );
}
