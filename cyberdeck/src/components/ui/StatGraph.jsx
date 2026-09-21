import { useId, useMemo } from 'react';
import { cn } from '../../lib/cn';

/** Build a smooth-ish polyline path across the normalised series. */
function buildPath(series, width, height) {
  if (series.length === 0) return { line: '', area: '' };
  const step = width / Math.max(1, series.length - 1);
  const points = series.map((value, index) => {
    const x = index * step;
    const y = height - (Math.min(100, Math.max(0, value)) / 100) * height;
    return [x, y];
  });

  const line = points
    .map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(' ');
  const area = `${line} L${width},${height} L0,${height} Z`;
  return { line, area };
}

/**
 * Live sparkline for a simulated telemetry channel. The trace is redrawn from
 * the series each render — no animation library needed, the data itself moves.
 */
export function StatGraph({
  series,
  color = '#22e4ff',
  label,
  value,
  unit = '%',
  height = 34,
  width = 120,
  className,
  warnAbove,
}) {
  const gradientId = useId();
  const { line, area } = useMemo(() => buildPath(series, width, height), [series, width, height]);
  const latest = value ?? series[series.length - 1] ?? 0;
  const isWarning = warnAbove !== undefined && latest >= warnAbove;
  const traceColor = isWarning ? '#ff3d5a' : color;

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label ? (
        <div className="flex items-baseline justify-between gap-2">
          <span className="label-hud">{label}</span>
          <span
            className="font-mono text-xs tabular-nums"
            style={{ color: traceColor, textShadow: `0 0 8px ${traceColor}99` }}
          >
            {Math.round(latest)}
            <span className="ml-0.5 text-[9px] opacity-70">{unit}</span>
          </span>
        </div>
      ) : null}

      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="w-full"
        style={{ height }}
        role="img"
        aria-label={`${label ?? 'Telemetry'}: ${Math.round(latest)}${unit}`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={traceColor} stopOpacity="0.45" />
            <stop offset="100%" stopColor={traceColor} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Baseline grid so the trace has something to read against. */}
        {[0.25, 0.5, 0.75].map((fraction) => (
          <line
            key={fraction}
            x1="0"
            x2={width}
            y1={height * fraction}
            y2={height * fraction}
            stroke="currentColor"
            className="text-cyan-400/10"
            strokeWidth="0.5"
          />
        ))}

        <path d={area} fill={`url(#${gradientId})`} />
        <path
          d={line}
          fill="none"
          stroke={traceColor}
          strokeWidth="1.4"
          strokeLinejoin="round"
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 3px ${traceColor})` }}
        />
        <circle
          cx={width}
          cy={height - (Math.min(100, Math.max(0, latest)) / 100) * height}
          r="1.8"
          fill={traceColor}
          style={{ filter: `drop-shadow(0 0 4px ${traceColor})` }}
        />
      </svg>
    </div>
  );
}
