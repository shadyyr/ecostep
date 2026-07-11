import { NextResponse } from "next/server";
import { planOutageResilience } from "@/lib/intelligence";
import { badRequest, getProfile, getSuggestions, readJsonBody } from "@/lib/intelligence/http";
import type { CriticalLoadInput } from "@/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;

  const profile = getProfile(parsed.body);
  if (!profile) return badRequest("profile with zipCode and hasSolar is required.");

  return NextResponse.json({
    result: planOutageResilience({
      profile,
      suggestions: getSuggestions(parsed.body),
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
