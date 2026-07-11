"use client";

import { useEffect } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import type { EcoScoreBreakdown } from "@/types";

const SIZE = 140;
const STROKE = 12;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function arcOffset(percent: number) {
  return CIRCUMFERENCE * (1 - percent / 100);
}

function AnimatedScore({ value }: { value: number }) {
  const motionValue = useMotionValue(value);
  const spring = useSpring(motionValue, { stiffness: 110, damping: 20 });
  const rounded = useTransform(spring, (v) => Math.round(v));

  useEffect(() => {
    motionValue.set(value);
  }, [value, motionValue]);

  return <motion.span>{rounded}</motion.span>;
}

interface EcoScoreDisplayProps {
  breakdown: EcoScoreBreakdown;
  potentialScore: number;
  maxPotentialReached?: boolean;
}

export function EcoScoreDisplay({
  breakdown,
  potentialScore,
  maxPotentialReached = false,
}: EcoScoreDisplayProps) {
  const { score, gridBaseline, solarBoost, appliedScore } = breakdown;
  const possibleGain = Math.max(0, potentialScore - score);

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
          {possibleGain > 0 ? (
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              strokeWidth={STROKE}
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={arcOffset(potentialScore)}
              strokeLinecap="round"
              className="stroke-brand-250 transition-[stroke-dashoffset] duration-500"
            />
          ) : null}
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            strokeWidth={STROKE}
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={arcOffset(score)}
            strokeLinecap="round"
            className="stroke-brand-600 transition-[stroke-dashoffset] duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-semibold tabular-nums text-brand-900 dark:text-brand-250">
            <AnimatedScore value={score} />
          </span>
          <span className="text-xs text-black/50 dark:text-white/50">EcoScore</span>
          {possibleGain > 0 ? (
            <span className="mt-1 text-xs font-medium text-status-good">
              +{possibleGain} possible
            </span>
          ) : maxPotentialReached ? (
            <span className="mt-1 text-xs font-medium text-status-good">
              +0 possible
            </span>
          ) : null}
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

      {maxPotentialReached ? (
        <div className="w-full rounded-xl border border-status-good/20 bg-status-good/10 px-4 py-3 text-sm text-status-good sm:w-auto sm:max-w-xs">
          <p className="font-semibold">Maximum EcoScore reached.</p>
          <p className="mt-1 text-xs text-black/60 dark:text-white/70">
            Great job being eco-friendly. You have accepted every active upgrade EcoStep can currently score.
          </p>
        </div>
      ) : null}
    </div>
  );
}
