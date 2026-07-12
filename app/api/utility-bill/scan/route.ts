import { GoogleGenAI, Type } from "@google/genai";
import { NextResponse } from "next/server";
import { parseUtilityBill } from "@/lib/intelligence/utilityBill";
import type { ParsedUtilityBill, UtilityBillParseInput } from "@/types";

export const runtime = "nodejs";

const SYSTEM_INSTRUCTION =
  "You are an expert at reading residential utility bills (electric and/or gas), submitted as " +
  "either a photo or a PDF. Extract only the fields explicitly printed on the bill. Omit any " +
  "field you cannot find — do not guess or estimate a value that isn't shown.";

const BILL_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    providerName: { type: Type.STRING, description: "Utility company name" },
    billingDays: { type: Type.INTEGER, description: "Length of the billing period in days" },
    totalDueUSD: { type: Type.NUMBER, description: "Total amount due on the bill" },
    electricityKWh: { type: Type.NUMBER, description: "Electricity usage in kWh" },
    gasTherms: { type: Type.NUMBER, description: "Gas usage in therms" },
    demandKW: { type: Type.NUMBER, description: "Peak demand in kW, if shown" },
    fixedChargesUSD: { type: Type.NUMBER, description: "Fixed/basic/customer charge in USD" },
    variableChargesUSD: { type: Type.NUMBER, description: "Variable/energy/delivery charges in USD" },
    ratePlan: { type: Type.STRING, description: "Named rate plan or tariff, e.g. Time-of-Use" },
  },
};

const MIN_CONFIDENCE = 0.35;
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const GEMINI_MODEL = "gemini-3.5-flash";

async function fileToInlineData(file: File) {
  const buf = Buffer.from(await file.arrayBuffer());
  return { inlineData: { mimeType: file.type || "image/jpeg", data: buf.toString("base64") } };
}

function getErrorValue(err: unknown, key: string): unknown {
  return typeof err === "object" && err !== null ? (err as Record<string, unknown>)[key] : undefined;
}

function getErrorText(err: unknown): string {
  if (err instanceof Error) return err.message;
  const message = getErrorValue(err, "message");
  if (typeof message === "string") return message;
  if (typeof err === "string") return err;
  return "Gemini returned an unknown error.";
}

function getErrorStatus(err: unknown): number | undefined {
  const status = getErrorValue(err, "status") ?? getErrorValue(err, "code");
  if (typeof status === "number") return status;
  if (typeof status === "string") {
    const parsed = Number(status);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function redactSensitive(text: string): string {
  return text
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, "[redacted_gemini_api_key]")
    .replace(/key=([^&\s]+)/gi, "key=[redacted]")
    .slice(0, 900);
}

function classifyGeminiError(err: unknown): {
  error: "gemini_error" | "gemini_api_key_invalid" | "gemini_rate_limited" | "timeout";
  status: number;
  message: string;
  details: string;
  geminiStatus?: number;
  errorName?: string;
} {
  const geminiStatus = getErrorStatus(err);
  const errorName = err instanceof Error ? err.name : undefined;
  const message = redactSensitive(getErrorText(err));
  const lower = message.toLowerCase();

  if (geminiStatus === 401 || geminiStatus === 403 || /api key|permission|unauthenticated|forbidden/.test(lower)) {
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
      message: "Gemini took too long to process the bill file.",
      details: message,
      geminiStatus,
      errorName,
    };
  }

  return {
    error: "gemini_error",
    status: 502,
    message: "Gemini could not process the bill file.",
    details: message,
    geminiStatus,
    errorName,
  };
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "your_gemini_api_key_here") {
    return NextResponse.json(
      {
        error: "server_misconfigured",
        message: "GEMINI_API_KEY is missing or still set to the placeholder value.",
      },
      { status: 500 }
    );
  }

  const form = await request.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "bad_request", message: "Expected multipart form data" }, { status: 400 });
  }

  const billFile = form.get("billFile");
  if (!(billFile instanceof File) || billFile.size === 0) {
    return NextResponse.json({ error: "bad_request", message: "billFile is required" }, { status: 400 });
  }
  if (billFile.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      {
        error: "bad_request",
        message: "File too large",
        details: `Uploaded file is ${billFile.size} bytes; max is ${MAX_FILE_BYTES} bytes.`,
        fileName: billFile.name,
        fileType: billFile.type || "unknown",
        fileSizeBytes: billFile.size,
      },
      { status: 400 }
    );
  }

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
    { text: "Extract the billing details from this utility bill." },
    await fileToInlineData(billFile),
  ];

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: "user", parts }],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: BILL_SCHEMA,
      },
    });

    const raw = response.text;
    if (!raw) {
      return NextResponse.json(
        {
          error: "schema_mismatch",
          message: "Gemini returned an empty response.",
          details: "The API call completed, but there was no response text to parse as bill JSON.",
          model: GEMINI_MODEL,
        },
        { status: 502 }
      );
    }

    let extracted: unknown;
    try {
      extracted = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        {
          error: "schema_mismatch",
          message: "Gemini returned non-JSON output.",
          details: "The bill scan route requested application/json, but Gemini's response could not be parsed.",
          model: GEMINI_MODEL,
        },
        { status: 502 }
      );
    }

    if (typeof extracted !== "object" || extracted === null || Array.isArray(extracted)) {
      return NextResponse.json(
        {
          error: "schema_mismatch",
          message: "Gemini returned JSON in the wrong shape.",
          details: "Expected a single object with utility bill fields, but got a different JSON value.",
          model: GEMINI_MODEL,
        },
        { status: 502 }
      );
    }

    const result: ParsedUtilityBill = parseUtilityBill(extracted as UtilityBillParseInput);

    return NextResponse.json(
      { result, readable: result.confidenceScore >= MIN_CONFIDENCE && result.totalDueUSD !== null },
      { status: 200 }
    );
  } catch (err) {
    console.error("Gemini utility bill scan failed", err);
    const failure = classifyGeminiError(err);
    return NextResponse.json(
      {
        error: failure.error,
        message: failure.message,
        details: failure.details,
        geminiStatus: failure.geminiStatus,
        errorName: failure.errorName,
        model: GEMINI_MODEL,
        fileName: billFile.name,
        fileType: billFile.type || "unknown",
        fileSizeBytes: billFile.size,
      },
      { status: failure.status }
    );
  }
}
