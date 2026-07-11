import type { EcoScoreBreakdown } from "@/types";

const SIZE = 140;
const STROKE = 12;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function EcoScoreDisplay({ breakdown }: { breakdown: EcoScoreBreakdown }) {
  const { score, gridBaseline, solarBoost, appliedScore } = breakdown;
  const offset = CIRCUMFERENCE * (1 - score / 100);

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
      <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} className="-rotate-90">
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            strokeWidth={STROKE}
            className="stroke-brand-100"
          />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            strokeWidth={STROKE}
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="stroke-brand-600 transition-[stroke-dashoffset] duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-semibold tabular-nums text-brand-900 dark:text-brand-250">
            {score}
          </span>
          <span className="text-xs text-black/50 dark:text-white/50">EcoScore</span>
        </div>
      </div>

      <dl className="grid w-full grid-cols-3 gap-2 text-center sm:text-left">
        <div>
          <dt className="text-xs text-black/50 dark:text-white/50">Grid baseline</dt>
          <dd className="text-lg font-medium tabular-nums">{Math.round(gridBaseline)}</dd>
        </div>
        <div>
          <dt className="text-xs text-black/50 dark:text-white/50">Solar bonus</dt>
          <dd className="text-lg font-medium tabular-nums">{solarBoost}</dd>
        </div>
        <div>
          <dt className="text-xs text-black/50 dark:text-white/50">Upgrades applied</dt>
          <dd className="text-lg font-medium tabular-nums">{Math.round(appliedScore)}</dd>
        </div>
      </dl>
    </div>
  );
}
