import type { Request, Response } from "express";
import { Router } from "express";
import { z } from "zod";
import { readAppUpdateManifest, writeAppUpdateManifest } from "../appUpdateStore.js";
import { requireAdmin } from "../middleware/adminAuth.js";

export const appUpdateRouter = Router();

/** Манифест для установленных приложений (Electron update-check). */
appUpdateRouter.get("/manifest", (_req: Request, res: Response) => {
  const m = readAppUpdateManifest();
  res.json({
    version: m.version,
    setupUrl: m.setupUrl,
    releaseNotes: m.releaseNotes,
  });
});

appUpdateRouter.get("/current", (_req: Request, res: Response) => {
  const m = readAppUpdateManifest();
  res.json({ ok: true, manifest: m });
});

const publishSchema = z.object({
  version: z
    .string()
    .trim()
    .regex(/^\d+\.\d+\.\d+([.-][\w.-]+)?$/, "Версия в формате 0.2.0"),
  setupUrl: z.string().trim().url("Укажите полный https:// URL установщика"),
  releaseNotes: z.string().max(2000).optional(),
});

export const adminAppUpdateRouter = Router();

adminAppUpdateRouter.put("/publish", requireAdmin, (req: Request, res: Response) => {
  const parsed = publishSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ ok: false, error: "Некорректные данные." });
    return;
  }
  const admin = (req as Request & { adminAuth?: { emailNorm: string } }).adminAuth;
  const manifest = writeAppUpdateManifest(
    {
      version: parsed.data.version,
      setupUrl: parsed.data.setupUrl,
      releaseNotes: parsed.data.releaseNotes ?? "",
    },
    admin?.emailNorm ?? "admin"
  );
  res.json({ ok: true, manifest });
});
