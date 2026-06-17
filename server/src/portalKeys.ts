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
  SPECIALIZATIONS: "specializations",
  DISTRIBUTION_PROPOSALS: "distribution_proposals",
  ADMIN_FORMS: "admin_forms",
  AI_PROMPT_LIBRARY: "ai_prompt_library",
  /** Срезы и прогресс для кабинета РАДОР (пишет сервер). */
  FORM_RADOR_MONITORING: "form_rador_monitoring",
  FORM_ALERTS: "form_alerts",
  /** Глобальный переключатель legacy / glass v2 (виден всем клиентам). */
  PORTAL_DESIGN: "portal_design",
  /** Фон Page2: video | lines | off. */
  PAGE2_BG_MODE: "page2_bg_mode",
  MY_DESIGN_PRESET: "portal_my_design_preset",
  DESIGN_TOKENS: "portal_design_tokens",
  /** Защита от скриншотов / журнал нарушений (глобальный переключатель). */
  VIOLATIONS_GUARD: "violations_guard",
} as const;

export type PortalKey = (typeof PORTAL_KEYS)[keyof typeof PORTAL_KEYS];

/** Только администратор портала (/services). */
export const ADMIN_ONLY_PORTAL_KEYS = new Set<string>([
  PORTAL_KEYS.MAINTENANCE,
  PORTAL_KEYS.SEASON_BG,
  PORTAL_KEYS.CONTRACTOR_ORGS,
  PORTAL_KEYS.MAP_CATEGORY_LABELS,
  PORTAL_KEYS.MAP_SUBJECT_ORGS,
  PORTAL_KEYS.DISTRIBUTION_PROPOSALS,
  PORTAL_KEYS.ADMIN_FORMS,
  PORTAL_KEYS.AI_PROMPT_LIBRARY,
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

/** Пишет только админ (/api/portal/kv), читают все клиенты (/api/portal/state). */
export const ADMIN_GLOBAL_PORTAL_KEYS = new Set<string>([
  PORTAL_KEYS.PORTAL_DESIGN,
  PORTAL_KEYS.PAGE2_BG_MODE,
  PORTAL_KEYS.MY_DESIGN_PRESET,
  PORTAL_KEYS.DESIGN_TOKENS,
  PORTAL_KEYS.VIOLATIONS_GUARD,
]);

export function isValidPortalKey(key: string): boolean {
  return Object.values(PORTAL_KEYS).includes(key as PortalKey);
}
