import type { ParsedUtilityBill, UtilityBillParseInput } from "@/types";
import { asFiniteNumber, clamp, round } from "@/lib/intelligence/shared";

const MONEY = "\\$?\\s*([0-9][0-9,]*(?:\\.\\d{1,2})?)";
const NUMBER = "([0-9][0-9,]*(?:\\.\\d+)?)";

function normalizeText(rawText = ""): string {
  return rawText.replace(/\r/g, "\n").replace(/[ \t]+/g, " ").trim();
}

function firstRegexNumber(text: string, patterns: RegExp[]): number | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return asFiniteNumber(match[1], NaN);
  }
  return null;
}

function firstRegexText(text: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return null;
}

function coalesceNumber(primary: unknown, parsed: number | null): number | null {
  if (primary !== undefined && primary !== null && primary !== "") {
    const value = asFiniteNumber(primary, NaN);
    if (Number.isFinite(value)) return value;
  }
  return parsed !== null && Number.isFinite(parsed) ? parsed : null;
}

function collectExtractedFields(bill: Omit<ParsedUtilityBill, "extractedFields" | "warnings" | "confidenceScore">): string[] {
  return Object.entries(bill)
    .filter(([, value]) => value !== null && value !== "")
    .map(([key]) => key);
}

export function parseUtilityBill(input: UtilityBillParseInput = {}): ParsedUtilityBill {
  const text = normalizeText(input.rawText);
  const lower = text.toLowerCase();
  const firstLine = text
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0);

  const providerName =
    input.providerName?.trim() ||
    firstRegexText(text, [
      /(?:utility|provider|supplier|company)\s*:?\s*([A-Z][A-Za-z0-9 &.-]{2,40})/i,
      /^([A-Z][A-Za-z0-9 &.-]{2,40})\s+(?:energy|electric|gas|utilities)/im,
    ]) ||
    (firstLine && !/^(billing|account|total|amount|usage|service)\b/i.test(firstLine)
      ? firstLine.slice(0, 40)
      : null);

  const billingDays = coalesceNumber(
    input.billingDays,
    firstRegexNumber(text, [
      new RegExp(`${NUMBER}\\s*(?:billing\\s*)?days`, "i"),
      /billing period[^\n]*?(\d{1,3})\s*days/i,
    ])
  );

  const totalDueUSD = coalesceNumber(
    input.totalDueUSD,
    firstRegexNumber(text, [
      new RegExp(`(?:total\\s+(?:amount\\s+)?due|amount\\s+due|new\\s+charges|current\\s+charges)\\s*:?\\s*${MONEY}`, "i"),
      new RegExp(`(?:please\\s+pay|balance\\s+due)\\s*:?\\s*${MONEY}`, "i"),
    ])
  );

  const electricityKWh = coalesceNumber(
    input.electricityKWh,
    firstRegexNumber(text, [
      new RegExp(`${NUMBER}\\s*kwh`, "i"),
      new RegExp(`(?:electric(?:ity)?\\s+(?:usage|use)|usage)\\s*:?\\s*${NUMBER}`, "i"),
    ])
  );

  const gasTherms = coalesceNumber(
    input.gasTherms,
    firstRegexNumber(text, [
      new RegExp(`${NUMBER}\\s*therms?`, "i"),
      new RegExp(`(?:gas\\s+(?:usage|use)|usage)\\s*:?\\s*${NUMBER}\\s*(?:thm|therms?)`, "i"),
    ])
  );

  const demandKW = coalesceNumber(
    input.demandKW,
    firstRegexNumber(text, [
      new RegExp(`${NUMBER}\\s*kw\\b`, "i"),
      new RegExp(`demand\\s*:?\\s*${NUMBER}`, "i"),
    ])
  );

  const fixedChargesUSD = coalesceNumber(
    input.fixedChargesUSD,
    firstRegexNumber(text, [
      new RegExp(`(?:basic|customer|service|meter)\\s+(?:charge|fee)\\s*:?\\s*${MONEY}`, "i"),
      new RegExp(`fixed\\s+charges?\\s*:?\\s*${MONEY}`, "i"),
    ])
  );

  const variableChargesUSD = coalesceNumber(
    input.variableChargesUSD,
    firstRegexNumber(text, [
      new RegExp(`(?:energy|delivery|usage)\\s+charges?\\s*:?\\s*${MONEY}`, "i"),
      new RegExp(`variable\\s+charges?\\s*:?\\s*${MONEY}`, "i"),
    ])
  );

  const ratePlan =
    input.ratePlan?.trim() ||
    firstRegexText(text, [
      /rate plan\s*:?\s*([A-Za-z0-9 ._-]{2,40})/i,
      /tariff\s*:?\s*([A-Za-z0-9 ._-]{2,40})/i,
      /(time[- ]of[- ]use|tou|flat rate|tiered rate)/i,
    ]);

  const estimatedRatePerKWh =
    electricityKWh && electricityKWh > 0 && totalDueUSD
      ? round((variableChargesUSD ?? totalDueUSD) / electricityKWh, 3)
      : null;
  const estimatedRatePerTherm =
    gasTherms && gasTherms > 0 && totalDueUSD
      ? round((variableChargesUSD ?? totalDueUSD) / gasTherms, 2)
      : null;
  const averageDailyKWh =
    electricityKWh && billingDays && billingDays > 0 ? round(electricityKWh / billingDays, 1) : null;
  const averageDailyTherms =
    gasTherms && billingDays && billingDays > 0 ? round(gasTherms / billingDays, 2) : null;

  const billWithoutMeta = {
    providerName,
    billingDays,
    totalDueUSD,
    electricityKWh,
    gasTherms,
    demandKW,
    fixedChargesUSD,
    variableChargesUSD,
    estimatedRatePerKWh,
    estimatedRatePerTherm,
    averageDailyKWh,
    averageDailyTherms,
    ratePlan,
  };
  const extractedFields = collectExtractedFields(billWithoutMeta);
  const warnings: string[] = [];

  if (!text && Object.keys(input).length === 0) warnings.push("No bill text or structured fields were provided.");
  if (!totalDueUSD) warnings.push("Total bill amount was not found.");
  if (!electricityKWh && !gasTherms) warnings.push("No electricity or gas usage quantity was found.");
  if (lower.includes("estimated")) warnings.push("Bill text appears to include estimated usage.");
  if (estimatedRatePerKWh && estimatedRatePerKWh > 0.6) warnings.push("Estimated electric rate is unusually high; verify charges and usage.");

  const confidenceScore = clamp(round(extractedFields.length / 10 + (text.length > 80 ? 0.2 : 0), 2), 0.15, 0.95);

  return {
    ...billWithoutMeta,
    confidenceScore,
    extractedFields,
    warnings,
  };
}
