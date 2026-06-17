import { memo, useId, useMemo } from "react";

type Props = {
  values: readonly number[];
  width?: number;
  height?: number;
  className?: string;
  strokeWidth?: number;
  filled?: boolean;
  showLastDot?: boolean;
};

function buildSmoothPath(coords: { x: number; y: number }[]): string {
  if (coords.length < 2) return "";
  if (coords.length === 2) {
    return `M ${coords[0].x.toFixed(2)} ${coords[0].y.toFixed(2)} L ${coords[1].x.toFixed(2)} ${coords[1].y.toFixed(2)}`;
  }
  let d = `M ${coords[0].x.toFixed(2)} ${coords[0].y.toFixed(2)}`;
  for (let i = 0; i < coords.length - 1; i += 1) {
    const p0 = coords[Math.max(0, i - 1)];
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const p3 = coords[Math.min(coords.length - 1, i + 2)];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d;
}

function Sparkline({
  values,
  width = 120,
  height = 32,
  className,
  strokeWidth = 2,
  filled = false,
  showLastDot = true,
}: Props) {
  const gradId = useId().replace(/:/g, "");
  const lineGradId = `${gradId}-line`;

  const { linePath, areaPath, lastPoint } = useMemo(() => {
    if (values.length < 2) return { linePath: "", areaPath: "", lastPoint: null as { x: number; y: number } | null };
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min || 1;
    const padY = 6;
    const coords = values.map((v, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = height - padY - ((v - min) / range) * (height - padY * 2);
      return { x, y };
    });
    const line = buildSmoothPath(coords);
    const area = `${line} L ${width} ${height} L 0 ${height} Z`;
    return { linePath: line, areaPath: area, lastPoint: coords[coords.length - 1] };
  }, [values, width, height]);

  if (!linePath) return null;

  return (
    <svg
      className={className}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        {filled ? (
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.38" />
            <stop offset="55%" stopColor="currentColor" stopOpacity="0.08" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        ) : null}
        <linearGradient id={lineGradId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.35" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="1" />
        </linearGradient>
      </defs>

      {filled && areaPath ? <path d={areaPath} fill={`url(#${gradId})`} /> : null}

      <path
        d={linePath}
        fill="none"
        stroke={`url(#${lineGradId})`}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {showLastDot && lastPoint ? (
        <circle
          cx={lastPoint.x}
          cy={lastPoint.y}
          r="3.25"
          fill="currentColor"
          className="cabinet-v2-kpi__spark-dot"
        />
      ) : null}
    </svg>
  );
}

export default memo(Sparkline);
