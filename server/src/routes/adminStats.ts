import type { Request, Response } from "express";
import { Router } from "express";
import { db } from "../db.js";
import { requireAdmin } from "../middleware/adminAuth.js";

const DAY_MS = 86_400_000;

function startOfDay(d: Date): number {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

function dayBuckets(days: number): { key: number; label: string }[] {
  const n = Math.max(1, Math.min(days, 60));
  const today = startOfDay(new Date());
  return Array.from({ length: n }, (_, i) => {
    const t = today - (n - 1 - i) * DAY_MS;
    const d = new Date(t);
    return {
      key: t,
      label: d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" }),
    };
  });
}

function countByDay(
  rows: { created_at: string }[],
  buckets: { key: number; label: string }[]
): number[] {
  const keys = buckets.map((b) => b.key);
  const counts = keys.map(() => 0);
  for (const row of rows) {
    const t = startOfDay(new Date(row.created_at));
    const idx = keys.indexOf(t);
    if (idx >= 0) counts[idx] += 1;
  }
  return counts;
}

function cumulative(values: number[], before: number): number[] {
  let run = before;
  return values.map((n) => {
    run += n;
    return run;
  });
}

export const adminStatsRouter = Router();

adminStatsRouter.get("/stats", requireAdmin, (req: Request, res: Response) => {
  const days = Math.max(1, Math.min(Number(req.query.days) || 14, 60));
  const buckets = dayBuckets(days);
  const firstKey = buckets[0]?.key ?? startOfDay(new Date());

  const userRows = db
    .prepare("SELECT created_at FROM users ORDER BY created_at ASC")
    .all() as Array<{ created_at: string }>;

  const perDay = countByDay(userRows, buckets);
  const before = userRows.filter((r) => startOfDay(new Date(r.created_at)) < firstKey).length;
  const cumulativeUsers = cumulative(perDay, before);

  const eventRows = db
    .prepare(
      `SELECT created_at FROM client_events
       WHERE kind IN ('error', 'crash', 'rejection')
       ORDER BY created_at DESC
       LIMIT 5000`
    )
    .all() as Array<{ created_at: string }>;

  const incidentsPerDay = countByDay(eventRows, buckets);

  res.json({
    ok: true,
    days,
    registrations: {
      labels: buckets.map((b) => b.label),
      values: cumulativeUsers,
      totalUsers: userRows.length,
    },
    incidents: {
      labels: buckets.map((b) => b.label),
      values: incidentsPerDay,
      totalIncidents: eventRows.length,
    },
  });
});

adminStatsRouter.get("/incidents", requireAdmin, (req: Request, res: Response) => {
  const limit = Math.max(1, Math.min(Number(req.query.limit) || 100, 500));
  const rows = db
    .prepare(
      `SELECT id, kind, message, created_at
       FROM client_events
       WHERE kind IN ('error', 'crash', 'rejection')
       ORDER BY created_at DESC
       LIMIT ?`
    )
    .all(limit) as Array<{ id: string; kind: string; message: string; created_at: string }>;

  res.json({
    ok: true,
    events: rows.map((r) => ({
      id: r.id,
      kind: r.kind,
      message: r.message,
      createdAt: r.created_at,
    })),
  });
});

adminStatsRouter.delete("/incidents", requireAdmin, (_req: Request, res: Response) => {
  const result = db
    .prepare(
      `DELETE FROM client_events WHERE kind IN ('error', 'crash', 'rejection')`
    )
    .run();
  res.json({ ok: true, deleted: result.changes });
});
