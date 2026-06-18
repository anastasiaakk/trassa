import { loadContractorOrganizations } from "../../../utils/contractorOrganizations";
import type { MapSubjectOrganization } from "../../../utils/mapSubjectOrganizations";
import { loadActiveSpecializations } from "../../../utils/specializationsStorage";
import type { PresentationStats } from "./presentationConfig";

export function formatStat(n: number): string {
  return n.toLocaleString("ru-RU");
}

export function collectStats(mapEntries: MapSubjectOrganization[]): PresentationStats {
  const contractorList = loadContractorOrganizations();
  const specs = loadActiveSpecializations();
  return {
    organizations: contractorList.length + mapEntries.length,
    mapEntries: mapEntries.length,
    users: 0,
    specializations: specs.length,
  };
}
