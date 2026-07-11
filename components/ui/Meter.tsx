interface MeterProps {
  value: number;
  label?: string;
  className?: string;
}

/** Horizontal single-hue magnitude meter (0-100). Not a status gauge — fill color never changes with value. */
export function Meter({ value, label, className = "" }: MeterProps) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className={className}>
      {label ? (
        <div className="mb-1 flex items-center justify-between text-xs text-black/60 dark:text-white/60">
          <span>{label}</span>
          <span className="font-medium text-brand-900 dark:text-brand-250">
            {Math.round(clamped)}%
          </span>
        </div>
      ) : null}
      <div
        role="meter"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        className="h-2.5 w-full overflow-hidden rounded-full bg-brand-100"
      >
        <div
          className="h-full rounded-full bg-brand-600 transition-[width]"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
