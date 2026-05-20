/** Ключи серверного хранилища (совпадают с server/src/portalKeys.ts). */
export const PORTAL_KV = {
  MAINTENANCE: "maintenance",
  SEASON_BG: "season_bg",
  CONTRACTOR_ORGS: "contractor_organizations",
  MAP_CATEGORY_LABELS: "map_category_labels",
  MAP_SUBJECT_ORGS: "map_subject_organizations",
  CALENDAR_EVENTS: "calendar_events",
  ASSOCIATION_DOCUMENTS: "association_documents",
  STUDENT_TEAMS: "student_teams",
  PROFORIENTATION: "proforientation_results",
  CONTRACTOR_TALENT: "contractor_talent_filters",
  MESSENGER: "messenger",
  MESSENGER_PEERS: "messenger_peers",
} as const;

export type PortalKvKey = (typeof PORTAL_KV)[keyof typeof PORTAL_KV];

/** localStorage-ключ для кэша на клиенте */
export const PORTAL_LOCAL_KEYS: Record<PortalKvKey, string> = {
  [PORTAL_KV.MAINTENANCE]: "trassa-maintenance-v1",
  [PORTAL_KV.SEASON_BG]: "trassa-season-bg-v1",
  [PORTAL_KV.CONTRACTOR_ORGS]: "trassa-contractor-organizations-v1",
  [PORTAL_KV.MAP_CATEGORY_LABELS]: "trassa-map-category-labels-v1",
  [PORTAL_KV.MAP_SUBJECT_ORGS]: "trassa-map-subject-organizations-v1",
  [PORTAL_KV.CALENDAR_EVENTS]: "trassa-association-calendar-events-v1",
  [PORTAL_KV.ASSOCIATION_DOCUMENTS]: "trassa-association-shared-documents-v1",
  [PORTAL_KV.STUDENT_TEAMS]: "trassa-student-teams-bulletin-v1",
  [PORTAL_KV.PROFORIENTATION]: "trassa-proforientation-results-v1",
  [PORTAL_KV.CONTRACTOR_TALENT]: "trassa-contractor-talent-filters-v1",
  [PORTAL_KV.MESSENGER]: "trassa-messenger-v1",
  [PORTAL_KV.MESSENGER_PEERS]: "trassa-messenger-peers-v1",
};

export const PORTAL_KV_EVENTS: Partial<Record<PortalKvKey, string>> = {
  [PORTAL_KV.MAINTENANCE]: "trassa-maintenance-changed",
  [PORTAL_KV.SEASON_BG]: "trassa-season-bg-changed",
  [PORTAL_KV.CONTRACTOR_ORGS]: "trassa-contractor-orgs-changed",
  [PORTAL_KV.MAP_CATEGORY_LABELS]: "trassa-map-category-labels-changed",
  [PORTAL_KV.MAP_SUBJECT_ORGS]: "trassa-map-subject-organizations-changed",
  [PORTAL_KV.CALENDAR_EVENTS]: "trassa-shared-calendar-updated",
  [PORTAL_KV.ASSOCIATION_DOCUMENTS]: "trassa-shared-docs-updated",
  [PORTAL_KV.STUDENT_TEAMS]: "trassa-student-teams-updated",
  [PORTAL_KV.PROFORIENTATION]: "trassa-proforientation-changed",
  [PORTAL_KV.CONTRACTOR_TALENT]: "trassa-contractor-talent-changed",
  [PORTAL_KV.MESSENGER]: "trassa-messenger-updated",
  [PORTAL_KV.MESSENGER_PEERS]: "trassa-messenger-updated",
};

export const PORTAL_STATE_SYNCED_EVENT = "trassa-portal-state-synced";
