"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { simulateTargetBill } from "@/utils/calculations";
import { useAppState } from "@/context/AppStateContext";
import type { UserProfile } from "@/types";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

interface TargetBillSimulatorProps {
  profile?: UserProfile | null;
}

function normalizeOnBlur(value: string, setter: (value: string) => void) {
  const parsed = Number(value);
  setter(value.trim() === "" || !Number.isFinite(parsed) ? "0" : String(parsed));
}

export function TargetBillSimulator({ profile }: TargetBillSimulatorProps) {
  const { activeSuggestions } = useAppState();
  const [currentBill, setCurrentBill] = useState(String(profile?.currentBillUSD ?? 100));
  const [targetBill, setTargetBill] = useState(String(profile?.targetBillUSD ?? 75));
  const [syncedProfile, setSyncedProfile] = useState(profile);

  if (profile !== syncedProfile) {
    setSyncedProfile(profile);
    if (profile) {
      if (profile.currentBillUSD !== undefined) setCurrentBill(String(profile.currentBillUSD));
      if (profile.targetBillUSD !== undefined) setTargetBill(String(profile.targetBillUSD));
    }
  }

  const result = useMemo(
    () =>
      simulateTargetBill(
        Number(currentBill) || 0,
        Number(targetBill) || 0,
        activeSuggestions.filter((s) => !s.accepted)
      ),
    [currentBill, targetBill, activeSuggestions]
  );

  return (
    <Card className="flex flex-col gap-4">
      <div>
        <h2 className="text-base font-semibold">Target Bill Simulator</h2>
        <p className="text-xs text-black/50 dark:text-white/50">
          Tell us your goal — we&apos;ll stack the fewest upgrades needed to hit it.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Current monthly bill
          <input
            type="number"
            min={0}
            step="any"
            value={currentBill}
            onChange={(e) => setCurrentBill(e.target.value)}
            onBlur={(e) => normalizeOnBlur(e.target.value, setCurrentBill)}
            className="rounded-lg border border-black/10 px-3 py-2 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-250 dark:border-white/15 dark:bg-black/20"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Target monthly bill
          <input
            type="number"
            min={0}
            step="any"
            value={targetBill}
            onChange={(e) => setTargetBill(e.target.value)}
            onBlur={(e) => normalizeOnBlur(e.target.value, setTargetBill)}
            className="rounded-lg border border-black/10 px-3 py-2 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-250 dark:border-white/15 dark:bg-black/20"
          />
        </label>
      </div>

      {result.requiredMonthlySavingsUSD === 0 ? (
        <StatusBadge tone="good">You&apos;re already at your target.</StatusBadge>
      ) : (
        <>
          <p className="text-sm">
            To shave off <strong>{currency.format(result.requiredMonthlySavingsUSD)}/mo</strong>,
            complete:
          </p>
          <p className="text-xs text-black/50 dark:text-white/50">
            Budget-aware tip: prioritize the highest-impact upgrades that fit within your plan and still leave room for incentives.
          </p>
          <ol className="flex flex-col gap-1.5 text-sm">
            {result.stack.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3">
                <span className="truncate">{s.title}</span>
                <span className="shrink-0 font-medium text-status-good">
                  +{currency.format(s.estimatedMonthlySavingsUSD)}/mo
                </span>
              </li>
            ))}
            {result.stack.length === 0 ? (
              <li className="text-black/50 dark:text-white/50">
                No available suggestions yet — scan an appliance or add one manually.
              </li>
            ) : null}
          </ol>
          {result.isGoalMet ? (
            <StatusBadge tone="good">
              Goal met — {currency.format(result.achievedMonthlySavingsUSD)}/mo achieved
            </StatusBadge>
          ) : (
            <StatusBadge tone="warning">
              Still {currency.format(result.remainingGapUSD)}/mo short — reject fewer
              suggestions or check back after your next scan
            </StatusBadge>
          )}
        </>
      )}
    </Card>
  );
}
