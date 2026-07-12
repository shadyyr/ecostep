import type { GoogleGenAI } from "@google/genai";

type GenerateContentRequest = Parameters<GoogleGenAI["models"]["generateContent"]>[0];
type GenerateContentResponse = Awaited<ReturnType<GoogleGenAI["models"]["generateContent"]>>;

export const GEMINI_MODEL_FALLBACKS = [
  "gemini-3.5-flash",
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "gemini-2.5-flash-lite",
] as const;

export interface GeminiModelAttempt {
  model: string;
  details: string;
  geminiStatus?: number;
  errorName?: string;
}

export class GeminiModelFallbackError extends Error {
  attempts: GeminiModelAttempt[];
  lastError: unknown;

  constructor(attempts: GeminiModelAttempt[], lastError: unknown) {
    super(
      `All Gemini model attempts failed. ${attempts
        .map((attempt) => `${attempt.model}: ${attempt.details}`)
        .join(" | ")}`
    );
    this.name = "GeminiModelFallbackError";
    this.attempts = attempts;
    this.lastError = lastError;
  }
}

export function getGeminiErrorValue(err: unknown, key: string): unknown {
  return typeof err === "object" && err !== null ? (err as Record<string, unknown>)[key] : undefined;
}

export function getGeminiErrorText(err: unknown): string {
  if (err instanceof Error) return err.message;
  const message = getGeminiErrorValue(err, "message");
  if (typeof message === "string") return message;
  if (typeof err === "string") return err;
  return "Gemini returned an unknown error.";
}

export function getGeminiErrorStatus(err: unknown): number | undefined {
  const status = getGeminiErrorValue(err, "status") ?? getGeminiErrorValue(err, "code");
  if (typeof status === "number") return status;
  if (typeof status === "string") {
    const parsed = Number(status);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

export function redactGeminiSensitiveText(text: string): string {
  return text
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, "[redacted_gemini_api_key]")
    .replace(/key=([^&\s]+)/gi, "key=[redacted]")
    .slice(0, 900);
}

function shouldStopFallbacks(err: unknown): boolean {
  const status = getGeminiErrorStatus(err);
  const lower = getGeminiErrorText(err).toLowerCase();
  return status === 401 || /api key|credential|unauthenticated/.test(lower);
}

function summarizeAttempt(model: string, err: unknown): GeminiModelAttempt {
  return {
    model,
    details: redactGeminiSensitiveText(getGeminiErrorText(err)),
    geminiStatus: getGeminiErrorStatus(err),
    errorName: err instanceof Error ? err.name : undefined,
  };
}

export async function generateContentWithFallback(
  ai: GoogleGenAI,
  requestWithoutModel: Omit<GenerateContentRequest, "model">
): Promise<{
  response: GenerateContentResponse;
  model: string;
  attemptedModels: string[];
  failedAttempts: GeminiModelAttempt[];
}> {
  const failedAttempts: GeminiModelAttempt[] = [];
  let lastError: unknown;

  for (const model of GEMINI_MODEL_FALLBACKS) {
    try {
      const response = await ai.models.generateContent({
        ...requestWithoutModel,
        model,
      } as GenerateContentRequest);

      return {
        response,
        model,
        attemptedModels: [...failedAttempts.map((attempt) => attempt.model), model],
        failedAttempts,
      };
    } catch (err) {
      lastError = err;
      failedAttempts.push(summarizeAttempt(model, err));
      if (shouldStopFallbacks(err)) break;
    }
  }

  throw new GeminiModelFallbackError(failedAttempts, lastError);
}
