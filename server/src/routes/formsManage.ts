import type { Request, Response } from "express";
import { Router } from "express";
import { z } from "zod";
import { requireFormsManager } from "../middleware/requireFormsManager.js";
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
  owner: z.enum(["admin", "rador"]).optional(),
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

function managerId(req: Request): string {
  const m = (req as Request & { formsManager?: { emailNorm: string } }).formsManager;
  return m?.emailNorm ?? "manager";
}

function ownerFromReq(req: Request): "admin" | "rador" {
  const m = (req as Request & { formsManager?: { kind: string } }).formsManager;
  return m?.kind === "admin" ? "admin" : "rador";
}

export const formsManageRouter = Router();

formsManageRouter.get("/forms/manage/state", requireFormsManager, (_req: Request, res: Response) => {
  res.json({ ok: true, store: loadFormsStore() });
});

formsManageRouter.put("/forms/manage/state", requireFormsManager, (req: Request, res: Response) => {
  const parsed = storeSchema.safeParse(req.body?.store);
  if (!parsed.success) {
    res.status(400).json({ ok: false, error: "Некорректное тело запроса." });
    return;
  }
  const store = saveFormsStore(parsed.data as ReturnType<typeof loadFormsStore>, managerId(req));
  res.json({ ok: true, store });
});

formsManageRouter.get("/forms/manage/monitoring", requireFormsManager, (_req: Request, res: Response) => {
  const store = loadFormsStore();
  res.json({
    ok: true,
    monitoring: buildAllMonitoring(store),
    snapshots: store.snapshots,
  });
});

formsManageRouter.get(
  "/forms/manage/submission/:templateId/:contractorEmail",
  requireFormsManager,
  (req: Request, res: Response) => {
    const templateId = String(req.params.templateId);
    const contractorEmailNorm = String(req.params.contractorEmail).trim().toLowerCase();
    const store = loadFormsStore();
    const template = store.templates.find((t) => t.id === templateId);
    if (!template) {
      res.status(404).json({ ok: false, error: "Шаблон не найден." });
      return;
    }
    const submission = store.submissions.find(
      (s) => s.templateId === templateId && s.contractorEmailNorm === contractorEmailNorm
    );
    res.json({
      ok: true,
      template,
      submission: submission ?? null,
    });
  }
);

formsManageRouter.post("/forms/manage/import", requireFormsManager, async (req: Request, res: Response) => {
  try {
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

    const owner = parsed.data.owner ?? ownerFromReq(req);
    const workbookSheets = parseImportWorkbookSheets(filename, buf);
    const store = loadFormsStore();
    const template = {
      ...createImportedTemplate(title, parsedFile.columns, parsedFile.seedRows),
      owner,
      ownerLabel: owner === "rador" ? "РАДОР" : "Админ",
      importSheets: workbookSheets.length > 1 ? workbookSheets : undefined,
    };
    store.templates.push(template);
    saveFormsStore(store, managerId(req));

    res.status(201).json({
      ok: true,
      template,
      rowCount: parsedFile.seedRows.length,
      sheetName: parsedFile.sheetName ?? null,
      usedAi: parsedFile.usedAi,
      sheetCount: workbookSheets.length || undefined,
    });
  } catch (e) {
    console.error("[forms/manage/import]", e);
    res.status(500).json({
      ok: false,
      error: e instanceof Error ? e.message : "Ошибка импорта на сервере.",
    });
  }
});

formsManageRouter.post("/forms/manage/assign", requireFormsManager, (req: Request, res: Response) => {
  const parsed = assignSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ ok: false, error: "Проверьте шаблон и e-mail подрядчиков." });
    return;
  }
  const store = loadFormsStore();
  const template = store.templates.find((t) => t.id === parsed.data.templateId);
  if (!template) {
    res.status(404).json({ ok: false, error: "Шаблон не найден." });
    return;
  }
  const norms = parsed.data.contractorEmails.map((e) => e.trim().toLowerCase());
  const { store: next, added, addedEmails } = assignTemplateToContractors(
    store,
    template.id,
    norms
  );
  for (const norm of addedEmails) {
    notifyContractorAssigned(template, norm);
  }
  const saved = saveFormsStore(next, managerId(req));
  res.json({ ok: true, added, store: saved });
});
