import { fetchContractorRecommendations } from "../api/distributionApi";
import { isAuthApiEnabled } from "./authMode";
import { listRegisteredUsers } from "./localAuth";
import {
  loadDistributionProposals,
  specializationTitle,
  type DistributionProposal,
} from "./specializationsStorage";

export const DISTRIBUTION_PROPOSALS_CHANGED = "trassa-distribution-proposals-changed";

const SEEN_KEY = "trassa-contractor-rec-seen-v1";

export type ContractorRecommendation = {
  proposalId: string;
  specializationId: string;
  specializationTitle: string;
  note: string;
  createdAt: string;
  student: {
    emailNorm: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function readSeenStore(): Record<string, string> {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    if (!raw) return {};
    const o = JSON.parse(raw) as Record<string, string>;
    return o && typeof o === "object" ? o : {};
  } catch {
    return {};
  }
}

function writeSeenStore(store: Record<string, string>): void {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(store));
  } catch {
    /* ignore */
  }
}

export function getContractorSeenAt(contractorEmailNorm: string): string | null {
  const at = readSeenStore()[normalizeEmail(contractorEmailNorm)];
  return at && typeof at === "string" ? at : null;
}

export function markContractorRecommendationsSeen(contractorEmailNorm: string): void {
  const key = normalizeEmail(contractorEmailNorm);
  const store = readSeenStore();
  store[key] = new Date().toISOString();
  writeSeenStore(store);
}

function enrichLocal(proposals: DistributionProposal[]): ContractorRecommendation[] {
  const users = listRegisteredUsers();
  const byEmail = new Map(users.map((u) => [u.emailNorm, u]));
  return proposals.map((p) => {
    const u = byEmail.get(p.studentEmailNorm);
    const profile = u?.profile;
    return {
      proposalId: p.id,
      specializationId: p.specializationId,
      specializationTitle: specializationTitle(p.specializationId),
      note: p.note,
      createdAt: p.createdAt,
      student: {
        emailNorm: p.studentEmailNorm,
        firstName: profile?.firstName ?? "",
        lastName: profile?.lastName ?? "",
        email: profile?.email ?? p.studentEmailNorm,
        phone: profile?.phone ?? "",
      },
    };
  });
}

export function loadContractorRecommendationsLocal(
  contractorEmailNorm: string
): ContractorRecommendation[] {
  const norm = normalizeEmail(contractorEmailNorm);
  return enrichLocal(
    loadDistributionProposals().filter((p) => p.contractorEmailNorm === norm)
  );
}

export async function loadContractorRecommendations(
  contractorEmailNorm: string
): Promise<ContractorRecommendation[]> {
  const norm = normalizeEmail(contractorEmailNorm);
  if (isAuthApiEnabled()) {
    const r = await fetchContractorRecommendations();
    if (r.ok) return r.items;
    return loadContractorRecommendationsLocal(norm);
  }
  return loadContractorRecommendationsLocal(norm);
}

export function countUnreadContractorRecommendations(
  contractorEmailNorm: string,
  items: ContractorRecommendation[]
): number {
  const seenAt = getContractorSeenAt(contractorEmailNorm);
  if (!seenAt) return items.length;
  const t = new Date(seenAt).getTime();
  return items.filter((i) => new Date(i.createdAt).getTime() > t).length;
}

export function formatRecommendationDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function studentDisplayName(row: ContractorRecommendation): string {
  const n = `${row.student.lastName} ${row.student.firstName}`.trim();
  return n || row.student.email;
}
