import type { Request, Response } from "express";
import { Router } from "express";
import { z } from "zod";
import { db } from "../db.js";
import { requireAdmin } from "../middleware/adminAuth.js";
import { PORTAL_KEYS } from "../portalKeys.js";
import type { ProfileSettingsData } from "../profileTypes.js";
import { defaultProfile } from "../profileTypes.js";

const DEFAULT_SPECS = [
  { id: "spec-geodesy", title: "Геодезия", sortOrder: 10, active: true },
  { id: "spec-survey", title: "Изыскания", sortOrder: 20, active: true },
  { id: "spec-design", title: "Проектирование", sortOrder: 30, active: true },
  { id: "spec-construction", title: "Строительство", sortOrder: 40, active: true },
  { id: "spec-operation", title: "Эксплуатация", sortOrder: 50, active: true },
  { id: "spec-estimate", title: "Сметное дело", sortOrder: 60, active: true },
  { id: "spec-maintenance", title: "Содержание", sortOrder: 70, active: true },
];

type Spec = { id: string; title: string; sortOrder: number; active: boolean };

function readKv<T>(key: string): T | null {
  const row = db.prepare("SELECT value_json FROM portal_kv WHERE key = ?").get(key) as
    | { value_json: string }
    | undefined;
  if (!row) return null;
  try {
    return JSON.parse(row.value_json) as T;
  } catch {
    return null;
  }
}

