import type { ReactNode } from "react";
import type { Tier } from "@/types";

// Tiers are ordinal, not categorical — each reuses a discrete step of the same
// brand ramp rather than three unrelated hues, per the app's meter/ramp color system.
const TIER_CLASSES: Record<Tier, string> = {
  1: "bg-brand-100 text-brand-900",
  2: "bg-brand-250 text-brand-900",
  3: "bg-brand-600 text-white",
};

export function TierBadge({ tier }: { tier: Tier }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${TIER_CLASSES[tier]}`}
    >
      Tier {tier}
    </span>
  );
}

type StatusTone = "good" | "warning" | "critical";

const STATUS_CLASSES: Record<StatusTone, string> = {
  good: "bg-status-good/10 text-status-good",
  warning: "bg-status-warning/15 text-[#8a5a00]",
  critical: "bg-status-critical/10 text-status-critical",
};

const STATUS_ICON: Record<StatusTone, string> = {
  good: "✓",
  warning: "⚠",
  critical: "✕",
};

export function StatusBadge({ tone, children }: { tone: StatusTone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ${STATUS_CLASSES[tone]}`}
    >
      <span aria-hidden="true">{STATUS_ICON[tone]}</span>
      {children}
    </span>
  );
}
