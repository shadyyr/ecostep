"use client";

import { useState } from "react";
import type { Suggestion } from "@/types";
import { useTheme } from "@/context/ThemeContext";
import { Modal } from "@/components/ui/Modal";
import { SuggestionCard } from "@/components/dashboard/SuggestionCard";

interface SettingsProps {
  open: boolean;
  onClose: () => void;
  uploadedSuggestions: Suggestion[];
  acceptedSuggestions: Suggestion[];
  onRejectSuggestion: (id: string) => void;
  onToggleAccepted: (id: string) => void;
}

type SettingsTab = "display" | "uploaded" | "accepted";

export function Settings({
  open,
  onClose,
  uploadedSuggestions,
  acceptedSuggestions,
  onRejectSuggestion,
  onToggleAccepted,
}: SettingsProps) {
  const { colorScheme, setColorScheme } = useTheme();
  const [activeTab, setActiveTab] = useState<SettingsTab>("display");

  const tabs: Array<{ id: SettingsTab; label: string; count?: number }> = [
    { id: "display", label: "Display" },
    { id: "uploaded", label: "Uploaded Appliances", count: uploadedSuggestions.length },
    { id: "accepted", label: "Accepted Appliances", count: acceptedSuggestions.length },
  ];

  return (
    <Modal open={open} onClose={onClose} title="Settings">
      <div className="flex flex-col gap-4">
        {/* Tabs */}
        <div role="tablist" aria-label="Settings tabs" className="flex gap-2 border-b border-black/10 dark:border-white/10">
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

          {activeTab === "uploaded" && (
            <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto">
              {uploadedSuggestions.length === 0 ? (
                <p className="text-sm text-black/50 dark:text-white/50">
                  No uploaded appliances yet. Scan an appliance to get started.
                </p>
              ) : (
                uploadedSuggestions.map((suggestion) => (
                  <SuggestionCard
                    key={suggestion.id}
                    suggestion={suggestion}
                    onReject={() => onRejectSuggestion(suggestion.id)}
                    onAccept={() => onToggleAccepted(suggestion.id)}
                  />
                ))
              )}
            </div>
          )}

          {activeTab === "accepted" && (
            <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto">
              {acceptedSuggestions.length === 0 ? (
                <p className="text-sm text-black/50 dark:text-white/50">
                  No accepted appliances yet. Accept suggestions to see them here.
                </p>
              ) : (
                acceptedSuggestions.map((suggestion) => (
                  <SuggestionCard
                    key={suggestion.id}
                    suggestion={suggestion}
                    onReject={() => onRejectSuggestion(suggestion.id)}
                    onAccept={() => onToggleAccepted(suggestion.id)}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
