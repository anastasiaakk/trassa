/**
 * Материалы и объявления для студенческих дорожных команд (ассоциации публикуют; подрядчики видят ленту).
 */

import type { AssociationId } from "./sharedAssociationDocumentsStorage";
import { PORTAL_KV } from "../config/portalKeys";
import { pushPortalKv } from "./portalSync";

export type StudentTeamBulletin = {
  id: string;
  association: AssociationId;
  title: string;
  body: string;
  createdAt: string;
};

const KEY = "trassa-student-teams-bulletin-v1";
export const STUDENT_TEAMS_UPDATED_EVENT = "trassa-student-teams-updated";

function read(): StudentTeamBulletin[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const data = JSON.parse(raw) as StudentTeamBulletin[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function write(items: StudentTeamBulletin[]) {
  pushPortalKv(PORTAL_KV.STUDENT_TEAMS, items);
}

export function listBulletins(association: AssociationId): StudentTeamBulletin[] {
  return read()
    .filter((b) => b.association === association)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function listAllBulletinsForContractors(): StudentTeamBulletin[] {
  return read().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function addBulletin(
  association: AssociationId,
  title: string,
  body: string
): StudentTeamBulletin {
  const items = read();
  const b: StudentTeamBulletin = {
    id: `st-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    association,
    title: title.trim(),
    body: body.trim(),
    createdAt: new Date().toISOString(),
  };
  items.push(b);
  write(items);
  return b;
}

export function deleteBulletin(id: string): void {
  write(read().filter((b) => b.id !== id));
}
