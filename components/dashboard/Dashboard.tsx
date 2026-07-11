"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence } from "motion/react";
import { useAppState } from "@/context/AppStateContext";
import {
  calculateEcoScore,
  calculatePotentialEcoScore,
  getPersonalizedNextAction,
} from "@/utils/calculations";
import { analyzeIncentives } from "@/lib/intelligence/incentiveIntelligence";
import { simulateAffordability } from "@/lib/intelligence/affordability";
import { sortSuggestionsForProfile } from "@/utils/sorting";
import type { SortMode } from "@/types";
import { EcoScoreDisplay } from "@/components/dashboard/EcoScoreDisplay";
import { SortTabs } from "@/components/dashboard/SortTabs";
import { SuggestionCard } from "@/components/dashboard/SuggestionCard";
import { TargetBillSimulator } from "@/components/dashboard/TargetBillSimulator";
import { CameraView } from "@/components/camera/CameraView";
import { BillScanView } from "@/components/billscan/BillScanView";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { AccountMenu } from "@/components/auth/AccountMenu";
import { Settings } from "@/components/dashboard/Settings";
import { BrandMark } from "@/components/ui/BrandMark";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function Dashboard() {
  const {
    profile,
    suggestions,
    activeSuggestions,
    rejectSuggestion,
    restoreSuggestion,
    restoreRejectedSuggestions,
    toggleAccepted,
    resetAll,
    parsedBill,
    setUtilityBill,
    setProfile,
  } = useAppState();
  const [sortMode, setSortMode] = useState<SortMode>("recommended");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [billScanOpen, setBillScanOpen] = useState(false);

  function handleReset() {
    if (window.confirm("Reset EcoStep? This clears your profile and roadmap.")) {
      resetAll();
    }
  }

  const ecoScore = useMemo(
    () => (profile ? calculateEcoScore(profile, activeSuggestions) : null),
    [profile, activeSuggestions]
  );

  const potentialEcoScore = useMemo(
    () => (profile ? calculatePotentialEcoScore(profile, activeSuggestions) : null),
    [profile, activeSuggestions]
  );

  const uploadedSuggestions = useMemo(
    () => activeSuggestions.filter((s) => s.source === "gemini" || s.source === "manual"),
    [activeSuggestions]
  );

  const rejectedSuggestions = useMemo(
    () => suggestions.filter((s) => s.rejected),
    [suggestions]
  );

  const recommendedSuggestions = useMemo(
    () => activeSuggestions.filter((s) => s.source === "mock" && !s.accepted),
    [activeSuggestions]
  );

  const sorted = useMemo(
    () =>
      profile
        ? sortSuggestionsForProfile(recommendedSuggestions, profile, sortMode, profile.targetBillUSD)
        : recommendedSuggestions,
    [recommendedSuggestions, profile, sortMode]
  );

  const roadmapSteps = useMemo(() => {
    return sorted.slice(0, 3).map((suggestion, index) => ({
      step: index + 1,
      suggestion,
      label: index === 0 ? "Start here" : index === 1 ? "Next step" : "Then",
      kind: suggestion.priceUSD <= 1000 ? "Quick win" : "Bigger investment",
    }));
  }, [sorted]);

  const nextAction = useMemo(
    () => (profile ? getPersonalizedNextAction(activeSuggestions, profile, profile.targetBillUSD) : null),
    [activeSuggestions, profile]
  );

  const nextActionAnchorId = nextAction ? `suggestion-${nextAction.id}` : null;
  const nextActionIsVisible = nextAction
    ? sorted.some((suggestion) => suggestion.id === nextAction.id)
    : false;
  const nextActionAlreadyUploaded = nextAction
    ? uploadedSuggestions.some(
        (suggestion) =>
          suggestion.id === nextAction.id || suggestion.category === nextAction.category
      )
    : false;

  const incentiveInsightById = useMemo(() => {
    if (!profile) return new Map();
    const { insights } = analyzeIncentives({ profile, suggestions: activeSuggestions });
    return new Map(insights.map((insight) => [insight.suggestionId, insight]));
  }, [profile, activeSuggestions]);

  const affordability = useMemo(
    () =>
      profile
        ? simulateAffordability({
            profile,
            suggestions: activeSuggestions,
            parsedBill: parsedBill ?? undefined,
          })
        : null,
    [profile, activeSuggestions, parsedBill]
  );

  const affordabilityById = useMemo(
    () => new Map((affordability?.scenarios ?? []).map((scenario) => [scenario.suggestionId, scenario])),
    [affordability]
  );

  const completedSteps = activeSuggestions.filter((suggestion) => suggestion.accepted).length;
  const totalPlannedSteps = Math.max(1, activeSuggestions.filter((suggestion) => !suggestion.rejected).length);
  const roadmapSavings = roadmapSteps.reduce(
    (sum, step) => sum + step.suggestion.estimatedMonthlySavingsUSD,
    0
  );
  const roadmapCost = roadmapSteps.reduce((sum, step) => sum + step.suggestion.priceUSD, 0);
  const progressPercent = Math.min(100, Math.round((completedSteps / Math.max(1, totalPlannedSteps)) * 100));

  if (!profile) return null;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6">
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <BrandMark size="md" variant="plain" priority />
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-brand-900 dark:text-brand-250">
              Your EcoStep Roadmap
            </h1>
            <p className="text-sm text-black/50 dark:text-white/50">Zip {profile.zipCode}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex gap-2">
            <Link
              href="/progress"
              className="text-xs font-medium text-brand-700 underline underline-offset-2 dark:text-brand-250 hover:text-brand-900 dark:hover:text-brand-100"
            >
              📈 View Progress
            </Link>
            <button
              onClick={() => setSettingsOpen(true)}
              className="text-xs font-medium text-brand-700 underline underline-offset-2 dark:text-brand-250 hover:text-brand-900 dark:hover:text-brand-100"
            >
              ⚙️ Settings
            </button>
            <AccountMenu />
          </div>
          <Button onClick={() => setCameraOpen(true)}>Scan an Appliance</Button>
        </div>
      </header>

      {ecoScore ? (
        <EcoScoreDisplay
          breakdown={ecoScore}
          potentialScore={potentialEcoScore?.score ?? ecoScore.score}
        />
      ) : null}

      <section className="rounded-2xl border border-black/10 p-4 dark:border-white/15">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-black/10 bg-black/[0.02] p-4 dark:border-white/15 dark:bg-white/[0.04]">
            <p className="text-xs uppercase tracking-wide text-black/40 dark:text-white/40">Current bill</p>
            <p className="mt-1 text-lg font-semibold">{currency.format(profile.currentBillUSD ?? 0)}</p>
          </div>
          <div className="rounded-xl border border-black/10 bg-black/[0.02] p-4 dark:border-white/15 dark:bg-white/[0.04]">
            <p className="text-xs uppercase tracking-wide text-black/40 dark:text-white/40">Target bill</p>
            <p className="mt-1 text-lg font-semibold">{currency.format(profile.targetBillUSD ?? 0)}</p>
          </div>
          <div className="rounded-xl border border-black/10 bg-black/[0.02] p-4 dark:border-white/15 dark:bg-white/[0.04]">
            <p className="text-xs uppercase tracking-wide text-black/40 dark:text-white/40">Home type</p>
            <p className="mt-1 text-sm capitalize text-black/70 dark:text-white/70">
              {profile.homeType ?? "House"}
            </p>
          </div>
        </div>
        <p className="mt-3 text-sm text-black/60 dark:text-white/60">
          These settings help EcoStep recommend upgrades tailored to your home type and budget.
        </p>
      </section>

      <section className="rounded-2xl border border-black/10 p-4 dark:border-white/15">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Utility bill</h2>
            <p className="mt-1 text-sm text-black/60 dark:text-white/60">
              {parsedBill
                ? "Suggestion cards below now factor in your real electric rate."
                : "Upload a bill for money-wise verdicts grounded in your real rate, not a generic estimate."}
            </p>
          </div>
          <Button onClick={() => setBillScanOpen(true)}>
            {parsedBill ? "Update Bill" : "Upload Utility Bill"}
          </Button>
        </div>

        {parsedBill ? (
          <div className="mt-3 flex flex-col gap-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-black/10 bg-black/[0.02] p-3 dark:border-white/15 dark:bg-white/[0.04]">
                <p className="text-xs uppercase tracking-wide text-black/40 dark:text-white/40">Provider</p>
                <p className="mt-1 text-sm font-semibold">{parsedBill.providerName ?? "Unknown"}</p>
              </div>
              <div className="rounded-xl border border-black/10 bg-black/[0.02] p-3 dark:border-white/15 dark:bg-white/[0.04]">
                <p className="text-xs uppercase tracking-wide text-black/40 dark:text-white/40">Total due</p>
                <p className="mt-1 text-sm font-semibold">
                  {parsedBill.totalDueUSD !== null ? currency.format(parsedBill.totalDueUSD) : "Unknown"}
                </p>
              </div>
              <div className="rounded-xl border border-black/10 bg-black/[0.02] p-3 dark:border-white/15 dark:bg-white/[0.04]">
                <p className="text-xs uppercase tracking-wide text-black/40 dark:text-white/40">Est. rate</p>
                <p className="mt-1 text-sm font-semibold">
                  {parsedBill.estimatedRatePerKWh !== null
                    ? `$${parsedBill.estimatedRatePerKWh.toFixed(3)}/kWh`
                    : "Unknown"}
                </p>
              </div>
            </div>

            {affordability ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-brand-250/40 bg-brand-100/70 p-3 text-sm text-brand-900 dark:border-brand-250/20 dark:bg-brand-900/35 dark:text-brand-250">
                  <p className="text-xs uppercase tracking-wide opacity-70">Recommended stack net impact</p>
                  <p className="mt-1 text-lg font-semibold">
                    {currency.format(affordability.portfolioMonthlyNetUSD)}/mo
                  </p>
                </div>
                <div className="rounded-xl border border-brand-250/40 bg-brand-100/70 p-3 text-sm text-brand-900 dark:border-brand-250/20 dark:bg-brand-900/35 dark:text-brand-250">
                  <p className="text-xs uppercase tracking-wide opacity-70">First-year cashflow</p>
                  <p className="mt-1 text-lg font-semibold">
                    {currency.format(affordability.portfolioFirstYearCashflowUSD)}
                  </p>
                </div>
              </div>
            ) : null}

            {parsedBill.warnings.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                {parsedBill.warnings.map((warning) => (
                  <StatusBadge key={warning} tone="warning">
                    {warning}
                  </StatusBadge>
                ))}
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => setUtilityBill(null)}
              className="w-fit text-xs text-black/40 underline underline-offset-2 hover:text-black/60 dark:text-white/40 dark:hover:text-white/60"
            >
              Remove bill
            </button>
          </div>
        ) : null}
      </section>

      <TargetBillSimulator profile={profile} />

      <section className="rounded-2xl border border-black/10 p-4 dark:border-white/15">
        <h2 className="text-base font-semibold">Step-by-step roadmap</h2>
        <p className="mt-1 text-sm text-black/60 dark:text-white/60">
          Follow this short sequence to make steady progress toward your target bill.
        </p>

        {nextAction ? (
          <div className="mt-3 rounded-xl border border-brand-250/40 bg-brand-100/70 p-3 text-sm text-brand-900 dark:border-brand-250/20 dark:bg-brand-900/35 dark:text-brand-250">
            <p className="font-semibold">
              Best next action:{" "}
              {nextActionIsVisible && nextActionAnchorId ? (
                <Link
                  href={`#${nextActionAnchorId}`}
                  className="underline underline-offset-2 hover:text-brand-600 dark:hover:text-brand-250"
                >
                  {nextAction.title}
                </Link>
              ) : (
                nextAction.title
              )}
            </p>
            <p className="mt-1 text-xs text-black/60 dark:text-white/60">
              {nextActionIsVisible
                ? "Jump to the matching item in the list below to review it."
                : nextActionAlreadyUploaded
                  ? "You already have this appliance in your uploaded appliances."
                  : "This is the upgrade most likely to move your home closer to your target bill and preferences."}
            </p>
          </div>
        ) : null}

        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl border border-black/10 bg-black/[0.02] p-3 dark:border-white/10 dark:bg-white/[0.04]">
            <p className="text-xs uppercase tracking-wide text-black/40 dark:text-white/40">Roadmap savings</p>
            <p className="mt-1 text-lg font-semibold">{currency.format(roadmapSavings)}/mo</p>
          </div>
          <div className="rounded-xl border border-black/10 bg-black/[0.02] p-3 dark:border-white/10 dark:bg-white/[0.04]">
            <p className="text-xs uppercase tracking-wide text-black/40 dark:text-white/40">Estimated cost</p>
            <p className="mt-1 text-lg font-semibold">{currency.format(roadmapCost)}</p>
          </div>
          <div className="rounded-xl border border-black/10 bg-black/[0.02] p-3 dark:border-white/10 dark:bg-white/[0.04]">
            <p className="text-xs uppercase tracking-wide text-black/40 dark:text-white/40">Progress</p>
            <p className="mt-1 text-lg font-semibold">{progressPercent}%</p>
          </div>
        </div>

        <div className="mt-3 h-2 rounded-full bg-black/5 dark:bg-white/10">
          <div className="h-2 rounded-full bg-brand-600" style={{ width: `${progressPercent}%` }} />
        </div>
        <p className="mt-2 text-xs text-black/50 dark:text-white/50">
          You are {progressPercent}% of the way through your current plan. Accepting a suggestion updates
          your momentum.
        </p>

        <div className="mt-3 flex flex-col gap-2">
          {roadmapSteps.length > 0 ? (
            roadmapSteps.map((step) => (
              <div
                key={step.suggestion.id}
                className="rounded-xl border border-black/10 bg-black/[0.02] p-3 dark:border-white/10 dark:bg-white/[0.04]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-250">
                      {step.label}
                    </p>
                    <p className="text-sm font-medium">{step.suggestion.title}</p>
                    <p className="text-xs text-black/45 dark:text-white/45">{step.kind}</p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-status-good">
                    +{currency.format(step.suggestion.estimatedMonthlySavingsUSD)}/mo
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-black/50 dark:text-white/50">
              Add a scan or a manual suggestion to unlock your roadmap.
            </p>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Recommended Appliances</h2>
          <span className="text-xs text-black/50 dark:text-white/50">
            {sorted.length} to review
          </span>
        </div>
        <SortTabs value={sortMode} onChange={setSortMode} />
        <div className="flex flex-col gap-3">
          <AnimatePresence initial={false}>
            {sorted.map((suggestion) => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                onReject={rejectSuggestion}
                onAccept={toggleAccepted}
                profile={profile}
                allSuggestions={activeSuggestions}
                incentiveInsight={incentiveInsightById.get(suggestion.id)}
                affordabilityScenario={affordabilityById.get(suggestion.id)}
                anchorId={`suggestion-${suggestion.id}`}
              />
            ))}
          </AnimatePresence>
          {sorted.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-black/10 p-6 text-center text-sm text-black/50 dark:border-white/15 dark:text-white/50">
              No appliances to review. Scan an appliance to get started.
            </p>
          ) : null}
        </div>
      </section>

      <Modal open={cameraOpen} onClose={() => setCameraOpen(false)} title="Scan an Appliance">
        <CameraView onClose={() => setCameraOpen(false)} />
      </Modal>

      <Modal open={billScanOpen} onClose={() => setBillScanOpen(false)} title="Upload Utility Bill">
        <BillScanView onClose={() => setBillScanOpen(false)} />
      </Modal>

      <Settings
        key={`${profile.zipCode}-${profile.currentBillUSD ?? 0}-${profile.targetBillUSD ?? 0}-${profile.homeType ?? "house"}-${profile.preference}-${profile.hasSolar ? 1 : 0}`}
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        profile={profile}
        uploadedSuggestions={uploadedSuggestions}
        rejectedSuggestions={rejectedSuggestions}
        onRejectSuggestion={rejectSuggestion}
        onRestoreSuggestion={restoreSuggestion}
        onRestoreRejectedSuggestions={restoreRejectedSuggestions}
        onUpdateProfile={setProfile}
      />

      <footer className="pt-2 pb-6 text-center">
        <button
          type="button"
          onClick={handleReset}
          className="text-xs text-black/40 underline underline-offset-2 hover:text-black/60 dark:text-white/40 dark:hover:text-white/60"
        >
          Reset Demo
        </button>
      </footer>
    </div>
  );
}
