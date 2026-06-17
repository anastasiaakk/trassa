export type AdminKpiItem = {
  id: string;
  label: string;
  value: string;
  trend: "up" | "down" | "neutral";
  trendLabel?: string;
  insight: string;
};
