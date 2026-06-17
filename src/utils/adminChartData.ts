/** Построение рядов для диаграмм админ-панели (по дням). */

export type DailySeries = {
  labels: string[];
  values: number[];
  total: number;
};

const DAY_MS = 86_400_000;

function startOfDay(d: Date): number {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

function formatDayLabel(d: Date): string {
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
}

/** Последние `days` календарных дней (включая сегодня). */
export function lastDayBuckets(days: number): Date[] {
  const n = Math.max(1, Math.min(days, 60));
  const today = startOfDay(new Date());
  return Array.from({ length: n }, (_, i) => {
    const t = today - (n - 1 - i) * DAY_MS;
    return new Date(t);
  });
}

/** Новые регистрации по дням. */
export function buildRegistrationsPerDay(
  createdAtList: string[],
  days = 14
): DailySeries {
  const buckets = lastDayBuckets(days);
  const keys = buckets.map((d) => startOfDay(d));
  const values = keys.map(() => 0);

  for (const raw of createdAtList) {
    const t = startOfDay(new Date(raw));
    const idx = keys.indexOf(t);
    if (idx >= 0) values[idx] += 1;
  }

  return {
    labels: buckets.map(formatDayLabel),
    values,
    total: values.reduce((a, b) => a + b, 0),
  };
}

/** Накопительный итог зарегистрированных (на конец каждого дня). */
export function buildRegistrationsCumulative(
  createdAtList: string[],
  days = 14
): DailySeries {
  const perDay = buildRegistrationsPerDay(createdAtList, days);
  const before = createdAtList.filter((raw) => {
    const t = startOfDay(new Date(raw));
    return t < startOfDay(lastDayBuckets(days)[0]!);
  }).length;

  let run = before;
  const values = perDay.values.map((n) => {
    run += n;
    return run;
  });

  return {
    labels: perDay.labels,
    values,
    total: createdAtList.length,
  };
}

/** Сбои / ошибки по дням. */
export function buildEventsPerDay(
  eventTimes: string[],
  days = 14
): DailySeries {
  return buildRegistrationsPerDay(eventTimes, days);
}

export function formatChartAxis(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${Math.round(n / 1000)}k`;
  return String(Math.round(n));
}
