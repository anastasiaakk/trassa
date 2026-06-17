import type { Request, Response } from "express";
import { Router } from "express";
import { z } from "zod";
import { requireAuthOrAdmin } from "../middleware/requireAuthOrAdmin.js";
import {
  buildAllMonitoring,
  loadFormsStore,
  saveFormsStore,
  type FormGridRow,
} from "../formsStore.js";
import { PORTAL_KEYS } from "../portalKeys.js";
import { db } from "../db.js";
import { loadAlertsPublic, markAlertRead } from "../formAlerts.js";
import { fillSubmissionFromUploadedFile } from "../formFillFromFile.js";

const gridRowSchema = z.object({
  id: z.string().min(1).max(80),
  cells: z.record(z.union([z.string(), z.number(), z.boolean()])),
});

const sheetDataSchema = z.object({
  cells: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
  rows: z.array(gridRowSchema).max(500).optional(),
});

const saveSchema = z.object({
  cells: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
  rows: z.array(gridRowSchema).max(500).optional(),
  sheets: z.record(sheetDataSchema).optional(),
  submit: z.boolean().optional(),
});

const fillFromFileSchema = z.object({
  filename: z.string().min(1).max(260),
  dataBase64: z.string().min(8).max(12_000_000),
  cells: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
  rows: z.array(gridRowSchema).max(500).optional(),
});

export const contractorFormsRouter = Router();

function normalizeSubmissionSheets(
  sheets:
    | Record<string, { cells?: Record<string, unknown>; rows?: FormGridRow[] }>
    | undefined
): Record<string, { cells: Record<string, unknown>; rows?: FormGridRow[] }> | undefined {
  if (!sheets) return undefined;
  return Object.fromEntries(
    Object.entries(sheets).map(([id, sheet]) => [
      id,
      { cells: sheet.cells ?? {}, rows: sheet.rows },
    ])
  );
}

contractorFormsRouter.get("/forms/assigned", requireAuthOrAdmin, (req: Request, res: Response) => {
  const auth = (req as Request & { auth?: { emailNorm: string } }).auth;
  if (!auth?.emailNorm) {
    res.status(401).json({ ok: false, error: "Требуется вход." });
    return;
  }
  const store = loadFormsStore();
  const assignedIds = new Set(
    store.assignments
      .filter((a) => a.contractorEmailNorm === auth.emailNorm)
      .map((a) => a.templateId)
  );
  const templates = store.templates.filter((t) => t.active && assignedIds.has(t.id));
  const submissions = store.submissions.filter((s) => s.contractorEmailNorm === auth.emailNorm);
  res.json({ ok: true, templates, submissions });
});

contractorFormsRouter.post(
  "/forms/submissions/:templateId/fill-from-file",
  requireAuthOrAdmin,
  async (req: Request, res: Response) => {
    const auth = (req as Request & { auth?: { emailNorm: string } }).auth;
    if (!auth?.emailNorm) {
      res.status(401).json({ ok: false, error: "Требуется вход." });
      return;
    }
    const templateId = String(req.params.templateId);
    const parsed = fillFromFileSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ ok: false, error: "Некорректный файл." });
      return;
    }
    const store = loadFormsStore();
    const template = store.templates.find((t) => t.id === templateId && t.active);
    const assigned = store.assignments.some(
      (a) => a.templateId === templateId && a.contractorEmailNorm === auth.emailNorm
    );
    if (!template || !assigned) {
      res.status(403).json({ ok: false, error: "Таблица не назначена вам." });
      return;
    }

    let buf: Buffer;
    try {
      buf = Buffer.from(parsed.data.dataBase64, "base64");
    } catch {
      res.status(400).json({ ok: false, error: "Не удалось прочитать файл." });
      return;
    }
    if (buf.length > 8 * 1024 * 1024) {
      res.status(400).json({ ok: false, error: "Файл слишком большой (макс. 8 МБ)." });
      return;
    }

    const result = await fillSubmissionFromUploadedFile(
      template,
      parsed.data.filename,
      buf,
      {
        cells: parsed.data.cells ?? {},
        rows: parsed.data.rows,
      }
    );
    if (!result.ok) {
      res.status(400).json(result);
      return;
    }
    res.json({
      ok: true,
      cells: result.cells,
      rows: result.rows,
      message: result.message,
      usedAi: result.usedAi,
      mappedColumns: result.mappedColumns,
    });
  }
);

