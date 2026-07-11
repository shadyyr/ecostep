import { useEffect, useState } from "react";
import type { Suggestion, UserProfile } from "@/types";
import { Card } from "@/components/ui/Card";
import { TierBadge } from "@/components/ui/Badge";
import { Meter } from "@/components/ui/Meter";
import { RejectButton } from "@/components/dashboard/RejectButton";
import { getEffectivePrice } from "@/utils/incentives";
import { getSuggestionInsight } from "@/utils/calculations";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

interface SuggestionCardProps {
  suggestion: Suggestion;
  onReject: (id: string) => void;
  onToggleApplied: (id: string) => void;
  profile?: UserProfile;
  allSuggestions?: Suggestion[];
}

export function SuggestionCard({ suggestion, onReject, onToggleApplied, profile, allSuggestions }: SuggestionCardProps) {
  const effectivePrice = getEffectivePrice(suggestion);
  const totalRebate = suggestion.priceUSD - effectivePrice;
  const insight = profile ? getSuggestionInsight(suggestion, profile, allSuggestions) : null;
  const [isRemoving, setIsRemoving] = useState(false);

  useEffect(() => {
    if (!suggestion.applied) {
      setIsRemoving(false);
    }
  }, [suggestion.applied]);

  function handleToggle() {
    if (!suggestion.applied) {
      setIsRemoving(true);
      window.setTimeout(() => onToggleApplied(suggestion.id), 180);
      return;
    }
    onToggleApplied(suggestion.id);
  }

  return (
    <Card className={`flex flex-col gap-3 transition-all duration-200 ${isRemoving ? "scale-[0.98] opacity-0" : "opacity-100"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="mb-1.5 flex items-center gap-2">
            <TierBadge tier={suggestion.tier} />
            {suggestion.source === "manual" ? (
              <span className="text-xs text-black/40 dark:text-white/40">Manually entered</span>
            ) : null}
          </div>
          <h3 className="text-base leading-snug font-semibold">{suggestion.title}</h3>
        </div>
        <label className="flex shrink-0 cursor-pointer flex-col items-center gap-1 text-xs text-black/50 dark:text-white/50">
          <input
            type="checkbox"
            checked={suggestion.applied}
            onChange={handleToggle}
            className="h-4 w-4 accent-brand-600"
          />
          Done
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-xs text-black/50 dark:text-white/50">Monthly savings</div>
          <div className="font-medium text-status-good">
            {currency.format(suggestion.estimatedMonthlySavingsUSD)}/mo
          </div>
        </div>
        <div>
          <div className="text-xs text-black/50 dark:text-white/50">Cost after incentives</div>
          <div className="font-medium">
            {currency.format(effectivePrice)}
            {totalRebate > 0 ? (
              <span className="ml-1.5 text-xs font-normal text-black/40 line-through dark:text-white/40">
                {currency.format(suggestion.priceUSD)}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <Meter value={suggestion.conversionEfficiencyPct} label="Fossil-footprint reduction" />

      <div className="flex items-center justify-between rounded-lg border border-black/10 bg-black/[0.02] px-3 py-2 text-sm dark:border-white/10 dark:bg-white/[0.04]">
        <span className="text-black/60 dark:text-white/60">Confidence</span>
        <span className="font-medium text-brand-700 dark:text-brand-250">
          {typeof suggestion.confidenceScore === "number"
            ? `${Math.round(suggestion.confidenceScore * 100)}%`
            : "Medium"}
        </span>
      </div>

      {suggestion.appliedIncentives.length > 0 ? (
        <ul className="flex flex-col gap-1 text-xs text-black/60 dark:text-white/60">
          {suggestion.appliedIncentives.map((incentive) => (
            <li key={incentive.incentiveName}>
              🎁 {incentive.incentiveName} — {currency.format(incentive.rebateValueUSD)} (
              {incentive.type})
            </li>
          ))}
        </ul>
      ) : null}

      {suggestion.reason ? (
        <div className="rounded-lg border border-brand-250/40 bg-brand-50/70 px-3 py-2 text-sm text-brand-900 dark:border-brand-250/20 dark:bg-brand-950/35 dark:text-brand-150">
          {suggestion.reason}
        </div>
      ) : null}

      {insight ? (
        <div className="rounded-lg border border-black/10 bg-black/[0.02] px-3 py-2 text-sm text-black/70 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/75">
          {insight}
        </div>
      ) : null}

      <div className="mt-1 flex items-center justify-between gap-2 border-t border-black/5 pt-3 dark:border-white/10">
        <span className="text-xs text-black/40 dark:text-white/40">
          {suggestion.fuelSource} → Electric
        </span>
        <RejectButton onReject={() => onReject(suggestion.id)} />
      </div>
    </Card>
  );
}
