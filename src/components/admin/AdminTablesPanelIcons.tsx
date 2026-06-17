export function TablesIconPlus({ className }: { className?: string }) {
  return (
    <svg className={className} width={18} height={18} viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M10 4.5v11M4.5 10h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function TablesIconImport({ className }: { className?: string }) {
  return (
    <svg className={className} width={18} height={18} viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M10 3.5v8m0 0l2.5-2.5M10 11.5 7.5 9M5 13.5v1.75A1.75 1.75 0 0 0 6.75 17h6.5A1.75 1.75 0 0 0 15 15.25V13.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function TablesIconMonitor({ className }: { className?: string }) {
  return (
    <svg className={className} width={20} height={20} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 19h16M6.5 15.5 10 11l3.5 2.5L18 8"
      />
      <path
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        d="M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v11a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 18V7A1.5 1.5 0 0 1 5 5.5Z"
      />
    </svg>
  );
}

export function TablesIconAi({ className }: { className?: string }) {
  return (
    <svg className={className} width={20} height={20} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11 4.5 12.2 8.2 16 9.4 12.2 10.6 11 14.5 9.8 10.6 6 9.4 9.8 8.2 11 4.5Z"
      />
      <path
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M18 6.5 18.55 8.1 20.2 8.65 18.55 9.2 18 10.85 17.45 9.2 15.8 8.65 17.45 8.1 18 6.5Z"
      />
      <path
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.5 16.5 7 17.85 8.35 18.35 7 18.85 6.5 20.2 6 18.85 4.65 18.35 6 17.85 6.5 16.5Z"
      />
    </svg>
  );
}

export type AdminTablesPanelView = "workspace" | "monitor" | "ai";

export const ADMIN_TABLES_PANEL_NAV_LABELS: Record<AdminTablesPanelView, string> = {
  workspace: "Конструктор",
  monitor: "Мониторинг",
  ai: "ИИ-ассистент",
};