contractorFormsRouter.put(
  "/forms/submissions/:templateId",
  requireAuthOrAdmin,
  (req: Request, res: Response) => {
    const auth = (req as Request & { auth?: { emailNorm: string } }).auth;
    if (!auth?.emailNorm) {
      res.status(401).json({ ok: false, error: "Требуется вход." });
      return;
    }
    const templateId = String(req.params.templateId);
    const parsed = saveSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ ok: false, error: "Некорректные данные." });
      return;
    }
    const store = loadFormsStore();
    const assigned = store.assignments.some(
      (a) => a.templateId === templateId && a.contractorEmailNorm === auth.emailNorm
    );
    if (!assigned) {
      res.status(403).json({ ok: false, error: "Таблица не назначена вам." });
      return;
    }
    const now = new Date().toISOString();
    const idx = store.submissions.findIndex(
      (s) => s.templateId === templateId && s.contractorEmailNorm === auth.emailNorm
    );
    const cells = (parsed.data.cells ?? {}) as Record<string, unknown>;
    const rows = parsed.data.rows as FormGridRow[] | undefined;
    const sheets = normalizeSubmissionSheets(
      parsed.data.sheets as
        | Record<string, { cells?: Record<string, unknown>; rows?: FormGridRow[] }>
        | undefined
    );
    if (idx >= 0) {
      const cur = store.submissions[idx];
      store.submissions[idx] = {
        ...cur,
        cells,
        rows: rows ?? cur.rows,
        sheets: sheets ?? cur.sheets,
        updatedAt: now,
        submittedAt: parsed.data.submit ? now : cur.submittedAt,
      };
    } else {
      store.submissions.push({
        id: `sub-${Date.now()}`,
        templateId,
        contractorEmailNorm: auth.emailNorm,
        cells,
        rows,
        sheets,
        updatedAt: now,
        submittedAt: parsed.data.submit ? now : null,
      });
    }
    saveFormsStore(store, auth.emailNorm);
    res.json({ ok: true });
  }
);

/** Дашборд для РАДОР / АДО — без авторизации (агрегированные данные). */
contractorFormsRouter.get("/forms/rador-dashboard", (_req: Request, res: Response) => {
  const row = db
    .prepare("SELECT value_json FROM portal_kv WHERE key = ?")
    .get(PORTAL_KEYS.FORM_RADOR_MONITORING) as { value_json: string } | undefined;

  if (row) {
    try {
      const data = JSON.parse(row.value_json) as {
        updatedAt?: string;
        monitoring?: unknown[];
        snapshots?: unknown[];
      };
      res.json({
        ok: true,
        updatedAt: data.updatedAt ?? null,
        monitoring: data.monitoring ?? [],
        snapshots: data.snapshots ?? [],
      });
      return;
    } catch {
      /* fall through */
    }
  }

  const store = saveFormsStore(loadFormsStore());
  res.json({
    ok: true,
    updatedAt: new Date().toISOString(),
    monitoring: buildAllMonitoring(store),
    snapshots: store.snapshots,
  });
});

contractorFormsRouter.get("/forms/snapshots", requireAuthOrAdmin, (_req: Request, res: Response) => {
  const store = loadFormsStore();
  res.json({ ok: true, snapshots: store.snapshots });
});

contractorFormsRouter.get("/forms/alerts", requireAuthOrAdmin, (req: Request, res: Response) => {
  const auth = (req as Request & { auth?: { emailNorm: string } }).auth;
  const admin = (req as Request & { adminAuth?: { emailNorm: string } }).adminAuth;
  const store = loadAlertsPublic();
  if (admin) {
    res.json({ ok: true, alerts: store.alerts });
    return;
  }
  if (!auth?.emailNorm) {
    res.status(401).json({ ok: false, error: "Требуется вход." });
    return;
  }
  const alerts = store.alerts.filter(
    (a) => a.audience === "contractor" && a.emailNorm === auth.emailNorm
  );
  res.json({ ok: true, alerts });
});

contractorFormsRouter.get("/forms/rador-alerts", (_req: Request, res: Response) => {
  const store = loadAlertsPublic();
  res.json({
    ok: true,
    alerts: store.alerts.filter((a) => a.audience === "rador"),
    unread: store.alerts.filter((a) => a.audience === "rador" && !a.read).length,
  });
});

contractorFormsRouter.patch("/forms/alerts/:id/read", requireAuthOrAdmin, (req: Request, res: Response) => {
  const id = String(req.params.id);
  if (!markAlertRead(id)) {
    res.status(404).json({ ok: false, error: "Не найдено." });
    return;
  }
  res.json({ ok: true });
});
