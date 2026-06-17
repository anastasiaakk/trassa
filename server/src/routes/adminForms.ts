import type { Request, Response } from "express";
import { Router } from "express";
import { z } from "zod";
import { requireAdmin } from "../middleware/adminAuth.js";
import {
  assignTemplateToContractors,
  createImportedTemplate,
  loadFormsStore,
  saveFormsStore,
  buildAllMonitoring,
} from "../formsStore.js";
import { notifyContractorAssigned } from "../formAlerts.js";
import { parseImportFileSmart } from "../importParseAi.js";
import { parseImportWorkbookSheets } from "../importParse.js";

const storeSchema = z.object({
  version: z.literal(1),
  templates: z.array(z.unknown()),
  assignments: z.array(z.unknown()),
  submissions: z.array(z.unknown()),
  snapshots: z.array(z.unknown()),
});

const importSchema = z.object({
  title: z.string().max(120).optional(),
  filename: z.string().max(200).optional(),
  dataBase64: z.string().min(1).max(12_000_000),
});

const assignSchema = z.object({
  templateId: z.string().min(1).max(80),
  contractorEmails: z
    .array(z.union([z.string(), z.number()]))
    .min(1)
    .max(200)
    .transform((arr) =>
      arr
        .map((e) => String(e).trim().toLowerCase())
        .filter((e) => e.length >= 3 && e.includes("@"))
    )
    .pipe(z.array(z.string()).min(1).max(200)),
});

export const adminFormsRouter = Router();

adminFormsRouter.get("/forms/state", requireAdmin, (_req: Request, res: Response) => {
  res.json({ ok: true, store: saveFormsStore(loadFormsStore()) });
});

adminFormsRouter.put("/forms/state", requireAdmin, (req: Request, res: Response) => {
  const parsed = storeSchema.safeParse(req.body?.store);
  if (!parsed.success) {
    res.status(400).json({ ok: false, error: "Некорректное тело запроса." });
    return;
  }
  const store = saveFormsStore(parsed.data as ReturnType<typeof loadFormsStore>);
  res.json({ ok: true, store });
});

adminFormsRouter.get("/forms/monitoring", requireAdmin, (_req: Request, res: Response) => {
  const store = loadFormsStore();
  res.json({
    ok: true,
    monitoring: buildAllMonitoring(store),
    snapshots: store.snapshots,
  });
});

adminFormsRouter.post("/forms/import", requireAdmin, async (req: Request, res: Response) => {
  const parsed = importSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ ok: false, error: "Некорректный файл для импорта." });
    return;
  }

  const buf = Buffer.from(parsed.data.dataBase64, "base64");
  const filename = parsed.data.filename ?? "import.dat";
  const parsedFile = await parseImportFileSmart(filename, buf);
  if (!parsedFile.ok) {
    res.status(400).json({ ok: false, error: parsedFile.error });
    return;
  }

  const title =
    parsed.data.title?.trim() ||
    filename.replace(/\.[^.]+$/, "").trim() ||
    "Импортированная таблица";

  const workbookSheets = parseImportWorkbookSheets(filename, buf);
  const store = loadFormsStore();
  const template = {
    ...createImportedTemplate(title, parsedFile.columns, parsedFile.seedRows),
    owner: "admin" as const,
    ownerLabel: "Админ",
    importSheets: workbookSheets.length > 1 ? workbookSheets : undefined,
  };
  store.templates.push(template);
  const saved = saveFormsStore(store);

  res.status(201).json({
    ok: true,
    template,
    store: saved,
    rowCount: parsedFile.seedRows.length,
    sheetName: parsedFile.sheetName ?? null,
    usedAi: parsedFile.usedAi,
    sheetCount: workbookSheets.length || undefined,
  });
});

adminFormsRouter.post("/forms/assign", requireAdmin, (req: Request, res: Response) => {
  const parsed = assignSchema.safeParse(req.body);
  if (!parsed.success) {
    const body = req.body as { templateId?: unknown; contractorEmails?: unknown } | null;
    if (!body?.templateId || String(body.templateId).trim().length === 0) {
      res.status(400).json({ ok: false, error: "Не выбран шаблон (templateId)." });
      return;
    }
    const raw = body?.contractorEmails;
    if (!Array.isArray(raw) || raw.length === 0) {
      res.status(400).json({
        ok: false,
        error: "Список e-mail подрядчиков пуст. Добавьте пользователей-подрядчиков или введите адреса.",
      });
      return;
    }
    res.status(400).json({
      ok: false,
      error: "Проверьте e-mail подрядчиков (нужен формат name@domain.ru).",
    });
    return;
  }
  const store = loadFormsStore();
  const template = store.templates.find((t) => t.id === parsed.data.templateId);
  if (!template) {
    res.status(404).json({ ok: false, error: "Шаблон не найден." });
    return;
  }
  const norms = parsed.data.contractorEmails.map((e) => e.trim().toLowerCase());
  const { store: next, added, addedEmails } = assignTemplateToContractors(store, template.id, norms);
  for (const norm of addedEmails) {
    notifyContractorAssigned(template, norm);
  }
  const saved = saveFormsStore(next);
  res.json({ ok: true, added, store: saved });
});
