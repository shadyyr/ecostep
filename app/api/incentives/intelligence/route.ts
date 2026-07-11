import { NextResponse } from "next/server";
import { analyzeIncentives } from "@/lib/intelligence";
import { badRequest, getProfile, getSuggestions, readJsonBody } from "@/lib/intelligence/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;

  const profile = getProfile(parsed.body);
  if (!profile) return badRequest("profile with zipCode and hasSolar is required.");

  return NextResponse.json({
    result: analyzeIncentives({
      profile,
      suggestions: getSuggestions(parsed.body),
      householdIncomeUSD:
        typeof parsed.body.householdIncomeUSD === "number" ? parsed.body.householdIncomeUSD : undefined,
      taxLiabilityUSD:
        typeof parsed.body.taxLiabilityUSD === "number" ? parsed.body.taxLiabilityUSD : undefined,
      currentDateISO:
        typeof parsed.body.currentDateISO === "string" ? parsed.body.currentDateISO : undefined,
    }),
  });
}
