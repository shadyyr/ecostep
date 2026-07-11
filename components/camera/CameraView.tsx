"use client";

import { useEffect, useRef, useState } from "react";
import { useAppState } from "@/context/AppStateContext";
import { submitAudit, type AuditFailureReason } from "@/lib/api-client";
import { auditResultToSuggestion } from "@/utils/calculations";
import { downscaleImage } from "@/utils/image";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { ManualEntryForm } from "@/components/camera/ManualEntryForm";
import type { AuditResult } from "@/types";

type Step =
  | "capture-context"
  | "capture-data"
  | "reviewing"
  | "submitting"
  | "failed"
  | "success"
  | "manual";

const FAILURE_THRESHOLD = 3;

function failureReasonMessage(reason: AuditFailureReason): string {
  switch (reason) {
    case "network":
      return "Couldn't reach the server. Check your connection and try again.";
    case "bad_request":
      return "That photo didn't come through properly. Please retake it.";
    case "server_misconfigured":
      return "Scanning isn't configured yet — use manual entry for now.";
    case "schema_mismatch":
    case "gemini_error":
    default:
      return "We couldn't quite see the text clearly. Please try moving closer or turning on a flashlight.";
  }
}

interface CameraViewProps {
  onClose: () => void;
}

export function CameraView({ onClose }: CameraViewProps) {
  const { profile, addSuggestions } = useAppState();
  const [step, setStep] = useState<Step>("capture-context");
  const [contextBlob, setContextBlob] = useState<Blob | null>(null);
  const [dataBlob, setDataBlob] = useState<Blob | null>(null);
  const [contextPreview, setContextPreview] = useState<string | null>(null);
  const [dataPreview, setDataPreview] = useState<string | null>(null);
  const [consecutiveFailures, setConsecutiveFailures] = useState(0);
  const [lastResult, setLastResult] = useState<AuditResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const contextInputRef = useRef<HTMLInputElement>(null);
  const dataInputRef = useRef<HTMLInputElement>(null);

  useEffect(
    () => () => {
      if (contextPreview) URL.revokeObjectURL(contextPreview);
      if (dataPreview) URL.revokeObjectURL(dataPreview);
    },
    [contextPreview, dataPreview]
  );

  function handleContextFile(file: File | undefined) {
    if (!file) return;
    setContextBlob(file);
    setContextPreview(URL.createObjectURL(file));
    setStep("capture-data");
  }

  function handleDataFile(file: File | undefined) {
    if (!file) return;
    setDataBlob(file);
    setDataPreview(URL.createObjectURL(file));
    setStep("reviewing");
  }

  function skipContext() {
    setStep("capture-data");
  }

  function retakeData() {
    setDataBlob(null);
    setDataPreview(null);
    setStep("capture-data");
  }

  function retakeBoth() {
    setContextBlob(null);
    setContextPreview(null);
    setDataBlob(null);
    setDataPreview(null);
    setStep("capture-context");
  }

  async function analyze() {
    if (!dataBlob) return;
    setStep("submitting");
    setErrorMessage(null);

    const [downscaledContext, downscaledData] = await Promise.all([
      contextBlob ? downscaleImage(contextBlob) : Promise.resolve(undefined),
      downscaleImage(dataBlob),
    ]);

    const result = await submitAudit({
      contextImage: downscaledContext,
      dataImage: downscaledData,
    });

    if (result.ok && result.readable) {
      setConsecutiveFailures(0);
      setLastResult(result.result);
      setStep("success");
      return;
    }

    const nextFailures = consecutiveFailures + 1;
    setConsecutiveFailures(nextFailures);
    setErrorMessage(
      result.ok ? failureReasonMessage("gemini_error") : failureReasonMessage(result.reason)
    );
    setStep(nextFailures >= FAILURE_THRESHOLD ? "manual" : "failed");
  }

  function confirmAndAdd(auditResult: AuditResult, source: "gemini" | "manual") {
    if (!profile) return;
    const suggestion = auditResultToSuggestion(auditResult, profile, source);
    addSuggestions([suggestion]);
    onClose();
  }

  const showManualLink = step !== "submitting" && step !== "manual";

  return (
    <div className="relative flex flex-col gap-4">
      {showManualLink ? (
        <button
          type="button"
          onClick={() => setStep("manual")}
          className="fixed right-4 bottom-20 z-50 rounded-full bg-brand-900 px-4 py-2.5 text-sm font-medium text-white shadow-lg sm:absolute sm:right-0 sm:bottom-auto sm:-top-1"
        >
          Input Details Manually
        </button>
      ) : null}

      {step === "capture-context" ? (
        <CaptureStep
          title="Step 1 of 2: Context shot"
          hint="Frame the whole appliance and the space around it. This helps us judge installation constraints."
          buttonLabel="Take Context Photo"
          onFile={handleContextFile}
          inputRef={contextInputRef}
          secondaryAction={{ label: "Skip this photo", onClick: skipContext }}
        />
      ) : null}

      {step === "capture-data" ? (
        <CaptureStep
          title="Step 2 of 2: Data plate shot"
          hint="Align the silver text plate inside this box. Hold steady for clear text."
          buttonLabel="Take Data Plate Photo"
          onFile={handleDataFile}
          inputRef={dataInputRef}
        />
      ) : null}

      {step === "reviewing" ? (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            {contextPreview ? (
              <PreviewThumb src={contextPreview} label="Context" />
            ) : (
              <div className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-black/15 text-xs text-black/40 dark:border-white/20 dark:text-white/40">
                Skipped
              </div>
            )}
            {dataPreview ? <PreviewThumb src={dataPreview} label="Data plate" /> : null}
          </div>
          <div className="flex gap-2">
            <Button onClick={analyze} className="flex-1">
              Analyze
            </Button>
            <Button variant="secondary" onClick={retakeBoth}>
              Retake
            </Button>
          </div>
        </div>
      ) : null}

      {step === "submitting" ? (
        <div className="flex flex-col items-center gap-3 py-10">
          <Spinner />
          <p className="text-sm text-black/60 dark:text-white/60">
            Reading the label with Gemini…
          </p>
        </div>
      ) : null}

      {step === "failed" ? (
        <div className="flex flex-col gap-4">
          <StatusBadge tone="warning">{errorMessage}</StatusBadge>
          <p className="text-xs text-black/50 dark:text-white/50">
            Attempt {consecutiveFailures} of {FAILURE_THRESHOLD}
          </p>
          <div className="flex gap-2">
            <Button onClick={retakeData} className="flex-1">
              Retake Data Photo
            </Button>
            <Button variant="secondary" onClick={retakeBoth}>
              Retake Both
            </Button>
          </div>
        </div>
      ) : null}

      {step === "success" && lastResult ? (
        <div className="flex flex-col gap-4">
          <StatusBadge tone="good">Got it — here&apos;s what we found</StatusBadge>
          <dl className="grid grid-cols-2 gap-3 rounded-xl bg-brand-100/60 p-4 text-sm dark:bg-white/5">
            <div>
              <dt className="text-xs text-black/50 dark:text-white/50">Category</dt>
              <dd className="font-medium">{lastResult.detectedCategory}</dd>
            </div>
            <div>
              <dt className="text-xs text-black/50 dark:text-white/50">Fuel source</dt>
              <dd className="font-medium">{lastResult.fuelSource}</dd>
            </div>
            <div>
              <dt className="text-xs text-black/50 dark:text-white/50">Brand</dt>
              <dd className="font-medium">{lastResult.brand || "Not Found"}</dd>
            </div>
            <div>
              <dt className="text-xs text-black/50 dark:text-white/50">Est. monthly savings</dt>
              <dd className="font-medium text-status-good">
                ${lastResult.estimatedMonthlySavingsUSD}/mo
              </dd>
            </div>
          </dl>
          <div className="flex gap-2">
            <Button onClick={() => confirmAndAdd(lastResult, "gemini")} className="flex-1">
              Add to Roadmap
            </Button>
            <Button variant="secondary" onClick={retakeBoth}>
              Scan Another
            </Button>
          </div>
        </div>
      ) : null}

      {step === "manual" ? (
        <ManualEntryForm
          onSubmit={(result) => confirmAndAdd(result, "manual")}
          onCancel={onClose}
        />
      ) : null}
    </div>
  );
}

