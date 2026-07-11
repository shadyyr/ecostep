"use client";

import { useState } from "react";
import type { RecommendationPreference, Suggestion, UserProfile } from "@/types";
import { useTheme } from "@/context/ThemeContext";
import { Modal } from "@/components/ui/Modal";

interface SettingsProps {
  open: boolean;
  onClose: () => void;
  profile: UserProfile;
  uploadedSuggestions: Suggestion[];
  rejectedSuggestions: Suggestion[];
  counterpartSuggestions: Suggestion[];
  onDeleteSuggestion: (id: string) => void;
  onUpdateProfile: (profile: UserProfile) => void;
}

type SettingsTab = "display" | "homeProfile" | "uploaded" | "rejected";

export function Settings({
  open,
  onClose,
  profile,
  uploadedSuggestions,
  rejectedSuggestions,
  counterpartSuggestions,
  onDeleteSuggestion,
  onUpdateProfile,
}: SettingsProps) {
  const { colorScheme, setColorScheme } = useTheme();
  const [activeTab, setActiveTab] = useState<SettingsTab>("display");
  const [zipCode, setZipCode] = useState(profile.zipCode);
  const [hasSolar, setHasSolar] = useState(profile.hasSolar);
  const [preference, setPreference] = useState<RecommendationPreference>(profile.preference);
  const [currentBillUSD, setCurrentBillUSD] = useState(profile.currentBillUSD ?? 0);
  const [targetBillUSD, setTargetBillUSD] = useState(profile.targetBillUSD ?? 0);
  const [homeSizeSqft, setHomeSizeSqft] = useState(profile.homeSizeSqft ?? 0);
  const [homeType, setHomeType] = useState<UserProfile["homeType"]>(profile.homeType ?? "house");
  const [applianceAgeYears, setApplianceAgeYears] = useState(profile.applianceAgeYears ?? 0);

  function getCounterpart(uploaded: Suggestion): Suggestion | null {
    const uploadedCategory = uploaded.category.trim().toLowerCase();
    const exactMatch = counterpartSuggestions.find(
      (candidate) => candidate.category.trim().toLowerCase() === uploadedCategory
    );
    if (exactMatch) return exactMatch;

    return (
      counterpartSuggestions.find(
        (candidate) =>
          candidate.shortName.trim().toLowerCase() === uploaded.shortName.trim().toLowerCase()
      ) ?? null
    );
  }

  function renderTrashRow(suggestion: Suggestion, subtitle: string) {
    return (
      <div
        key={suggestion.id}
        className="flex items-center justify-between gap-3 rounded-xl border border-black/25 bg-black/[0.04] px-3 py-2 dark:border-white/20 dark:bg-white/[0.06]"
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-brand-900 dark:text-brand-150">
            {suggestion.shortName}
          </p>
          <p className="text-xs text-black/80 dark:text-white/80">{subtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => onDeleteSuggestion(suggestion.id)}
          aria-label={`Delete ${suggestion.shortName}`}
          className="rounded-md border border-black/30 px-2 py-1 text-sm text-black/90 transition-colors hover:bg-black/10 hover:text-status-danger dark:border-white/20 dark:text-white/85 dark:hover:bg-white/10 dark:hover:text-status-danger"
        >
          🗑️
        </button>
      </div>
    );
  }

  const tabs: Array<{ id: SettingsTab; label: string; count?: number }> = [
    { id: "display", label: "Display" },
    { id: "homeProfile", label: "Home Profile" },
    { id: "uploaded", label: "Uploaded Appliances", count: uploadedSuggestions.length },
    { id: "rejected", label: "Rejected Appliances", count: rejectedSuggestions.length },
  ];

  return (
    <Modal open={open} onClose={onClose} title="Settings">
      <div className="flex flex-col gap-4">
        <div
          role="tablist"
          aria-label="Settings tabs"
          className="flex flex-wrap gap-2 border-b border-black/20 pb-2 dark:border-white/20"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-lg border px-2.5 py-1.5 text-sm font-semibold transition-colors ${
                activeTab === tab.id
                  ? "border-brand-600 bg-brand-600 text-white dark:border-brand-250 dark:bg-brand-250 dark:text-black"
                  : "border-black/20 text-black/90 hover:bg-black/10 dark:border-white/20 dark:text-white/85 dark:hover:bg-white/10"
              }`}
            >
              {tab.label}
              {tab.count !== undefined && <span className="ml-2 text-xs">({tab.count})</span>}
            </button>
          ))}
        </div>

        <div className="min-h-[200px]">
          {activeTab === "display" && (
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-sm font-semibold text-black dark:text-white">Color Scheme</label>
                <p className="mb-3 text-xs text-black/85 dark:text-white/80">
                  Choose how the app should look
                </p>
                <div className="flex gap-2">
                  {(["light", "dark", "system"] as const).map((scheme) => (
                    <button
                      key={scheme}
                      onClick={() => setColorScheme(scheme)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        colorScheme === scheme
                          ? "bg-brand-600 text-white dark:bg-brand-250 dark:text-black"
                          : "border border-black/30 bg-black/10 text-black hover:bg-black/15 dark:border-white/20 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
                      }`}
                    >
                      {scheme === "light" && "☀️ Light"}
                      {scheme === "dark" && "🌙 Dark"}
                      {scheme === "system" && "💻 System"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "homeProfile" && (
            <div className="rounded-xl border border-black/25 bg-black/[0.04] p-3 dark:border-white/20 dark:bg-white/[0.06]">
              <h3 className="text-sm font-semibold text-black dark:text-white">Home Profile</h3>
              <p className="mt-1 text-xs text-black/85 dark:text-white/80">
                Update your home details to improve recommendations.
              </p>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm text-black dark:text-white">
                  Zip code
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={5}
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value.replace(/\D/g, ""))}
                    className="rounded-lg border border-black/35 bg-white px-3 py-2 text-sm text-black outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-250 dark:border-white/25 dark:bg-black/20 dark:text-white"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm text-black dark:text-white">
                  Home type
                  <select
                    value={homeType}
                    onChange={(e) =>
                      setHomeType(e.target.value as "house" | "apartment" | "townhouse" | "duplex")
                    }
                    className="rounded-lg border border-black/35 bg-white px-3 py-2 text-sm text-black outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-250 dark:border-white/25 dark:bg-black/20 dark:text-white"
                  >
                    <option value="house">House</option>
                    <option value="apartment">Apartment</option>
                    <option value="townhouse">Townhouse</option>
                    <option value="duplex">Duplex</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-sm text-black dark:text-white">
                  Current monthly bill
                  <input
                    type="number"
                    min={0}
                    value={currentBillUSD}
                    onChange={(e) => setCurrentBillUSD(Number(e.target.value) || 0)}
                    className="rounded-lg border border-black/35 bg-white px-3 py-2 text-sm text-black outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-250 dark:border-white/25 dark:bg-black/20 dark:text-white"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm text-black dark:text-white">
                  Target monthly bill
                  <input
                    type="number"
                    min={0}
                    value={targetBillUSD}
                    onChange={(e) => setTargetBillUSD(Number(e.target.value) || 0)}
                    className="rounded-lg border border-black/35 bg-white px-3 py-2 text-sm text-black outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-250 dark:border-white/25 dark:bg-black/20 dark:text-white"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm text-black dark:text-white">
                  Home size (sqft)
                  <input
                    type="number"
                    min={0}
                    value={homeSizeSqft}
                    onChange={(e) => setHomeSizeSqft(Number(e.target.value) || 0)}
                    className="rounded-lg border border-black/35 bg-white px-3 py-2 text-sm text-black outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-250 dark:border-white/25 dark:bg-black/20 dark:text-white"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm text-black dark:text-white">
                  Appliance age (years)
                  <input
                    type="number"
                    min={0}
                    value={applianceAgeYears}
                    onChange={(e) => setApplianceAgeYears(Number(e.target.value) || 0)}
                    className="rounded-lg border border-black/35 bg-white px-3 py-2 text-sm text-black outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-250 dark:border-white/25 dark:bg-black/20 dark:text-white"
                  />
                </label>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm text-black dark:text-white">
                  Recommendation priority
                  <select
                    value={preference}
                    onChange={(e) => setPreference(e.target.value as RecommendationPreference)}
                    className="rounded-lg border border-black/35 bg-white px-3 py-2 text-sm text-black outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-250 dark:border-white/25 dark:bg-black/20 dark:text-white"
                  >
                    <option value="savings">Highest savings</option>
                    <option value="budget">Lowest upfront cost</option>
                    <option value="impact">Biggest carbon impact</option>
                    <option value="speed">Fastest payoff</option>
                  </select>
                </label>
                <label className="mt-6 flex items-center gap-2 text-sm font-medium text-black dark:text-white sm:mt-0">
                  <input
                    type="checkbox"
                    checked={hasSolar}
                    onChange={(e) => setHasSolar(e.target.checked)}
                    className="h-4 w-4 accent-brand-600"
                  />
                  I already have solar
                </label>
              </div>

              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() =>
                    onUpdateProfile({
                      ...profile,
                      zipCode,
                      hasSolar,
                      preference,
                      currentBillUSD,
                      targetBillUSD,
                      homeSizeSqft,
                      homeType,
                      applianceAgeYears,
                    })
                  }
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-900"
                >
                  Save Home Profile
                </button>
              </div>
            </div>
          )}

          {activeTab === "uploaded" && (
            <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto">
              {uploadedSuggestions.length === 0 ? (
                <p className="text-sm text-black/85 dark:text-white/80">
                  No uploaded appliances yet. Scan an appliance to get started.
                </p>
              ) : (
                uploadedSuggestions.map((suggestion) => (
                  <div
                    key={suggestion.id}
                    className="grid grid-cols-1 gap-2 rounded-xl border border-black/25 bg-black/[0.04] px-3 py-2 sm:grid-cols-[1fr_1fr_auto] sm:items-center sm:gap-3 dark:border-white/20 dark:bg-white/[0.06]"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-black/85 dark:text-white/80">
                        Uploaded
                      </p>
                      <p className="truncate text-sm font-semibold text-brand-900 dark:text-brand-150">
                        {suggestion.shortName}
                      </p>
                      <p className="text-xs text-black/80 dark:text-white/80">
                        {suggestion.source === "manual" ? "Manually entered" : "Scanned"}
                      </p>
                    </div>
                    <div className="min-w-0 rounded-lg border border-brand-250/55 bg-brand-50/90 px-2.5 py-2 dark:border-brand-250/30 dark:bg-brand-950/30">
                      <p className="text-xs font-semibold uppercase tracking-wide text-black/85 dark:text-white/80">
                        Eco-friendly counterpart
                      </p>
                      {getCounterpart(suggestion) ? (
                        <>
                          <p className="truncate text-sm font-semibold text-brand-900 dark:text-brand-150">
                            {getCounterpart(suggestion)?.shortName}
                          </p>
                          <p className="text-xs text-black/80 dark:text-white/80">
                            Potential savings: {`$${getCounterpart(suggestion)?.estimatedMonthlySavingsUSD ?? 0}/mo`}
                          </p>
                        </>
                      ) : (
                        <p className="text-xs text-black/80 dark:text-white/80">No counterpart yet</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => onDeleteSuggestion(suggestion.id)}
                      aria-label={`Delete ${suggestion.shortName}`}
                      className="justify-self-end rounded-md border border-black/30 px-2 py-1 text-sm text-black/90 transition-colors hover:bg-black/10 hover:text-status-danger dark:border-white/20 dark:text-white/85 dark:hover:bg-white/10 dark:hover:text-status-danger"
                    >
                      🗑️
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "rejected" && (
            <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto">
              {rejectedSuggestions.length === 0 ? (
                <p className="text-sm text-black/85 dark:text-white/80">No rejected appliances yet.</p>
              ) : (
                rejectedSuggestions.map((suggestion) =>
                  renderTrashRow(suggestion, "Rejected appliance")
                )
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
