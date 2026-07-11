import { NextResponse } from "next/server";
import { planBuyingCircles } from "@/lib/intelligence";
import { badRequest, getProfile, getSuggestions, readJsonBody } from "@/lib/intelligence/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;

  const profile = getProfile(parsed.body);
  if (!profile) return badRequest("profile with zipCode and hasSolar is required.");

  return NextResponse.json({
    result: planBuyingCircles({
      profile,
      suggestions: getSuggestions(parsed.body),
      minimumHomesForQuote:
        typeof parsed.body.minimumHomesForQuote === "number"
          ? parsed.body.minimumHomesForQuote
          : undefined,
    }),
  });
}
