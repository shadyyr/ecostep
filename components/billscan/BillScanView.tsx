"use client";

import { useEffect, useRef, useState } from "react";
import { useAppState } from "@/context/AppStateContext";
import { submitUtilityBillScan, type AuditError } from "@/lib/api-client";
import { downscaleImage } from "@/utils/image";
import { parseUtilityBill } from "@/lib/intelligence/utilityBill";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { BillFieldsForm } from "@/components/billscan/BillFieldsForm";
import type { ParsedUtilityBill, UtilityBillParseInput } from "@/types";

type Step = "capture" | "reviewing-file" | "submitting" | "form";

function toParseInput(bill: ParsedUtilityBill): UtilityBillParseInput {
  return {
    providerName: bill.providerName ?? undefined,
    billingDays: bill.billingDays ?? undefined,
    totalDueUSD: bill.totalDueUSD ?? undefined,
    electricityKWh: bill.electricityKWh ?? undefined,
    gasTherms: bill.gasTherms ?? undefined,
    demandKW: bill.demandKW ?? undefined,
    fixedChargesUSD: bill.fixedChargesUSD ?? undefined,
    variableChargesUSD: bill.variableChargesUSD ?? undefined,
    ratePlan: bill.ratePlan ?? undefined,
  };
}

interface BillScanViewProps {
  onClose: () => void;
}

export function BillScanView({ onClose }: BillScanViewProps) {
  const { profile, setProfile, setUtilityBill } = useAppState();
  const [step, setStep] = useState<Step>("capture");
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [scanError, setScanError] = useState<AuditError | null>(null);
  const [scanWarnings, setScanWarnings] = useState<string[]>([]);
  const [extractedFields, setExtractedFields] = useState<UtilityBillParseInput | undefined>(undefined);
  const [rawExtraction, setRawExtraction] = useState<UtilityBillParseInput | null>(null);
  const [syncBill, setSyncBill] = useState(true);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  useEffect(
    () => () => {
      if (filePreview) URL.revokeObjectURL(filePreview);
    },
    [filePreview]
  );

  const isImage = file ? file.type.startsWith("image/") : false;

  function handleFile(selected: File | undefined) {
    if (!selected) return;
    setFile(selected);
    setFilePreview(selected.type.startsWith("image/") ? URL.createObjectURL(selected) : null);
    setStep("reviewing-file");
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    handleFile(e.target.files?.[0]);
    e.currentTarget.value = "";
  }

  function retake() {
    setFile(null);
    setFilePreview(null);
    setStep("capture");
  }

  function skipToManual() {
    setExtractedFields(undefined);
    setRawExtraction(null);
    setScanError(null);
    setScanWarnings([]);
    setStep("form");
  }

  async function scan() {
    if (!file) return;
    setStep("submitting");
    setScanError(null);

    const uploadFile = isImage ? await downscaleImage(file) : file;
    const result = await submitUtilityBillScan(uploadFile);

    if (result.ok) {
      const parsedInput = toParseInput(result.result);
      setRawExtraction(parsedInput);
      setExtractedFields(parsedInput);
      setScanWarnings(result.result.warnings);
      setStep("form");
      return;
    }

    setScanError(result.error);
    setExtractedFields(undefined);
    setRawExtraction(null);
    setScanWarnings([]);
    setStep("form");
  }

  function confirm(fields: UtilityBillParseInput) {
    const merged: UtilityBillParseInput = { ...(rawExtraction ?? {}), ...fields };
    const finalBill: ParsedUtilityBill = parseUtilityBill(merged);
    setUtilityBill(finalBill);
    if (syncBill && profile && finalBill.totalDueUSD !== null) {
      setProfile({ ...profile, currentBillUSD: finalBill.totalDueUSD });
    }
    onClose();
  }

  return (
    <div className="flex flex-col gap-4">
      {step === "capture" ? (
        <div className="flex flex-col gap-4">
          <p className="text-xs font-medium tracking-wide text-black/50 uppercase dark:text-white/50">
            Upload your utility bill
          </p>
          <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl bg-black/5 dark:bg-white/5">
            <p className="px-6 text-center text-xs text-black/50 dark:text-white/50">
              Take a photo, or upload a photo/PDF of your electric or gas bill&apos;s summary page.
            </p>
          </div>
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleInputChange}
          />
          <input
            ref={uploadInputRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={handleInputChange}
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <Button onClick={() => cameraInputRef.current?.click()}>Take Photo</Button>
            <Button variant="secondary" onClick={() => uploadInputRef.current?.click()}>
              Upload Photo or PDF
            </Button>
          </div>
          <button
            type="button"
            onClick={skipToManual}
            className="text-sm text-black/50 underline underline-offset-2 dark:text-white/50"
          >
            Enter details manually instead
          </button>
        </div>
      ) : null}

      {step === "reviewing-file" && file ? (
        <div className="flex flex-col gap-4">
          {isImage && filePreview ? (
            // eslint-disable-next-line @next/next/no-img-element -- local object URL preview, not worth next/image's optimization pipeline
            <img
              src={filePreview}
              alt="Bill preview"
              className="max-h-72 w-full rounded-xl bg-black/5 object-contain dark:bg-white/5"
            />
          ) : (
            <div className="flex items-center gap-3 rounded-xl border border-black/10 bg-black/[0.02] p-4 dark:border-white/15 dark:bg-white/[0.04]">
              <span className="text-2xl">📄</span>
              <span className="text-sm break-all">{file.name}</span>
            </div>
          )}
          <div className="flex gap-2">
            <Button onClick={scan} className="flex-1">
              Scan with Gemini
            </Button>
            <Button variant="secondary" onClick={retake}>
              Retake
            </Button>
          </div>
        </div>
      ) : null}

      {step === "submitting" ? (
        <div className="flex flex-col items-center gap-3 py-10">
          <Spinner />
          <p className="text-sm text-black/60 dark:text-white/60">Reading your bill with Gemini…</p>
        </div>
      ) : null}

      {step === "form" ? (
        <div className="flex flex-col gap-4">
          {scanError ? <StatusBadge tone="warning">{scanError.userMessage}</StatusBadge> : null}
          {scanError ? (
            <div className="rounded-lg border border-status-warning/20 bg-status-warning/10 p-3 text-sm">
              <p className="font-semibold text-black dark:text-white">Why the scan failed</p>
              <p className="mt-1 whitespace-pre-wrap text-xs text-black/70 dark:text-white/70">
                {scanError.technicalDetails}
              </p>
              <p className="mt-3 font-semibold text-black dark:text-white">What to try next</p>
              <p className="mt-1 text-xs text-black/70 dark:text-white/70">
                {scanError.suggestion}
              </p>
            </div>
          ) : null}
          {!scanError && scanWarnings.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              {scanWarnings.map((warning) => (
                <StatusBadge key={warning} tone="warning">
                  {warning}
                </StatusBadge>
              ))}
            </div>
          ) : null}
          {profile ? (
            <label className="flex items-center gap-2 text-xs text-black/60 dark:text-white/60">
              <input
                type="checkbox"
                checked={syncBill}
                onChange={(e) => setSyncBill(e.target.checked)}
              />
              Also update my current monthly bill in my profile to match
            </label>
          ) : null}
          <BillFieldsForm
            initialValues={extractedFields}
            description={
              extractedFields
                ? "Here's what we read from your bill — check the numbers and fix anything that looks off."
                : "Enter your bill details and we'll use them to sharpen your savings estimates."
            }
            submitLabel="Save bill details"
            onSubmit={confirm}
            onCancel={onClose}
          />
        </div>
      ) : null}
    </div>
  );
}
