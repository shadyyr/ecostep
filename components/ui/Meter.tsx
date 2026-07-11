interface MeterProps {
  value: number;
  label?: string;
  className?: string;
}

/** Horizontal magnitude meter (0-100) with color coding: red (0-33), yellow (34-69), green (70-100). */
export function Meter({ value, label, className = "" }: MeterProps) {
  const clamped = Math.min(100, Math.max(0, value));
  
  let fillColor = "bg-status-warning"; // default yellow
  if (clamped <= 33) {
    fillColor = "bg-status-critical"; // red
  } else if (clamped >= 70) {
    fillColor = "bg-status-good"; // green
  }

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
        className="h-2.5 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10"
      >
        <div
          className={`h-full rounded-full transition-[width] ${fillColor}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
