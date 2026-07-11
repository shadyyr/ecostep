import { NextResponse } from "next/server";
import { parseUtilityBill } from "@/lib/intelligence";
import { readJsonBody } from "@/lib/intelligence/http";
import type { UtilityBillParseInput } from "@/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;

  const input = (parsed.body.bill ?? parsed.body) as UtilityBillParseInput;
  return NextResponse.json({ result: parseUtilityBill(input) });
}
