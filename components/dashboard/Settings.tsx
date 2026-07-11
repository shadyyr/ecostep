"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { RecommendationPreference, Suggestion, UserProfile } from "@/types";
import { useTheme } from "@/context/ThemeContext";
import { Modal } from "@/components/ui/Modal";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

interface SettingsProps {
  open: boolean;
  onClose: () => void;
  profile: UserProfile;
  uploadedSuggestions: Suggestion[];
  rejectedSuggestions: Suggestion[];
  counterpartSuggestions: Suggestion[];
  onDeleteSuggestion: (id: string) => void;
  onRestoreSuggestion: (id: string) => void;
  onRestoreRejectedSuggestions: () => void;
  onUpdateProfile: (profile: UserProfile) => void;
}

type SettingsTab = "display" | "homeProfile" | "uploaded" | "rejected";

function normalizeOnBlur(value: string, setter: (value: string) => void) {
  const parsed = Number(value);
  setter(value.trim() === "" || !Number.isFinite(parsed) ? "0" : String(parsed));
}

export function Settings({
  open,
  onClose,
  profile,
  uploadedSuggestions,
  rejectedSuggestions,
  counterpartSuggestions,
  onDeleteSuggestion,
  onRestoreSuggestion,
  onRestoreRejectedSuggestions,
  onUpdateProfile,
}: SettingsProps) {
  const { colorScheme, setColorScheme } = useTheme();
  const [activeTab, setActiveTab] = useState<SettingsTab>("display");
  const [zipCode, setZipCode] = useState(profile.zipCode);
  const [hasSolar, setHasSolar] = useState(profile.hasSolar);
  const [preference, setPreference] = useState<RecommendationPreference>(profile.preference);
  const [currentBillUSD, setCurrentBillUSD] = useState(String(profile.currentBillUSD ?? 0));
  const [targetBillUSD, setTargetBillUSD] = useState(String(profile.targetBillUSD ?? 0));
  const [homeType, setHomeType] = useState<UserProfile["homeType"]>(profile.homeType ?? "house");

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

  const tabs: Array<{ id: SettingsTab; label: string; count?: number }> = [
    { id: "display", label: "Display" },
    { id: "homeProfile", label: "Home Profile" },
    { id: "uploaded", label: "Uploaded Appliances", count: uploadedSuggestions.length },
    { id: "rejected", label: "Rejected", count: rejectedSuggestions.length },
  ];

  return (
    <Modal open={open} onClose={onClose} title="Settings">
      <div className="flex flex-col gap-4">
        <div
          role="tablist"
          aria-label="Settings tabs"
          className="flex flex-wrap gap-2 border-b border-black/10 dark:border-white/10"
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
            <div className="rounded-xl border border-black/10 bg-black/[0.02] p-3 dark:border-white/10 dark:bg-white/[0.04]">
              <h3 className="text-sm font-semibold">Home Profile</h3>
              <p className="mt-1 text-xs text-black/50 dark:text-white/50">
                Update your details to improve recommendations.
              </p>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm">
                  Zip code
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={5}
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value.replace(/\D/g, ""))}
                    className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-black outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-250 dark:border-white/15 dark:bg-black/20 dark:text-white"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  Home type
                  <select
                    value={homeType}
                    onChange={(e) =>
                      setHomeType(e.target.value as "house" | "apartment" | "townhouse" | "duplex")
                    }
                    className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-black outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-250 dark:border-white/15 dark:bg-black/20 dark:text-white"
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
                <label className="flex flex-col gap-1 text-sm">
                  Current monthly bill
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={currentBillUSD}
                    onChange={(e) => setCurrentBillUSD(e.target.value)}
                    onBlur={(e) => normalizeOnBlur(e.target.value, setCurrentBillUSD)}
                    className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-black outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-250 dark:border-white/15 dark:bg-black/20 dark:text-white"
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
                    className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-black outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-250 dark:border-white/15 dark:bg-black/20 dark:text-white"
                  />
                </label>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm">
                  Recommendation priority
                  <select
                    value={preference}
                    onChange={(e) => setPreference(e.target.value as RecommendationPreference)}
                    className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm text-black outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-250 dark:border-white/15 dark:bg-black/20 dark:text-white"
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
                </label>
                <label className="mt-6 flex items-center gap-2 text-sm font-medium sm:mt-0">
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
                      currentBillUSD: Number(currentBillUSD) || 0,
                      targetBillUSD: Number(targetBillUSD) || 0,
                      homeType,
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
                <AnimatePresence initial={false}>
                  {uploadedSuggestions.map((suggestion) => (
                    <motion.div
                      key={suggestion.id}
                      layout
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ duration: 0.22, ease: "easeOut" }}
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
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          )}

          {activeTab === "rejected" && (
            <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto">
              {rejectedSuggestions.length === 0 ? (
                <p className="text-sm text-black/50 dark:text-white/50">
                  No rejected appliances right now.
                </p>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={onRestoreRejectedSuggestions}
                    className="w-fit rounded-full bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-900"
                  >
                    Restore all rejected appliances
                  </button>
                  <AnimatePresence initial={false}>
                    {rejectedSuggestions.map((suggestion) => (
                      <motion.div
                        key={suggestion.id}
                        layout
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.96 }}
                        transition={{ duration: 0.22, ease: "easeOut" }}
                        className="flex items-center justify-between gap-3 rounded-xl border border-black/10 bg-black/[0.02] px-3 py-2 dark:border-white/10 dark:bg-white/[0.04]"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-brand-900 dark:text-brand-150">
                            {suggestion.shortName}
                          </p>
                          <p className="text-xs text-black/45 dark:text-white/45">
                            {suggestion.category} • {currency.format(suggestion.estimatedMonthlySavingsUSD)}/mo
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <button
                            type="button"
                            onClick={() => onRestoreSuggestion(suggestion.id)}
                            className="rounded-md border border-black/10 px-2 py-1 text-sm text-black/60 transition-colors hover:bg-black/5 hover:text-status-good dark:border-white/15 dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-status-good"
                          >
                            Restore
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteSuggestion(suggestion.id)}
                            aria-label={`Delete ${suggestion.shortName}`}
                            className="rounded-md border border-black/10 px-2 py-1 text-sm text-black/60 transition-colors hover:bg-black/5 hover:text-status-danger dark:border-white/15 dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-status-danger"
                          >
                            🗑️
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
