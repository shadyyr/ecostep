import { useState } from "react";
import { motion } from "motion/react";
import type {
  AffordabilityScenario,
  AppliedIncentive,
  Suggestion,
  SuggestionIncentiveInsight,
  UserProfile,
} from "@/types";
import { Card } from "@/components/ui/Card";
import { TierBadge, StatusBadge } from "@/components/ui/Badge";
import { Meter } from "@/components/ui/Meter";
import { RejectButton } from "@/components/dashboard/RejectButton";
import { Modal } from "@/components/ui/Modal";
import { getEffectivePrice } from "@/utils/incentives";
import { getSuggestionInsight } from "@/utils/calculations";
import { getHomeSuggestionControl } from "@/utils/homeEligibility";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const deadlineFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

type IncentiveMatch = SuggestionIncentiveInsight["matches"][number];
type PopupIncentive = IncentiveMatch | AppliedIncentive;

function formatDeadlineNote(
  incentive: Pick<PopupIncentive, "deadlineISO"> & { daysUntilDeadline?: number }
): string | null {
  if (!incentive.deadlineISO) return null;
  if (incentive.daysUntilDeadline !== undefined && incentive.daysUntilDeadline < 0) {
    return "may have expired — verify";
  }
  const date = new Date(`${incentive.deadlineISO}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return `expires ${deadlineFormatter.format(date)}`;
}

function getPaperworkHours(incentive: PopupIncentive): number | null {
  if ("paperworkHours" in incentive) return incentive.paperworkHours;
  if (!incentive.requiredDocuments || incentive.requiredDocuments.length === 0) return null;
  return incentive.requiredDocuments.reduce((sum, document) => sum + document.estimatedHours, 0);
}

function getNextStep(incentive: PopupIncentive): string {
  if (incentive.nextStep) return incentive.nextStep;
  const firstDocument = incentive.requiredDocuments?.[0]?.name.toLowerCase();
  return firstDocument
    ? `Confirm eligibility, then gather ${firstDocument}.`
    : "Confirm eligibility with the official program page before purchase.";
}

function getIncentiveSummary(incentive: PopupIncentive, suggestion: Suggestion): string {
  const base = `This ${incentive.type.toLowerCase()} may reduce the cost of ${suggestion.shortName} by ${currency.format(incentive.rebateValueUSD)}.`;
  if (incentive.eligibility) return `${base} ${incentive.eligibility}`;
  return `${base} Eligibility depends on your address, equipment, installer, and program rules.`;
}

const AFFORDABILITY_STATUS_META: Record<
  AffordabilityScenario["status"],
  { tone: "good" | "warning" | "critical"; label: string }
> = {
  cash_positive: { tone: "good", label: "Cash positive" },
  budget_fit: { tone: "good", label: "Fits your budget" },
  financing_needed: { tone: "warning", label: "Needs financing" },
  long_payback: { tone: "warning", label: "Long payback" },
};

interface SuggestionCardProps {
  suggestion: Suggestion;
  onReject: (id: string) => void;
  onAccept: (id: string) => void;
  profile?: UserProfile;
  allSuggestions?: Suggestion[];
  incentiveInsight?: SuggestionIncentiveInsight;
  affordabilityScenario?: AffordabilityScenario;
  anchorId?: string;
}

export function SuggestionCard({
  suggestion,
  onReject,
  onAccept,
  profile,
  allSuggestions,
  incentiveInsight,
  affordabilityScenario,
  anchorId,
}: SuggestionCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [expandedIncentive, setExpandedIncentive] = useState<string | null>(null);
  const [expandedDocuments, setExpandedDocuments] = useState<string | null>(null);
  const effectivePrice = getEffectivePrice(suggestion);
  const totalRebate = suggestion.priceUSD - effectivePrice;
  const insight = profile ? getSuggestionInsight(suggestion, profile, allSuggestions) : null;
  const incentiveMatches = incentiveInsight?.matches ?? [];
  const homeControl = profile ? getHomeSuggestionControl(profile, suggestion) : null;
  const homeControlWarning = homeControl?.status === "in_control" ? null : homeControl;
  const isLimitedControl = homeControlWarning?.status === "limited_control";

  function findIncentiveByName(name: string | null): PopupIncentive | null {
    if (!name) return null;
    return (
      incentiveMatches.find((incentive) => incentive.incentiveName === name) ??
      suggestion.appliedIncentives.find((incentive) => incentive.incentiveName === name) ??
      null
    );
  }

  const selectedIncentive = findIncentiveByName(expandedIncentive);
  const selectedDeadlineNote = selectedIncentive ? formatDeadlineNote(selectedIncentive) : null;

  const selectedDocumentsIncentive = findIncentiveByName(expandedDocuments);
  const selectedDocumentsPaperworkHours = selectedDocumentsIncentive
    ? getPaperworkHours(selectedDocumentsIncentive)
    : null;

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
      >
      <Card
        id={anchorId}
        className="flex flex-col gap-3"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="mb-1.5 flex items-center gap-2">
              <TierBadge tier={suggestion.tier} />
              {homeControlWarning ? (
                <StatusBadge tone="warning">{homeControlWarning.label}</StatusBadge>
              ) : null}
              {suggestion.source === "manual" ? (
                <span className="text-xs text-black/40 dark:text-white/40">Manually entered</span>
              ) : null}
            </div>
            <button
              onClick={() => setShowDetails(true)}
              className="text-left hover:opacity-80 transition-opacity"
            >
              <h3 className="text-base font-semibold text-brand-900 dark:text-brand-100 underline underline-offset-2">
                {suggestion.shortName}
              </h3>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-xs text-black/50 dark:text-white/50">Monthly savings</div>
            <div className="font-medium text-status-good">
              {currency.format(suggestion.estimatedMonthlySavingsUSD)}/mo
            </div>
          </div>
          <div>
            <div className="text-xs text-black/50 dark:text-white/50">Appliance Cost</div>
            <div className="font-medium">
              {currency.format(effectivePrice)}
              {totalRebate > 0 ? (
                <span className="ml-1.5 text-xs font-normal text-black/40 line-through dark:text-white/40">
                  {currency.format(suggestion.priceUSD)}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <Meter value={suggestion.conversionEfficiencyPct} label="Conservation Percentage" />

        {homeControlWarning ? (
          <div className="rounded-lg border border-status-warning/25 bg-status-warning/10 px-3 py-2 text-sm text-[#6f4700] dark:text-status-warning">
            <p className="font-semibold">{homeControlWarning.label}</p>
            <p className="mt-1 text-xs leading-relaxed">
              {homeControlWarning.reason} {homeControlWarning.actionHint}
            </p>
          </div>
        ) : null}

        {affordabilityScenario ? (
          <div className="flex items-center justify-between gap-2 text-xs">
            <StatusBadge tone={AFFORDABILITY_STATUS_META[affordabilityScenario.status].tone}>
              {AFFORDABILITY_STATUS_META[affordabilityScenario.status].label}
            </StatusBadge>
            <span className="text-black/50 dark:text-white/50">
              {currency.format(affordabilityScenario.monthlyNetImpactUSD)}/mo net
              {affordabilityScenario.paybackMonths !== null
                ? ` · pays back in ${affordabilityScenario.paybackMonths} mo`
                : ""}
            </span>
          </div>
        ) : null}

        {incentiveMatches.length > 0 ? (
          <ul className="flex flex-col gap-2 text-xs text-black/60 dark:text-white/60">
            {incentiveMatches.map((incentive) => {
              const deadlineNote = formatDeadlineNote(incentive);
              return (
                <li key={incentive.incentiveName} className="flex flex-col gap-0.5">
                  <button
                    type="button"
                    onClick={() => setExpandedIncentive(incentive.incentiveName)}
                    className="w-fit text-left font-medium text-brand-700 underline underline-offset-2 hover:text-brand-900 dark:text-brand-250 dark:hover:text-brand-100"
                  >
                    💸 {incentive.incentiveName} — {currency.format(incentive.rebateValueUSD)} (
                    {incentive.type})
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpandedDocuments(incentive.incentiveName)}
                    className="w-fit text-left text-black/45 underline underline-offset-2 hover:text-black/65 dark:text-white/45 dark:hover:text-white/65"
                  >
                    📋 {incentive.requiredDocuments.length}{" "}
                    {incentive.requiredDocuments.length === 1 ? "document" : "documents"} · ~
                    {incentive.paperworkHours} {incentive.paperworkHours === 1 ? "hr" : "hrs"} paperwork
                    {deadlineNote ? ` · ${deadlineNote}` : ""}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : suggestion.appliedIncentives.length > 0 ? (
          <ul className="flex flex-col gap-1 text-xs text-black/60 dark:text-white/60">
            {suggestion.appliedIncentives.map((incentive) => (
              <li key={incentive.incentiveName}>
                <button
                  type="button"
                  onClick={() => setExpandedIncentive(incentive.incentiveName)}
                  className="text-left font-medium text-brand-700 underline underline-offset-2 hover:text-brand-900 dark:text-brand-250 dark:hover:text-brand-100"
                >
                💸 {incentive.incentiveName} — {currency.format(incentive.rebateValueUSD)} (
                {incentive.type})
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {suggestion.reason ? (
          <div className="rounded-lg border border-brand-250/40 bg-brand-100/70 px-3 py-2 text-sm text-brand-900 dark:border-brand-250/20 dark:bg-brand-900/35 dark:text-brand-250">
            {suggestion.reason}
          </div>
        ) : null}

        {insight ? (
          <div className="rounded-lg border border-black/10 bg-black/[0.02] px-3 py-2 text-sm text-black/70 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/75">
            {insight}
          </div>
        ) : null}

        <div className="mt-1 flex items-center justify-between gap-2 border-t border-black/5 pt-3 dark:border-white/10">
          <span className="text-xs text-black/40 dark:text-white/40">
            {suggestion.fuelSource} → Electric
          </span>
          <RejectButton
            onReject={() => onReject(suggestion.id)}
            onAccept={() => onAccept(suggestion.id)}
            acceptDisabled={isLimitedControl}
            acceptTitle={
              isLimitedControl
                ? "This needs owner or property-manager control before it can be accepted."
                : undefined
            }
          />
        </div>
      </Card>
      </motion.div>

      <Modal open={showDetails} onClose={() => setShowDetails(false)} title={suggestion.shortName}>
        <div className="flex flex-col gap-4">
          <div className="rounded-lg bg-brand-100 p-4 dark:bg-brand-900">
            <p className="text-base leading-relaxed text-black dark:text-white">
              {suggestion.description}
            </p>
          </div>

          {homeControlWarning ? (
            <div className="rounded-lg border border-status-warning/25 bg-status-warning/10 p-4 text-sm text-[#6f4700] dark:text-status-warning">
              <h4 className="font-semibold">{homeControlWarning.label}</h4>
              <p className="mt-1 leading-relaxed">
                {homeControlWarning.reason} {homeControlWarning.actionHint}
              </p>
            </div>
          ) : null}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
            <div>
              <div className="text-xs text-black/50 dark:text-white/50 mb-1">Monthly savings</div>
              <div className="text-lg font-semibold text-status-good">
                {currency.format(suggestion.estimatedMonthlySavingsUSD)}/mo
              </div>
            </div>
            <div>
              <div className="text-xs text-black/50 dark:text-white/50 mb-1">Appliance Cost</div>
              <div className="text-lg font-semibold">{currency.format(effectivePrice)}</div>
            </div>
            <div>
              <div className="text-xs text-black/50 dark:text-white/50 mb-1">
                Efficiency improvement
              </div>
              <div className="text-lg font-semibold text-brand-600 dark:text-brand-300">
                {suggestion.conversionEfficiencyPct}%
              </div>
            </div>
            <div>
              <div className="text-xs text-black/50 dark:text-white/50 mb-1">Category</div>
              <div className="text-lg font-semibold capitalize">{suggestion.category}</div>
            </div>
          </div>

          {affordabilityScenario ? (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-sm font-semibold">Money-wise verdict</h4>
                <StatusBadge tone={AFFORDABILITY_STATUS_META[affordabilityScenario.status].tone}>
                  {AFFORDABILITY_STATUS_META[affordabilityScenario.status].label}
                </StatusBadge>
              </div>
              <p className="mb-3 text-xs text-black/50 dark:text-white/50">
                Based on the utility bill you uploaded, this is how switching actually pencils out.
              </p>
              <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                <div>
                  <div className="text-xs text-black/50 dark:text-white/50 mb-1">Net upfront cost</div>
                  <div className="font-semibold">{currency.format(affordabilityScenario.netUpfrontCostUSD)}</div>
                </div>
                <div>
                  <div className="text-xs text-black/50 dark:text-white/50 mb-1">Monthly payment</div>
                  <div className="font-semibold">{currency.format(affordabilityScenario.monthlyPaymentUSD)}</div>
                </div>
                <div>
                  <div className="text-xs text-black/50 dark:text-white/50 mb-1">Bill-adjusted savings</div>
                  <div className="font-semibold text-status-good">
                    {currency.format(affordabilityScenario.monthlySavingsUSD)}/mo
                  </div>
                </div>
                <div>
                  <div className="text-xs text-black/50 dark:text-white/50 mb-1">Monthly net impact</div>
                  <div
                    className={`font-semibold ${affordabilityScenario.monthlyNetImpactUSD >= 0 ? "text-status-good" : ""}`}
                  >
                    {currency.format(affordabilityScenario.monthlyNetImpactUSD)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-black/50 dark:text-white/50 mb-1">Payback</div>
                  <div className="font-semibold">
                    {affordabilityScenario.paybackMonths !== null
                      ? `${affordabilityScenario.paybackMonths} mo`
                      : "—"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-black/50 dark:text-white/50 mb-1">Affordability score</div>
                  <div className="font-semibold">{affordabilityScenario.affordabilityScore}/100</div>
                </div>
              </div>
              {affordabilityScenario.flags.length > 0 ? (
                <ul className="mt-3 flex flex-col gap-1 text-xs text-black/50 dark:text-white/50">
                  {affordabilityScenario.flags.map((flag) => (
                    <li key={flag}>• {flag}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          {incentiveMatches.length > 0 ? (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-sm font-semibold">Incentives &amp; paperwork</h4>
                {incentiveInsight ? (
                  <span className="text-xs font-medium text-status-good">
                    {currency.format(incentiveInsight.totalPotentialRebateUSD)} potential
                  </span>
                ) : null}
              </div>
              {incentiveInsight?.eligibilitySummary ? (
                <p className="mb-3 text-xs text-black/50 dark:text-white/50">
                  {incentiveInsight.eligibilitySummary}
                </p>
              ) : null}

              {incentiveInsight && incentiveInsight.warnings.length > 0 ? (
                <div className="mb-3 flex flex-col gap-1.5">
                  {incentiveInsight.warnings.map((warning) => (
                    <StatusBadge key={warning} tone="warning">
                      {warning}
                    </StatusBadge>
                  ))}
                </div>
              ) : null}

              <ul className="flex flex-col gap-3 text-sm text-black/60 dark:text-white/60">
                {incentiveMatches.map((incentive) => {
                  const deadlineNote = formatDeadlineNote(incentive);
                  return (
                    <li
                      key={incentive.incentiveName}
                      className="flex flex-col gap-1.5 rounded-lg bg-black/2 p-3 dark:bg-white/2"
                    >
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <span className="flex-1 font-medium break-words text-black dark:text-white">
                          {incentive.incentiveName}
                        </span>
                        <span className="font-medium text-status-good whitespace-nowrap">
                          {currency.format(incentive.rebateValueUSD)}
                        </span>
                      </div>
                      <p className="text-xs">{incentive.eligibility}</p>
                      <ul className="flex flex-col gap-0.5 text-xs text-black/50 dark:text-white/50">
                        {incentive.requiredDocuments.map((document) => (
                          <li key={document.name} className="flex items-center justify-between gap-3">
                            <span>📋 {document.name}</span>
                            <span className="shrink-0 tabular-nums">
                              ~{document.estimatedHours} {document.estimatedHours === 1 ? "hr" : "hrs"}
                            </span>
                          </li>
                        ))}
                      </ul>
                      <p className="text-xs font-medium text-black/60 dark:text-white/60">
                        ~{incentive.paperworkHours} {incentive.paperworkHours === 1 ? "hr" : "hrs"} total
                        paperwork{deadlineNote ? ` · ${deadlineNote}` : ""}
                        {incentive.stackable === false ? " · not stackable with other rebates" : ""}
                      </p>
                      <p className="text-xs italic text-black/50 dark:text-white/50">
                        {incentive.nextStep}
                      </p>
                      {incentive.sourceLabel ? (
                        <p className="text-[11px] text-black/35 dark:text-white/35">
                          Source: {incentive.sourceLabel}
                        </p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>

              {incentiveInsight && incentiveInsight.paperworkSteps.length > 0 ? (
                <div className="mt-3 rounded-lg border border-black/10 bg-black/[0.02] p-3 dark:border-white/10 dark:bg-white/[0.04]">
                  <p className="mb-1.5 text-xs font-semibold">Paperwork checklist</p>
                  <ul className="flex list-disc flex-col gap-1 pl-4 text-xs text-black/60 dark:text-white/60">
                    {incentiveInsight.paperworkSteps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : suggestion.appliedIncentives.length > 0 ? (
            <div>
              <h4 className="text-sm font-semibold mb-3">Applied incentives</h4>
              <ul className="flex flex-col gap-2 text-sm text-black/60 dark:text-white/60">
                {suggestion.appliedIncentives.map((incentive) => (
                  <li
                    key={incentive.incentiveName}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-lg bg-black/2 p-3 dark:bg-white/2 gap-2"
                  >
                    <span className="flex-1 break-words">{incentive.incentiveName}</span>
                    <span className="font-medium text-status-good whitespace-nowrap">
                      {currency.format(incentive.rebateValueUSD)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </Modal>

      <Modal
        open={selectedIncentive !== null}
        onClose={() => setExpandedIncentive(null)}
        title={selectedIncentive?.incentiveName ?? "Incentive details"}
      >
        {selectedIncentive ? (
          <div className="flex flex-col gap-4">
            <div className="rounded-lg border border-status-good/20 bg-status-good/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-status-good">
                {selectedIncentive.type}
              </p>
              <p className="mt-1 text-2xl font-semibold text-status-good">
                {currency.format(selectedIncentive.rebateValueUSD)}
              </p>
              <p className="mt-2 text-sm text-black/70 dark:text-white/75">
                {getIncentiveSummary(selectedIncentive, suggestion)}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <h4 className="text-sm font-semibold">Official source</h4>
              {selectedIncentive.sourceUrl ? (
                <a
                  href={selectedIncentive.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-fit rounded-full bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-900"
                >
                  Open official rebate source
                </a>
              ) : (
                <StatusBadge tone="warning">
                  No official source link is saved for this incentive yet.
                </StatusBadge>
              )}
              {selectedIncentive.sourceLabel ? (
                <p className="text-xs text-black/45 dark:text-white/45">
                  Source: {selectedIncentive.sourceLabel}
                </p>
              ) : null}
            </div>

            <div className="rounded-lg border border-black/10 bg-black/[0.02] p-3 dark:border-white/10 dark:bg-white/[0.04]">
              <h4 className="text-sm font-semibold">What you need to do</h4>
              <p className="mt-1 text-sm text-black/70 dark:text-white/75">
                {getNextStep(selectedIncentive)}
              </p>
              {selectedDeadlineNote ? (
                <p className="mt-1 text-xs text-black/50 dark:text-white/50">
                  Timing: {selectedDeadlineNote}
                </p>
              ) : null}
              {selectedIncentive.stackable === false ? (
                <p className="mt-1 text-xs text-black/50 dark:text-white/50">
                  This program may not stack with other rebates.
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={selectedDocumentsIncentive !== null}
        onClose={() => setExpandedDocuments(null)}
        title={
          selectedDocumentsIncentive
            ? `${selectedDocumentsIncentive.incentiveName} — Paperwork`
            : "Paperwork"
        }
      >
        {selectedDocumentsIncentive ? (
          <div className="flex flex-col gap-4">
            <div className="rounded-lg border border-black/10 bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.04]">
              <p className="text-xs font-semibold uppercase tracking-wide text-black/50 dark:text-white/50">
                Estimated paperwork time
              </p>
              <p className="mt-1 text-2xl font-semibold">
                {selectedDocumentsPaperworkHours !== null
                  ? `~${selectedDocumentsPaperworkHours} ${selectedDocumentsPaperworkHours === 1 ? "hr" : "hrs"}`
                  : "Unknown"}
              </p>
            </div>

            {selectedDocumentsIncentive.requiredDocuments &&
            selectedDocumentsIncentive.requiredDocuments.length > 0 ? (
              <ul className="flex flex-col gap-1.5 text-sm text-black/60 dark:text-white/70">
                {selectedDocumentsIncentive.requiredDocuments.map((document) => (
                  <li
                    key={document.name}
                    className="flex items-center justify-between gap-3 rounded-lg bg-black/[0.02] px-3 py-2 dark:bg-white/[0.04]"
                  >
                    <span>{document.name}</span>
                    <span className="shrink-0 text-xs tabular-nums text-black/45 dark:text-white/45">
                      ~{document.estimatedHours} {document.estimatedHours === 1 ? "hr" : "hrs"}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-black/50 dark:text-white/50">
                Confirm required documents with the program administrator.
              </p>
            )}
          </div>
        ) : null}
      </Modal>
    </>
  );
}
