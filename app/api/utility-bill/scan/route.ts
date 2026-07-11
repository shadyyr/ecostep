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

async function fileToInlineData(file: File) {
  const buf = Buffer.from(await file.arrayBuffer());
  return { inlineData: { mimeType: file.type || "image/jpeg", data: buf.toString("base64") } };
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

  const billFile = form.get("billFile");
  if (!(billFile instanceof File) || billFile.size === 0) {
    return NextResponse.json({ error: "bad_request", message: "billFile is required" }, { status: 400 });
  }
  if (billFile.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "bad_request", message: "File too large" }, { status: 400 });
  }

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
    { text: "Extract the billing details from this utility bill." },
    await fileToInlineData(billFile),
  ];

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [{ role: "user", parts }],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: BILL_SCHEMA,
      },
    });

    const raw = response.text;
    if (!raw) {
      return NextResponse.json({ error: "schema_mismatch" }, { status: 502 });
    }

    let extracted: unknown;
    try {
      extracted = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "schema_mismatch" }, { status: 502 });
    }

    if (typeof extracted !== "object" || extracted === null || Array.isArray(extracted)) {
      return NextResponse.json({ error: "schema_mismatch" }, { status: 502 });
    }

    const result: ParsedUtilityBill = parseUtilityBill(extracted as UtilityBillParseInput);

    return NextResponse.json(
      { result, readable: result.confidenceScore >= MIN_CONFIDENCE && result.totalDueUSD !== null },
      { status: 200 }
    );
  } catch (err) {
    console.error("Gemini utility bill scan failed", err);
    return NextResponse.json({ error: "gemini_error" }, { status: 502 });
  }
}
