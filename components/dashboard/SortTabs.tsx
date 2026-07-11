import type { SortMode } from "@/types";
import { SORT_MODE_LABELS } from "@/utils/sorting";

const MODES: SortMode[] = ["priceLowHigh", "efficiencyHighLow", "maxSavings"];

export function SortTabs({
  value,
  onChange,
}: {
  value: SortMode;
  onChange: (mode: SortMode) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Sort suggestions"
      className="flex gap-2 overflow-x-auto pb-1"
    >
      {MODES.map((mode) => {
        const active = mode === value;
        return (
          <button
            key={mode}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(mode)}
            className={`shrink-0 rounded-full px-3.5 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
              active
                ? "bg-brand-100 text-brand-900"
                : "bg-brand-600 text-white hover:bg-brand-900"
            }`}
          >
            {SORT_MODE_LABELS[mode]}
          </button>
        );
      })}
    </div>
  );
}
