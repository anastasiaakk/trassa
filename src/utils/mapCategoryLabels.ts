const STORAGE_KEY = "trassa-map-category-labels-v1";

export type MapCategoryLabels = {
  education: string;
  contractors: string;
};

const DEFAULT_LABELS: MapCategoryLabels = {
  education: "ВУЗ / СПО",
  contractors: "Подрядчики",
};

function normalizeLabel(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function loadMapCategoryLabels(): MapCategoryLabels {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_LABELS;
    const data = JSON.parse(raw) as Partial<MapCategoryLabels> | null;
    const education = normalizeLabel(String(data?.education ?? "")) || DEFAULT_LABELS.education;
    const contractors = normalizeLabel(String(data?.contractors ?? "")) || DEFAULT_LABELS.contractors;
    return { education, contractors };
  } catch {
    return DEFAULT_LABELS;
  }
}

export function saveMapCategoryLabels(labels: MapCategoryLabels): void {
  const payload: MapCategoryLabels = {
    education: normalizeLabel(labels.education) || DEFAULT_LABELS.education,
    contractors: normalizeLabel(labels.contractors) || DEFAULT_LABELS.contractors,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  window.dispatchEvent(new CustomEvent("trassa-map-category-labels-changed"));
}

