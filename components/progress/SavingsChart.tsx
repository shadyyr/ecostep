const WIDTH = 600;
const HEIGHT = 200;
const PADDING_LEFT = 56;
const PADDING_RIGHT = 12;
const PADDING_TOP = 16;
const PADDING_BOTTOM = 28;

const TONE_CLASSES: Record<"brand" | "good", { stroke: string; fill: string; text: string }> = {
  brand: { stroke: "stroke-brand-600 dark:stroke-brand-250", fill: "fill-brand-600/10 dark:fill-brand-250/10", text: "text-brand-700 dark:text-brand-250" },
  good: { stroke: "stroke-status-good", fill: "fill-status-good/10", text: "text-status-good" },
};

interface SavingsChartProps {
  label: string;
  points: { month: number; value: number }[];
  tone: "brand" | "good";
  formatValue: (v: number) => string;
}

export function SavingsChart({ label, points, tone, formatValue }: SavingsChartProps) {
  const toneClasses = TONE_CLASSES[tone];
  const maxMonth = points.length > 0 ? points[points.length - 1].month : 0;
  const maxValue = Math.max(1, ...points.map((p) => p.value));
  const plotWidth = WIDTH - PADDING_LEFT - PADDING_RIGHT;
  const plotHeight = HEIGHT - PADDING_TOP - PADDING_BOTTOM;

  function scaleX(month: number) {
    return PADDING_LEFT + (maxMonth > 0 ? (month / maxMonth) * plotWidth : 0);
  }
  function scaleY(value: number) {
    return PADDING_TOP + plotHeight - (value / maxValue) * plotHeight;
  }

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${scaleX(p.month)} ${scaleY(p.value)}`)
    .join(" ");
  const areaPath =
    points.length > 0
      ? `${linePath} L ${scaleX(points[points.length - 1].month)} ${scaleY(0)} L ${scaleX(points[0].month)} ${scaleY(0)} Z`
      : "";

  const gridLineCount = 4;
  const gridLines = Array.from({ length: gridLineCount + 1 }, (_, i) => {
    const value = (maxValue / gridLineCount) * i;
    return { value, y: scaleY(value) };
  });

  const finalPoint = points[points.length - 1];

  return (
    <div className="rounded-2xl border border-black/10 p-4 dark:border-white/15">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{label}</h3>
        {finalPoint ? (
          <span className={`text-sm font-semibold ${toneClasses.text}`}>
            {formatValue(finalPoint.value)} by month {finalPoint.month}
          </span>
        ) : null}
      </div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-auto w-full" role="img" aria-label={`${label} projection chart`}>
        {gridLines.map((line) => (
          <g key={line.value}>
            <line
              x1={PADDING_LEFT}
              x2={WIDTH - PADDING_RIGHT}
              y1={line.y}
              y2={line.y}
              className="stroke-black/10 dark:stroke-white/10"
              strokeWidth={1}
            />
            <text
              x={PADDING_LEFT - 8}
              y={line.y + 3}
              textAnchor="end"
              className="fill-black/40 text-[9px] dark:fill-white/40"
            >
              {formatValue(line.value)}
            </text>
          </g>
        ))}

        {areaPath ? <path d={areaPath} className={toneClasses.fill} stroke="none" /> : null}
        {linePath ? (
          <path d={linePath} fill="none" className={toneClasses.stroke} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        ) : null}
        {finalPoint ? (
          <circle cx={scaleX(finalPoint.month)} cy={scaleY(finalPoint.value)} r={4} className={toneClasses.stroke} strokeWidth={2} fill="white" />
        ) : null}

        <text x={PADDING_LEFT} y={HEIGHT - 8} textAnchor="start" className="fill-black/40 text-[9px] dark:fill-white/40">
          Today
        </text>
        {maxMonth > 0 ? (
          <text x={WIDTH - PADDING_RIGHT} y={HEIGHT - 8} textAnchor="end" className="fill-black/40 text-[9px] dark:fill-white/40">
            Month {maxMonth}
          </text>
        ) : null}
      </svg>
    </div>
  );
}
