import type { AuditResult } from "@/types";

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

export function getErrorExplanation(reason: AuditFailureReason, details?: string): AuditError {
  const explanations: Record<AuditFailureReason, AuditError> = {
    network: {
      reason: "network",
      userMessage: "Connection problem — couldn't reach the server.",
      technicalDetails: "Failed to fetch /api/audit. Check internet connection and CORS settings.",
      suggestion: "Check your WiFi/internet connection and try again.",
    },
    bad_request: {
      reason: "bad_request",
      userMessage: "Photo wasn't received properly.",
      technicalDetails: "Server rejected the request: missing or malformed form data. Image may be corrupted or too large (max 8MB).",
      suggestion: "Make sure the photo is a valid image file and retake the photo.",
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
      userMessage: "Couldn't read the text on the label.",
      technicalDetails: "Gemini confidence score below threshold (0.4). Text in image was too blurry, small, or obscured.",
      suggestion: "Try moving closer, improving lighting, or using a flashlight to make the text more legible.",
    },
    schema_mismatch: {
      reason: "schema_mismatch",
      userMessage: "Extracted data didn't match expected format.",
      technicalDetails: "Gemini returned data that doesn't match the AuditResult schema.",
      suggestion: "This is a system error. Try capturing a clearer photo of the appliance label.",
    },
    gemini_error: {
      reason: "gemini_error",
      userMessage: "Gemini couldn't process the image.",
      technicalDetails: "Gemini API returned an error. This could be due to image format, content policy, or service issues.",
      suggestion: "Try a different angle, ensure the label is visible, or use manual entry.",
    },
    timeout: {
      reason: "timeout",
      userMessage: "Request took too long — server didn't respond in time.",
      technicalDetails: "Gemini API call exceeded timeout. The AI is taking too long to process the image.",
      suggestion: "Check your connection and try again. Simpler images usually process faster.",
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
