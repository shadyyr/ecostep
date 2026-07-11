"use client";

import { useMemo } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useAppState } from "@/context/AppStateContext";
import { buildSavingsProjection, DEFAULT_RATE_PER_KWH } from "@/utils/progress";
import { SavingsChart } from "@/components/progress/SavingsChart";
import { Card } from "@/components/ui/Card";
import { BrandMark } from "@/components/ui/BrandMark";
import type { Suggestion } from "@/types";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const kwhFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

export function ProgressView() {
  const { activeSuggestions, toggleAccepted, parsedBill } = useAppState();

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
        <div className="mt-2 flex items-center gap-3">
          <BrandMark size="sm" />
          <h1 className="text-xl font-semibold text-brand-900 dark:text-brand-250">
            Your Progress
          </h1>
        </div>
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
            <AnimatePresence initial={false}>
              {acceptedSuggestions.map((suggestion) => (
                <AcceptedProgressCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  onRemove={() => toggleAccepted(suggestion.id)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </section>
    </div>
  );
}

function AcceptedProgressCard({
  suggestion,
  onRemove,
}: {
  suggestion: Suggestion;
  onRemove: () => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
    >
      <Card className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-brand-900 dark:text-brand-150">
            {suggestion.shortName}
          </h3>
          <p className="mt-1 text-sm text-black/60 dark:text-white/60">
            {suggestion.title}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-xs text-black/50 dark:text-white/50">Monthly savings</div>
              <div className="font-medium text-status-good">
                {currency.format(suggestion.estimatedMonthlySavingsUSD)}/mo
              </div>
            </div>
            <div>
              <div className="text-xs text-black/50 dark:text-white/50">Efficiency improvement</div>
              <div className="font-medium text-brand-700 dark:text-brand-250">
                {suggestion.conversionEfficiencyPct}%
              </div>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${suggestion.shortName} from progress`}
          title="Remove from progress"
          className="shrink-0 rounded-full border border-black/10 p-2 text-black/50 transition-colors hover:border-status-critical/40 hover:bg-status-critical/10 hover:text-status-critical dark:border-white/15 dark:text-white/60 dark:hover:border-status-critical/50 dark:hover:bg-status-critical/10 dark:hover:text-status-critical"
        >
          <TrashIcon />
        </button>
      </Card>
    </motion.div>
  );
}

function TrashIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v5" />
      <path d="M14 11v5" />
    </svg>
  );
}
