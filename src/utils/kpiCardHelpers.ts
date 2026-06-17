import type { CabinetKpiTrend } from "../components/CabinetKpiCard";

/** Форматирование целого для KPI (пробелы между тысячами). */
export function formatKpiCount(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("ru-RU").format(Math.max(0, Math.round(n)));
}

export function kpiTrendFromCount(count: number): CabinetKpiTrend {
  if (count > 0) return "up";
  return "neutral";
}

export function kpiDeltaBadge(count: number): string | undefined {
  if (count <= 0) return undefined;
  return `+${formatKpiCount(count)}`;
}
