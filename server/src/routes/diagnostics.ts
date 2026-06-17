import type { Request, Response } from "express";
import { Router } from "express";
import { z } from "zod";
import { db } from "../db.js";

const eventSchema = z.object({
  kind: z.enum(["error", "crash", "rejection"]),
  message: z.string().min(1).max(500),
});

function newId(): string {
  return `ce-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export const diagnosticsRouter = Router();

diagnosticsRouter.post("/event", (req: Request, res: Response) => {
  const parsed = eventSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ ok: false, error: "Некорректные данные." });
    return;
  }
  const now = new Date().toISOString();
  db.prepare(
    "INSERT INTO client_events (id, kind, message, created_at) VALUES (?, ?, ?, ?)"
  ).run(newId(), parsed.data.kind, parsed.data.message.trim(), now);
  res.json({ ok: true });
});
