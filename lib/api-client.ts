import type { AuditResult } from "@/types";

export type AuditFailureReason =
  | "network"
  | "bad_request"
  | "schema_mismatch"
  | "gemini_error"
  | "server_misconfigured";

export type AuditApiResult =
  | { ok: true; result: AuditResult; readable: boolean }
  | { ok: false; reason: AuditFailureReason };

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
  } catch {
    return { ok: false, reason: "network" };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return { ok: false, reason: "network" };
  }

  if (!response.ok) {
    const reason = (body as { error?: AuditFailureReason })?.error ?? "gemini_error";
    return { ok: false, reason };
  }

  const payload = body as { result: AuditResult; readable: boolean };
  return { ok: true, result: payload.result, readable: payload.readable };
}
