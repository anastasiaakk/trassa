import { useId, useMemo } from "react";
import { usePortalDesign } from "../../design-system/usePortalDesign";
import { V2_PALETTE, V2_RGB } from "../../design-system/portal-v2/v2-tokens";
import { formatChartAxis } from "../../utils/adminChartData";
import styles from "./AdminGlassAreaChart.module.css";

type Props = {
  title: string;
  meta?: string;
  labels: string[];
  values: number[];
  emptyHint?: string;
  /** «map» — полупрозрачные плашки как у блока карты на /services */
  variant?: "dark" | "map";
  /** Без верхнего отступа (внутри диалога / вложенный блок) */
  embedded?: boolean;
  className?: string;
};

const W = 400;
const H = 160;
const PAD = { top: 12, right: 12, bottom: 28, left: 44 };

function smoothLinePath(xs: number[], ys: number[]): string {
  if (xs.length === 0) return "";
  if (xs.length === 1) return `M ${xs[0]} ${ys[0]}`;
  let d = `M ${xs[0]} ${ys[0]}`;
  for (let i = 0; i < xs.length - 1; i++) {
    const x0 = xs[i]!;
    const y0 = ys[i]!;
    const x1 = xs[i + 1]!;
    const y1 = ys[i + 1]!;
    const mx = (x0 + x1) / 2;
    d += ` C ${mx} ${y0}, ${mx} ${y1}, ${x1} ${y1}`;
  }
  return d;
}

export default function AdminGlassAreaChart({
  title,
  meta,
  labels,
  values,
  emptyHint = "Пока нет данных за выбранный период.",
  variant = "dark",
  embedded = false,
  className = "",
}: Props) {
  const portalV2 = usePortalDesign() === "v2";
  const mapTone = variant === "map";
  const gridStroke = portalV2
    ? `rgba(${V2_RGB.ink}, 0.14)`
    : mapTone
      ? "rgba(10, 37, 64, 0.14)"
      : "rgba(255,255,255,0.06)";
  const axisFill = portalV2
    ? V2_PALETTE.muted
    : mapTone
      ? "#4a5f78"
      : "rgba(103,232,249,0.5)";
  const xFill = portalV2
    ? V2_PALETTE.muted
    : mapTone
      ? "#3d5068"
      : "rgba(103,232,249,0.55)";
  const strokeColor = portalV2 ? V2_PALETTE.primary : "#67e8f9";
  const fillStops = portalV2
    ? [
        { offset: "0%", color: V2_PALETTE.primary, opacity: 0.55 },
        { offset: "45%", color: V2_PALETTE.primary, opacity: 0.28 },
        { offset: "100%", color: V2_PALETTE.ink, opacity: 0.05 },
      ]
    : [
        { offset: "0%", color: "#67e8f9", opacity: 0.55 },
        { offset: "45%", color: "#00d4a5", opacity: 0.28 },
        { offset: "100%", color: "#0a2540", opacity: 0.05 },
      ];
  const uid = useId().replace(/:/g, "");
  const fillId = `ag-fill-${uid}`;
  const glowId = `ag-glow-${uid}`;

  const geometry = useMemo(() => {
    const innerW = W - PAD.left - PAD.right;
    const innerH = H - PAD.top - PAD.bottom;
    const n = values.length;
    if (n === 0) return null;

    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const span = Math.max(max - min, 1);

    const xs = values.map((_, i) =>
      PAD.left + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW)
    );
    const ys = values.map((v) => PAD.top + innerH - ((v - min) / span) * innerH);
    const baseY = PAD.top + innerH;

    const line = smoothLinePath(xs, ys);
    const area = `${line} L ${xs[xs.length - 1]!} ${baseY} L ${xs[0]!} ${baseY} Z`;

    const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => {
      const val = min + span * (1 - t);
      const y = PAD.top + innerH * t;
      return { y, label: formatChartAxis(val) };
    });

    const xStep = n <= 6 ? 1 : Math.ceil(n / 6);
    const xTicks = labels
      .map((label, i) => ({ label, i }))
      .filter((_, i) => i % xStep === 0 || i === n - 1);

    return { line, area, xs, ys, yTicks, xTicks, innerW, innerH, baseY, max };
  }, [labels, values]);

  const hasData = values.some((v) => v > 0);

  return (
    <section
      className={`${styles.chartBlock} ${mapTone ? styles.chartBlockMap : ""} ${embedded ? styles.chartBlockEmbedded : ""} ${className}`.trim()}
      aria-label={title}
    >
      <div className={styles.chartHead}>
        <h3 className={styles.chartTitle}>{title}</h3>
        {meta ? <p className={styles.chartMeta}>{meta}</p> : null}
      </div>

      {!geometry || !hasData ? (
        <p className={styles.chartEmpty}>{emptyHint}</p>
      ) : (
        <div className={styles.chartSvgWrap}>
          <svg
            className={styles.chartSvg}
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-label={`${title}: график`}
          >
            <defs>
              <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                {fillStops.map((s) => (
                  <stop key={s.offset} offset={s.offset} stopColor={s.color} stopOpacity={s.opacity} />
                ))}
              </linearGradient>
              <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {geometry.yTicks.map((t) => (
              <g key={t.label}>
                <line
                  x1={PAD.left}
                  x2={W - PAD.right}
                  y1={t.y}
                  y2={t.y}
                  stroke={gridStroke}
                  strokeWidth="1"
                />
                <text
                  x={PAD.left - 8}
                  y={t.y + 4}
                  textAnchor="end"
                  fill={axisFill}
                  fontSize="9"
                  fontWeight="500"
                  fontFamily="var(--font-ui)"
                  style={{ letterSpacing: "-0.01em", fontVariantNumeric: "normal" }}
                >
                  {t.label}
                </text>
              </g>
            ))}

            <path d={geometry.area} fill={`url(#${fillId})`} />
            <path
              d={geometry.line}
              fill="none"
              stroke={strokeColor}
              strokeWidth="2.5"
              strokeLinecap="round"
              filter={`url(#${glowId})`}
            />
            <path
              d={geometry.line}
              fill="none"
              stroke={V2_PALETTE.white}
              strokeWidth="1"
              strokeOpacity="0.35"
              strokeLinecap="round"
            />

            {geometry.xTicks.map(({ label, i }) => (
              <text
                key={`${label}-${i}`}
                x={geometry.xs[i]}
                y={H - 8}
                textAnchor="middle"
                fill={xFill}
                fontSize="9.5"
                fontWeight="500"
                fontFamily="var(--font-ui)"
                style={{ letterSpacing: "-0.015em", fontVariantNumeric: "normal" }}
              >
                {label}
              </text>
            ))}
          </svg>
        </div>
      )}
    </section>
  );
}
