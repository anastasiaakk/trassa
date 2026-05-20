/** Ключи общих данных портала (одна SQLite-таблица portal_kv). */
export const PORTAL_KEYS = {
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

export type PortalKey = (typeof PORTAL_KEYS)[keyof typeof PORTAL_KEYS];

/** Только администратор портала (/services). */
export const ADMIN_ONLY_PORTAL_KEYS = new Set<string>([
  PORTAL_KEYS.MAINTENANCE,
  PORTAL_KEYS.SEASON_BG,
  PORTAL_KEYS.CONTRACTOR_ORGS,
  PORTAL_KEYS.MAP_CATEGORY_LABELS,
  PORTAL_KEYS.MAP_SUBJECT_ORGS,
]);

/** Любой авторизованный пользователь портала может менять. */
export const AUTH_PORTAL_KEYS = new Set<string>([
  PORTAL_KEYS.CALENDAR_EVENTS,
  PORTAL_KEYS.ASSOCIATION_DOCUMENTS,
  PORTAL_KEYS.STUDENT_TEAMS,
  PORTAL_KEYS.PROFORIENTATION,
  PORTAL_KEYS.CONTRACTOR_TALENT,
  PORTAL_KEYS.MESSENGER,
  PORTAL_KEYS.MESSENGER_PEERS,
]);

export function isValidPortalKey(key: string): boolean {
  return Object.values(PORTAL_KEYS).includes(key as PortalKey);
}
