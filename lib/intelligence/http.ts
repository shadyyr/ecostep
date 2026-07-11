import { NextResponse } from "next/server";
import type { Suggestion, UserProfile } from "@/types";

export async function readJsonBody(request: Request): Promise<
  | { ok: true; body: Record<string, unknown> }
  | { ok: false; response: NextResponse }
> {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "bad_request", message: "Expected a JSON object body." },
        { status: 400 }
      ),
    };
  }
  return { ok: true, body: body as Record<string, unknown> };
}

export function getProfile(body: Record<string, unknown>): UserProfile | null {
  const profile = body.profile;
  if (!profile || typeof profile !== "object" || Array.isArray(profile)) return null;
  const candidate = profile as Partial<UserProfile>;
  if (typeof candidate.zipCode !== "string" || typeof candidate.hasSolar !== "boolean") return null;
  return {
    zipCode: candidate.zipCode,
    hasSolar: candidate.hasSolar,
    preference: candidate.preference ?? "savings",
    maxBudgetUSD: typeof candidate.maxBudgetUSD === "number" ? candidate.maxBudgetUSD : 5000,
    targetBillUSD: typeof candidate.targetBillUSD === "number" ? candidate.targetBillUSD : undefined,
  };
}

export function getSuggestions(body: Record<string, unknown>): Suggestion[] {
  return Array.isArray(body.suggestions) ? (body.suggestions as Suggestion[]) : [];
}

export function badRequest(message: string): NextResponse {
  return NextResponse.json({ error: "bad_request", message }, { status: 400 });
}
