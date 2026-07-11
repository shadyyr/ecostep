"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import type { UtilityBillParseInput } from "@/types";

interface BillFieldsFormProps {
  initialValues?: UtilityBillParseInput;
  description?: string;
  submitLabel?: string;
  onSubmit: (fields: UtilityBillParseInput) => void;
  onCancel: () => void;
}

function toInputValue(value: number | undefined): string {
  return value === undefined || value === null ? "" : String(value);
}

function toOptionalNumber(value: string): number | undefined {
  if (value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function BillFieldsForm({
  initialValues,
  description,
  submitLabel = "Save bill details",
  onSubmit,
  onCancel,
}: BillFieldsFormProps) {
  const [providerName, setProviderName] = useState(initialValues?.providerName ?? "");
  const [billingDays, setBillingDays] = useState(toInputValue(initialValues?.billingDays));
  const [totalDueUSD, setTotalDueUSD] = useState(toInputValue(initialValues?.totalDueUSD));
  const [electricityKWh, setElectricityKWh] = useState(toInputValue(initialValues?.electricityKWh));
  const [gasTherms, setGasTherms] = useState(toInputValue(initialValues?.gasTherms));
  const [ratePlan, setRatePlan] = useState(initialValues?.ratePlan ?? "");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit({
      providerName: providerName.trim() || undefined,
      billingDays: toOptionalNumber(billingDays),
      totalDueUSD: toOptionalNumber(totalDueUSD),
      electricityKWh: toOptionalNumber(electricityKWh),
      gasTherms: toOptionalNumber(gasTherms),
      ratePlan: ratePlan.trim() || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {description ? <p className="text-sm text-black/60 dark:text-white/60">{description}</p> : null}

      <label className="flex flex-col gap-1 text-sm font-medium">
        Utility provider
        <input
          type="text"
          value={providerName}
          onChange={(e) => setProviderName(e.target.value)}
          placeholder="e.g., Seattle City Light"
          className="rounded-lg border border-black/10 px-3 py-2.5 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-250 dark:border-white/15 dark:bg-black/20"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Total amount due ($)
          <input
            type="number"
            min={0}
            step="any"
            value={totalDueUSD}
            onChange={(e) => setTotalDueUSD(e.target.value)}
            className="rounded-lg border border-black/10 px-3 py-2.5 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-250 dark:border-white/15 dark:bg-black/20"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Billing period (days)
          <input
            type="number"
            min={0}
            step="any"
            value={billingDays}
            onChange={(e) => setBillingDays(e.target.value)}
            className="rounded-lg border border-black/10 px-3 py-2.5 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-250 dark:border-white/15 dark:bg-black/20"
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Electricity usage (kWh)
          <input
            type="number"
            min={0}
            step="any"
            value={electricityKWh}
            onChange={(e) => setElectricityKWh(e.target.value)}
            className="rounded-lg border border-black/10 px-3 py-2.5 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-250 dark:border-white/15 dark:bg-black/20"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Gas usage (therms)
          <input
            type="number"
            min={0}
            step="any"
            value={gasTherms}
            onChange={(e) => setGasTherms(e.target.value)}
            className="rounded-lg border border-black/10 px-3 py-2.5 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-250 dark:border-white/15 dark:bg-black/20"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Rate plan
        <input
          type="text"
          value={ratePlan}
          onChange={(e) => setRatePlan(e.target.value)}
          placeholder="e.g., Time-of-Use, Tiered"
          className="rounded-lg border border-black/10 px-3 py-2.5 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-250 dark:border-white/15 dark:bg-black/20"
        />
      </label>

      <div className="mt-2 flex gap-2">
        <Button type="submit" className="flex-1">
          {submitLabel}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
