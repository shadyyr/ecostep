import { GoogleGenAI, Type } from "@google/genai";
import { NextResponse } from "next/server";
import {
  generateContentWithFallback,
  getGeminiErrorStatus,
  getGeminiErrorText,
  GeminiModelFallbackError,
  redactGeminiSensitiveText,
} from "@/lib/geminiFallback";
import type { AuditResult } from "@/types";

export const runtime = "nodejs";

const SYSTEM_INSTRUCTION =
  "You are an expert home energy auditor and building electrification specialist. " +
  "Analyze the submitted image of an appliance, utility statement, or breaker system. " +
  "Extract explicit manufacturer data, energy footprints, and electrical constraints. " +
  "Output details matching the provided JSON response schema precisely. If values are " +
  "missing, supply 'Not Found'.";

const AUDIT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    detectedCategory: {
      type: Type.STRING,
      description: "e.g., Water Heater, Furnace, AC Condenser, Electrical Panel",
    },
    brand: { type: Type.STRING },
    modelNumber: { type: Type.STRING },
    fuelSource: {
      type: Type.STRING,
      description: "e.g., Natural Gas, Propane, Electricity, Heating Oil",
    },
    estimatedAgeYears: { type: Type.INTEGER },
    electricalDrawAmps: {
      type: Type.INTEGER,
      description: "Extracted breaker value or electrical plate label draw",
    },
    estimatedMonthlySavingsUSD: {
      type: Type.INTEGER,
      description: "Estimated bill reduction value if swapped for clean energy alternative",
    },
    confidenceScore: {
      type: Type.NUMBER,
      description: "Value from 0.0 to 1.0 indicating clarity of data extraction",
    },
  },
  required: ["detectedCategory", "fuelSource", "estimatedMonthlySavingsUSD", "confidenceScore"],
};

const MIN_CONFIDENCE = 0.4;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

function isValidAuditResult(x: unknown): x is AuditResult {
  if (typeof x !== "object" || x === null) return false;
  const r = x as Record<string, unknown>;
  return (
    typeof r.detectedCategory === "string" &&
    typeof r.fuelSource === "string" &&
    typeof r.estimatedMonthlySavingsUSD === "number" &&
    typeof r.confidenceScore === "number"
  );
}

async function fileToInlineData(file: File) {
  const buf = Buffer.from(await file.arrayBuffer());
  return { inlineData: { mimeType: file.type || "image/jpeg", data: buf.toString("base64") } };
}

function classifyGeminiError(err: unknown): {
  error: "gemini_error" | "gemini_api_key_invalid" | "gemini_rate_limited" | "timeout";
  status: number;
  message: string;
  details: string;
  geminiStatus?: number;
  errorName?: string;
} {
  const underlyingError = err instanceof GeminiModelFallbackError ? err.lastError : err;
  const geminiStatus = getGeminiErrorStatus(underlyingError);
  const errorName = err instanceof Error ? err.name : undefined;
  const message = redactGeminiSensitiveText(
    err instanceof GeminiModelFallbackError ? err.message : getGeminiErrorText(err)
  );
  const lower = message.toLowerCase();

  if (geminiStatus === 401 || /api key|credential|unauthenticated/.test(lower)) {
    return {
      error: "gemini_api_key_invalid",
      status: 502,
      message: "Gemini rejected the API credentials.",
      details: message,
      geminiStatus,
      errorName,
    };
  }

  if (geminiStatus === 429 || /quota|rate limit|resource exhausted|too many requests/.test(lower)) {
    return {
      error: "gemini_rate_limited",
      status: 429,
      message: "Gemini rate limit or quota was hit.",
      details: message,
      geminiStatus,
      errorName,
    };
  }

  if (/timeout|timed out|deadline/.test(lower)) {
    return {
      error: "timeout",
      status: 504,
      message: "Gemini took too long to process the image.",
      details: message,
      geminiStatus,
      errorName,
    };
  }

  return {
    error: "gemini_error",
    status: 502,
    message:
      err instanceof GeminiModelFallbackError
        ? "Gemini could not process the image after trying fallback models."
        : "Gemini could not process the image.",
    details: message,
    geminiStatus,
    errorName,
  };
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "your_gemini_api_key_here") {
    return NextResponse.json({ error: "server_misconfigured" }, { status: 500 });
  }

  const form = await request.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "bad_request", message: "Expected multipart form data" }, { status: 400 });
  }

  const dataImage = form.get("dataImage");
  if (!(dataImage instanceof File) || dataImage.size === 0) {
    return NextResponse.json(
      { error: "bad_request", message: "dataImage file is required" },
      { status: 400 }
    );
  }
  if (dataImage.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "bad_request", message: "Image too large" }, { status: 400 });
  }

  const contextImage = form.get("contextImage");

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
    {
      text:
        "Photo 1 (if present) is the CONTEXT shot: full appliance and surroundings. " +
        "The final photo is the DATA shot: a close-up of the spec/label plate. Use both " +
        "to extract accurate details.",
    },
  ];
  if (contextImage instanceof File && contextImage.size > 0) {
    if (contextImage.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: "bad_request", message: "Image too large" }, { status: 400 });
    }
    parts.push(await fileToInlineData(contextImage));
  }
  parts.push(await fileToInlineData(dataImage));

  try {
    const ai = new GoogleGenAI({ apiKey });
    const {
      response,
      model,
      attemptedModels,
      failedAttempts,
    } = await generateContentWithFallback(ai, {
      contents: [{ role: "user", parts }],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: AUDIT_SCHEMA,
      },
    });

    const raw = response.text;
    if (!raw) {
      return NextResponse.json(
        {
          error: "schema_mismatch",
          message: "Gemini returned an empty response.",
          details: "The API call completed, but there was no response text to parse as audit JSON.",
          model,
          attemptedModels,
          modelAttempts: failedAttempts,
        },
        { status: 502 }
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        {
          error: "schema_mismatch",
          message: "Gemini returned non-JSON output.",
          details: "The audit route requested application/json, but Gemini's response could not be parsed.",
          model,
          attemptedModels,
          modelAttempts: failedAttempts,
        },
        { status: 502 }
      );
    }

    if (!isValidAuditResult(parsed)) {
      return NextResponse.json(
        {
          error: "schema_mismatch",
          message: "Gemini returned JSON in the wrong shape.",
          details: "Expected a single object with audit fields, but got a different JSON value.",
          model,
          attemptedModels,
          modelAttempts: failedAttempts,
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { result: parsed, readable: parsed.confidenceScore >= MIN_CONFIDENCE, model, attemptedModels },
      { status: 200 }
    );
  } catch (err) {
    console.error("Gemini audit call failed", err);
    const failure = classifyGeminiError(err);
    const fallbackError = err instanceof GeminiModelFallbackError ? err : null;
    return NextResponse.json(
      {
        error: failure.error,
        message: failure.message,
        details: failure.details,
        geminiStatus: failure.geminiStatus,
        errorName: failure.errorName,
        model: fallbackError?.attempts.at(-1)?.model,
        attemptedModels: fallbackError?.attempts.map((attempt) => attempt.model),
        modelAttempts: fallbackError?.attempts,
        fileName: dataImage.name,
        fileType: dataImage.type || "unknown",
        fileSizeBytes: dataImage.size,
      },
      { status: failure.status }
    );
  }
}