function CaptureStep({
  title,
  hint,
  buttonLabel,
  onFile,
  inputRef,
  secondaryAction,
}: {
  title: string;
  hint: string;
  buttonLabel: string;
  onFile: (file: File | undefined) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  secondaryAction?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs font-medium tracking-wide text-black/50 uppercase dark:text-white/50">
        {title}
      </p>
      <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl bg-black/5 dark:bg-white/5">
        <div className="m-6 flex h-2/3 w-2/3 items-center justify-center rounded-lg border-2 border-dashed border-brand-400">
          <p className="px-4 text-center text-xs text-brand-900 dark:text-brand-250">{hint}</p>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0])}
      />
      <Button onClick={() => inputRef.current?.click()}>{buttonLabel}</Button>
      {secondaryAction ? (
        <button
          type="button"
          onClick={secondaryAction.onClick}
          className="text-sm text-black/50 underline underline-offset-2 dark:text-white/50"
        >
          {secondaryAction.label}
        </button>
      ) : null}
    </div>
  );
}

function PreviewThumb({ src, label }: { src: string; label: string }) {
  return (
    <div className="flex flex-col gap-1">
      {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview, not worth next/image's optimization pipeline */}
      <img src={src} alt={label} className="aspect-square rounded-xl object-cover" />
      <span className="text-center text-xs text-black/50 dark:text-white/50">{label}</span>
    </div>
  );
}
