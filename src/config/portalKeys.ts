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
  SPECIALIZATIONS: "specializations",
  DISTRIBUTION_PROPOSALS: "distribution_proposals",
  ADMIN_FORMS: "admin_forms",
  AI_PROMPT_LIBRARY: "ai_prompt_library",
  FORM_RADOR_MONITORING: "form_rador_monitoring",
  FORM_ALERTS: "form_alerts",
  PORTAL_DESIGN: "portal_design",
  PAGE2_BG_MODE: "page2_bg_mode",
  /** Снимок «мой дизайн» (настройки переключателей, не CSS-файлы). */
  MY_DESIGN_PRESET: "portal_my_design_preset",
  /** Редактируемые токены v2 (палитра, радиусы, cssVars). */
  DESIGN_TOKENS: "portal_design_tokens",
  VIOLATIONS_GUARD: "violations_guard",
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
  [PORTAL_KV.SPECIALIZATIONS]: "trassa-specializations-v1",
  [PORTAL_KV.DISTRIBUTION_PROPOSALS]: "trassa-distribution-proposals-v1",
  [PORTAL_KV.ADMIN_FORMS]: "trassa-admin-forms-v1",
  [PORTAL_KV.AI_PROMPT_LIBRARY]: "trassa-ai-prompt-library-v1",
  [PORTAL_KV.FORM_RADOR_MONITORING]: "trassa-form-rador-monitoring-v1",
  [PORTAL_KV.FORM_ALERTS]: "trassa-form-alerts-v1",
  [PORTAL_KV.PORTAL_DESIGN]: "trassa-portal-design",
  [PORTAL_KV.PAGE2_BG_MODE]: "trassa-page2-bg-mode",
  [PORTAL_KV.MY_DESIGN_PRESET]: "trassa-portal-my-design-preset-v1",
  [PORTAL_KV.DESIGN_TOKENS]: "trassa-portal-design-tokens-v1",
  [PORTAL_KV.VIOLATIONS_GUARD]: "trassa-violations-guard-v1",
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
  [PORTAL_KV.SPECIALIZATIONS]: "trassa-specializations-changed",
  [PORTAL_KV.ADMIN_FORMS]: "trassa-admin-forms-changed",
  [PORTAL_KV.AI_PROMPT_LIBRARY]: "trassa-ai-prompts-changed",
  [PORTAL_KV.FORM_RADOR_MONITORING]: "trassa-rador-forms-monitoring-changed",
  [PORTAL_KV.FORM_ALERTS]: "trassa-form-alerts-changed",
  [PORTAL_KV.PORTAL_DESIGN]: "trassa-portal-design-changed",
  [PORTAL_KV.PAGE2_BG_MODE]: "trassa-page2-background-changed",
  [PORTAL_KV.DESIGN_TOKENS]: "trassa-portal-design-tokens-changed",
  [PORTAL_KV.VIOLATIONS_GUARD]: "trassa-violations-guard-changed",
};

/** Только админ — подрядчик получает подборку через API, не через общий portal/state. */
export const PORTAL_ADMIN_ONLY_KEYS = new Set<PortalKvKey>([
  PORTAL_KV.SPECIALIZATIONS,
  PORTAL_KV.DISTRIBUTION_PROPOSALS,
  PORTAL_KV.ADMIN_FORMS,
  PORTAL_KV.AI_PROMPT_LIBRARY,
]);

/** Глобальные настройки портала — PUT /api/portal/kv (как server ADMIN_GLOBAL_PORTAL_KEYS). */
export const PORTAL_GLOBAL_ADMIN_KEYS = new Set<PortalKvKey>([
  PORTAL_KV.PORTAL_DESIGN,
  PORTAL_KV.PAGE2_BG_MODE,
  PORTAL_KV.MY_DESIGN_PRESET,
  PORTAL_KV.DESIGN_TOKENS,
  PORTAL_KV.VIOLATIONS_GUARD,
]);

/** Все ключи, которые пишутся через putPortalKvAdmin (не /user-kv). */
export const PORTAL_PUT_ADMIN_KEYS = new Set<PortalKvKey>([
  PORTAL_KV.MAINTENANCE,
  PORTAL_KV.SEASON_BG,
  PORTAL_KV.CONTRACTOR_ORGS,
  PORTAL_KV.MAP_CATEGORY_LABELS,
  PORTAL_KV.MAP_SUBJECT_ORGS,
  PORTAL_KV.PORTAL_DESIGN,
  PORTAL_KV.PAGE2_BG_MODE,
  PORTAL_KV.MY_DESIGN_PRESET,
  PORTAL_KV.DESIGN_TOKENS,
  PORTAL_KV.VIOLATIONS_GUARD,
  PORTAL_KV.SPECIALIZATIONS,
  PORTAL_KV.DISTRIBUTION_PROPOSALS,
  PORTAL_KV.ADMIN_FORMS,
  PORTAL_KV.AI_PROMPT_LIBRARY,
]);

export const PORTAL_KV_EVENTS_EXTRA: Partial<Record<PortalKvKey, string>> = {
  [PORTAL_KV.DISTRIBUTION_PROPOSALS]: "trassa-distribution-proposals-changed",
};

export const PORTAL_STATE_SYNCED_EVENT = "trassa-portal-state-synced";
