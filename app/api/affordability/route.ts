import { NextResponse } from "next/server";
import { parseUtilityBill, simulateAffordability } from "@/lib/intelligence";
import { badRequest, getProfile, getSuggestions, readJsonBody } from "@/lib/intelligence/http";
import type { ParsedUtilityBill, UtilityBillParseInput } from "@/types";

export const runtime = "nodejs";

function getBill(value: unknown): ParsedUtilityBill | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  if ("confidenceScore" in value) return value as ParsedUtilityBill;
  return parseUtilityBill(value as UtilityBillParseInput);
}

export async function POST(request: Request) {
  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;

  const profile = getProfile(parsed.body);
  if (!profile) return badRequest("profile with zipCode and hasSolar is required.");

  return NextResponse.json({
    result: simulateAffordability({
      profile,
      suggestions: getSuggestions(parsed.body),
      parsedBill: getBill(parsed.body.utilityBill),
      financingTermMonths:
        typeof parsed.body.financingTermMonths === "number" ? parsed.body.financingTermMonths : undefined,
      aprPct: typeof parsed.body.aprPct === "number" ? parsed.body.aprPct : undefined,
      monthlyCashAvailableUSD:
        typeof parsed.body.monthlyCashAvailableUSD === "number"
          ? parsed.body.monthlyCashAvailableUSD
          : undefined,
    }),
  });
}
