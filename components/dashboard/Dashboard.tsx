"use client";

import { useMemo, useState } from "react";
import { useAppState } from "@/context/AppStateContext";
import { calculateEcoScore, calculatePotentialEcoScore } from "@/utils/calculations";
import { sortSuggestions } from "@/utils/sorting";
import type { SortMode } from "@/types";
import { EcoScoreDisplay } from "@/components/dashboard/EcoScoreDisplay";
import { SortTabs } from "@/components/dashboard/SortTabs";
import { SuggestionCard } from "@/components/dashboard/SuggestionCard";
import { TargetBillSimulator } from "@/components/dashboard/TargetBillSimulator";
import { CameraView } from "@/components/camera/CameraView";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

export function Dashboard() {
  const { profile, activeSuggestions, rejectSuggestion, toggleAccepted, resetAll } =
    useAppState();
  const [sortMode, setSortMode] = useState<SortMode>("recommended");
  const [cameraOpen, setCameraOpen] = useState(false);

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
    () => activeSuggestions.filter((s) => !s.accepted),
    [activeSuggestions]
  );

  const acceptedSuggestions = useMemo(
    () => activeSuggestions.filter((s) => s.accepted),
    [activeSuggestions]
  );

  const sorted = useMemo(
    () => sortSuggestions(uploadedSuggestions, sortMode),
    [uploadedSuggestions, sortMode]
  );

  if (!profile) return null;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-brand-900 dark:text-brand-250">
            Your EcoStep Roadmap
          </h1>
          <p className="text-sm text-black/50 dark:text-white/50">Zip {profile.zipCode}</p>
        </div>
        <Button onClick={() => setCameraOpen(true)}>Scan an Appliance</Button>
      </header>

      {ecoScore ? (
        <EcoScoreDisplay
          breakdown={ecoScore}
          potentialScore={potentialEcoScore?.score ?? ecoScore.score}
        />
      ) : null}

      <TargetBillSimulator />

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Recommended Appliances</h2>
          <span className="text-xs text-black/50 dark:text-white/50">
            {sorted.length} to review
          </span>
        </div>
        <SortTabs value={sortMode} onChange={setSortMode} />
        <div className="flex flex-col gap-3">
          {sorted.map((suggestion) => (
            <SuggestionCard
              key={suggestion.id}
              suggestion={suggestion}
              onReject={rejectSuggestion}
              onAccept={toggleAccepted}
            />
          ))}
          {sorted.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-black/10 p-6 text-center text-sm text-black/50 dark:border-white/15 dark:text-white/50">
              No appliances to review. Scan an appliance to get started.
            </p>
          ) : null}
        </div>
      </section>

      {acceptedSuggestions.length > 0 ? (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Accepted Appliances</h2>
            <span className="text-xs text-black/50 dark:text-white/50">
              {acceptedSuggestions.length} accepted
            </span>
          </div>
          <div className="flex flex-col gap-3">
            {acceptedSuggestions.map((suggestion) => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                onReject={rejectSuggestion}
                onAccept={toggleAccepted}
              />
            ))}
          </div>
        </section>
      ) : null}

      <Modal open={cameraOpen} onClose={() => setCameraOpen(false)} title="Scan an Appliance">
        <CameraView onClose={() => setCameraOpen(false)} />
      </Modal>

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
