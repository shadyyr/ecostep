"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useAppState } from "@/context/AppStateContext";
import { buildSavingsProjection, DEFAULT_RATE_PER_KWH } from "@/utils/progress";
import { SavingsChart } from "@/components/progress/SavingsChart";
import { SuggestionCard } from "@/components/dashboard/SuggestionCard";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const kwhFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

export function ProgressView() {
  const { activeSuggestions, rejectSuggestion, toggleAccepted, parsedBill } = useAppState();

  const acceptedSuggestions = useMemo(
    () => activeSuggestions.filter((s) => s.accepted),
    [activeSuggestions]
  );

  const ratePerKWh = parsedBill?.estimatedRatePerKWh ?? DEFAULT_RATE_PER_KWH;

  const projection = useMemo(
    () => buildSavingsProjection(acceptedSuggestions, ratePerKWh, 24),
    [acceptedSuggestions, ratePerKWh]
  );

  const usdPoints = projection.points.map((p) => ({ month: p.month, value: p.cumulativeUSD }));
  const kwhPoints = projection.points.map((p) => ({ month: p.month, value: p.cumulativeKWh }));

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6">
      <header>
        <Link
          href="/"
          className="text-xs font-medium text-brand-700 underline underline-offset-2 dark:text-brand-250 hover:text-brand-900 dark:hover:text-brand-100"
        >
          ← Back to Dashboard
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-brand-900 dark:text-brand-250">
          Your Progress
        </h1>
        <p className="mt-1 text-sm text-black/50 dark:text-white/50">
          {acceptedSuggestions.length > 0
            ? `Projected impact of your ${acceptedSuggestions.length} accepted ${acceptedSuggestions.length === 1 ? "upgrade" : "upgrades"}.`
            : "Accept an upgrade from your dashboard to start tracking your progress."}
        </p>
      </header>

      <div className="flex flex-col gap-4">
        <SavingsChart
          label="Projected savings"
          tone="good"
          points={usdPoints}
          formatValue={(v) => currency.format(v)}
        />
        <SavingsChart
          label="Energy conserved"
          tone="brand"
          points={kwhPoints}
          formatValue={(v) => `${kwhFormatter.format(v)} kWh`}
        />
        {!parsedBill ? (
          <p className="text-xs text-black/40 dark:text-white/40">
            Energy conserved is estimated using a typical rate of ${DEFAULT_RATE_PER_KWH.toFixed(2)}/kWh.
            Upload your utility bill from the dashboard for a rate based on your actual usage.
          </p>
        ) : null}
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">Accepted Appliances</h2>
        {acceptedSuggestions.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-black/10 p-6 text-center text-sm text-black/50 dark:border-white/15 dark:text-white/50">
            No accepted appliances yet. Accept suggestions from your dashboard to see them here.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {acceptedSuggestions.map((suggestion) => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                onReject={() => rejectSuggestion(suggestion.id)}
                onAccept={() => toggleAccepted(suggestion.id)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
