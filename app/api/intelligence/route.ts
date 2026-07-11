import { NextResponse } from "next/server";
import { generateHomeIntelligence } from "@/lib/intelligence";
import { badRequest, getProfile, getSuggestions, readJsonBody } from "@/lib/intelligence/http";
import type { CriticalLoadInput, ParsedUtilityBill, UtilityBillParseInput } from "@/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;

  const profile = getProfile(parsed.body);
  if (!profile) return badRequest("profile with zipCode and hasSolar is required.");

  return NextResponse.json({
    result: generateHomeIntelligence({
      profile,
      suggestions: getSuggestions(parsed.body),
      utilityBill: parsed.body.utilityBill as UtilityBillParseInput | ParsedUtilityBill | undefined,
      householdIncomeUSD:
        typeof parsed.body.householdIncomeUSD === "number" ? parsed.body.householdIncomeUSD : undefined,
      taxLiabilityUSD:
        typeof parsed.body.taxLiabilityUSD === "number" ? parsed.body.taxLiabilityUSD : undefined,
      financingTermMonths:
        typeof parsed.body.financingTermMonths === "number" ? parsed.body.financingTermMonths : undefined,
      aprPct: typeof parsed.body.aprPct === "number" ? parsed.body.aprPct : undefined,
      monthlyCashAvailableUSD:
        typeof parsed.body.monthlyCashAvailableUSD === "number"
          ? parsed.body.monthlyCashAvailableUSD
          : undefined,
      outageHoursTarget:
        typeof parsed.body.outageHoursTarget === "number" ? parsed.body.outageHoursTarget : undefined,
      criticalLoads: Array.isArray(parsed.body.criticalLoads)
        ? (parsed.body.criticalLoads as CriticalLoadInput[])
        : undefined,
      includeHeatingCooling: parsed.body.includeHeatingCooling === true,
      hasMedicalDevice: parsed.body.hasMedicalDevice === true,
    }),
  });
}
