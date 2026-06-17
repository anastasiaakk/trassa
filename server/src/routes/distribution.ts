import type { Request, Response } from "express";
import { Router } from "express";
import { db } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { PORTAL_KEYS } from "../portalKeys.js";
import type { ProfileSettingsData } from "../profileTypes.js";
import { defaultProfile } from "../profileTypes.js";

type ProposalRow = {
  id: string;
  specializationId: string;
  studentEmailNorm: string;
  contractorEmailNorm: string;
  note: string;
  createdAt: string;
  status: string;
};

type SpecRow = { id: string; title: string };

function readProposals(): ProposalRow[] {
  const row = db.prepare("SELECT value_json FROM portal_kv WHERE key = ?").get(PORTAL_KEYS.DISTRIBUTION_PROPOSALS) as
    | { value_json: string }
    | undefined;
  if (!row) return [];
  try {
    const data = JSON.parse(row.value_json) as unknown;
    return Array.isArray(data) ? (data as ProposalRow[]) : [];
  } catch {
    return [];
  }
}

function readSpecTitles(): Map<string, string> {
  const row = db.prepare("SELECT value_json FROM portal_kv WHERE key = ?").get(PORTAL_KEYS.SPECIALIZATIONS) as
    | { value_json: string }
    | undefined;
  const map = new Map<string, string>();
  if (!row) return map;
  try {
    const list = JSON.parse(row.value_json) as SpecRow[];
    if (!Array.isArray(list)) return map;
    for (const s of list) {
      if (s?.id && s?.title) map.set(s.id, String(s.title));
    }
  } catch {
    /* ignore */
  }
  return map;
}

function loadStudentProfile(emailNorm: string): ProfileSettingsData | null {
  const row = db.prepare("SELECT profile_json FROM users WHERE email_norm = ?").get(emailNorm) as
    | { profile_json: string }
    | undefined;
  if (!row) return null;
  try {
    const partial = JSON.parse(row.profile_json) as Partial<ProfileSettingsData>;
    return defaultProfile({ ...partial, email: partial.email ?? emailNorm });
  } catch {
    return null;
  }
}

export const distributionRouter = Router();

/** Подборка студентов, рекомендованных администратором текущему подрядчику. */
distributionRouter.get("/recommendations", requireAuth, (req: Request, res: Response) => {
  const auth = (req as Request & { auth?: { emailNorm: string } }).auth;
  if (!auth?.emailNorm) {
    res.status(401).json({ ok: false, error: "Требуется вход." });
    return;
  }

  const specTitles = readSpecTitles();
  const proposals = readProposals()
    .filter((p) => p.contractorEmailNorm === auth.emailNorm)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const items = proposals.map((p) => {
    const student = loadStudentProfile(p.studentEmailNorm);
    return {
      proposalId: p.id,
      specializationId: p.specializationId,
      specializationTitle: specTitles.get(p.specializationId) ?? p.specializationId,
      note: p.note ?? "",
      createdAt: p.createdAt,
      student: student
        ? {
            emailNorm: p.studentEmailNorm,
            firstName: student.firstName,
            lastName: student.lastName,
            email: student.email,
            phone: student.phone,
          }
        : {
            emailNorm: p.studentEmailNorm,
            firstName: "",
            lastName: "",
            email: p.studentEmailNorm,
            phone: "",
          },
    };
  });

  res.json({ ok: true, items, total: items.length });
});