function writeKv(key: string, value: unknown): void {
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO portal_kv (key, value_json, updated_at, updated_by)
     VALUES (?, ?, ?, 'admin')
     ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at`
  ).run(key, JSON.stringify(value), now);
}

function loadSpecs(): Spec[] {
  const raw = readKv<Spec[]>(PORTAL_KEYS.SPECIALIZATIONS);
  if (!raw || !Array.isArray(raw) || raw.length === 0) {
    writeKv(PORTAL_KEYS.SPECIALIZATIONS, DEFAULT_SPECS);
    return DEFAULT_SPECS;
  }
  return raw
    .filter((s) => s && typeof s.id === "string" && typeof s.title === "string")
    .map((s) => ({
      id: s.id,
      title: String(s.title).trim(),
      sortOrder: Number(s.sortOrder) || 0,
      active: s.active !== false,
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title, "ru"));
}

function parseProfile(json: string): ProfileSettingsData {
  const partial = JSON.parse(json) as Partial<ProfileSettingsData>;
  return defaultProfile({ ...partial, email: partial.email ?? "" });
}

function isStudent(p: ProfileSettingsData): boolean {
  return p.roleLabel.toLowerCase().includes("студент");
}

function isContractor(p: ProfileSettingsData): boolean {
  return p.roleLabel.toLowerCase().includes("подряд") || Boolean(p.contractorCompanyName.trim());
}

function buildSummary() {
  const specs = loadSpecs();
  const users = db.prepare("SELECT email_norm, profile_json, created_at FROM users").all() as Array<{
    email_norm: string;
    profile_json: string;
    created_at: string;
  }>;

  type Member = {
    emailNorm: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    roleLabel: string;
    contractorCompanyName: string;
    specializationId: string;
    createdAt: string;
    roleKind: "student" | "contractor";
  };

  const members: Member[] = [];
  for (const u of users) {
    const p = parseProfile(u.profile_json);
    if (isStudent(p)) {
      members.push({
        emailNorm: u.email_norm,
        firstName: p.firstName,
        lastName: p.lastName,
        email: p.email,
        phone: p.phone,
        roleLabel: p.roleLabel,
        contractorCompanyName: p.contractorCompanyName,
        specializationId: p.specializationId ?? "",
        createdAt: u.created_at,
        roleKind: "student",
      });
    } else if (isContractor(p)) {
      members.push({
        emailNorm: u.email_norm,
        firstName: p.firstName,
        lastName: p.lastName,
        email: p.email,
        phone: p.phone,
        roleLabel: p.roleLabel,
        contractorCompanyName: p.contractorCompanyName,
        specializationId: p.specializationId ?? "",
        createdAt: u.created_at,
        roleKind: "contractor",
      });
    }
  }

  const proposals =
    readKv<Array<Record<string, unknown>>>(PORTAL_KEYS.DISTRIBUTION_PROPOSALS) ?? [];

  const buckets = specs.map((specialization) => {
    const inSpec = members.filter((m) => m.specializationId === specialization.id);
    const students = inSpec.filter((m) => m.roleKind === "student");
    const contractors = inSpec.filter((m) => m.roleKind === "contractor");
    return {
      specialization,
      counts: {
        students: students.length,
        contractors: contractors.length,
        total: students.length + contractors.length,
      },
      students,
      contractors,
    };
  });

  const unassignedStudents = members.filter(
    (m) => m.roleKind === "student" && !m.specializationId?.trim()
  );
  const unassignedContractors = members.filter(
    (m) => m.roleKind === "contractor" && !m.specializationId?.trim()
  );

  return {
    specs,
    buckets,
    unassignedStudents,
    unassignedContractors,
    proposals: Array.isArray(proposals) ? proposals : [],
    totals: {
      students: members.filter((m) => m.roleKind === "student").length,
      contractors: members.filter((m) => m.roleKind === "contractor").length,
    },
  };
}

export const publicSpecializationsRouter = Router();

publicSpecializationsRouter.get("/", (_req: Request, res: Response) => {
  const specs = loadSpecs().filter((s) => s.active);
  res.json({ ok: true, specializations: specs });
});

export const adminSpecializationsRouter = Router();

adminSpecializationsRouter.get("/specializations", requireAdmin, (_req: Request, res: Response) => {
  res.json({ ok: true, specializations: loadSpecs() });
});

adminSpecializationsRouter.post("/specializations", requireAdmin, (req: Request, res: Response) => {
  const title = String(req.body?.title ?? "").trim();
  if (!title) {
    res.status(400).json({ ok: false, error: "Введите название." });
    return;
  }
  const list = loadSpecs();
  if (list.some((s) => s.title.toLowerCase() === title.toLowerCase())) {
    res.status(409).json({ ok: false, error: "Уже существует." });
    return;
  }
  const maxOrder = list.reduce((m, s) => Math.max(m, s.sortOrder), 0);
  const item: Spec = {
    id: `spec-${Date.now()}`,
    title,
    sortOrder: maxOrder + 10,
    active: true,
  };
  writeKv(PORTAL_KEYS.SPECIALIZATIONS, [...list, item]);
  res.status(201).json({ ok: true, specialization: item });
});

adminSpecializationsRouter.patch("/specializations/:id", requireAdmin, (req: Request, res: Response) => {
  const id = String(req.params.id);
  const list = loadSpecs();
  const idx = list.findIndex((s) => s.id === id);
  if (idx < 0) {
    res.status(404).json({ ok: false, error: "Не найдено." });
    return;
  }
  const cur = list[idx];
  if (req.body?.title !== undefined) {
    const title = String(req.body.title).trim();
    if (!title) {
      res.status(400).json({ ok: false, error: "Пустое название." });
      return;
    }
    cur.title = title;
  }
  if (req.body?.sortOrder !== undefined) cur.sortOrder = Number(req.body.sortOrder) || cur.sortOrder;
  if (req.body?.active !== undefined) cur.active = Boolean(req.body.active);
  list[idx] = cur;
  writeKv(PORTAL_KEYS.SPECIALIZATIONS, list);
  res.json({ ok: true, specialization: cur });
});

adminSpecializationsRouter.delete("/specializations/:id", requireAdmin, (req: Request, res: Response) => {
  const id = String(req.params.id);
  writeKv(
    PORTAL_KEYS.SPECIALIZATIONS,
    loadSpecs().filter((s) => s.id !== id)
  );
  res.json({ ok: true });
});

adminSpecializationsRouter.get("/specializations/summary", requireAdmin, (_req: Request, res: Response) => {
  res.json({ ok: true, summary: buildSummary() });
});

const moveSchema = z.object({
  specializationId: z.string().min(1).max(80),
});

adminSpecializationsRouter.patch(
  "/users/:emailNorm/specialization",
  requireAdmin,
  (req: Request, res: Response) => {
    const parsed = moveSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ ok: false, error: "Некорректные данные." });
      return;
    }
    const emailNorm = String(req.params.emailNorm).trim().toLowerCase();
    const spec = loadSpecs().find((s) => s.id === parsed.data.specializationId);
    if (!spec) {
      res.status(400).json({ ok: false, error: "Спецификация не найдена." });
      return;
    }
    const row = db.prepare("SELECT profile_json FROM users WHERE email_norm = ?").get(emailNorm) as
      | { profile_json: string }
      | undefined;
    if (!row) {
      res.status(404).json({ ok: false, error: "Пользователь не найден." });
      return;
    }
    const profile = parseProfile(row.profile_json);
    profile.specializationId = parsed.data.specializationId;
    db.prepare("UPDATE users SET profile_json = ? WHERE email_norm = ?").run(
      JSON.stringify(profile),
      emailNorm
    );
    res.json({ ok: true, profile });
  }
);

const proposalSchema = z.object({
  specializationId: z.string().min(1),
  studentEmailNorm: z.string().email(),
  contractorEmailNorm: z.string().email(),
  note: z.string().max(300).optional(),
});

adminSpecializationsRouter.post("/distribution/proposals", requireAdmin, (req: Request, res: Response) => {
  const parsed = proposalSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ ok: false, error: "Некорректные данные." });
    return;
  }
  const studentNorm = parsed.data.studentEmailNorm.trim().toLowerCase();
  const contractorNorm = parsed.data.contractorEmailNorm.trim().toLowerCase();
  const studentRow = db.prepare("SELECT profile_json FROM users WHERE email_norm = ?").get(studentNorm) as
    | { profile_json: string }
    | undefined;
  const contractorRow = db
    .prepare("SELECT profile_json FROM users WHERE email_norm = ?")
    .get(contractorNorm) as { profile_json: string } | undefined;
  if (!studentRow || !contractorRow) {
    res.status(404).json({ ok: false, error: "Студент или подрядчик не найден." });
    return;
  }
  const sp = parseProfile(studentRow.profile_json);
  const cp = parseProfile(contractorRow.profile_json);
  if (!isStudent(sp) || !isContractor(cp)) {
    res.status(400).json({ ok: false, error: "Неверные роли участников." });
    return;
  }
  if (sp.specializationId !== parsed.data.specializationId || cp.specializationId !== parsed.data.specializationId) {
    res.status(400).json({
      ok: false,
      error: "Студент и подрядчик должны быть в одной спецификации.",
    });
    return;
  }
  const list = readKv<Array<Record<string, unknown>>>(PORTAL_KEYS.DISTRIBUTION_PROPOSALS) ?? [];
  const entry = {
    id: `prop-${Date.now()}`,
    specializationId: parsed.data.specializationId,
    studentEmailNorm: studentNorm,
    contractorEmailNorm: contractorNorm,
    note: (parsed.data.note ?? "").trim(),
    createdAt: new Date().toISOString(),
    status: "proposed",
  };
  writeKv(PORTAL_KEYS.DISTRIBUTION_PROPOSALS, [entry, ...list].slice(0, 500));
  res.status(201).json({ ok: true, proposal: entry });
});

function csvEscape(v: string): string {
  const s = String(v ?? "");
  if (/[;"\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

adminSpecializationsRouter.get("/specializations/export.csv", requireAdmin, (_req: Request, res: Response) => {
  const summary = buildSummary();
  const lines = [
    "\uFEFFСпецификация;Роль;Фамилия;Имя;E-mail;Телефон;Организация;Дата регистрации",
  ];
  for (const b of summary.buckets) {
    for (const m of [...b.students, ...b.contractors]) {
      lines.push(
        [
          b.specialization.title,
          m.roleKind === "student" ? "Студент" : "Подрядчик",
          m.lastName,
          m.firstName,
          m.email,
          m.phone,
          m.contractorCompanyName,
          m.createdAt,
        ]
          .map(csvEscape)
          .join(";")
      );
    }
  }
  for (const m of summary.unassignedStudents) {
    lines.push(
      ["Без спецификации", "Студент", m.lastName, m.firstName, m.email, m.phone, "", m.createdAt]
        .map(csvEscape)
        .join(";")
    );
  }
  for (const m of summary.unassignedContractors) {
    lines.push(
      ["Без спецификации", "Подрядчик", m.lastName, m.firstName, m.email, m.phone, m.contractorCompanyName, m.createdAt]
        .map(csvEscape)
        .join(";")
    );
  }
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="trassa-specializations-${new Date().toISOString().slice(0, 10)}.csv"`
  );
  res.send(lines.join("\r\n"));
});
