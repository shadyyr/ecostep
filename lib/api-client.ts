import type { AuditResult, ParsedUtilityBill } from "@/types";

export type AuditFailureReason =
  | "network"
  | "bad_request"
  | "schema_mismatch"
  | "gemini_error"
  | "server_misconfigured"
  | "gemini_api_key_invalid"
  | "gemini_rate_limited"
  | "image_unreadable"
  | "timeout";

export interface AuditError {
  reason: AuditFailureReason;
  userMessage: string;
  technicalDetails: string;
  suggestion: string;
}

export type AuditApiResult =
  | { ok: true; result: AuditResult; readable: boolean }
  | { ok: false; error: AuditError };

export function getErrorExplanation(
  reason: AuditFailureReason,
  context: "appliance" | "bill" = "appliance"
): AuditError {
  const isBill = context === "bill";
  const explanations: Record<AuditFailureReason, AuditError> = {
    network: {
      reason: "network",
      userMessage: "Connection problem — couldn't reach the server.",
      technicalDetails: `Failed to fetch /api/${isBill ? "utility-bill/scan" : "audit"}. Check internet connection and CORS settings.`,
      suggestion: "Check your WiFi/internet connection and try again.",
    },
    bad_request: {
      reason: "bad_request",
      userMessage: isBill ? "File wasn't received properly." : "Photo wasn't received properly.",
      technicalDetails: `Server rejected the request: missing or malformed form data. ${isBill ? "File" : "Image"} may be corrupted or too large (max 8MB).`,
      suggestion: isBill
        ? "Make sure the file is a valid image or PDF and try again."
        : "Make sure the photo is a valid image file and retake the photo.",
    },
    server_misconfigured: {
      reason: "server_misconfigured",
      userMessage: "Gemini API isn't set up yet.",
      technicalDetails: "Environment variable GEMINI_API_KEY is missing or set to placeholder value.",
      suggestion: "Add a valid Gemini API key to .env.local and restart the server.",
    },
    gemini_api_key_invalid: {
      reason: "gemini_api_key_invalid",
      userMessage: "Invalid API key — scanning not available.",
      technicalDetails: "Gemini API rejected the request with an authentication error (401/403).",
      suggestion: "Check that GEMINI_API_KEY in .env.local is correct and hasn't expired.",
    },
    gemini_rate_limited: {
      reason: "gemini_rate_limited",
      userMessage: "Too many requests — Gemini API is rate limited.",
      technicalDetails: "Gemini API returned 429 Too Many Requests. You've exceeded the API quota.",
      suggestion: "Wait a few minutes and try again, or upgrade your Gemini API plan.",
    },
    image_unreadable: {
      reason: "image_unreadable",
      userMessage: isBill ? "Couldn't read the numbers on the bill." : "Couldn't read the text on the label.",
      technicalDetails: `Gemini confidence score below threshold. ${isBill ? "Bill" : "Text in image"} was too blurry, small, or obscured.`,
      suggestion: isBill
        ? "Try a clearer photo or PDF, or fill in the numbers manually."
        : "Try moving closer, improving lighting, or using a flashlight to make the text more legible.",
    },
    schema_mismatch: {
      reason: "schema_mismatch",
      userMessage: "Extracted data didn't match expected format.",
      technicalDetails: `Gemini returned data that doesn't match the expected ${isBill ? "utility bill" : "AuditResult"} schema.`,
      suggestion: isBill
        ? "This is a system error. Try a clearer bill photo/PDF, or use manual entry."
        : "This is a system error. Try capturing a clearer photo of the appliance label.",
    },
    gemini_error: {
      reason: "gemini_error",
      userMessage: isBill ? "Gemini couldn't process the file." : "Gemini couldn't process the image.",
      technicalDetails: "Gemini API returned an error. This could be due to file format, content policy, or service issues.",
      suggestion: isBill
        ? "Try a clearer photo or PDF of the bill, or use manual entry."
        : "Try a different angle, ensure the label is visible, or use manual entry.",
    },
    timeout: {
      reason: "timeout",
      userMessage: "Request took too long — server didn't respond in time.",
      technicalDetails: "Gemini API call exceeded timeout. The AI is taking too long to process the file.",
      suggestion: "Check your connection and try again. Simpler files usually process faster.",
    },
  };

  return explanations[reason] || explanations.gemini_error;
}

export async function submitAudit(files: {
  contextImage?: Blob;
  dataImage: Blob;
}): Promise<AuditApiResult> {
  const formData = new FormData();
  if (files.contextImage) formData.append("contextImage", files.contextImage, "context.jpg");
  formData.append("dataImage", files.dataImage, "data.jpg");

  let response: Response;
  try {
    response = await fetch("/api/audit", { method: "POST", body: formData });
  } catch (err) {
    const error = getErrorExplanation("network");
    return { ok: false, error };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    const error = getErrorExplanation("network");
    return { ok: false, error };
  }

  if (!response.ok) {
    const reason = (body as { error?: AuditFailureReason })?.error ?? "gemini_error";
    const error = getErrorExplanation(reason);
    return { ok: false, error };
  }

  const payload = body as { result: AuditResult; readable: boolean };
  return { ok: true, result: payload.result, readable: payload.readable };
}

export type BillScanApiResult =
  | { ok: true; result: ParsedUtilityBill; readable: boolean }
  | { ok: false; error: AuditError };

export async function submitUtilityBillScan(file: Blob): Promise<BillScanApiResult> {
  const formData = new FormData();
  formData.append("billFile", file, file instanceof File ? file.name : "bill");

  let response: Response;
  try {
    response = await fetch("/api/utility-bill/scan", { method: "POST", body: formData });
  } catch {
    return { ok: false, error: getErrorExplanation("network", "bill") };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return { ok: false, error: getErrorExplanation("network", "bill") };
  }

  if (!response.ok) {
    const reason = (body as { error?: AuditFailureReason })?.error ?? "gemini_error";
    return { ok: false, error: getErrorExplanation(reason, "bill") };
  }

  const payload = body as { result: ParsedUtilityBill; readable: boolean };
  return { ok: true, result: payload.result, readable: payload.readable };
}
