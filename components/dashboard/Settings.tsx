"use client";

import { useState } from "react";
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
  onRejectSuggestion: (id: string) => void;
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
  onRejectSuggestion,
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

  const tabs: Array<{ id: SettingsTab; label: string; count?: number }> = [
    { id: "display", label: "Display" },
    { id: "homeProfile", label: "Home Profile" },
    { id: "uploaded", label: "Uploaded Appliances", count: uploadedSuggestions.length },
    { id: "rejected", label: "Rejected", count: rejectedSuggestions.length },
  ];

  return (
    <Modal open={open} onClose={onClose} title="Settings">
      <div className="flex flex-col gap-4">
        {/* Tabs */}
        <div role="tablist" aria-label="Settings tabs" className="flex flex-wrap gap-2 border-b border-black/10 dark:border-white/10">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2 text-sm font-medium transition-colors border-b-2 ${
                activeTab === tab.id
                  ? "border-brand-600 text-brand-600 dark:border-brand-250 dark:text-brand-250"
                  : "border-transparent text-black/50 dark:text-white/50 hover:text-black/70 dark:hover:text-white/70"
              }`}
            >
              {tab.label}
              {tab.count !== undefined && <span className="ml-2 text-xs">({tab.count})</span>}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="min-h-[200px]">
          {activeTab === "display" && (
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-sm font-medium">Color Scheme</label>
                <p className="text-xs text-black/50 dark:text-white/50 mb-3">
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
                          : "bg-black/5 text-black hover:bg-black/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
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
                    <option value="house">House</option>
                    <option value="apartment">Apartment</option>
                    <option value="townhouse">Townhouse</option>
                    <option value="duplex">Duplex</option>
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
                    <option value="savings">Highest savings</option>
                    <option value="budget">Lowest upfront cost</option>
                    <option value="impact">Biggest carbon impact</option>
                    <option value="speed">Fastest payoff</option>
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
                <p className="text-sm text-black/50 dark:text-white/50">
                  No uploaded appliances yet. Scan an appliance to get started.
                </p>
              ) : (
                uploadedSuggestions.map((suggestion) => (
                  <div
                    key={suggestion.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-black/10 bg-black/[0.02] px-3 py-2 dark:border-white/10 dark:bg-white/[0.04]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-brand-900 dark:text-brand-150">
                        {suggestion.shortName}
                      </p>
                      <p className="text-xs text-black/45 dark:text-white/45">
                        {suggestion.source === "manual" ? "Manually entered" : "Scanned"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRejectSuggestion(suggestion.id)}
                      aria-label={`Delete ${suggestion.shortName}`}
                      className="rounded-md border border-black/10 px-2 py-1 text-sm text-black/60 transition-colors hover:bg-black/5 hover:text-status-danger dark:border-white/15 dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-status-danger"
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
                  {rejectedSuggestions.map((suggestion) => (
                    <div
                      key={suggestion.id}
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
                      <button
                        type="button"
                        onClick={() => onRestoreSuggestion(suggestion.id)}
                        className="shrink-0 rounded-md border border-black/10 px-2 py-1 text-sm text-black/60 transition-colors hover:bg-black/5 hover:text-status-good dark:border-white/15 dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-status-good"
                      >
                        Restore
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
