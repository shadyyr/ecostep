"use client";

import { useEffect, useRef, useState } from "react";
import { useAppState } from "@/context/AppStateContext";
import { submitAudit, type AuditError, getErrorExplanation } from "@/lib/api-client";
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
  const [lastError, setLastError] = useState<AuditError | null>(null);
  const [showDebugInfo, setShowDebugInfo] = useState(false);

  const contextCameraInputRef = useRef<HTMLInputElement>(null);
  const contextUploadInputRef = useRef<HTMLInputElement>(null);
  const dataCameraInputRef = useRef<HTMLInputElement>(null);
  const dataUploadInputRef = useRef<HTMLInputElement>(null);

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
    setLastError(null);

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
    setLastError(result.ok ? getErrorExplanation("gemini_error") : result.error);
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
          uploadButtonLabel="Upload Context Photo"
          onFile={handleContextFile}
          cameraInputRef={contextCameraInputRef}
          uploadInputRef={contextUploadInputRef}
          secondaryAction={{ label: "Skip this photo", onClick: skipContext }}
        />
      ) : null}

      {step === "capture-data" ? (
        <CaptureStep
          title="Step 2 of 2: Data plate shot"
          hint="Align the silver text plate inside this box. Hold steady for clear text."
          buttonLabel="Take Data Plate Photo"
          uploadButtonLabel="Upload Data Plate Photo"
          onFile={handleDataFile}
          cameraInputRef={dataCameraInputRef}
          uploadInputRef={dataUploadInputRef}
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

      {step === "failed" && lastError ? (
        <div className="flex flex-col gap-4">
          <StatusBadge tone="warning">{lastError.userMessage}</StatusBadge>
          
          <div className="rounded-lg bg-status-warning/10 p-4 border border-status-warning/20">
            <p className="text-sm text-black dark:text-white mb-3">
              {lastError.suggestion}
            </p>
            
            <button
              type="button"
              onClick={() => setShowDebugInfo(!showDebugInfo)}
              className="text-xs text-black/50 hover:text-black/70 dark:text-white/50 dark:hover:text-white/70 underline"
            >
              {showDebugInfo ? "Hide" : "Show"} technical details
            </button>
            
            {showDebugInfo ? (
              <div className="mt-3 text-xs font-mono bg-black/5 dark:bg-white/5 p-3 rounded text-black/70 dark:text-white/70 overflow-auto max-h-48 space-y-2 break-words">
                <div>
                  <strong>Error:</strong> {lastError.reason}
                </div>
                <div>
                  <strong>Why:</strong> {lastError.technicalDetails}
                </div>
                <div>
                  <strong>Attempt:</strong> {consecutiveFailures} of {FAILURE_THRESHOLD}
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <Button onClick={retakeData} className="w-full">
              Retake or Upload Data Photo
            </Button>
            <Button variant="secondary" onClick={retakeBoth} className="w-full">
              Retake or Upload Both Photos
            </Button>
            <Button variant="ghost" onClick={() => setStep("manual")} className="w-full">
              Use Manual Entry Instead
            </Button>
          </div>
        </div>
      ) : null}

      {step === "success" && lastResult ? (
        <div className="flex flex-col gap-4">
          <StatusBadge tone="good">Got it — here&apos;s what we found</StatusBadge>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 rounded-xl bg-brand-100/60 p-4 text-sm dark:bg-white/5">
            <div>
              <dt className="text-xs text-black/50 dark:text-white/50 mb-1">Category</dt>
              <dd className="font-medium">{lastResult.detectedCategory}</dd>
            </div>
            <div>
              <dt className="text-xs text-black/50 dark:text-white/50 mb-1">Fuel source</dt>
              <dd className="font-medium">{lastResult.fuelSource}</dd>
            </div>
            <div>
              <dt className="text-xs text-black/50 dark:text-white/50 mb-1">Brand</dt>
              <dd className="font-medium">{lastResult.brand || "Not Found"}</dd>
            </div>
            <div>
              <dt className="text-xs text-black/50 dark:text-white/50 mb-1">Est. monthly savings</dt>
              <dd className="font-medium text-status-good">
                ${lastResult.estimatedMonthlySavingsUSD}/mo
              </dd>
            </div>
          </dl>
          <div className="flex flex-col gap-2">
            <Button onClick={() => confirmAndAdd(lastResult, "gemini")} className="w-full">
              Add to Roadmap
            </Button>
            <Button variant="secondary" onClick={retakeBoth} className="w-full">
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
  uploadButtonLabel,
  onFile,
  cameraInputRef,
  uploadInputRef,
  secondaryAction,
}: {
  title: string;
  hint: string;
  buttonLabel: string;
  uploadButtonLabel: string;
  onFile: (file: File | undefined) => void;
  cameraInputRef: React.RefObject<HTMLInputElement | null>;
  uploadInputRef: React.RefObject<HTMLInputElement | null>;
  secondaryAction?: { label: string; onClick: () => void };
}) {
  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    onFile(e.target.files?.[0]);
    e.currentTarget.value = "";
  }

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
        accept="image/*"
        className="hidden"
        onChange={handleInputChange}
      />
      <div className="grid gap-2 sm:grid-cols-2">
        <Button onClick={() => cameraInputRef.current?.click()}>{buttonLabel}</Button>
        <Button variant="secondary" onClick={() => uploadInputRef.current?.click()}>
          {uploadButtonLabel}
        </Button>
      </div>
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
