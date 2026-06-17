import { memo } from "react";

export type KpiIconId = "diamond" | "grid" | "star" | "target" | "forms" | "heart" | "clock";

const LEGACY_ICON_MAP: Record<string, KpiIconId> = {
  "◇": "diamond",
  "◆": "diamond",
  "▦": "grid",
  "★": "star",
  "◎": "target",
  "▣": "forms",
  "♥": "heart",
  "◷": "clock",
};

export function resolveKpiIconId(icon?: string, iconId?: KpiIconId): KpiIconId {
  if (iconId) return iconId;
  if (icon && icon in LEGACY_ICON_MAP) return LEGACY_ICON_MAP[icon];
  return "diamond";
}

type Props = { id: KpiIconId; className?: string };

function KpiMetricIcon({ id, className }: Props) {
  const common = {
    className,
    width: 20,
    height: 20,
    viewBox: "0 0 20 20",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    "aria-hidden": true,
  } as const;

  switch (id) {
    case "grid":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
          <rect x="11" y="3" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
          <rect x="3" y="11" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
          <rect x="11" y="11" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      );
    case "star":
      return (
        <svg {...common}>
          <path
            d="M10 3.2l1.55 3.14 3.47.5-2.51 2.45.59 3.46L10 11.2l-3.1 1.63.59-3.46-2.51-2.45 3.47-.5L10 3.2z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "target":
      return (
        <svg {...common}>
          <circle cx="10" cy="10" r="6.5" stroke="currentColor" strokeWidth="1.6" />
          <circle cx="10" cy="10" r="2.2" fill="currentColor" />
        </svg>
      );
    case "forms":
      return (
        <svg {...common}>
          <rect x="4" y="3" width="12" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
          <path d="M7 8h6M7 11h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case "heart":
      return (
        <svg {...common}>
          <path
            d="M10 16s-5.2-3.4-5.2-7.2C4.8 6.6 6.8 5 10 7.2 13.2 5 15.2 6.6 15.2 8.8 15.2 12.6 10 16 10 16z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "clock":
      return (
        <svg {...common}>
          <circle cx="10" cy="10" r="6.5" stroke="currentColor" strokeWidth="1.6" />
          <path d="M10 6.5V10l2.8 1.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case "diamond":
    default:
      return (
        <svg {...common}>
          <path
            d="M10 3.5 15.5 10 10 16.5 4.5 10 10 3.5z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      );
  }
}

export default memo(KpiMetricIcon);
