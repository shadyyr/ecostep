"use client";

import { useState, type FormEvent } from "react";
import {
  APPLIANCE_CATEGORY_OPTIONS,
  APPROXIMATE_AGE_OPTIONS,
  FUEL_TYPE_OPTIONS,
  estimateManualSavings,
} from "@/data/roadmapConfig";
import { Button } from "@/components/ui/Button";
import type { AuditResult } from "@/types";

const AGE_BUCKET_YEARS: Record<string, number> = {
  "0-5 years": 3,
  "6-10 years": 8,
  "11-15 years": 13,
  "16-20 years": 18,
  "20+ years": 25,
};

interface ManualEntryFormProps {
  onSubmit: (result: AuditResult) => void;
  onCancel: () => void;
}

export function ManualEntryForm({ onSubmit, onCancel }: ManualEntryFormProps) {
  const [category, setCategory] = useState<string>(APPLIANCE_CATEGORY_OPTIONS[0]);
  const [fuelSource, setFuelSource] = useState<string>(FUEL_TYPE_OPTIONS[0]);
  const [age, setAge] = useState<string>(APPROXIMATE_AGE_OPTIONS[0]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const result: AuditResult = {
      detectedCategory: category,
      brand: "Not Found",
      modelNumber: "Not Found",
      fuelSource,
      estimatedAgeYears: AGE_BUCKET_YEARS[age] ?? 10,
      electricalDrawAmps: 0,
      estimatedMonthlySavingsUSD: estimateManualSavings(category, fuelSource),
      confidenceScore: 1,
    };
    onSubmit(result);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <p className="text-sm text-black/60 dark:text-white/60">
        No worries — tell us a bit about the appliance and we&apos;ll estimate its impact.
      </p>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Appliance category
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg border border-black/10 px-3 py-2.5 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-250 dark:border-white/15 dark:bg-black/20"
        >
          {APPLIANCE_CATEGORY_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Fuel type
        <select
          value={fuelSource}
          onChange={(e) => setFuelSource(e.target.value)}
          className="rounded-lg border border-black/10 px-3 py-2.5 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-250 dark:border-white/15 dark:bg-black/20"
        >
          {FUEL_TYPE_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Approximate age
        <select
          value={age}
          onChange={(e) => setAge(e.target.value)}
          className="rounded-lg border border-black/10 px-3 py-2.5 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-250 dark:border-white/15 dark:bg-black/20"
        >
          {APPROXIMATE_AGE_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </label>

      <div className="mt-2 flex gap-2">
        <Button type="submit" className="flex-1">
          Add to roadmap
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
